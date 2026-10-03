'use client';

// NCH 3.0 — Company Complaint Response Form (ported; live API)

import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Send, FileText, CheckCircle2 } from 'lucide-react';
import { AppLayout, LoadingBlock, ErrorBlock } from '@/components/nch/AppLayout';
import { StatusBadge, PriorityBadge, Button, FormField, Textarea, Select, Input, AlertBanner } from '@/components/nch/ui';
import { api, useFetch } from '@/lib/nch/client';
import type { Complaint } from '@/lib/nch/types';

export default function CompanyComplaintResponse() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useFetch<{ complaint: Complaint }>(id ? `/api/complaints/${id}` : null);
  const complaint = data?.complaint;

  const [responseText, setResponseText] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [resolutionStatus, setResolutionStatus] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState('');

  if (loading) return <AppLayout><LoadingBlock /></AppLayout>;
  if (error || !complaint) {
    return (
      <AppLayout>
        {error ? <ErrorBlock message={error} onRetry={refetch} /> : (
          <p className="text-sm text-slate-500 text-center py-16">Complaint not found.</p>
        )}
      </AppLayout>
    );
  }

  const amountFormatted = complaint.amount?.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
  // NOTE: 'Under Review' is deliberately absent — it is still with the NCH
  // officer, and the API rejects responses in that state (keep UI and API in
  // sync so a company never fills a form the backend will refuse).
  const canRespond = ['Forwarded', 'Awaiting Response', 'Action Pending', 'Escalated', 'Reopened', 'Response Received'].includes(complaint.status);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!responseText.trim() || responseText.trim().length < 50) errs.responseText = 'Response must be at least 50 characters.';
    if (!actionTaken.trim()) errs.actionTaken = 'Please describe the action taken.';
    if (!resolutionStatus) errs.resolutionStatus = 'Please select a resolution status.';
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSubmitting(true);
    setApiError('');
    try {
      await api(`/api/complaints/${complaint.id}/respond`, {
        method: 'POST',
        body: JSON.stringify({ responseText, actionTaken, claimStatus: resolutionStatus, expectedResolutionDate: expectedDate || undefined }),
      });
      setSubmitted(true);
    } catch (err) {
      setApiError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <AppLayout>
        <div className="max-w-lg mx-auto py-10 text-center">
          <div className="h-14 w-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={28} className="text-green-600" />
          </div>
          <h1 className="text-base font-semibold text-slate-900 mb-1">Response Submitted Successfully</h1>
          <p className="text-sm text-slate-500 mb-2">Your response has been recorded and forwarded to the NCH officer and consumer.</p>
          <p className="text-xs font-mono text-slate-400 mb-6">{complaint.docketNumber}</p>
          <div className="flex gap-3 justify-center">
            <Link to="/company/complaints"><Button variant="primary">View All Complaints</Button></Link>
            <Link to="/company/dashboard"><Button variant="outline">Back to Dashboard</Button></Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-nch-blue-600 mb-4">
        <ArrowLeft size={13} /> Back
      </button>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Left: complaint info + response form */}
        <div className="xl:col-span-2 space-y-4">

          {/* Complaint summary */}
          <div className="bg-white border border-slate-200 rounded">
            <div className="px-5 py-4 border-b border-slate-100">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-mono text-slate-400 mb-1">{complaint.docketNumber}</p>
                  <h1 className="text-base font-semibold text-slate-900">{complaint.subject}</h1>
                </div>
                <div className="flex items-center gap-2">
                  <PriorityBadge priority={complaint.priority} />
                  <StatusBadge status={complaint.status} />
                </div>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-slate-500">
                <span>{complaint.sector} — {complaint.category}</span>
                {complaint.amount != null && <><span>·</span><span className="font-medium text-slate-700">{amountFormatted}</span></>}
                <span>·</span>
                <span>Registered: {new Date(complaint.registeredAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              </div>
            </div>
            <div className="px-5 py-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Consumer Complaint</p>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{complaint.description}</p>
            </div>
          </div>

          {/* Documents */}
          {complaint.documents.length > 0 && (
            <div className="bg-white border border-slate-200 rounded p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Supporting Documents</p>
              <ul className="space-y-2">
                {complaint.documents.map(doc => (
                  <li key={doc.id} className="flex items-center gap-2 text-xs text-slate-600">
                    <FileText size={13} className="text-slate-400 shrink-0" />
                    <span className="flex-1 truncate">{doc.name}</span>
                    <span className="text-slate-400">{doc.size}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Consumer dispute notice */}
          {complaint.consumerFeedback?.disputed && (
            <AlertBanner type="error" title="Consumer Disputed Your Response">
              <p>{complaint.consumerFeedback.disputeReason}</p>
              <p className="mt-1 text-xs">The case has been reopened by NCH. Submit an updated response addressing the dispute.</p>
            </AlertBanner>
          )}
          {complaint.status === 'Escalated' && (
            <AlertBanner type="warning" title="Escalated by NCH Supervisor">
              This complaint was escalated to your organisation's principal nodal officer. Respond with the compliance actions taken.
            </AlertBanner>
          )}

          {/* Existing response (if any) */}
          {complaint.companyResponse && (
            <AlertBanner type="info" title="Response Already Submitted">
              A response was submitted on {new Date(complaint.companyResponse.respondedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}. You may submit an updated response below.
            </AlertBanner>
          )}

          {/* Response form */}
          <div className="bg-white border border-slate-200 rounded">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-800">Submit Response</h2>
              <p className="text-xs text-slate-500 mt-0.5">Your response will be reviewed by the NCH officer and shared with the consumer.</p>
            </div>
            {canRespond ? (
              <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4" noValidate>
                {apiError && <AlertBanner type="error">{apiError}</AlertBanner>}
                <FormField label="Response Statement" htmlFor="response-text" required error={errors.responseText}
                  hint="Provide a clear, factual response to the consumer's complaint. Minimum 50 characters.">
                  <Textarea
                    id="response-text"
                    value={responseText}
                    onChange={e => { setResponseText(e.target.value); setErrors(err => ({ ...err, responseText: '' })); }}
                    placeholder="Describe your investigation findings and the steps taken to address the consumer's complaint…"
                    rows={6}
                    error={errors.responseText}
                  />
                  <p className="text-xs text-slate-400 mt-1">{responseText.length} characters</p>
                </FormField>

                <FormField label="Action Taken" htmlFor="action-taken" required error={errors.actionTaken}
                  hint="Describe the specific remedial action taken (e.g., refund processed, service restored, complaint resolved).">
                  <Textarea
                    id="action-taken"
                    value={actionTaken}
                    onChange={e => { setActionTaken(e.target.value); setErrors(err => ({ ...err, actionTaken: '' })); }}
                    placeholder="e.g., Refund of ₹8,499 has been processed via original payment mode. Expected credit within 3-5 business days."
                    rows={3}
                    error={errors.actionTaken}
                  />
                </FormField>

                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Resolution Status" htmlFor="resolution-status" required error={errors.resolutionStatus}>
                    <Select
                      id="resolution-status"
                      value={resolutionStatus}
                      onChange={e => { setResolutionStatus(e.target.value); setErrors(err => ({ ...err, resolutionStatus: '' })); }}
                      placeholder="-- Select Status --"
                      error={errors.resolutionStatus}
                    >
                      <option value="Resolution Claimed">Resolution Claimed — Issue fully resolved</option>
                      <option value="Partial Resolution">Partial Resolution — Issue partially addressed</option>
                      <option value="Rejected">Rejected — Company not liable</option>
                    </Select>
                  </FormField>

                  <FormField label="Expected Completion Date" htmlFor="expected-date"
                    hint="If resolution is in progress">
                    <Input
                      id="expected-date"
                      type="date"
                      value={expectedDate}
                      onChange={e => setExpectedDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </FormField>
                </div>

                <AlertBanner type="warning">
                  By submitting this response, you confirm that the information provided is accurate and that the action described has been taken or will be completed by the stated date.
                </AlertBanner>

                <div className="flex gap-3 pt-1">
                  <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
                  <Button type="submit" variant="primary" loading={submitting} icon={<Send size={14} />} className="ml-auto">
                    Submit Response to NCH
                  </Button>
                </div>
              </form>
            ) : (
              <div className="px-5 py-6">
                <p className="text-sm text-slate-500">
                  A response cannot be submitted while the complaint is <strong>{complaint.status}</strong>.
                  {['Resolved', 'Closed'].includes(complaint.status) && ' The case has been resolved and closed.'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right: metadata */}
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded">
            <div className="px-4 py-3 border-b border-slate-100">
              <h2 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Case Information</h2>
            </div>
            <div className="px-4 py-3 space-y-2 text-xs">
              {[
                { label: 'Status', value: <StatusBadge status={complaint.status} size="sm" /> },
                { label: 'Sector', value: complaint.sector },
                { label: 'Category', value: complaint.category },
                { label: 'Registered', value: new Date(complaint.registeredAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) },
                ...(complaint.sla ? [{
                  label: 'Response Due',
                  value: (
                    <span className={complaint.sla.breached ? 'text-red-700 font-medium' : 'text-amber-700 font-medium'}>
                      {complaint.sla.breached
                        ? `Passed (+${complaint.sla.overdueHours}h)`
                        : new Date(complaint.sla.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  ),
                }] : []),
                ...(complaint.amount != null ? [{ label: 'Amount', value: amountFormatted ?? '' }] : []),
              ].map(row => (
                <div key={row.label} className="flex justify-between items-center gap-2">
                  <span className="text-slate-400 shrink-0">{row.label}</span>
                  <span className="text-slate-700 text-right">{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded p-4 text-xs text-amber-700">
            <p className="font-semibold mb-1">Response Guidelines</p>
            <ul className="space-y-1.5 leading-relaxed">
              <li>• Respond within the SLA window of forwarding.</li>
              <li>• Provide factual, specific information about the action taken.</li>
              <li>• If resolution is delayed, provide a realistic expected date.</li>
              <li>• Do not claim resolution unless the consumer's issue is actually resolved.</li>
              <li>• Misleading responses may result in escalation.</li>
            </ul>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
