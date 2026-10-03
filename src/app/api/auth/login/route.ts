import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { verifyPassword, createSession } from '@/lib/nch/auth';
import { fail, handleError } from '@/lib/nch/api';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) return fail('Email and password are required');
    const user = await db.user.findUnique({ where: { email: String(email).toLowerCase().trim() } });
    if (!user || !verifyPassword(String(password), user.passwordHash)) {
      return fail('Invalid email or password', 401);
    }
    await createSession(user.id);
    return Response.json({
      user: { id: user.id, role: user.role, name: user.name, email: user.email, phone: user.phone },
    });
  } catch (err) {
    return handleError(err);
  }
}
