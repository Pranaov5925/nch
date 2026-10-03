// NCH 3.0 — Live escalation flagging (write-on-read)
// The rules engine runs whenever STAFF complaint data is fetched: an SLA breach
// on an active complaint is PERSISTED as an escalation flag + timeline event +
// supervisor notification. The flag never changes the status by itself —
// a supervisor decides (human-in-the-loop).
//
// Dismissal semantics: once a supervisor dismisses a flag, the SAME condition
// (the fixed SLA deadline of this complaint) will not auto-re-flag. The memory
// is cleared when genuinely new escalation evidence appears (e.g. the consumer
// disputes a resolution — see the feedback route), so new breaches of process
// still surface. Public tracking NEVER runs this sync (read-only).

import { db } from '@/lib/db';
import { evaluateSla } from './rules';
import { addEvent, notify } from './server-utils';
import { isActiveStatus } from './constants';

export interface SyncableComplaint {
  id: string;
  docketNumber: string;
  status: string;
  createdAt: Date;
  slaDeadline: Date;
  escalationFlagged: boolean;
  escalationReasons: string | null;
  escalationDismissedAt: Date | null;
}

/** @returns true if this call newly flagged the complaint. */
export async function syncEscalationFlag(c: SyncableComplaint): Promise<boolean> {
  if (!isActiveStatus(c.status) || c.escalationFlagged) return false;
  const sla = evaluateSla(c.createdAt, c.slaDeadline);
  if (!sla.breached) return false;

  // A supervisor has already dismissed a flag on this complaint. The SLA
  // deadline is fixed, so this is the SAME condition — do not re-flag it.
  // (Human decision wins over the rule until new evidence appears.)
  if (c.escalationDismissedAt) return false;

  const reasons: string[] = c.escalationReasons ? JSON.parse(c.escalationReasons) : [];
  const reason = `SLA deadline exceeded by ${sla.overdueHours}h without resolution`;
  if (!reasons.includes(reason)) reasons.push(reason);

  await db.complaint.update({
    where: { id: c.id },
    data: { escalationFlagged: true, escalationReasons: JSON.stringify(reasons) },
  });

  await addEvent({
    complaintId: c.id,
    type: 'ESCALATION_FLAG',
    title: 'Flagged for Escalation Review',
    description: `Rule ESC-01 triggered: ${reason}. The case status is unchanged — awaiting supervisor review (human-in-the-loop).`,
    actorName: 'NCH Rules Engine',
    actorRole: 'System',
  });

  const supervisors = await db.user.findMany({ where: { role: 'supervisor' }, select: { id: true } });
  for (const s of supervisors) {
    await notify({
      userId: s.id,
      type: 'warning',
      title: 'Escalation review flagged',
      detail: `${c.docketNumber} — ${reason}. Supervisor decision required.`,
      link: '/supervisor/escalations',
    });
  }
  return true;
}

/** Run the flag check over a batch of complaints. @returns how many were newly flagged. */
export async function syncEscalationFlags(list: SyncableComplaint[]): Promise<number> {
  let flagged = 0;
  for (const c of list) {
    try {
      if (await syncEscalationFlag(c)) flagged++;
    } catch (e) {
      console.error('[escalation-sync]', e);
    }
  }
  return flagged;
}
