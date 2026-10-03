import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/nch/auth';
import { fail, handleError } from '@/lib/nch/api';
import { complaintInclude, serializeComplaint } from '@/lib/nch/serialize';
import { addEvent } from '@/lib/nch/server-utils';

// POST /api/complaints/[id]/remarks — officer internal/external remark
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole('officer', 'supervisor');
    const { id } = await params;
    const { remark, isInternal } = await req.json();
    if (!remark || !String(remark).trim()) return fail('Remark text is required');

    const complaint = await db.complaint.findUnique({ where: { id } });
    if (!complaint) return fail('Complaint not found', 404);
    // Officers may only annotate complaints assigned to them or unassigned
    // pool cases — same access rule as the detail view and the AI endpoint.
    if (user.role === 'officer' && complaint.assignedOfficerId !== null && complaint.assignedOfficerId !== user.id) {
      return fail('This complaint is assigned to another officer', 403);
    }

    await db.officerRemark.create({
      data: {
        complaintId: id,
        officerId: user.id,
        officerName: user.name,
        remark: String(remark).slice(0, 3000),
        isInternal: isInternal !== false,
      },
    });

    await addEvent({
      complaintId: id,
      type: 'REMARK',
      title: isInternal === false ? 'Officer Remark (shared)' : 'Internal Officer Remark',
      description: String(remark).slice(0, 500),
      actorName: user.name,
      actorRole: 'NCH Officer',
    });

    const fresh = await db.complaint.findUniqueOrThrow({ where: { id }, include: complaintInclude });
    return Response.json({ complaint: serializeComplaint(fresh, { includeInternal: true }) });
  } catch (err) {
    return handleError(err);
  }
}
