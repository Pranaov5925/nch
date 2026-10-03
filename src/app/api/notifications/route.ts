import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/nch/auth';
import { handleError, fail } from '@/lib/nch/api';
import { fmtDateTime } from '@/lib/nch/serialize';

// GET /api/notifications — current user's notifications
export async function GET() {
  try {
    const user = await requireUser();
    const list = await db.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return Response.json({
      notifications: list.map((n) => ({
        id: n.id,
        userId: n.userId,
        title: n.title,
        detail: n.detail,
        date: fmtDateTime(n.createdAt),
        read: n.read,
        type: n.type,
        link: n.link,
      })),
    });
  } catch (err) {
    return handleError(err);
  }
}

// POST /api/notifications — mark all (or one) as read
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => ({}));
    if (body.id) {
      await db.notification.updateMany({ where: { id: body.id, userId: user.id }, data: { read: true } });
    } else {
      await db.notification.updateMany({ where: { userId: user.id }, data: { read: true } });
    }
    return Response.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
