'use client';

// NCH 3.0 — Register Grievance (Consumer) (ported; live API)
// Note: file upload is intentionally out of scope for this prototype
// (per the finalised blueprint) — the upload UI is shown disabled.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronRight, Info } from 'lucide-react';
import { AppLayout, PageHeader } from '@/components/nch/AppLayout';
import { Button, FormField, Input, Select, Textarea, AlertBanner } from '@/components/nch/ui';
import { api, useFetch } from '@/lib/nch/client';
import { SECTORS } from '@/lib/nch/types';
import { slaHoursForSector } from '@/lib/nch/constants';

const CATEGORIES: Record<string, string[]> = {
  'E-Commerce': ['Refund Not Received', 'Product Not Delivered', 'Defective/Wrong Product', 'Return/Exchange Issue', 'Counterfeit Product', 'Others'],
  'Banking & Finance': ['Unauthorized Transaction', 'ATM/Debit Card Issue', 'Loan Dispute', 'Account Issue', 'Fraud', 'Others'],
  'Telecom': ['Billing Dispute', 'Service Disruption', 'Unauthorized Deduction', 'Poor Network Quality', 'Number Portability', 'Others'],
  'Insurance': ['Claim Rejected', 'Claim Delayed', 'Premium Issue', 'Policy Cancellation', 'Misleading Agent', 'Others'],
  'Aviation': ['Flight Cancellation Refund', 'Delayed Flight Compensation', 'Baggage Issue', 'Check-in Problem', 'Others'],
  'Real Estate': ['Delayed Possession', 'Quality of Construction', 'Amenity Not Provided', 'Builder Fraud', 'Registration Issue', 'Others'],
  'Consumer Electronics': ['Defective Product', 'Warranty Dispute', 'Service Center Issue', 'Product Not As Described', 'Others'],
  'Others': ['Service Deficiency', 'Unfair Trade Practice', 'Overcharging', 'Others'],
};

interface Step1 { sector: string; category: string; companyId: string; }
interface Step2 { subject: string; description: string; amount: string; }

export default function RegisterGrievance() {
  const navigate = useNavigate();
  const { data: companyData } = useFetch<{ companies: Array<{ id: string; name: string; sector: string }> }>('/api/companies/options');
  const companies = companyData?.companies ?? [];

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [step1, setStep1] = useState<Step1>({ sector: '', category: '', companyId: '' });
  const [step2, setStep2] = useState<Step2>({ subject: '', description: '', amount: '' });
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState('');

  const selectedCompany = companies.find(c => c.id === step1.companyId);
  const categories = CATEGORIES[step1.sector] ?? CATEGORIES['Others'];

  const validateStep1 = () => {
    const errs: Record<string, string> = {};
    if (!step1.sector) errs.sector = 'Please select a sector.';
    if (!step1.category) errs.category = 'Please select a category.';
    if (!step1.companyId) errs.companyId = 'Please select the company.';
    return errs;
  };

  const validateStep2 = () => {
    const errs: Record<string, string> = {};
    if (!step2.subject.trim()) errs.subject = 'Please provide a brief subject.';
    else if (step2.subject.trim().length < 20) errs.subject = 'Subject must be at least 20 characters.';
    if (!step2.description.trim()) errs.description = 'Please describe your complaint.';
    else if (step2.description.trim().length < 100) errs.description = 'Description must be at least 100 characters.';
    return errs;
  };

  const handleNext = () => {
    if (step === 1) {
      const errs = validateStep1();
      if (Object.keys(errs).length) { setErrors(errs); return; }
      setErrors({}); setStep(2);
    } else if (step === 2) {
      const errs = validateStep2();
      if (Object.keys(errs).length) { setErrors(errs); return; }
      setErrors({}); setStep(3);
    }
    window.scrollTo(0, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent) { setErrors({ consent: 'You must confirm the declaration.' }); return; }
    setLoading(true);
    setGeneralError('');
    try {
      const { complaint } = await api<{ complaint: { id: string; docketNumber: string } }>('/api/complaints', {
        method: 'POST',
        body: JSON.stringify({
          companyId: step1.companyId,
          sector: step1.sector,
          category: step1.category,
          subject: step2.subject,
          description: step2.description,
          amount: step2.amount ? Number(step2.amount) : undefined,
          channel: 'Online Portal',
        }),
      });
      navigate('/consumer/register/confirmation', {
        state: {
          docket: complaint.docketNumber,
          subject: step2.subject,
          company: selectedCompany?.name ?? '',
          sector: step1.sector,
          complaintId: complaint.id,
        },
      });
    } catch (err) {
      setGeneralError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const STEPS = [
    { num: 1, label: 'Complaint Category' },
    { num: 2, label: 'Complaint Details' },
    { num: 3, label: 'Review & Submit' },
  ];

  return (
    <AppLayout>
      <PageHeader title="Register a Grievance" subtitle="Lodge a new consumer complaint with the National Consumer Helpline" />

      {/* Stepper */}
      <div className="flex items-center gap-0 mb-6 overflow-x-auto pb-1">
        {STEPS.map((s, idx) => (
          <div key={s.num} className="flex items-center shrink-0">
            <div className="flex items-center gap-2">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold border-2 shrink-0 ${
                step > s.num ? 'bg-green-600 border-green-600 text-white'
                  : step === s.num ? 'bg-nch-blue-600 border-nch-blue-600 text-white'
                    : 'bg-white border-slate-300 text-slate-400'
              }`}>
                {step > s.num ? <Check size={13} /> : s.num}
              </div>
              <span className={`text-xs font-medium whitespace-nowrap ${step === s.num ? 'text-nch-blue-700' : 'text-slate-400'}`}>
                {s.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && <div className={`w-8 h-px mx-3 ${step > s.num ? 'bg-green-400' : 'bg-slate-200'}`} />}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <form onSubmit={step === 3 ? handleSubmit : (e) => { e.preventDefault(); handleNext(); }} noValidate>
            <div className="bg-white border border-slate-200 rounded">
              <div className="px-5 py-4 border-b border-slate-100">
                <h2 className="text-sm font-semibold text-slate-900">
                  Step {step}: {STEPS[step - 1].label}
                </h2>
              </div>
              <div className="px-5 py-5 space-y-4">

                {generalError && <AlertBanner type="error" title="Submission failed">{generalError}</AlertBanner>}

                {/* Step 1 */}
                {step === 1 && (
                  <>
                    <AlertBanner type="info">
                      First try to resolve your complaint directly with the company's customer care. Keep a record of your attempts before registering with NCH.
                    </AlertBanner>
                    <FormField label="Sector" htmlFor="sector" required error={errors.sector}
                      hint={step1.sector ? `Prototype SLA window for this sector: ${slaHoursForSector(step1.sector)}h` : undefined}>
                      <Select
                        id="sector"
                        value={step1.sector}
                        onChange={e => { setStep1(s => ({ ...s, sector: e.target.value, category: '' })); setErrors(err => ({ ...err, sector: '' })); }}
                        placeholder="-- Select Sector --"
                        error={errors.sector}
                      >
                        {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                      </Select>
                    </FormField>

                    {step1.sector && (
                      <FormField label="Category of Grievance" htmlFor="category" required error={errors.category}>
                        <Select
                          id="category"
                          value={step1.category}
                          onChange={e => { setStep1(s => ({ ...s, category: e.target.value })); setErrors(err => ({ ...err, category: '' })); }}
                          placeholder="-- Select Category --"
                          error={errors.category}
                        >
                          {categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </Select>
                      </FormField>
                    )}

                    <FormField label="Company / Organisation" htmlFor="company" required error={errors.companyId}
                      hint="Only companies onboarded in this prototype are listed.">
                      <Select
                        id="company"
                        value={step1.companyId}
                        onChange={e => { setStep1(s => ({ ...s, companyId: e.target.value })); setErrors(err => ({ ...err, companyId: '' })); }}
                        placeholder="-- Select Company --"
                        error={errors.companyId}
                      >
                        {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </Select>
                    </FormField>
                  </>
                )}

                {/* Step 2 */}
                {step === 2 && (
                  <>
                    <FormField label="Brief Subject of Complaint" htmlFor="subject" required error={errors.subject}
                      hint="Provide a clear, concise subject. Minimum 20 characters.">
                      <Input
                        id="subject"
                        value={step2.subject}
                        onChange={e => { setStep2(s => ({ ...s, subject: e.target.value })); setErrors(err => ({ ...err, subject: '' })); }}
                        placeholder="e.g. Refund of ₹8,499 not received after order cancellation — 45 days pending"
                        error={errors.subject}
                      />
                    </FormField>

                    <FormField label="Detailed Description" htmlFor="description" required error={errors.description}
                      hint="Describe your complaint in detail — what happened, when, and what resolution you expect. Minimum 100 characters.">
                      <Textarea
                        id="description"
                        value={step2.description}
                        onChange={e => { setStep2(s => ({ ...s, description: e.target.value })); setErrors(err => ({ ...err, description: '' })); }}
                        placeholder="Provide full details of your complaint. Include order/transaction IDs, dates, amounts, previous complaint references, and your expected resolution."
                        rows={8}
                        error={errors.description}
                      />
                      <p className="text-xs text-slate-400 mt-1">{step2.description.length} characters</p>
                    </FormField>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField label="Amount Involved (₹)" htmlFor="amount" hint="Leave blank if not applicable. Priority is auto-derived from this amount.">
                        <Input
                          id="amount"
                          type="number"
                          value={step2.amount}
                          onChange={e => setStep2(s => ({ ...s, amount: e.target.value }))}
                          placeholder="e.g. 8499"
                          min="0"
                        />
                      </FormField>
                    </div>
                  </>
                )}

                {/* Step 3 */}
                {step === 3 && (
                  <>
                    <div className="bg-slate-50 border border-slate-200 rounded p-4 space-y-2 text-xs">
                      <p className="font-semibold text-slate-700 mb-2">Complaint Summary</p>
                      <SummaryRow label="Sector" value={step1.sector} />
                      <SummaryRow label="Category" value={step1.category} />
                      <SummaryRow label="Company" value={selectedCompany?.name ?? '—'} />
                      <SummaryRow label="Subject" value={step2.subject} />
                      {step2.amount && <SummaryRow label="Amount" value={`₹${parseInt(step2.amount).toLocaleString('en-IN')}`} />}
                      <SummaryRow label="SLA window (prototype)" value={`${slaHoursForSector(step1.sector)}h`} />
                    </div>

                    <div className="rounded border border-slate-200 bg-slate-50 px-4 py-3 flex items-start gap-2 text-xs text-slate-500">
                      <Info size={13} className="shrink-0 mt-0.5 text-slate-400" />
                      <p>
                        Supporting documents cannot be uploaded in this prototype (feature intentionally out of scope).
                        Please retain your receipts and correspondence; reference their details in your description.
                      </p>
                    </div>

                    <div>
                      <label className="flex items-start gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          className="mt-0.5 rounded border-slate-300 shrink-0"
                          checked={consent}
                          onChange={e => { setConsent(e.target.checked); setErrors(err => ({ ...err, consent: '' })); }}
                        />
                        <span className="text-xs text-slate-600 leading-relaxed">
                          I hereby declare that the information provided above is true and correct to the best of my knowledge.
                          I have attempted to resolve this grievance directly with the company before registering with NCH.
                          I understand that providing false information may result in cancellation of my complaint.
                        </span>
                      </label>
                      {errors.consent && <p className="text-xs text-red-600 mt-1">{errors.consent}</p>}
                    </div>
                  </>
                )}

                {/* Navigation */}
                <div className="flex gap-3 pt-2">
                  {step > 1 && (
                    <Button type="button" variant="outline" onClick={() => setStep(s => (s - 1) as 1 | 2 | 3)}>
                      ← Back
                    </Button>
                  )}
                  {step < 3 ? (
                    <Button type="submit" variant="primary" className="ml-auto" icon={<ChevronRight size={15} />} iconPosition="right">
                      Continue
                    </Button>
                  ) : (
                    <Button type="submit" variant="primary" loading={loading} className="ml-auto">
                      Submit Complaint
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Sidebar tips */}
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded p-4">
            <p className="text-xs font-semibold text-slate-700 mb-3">Before You Submit</p>
            <ul className="text-xs text-slate-500 space-y-2">
              <li className="flex items-start gap-2"><span className="text-nch-blue-500 shrink-0 font-bold">1.</span>Keep a record of your previous complaints with the company.</li>
              <li className="flex items-start gap-2"><span className="text-nch-blue-500 shrink-0 font-bold">2.</span>Note down order/transaction/policy numbers.</li>
              <li className="flex items-start gap-2"><span className="text-nch-blue-500 shrink-0 font-bold">3.</span>Gather supporting documents — invoices, screenshots, emails.</li>
              <li className="flex items-start gap-2"><span className="text-nch-blue-500 shrink-0 font-bold">4.</span>Be specific about dates, amounts, and the expected resolution.</li>
              <li className="flex items-start gap-2"><span className="text-nch-blue-500 shrink-0 font-bold">5.</span>NCH works best once a formal complaint to the company has been raised.</li>
            </ul>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded p-4 text-xs text-amber-700">
            <p className="font-semibold mb-1">NCH is a Facilitative Body</p>
            <p className="leading-relaxed">NCH forwards your complaint to the concerned company and monitors resolution. For legal adjudication, approach the Consumer Commission under the Consumer Protection Act, 2019.</p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-slate-400">{label}</span>
      <span className="text-slate-700 font-medium text-right">{value}</span>
    </div>
  );
}
