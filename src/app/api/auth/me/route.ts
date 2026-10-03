import { getCurrentUser } from '@/lib/nch/auth';
import { handleError } from '@/lib/nch/api';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ user: null });
    return Response.json({
      user: {
        id: user.id,
        role: user.role,
        name: user.name,
        email: user.email,
        phone: user.phone,
        designation: user.designation,
        companyId: user.companyId,
        companyName: user.companyName,
        createdAt: user.createdAt.toISOString(),
      },
    });
  } catch (err) {
    return handleError(err);
  }
}
