import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/nch/auth';
import { fail, handleError } from '@/lib/nch/api';
import { serializeComplaint, complaintInclude } from '@/lib/nch/serialize';
import { OFFICER_TRANSITIONS } from '@/lib/nch/constants';
import { addEvent, notify } from '@/lib/nch/server-utils';

// POST /api/complaints/[id]/action — officer state-machine actions
// action: start_review | forward | action_pending | request_confirmation | mark_resolved | close
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole('officer', 'supervisor');
    const { id } = await params;
    const { action } = await req.json();
    const complaint = await db.complaint.findUnique({
      where: { id },
      include: { consumer: true, company: true, feedback: true },
    });
    if (!complaint) return fail('Complaint not found', 404);
    if (user.role === 'officer' && complaint.assignedOfficerId && complaint.assignedOfficerId !== user.id) {
      return fail('This complaint is assigned to another officer', 403);
    }

    const allowed = OFFICER_TRANSITIONS[action];
    if (!allowed) return fail('Unknown action');
    if (!allowed.includes(complaint.status)) {
      return fail(`Action "${action}" is not allowed from status "${complaint.status}"`, 409);
    }

    const actorName = user.name;
    const data: Record<string, unknown> = {};
    let event: { type: string; title: string; description: string } | null = null;

    switch (action) {
      case 'start_review':
        data.status = 'Under Review';
        // ROLE MODEL: only an OFFICER may become the assigned officer by taking
        // an action. A supervisor may review/forward but must not silently
        // become the case owner — assignment for supervisors goes through the
        // dedicated /assign route targeting a real officer.
        if (user.role === 'officer' && !complaint.assignedOfficerId) data.assignedOfficerId = user.id;
        event = { type: 'STATUS_CHANGE', title: 'Under Review', description: `Complaint taken up for review by ${actorName}.`, };
        break;
      case 'forward':
        data.status = 'Awaiting Response';
        if (user.role === 'officer' && !complaint.assignedOfficerId) data.assignedOfficerId = user.id;
        event = { type: 'FORWARDED', title: 'Forwarded to Organization', description: `Complaint forwarded to ${complaint.company.name} via the official NCH channel with a response deadline per the sector SLA.` };
        break;
      case 'action_pending':
        data.status = 'Action Pending';
        event = { type: 'STATUS_CHANGE', title: 'Action Pending', description: `Officer marked the case Action Pending for follow-up.`, };
        break;
      case 'request_confirmation':
        data.status = 'Confirmation Pending';
        event = { type: 'STATUS_CHANGE', title: 'Confirmation Pending', description: 'Consumer asked to confirm whether the organization response resolves the grievance.' };
        break;
      case 'mark_resolved':
        data.status = 'Resolved';
        data.resolvedAt = new Date();
        event = { type: 'STATUS_CHANGE', title: 'Resolved', description: `Officer marked the complaint Resolved after verification of the remedy.` };
        break;
      case 'close': {
        // Workflow invariant: normal closure requires the consumer to have
        // CONFIRMED the resolution (the aggrieved party is the deciding vote).
        if (!complaint.feedback?.confirmed) {
          return fail(
            'Consumer confirmation is required before closing. Use "request_confirmation" and wait for the consumer to confirm the remedy on their case page.',
            409
          );
        }
        data.status = 'Closed';
        data.closedAt = new Date();
        event = { type: 'CLOSED', title: 'Complaint Closed', description: 'Resolved case closed by the assigned officer after consumer confirmation of the remedy.' };
        break;
      }
    }

    await db.complaint.update({ where: { id }, data });
    // Audit trail must reflect WHO acted — supervisors are not officers.
    await addEvent({
      complaintId: id, ...event!,
      actorName, actorRole: user.role === 'supervisor' ? 'Supervisor' : 'NCH Officer',
    });

    // notify consumer on consumer-visible transitions
    if (['forward', 'request_confirmation', 'mark_resolved', 'close'].includes(action)) {
      const map: Record<string, { type: 'info' | 'success' | 'warning'; title: string; detail: string }> = {
        forward: { type: 'info', title: 'Complaint forwarded to organization', detail: `${complaint.docketNumber} — ${complaint.company.name} has been asked to respond within the SLA window.` },
        request_confirmation: { type: 'warning', title: 'Action required: confirm resolution', detail: `${complaint.docketNumber} — please review the organization's response and confirm or dispute it.` },
        mark_resolved: { type: 'success', title: 'Complaint resolved', detail: `${complaint.docketNumber} — marked resolved. Rate your experience on the case page.` },
        close: { type: 'success', title: 'Complaint closed', detail: `${complaint.docketNumber} — your complaint was resolved and closed.` },
      };
      const n = map[action];
      await notify({ userId: complaint.consumerId, ...n, link: '/consumer/complaints/' + id });
    }

    // WORKFLOW: the organization is informed — and gains access to the case —
    // exactly when NCH forwards it, never at registration time.
    if (action === 'forward') {
      const companyUsers = await db.user.findMany({
        where: { companyId: complaint.companyId, role: 'company' }, select: { id: true },
      });
      for (const cu of companyUsers) {
        await notify({
          userId: cu.id, type: 'info',
          title: 'New complaint forwarded for your response',
          detail: `${complaint.docketNumber} — NCH has forwarded this grievance to your organization. Please respond within the SLA window.`,
          link: '/company/complaints/' + id,
        });
      }
    }

    const fresh = await db.complaint.findUniqueOrThrow({ where: { id }, include: complaintInclude });
    return Response.json({ complaint: serializeComplaint(fresh, { includeInternal: true }) });
  } catch (err) {
    return handleError(err);
  }
}
