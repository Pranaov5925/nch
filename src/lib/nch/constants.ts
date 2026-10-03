// NCH 3.0 — Domain constants & rules configuration
//
// PROTOTYPE ASSUMPTION (DEMO_SLA_MULTIPLIER):
// SLA windows below are the documented prototype timelines and are NOT real
// NCH timelines. Set DEMO_SLA_MULTIPLIER (env) to scale every window at once:
// deadline = base hours × multiplier. Example: 0.02 turns the 48h Banking
// window into ~58 minutes so SLA breaches surface live during a demo.
// Default multiplier is 1 (documented windows apply unchanged).

export const ACTIVE_STATUSES = [
  'Registered',
  'Under Review',
  'Forwarded',
  'Awaiting Response',
  'Response Received',
  'Action Pending',
  'Resolution Claimed',
  'Confirmation Pending',
  'Escalation Review',
  'Escalated',
  'Reopened',
] as const;

export const TERMINAL_STATUSES = ['Resolved', 'Closed'] as const;

export function isActiveStatus(status: string): boolean {
  return (ACTIVE_STATUSES as readonly string[]).includes(status);
}

// Sector → SLA hours (prototype values; multiplied by DEMO_SLA_MULTIPLIER)
export const SECTOR_SLA_HOURS: Record<string, number> = {
  'Banking & Finance': 48,
  'E-Commerce': 72,
  'Consumer Electronics': 72,
  Telecom: 72,
  Insurance: 96,
  Aviation: 96,
  'Real Estate': 96,
  Automobiles: 96,
  'Food & Beverage': 96,
  Healthcare: 96,
  Education: 96,
  Petroleum: 96,
  'Power / Electricity': 96,
  Railway: 96,
  'Postal Services': 96,
  Others: 96,
};

export const DEFAULT_SLA_HOURS = 96;

export function demoSlaMultiplier(): number {
  const raw = Number(process.env.DEMO_SLA_MULTIPLIER ?? '1');
  return Number.isFinite(raw) && raw > 0 ? raw : 1;
}

// UI copy derived from the SLA table so screens never hard-code stale numbers.
export const SLA_WINDOW_SUMMARY = `Banking ${SECTOR_SLA_HOURS['Banking & Finance']}h · E-Commerce / Electronics / Telecom ${SECTOR_SLA_HOURS['E-Commerce']}h · other sectors ${DEFAULT_SLA_HOURS}h`;
export const SLA_WINDOW_RANGE = `${Math.min(...Object.values(SECTOR_SLA_HOURS))}–${Math.max(...Object.values(SECTOR_SLA_HOURS))}h`;

// Workflow gating: an organization gains access to a complaint only once NCH
// has actually forwarded (or escalated) it to them. These internal stages are
// never visible to company accounts.
export const COMPANY_HIDDEN_STATUSES = ['Registered', 'Under Review', 'Escalation Review'] as const;
export function isCompanyHiddenStatus(status: string): boolean {
  return (COMPANY_HIDDEN_STATUSES as readonly string[]).includes(status);
}

export function slaHoursForSector(sector: string): number {
  const base = SECTOR_SLA_HOURS[sector] ?? DEFAULT_SLA_HOURS;
  return Math.max(1, Math.round(base * demoSlaMultiplier()));
}

// Priority auto-derivation from amount involved (₹)
export function derivePriority(amount?: number | null): 'Low' | 'Medium' | 'High' | 'Critical' {
  if (amount == null) return 'Medium';
  if (amount >= 25000) return 'Critical';
  if (amount >= 10000) return 'High';
  if (amount >= 1000) return 'Medium';
  return 'Low';
}

export const bumpPriority = (p: string): string =>
  p === 'Low' ? 'Medium' : p === 'Medium' ? 'High' : 'Critical';

// Officer-forwarded complaints wait on the organization under this status
export const STATUS_AFTER_FORWARD = 'Awaiting Response';

// Indian state codes used in docket numbers
export const STATE_CODES = [
  'AP', 'AR', 'AS', 'BR', 'CG', 'DL', 'GA', 'GJ', 'HR', 'HP', 'JK', 'JH', 'KA',
  'KL', 'MP', 'MH', 'MN', 'OD', 'PB', 'RJ', 'TN', 'TS', 'UK', 'UP', 'WB',
] as const;

export const COMPANY_RESPONSE_STATUSES = [
  'Resolution Claimed',
  'Partial Resolution',
  'Rejected',
  'Under Process',
] as const;

export const CHANNELS = ['Online Portal', 'Helpline Call', 'Mobile App', 'Walk-in', 'Email'] as const;

// Officer actions → allowed from-status (state machine guard)
export const OFFICER_TRANSITIONS: Record<string, string[]> = {
  start_review: ['Registered', 'Reopened'],
  forward: ['Under Review', 'Reopened', 'Response Received', 'Action Pending'],
  action_pending: ['Response Received', 'Awaiting Response', 'Forwarded'],
  // mark_resolved deliberately EXCLUDES 'Under Review': a case must pass
  // through the organization-response stage (or an explicit consumer
  // confirmation request) before an officer may mark it resolved.
  // It also EXCLUDES 'Response Received': that status means the latest
  // organization response was NOT a resolution claim ("Under Process",
  // "Rejected", partial) — an officer must not override a non-resolution
  // response with "Resolved". The proper paths are request_confirmation
  // (the consumer decides) or action_pending (follow-up).
  mark_resolved: ['Confirmation Pending', 'Action Pending', 'Escalated'],
  close: ['Resolved'],
  request_confirmation: ['Response Received', 'Resolution Claimed'],
};

export const AI_DISCLAIMER =
  'AI-generated advisory output — displayed for assistance only. It is not a decision, does not influence escalation, and must be verified against the case record by the responsible officer.';
