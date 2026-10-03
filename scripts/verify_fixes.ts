// Behavioral verification of the audit fixes — runs against localhost:3000.
// Usage: bun scripts/verify_fixes.ts
const BASE = 'http://localhost:3000';
const PW = 'demo1234';

let pass = 0, fail = 0;
function check(name: string, cond: boolean, extra = '') {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ FAIL: ${name} ${extra}`); }
}

async function login(email: string): Promise<string> {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PW }),
  });
  const setCookie = res.headers.get('set-cookie') ?? '';
  if (!res.ok) throw new Error(`login failed for ${email}: ${res.status}`);
  return setCookie.split(';')[0];
}

async function req(cookie: string, path: string, init?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', Cookie: cookie, ...(init?.headers ?? {}) },
  });
  let body: any = null;
  try { body = await res.json(); } catch { /* ignore */ }
  return { status: res.status, body };
}

async function main() {
  const sup = await login('m.agarwal@nch.gov.in');
  const off1 = await login('r.verma@nch.gov.in');
  const off3 = await login('d.sharma@nch.gov.in');
  const cons = await login('priya.sharma@gmail.com');
  const cons2 = await login('suresh.patil@hotmail.com');
  const flip = await login('nch.nodal@flipkart.com');
  const jio = await login('nch.grievance@jio.com');

  // locate seeded complaints
  const list = await req(sup, '/api/complaints');
  const by = (frag: string) => list.body.complaints.find((c: any) => c.subject.includes(frag));
  const c01 = by('Refund of ₹8,499');
  const c02 = by('Unauthorized deduction of ₹2,199');
  const c08 = by('noise-cancelling headphones');
  const c10 = by('Broadband outage for 11 days');
  const c11 = by('Double premium deduction');
  const c13 = by('Samsung TV panel');
  const c14 = by('marked "delivered"');
  check('seed data loaded (14 complaints)', list.body.complaints.length === 14);

  console.log('\n[#1] Escalation dismissal semantics');
  check('c01 auto-flagged by staff read (ESC-01)', c01.escalation != null, `got ${c01.escalation}`);
  check('c10 seeded in Escalation Review, flagged', c10.status === 'Escalation Review' && c10.escalation != null);
  let r = await req(sup, `/api/complaints/${c01.id}/escalate`, { method: 'POST', body: JSON.stringify({ decision: 'dismiss', notes: 'Not needed for demo' }) });
  check('dismiss c01 → 200', r.status === 200, `got ${r.status}`);
  check('dismiss c01 → status preserved (Awaiting Response)', r.body?.complaint?.status === 'Awaiting Response', `got ${r.body?.complaint?.status}`);
  const relist = await req(off1, '/api/complaints');
  const c01again = relist.body.complaints.find((c: any) => c.id === c01.id);
  check('c01 NOT re-flagged on later reads (dismissal memory)', c01again.escalation == null, `got ${JSON.stringify(c01again.escalation)}`);
  r = await req(sup, `/api/complaints/${c10.id}/escalate`, { method: 'POST', body: JSON.stringify({ decision: 'dismiss', notes: 'SLA waived for demo' }) });
  check('dismiss c10 (stuck-review fix) → status restored, not Escalation Review', r.status === 200 && r.body?.complaint?.status !== 'Escalation Review', `got ${r.body?.complaint?.status}`);
  r = await req(sup, `/api/complaints/${c01.id}/escalate`, { method: 'POST', body: JSON.stringify({ decision: 'dismiss' }) });
  check('dismiss without active flag → 409', r.status === 409, `got ${r.status}`);

  console.log('\n[#5] Closure requires consumer confirmation');
  r = await req(off3, `/api/complaints/${c11.id}/action`, { method: 'POST', body: JSON.stringify({ action: 'mark_resolved' }) });
  check('officer resolves c11 → 200', r.status === 200, `got ${r.status}`);
  r = await req(off3, `/api/complaints/${c11.id}/action`, { method: 'POST', body: JSON.stringify({ action: 'close' }) });
  check('close c11 WITHOUT confirmation → 409', r.status === 409, `got ${r.status}`);
  r = await req(off1, `/api/complaints/${c13.id}/action`, { method: 'POST', body: JSON.stringify({ action: 'close' }) });
  check('close c13 WITH confirmed feedback → 200', r.status === 200, `got ${r.status} ${JSON.stringify(r.body)?.slice(0, 120)}`);

  console.log('\n[#6] Assignment role model');
  r = await req(sup, `/api/complaints/${c08.id}/assign`, { method: 'POST', body: JSON.stringify({}) });
  check('supervisor assign without officerId → 400', r.status === 400, `got ${r.status}`);
  const roster = await req(sup, '/api/officers');
  const off1row = roster.body.officers.find((o: any) => o.email === 'r.verma@nch.gov.in');
  const off2row = roster.body.officers.find((o: any) => o.email === 'k.nair@nch.gov.in');
  const supMe = await req(sup, '/api/auth/me');
  r = await req(sup, `/api/complaints/${c08.id}/assign`, { method: 'POST', body: JSON.stringify({ officerId: supMe.body?.user?.id }) });
  check('supervisor self-assign → 400', r.status === 400, `got ${r.status}`);
  r = await req(sup, `/api/complaints/${c08.id}/assign`, { method: 'POST', body: JSON.stringify({ officerId: off1row.id }) });
  check('supervisor assigns to real officer → 200', r.status === 200, `got ${r.status}`);
  r = await req(off1, `/api/complaints/${c08.id}/assign`, { method: 'POST', body: JSON.stringify({ officerId: off2row.id }) });
  check('officer cannot assign others → 403', r.status === 403, `got ${r.status}`);

  console.log('\n[#7/#14] Company response: validation + officer notification');
  r = await req(jio, `/api/complaints/${c02.id}/respond`, { method: 'POST', body: JSON.stringify({ responseText: 'test', claimStatus: 'Bogus Status' }) });
  check('invalid claimStatus → 400', r.status === 400, `got ${r.status}`);
  r = await req(jio, `/api/complaints/${c02.id}/respond`, { method: 'POST', body: JSON.stringify({ responseText: 'Refund credited confirmation follow-up.', claimStatus: 'Under Process' }) });
  check('valid response → 200', r.status === 200, `got ${r.status}`);
  const off2sess = await login('k.nair@nch.gov.in');
  const off2notifs = await req(off2sess, '/api/notifications');
  check('assigned officer notified of response', JSON.stringify(off2notifs.body?.notifications ?? []).includes('Organization response received') || JSON.stringify(off2notifs.body?.notifications ?? []).includes('Organization claims resolution'));

  console.log('\n[#8] Flag-aware analytics');
  const an = await req(sup, '/api/analytics');
  const bd = an.body?.escalationBreakdown;
  check('escalationBreakdown present', !!bd && typeof bd.flagged === 'number');
  check('escalatedActive is flag-aware union', an.body?.overview?.escalatedActive === (bd.escalated + bd.escalationReview + bd.flagged + bd.reopened));

  console.log('\n[#13] Public tracking: contact-verified, read-only');
  const docket = encodeURIComponent(c01.docketNumber);
  r = await req('', `/api/track?docket=${docket}`);
  check('docket without contact → 400', r.status === 400, `got ${r.status}`);
  r = await req('', `/api/track?docket=${docket}&contact=wrong@attacker.com`);
  check('docket + wrong contact → 404', r.status === 404, `got ${r.status}`);
  r = await req('', `/api/track?docket=${docket}&contact=priya.sharma@gmail.com`);
  check('docket + registered email → 200', r.status === 200, `got ${r.status}`);
  r = await req('', `/api/track?docket=${docket}&contact=9876543210`);
  check('docket + registered mobile → 200', r.status === 200, `got ${r.status}`);

  console.log('\n[ESC-02] Dispute re-flags and overrides dismissal');
  r = await req(cons2, `/api/complaints/${c14.id}/feedback`, { method: 'POST', body: JSON.stringify({ rating: 1, disputed: true, disputeReason: 'Refund not actually received' }) });
  check('consumer dispute → 200', r.status === 200, `got ${r.status}`);
  check('dispute → status Reopened', r.body?.complaint?.status === 'Reopened', `got ${r.body?.complaint?.status}`);
  const fl = await req(sup, '/api/complaints');
  const c14b = fl.body.complaints.find((c: any) => c.id === c14.id);
  check('dispute → flagged for escalation (ESC-02)', c14b.escalation != null, `got ${JSON.stringify(c14b.escalation)}`);

  console.log(`\n═══ RESULT: ${pass} passed, ${fail} failed ═══`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => { console.error('test run error:', e); process.exit(1); });
