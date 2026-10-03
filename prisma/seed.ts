// NCH 3.0 (Prototype) — Seed data
// Demo accounts + 14 complaints covering every state of the machine.
// Dates are RELATIVE TO NOW so SLA rules produce live breach flags.
// Run: npm run db:seed   (or: bun prisma/seed.ts)

import { PrismaClient, Prisma } from '@prisma/client';
import { randomBytes, scryptSync } from 'crypto';
import { demoSlaMultiplier } from '../src/lib/nch/constants';

const db = new PrismaClient();

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}

const now = Date.now();
const ago = (days: number, hours = 0) => new Date(now - days * 86_400_000 - hours * 3_600_000);
const PW = 'demo1234';

const SECTOR_SLA: Record<string, number> = {
  'Banking & Finance': 48,
  'E-Commerce': 72,
  Telecom: 72,
  'Consumer Electronics': 72,
  Insurance: 96,
  Aviation: 96,
  'Real Estate': 96,
};
const slaH = (s: string) => SECTOR_SLA[s] ?? 96;

async function main() {
  console.log('Seeding NCH 3.0 prototype…');

  // wipe (FK-safe order)
  await db.aiCache.deleteMany();
  await db.notification.deleteMany();
  await db.feedback.deleteMany();
  await db.companyResponse.deleteMany();
  await db.officerRemark.deleteMany();
  await db.document.deleteMany();
  await db.complaintEvent.deleteMany();
  await db.complaint.deleteMany();
  await db.session.deleteMany();
  await db.user.deleteMany();
  await db.company.deleteMany();

  // ─── Companies ──────────────────────────────────────────────────────────
  const companies = await Promise.all(
    [
      { id: 'comp001', name: 'Flipkart India Pvt. Ltd.', sector: 'E-Commerce', registrationNumber: 'CIN: U51109KA2012PTC066107', contactEmail: 'nch.nodal@flipkart.com', contactPhone: '1800-420-9227', nodalOfficer: 'Rajiv Menon' },
      { id: 'comp002', name: 'Reliance Jio Infocomm Ltd.', sector: 'Telecom', registrationNumber: 'CIN: U72900MH2007PLC168314', contactEmail: 'nch.grievance@jio.com', contactPhone: '1800-889-9999', nodalOfficer: 'Santosh Kumar' },
      { id: 'comp003', name: 'HDFC Bank Ltd.', sector: 'Banking & Finance', registrationNumber: 'CIN: L65920MH1994PLC080618', contactEmail: 'nch.nodal@hdfcbank.com', contactPhone: '1800-202-6161', nodalOfficer: 'Anita Goswami' },
      { id: 'comp004', name: 'Star Health and Allied Insurance Co. Ltd.', sector: 'Insurance', registrationNumber: 'CIN: L66010TN2005PLC056649', contactEmail: 'nch.grievance@starhealth.in', contactPhone: '1800-425-2255', nodalOfficer: 'Dr. Pradeep Iyer' },
      { id: 'comp005', name: 'IndiGo Airlines', sector: 'Aviation', registrationNumber: 'CIN: L62100DL2004PLC129768', contactEmail: 'nch.nodal@goindigo.in', contactPhone: '0124-6173838', nodalOfficer: 'Meera Krishnan' },
      { id: 'comp006', name: 'Samsung India Electronics Pvt. Ltd.', sector: 'Consumer Electronics', registrationNumber: 'CIN: U32109DL1995PTC072781', contactEmail: 'nch.grievance@samsung.com', contactPhone: '1800-5-726786', nodalOfficer: 'Arun Bhatia' },
      { id: 'comp007', name: 'Lodha Group (Macrotech Developers Ltd.)', sector: 'Real Estate', registrationNumber: 'CIN: L45200MH1995PLC093041', contactEmail: 'nch.nodal@lodhagroup.com', contactPhone: '022-61985000', nodalOfficer: 'Vikash Jain' },
      { id: 'comp008', name: 'Amazon Seller Services Pvt. Ltd.', sector: 'E-Commerce', registrationNumber: 'CIN: U51909KA2012PTC066090', contactEmail: 'nch.nodal@amazon.in', contactPhone: '1800-3000-9009', nodalOfficer: 'Suchita Reddy' },
    ].map((c) => db.company.create({ data: c }))
  );
  const comp = Object.fromEntries(companies.map((c) => [c.id, c]));

  // ─── Users ──────────────────────────────────────────────────────────────
  const mkUser = (data: Record<string, string>) =>
    db.user.create({ data: { ...data, passwordHash: hashPassword(PW) } as Prisma.UserCreateArgs['data'] });
  const [u1, u2, u3, u4, u5, off1, off2, off3, sup1] = await Promise.all([
    mkUser({ id: 'u001', role: 'consumer', name: 'Priya Sharma', email: 'priya.sharma@gmail.com', phone: '9876543210', address: 'B-204, Sector 62, Noida, Uttar Pradesh - 201301' }),
    mkUser({ id: 'u002', role: 'consumer', name: 'Suresh Patil', email: 'suresh.patil@hotmail.com', phone: '8765432109', address: '12, Andheri West, Mumbai, Maharashtra - 400058' }),
    mkUser({ id: 'u003', role: 'consumer', name: 'Anjali Krishnamurthy', email: 'anjali.k@yahoo.com', phone: '7654321098', address: '45, Jayanagar 4th Block, Bengaluru, Karnataka - 560011' }),
    mkUser({ id: 'u004', role: 'consumer', name: 'Murugesan Rajan', email: 'm.rajan1972@gmail.com', phone: '9543218765', address: '7, Anna Nagar West, Chennai, Tamil Nadu - 600040' }),
    mkUser({ id: 'u005', role: 'consumer', name: 'Vikram Singh Rathore', email: 'vikram.rathore@rediffmail.com', phone: '9812345678', address: 'C-14, Vaishali Nagar, Jaipur, Rajasthan - 302021' }),
    mkUser({ id: 'off001', role: 'officer', name: 'Ramesh Kumar Verma', email: 'r.verma@nch.gov.in', phone: '9810001122', designation: 'Consumer Affairs Officer' }),
    mkUser({ id: 'off002', role: 'officer', name: 'Kavitha Nair', email: 'k.nair@nch.gov.in', phone: '9810002233', designation: 'Consumer Affairs Officer' }),
    mkUser({ id: 'off003', role: 'officer', name: 'Deepak Sharma', email: 'd.sharma@nch.gov.in', phone: '9810003344', designation: 'Senior Consumer Affairs Officer' }),
    mkUser({ id: 'sup001', role: 'supervisor', name: 'Meena Agarwal', email: 'm.agarwal@nch.gov.in', phone: '9810004455', designation: 'Grievance Supervisor, NCH Grievance Resolution Unit' }),
  ]);

  // Company nodal logins — one per seeded organization so the company portal
  // can be exercised end-to-end for every demo company (password: demo1234).
  const companyUsers = await Promise.all([
    mkUser({ id: 'comp_user001', role: 'company', name: 'Flipkart Nodal Team', email: 'nch.nodal@flipkart.com', phone: '8000001111', companyId: 'comp001' }),
    mkUser({ id: 'comp_user002', role: 'company', name: 'Jio Grievance Team', email: 'nch.grievance@jio.com', phone: '8000002222', companyId: 'comp002' }),
    mkUser({ id: 'comp_user003', role: 'company', name: 'HDFC Bank Nodal Team', email: 'nch.nodal@hdfcbank.com', phone: '8000003333', companyId: 'comp003' }),
    mkUser({ id: 'comp_user004', role: 'company', name: 'Star Health Grievance Team', email: 'nch.grievance@starhealth.in', phone: '8000004444', companyId: 'comp004' }),
    mkUser({ id: 'comp_user005', role: 'company', name: 'IndiGo Nodal Team', email: 'nch.nodal@goindigo.in', phone: '8000005555', companyId: 'comp005' }),
    mkUser({ id: 'comp_user006', role: 'company', name: 'Samsung Grievance Team', email: 'nch.grievance@samsung.com', phone: '8000006666', companyId: 'comp006' }),
    mkUser({ id: 'comp_user007', role: 'company', name: 'Lodha Nodal Team', email: 'nch.nodal@lodhagroup.com', phone: '8000007777', companyId: 'comp007' }),
    mkUser({ id: 'comp_user008', role: 'company', name: 'Amazon Nodal Team', email: 'nch.nodal@amazon.in', phone: '8000008888', companyId: 'comp008' }),
  ]);
  const flipkartUser = companyUsers[0];

  const officers: Record<string, { id: string; name: string }> = { off1: { id: off1.id, name: off1.name }, off2: { id: off2.id, name: off2.name }, off3: { id: off3.id, name: off3.name } };
  const yr = new Date().getFullYear();
  let seq = 478200;

  type Ev = [daysAgo: number, hoursAgo: number, type: string, title: string, desc: string, actor: string, role: string];

  async function seedComplaint(o: {
    consumer: { id: string; name: string };
    companyId: string; sector: string; category: string; subCategory: string;
    subject: string; description: string; amount?: number; stateCode: string;
    status: string; priority: string; officer?: { id: string; name: string };
    channel?: string; createdDaysAgo: number;
    events: Ev[]; docs?: Array<[daysAgo: number, name: string, type: string, size: string]>;
    remarks?: Array<{ officer: { id: string; name: string }; daysAgo: number; text: string }>;
    response?: { daysAgo: number; text: string; action: string; claim: string; expectedDays: number };
    feedback?: { rating: number; comments: string; confirmed?: boolean; disputed?: boolean; reason?: string; daysAgo: number };
    resolvedDaysAgo?: number; closedDaysAgo?: number;
    supervisorNotes?: string;
    escalationFlagged?: boolean;
    escalationReasons?: string[];
  }) {
    const createdAt = ago(o.createdDaysAgo);
    // Apply the DEMO_SLA_MULTIPLIER so demo acceleration affects seeded
    // deadlines exactly like live-registered complaints.
    const hours = Math.max(1, Math.round(slaH(o.sector) * demoSlaMultiplier()));
    seq += 1;
    const c = await db.complaint.create({
      data: {
        docketNumber: `NCH/${yr}/${o.stateCode}/${seq}`,
        consumerId: o.consumer.id, companyId: o.companyId,
        sector: o.sector, category: o.category, subCategory: o.subCategory,
        subject: o.subject, description: o.description, amount: o.amount,
        stateCode: o.stateCode, status: o.status, priority: o.priority,
        channel: o.channel ?? 'Online Portal',
        assignedOfficerId: o.officer?.id,
        slaHours: hours, slaDeadline: new Date(createdAt.getTime() + hours * 3_600_000),
        escalationFlagged: o.escalationFlagged ?? false,
        escalationReasons: o.escalationReasons ? JSON.stringify(o.escalationReasons) : null,
        createdAt, updatedAt: ago(o.events[0][0], o.events[0][1]),
        resolvedAt: o.resolvedDaysAgo != null ? ago(o.resolvedDaysAgo) : null,
        closedAt: o.closedDaysAgo != null ? ago(o.closedDaysAgo) : null,
        supervisorNotes: o.supervisorNotes,
      },
    });
    for (const [d, h, type, title, desc, actor, role] of o.events) {
      await db.complaintEvent.create({ data: { complaintId: c.id, type, title, description: desc, actorName: actor, actorRole: role, createdAt: ago(d, h) } });
    }
    for (const [d, name, type, size] of o.docs ?? []) {
      await db.document.create({ data: { complaintId: c.id, name, type, size, uploadedBy: o.consumer.name, createdAt: ago(d) } });
    }
    for (const r of o.remarks ?? []) {
      await db.officerRemark.create({ data: { complaintId: c.id, officerId: r.officer.id, officerName: r.officer.name, remark: r.text, isInternal: true, createdAt: ago(r.daysAgo) } });
    }
    if (o.response) {
      await db.companyResponse.create({
        data: {
          complaintId: c.id, responseText: o.response.text, actionTaken: o.response.action,
          claimStatus: o.response.claim, expectedResolutionDate: ago(-o.response.expectedDays),
          respondedById: 'nodal-' + o.companyId, respondedByName: comp[o.companyId].nodalOfficer + ' (Nodal Officer)',
          createdAt: ago(o.response.daysAgo),
        },
      });
    }
    if (o.feedback) {
      await db.feedback.create({
        data: {
          complaintId: c.id, rating: o.feedback.rating, comments: o.feedback.comments,
          confirmed: o.feedback.confirmed ?? false, disputed: o.feedback.disputed ?? false,
          disputeReason: o.feedback.reason, createdAt: ago(o.feedback.daysAgo),
        },
      });
    }
    return c;
  }

  const sys = (n: string) => (n === 'sys' ? 'NCH System' : n);
  const R = 'System', O = 'NCH Officer', C = 'Consumer', G = 'Organization', S = 'Supervisor';

  // ─── 14 complaints across all states ────────────────────────────────────
  const c01 = await seedComplaint({
    consumer: u1, companyId: 'comp001', sector: 'E-Commerce', category: 'Refund Not Received', subCategory: 'Cancelled Order Refund',
    subject: 'Refund of ₹8,499 not received after order cancellation - 45 days pending',
    description: 'I placed an order for a Samsung Galaxy Buds2 Pro (Order ID: FK-2024-08-12-4782931) on 12th August. The total amount of ₹8,499 was debited from my SBI account via UPI (UTR: 424896732145).\n\nI cancelled the order on 14th August as delivery was delayed beyond the promised date. Flipkart confirmed the cancellation and committed to refund within 7 working days.\n\nIt has now been over 45 days and I have not received the refund. I raised 4 complaints with Flipkart customer care (Ticket IDs: FK-CS-789234, FK-CS-812456, FK-CS-834521, FK-CS-856743). Each time I am told the refund will be processed within 2-3 days, but nothing has happened. My bank confirms no refund credit was received. I request immediate processing of my refund with compensation for the delay.',
    amount: 8499, stateCode: 'UP', status: 'Awaiting Response', priority: 'High', officer: officers.off1, createdDaysAgo: 6,
    events: [
      [6, 0, 'REGISTERED', 'Complaint Registered', 'Consumer registered grievance on NCH portal. Docket generated.', sys('sys'), R],
      [5.8, 0, 'STATUS_CHANGE', 'Under Review', 'Complaint assigned to NCH Officer Sh. Ramesh Kumar Verma for initial review and verification.', sys('sys'), R],
      [5.5, 0, 'FORWARDED', 'Forwarded to Organization', 'Complaint forwarded to Flipkart India Pvt. Ltd. via official NCH channel with response deadline per SLA.', 'Ramesh Kumar Verma', O],
      [2, 0, 'REMINDER', 'Reminder Sent', 'Flipkart has not responded within the stipulated window. Automated reminder sent to the nodal officer.', sys('sys'), R],
    ],
    docs: [[5.9, 'Bank_Statement_Aug_2024.pdf', 'PDF', '345 KB'], [5.9, 'Flipkart_Order_Confirmation.png', 'PNG', '128 KB'], [5.8, 'Cancellation_Confirmation_Email.pdf', 'PDF', '89 KB'], [4, 'Customer_Care_Ticket_Screenshots.pdf', 'PDF', '512 KB']],
    remarks: [
      { officer: officers.off1, daysAgo: 5.4, text: 'Documents verified. UPI transaction confirmed in bank statement. Complaint appears genuine. Forwarded to Flipkart nodal officer with high priority tag.' },
      { officer: officers.off1, daysAgo: 2, text: 'Flipkart has not responded to initial forwarding. First reminder sent. Escalation recommended if no response by the SLA deadline.' },
    ],
  });

  const c02 = await seedComplaint({
    consumer: u2, companyId: 'comp002', sector: 'Telecom', category: 'Billing Dispute', subCategory: 'Excess Charges / Unauthorized Deduction',
    subject: 'Unauthorized deduction of ₹2,199 from prepaid account without consent',
    description: 'I am a Jio prepaid customer with mobile number 8765432109. On 15th September, an amount of ₹2,199 was deducted from my Jio account without my knowledge or consent for an alleged JioSaavn Premium Annual Subscription.\n\nI have never subscribed to JioSaavn Premium and had not activated any such service. I received no prior SMS or notification before the deduction.\n\nI contacted Jio customer care (Call ID: JIO-2024-09-16-4532187). The representative assured the amount would be refunded within 5 working days. No refund received. This is a clear case of unauthorized deduction and I request a full refund.',
    amount: 2199, stateCode: 'MH', status: 'Response Received', priority: 'Medium', officer: officers.off2, channel: 'Helpline Call', createdDaysAgo: 2.5,
    events: [
      [2.5, 0, 'REGISTERED', 'Complaint Registered', 'Consumer complaint registered via helpline. Docket generated.', 'NCH Helpline', R],
      [2.2, 0, 'STATUS_CHANGE', 'Under Review', 'Complaint assigned to NCH Officer Smt. Kavitha Nair for verification.', sys('sys'), R],
      [2, 0, 'FORWARDED', 'Forwarded to Organization', 'Complaint forwarded to Jio nodal officer for response within SLA.', 'Kavitha Nair', O],
      [0.8, 0, 'RESPONSE', 'Organization Responded', 'Jio submitted a response acknowledging an inadvertent deduction and stating the refund process has been initiated.', 'Jio Nodal Team', G],
    ],
    docs: [[2.4, 'Jio_Account_Statement.pdf', 'PDF', '234 KB']],
    response: { daysAgo: 0.8, text: 'We have investigated the matter and confirmed that the JioSaavn Premium subscription was activated inadvertently. We sincerely apologize for the inconvenience. The refund of ₹2,199 has been initiated and will reflect in the customer account within 3-5 business days.', action: 'Subscription cancelled. Refund of ₹2,199 initiated via Jio wallet credit. Deactivation confirmation SMS sent to customer.', claim: 'Under Process', expectedDays: 4 },
    remarks: [{ officer: officers.off2, daysAgo: 0.6, text: 'Jio has responded. Refund claimed as initiated. Monitoring until consumer confirms receipt.' }],
  });

  const c03 = await seedComplaint({
    consumer: u3, companyId: 'comp003', sector: 'Banking & Finance', category: 'Unauthorized Transaction', subCategory: 'Fraudulent UPI Transaction',
    subject: 'Fraudulent UPI transaction of ₹45,000 from savings account - bank refusing to reverse',
    description: 'On 20th August I received a call from someone claiming to be from HDFC Bank, stating my account was linked to a suspicious device and asked me to click a link to secure my account. I was deceived into completing a UPI payment of ₹45,000 to UPI ID: fraud.payments@axl.\n\nI reported the fraud to HDFC Bank within 30 minutes (Ref: HDFC-FRAUD-2024-08-20-8934521), informed the branch the same day and filed a police complaint (FIR No. 2024/8/1847, Jayanagar Police Station).\n\nHDFC Bank has refused to reverse the transaction claiming I "voluntarily" completed the payment. This is contrary to RBI guidelines on unauthorised transactions where the customer informs the bank promptly. I request NCH intervention for a refund of ₹45,000.',
    amount: 45000, stateCode: 'KA', status: 'Escalated', priority: 'Critical', officer: officers.off1, createdDaysAgo: 20,
    escalationFlagged: true,
    escalationReasons: ['Consumer rejected the proposed resolution (ESC-02)', 'SLA deadline exceeded by 408h without resolution'],
    events: [
      [20, 0, 'REGISTERED', 'Complaint Registered', 'High-value banking fraud case registered. Docket generated.', sys('sys'), R],
      [19.8, 0, 'STATUS_CHANGE', 'Priority Assigned — Critical', 'Complaint flagged Critical due to high amount (₹45,000) and banking fraud nature. Assigned to officer.', sys('sys'), R],
      [19.5, 0, 'FORWARDED', 'Forwarded to Organization', 'Formal notice issued to HDFC Bank Ltd. requesting a detailed response within SLA.', 'Ramesh Kumar Verma', O],
      [16, 0, 'RESPONSE', 'Organization Response Received', 'HDFC Bank submitted a response claiming the customer voluntarily completed the transaction and the bank is not liable.', 'HDFC Bank Nodal Team', G],
      [15, 0, 'FEEDBACK', 'Consumer Dispute Filed', 'Consumer disputed the response as inadequate and contrary to RBI guidelines.', u3.name, C],
      [13, 0, 'ESCALATION', 'Escalation Review Initiated', 'Supervisor moved the case to escalation review: high amount, consumer dispute, possible guideline violation.', 'Meena Agarwal', S],
      [11, 0, 'ESCALATED', 'Escalated to Organization (Supervisor)', 'Supervisor escalated the case to HDFC Bank principal nodal officer with a 7-day compliance window. Priority retained Critical.', 'Meena Agarwal', S],
    ],
    docs: [[19.9, 'FIR_Copy_Jayanagar_PS.pdf', 'PDF', '512 KB'], [19.9, 'UPI_Transaction_Screenshot.png', 'PNG', '96 KB'], [18, 'RBI_Ombudsman_Complaint.pdf', 'PDF', '220 KB']],
    remarks: [
      { officer: officers.off1, daysAgo: 16.5, text: 'HDFC response is a flat denial. FIR and RBI ombudsman refs verified. Supervisor review requested.' },
      { officer: officers.off1, daysAgo: 10, text: 'Escalated by supervisor. Awaiting bank compliance.' },
    ],
    supervisorNotes: 'Escalated to principal nodal officer on review of FIR, RBI guideline references and consumer dispute. Compliance window: 7 days.',
  });

  const c04 = await seedComplaint({
    consumer: u4, companyId: 'comp004', sector: 'Insurance', category: 'Claim Delay', subCategory: 'Cashless Claim Rejection / Delay',
    subject: 'Cashless claim of ₹18,500 rejected despite valid policy - hospital discharge blocked for 2 days',
    description: 'My father (Policy No. SH-2021-4456-88) was admitted for emergency gallbladder surgery. The hospital raised a cashless request which Star Health rejected citing "non-disclosure of pre-existing condition" — a condition diagnosed AFTER this admission, so non-disclosure is impossible.\n\nWe were forced to pay ₹18,500 out of pocket and the discharge was delayed by two days. We appealed with all records including the first-dagnosis report. Requesting reimbursement of ₹18,500 with interest and action against the improper rejection.',
    amount: 18500, stateCode: 'TN', status: 'Confirmation Pending', priority: 'High', officer: officers.off3, createdDaysAgo: 3,
    events: [
      [3, 0, 'REGISTERED', 'Complaint Registered', 'Grievance registered on the portal. Docket generated.', sys('sys'), R],
      [2.8, 0, 'STATUS_CHANGE', 'Under Review', 'Assigned to Senior Officer Sh. Deepak Sharma. Policy documents requested from consumer.', sys('sys'), R],
      [2.5, 0, 'FORWARDED', 'Forwarded to Organization', 'Complaint forwarded to Star Health with policy number and discharge summary.', 'Deepak Sharma', O],
      [1, 0, 'RESPONSE', 'Organization Responded — Resolution Claimed', 'Star Health confirmed reimbursement of ₹18,500 has been approved and payment processed to the consumer account.', 'Star Health Nodal Team', G],
    ],
    docs: [[2.9, 'Policy_Document.pdf', 'PDF', '1.2 MB'], [2.9, 'Discharge_Summary.pdf', 'PDF', '640 KB'], [2.7, 'Claim_Rejection_Letter.pdf', 'PDF', '180 KB']],
    response: { daysAgo: 1, text: 'Upon detailed re-examination of the appeal with the first-diagnosis report, we confirm the reimbursement claim of ₹18,500 is approved. Payment has been processed to the registered bank account and should reflect within 3 working days. We regret the initial miscommunication.', action: 'Reimbursement of ₹18,500 approved and processed. Internal feedback shared with the claims team regarding the rejection rationale.', claim: 'Resolution Claimed', expectedDays: 2 },
  });

  const c05 = await seedComplaint({
    consumer: u5, companyId: 'comp005', sector: 'Aviation', category: 'Refund Not Received', subCategory: 'Flight Cancellation Refund',
    subject: 'Refund of ₹6,200 not credited for cancelled flight 6E-2044',
    description: 'Flight 6E-2044 (DEL-BLR) on 2nd October was cancelled by the airline. IndiGo promised a full refund of ₹6,200 to the original payment mode within 7 working days. Three weeks later the refund has not been credited. The airline call centre only issues service request numbers (SR 8823412, 8912455) with no outcome.',
    amount: 6200, stateCode: 'RJ', status: 'Resolved', priority: 'Medium', officer: officers.off2, createdDaysAgo: 15,
    events: [
      [15, 0, 'REGISTERED', 'Complaint Registered', 'Grievance registered on the portal. Docket generated.', sys('sys'), R],
      [14.6, 0, 'STATUS_CHANGE', 'Under Review', 'Assigned to NCH Officer Smt. Kavitha Nair.', sys('sys'), R],
      [14.2, 0, 'FORWARDED', 'Forwarded to Organization', 'Forwarded to IndiGo nodal officer with booking reference PNR-AB12CD.', 'Kavitha Nair', O],
      [6, 0, 'RESPONSE', 'Organization Responded — Resolution Claimed', 'IndiGo confirmed the refund of ₹6,200 was processed to the original payment mode.', 'IndiGo Nodal Team', G],
      [5, 0, 'FEEDBACK', 'Consumer Confirmed Resolution', 'Consumer confirmed the refund of ₹6,200 has been received. Case marked Resolved.', u5.name, C],
    ],
    docs: [[14.9, 'Ticket_Cancelled_6E2044.pdf', 'PDF', '150 KB'], [14.9, 'Refund_Status_Screenshots.pdf', 'PDF', '400 KB']],
    response: { daysAgo: 6, text: 'The refund of ₹6,200 for cancelled flight 6E-2044 has been processed to the original payment mode. A confirmation reference (RF-2024-88123) has been shared with the consumer. We apologise for the delay caused.', action: 'Refund processed to original payment mode. Bank confirmation reference shared with consumer.', claim: 'Resolution Claimed', expectedDays: 3 },
    feedback: { rating: 4, comments: 'Refund received in full after NCH intervention. Took a while but the escalation worked.', confirmed: true, daysAgo: 5 },
    resolvedDaysAgo: 5,
  });

  const c06 = await seedComplaint({
    consumer: u1, companyId: 'comp006', sector: 'Consumer Electronics', category: 'Defective Product', subCategory: 'Manufacturing Defect / Not Working',
    subject: 'Samsung refrigerator (model RT34K) compressor failed within warranty - service refused',
    description: 'The compressor of my Samsung refrigerator (Purchased Mar, ₹32,999, extended warranty active) failed in July. Three service requests (SR-4188221, SR-4199034, SR-4210882) were closed without repair, citing "part availability". The fridge is unusable and food worth ₹3,000 was spoilt. Requesting replacement or full refund as per warranty terms.',
    amount: 32999, stateCode: 'UP', status: 'Closed', priority: 'Critical', officer: officers.off1, createdDaysAgo: 30,
    events: [
      [30, 0, 'REGISTERED', 'Complaint Registered', 'Grievance registered on the portal. Docket generated.', sys('sys'), R],
      [29.7, 0, 'STATUS_CHANGE', 'Under Review', 'Assigned to NCH Officer Sh. Ramesh Kumar Verma. Warranty records verified with consumer invoices.', sys('sys'), R],
      [29.3, 0, 'FORWARDED', 'Forwarded to Organization', 'Forwarded to Samsung India with invoice, warranty and service request records.', 'Ramesh Kumar Verma', O],
      [14, 0, 'RESPONSE', 'Organization Responded — Resolution Claimed', 'Samsung approved a replacement refrigerator unit of the same model, scheduled within 7 days.', 'Samsung Nodal Team', G],
      [12, 0, 'FEEDBACK', 'Consumer Confirmed Resolution', 'Consumer confirmed replacement unit delivered and working. Case marked Resolved.', u1.name, C],
      [10, 0, 'CLOSED', 'Complaint Closed', 'Resolved case closed by the assigned officer after confirmation of remedy.', 'Ramesh Kumar Verma', O],
    ],
    docs: [[29.9, 'Purchase_Invoice.pdf', 'PDF', '210 KB'], [29.8, 'Extended_Warranty_Card.pdf', 'PDF', '95 KB'], [28, 'Service_Request_Closures.pdf', 'PDF', '310 KB']],
    response: { daysAgo: 14, text: 'We regret the inconvenience. A manufacturing defect has been confirmed for the compressor lot. A replacement refrigerator of the same model has been approved and will be delivered within 7 working days at no cost, with a fresh warranty certificate.', action: 'Replacement unit approved and scheduled. Old unit to be collected at delivery. Fresh 1-year warranty issued.', claim: 'Resolution Claimed', expectedDays: 8 },
    feedback: { rating: 5, comments: 'Replacement fridge delivered in 4 days with fresh warranty. Fully satisfied.', confirmed: true, daysAgo: 12 },
    resolvedDaysAgo: 12, closedDaysAgo: 10,
  });

  const c07 = await seedComplaint({
    consumer: u5, companyId: 'comp007', sector: 'Real Estate', category: 'Possession Delay', subCategory: 'Delayed Possession / No Penalty Paid',
    subject: 'Flat possession delayed 14 months beyond agreement date - builder refusing penalty',
    description: 'As per the Agreement to Consume dated 2023-06-15 for Flat A-1104, Lodha Group was to hand over possession by 2024-06-30. Possession is still not offered (14 months late). The builder refuses the penalty clause citing "force majeure". Construction on the tower is complete and other wings are occupied. Requesting immediate possession with the contractual penalty of ₹1,58,000.',
    amount: 158000, stateCode: 'MH', status: 'Reopened', priority: 'Critical', officer: officers.off3, createdDaysAgo: 18,
    escalationFlagged: true,
    escalationReasons: ['Consumer rejected the proposed resolution (ESC-02)'],
    events: [
      [18, 0, 'REGISTERED', 'Complaint Registered', 'Grievance registered on the portal. Docket generated.', sys('sys'), R],
      [17.5, 0, 'STATUS_CHANGE', 'Under Review', 'Assigned to Senior Officer Sh. Deepak Sharma. Agreement copy obtained.', sys('sys'), R],
      [17, 0, 'FORWARDED', 'Forwarded to Organization', 'Forwarded to Lodha Group compliance office.', 'Deepak Sharma', O],
      [6, 0, 'RESPONSE', 'Organization Responded — Resolution Claimed', 'Lodha offered possession within 30 days but declined the penalty, citing force majeure.', 'Lodha Nodal Team', G],
      [5, 0, 'FEEDBACK', 'Consumer Rejected Resolution', 'Consumer rejected the offer: possession without the contractual penalty is not an acceptable remedy.', u5.name, C],
      [5, 0, 'ESCALATION_FLAG', 'Flagged for Escalation Review', 'Rule ESC-02 triggered: consumer rejected the proposed resolution. Case reopened and flagged for supervisor review.', sys('sys'), R],
    ],
    docs: [[17.9, 'Agreement_To_Consume.pdf', 'PDF', '2.4 MB'], [17.9, 'Payment_Receipts.pdf', 'PDF', '780 KB'], [17.5, 'Follow_Up_Emails.pdf', 'PDF', '150 KB']],
    response: { daysAgo: 6, text: 'We are pleased to offer possession of Flat A-1104 within 30 days. Regarding the penalty claim, the delay falls under the force majeure provisions of the agreement and we are unable to accede to the penalty demand. We remain available for a call to hand over at the earliest.', action: 'Possession offered within 30 days. Penalty demand declined citing agreement clause 14(b).', claim: 'Partial Resolution', expectedDays: 30 },
    feedback: { rating: 1, comments: 'Possession offer without the contractual penalty is not acceptable. The delay is not force majeure — the tower was complete in 2024. I reject this resolution.', disputed: true, reason: 'Builder refuses contractual penalty despite 14-month delay; force majeure claim is baseless as construction was complete.', daysAgo: 5 },
    supervisorNotes: 'Reopened after consumer rejected partial resolution (ESC-02). Awaiting supervisor decision.',
  });

  const c08 = await seedComplaint({
    consumer: u3, companyId: 'comp008', sector: 'E-Commerce', category: 'Wrong Item Delivered', subCategory: 'Different Product Than Ordered',
    subject: 'Delivered noise-cancelling headphones instead of ordered smartphone - seller unresponsive',
    description: 'Ordered a smartphone (Order ID: AMZ-88231-4451, ₹12,999 paid in the festival sale) from Amazon. The package contained a pair of Bluetooth headphones instead. Return window shows "refund to source in 4 days" but seller marked the return "item not as described - verification pending" and it has been stuck for 5 days. Chat support closed my case twice without resolution.',
    amount: 12999, stateCode: 'KA', status: 'Registered', priority: 'High', createdDaysAgo: 0.2,
    events: [
      [0.2, 0, 'REGISTERED', 'Complaint Registered', 'Grievance registered on the portal. Docket generated. Awaiting officer assignment.', sys('sys'), R],
    ],
    docs: [[0.2, 'Order_Screenshot.png', 'PNG', '220 KB'], [0.2, 'Wrong_Item_Photo.jpg', 'JPG', '1.1 MB']],
  });

  const c09 = await seedComplaint({
    consumer: u2, companyId: 'comp003', sector: 'Banking & Finance', category: 'Excess Charge', subCategory: 'Unexplained Annual Fee / Charges',
    subject: 'HDFC credit card annual fee of ₹4,500 charged without prior intimation',
    description: 'My HDFC Regalia credit card was issued with a "lifetime free" offer (email dated 2023-11-02 attached). This month a ₹4,500 annual fee was charged without any prior intimation. Card customer care says the LTF waiver "was not applied to this variant". Requesting reversal of the fee as per the written offer.',
    amount: 4500, stateCode: 'MH', status: 'Under Review', priority: 'Medium', officer: officers.off1, createdDaysAgo: 3,
    // DEMO OF THE FLAG MODEL: this case is flagged (ESC-01, SLA breached while
    // under review) but its status is deliberately UNCHANGED — the supervisor,
    // not the rule engine, decides what happens next.
    escalationFlagged: true,
    escalationReasons: ['SLA deadline exceeded by 24h without resolution'],
    events: [
      [3, 0, 'REGISTERED', 'Complaint Registered', 'Grievance registered on the portal. Docket generated.', sys('sys'), R],
      [2.8, 0, 'STATUS_CHANGE', 'Under Review', 'Assigned to NCH Officer Sh. Ramesh Kumar Verma. Verifying the LTF offer email produced by the consumer.', sys('sys'), R],
      [0.5, 0, 'ESCALATION_FLAG', 'Flagged for Escalation Review', 'Rule ESC-01 triggered: SLA deadline exceeded without resolution. Status intentionally unchanged — awaiting supervisor decision.', sys('sys'), R],
    ],
    docs: [[3, 'LTF_Offer_Email.pdf', 'PDF', '120 KB'], [3, 'Card_Statement.pdf', 'PDF', '180 KB']],
  });

  const c10 = await seedComplaint({
    consumer: u4, companyId: 'comp002', sector: 'Telecom', category: 'Network Issue', subCategory: 'Persistent Network Outage',
    subject: 'Broadband outage for 11 days in Anna Nagar - no resolution despite 6 tickets',
    description: 'My JioFiber connection (Customer ID 300912345678) has been non-functional for 11 days. Six support tickets (SR-1 through SR-6) were raised; each closed as "resolved" without any fix. I work from home and have suffered productivity loss. Requesting restoration of service and waiver of charges for the outage period.',
    amount: 3100, stateCode: 'TN', status: 'Escalation Review', priority: 'Medium', officer: officers.off2, createdDaysAgo: 8,
    escalationFlagged: true,
    escalationReasons: ['SLA deadline exceeded by 96h without resolution'],
    events: [
      [8, 0, 'REGISTERED', 'Complaint Registered', 'Grievance registered on the portal. Docket generated.', sys('sys'), R],
      [7.8, 0, 'STATUS_CHANGE', 'Under Review', 'Assigned to NCH Officer Smt. Kavitha Nair.', sys('sys'), R],
      [7.5, 0, 'FORWARDED', 'Forwarded to Organization', 'Forwarded to Jio nodal officer with outage tickets.', 'Kavitha Nair', O],
      [3, 0, 'ESCALATION_FLAG', 'Flagged for Escalation Review', 'Rule ESC-01 triggered: SLA deadline exceeded without resolution.', sys('sys'), R],
      [2.5, 0, 'ESCALATION', 'Escalation Review', 'Supervisor moved the case into escalation review for a decision.', 'Meena Agarwal', S],
    ],
    docs: [[7.9, 'Outage_Tickets.pdf', 'PDF', '260 KB']],
    supervisorNotes: 'Reviewing before decision: SLA breached, 6 closed-without-fix tickets. Leaning towards escalation to nodal officer.',
  });

  const c11 = await seedComplaint({
    consumer: u5, companyId: 'comp004', sector: 'Insurance', category: 'Premium Dispute', subCategory: 'Wrong Premium Deduction',
    subject: 'Double premium deduction of ₹22,400 from bank account for same policy',
    description: 'Star Health deducted the annual premium of ₹22,400 twice from my account on the 3rd and the 5th (Policy SH-2019-7712-04). The second deduction is unexplained. Refund requests through the branch and helpline have produced only acknowledgements. Requesting refund of ₹22,400.',
    amount: 22400, stateCode: 'RJ', status: 'Action Pending', priority: 'High', officer: officers.off3, createdDaysAgo: 9,
    events: [
      [9, 0, 'REGISTERED', 'Complaint Registered', 'Grievance registered on the portal. Docket generated.', sys('sys'), R],
      [8.7, 0, 'STATUS_CHANGE', 'Under Review', 'Assigned to Senior Officer Sh. Deepak Sharma.', sys('sys'), R],
      [8.4, 0, 'FORWARDED', 'Forwarded to Organization', 'Forwarded to Star Health with bank statement evidence.', 'Deepak Sharma', O],
      [4, 0, 'RESPONSE', 'Organization Responded — Partial Resolution', 'Star Health confirmed the duplicate deduction and initiated refund of ₹11,200 only, treating it as "half of the disputed amount".', 'Star Health Nodal Team', G],
      [3, 0, 'STATUS_CHANGE', 'Action Pending', 'Officer marked the case Action Pending: refund quantum mismatch needs verification with the consumer bank statement.', 'Deepak Sharma', O],
    ],
    docs: [[8.9, 'Bank_Statement.pdf', 'PDF', '300 KB'], [8.9, 'Premium_Receipts.pdf', 'PDF', '110 KB']],
    response: { daysAgo: 4, text: 'We confirm a duplicate deduction occurred due to a gateway retry. A refund has been initiated. The amount stated in our reply is under reconciliation with the payment gateway and will be confirmed within 5 working days.', action: 'Duplicate deduction acknowledged. Gateway reconciliation in progress; refund initiated.', claim: 'Partial Resolution', expectedDays: 5 },
    remarks: [{ officer: officers.off3, daysAgo: 3, text: 'Response acknowledges duplicate deduction but refund amount is ambiguous. Need consumer bank confirmation of credit before deciding. Marked Action Pending.' }],
  });

  const c12 = await seedComplaint({
    consumer: u5, companyId: 'comp005', sector: 'Aviation', category: 'Refund Not Received', subCategory: 'Web Check-in Fee / Seat Fee Refund',
    subject: 'Seat fee of ₹784 x 2 charged twice for same PNR on IndiGo booking',
    description: 'While booking 6E-334 (JAIPUR-DEL) the seat selection fee of ₹784 per passenger was charged twice for the same PNR (PNR-QZ99XY) due to a payment gateway timeout retry. The airline acknowledges the duplicate but the refund has not arrived after 20 days.',
    amount: 1568, stateCode: 'RJ', status: 'Awaiting Response', priority: 'Low', officer: officers.off2, createdDaysAgo: 1.3,
    events: [
      [1.3, 0, 'REGISTERED', 'Complaint Registered', 'Grievance registered on the portal. Docket generated.', sys('sys'), R],
      [1.1, 0, 'STATUS_CHANGE', 'Under Review', 'Assigned to NCH Officer Smt. Kavitha Nair.', sys('sys'), R],
      [1, 0, 'FORWARDED', 'Forwarded to Organization', 'Forwarded to IndiGo nodal officer with duplicate charge evidence.', 'Kavitha Nair', O],
    ],
    docs: [[1.3, 'Duplicate_Charge_Screenshot.png', 'PNG', '140 KB']],
  });

  const c13 = await seedComplaint({
    consumer: u5, companyId: 'comp006', sector: 'Consumer Electronics', category: 'Repair Delay', subCategory: 'Service Centre Delay',
    subject: 'Samsung TV panel replacement pending 6 weeks at authorised service centre',
    description: 'My Samsung 43" TV (₹28,999, in warranty) developed a panel fault. The panel was "ordered" six weeks ago; three visits by technicians produced no repair. Service centre now says the panel is "not in stock" and offers no timeline. Requesting replacement of the unit under warranty.',
    amount: 28999, stateCode: 'RJ', status: 'Resolved', priority: 'Critical', officer: officers.off1, createdDaysAgo: 25,
    events: [
      [25, 0, 'REGISTERED', 'Complaint Registered', 'Grievance registered on the portal. Docket generated.', sys('sys'), R],
      [24.6, 0, 'STATUS_CHANGE', 'Under Review', 'Assigned to NCH Officer Sh. Ramesh Kumar Verma.', sys('sys'), R],
      [24.2, 0, 'FORWARDED', 'Forwarded to Organization', 'Forwarded to Samsung India with service history.', 'Ramesh Kumar Verma', O],
      [10, 0, 'RESPONSE', 'Organization Responded — Resolution Claimed', 'Samsung approved replacement of the TV with an equivalent current model, delivery within 10 days.', 'Samsung Nodal Team', G],
      [4, 0, 'FEEDBACK', 'Consumer Confirmed Resolution', 'Consumer confirmed the replacement TV was delivered and rated the resolution 4/5 (delivery arrived later than the promised 10 days).', u5.name, C],
    ],
    docs: [[24.9, 'Service_History.pdf', 'PDF', '190 KB'], [24.9, 'TV_Fault_Photo.jpg', 'JPG', '890 KB']],
    response: { daysAgo: 10, text: 'We confirm the panel is not serviceable within a reasonable time. A replacement TV of the equivalent current model is approved, delivery within 10 working days. The defective unit will be collected at delivery.', action: 'Replacement approved with equivalent model. Collection of defective unit arranged.', claim: 'Resolution Claimed', expectedDays: 10 },
    feedback: { rating: 4, comments: 'Replacement was eventually delivered and works fine, but it took almost 3 weeks against the promised 10 days. NCH follow-up clearly helped.', confirmed: true, daysAgo: 4 },
    resolvedDaysAgo: 4,
  });

  const c14 = await seedComplaint({
    consumer: u2, companyId: 'comp001', sector: 'E-Commerce', category: 'Delivery Issue', subCategory: 'Item Not Received / Fake Delivery Marked',
    subject: 'Order marked "delivered" but never received - OTP fraud suspected by delivery agent',
    description: 'Order FK-9921-7712 (₹1,499, kitchen appliance) shows "Delivered - OTP verified" but I never received any item or OTP request. The delivery proof photo shows a different doorstep. Flipkart support closed the ticket as "delivered successfully". Requesting either delivery or full refund.',
    amount: 1499, stateCode: 'MH', status: 'Confirmation Pending', priority: 'Medium', officer: officers.off1, createdDaysAgo: 2,
    events: [
      [2, 0, 'REGISTERED', 'Complaint Registered', 'Grievance registered on the portal. Docket generated.', sys('sys'), R],
      [1.8, 0, 'STATUS_CHANGE', 'Under Review', 'Assigned to NCH Officer Sh. Ramesh Kumar Verma. Delivery proof obtained from consumer.', sys('sys'), R],
      [1.6, 0, 'FORWARDED', 'Forwarded to Organization', 'Forwarded to Flipkart nodal officer with delivery proof discrepancy.', 'Ramesh Kumar Verma', O],
      [0.2, 0, 'RESPONSE', 'Organization Responded — Resolution Claimed', 'Flipkart confirmed investigation found a delivery exception; full refund of ₹1,499 initiated to source.', 'Flipkart Nodal Team', G],
    ],
    docs: [[2, 'Order_Page.pdf', 'PDF', '150 KB'], [2, 'Doorstep_Photo_Mismatch.png', 'PNG', '310 KB']],
    response: { daysAgo: 0.2, text: 'Our investigation confirmed a delivery exception on this order. A full refund of ₹1,499 has been initiated to the original payment source and will reflect within 3-5 business days. The courier partner has been flagged for verification lapse.', action: 'Full refund of ₹1,499 initiated to source. Courier partner flagged for OTP verification lapse.', claim: 'Resolution Claimed', expectedDays: 3 },
  });

  // ─── Notifications ──────────────────────────────────────────────────────
  await db.notification.createMany({
    data: [
      { userId: u1.id, type: 'warning', title: 'Escalation review flagged', detail: `Docket ${c01.docketNumber} — the organization response is past the SLA deadline. NCH review initiated.`, link: '/consumer/complaints/' + c01.id, createdAt: ago(2) },
      { userId: u1.id, type: 'info', title: 'Resolution claimed — please confirm', detail: `Docket ${c14.docketNumber} — Flipkart claims the issue is resolved. Please confirm or dispute.`, link: '/consumer/complaints/' + c14.id, createdAt: ago(0.2) },
      { userId: u1.id, type: 'success', title: 'Complaint closed', detail: `Docket ${c06.docketNumber} — your complaint was resolved and closed.`, link: '/consumer/complaints/' + c06.id, createdAt: ago(10) },
      { userId: flipkartUser.id, type: 'warning', title: 'Response overdue', detail: `Docket ${c01.docketNumber} — response is past the SLA deadline. A reminder has been issued.`, link: '/company/complaints/' + c01.id, createdAt: ago(2) },
      { userId: flipkartUser.id, type: 'info', title: 'New complaint received', detail: `Docket ${c01.docketNumber} — NCH forwarded a new complaint for your response.`, link: '/company/complaints/' + c01.id, createdAt: ago(5.5) },
      { userId: flipkartUser.id, type: 'info', title: 'Resolution claimed', detail: `Docket ${c14.docketNumber} — refund initiated to source; consumer confirmation awaited.`, link: '/company/complaints/' + c14.id, createdAt: ago(0.2) },
      { userId: companyUsers[1].id, type: 'info', title: 'Organization response recorded', detail: `Docket ${c02.docketNumber} — refund initiated; the consumer has been asked to confirm receipt.`, link: '/company/complaints/' + c02.id, createdAt: ago(0.8) },
      { userId: companyUsers[2].id, type: 'warning', title: 'Complaint escalated to your organization', detail: `Docket ${c03.docketNumber} — escalated to the principal nodal officer with a 7-day compliance window.`, link: '/company/complaints/' + c03.id, createdAt: ago(11) },
      { userId: sup1.id, type: 'warning', title: 'Escalation review pending', detail: `${c07.docketNumber} — consumer rejected the proposed resolution. Supervisor decision required.`, link: '/supervisor/escalations', createdAt: ago(5) },
      { userId: sup1.id, type: 'warning', title: 'Escalation flag awaiting decision', detail: `${c09.docketNumber} — SLA breached while under review (ESC-01). Status unchanged; supervisor decision required.`, link: '/supervisor/escalations', createdAt: ago(0.4) },
      { userId: sup1.id, type: 'warning', title: 'Escalation review pending', detail: `${c10.docketNumber} — SLA breached during review. Decision pending.`, link: '/supervisor/escalations', createdAt: ago(2.5) },
      { userId: off1.id, type: 'warning', title: 'SLA breach on assigned case', detail: `${c01.docketNumber} — flagged for escalation review (SLA exceeded).`, link: '/officer/escalations', createdAt: ago(2) },
    ],
  });

  const counts = await db.complaint.count();
  console.log(`Seed complete: ${counts} complaints, ${await db.user.count()} users, ${await db.company.count()} companies.`);
  console.log('Demo logins (password: demo1234):');
  console.log('  consumer   → priya.sharma@gmail.com');
  console.log('  officer    → r.verma@nch.gov.in');
  console.log('  supervisor → m.agarwal@nch.gov.in');
  console.log('  company    → nch.nodal@flipkart.com  (+ one login per seeded company)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
