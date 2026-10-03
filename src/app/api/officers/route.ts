import { db } from '@/lib/db';
import { requireRole } from '@/lib/nch/auth';
import { handleError } from '@/lib/nch/api';
import type { Sector } from '@/lib/nch/types';

// GET /api/officers — supervisor/officer: officer roster with live stats
export async function GET() {
  try {
    await requireRole('supervisor', 'officer');
    const officers = await db.user.findMany({ where: { role: 'officer' }, orderBy: { name: 'asc' } });
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const result: Array<{
      id: string; name: string; empId: string; email: string; phone: string;
      designation: string; department: string; sectors: Sector[]; supervisorId: string;
      assignedComplaints: number; resolvedThisMonth: number; avgResolutionDays: number; joinedAt: string;
    }> = [];
    for (const o of officers) {
      const assigned = await db.complaint.findMany({
        where: { assignedOfficerId: o.id },
        select: { id: true, resolvedAt: true, createdAt: true },
      });
      const resolvedThisMonth = assigned.filter((c) => c.resolvedAt && c.resolvedAt >= monthStart).length;
      const durations = assigned
        .filter((c) => c.resolvedAt)
        .map((c) => (c.resolvedAt!.getTime() - c.createdAt.getTime()) / 86_400_000);
      result.push({
        id: o.id,
        name: o.name,
        empId: `NCH/DL/OFF/${o.createdAt.getFullYear()}/${1000 + parseInt(o.id.slice(-4), 36) || 1}`,
        email: o.email,
        phone: o.phone,
        designation: o.designation ?? 'Consumer Affairs Officer',
        department: 'NCH Grievance Resolution Unit',
        sectors: (o.sectors ? JSON.parse(o.sectors) : []) as Sector[],
        supervisorId: 'sup001',
        assignedComplaints: assigned.filter((c) => !c.resolvedAt).length,
        resolvedThisMonth,
        avgResolutionDays: durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0,
        joinedAt: o.createdAt.toISOString(),
      });
    }
    return Response.json({ officers: result });
  } catch (err) {
    return handleError(err);
  }
}
