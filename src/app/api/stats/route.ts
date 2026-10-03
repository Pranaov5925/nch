import { db } from '@/lib/db';
import { handleError } from '@/lib/nch/api';
import { TERMINAL_STATUSES } from '@/lib/nch/constants';

// GET /api/stats — public aggregate counts for the landing page
export async function GET() {
  try {
    const [total, resolvedThisMonth, closed] = await Promise.all([
      db.complaint.count(),
      db.complaint.count({
        where: { resolvedAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } },
      }),
      db.complaint.count({ where: { status: { in: [...TERMINAL_STATUSES] } } }),
    ]);
    return Response.json({
      total,
      resolvedThisMonth,
      resolutionRate: total ? Math.round((closed / total) * 1000) / 10 : 0,
    });
  } catch (err) {
    return handleError(err);
  }
}
