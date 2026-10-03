import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/nch/auth';
import { fail, handleError } from '@/lib/nch/api';
import { serializeComplaint, complaintInclude } from '@/lib/nch/serialize';
import { addEvent, notify } from '@/lib/nch/server-utils';
import { COMPANY_RESPONSE_STATUSES } from '@/lib/nch/constants';

// POST /api/complaints/[id]/respond — company submits an official response
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole('company');
    const { id } = await params;
    const { responseText, actionTaken, claimStatus, expectedResolutionDate } = await req.json();

    if (!responseText || !claimStatus) return fail('Response text and claim status are required');
    if (!(COMPANY_RESPONSE_STATUSES as readonly string[]).includes(claimStatus)) {
      return fail(`Invalid claim status — must be one of: ${COMPANY_RESPONSE_STATUSES.join(', ')}`);
    }
    const complaint = await db.complaint.findUnique({ where: { id }, include: { consumer: true, company: true } });
    if (!complaint) return fail('Complaint not found', 404);
    if (complaint.companyId !== user.companyId) return fail('This complaint belongs to another company', 403);

    // Companies can only respond to cases NCH has actually forwarded to them.
    // 'Under Review' (still with the NCH officer) is deliberately absent.
    const active = ['Forwarded', 'Awaiting Response', 'Action Pending', 'Response Received', 'Escalated', 'Reopened'];
    if (!active.includes(complaint.status)) {
      return fail(`A response cannot be submitted while the complaint is "${complaint.status}"`, 409);
    }

    await db.companyResponse.create({
      data: {
        complaintId: id,
        responseText: String(responseText).slice(0, 6000),
        actionTaken: String(actionTaken ?? '').slice(0, 2000),
        claimStatus,
        expectedResolutionDate: expectedResolutionDate ? new Date(expectedResolutionDate) : null,
        respondedById: user.id,
        respondedByName: `${user.name} (${complaint.company.nodalOfficer || 'Nodal Officer'})`,
      },
    });

    const claimed = claimStatus === 'Resolution Claimed';
    await db.complaint.update({
      where: { id },
      data: { status: claimed ? 'Confirmation Pending' : 'Response Received' },
    });

    await addEvent({
      complaintId: id,
      type: 'RESPONSE',
      title: claimed ? 'Organization Responded — Resolution Claimed' : 'Organization Responded',
      description: claimed
        ? `${complaint.company.name} claimed the grievance is resolved. The consumer is asked to confirm or dispute.`
        : `${complaint.company.name} submitted a response (status: ${claimStatus}).`,
      actorName: complaint.company.nodalOfficer || 'Nodal Officer',
      actorRole: 'Organization',
    });

    await notify({
      userId: complaint.consumerId,
      type: claimed ? 'warning' : 'info',
      title: claimed ? 'Action required: confirm resolution' : 'Response received from ' + complaint.company.name,
      detail: `${complaint.docketNumber} — ${claimed ? 'please confirm whether the claimed resolution has reached you.' : 'the organization responded to your complaint.'}`,
      link: '/consumer/complaints/' + id,
    });

    // The responsible officer (or the supervisor pool when unassigned) must
    // know the organization responded — the case cannot progress otherwise.
    if (complaint.assignedOfficerId) {
      await notify({
        userId: complaint.assignedOfficerId,
        type: claimed ? 'warning' : 'info',
        title: claimed ? 'Organization claims resolution' : 'Organization response received',
        detail: `${complaint.docketNumber} — ${complaint.company.name} responded (status: ${claimStatus}).`,
        link: '/officer/complaints/' + id,
      });
    } else {
      const supervisors = await db.user.findMany({ where: { role: 'supervisor' }, select: { id: true } });
      for (const s of supervisors) {
        await notify({
          userId: s.id,
          type: claimed ? 'warning' : 'info',
          title: claimed ? 'Organization claims resolution' : 'Organization response received',
          detail: `${complaint.docketNumber} — ${complaint.company.name} responded (status: ${claimStatus}). Case is unassigned.`,
          link: '/supervisor/complaints',
        });
      }
    }

    const fresh = await db.complaint.findUniqueOrThrow({ where: { id }, include: complaintInclude });
    return Response.json({ complaint: serializeComplaint(fresh, { includeInternal: false }) });
  } catch (err) {
    return handleError(err);
  }
}
