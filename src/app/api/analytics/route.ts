import { db } from '@/lib/db';
import { requireRole } from '@/lib/nch/auth';
import { handleError } from '@/lib/nch/api';
import { isActiveStatus } from '@/lib/nch/constants';
import { evaluateSla } from '@/lib/nch/rules';
import { syncEscalationFlags } from '@/lib/nch/escalation-sync';
import { format } from 'date-fns';

// GET /api/analytics — staff-only aggregates for dashboards/analytics pages.
// Restricted to officers + supervisors: companies and consumers have their own
// scoped views, and this endpoint intentionally exposes escalation internals.
export async function GET() {
  try {
    await requireRole('officer', 'supervisor');
    const where: Record<string, unknown> = {};

    const complaints = await db.complaint.findMany({
      where,
      select: {
        id: true, status: true, sector: true, priority: true, createdAt: true,
        resolvedAt: true, closedAt: true, slaDeadline: true, docketNumber: true,
        escalationFlagged: true, escalationReasons: true, escalationDismissedAt: true,
        consumer: { select: { name: true } }, company: { select: { name: true } },
      },
    });

    // CONSISTENCY: run the same write-on-read flag synchronization the complaint
    // queue runs BEFORE aggregating, so the dashboard can never disagree with
    // the queue (e.g. "2 escalated" here while the queue just flagged 4).
    const newlyFlagged = await syncEscalationFlags(complaints);
    if (newlyFlagged > 0) {
      const refreshed = await db.complaint.findMany({
        where,
        select: {
          id: true, status: true, sector: true, priority: true, createdAt: true,
          resolvedAt: true, closedAt: true, slaDeadline: true, docketNumber: true,
          escalationFlagged: true, escalationReasons: true, escalationDismissedAt: true,
          consumer: { select: { name: true } }, company: { select: { name: true } },
        },
      });
      complaints.length = 0;
      complaints.push(...refreshed);
    }

    const now = new Date();
    const total = complaints.length;
    const pending = complaints.filter((c) => isActiveStatus(c.status)).length;
    const resolvedAll = complaints.filter((c) => c.resolvedAt != null);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const resolvedThisMonth = resolvedAll.filter((c) => c.resolvedAt && c.resolvedAt >= monthStart).length;
    // Escalation metrics are FLAG-AWARE (matching the architecture:
    // SLA breach = flag, NOT a status change).
    //   escalated        — supervisor decided: status "Escalated"
    //   escalationReview — status "Escalation Review"
    //   flagged          — active rules-engine flag on an otherwise normal status
    //   reopened         — status "Reopened" (ESC-02)
    const isEscalatedSt = (c: (typeof complaints)[number]) => c.status === 'Escalated';
    const isReviewSt = (c: (typeof complaints)[number]) => c.status === 'Escalation Review';
    const isReopenedSt = (c: (typeof complaints)[number]) => c.status === 'Reopened';
    const escalatedCount = complaints.filter(isEscalatedSt).length;
    const reviewCount = complaints.filter(isReviewSt).length;
    const reopenedCount = complaints.filter(isReopenedSt).length;
    const flaggedCount = complaints.filter(
      (c) => c.escalationFlagged && !isEscalatedSt(c) && !isReviewSt(c) && !isReopenedSt(c)
    ).length;
    const escalatedActive = escalatedCount + reviewCount + reopenedCount + flaggedCount;

    const durations = resolvedAll
      .filter((c) => c.resolvedAt)
      .map((c) => (c.resolvedAt!.getTime() - c.createdAt.getTime()) / 86_400_000);
    const avgResolutionDays = durations.length ? Math.round((durations.reduce((a, b) => a + b, 0) / durations.length) * 10) / 10 : 0;
    const resolutionRate = total ? Math.round((resolvedAll.length / total) * 1000) / 10 : 0;

    // sectors
    const sectorMap = new Map<string, { count: number; resolved: number; pending: number }>();
    for (const c of complaints) {
      const s = sectorMap.get(c.sector) ?? { count: 0, resolved: 0, pending: 0 };
      s.count += 1;
      if (c.resolvedAt) s.resolved += 1;
      else s.pending += 1;
      sectorMap.set(c.sector, s);
    }
    const bySector = Array.from(sectorMap.entries())
      .map(([sector, v]) => ({ sector, ...v }))
      .sort((a, b) => b.count - a.count);

    // statuses
    const statusMap = new Map<string, number>();
    for (const c of complaints) statusMap.set(c.status, (statusMap.get(c.status) ?? 0) + 1);
    const byStatus = Array.from(statusMap.entries()).map(([status, count]) => ({ status, count })).sort((a, b) => b.count - a.count);

    // 6-month trend
    const monthlyTrend: Array<{ month: string; registered: number; resolved: number }> = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      monthlyTrend.push({
        month: format(d, 'MMM yyyy'),
        registered: complaints.filter((c) => c.createdAt >= d && c.createdAt < next).length,
        resolved: complaints.filter((c) => c.resolvedAt && c.resolvedAt >= d && c.resolvedAt < next).length,
      });
    }

    // recent escalation-pipeline cases: flag-aware (includes flagged-but-not-yet-reviewed)
    const escalationCandidates = complaints
      .filter((c) => c.escalationFlagged || ['Escalated', 'Escalation Review', 'Reopened'].includes(c.status));

    // REAL escalation timestamps: derive when each case actually entered the
    // escalation pipeline from its ComplaintEvent history (flag written or
    // supervisor escalation), falling back to createdAt only if no event
    // exists (e.g. legacy rows). Using createdAt would misreport cases that
    // were flagged long after registration.
    const escEventRows = escalationCandidates.length
      ? await db.complaintEvent.findMany({
          where: {
            complaintId: { in: escalationCandidates.map((c) => c.id) },
            type: { in: ['ESCALATION_FLAG', 'ESCALATED'] },
          },
          orderBy: { createdAt: 'desc' },
          select: { complaintId: true, createdAt: true },
        })
      : [];
    const firstEscalationAt = new Map<string, Date>();
    for (const row of escEventRows) {
      if (!firstEscalationAt.has(row.complaintId)) firstEscalationAt.set(row.complaintId, row.createdAt);
    }

    const recentEscalations = escalationCandidates
      .sort(
        (a, b) =>
          (firstEscalationAt.get(b.id) ?? b.createdAt).getTime() -
          (firstEscalationAt.get(a.id) ?? a.createdAt).getTime()
      )
      .slice(0, 6)
      .map((c) => {
        const escAt = firstEscalationAt.get(c.id) ?? c.createdAt;
        return {
          docket: c.docketNumber,
          consumer: c.consumer.name,
          sector: c.sector,
          company: c.company.name,
          priority: c.priority,
          escalatedAt: format(escAt, 'd MMM yyyy'),
        };
      });

    // SLA compliance (non-terminal)
    const activeList = complaints.filter((c) => isActiveStatus(c.status));
    const breached = activeList.filter((c) => evaluateSla(c.createdAt, c.slaDeadline, now).breached).length;
    const withinSla = activeList.length - breached;

    return Response.json({
      overview: { totalComplaints: total, pendingComplaints: pending, resolvedThisMonth, escalatedActive, avgResolutionDays, resolutionRate },
      escalationBreakdown: { escalated: escalatedCount, escalationReview: reviewCount, flagged: flaggedCount, reopened: reopenedCount },
      bySector,
      byStatus,
      monthlyTrend,
      recentEscalations,
      sla: {
        breached,
        withinSla,
        complianceRate: activeList.length ? Math.round((withinSla / activeList.length) * 1000) / 10 : 100,
      },
    });
  } catch (err) {
    return handleError(err);
  }
}
