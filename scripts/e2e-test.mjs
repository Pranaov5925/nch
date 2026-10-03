#!/usr/bin/env node
// NCH 3.0 — Self-contained API end-to-end test (zero dependencies, Node 18+).
//
//   node scripts/e2e-test.mjs
//   E2E_BASE_URL=http://localhost:3001 node scripts/e2e-test.mjs
//
// Start the app first (`npm run dev`, or `npm run build && npm start`).
//
// The run exercises the FULL workflow against a live server:
//   register → complaint → officer review/forward → company response →
//   consumer confirmation → close, plus the guard rails (officer scope,
//   assignment integrity, company pre-forward isolation, confirmation rules,
//   ESC-02 dispute/escalation, public tracking).
//
// The run adds a few records to the database. Afterwards run
//   npm run db:seed
// to restore the pristine demo dataset.

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000';
const PW = 'demo1234';

let passed = 0;
let failed = 0;
const failures = [];

function check(cond, label, extra = '') {
  if (cond) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    failures.push(label);
    console.error(`  ✗ ${label}${extra ? ` — ${extra}` : ''}`);
  }
}

async function call(method, path, { body, cookie } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...(cookie ? { cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { /* non-JSON */ }
  const setCookie = res.headers.get('set-cookie');
  return { status: res.status, data, cookie: setCookie ? setCookie.split(';')[0] : null };
}

async function login(email, password = PW) {
  const res = await call('POST', '/api/auth/login', { body: { email, password } });
  if (res.status !== 200) throw new Error(`login failed for ${email}: HTTP ${res.status}`);
  return res.cookie;
}

async function main() {
  console.log(`\nNCH 3.0 E2E — ${BASE}\n`);

  // ── 0. Health ────────────────────────────────────────────────────────────
  console.log('0. Health');
  const health = await call('GET', '/api/stats');
  check(health.status === 200, 'GET /api/stats → 200');

  // ── 1. Consumer registration ─────────────────────────────────────────────
  console.log('1. Consumer registration');
  const email = `e2e-${Date.now()}@example.com`;
  const reg = await call('POST', '/api/auth/register', {
    body: { name: 'E2E Test Consumer', email, phone: '9999900000', address: 'E2E Street', password: 'e2epass123' },
  });
  check(reg.status === 201 && reg.data?.user?.role === 'consumer', 'register consumer → 201, role=consumer');
  const consumer = reg.cookie;

  const opts = await call('GET', '/api/companies/options', { cookie: consumer });
  const flipkart = (opts.data?.companies ?? []).find((c) => c.name.includes('Flipkart'));
  check(!!flipkart, 'company options list contains Flipkart');

  // ── 2. Complaint creation (docket format P1-11) ──────────────────────────
  console.log('2. Complaint creation');
  const mk = (subject) => call('POST', '/api/complaints', {
    cookie: consumer,
    body: {
      companyId: flipkart.id, sector: 'E-Commerce', category: 'Refund Issue', subCategory: 'Refund not received',
      subject, description: `${subject}. E2E automated case for workflow verification.`, amount: 1499, stateCode: 'DL',
    },
  });
  const c1res = await mk('E2E: damaged product, refund pending');
  check(c1res.status === 201, 'create complaint → 201');
  const c1 = c1res.data?.complaint;
  const DOCKET_RE = /^NCH\/\d{4}\/[A-Z]{2}\/\d{6}$/;
  check(DOCKET_RE.test(c1?.docketNumber ?? ''), `docket format NCH/YYYY/ST/NNNNNN (got ${c1?.docketNumber})`);

  // ── 3. Company isolation BEFORE forward (P0-3) ───────────────────────────
  console.log('3. Company isolation before forwarding');
  const company = await login('nch.nodal@flipkart.com');
  const preList = await call('GET', '/api/complaints', { cookie: company });
  check(!preList.data?.complaints?.some((c) => c.id === c1.id), 'company list does NOT contain the Registered complaint');
  const preDetail = await call('GET', `/api/complaints/${c1.id}`, { cookie: company });
  check(preDetail.status === 403, 'company detail access to un-forwarded complaint → 403');
  const preNotif = await call('GET', '/api/notifications', { cookie: company });
  check(!preNotif.data?.notifications?.some((n) => (n.detail || '').includes(c1.docketNumber)),
    'company NOT notified at registration time');

  // ── 4. Officer review + forward ──────────────────────────────────────────
  console.log('4. Officer review + forward');
  const officerA = await login('r.verma@nch.gov.in');
  const searchHit = await call('GET', `/api/complaints?q=${encodeURIComponent(c1.docketNumber)}`, { cookie: officerA });
  check(searchHit.data?.complaints?.some((c) => c.id === c1.id), 'officer search finds unassigned pool complaint');

  const review = await call('POST', `/api/complaints/${c1.id}/action`, { cookie: officerA, body: { action: 'start_review' } });
  check(review.status === 200 && review.data?.complaint?.status === 'Under Review', 'start_review → Under Review');
  const fwd = await call('POST', `/api/complaints/${c1.id}/action`, { cookie: officerA, body: { action: 'forward' } });
  check(fwd.status === 200 && fwd.data?.complaint?.status === 'Awaiting Response', 'forward → Awaiting Response');

  // ── 5. Officer B isolation (P0-1) ────────────────────────────────────────
  console.log('5. Officer access control');
  const officerB = await login('k.nair@nch.gov.in');
  const bDetail = await call('GET', `/api/complaints/${c1.id}`, { cookie: officerB });
  check(bDetail.status === 403, "officer B detail access to officer A's case → 403");
  const bSearch = await call('GET', `/api/complaints?q=${encodeURIComponent(c1.docketNumber)}`, { cookie: officerB });
  check(!bSearch.data?.complaints?.some((c) => c.id === c1.id), "officer B search does NOT leak officer A's case");
  const bRemark = await call('POST', `/api/complaints/${c1.id}/remarks`, { cookie: officerB, body: { remark: 'hijack remark' } });
  check(bRemark.status === 403, "officer B cannot annotate officer A's case → 403");

  // ── 6. Assignment integrity (P0-2) ───────────────────────────────────────
  console.log('6. Assignment integrity');
  const steal = await call('POST', `/api/complaints/${c1.id}/assign`, { cookie: officerB, body: {} });
  check(steal.status === 409, "officer B cannot take over officer A's case → 409");
  const sup = await login('m.agarwal@nch.gov.in');
  const supMe = await call('GET', '/api/auth/me', { cookie: sup });
  const supSelfAssign = await call('POST', `/api/complaints/${c1.id}/assign`, { cookie: sup, body: { officerId: supMe.data?.user?.id } });
  check(supSelfAssign.status === 400, 'supervisor cannot assign to themselves → 400');

  // ── 7. No premature resolution (P1-6) ────────────────────────────────────
  console.log('7. Officer cannot resolve early');
  const earlyResolve = await call('POST', `/api/complaints/${c1.id}/action`, { cookie: officerA, body: { action: 'mark_resolved' } });
  check(earlyResolve.status === 409, 'mark_resolved from Awaiting Response → 409');

  // ── 8. Company response after forward (P0-3) ─────────────────────────────
  console.log('8. Company response (post-forward visibility)');
  const postList = await call('GET', '/api/complaints', { cookie: company });
  check(postList.data?.complaints?.some((c) => c.id === c1.id), 'company list NOW contains the forwarded complaint');
  const postNotif = await call('GET', '/api/notifications', { cookie: company });
  check(postNotif.data?.notifications?.some((n) => (n.detail || '').includes(c1.docketNumber)),
    'company notified at forward time');
  const resp1 = await call('POST', `/api/complaints/${c1.id}/respond`, {
    cookie: company,
    body: { responseText: 'We have received the complaint and are investigating with the seller.', claimStatus: 'Under Process' },
  });
  check(resp1.status === 200 && resp1.data?.complaint?.status === 'Response Received', 'non-resolution response → Response Received');
  const resolveFromNonClaim = await call('POST', `/api/complaints/${c1.id}/action`, { cookie: officerA, body: { action: 'mark_resolved' } });
  check(resolveFromNonClaim.status === 409, 'mark_resolved from a non-resolution "Response Received" → 409');

  // ── 9. Consumer confirmation guard (P1-5) ────────────────────────────────
  console.log('9. Consumer confirmation guard');
  const badConfirm = await call('POST', `/api/complaints/${c1.id}/feedback`, {
    cookie: consumer, body: { rating: 5, confirmed: true, comments: 'ok' },
  });
  check(badConfirm.status === 409, 'confirming a non-claimed response → 409');

  const resp2 = await call('POST', `/api/complaints/${c1.id}/respond`, {
    cookie: company,
    body: { responseText: 'Full refund of ₹1,499 processed to the original payment source.', actionTaken: 'Refund processed', claimStatus: 'Resolution Claimed' },
  });
  check(resp2.status === 200 && resp2.data?.complaint?.status === 'Confirmation Pending', 'resolution claim → Confirmation Pending');

  const confirm = await call('POST', `/api/complaints/${c1.id}/feedback`, {
    cookie: consumer, body: { rating: 5, confirmed: true, comments: 'Refund received, thank you.' },
  });
  check(confirm.status === 200 && confirm.data?.complaint?.status === 'Resolved', 'consumer confirmation → Resolved');

  const close = await call('POST', `/api/complaints/${c1.id}/action`, { cookie: officerA, body: { action: 'close' } });
  check(close.status === 200 && close.data?.complaint?.status === 'Closed', 'officer close → Closed');

  // ── 10. ESC-02 dispute + supervisor decisions ────────────────────────────
  console.log('10. ESC-02 dispute + supervisor pipeline');
  const c2res = await mk('E2E: wrong item delivered, partial refund only');
  const c2 = c2res.data?.complaint;
  await call('POST', `/api/complaints/${c2.id}/action`, { cookie: officerA, body: { action: 'start_review' } });
  await call('POST', `/api/complaints/${c2.id}/action`, { cookie: officerA, body: { action: 'forward' } });
  const resp3 = await call('POST', `/api/complaints/${c2.id}/respond`, {
    cookie: company,
    body: { responseText: 'We can offer only 30% of the value as store credit.', claimStatus: 'Partial Resolution' },
  });
  check(resp3.status === 200, 'partial-resolution response recorded');
  const dispute = await call('POST', `/api/complaints/${c2.id}/feedback`, {
    cookie: consumer, body: { rating: 1, disputed: true, disputeReason: 'Store credit is not an acceptable remedy.' },
  });
  check(dispute.status === 200 && dispute.data?.complaint?.status === 'Reopened', 'consumer dispute → Reopened');
  check(dispute.data?.complaint?.escalation?.reasons?.some((r) => r.startsWith('Consumer rejected')) === true,
    'ESC-02 flag set on dispute (visible in escalation reasons)');

  const supReview = await call('POST', `/api/complaints/${c2.id}/escalate`, { cookie: sup, body: { decision: 'review', notes: 'Checking seller policy.' } });
  check(supReview.status === 200 && supReview.data?.complaint?.status === 'Escalation Review', 'supervisor review → Escalation Review');
  const dismiss = await call('POST', `/api/complaints/${c2.id}/escalate`, { cookie: sup, body: { decision: 'dismiss', notes: 'Company commits full refund within 48h.' } });
  const dismissed = dismiss.data?.complaint;
  // After a dismissal the case is back at its pre-review status and surfaces
  // NO active escalation object (an active flag would appear as `escalation`).
  check(dismissed?.status === 'Reopened' && !dismissed?.escalation,
    'dismiss restores pre-review status and clears the flag');

  // ── 10b. Rules-driven escalation + role-model guards ─────────────────────
  console.log('10b. Rules-driven escalation + role-model guards');
  // With the flag dismissed, the case carries NO active escalation evidence —
  // a supervisor must not be able to escalate it directly (rule → flag → human).
  const bareEscalate = await call('POST', `/api/complaints/${c2.id}/escalate`, { cookie: sup, body: { decision: 'escalate', notes: 'Repeat non-compliance.' } });
  check(bareEscalate.status === 409, 'supervisor escalate WITHOUT an active flag → 409');

  // A supervisor may review a case but must NOT become its assigned officer.
  const c3res = await mk('E2E: supervisor review must not self-assign');
  const c3 = c3res.data?.complaint;
  const supAction = await call('POST', `/api/complaints/${c3.id}/action`, { cookie: sup, body: { action: 'start_review' } });
  check(supAction.status === 200 && supAction.data?.complaint?.status === 'Under Review', 'supervisor start_review → Under Review');
  check(supAction.data?.complaint?.assignedOfficerId == null, 'supervisor start_review does NOT self-assign the case');
  // Officer can still take the unassigned case, and a FLAGGED case may be escalated.
  await call('POST', `/api/complaints/${c3.id}/assign`, { cookie: officerA, body: {} });
  await call('POST', `/api/complaints/${c3.id}/action`, { cookie: officerA, body: { action: 'forward' } });
  await call('POST', `/api/complaints/${c3.id}/respond`, {
    cookie: company,
    body: { responseText: 'We can offer only a partial refund as store credit.', claimStatus: 'Partial Resolution' },
  });
  const dispute3 = await call('POST', `/api/complaints/${c3.id}/feedback`, {
    cookie: consumer, body: { rating: 1, disputed: true, disputeReason: 'Store credit is not an acceptable remedy.' },
  });
  check(dispute3.status === 200 && dispute3.data?.complaint?.escalation != null, 'flagged case prepared for escalation');
  const escalate = await call('POST', `/api/complaints/${c3.id}/escalate`, { cookie: sup, body: { decision: 'escalate', notes: 'Repeat non-compliance.' } });
  check(escalate.status === 200 && escalate.data?.complaint?.status === 'Escalated', 'supervisor escalate WITH active flag → Escalated');

  // ── 11. Public tracking (contact-verified) ───────────────────────────────
  console.log('11. Public tracking');
  const trackOk = await call('GET', `/api/track?docket=${encodeURIComponent(c1.docketNumber)}&contact=${encodeURIComponent(email)}`);
  check(trackOk.status === 200 && trackOk.data?.complaint?.docketNumber === c1.docketNumber, 'tracking with correct docket + contact → 200');
  const tComplaint = trackOk.data?.complaint;
  check(Array.isArray(tComplaint?.timeline) && tComplaint.timeline.length > 0 &&
    tComplaint.timeline.every((e) => ['NCH Officer', 'NCH Supervisor', 'Organization', 'Consumer', 'NCH Rules Engine', 'NCH'].includes(e.actor)),
    'public timeline actors are role labels, not staff names');
  check(typeof tComplaint?.expectedResolutionDate === 'string' && ('companyExpectedResolutionDate' in tComplaint),
    'tracking exposes SLA response-due date and company completion date fields');
  const trackBad = await call('GET', `/api/track?docket=${encodeURIComponent(c1.docketNumber)}&contact=attacker@evil.com`);
  check(trackBad.status === 404, 'tracking with wrong contact → 404 (no leak)');

  // ── 12. Analytics sanity (P1-10) ─────────────────────────────────────────
  console.log('12. Analytics');
  const analytics = await call('GET', '/api/analytics', { cookie: sup });
  const eb = analytics.data?.escalationBreakdown;
  check(eb && ['escalated', 'escalationReview', 'flagged', 'reopened'].every((k) => typeof eb[k] === 'number'),
    'escalationBreakdown exposes flag-aware counters');
  const re = analytics.data?.recentEscalations ?? [];
  check(Array.isArray(re) && re.every((r) => typeof r.escalatedAt === 'string' && r.escalatedAt.length > 0),
    'recentEscalations entries carry an escalatedAt timestamp');
  const companyAnalytics = await call('GET', '/api/analytics', { cookie: company });
  check(companyAnalytics.status === 403, 'analytics restricted to staff (company → 403)');

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(46)}`);
  console.log(`RESULT: ${passed} passed, ${failed} failed`);
  if (failed) {
    console.log('Failed checks:');
    for (const f of failures) console.log(`  - ${f}`);
    process.exit(1);
  }
  console.log("All good. Run `npm run db:seed` to restore the pristine demo dataset.");
}

main().catch((err) => {
  console.error(`\nE2E aborted: ${err.message}`);
  console.log(`RESULT: ${passed} passed, ${failed} failed (before abort)`);
  process.exit(1);
});
