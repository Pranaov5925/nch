import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/nch/auth';
import { fail, handleError } from '@/lib/nch/api';
import { serializeComplaint, complaintInclude } from '@/lib/nch/serialize';
import { bumpPriority } from '@/lib/nch/constants';
import { addEvent, notify } from '@/lib/nch/server-utils';

// POST /api/complaints/[id]/escalate — supervisor decisions (human-in-the-loop)
// decision: 'review' (move to Escalation Review) | 'escalate' | 'dismiss' (clear flag)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole('supervisor');
    const { id } = await params;
    const { decision, notes } = await req.json();

    const complaint = await db.complaint.findUnique({ where: { id }, include: { consumer: true, company: true } });
    if (!complaint) return fail('Complaint not found', 404);

    if (decision === 'review') {
      if (!complaint.escalationFlagged) return fail('This complaint has no active escalation flag to review', 409);
      if (!['Escalation Review', 'Escalated', 'Resolved', 'Closed'].includes(complaint.status)) {
        // Remember where the case came from so a dismissal can restore it.
        await db.complaint.update({
          where: { id },
          data: { status: 'Escalation Review', preEscalationStatus: complaint.status },
        });
        await addEvent({
          complaintId: id, type: 'ESCALATION', title: 'Escalation Review',
          description: `Supervisor moved the flagged case into escalation review for a decision.`,
          actorName: user.name, actorRole: 'Supervisor',
        });
        if (complaint.assignedOfficerId) {
          await notify({
            userId: complaint.assignedOfficerId, type: 'info',
            title: 'Case moved to escalation review',
            detail: `${complaint.docketNumber} — supervisor is reviewing the escalation flag.`,
            link: '/officer/complaints/' + id,
          });
        }
      }
    } else if (decision === 'escalate') {
      if (complaint.status === 'Closed') return fail('Closed cases cannot be escalated', 409);
      // ARCHITECTURE INVARIANT (rules-driven escalation): a supervisor may only
      // escalate a case that carries an active rules-engine flag, or that is
      // already inside the escalation pipeline. Direct escalation of a clean,
      // unflagged complaint would bypass the rules engine and break the
      // "rule flags → supervisor decides" model.
      if (!complaint.escalationFlagged && !['Escalation Review', 'Escalated'].includes(complaint.status)) {
        return fail(
          'Escalation requires an active escalation flag. This complaint was not flagged by the rules engine — dismiss/flag flows start from the rules, not from discretion.',
          409
        );
      }
      const priority = bumpPriority(complaint.priority);
      await db.complaint.update({
        where: { id },
        data: {
          status: 'Escalated', priority,
          supervisorNotes: String(notes ?? '').slice(0, 2000),
          preEscalationStatus: null, // decision made — no restore needed
        },
      });
      await addEvent({
        complaintId: id, type: 'ESCALATED', title: 'Escalated to Organization (Supervisor)',
        description: `Supervisor escalated the case to ${complaint.company.name}'s principal nodal officer with a 7-day compliance window. Priority raised to ${priority}.${notes ? ` Notes: ${notes}` : ''}`,
        actorName: user.name, actorRole: 'Supervisor',
      });
      if (complaint.assignedOfficerId) {
        await notify({
          userId: complaint.assignedOfficerId, type: 'warning',
          title: 'Case escalated by supervisor',
          detail: `${complaint.docketNumber} — escalated to the organization. Priority: ${priority}.`,
          link: '/officer/complaints/' + id,
        });
      }
      // The organization must know its case was escalated.
      const companyUsers = await db.user.findMany({
        where: { companyId: complaint.companyId, role: 'company' }, select: { id: true },
      });
      for (const cu of companyUsers) {
        await notify({
          userId: cu.id, type: 'warning',
          title: 'Complaint escalated to your organization',
          detail: `${complaint.docketNumber} — escalated to the principal nodal officer with a 7-day compliance window.`,
          link: '/company/complaints/' + id,
        });
      }
    } else if (decision === 'dismiss') {
      if (complaint.status === 'Escalated') {
        return fail('This case is already escalated — dismissal no longer applies', 409);
      }
      if (!complaint.escalationFlagged && complaint.status !== 'Escalation Review') {
        return fail('This complaint has no escalation flag to dismiss', 409);
      }
      // Restore the workflow status the case had before entering review,
      // record the dismissal (suppresses auto re-flagging of the same
      // fixed-SLA condition), and clear the active flag.
      const restoredStatus =
        complaint.status === 'Escalation Review'
          ? (complaint.preEscalationStatus ?? 'Under Review')
          : complaint.status;
      await db.complaint.update({
        where: { id },
        data: {
          escalationFlagged: false,
          escalationReasons: null,
          escalationDismissedAt: new Date(),
          escalationReviewedBy: user.id,
          preEscalationStatus: null,
          status: restoredStatus,
        },
      });
      await addEvent({
        complaintId: id, type: 'ESCALATION', title: 'Escalation Flag Dismissed',
        description: `Supervisor reviewed the flag and dismissed it. Case restored to "${restoredStatus}". The same SLA breach will not re-flag automatically.${notes ? ` Reason: ${notes}` : ''}`,
        actorName: user.name, actorRole: 'Supervisor',
      });
      if (complaint.assignedOfficerId) {
        await notify({
          userId: complaint.assignedOfficerId, type: 'info',
          title: 'Escalation flag dismissed',
          detail: `${complaint.docketNumber} — supervisor dismissed the flag; case continues at "${restoredStatus}".`,
          link: '/officer/complaints/' + id,
        });
      }
    } else {
      return fail('Unknown decision');
    }

    if (notes && decision !== 'escalate') {
      await db.complaint.update({ where: { id }, data: { supervisorNotes: String(notes).slice(0, 2000) } });
    }

    const fresh = await db.complaint.findUniqueOrThrow({ where: { id }, include: complaintInclude });
    return Response.json({ complaint: serializeComplaint(fresh, { includeInternal: true }) });
  } catch (err) {
    return handleError(err);
  }
}
