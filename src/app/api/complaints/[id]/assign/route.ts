import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/nch/auth';
import { fail, handleError } from '@/lib/nch/api';
import { complaintInclude, serializeComplaint } from '@/lib/nch/serialize';
import { addEvent, notify } from '@/lib/nch/server-utils';

// POST /api/complaints/[id]/assign — supervisor assigns, officer self-assigns
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole('officer', 'supervisor');
    const { id } = await params;
    const { officerId } = await req.json();

    const complaint = await db.complaint.findUnique({ where: { id } });
    if (!complaint) return fail('Complaint not found', 404);

    // Role model: officers may only self-assign; supervisors always assign to
    // an actual officer account (never to themselves).
    let targetId: string;
    let targetName: string;
    if (user.role === 'officer') {
      if (officerId && officerId !== user.id) {
        return fail('Officers can only assign complaints to themselves', 403);
      }
      // Workflow integrity: an officer cannot take over a case that another
      // officer already owns. Reassignment is a supervisor decision.
      if (complaint.assignedOfficerId && complaint.assignedOfficerId !== user.id) {
        return fail('This complaint is already assigned to another officer — ask a supervisor to reassign it', 409);
      }
      if (complaint.assignedOfficerId === user.id) {
        return fail('This complaint is already assigned to you', 409);
      }
      targetId = user.id;
      targetName = user.name;
    } else {
      if (!officerId) return fail('Supervisors must specify the officer to assign');
      if (officerId === user.id) {
        return fail('Supervisors cannot assign complaints to themselves — choose an officer account', 400);
      }
      const target = await db.user.findUnique({ where: { id: officerId } });
      if (!target || target.role !== 'officer') return fail('Unknown officer', 404);
      targetId = target.id;
      targetName = target.name;
    }

    await db.complaint.update({ where: { id }, data: { assignedOfficerId: targetId } });
    await addEvent({
      complaintId: id, type: 'ASSIGNED', title: 'Officer Assigned',
      description: `${complaint.docketNumber} assigned to ${targetName}.`,
      actorName: user.name, actorRole: user.role === 'supervisor' ? 'Supervisor' : 'NCH Officer',
    });
    if (targetId !== user.id) {
      await notify({
        userId: targetId, type: 'info', title: 'Complaint assigned to you',
        detail: `${complaint.docketNumber} — ${complaint.subject.slice(0, 80)}`,
        link: '/officer/complaints/' + id,
      });
    }

    const fresh = await db.complaint.findUniqueOrThrow({ where: { id }, include: complaintInclude });
    return Response.json({ complaint: serializeComplaint(fresh, { includeInternal: true }) });
  } catch (err) {
    return handleError(err);
  }
}
