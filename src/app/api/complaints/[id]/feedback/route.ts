import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/nch/auth';
import { fail, handleError } from '@/lib/nch/api';
import { serializeComplaint, complaintInclude } from '@/lib/nch/serialize';
import { addEvent, notify } from '@/lib/nch/server-utils';
import { recommendedActionFor } from '@/lib/nch/rules';

// POST /api/complaints/[id]/feedback — consumer confirms / disputes / rates
// confirm=true  → status Resolved (human decision by the aggrieved party)
// disputed=true → status Reopened + RULE ESC-02 escalation flag (hard transition)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole('consumer');
    const { id } = await params;
    const { rating, comments, confirmed, disputed, disputeReason } = await req.json();

    const complaint = await db.complaint.findUnique({ where: { id }, include: { company: true } });
    if (!complaint) return fail('Complaint not found', 404);
    if (complaint.consumerId !== user.id) return fail('Not your complaint', 403);
    if (!['Confirmation Pending', 'Response Received', 'Resolution Claimed', 'Resolved'].includes(complaint.status)) {
      return fail(`Feedback is not possible while the complaint is "${complaint.status}"`, 409);
    }
    // Confirming a resolution is only meaningful once the organization has
    // actually CLAIMED a resolution (→ "Confirmation Pending") or an officer
    // has explicitly asked the consumer to confirm. A mere "we received your
    // complaint / we are investigating" response ("Response Received") can be
    // rated or disputed, but never confirmed as a resolution.
    if (confirmed && !['Resolution Claimed', 'Confirmation Pending', 'Resolved'].includes(complaint.status)) {
      return fail(
        'Resolution cannot be confirmed yet — the organization has not claimed a resolution. You may rate the response or dispute it.',
        409
      );
    }
    if (confirmed && disputed) return fail('Cannot confirm and dispute at the same time');

    const rate = Math.min(5, Math.max(1, Number(rating) || 0));
    if (!rate) return fail('A rating from 1 to 5 is required');

    await db.feedback.upsert({
      where: { complaintId: id },
      create: {
        complaintId: id, rating: rate,
        comments: String(comments ?? '').slice(0, 2000),
        confirmed: !!confirmed, disputed: !!disputed,
        disputeReason: disputeReason ? String(disputeReason).slice(0, 2000) : null,
      },
      update: {
        rating: rate,
        comments: String(comments ?? '').slice(0, 2000),
        confirmed: !!confirmed, disputed: !!disputed,
        disputeReason: disputeReason ? String(disputeReason).slice(0, 2000) : null,
      },
    });

    const data: Record<string, unknown> = {};
    let event: { type: string; title: string; description: string };
    let statusChanged = false;

    if (disputed) {
      // RULE ESC-02 — consumer rejection → Reopened + escalation flag (agreed design).
      // New escalation evidence overrides any earlier supervisor dismissal.
      data.status = 'Reopened';
      data.resolvedAt = null;
      data.escalationDismissedAt = null;
      const reasons: string[] = complaint.escalationReasons ? JSON.parse(complaint.escalationReasons) : [];
      reasons.push('Consumer rejected the proposed resolution (ESC-02)');
      data.escalationFlagged = true;
      data.escalationReasons = JSON.stringify(reasons);
      event = {
        type: 'FEEDBACK',
        title: 'Consumer Rejected Resolution',
        description: `Consumer disputed the response${disputeReason ? `: "${disputeReason}"` : ''}. Case reopened and flagged for escalation review (Rule ESC-02).`,
      };
      statusChanged = true;
    } else if (confirmed) {
      data.status = 'Resolved';
      data.resolvedAt = complaint.resolvedAt ?? new Date();
      event = {
        type: 'FEEDBACK',
        title: 'Consumer Confirmed Resolution',
        description: 'Consumer confirmed the remedy. Case marked Resolved.',
      };
      statusChanged = true;
    } else {
      event = {
        type: 'FEEDBACK',
        title: 'Consumer Feedback Recorded',
        description: `Consumer rated the case ${rate}/5${comments ? `: "${comments}"` : '.'}`,
      };
    }

    await db.complaint.update({ where: { id }, data });
    await addEvent({ complaintId: id, ...event, actorName: user.name, actorRole: 'Consumer' });

    // notify officer + supervisor(s) + (on dispute) the organization
    const officers = await db.user.findMany({
      where: { role: 'officer', id: complaint.assignedOfficerId ?? undefined },
      select: { id: true },
    });
    const supervisors = await db.user.findMany({ where: { role: 'supervisor' }, select: { id: true } });
    const note = disputed
      ? { type: 'warning' as const, title: 'Consumer rejected resolution', detail: `${complaint.docketNumber} — reopened and flagged (ESC-02). ${recommendedActionFor(['Consumer rejected'], 0)}` }
      : { type: 'info' as const, title: 'Consumer feedback received', detail: `${complaint.docketNumber} — rated ${rate}/5${confirmed ? ', resolution confirmed' : ''}.` };
    for (const u of [...officers, ...supervisors]) {
      await notify({
        userId: u.id, ...note,
        link: u.id === complaint.assignedOfficerId ? '/officer/complaints/' + id : '/supervisor/complaints',
      });
    }
    if (disputed) {
      const companyUsers = await db.user.findMany({
        where: { companyId: complaint.companyId, role: 'company' }, select: { id: true },
      });
      for (const cu of companyUsers) {
        await notify({
          userId: cu.id, type: 'warning',
          title: 'Consumer rejected your proposed resolution',
          detail: `${complaint.docketNumber} — the consumer disputed the response and the case was reopened.`,
          link: '/company/complaints/' + id,
        });
      }
    }

    const fresh = await db.complaint.findUniqueOrThrow({ where: { id }, include: complaintInclude });
    return Response.json({ complaint: serializeComplaint(fresh, { includeInternal: false }), statusChanged });
  } catch (err) {
    return handleError(err);
  }
}
