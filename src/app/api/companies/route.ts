import { db } from '@/lib/db';
import { requireRole } from '@/lib/nch/auth';
import { handleError } from '@/lib/nch/api';
import { TERMINAL_STATUSES } from '@/lib/nch/constants';

// GET /api/companies — supervisor: organizations with live stats
export async function GET() {
  try {
    await requireRole('supervisor', 'officer');
    const companies = await db.company.findMany({ orderBy: { name: 'asc' } });
    const result: Array<{
      id: string; name: string; sector: string; registrationNumber: string;
      contactEmail: string; contactPhone: string; nodalofficer: string;
      avgResponseDays: number; totalComplaints: number; resolvedComplaints: number;
      pendingComplaints: number; resolutionRate: number;
    }> = [];
    for (const c of companies) {
      const complaints = await db.complaint.findMany({
        where: { companyId: c.id },
        select: { id: true, resolvedAt: true, createdAt: true, responses: { select: { createdAt: true }, orderBy: { createdAt: 'asc' } } },
      });
      const resolved = complaints.filter((x) => x.resolvedAt).length;
      const pending = complaints.length - resolved;
      const responseTimes = complaints
        .filter((x) => x.responses.length > 0)
        .map((x) => (x.responses[0].createdAt.getTime() - x.createdAt.getTime()) / 86_400_000);
      const avgResponseDays = responseTimes.length ? Math.round((responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) * 10) / 10 : 0;
      result.push({
        id: c.id,
        name: c.name,
        sector: c.sector,
        registrationNumber: c.registrationNumber,
        contactEmail: c.contactEmail,
        contactPhone: c.contactPhone,
        nodalofficer: c.nodalOfficer,
        avgResponseDays,
        totalComplaints: complaints.length,
        resolvedComplaints: resolved,
        pendingComplaints: pending,
        resolutionRate: complaints.length ? Math.round((resolved / complaints.length) * 1000) / 10 : 0,
      });
    }
    return Response.json({ companies: result });
  } catch (err) {
    return handleError(err);
  }
}
