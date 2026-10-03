import { db } from '@/lib/db';
import { requireUser } from '@/lib/nch/auth';
import { handleError } from '@/lib/nch/api';

// GET /api/companies/options — any authenticated user: lightweight company list
// for the complaint registration form.
export async function GET() {
  try {
    await requireUser();
    const companies = await db.company.findMany({
      select: { id: true, name: true, sector: true },
      orderBy: { name: 'asc' },
    });
    return Response.json({ companies });
  } catch (err) {
    return handleError(err);
  }
}
