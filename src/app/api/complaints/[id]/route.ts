import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/nch/auth';
import { fail, handleError } from '@/lib/nch/api';
import { serializeComplaint, complaintInclude } from '@/lib/nch/serialize';
import { syncEscalationFlag } from '@/lib/nch/escalation-sync';
import { isCompanyHiddenStatus } from '@/lib/nch/constants';

// GET /api/complaints/[id] — full detail, role-checked
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const complaint = await db.complaint.findUnique({ where: { id }, include: complaintInclude });
    if (!complaint) return fail('Complaint not found', 404);

    // Access matrix:
    //  - consumer: only their own complaints
    //  - company:  only their company's complaints AND only once NCH has
    //              forwarded/escalated the case to them (never pre-forwarding
    //              internal stages)
    //  - officer:  complaints assigned to them OR still unassigned in the pool
    //  - supervisor: all complaints
    if (
      (user.role === 'consumer' && complaint.consumerId !== user.id) ||
      (user.role === 'company' && (complaint.companyId !== user.companyId || isCompanyHiddenStatus(complaint.status))) ||
      (user.role === 'officer' && complaint.assignedOfficerId !== null && complaint.assignedOfficerId !== user.id)
    ) {
      return fail('You do not have access to this complaint', 403);
    }

    // Write-on-read SLA flagging runs ONLY in staff workflows. Consumers and
    // companies get a plain read; public tracking is fully read-only.
    if (user.role === 'officer' || user.role === 'supervisor') {
      await syncEscalationFlag(complaint);
      const freshAfterSync = await db.complaint.findUniqueOrThrow({ where: { id }, include: complaintInclude });
      const includeInternal = user.role === 'officer' || user.role === 'supervisor';
      return Response.json({ complaint: serializeComplaint(freshAfterSync, { includeInternal }) });
    }

    const includeInternal = false;
    return Response.json({ complaint: serializeComplaint(complaint, { includeInternal }) });
  } catch (err) {
    return handleError(err);
  }
}
