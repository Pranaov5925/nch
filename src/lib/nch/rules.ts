// NCH 3.0 — Escalation Rules Engine
//
// ARCHITECTURAL INVARIANT: escalation is decided ONLY by deterministic
// rules in this file. The LLM layer never decides, scores, or triggers
// escalation — it can only explain an already-flagged case (human-in-the-loop).
//
// Rules (as agreed in the project blueprint):
//   R1. SLA breach  — now > createdAt + slaHours while the complaint is still
//       active → flag for "Escalation Review". A flag NEVER changes the status
//       by itself; a supervisor (human) reviews and decides.
//   R2. Consumer dissatisfaction — consumer rejects the proposed resolution →
//       status becomes "Reopened" AND the complaint is flagged for escalation
//       review. (Hard transition, consumer is a party of the process.)
//
// NOTE: feedback-ratio / sentiment-based escalation was deliberately REMOVED
// from the design — ratings are recorded but never trigger escalation.
//
// The SLA deadline is fixed at registration (createdAt + slaHours) and never
// resets on status changes, so the clock cannot be tampered with by updates.

import type { Complaint, EscalationInfo, Priority } from './types';
import { isActiveStatus } from './constants';

export interface SlaEvaluation {
  breached: boolean;
  overdueHours: number;
  hoursRemaining: number;
}

export function evaluateSla(
  createdAt: Date,
  slaDeadline: Date,
  now: Date = new Date()
): SlaEvaluation {
  const diffMs = now.getTime() - slaDeadline.getTime();
  const hours = (ms: number) => Math.round((ms / 3_600_000) * 10) / 10;
  return {
    breached: diffMs > 0,
    overdueHours: diffMs > 0 ? hours(diffMs) : 0,
    hoursRemaining: diffMs <= 0 ? hours(-diffMs) : 0,
  };
}

function riskLevelFor(amount: number | null | undefined, overdueHours: number, priority: string): Priority {
  if ((amount ?? 0) >= 25000 || overdueHours > 48) return 'Critical';
  if ((amount ?? 0) >= 10000 || overdueHours > 0 || priority === 'High' || priority === 'Critical') return 'High';
  return 'Medium';
}

export function recommendedActionFor(reasons: string[], overdueHours: number): string {
  if (reasons.some((r) => r.startsWith('Consumer rejected'))) {
    return 'Supervisor to review the dispute, re-engage the organization and record a decision in the case file.';
  }
  if (overdueHours > 0) {
    return `Organization response overdue by ${overdueHours}h. Supervisor to review and escalate to the company nodal officer if unresolved.`;
  }
  return 'Supervisor to review the case and decide whether to escalate.';
}

export interface RuleContext {
  status: string;
  priority: string;
  amount?: number | null;
  createdAt: Date;
  slaDeadline: Date;
  escalationFlagged: boolean;
  escalationReasons: string | null;
  hasDisputeFlag?: boolean;
}

export function buildEscalationInfo(
  ctx: RuleContext,
  now: Date = new Date()
): EscalationInfo {
  const sla = evaluateSla(ctx.createdAt, ctx.slaDeadline, now);
  const active = isActiveStatus(ctx.status);
  const persisted: string[] = ctx.escalationReasons ? JSON.parse(ctx.escalationReasons) : [];

  // Live SLA reason only counts while the case is active; a breach that is
  // later resolved keeps its history via persisted reasons.
  const reasons = new Set(persisted);
  if (sla.breached && active) {
    reasons.add(`SLA deadline exceeded by ${sla.overdueHours}h without resolution`);
  }

  const isEscalated = ctx.status === 'Escalated';
  return {
    isEscalated,
    escalationLevel: isEscalated ? 1 : 0,
    reasons: Array.from(reasons),
    riskLevel: riskLevelFor(ctx.amount, sla.overdueHours, ctx.priority),
    recommendedAction: recommendedActionFor(Array.from(reasons), sla.overdueHours),
    aiGenerated: false, // rules are deterministic; AI only explains, never generates this
  };
}

export function slaInfoFor(c: { createdAt: Date; slaDeadline: Date; slaHours: number }, now: Date = new Date()) {
  const e = evaluateSla(c.createdAt, c.slaDeadline, now);
  return {
    hours: c.slaHours,
    deadline: c.slaDeadline.toISOString(),
    breached: e.breached,
    overdueHours: e.overdueHours,
    hoursRemaining: e.hoursRemaining,
  };
}
