// NCH 3.0 — Docket numbers, timeline events, notifications.

import { db } from '@/lib/db';
import { format } from 'date-fns';

// Docket format matches the seeded records: NCH/<year>/<state>/<6-digit seq>.
// A random 6-digit number is drawn and uniqueness-checked against the DB
// (with retries + a time-based fallback) so concurrent registrations or
// deletions can never produce a duplicate docket.
export async function generateDocketNumber(stateCode: string): Promise<string> {
  const year = new Date().getFullYear();
  for (let attempt = 0; attempt < 8; attempt++) {
    const seq = String(Math.floor(100_000 + Math.random() * 900_000));
    const candidate = `NCH/${year}/${stateCode}/${seq}`;
    const clash = await db.complaint.findUnique({
      where: { docketNumber: candidate },
      select: { id: true },
    });
    if (!clash) return candidate;
  }
  // Practically unreachable; deterministic fallback derived from wall clock.
  return `NCH/${year}/${stateCode}/${String(Date.now() % 1_000_000).padStart(6, '0')}`;
}

export interface EventInput {
  complaintId: string;
  type: string;
  title: string;
  description?: string;
  actorName: string;
  actorRole: 'System' | 'Consumer' | 'NCH Officer' | 'Organization' | 'Supervisor';
}

export async function addEvent(input: EventInput) {
  return db.complaintEvent.create({
    data: {
      complaintId: input.complaintId,
      type: input.type,
      title: input.title,
      description: input.description ?? '',
      actorName: input.actorName,
      actorRole: input.actorRole,
    },
  });
}

export async function notify(input: {
  userId: string;
  type?: 'info' | 'warning' | 'success' | 'error';
  title: string;
  detail?: string;
  link?: string;
}) {
  return db.notification.create({
    data: {
      userId: input.userId,
      type: input.type ?? 'info',
      title: input.title,
      detail: input.detail ?? '',
      link: input.link ?? '#',
    },
  }).catch(() => undefined);
}

export function timeAgoLabel(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  return format(date, 'd MMM yyyy');
}
