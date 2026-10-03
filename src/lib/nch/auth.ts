// NCH 3.0 — Auth: scrypt password hashing + DB-backed session cookies.
// Deliberately simple (no NextAuth) — this is a 2-credit prototype.

import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import type { UserRole } from './types';

export const SESSION_COOKIE = 'nch_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString('hex');
  await db.session.create({
    data: { id: token, userId, expiresAt: new Date(Date.now() + SESSION_TTL_MS) },
  });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_MS / 1000,
  });
  return token;
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.session.deleteMany({ where: { id: token } });
    jar.delete(SESSION_COOKIE);
  }
}

export interface SessionUser {
  id: string;
  role: UserRole;
  name: string;
  email: string;
  phone: string;
  address: string | null;
  designation: string | null;
  companyId: string | null;
  companyName: string | null;
  createdAt: Date;
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    const jar = await cookies();
    const token = jar.get(SESSION_COOKIE)?.value;
    if (!token) return null;
    const session = await db.session.findUnique({
      where: { id: token },
      include: { user: { include: { company: true } } },
    });
    if (!session) return null;
    if (session.expiresAt.getTime() < Date.now()) {
      await db.session.delete({ where: { id: token } }).catch(() => undefined);
      return null;
    }
    const u = session.user;
    return {
      id: u.id,
      role: u.role as UserRole,
      name: u.name,
      email: u.email,
      phone: u.phone,
      address: u.address,
      designation: u.designation,
      companyId: u.companyId,
      companyName: u.company?.name ?? null,
      createdAt: u.createdAt,
    };
  } catch {
    return null;
  }
}

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new HttpError(401, 'Not authenticated');
  return user;
}

export async function requireRole(...roles: UserRole[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) throw new HttpError(403, 'Insufficient permissions for this action');
  return user;
}
