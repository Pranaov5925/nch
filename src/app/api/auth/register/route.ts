import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, createSession } from '@/lib/nch/auth';
import { fail, handleError } from '@/lib/nch/api';

export async function POST(req: NextRequest) {
  try {
    const { name, email, phone, address, password } = await req.json();
    if (!name || !email || !password) return fail('Name, email and password are required');
    if (String(password).length < 8) return fail('Password must be at least 8 characters');
    const emailNorm = String(email).toLowerCase().trim();
    const exists = await db.user.findUnique({ where: { email: emailNorm } });
    if (exists) return fail('An account with this email already exists', 409);
    const user = await db.user.create({
      data: {
        role: 'consumer',
        name: String(name).trim(),
        email: emailNorm,
        phone: String(phone ?? '').trim(),
        address: String(address ?? '').trim(),
        passwordHash: hashPassword(String(password)),
      },
    });
    await createSession(user.id);
    return Response.json({
      user: { id: user.id, role: user.role, name: user.name, email: user.email, phone: user.phone },
    }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
