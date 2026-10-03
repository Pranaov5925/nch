import { destroySession } from '@/lib/nch/auth';
import { handleError } from '@/lib/nch/api';

export async function POST() {
  try {
    await destroySession();
    return Response.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
