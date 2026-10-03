'use client';

// NCH 3.0 — Complaint Detail (Consumer View) (ported; live API + real confirm/dispute)

import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Download, CheckCircle2, XCircle,
  AlertTriangle, FileText, Clock, Calendar, Building2,
  Star, Info
} from 'lucide-react';
import { AppLayout, LoadingBlock, ErrorBlock } from '@/components/nch/AppLayout';
import { StatusBadge, PriorityBadge, CaseTimeline, Button, AlertBanner, Modal } from '@/components/nch/ui';
import { api, useFetch } from '@/lib/nch/client';
import type { Complaint } from '@/lib/nch/types';

type TabId = 'overview' | 'timeline' | 'documents' | 'response';

export default function ComplaintDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useFetch<{ complaint: Complaint }>(id ? `/api/complaints/${id}` : null);
  const complaint = data?.complaint;

  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState('');
  const [confirmDone, setConfirmDone] = useState(false);

  if (loading) return <AppLayout><LoadingBlock /></AppLayout>;
  if (error || !complaint) {
    return (
      <AppLayout>
        {error ? (
          <ErrorBlock message={error} onRetry={refetch} />
        ) : (
          <div className="text-center py-16">
            <FileText size={40} className="mx-auto text-slate-300 mb-4" />
            <p className="text-sm font-medium text-slate-600">Complaint not found.</p>
            <Link to="/consumer/complaints" className="text-xs text-nch-blue-600 mt-2 inline-block">← Back to My Complaints</Link>
          </div>
        )}
      </AppLayout>
    );
  }

  // Confirmation is only meaningful once the organization has CLAIMED a
  // resolution or the officer has explicitly requested consumer confirmation.
  const canConfirmResolution = complaint.companyResponse &&
    !complaint.consumerFeedback?.confirmed &&
    !complaint.consumerFeedback?.disputed &&
    ['Resolution Claimed', 'Confirmation Pending'].includes(complaint.status);

  // A response that does NOT claim resolution can still be rated or disputed.
  const canDisputeResponse = complaint.companyResponse &&
    !complaint.consumerFeedback?.confirmed &&
    !complaint.consumerFeedback?.disputed &&
    ['Resolution Claimed', 'Response Received', 'Confirmation Pending'].includes(complaint.status);

  const hasClaimedResolution = ['Resolution Claimed', 'Confirmation Pending'].includes(complaint.status);

  const submitFeedback = async (mode: 'confirm' | 'dispute') => {
    setSubmitting(true);
    setActionError('');
    try {
      await api(`/api/complaints/${complaint.id}/feedback`, {
        method: 'POST',
        body: JSON.stringify({
          rating: feedbackRating || (mode === 'confirm' ? 5 : 1),
          comments: feedbackComment,
          confirmed: mode === 'confirm',
          disputed: mode === 'dispute',
          disputeReason: mode === 'dispute' ? disputeReason : undefined,
        }),
      });
      setConfirmOpen(false);
      setDisputeOpen(false);
      setConfirmDone(true);
      await refetch();
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const tabs: Array<{ id: TabId; label: string; count?: number }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'timeline', label: 'Timeline', count: complaint.timeline.length },
    { id: 'documents', label: 'Documents', count: complaint.documents.length },
    { id: 'response', label: 'Responses' },
  ];

  const amountFormatted = complaint.amount?.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
  const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  const fmtShort = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <AppLayout>
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-nch-blue-600 mb-4"
      >
        <ArrowLeft size={13} /> Back to My Complaints
      </button>

      {/* Action required alert */}
      {canDisputeResponse && !confirmDone && (
        <AlertBanner type={hasClaimedResolution ? 'warning' : 'info'} title={hasClaimedResolution ? 'Action Required — Review Company Response' : 'Organization Response Received'} className="mb-4">
          <p className="mt-1 text-xs">
            {hasClaimedResolution ? (
              <>
                {complaint.companyName} claims your issue is resolved. Please review and either{' '}
                <strong>confirm the resolution</strong> (if your issue is resolved) or{' '}
                <strong>dispute the response</strong> (if unresolved — the case will be reopened and flagged for escalation review).
              </>
            ) : (
              <>
                {complaint.companyName} has responded without claiming a resolution yet. You can{' '}
                <strong>rate or dispute the response</strong> — the “Confirm Resolution” option becomes available once a resolution is actually claimed.
              </>
            )}
          </p>
          <div className="flex gap-2 mt-3">
            {canConfirmResolution && (
              <Button size="sm" variant="primary" icon={<CheckCircle2 size={14} />} onClick={() => setConfirmOpen(true)}>
                Confirm Resolution
              </Button>
            )}
            <Button size="sm" variant="outline" className="border-red-300 text-red-700 hover:bg-red-50" icon={<XCircle size={14} />} onClick={() => setDisputeOpen(true)}>
              Dispute Response
            </Button>
          </div>
        </AlertBanner>
      )}

      {confirmDone && (
        <AlertBanner type="success" title="Response submitted successfully" className="mb-4">
          Thank you for your feedback. Your response has been recorded and the case status updated.
        </AlertBanner>
      )}

      {actionError && (
        <AlertBanner type="error" title="Action failed" className="mb-4">{actionError}</AlertBanner>
      )}

      {/* Main layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* ── Left / Main ─────────────────────────────────────────────── */}
        <div className="xl:col-span-2 space-y-4">

          {/* Header card */}
          <div className="bg-white border border-slate-200 rounded">
            <div className="px-5 py-4 border-b border-slate-100">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-mono text-slate-400 mb-1">{complaint.docketNumber}</p>
                  <h1 className="text-base font-semibold text-slate-900 leading-snug">{complaint.subject}</h1>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <PriorityBadge priority={complaint.priority} />
                  <StatusBadge status={complaint.status} />
                </div>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 text-xs text-slate-500">
                <span className="flex items-center gap-1"><Building2 size={12} />{complaint.companyName}</span>
                <span>·</span>
                <span>{complaint.sector} — {complaint.category}</span>
                {complaint.amount != null && (
                  <>
                    <span>·</span>
                    <span className="font-medium text-slate-700">{amountFormatted}</span>
                  </>
                )}
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Calendar size={11} />
                  Registered {fmt(complaint.registeredAt)}
                </span>
              </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-slate-200 px-5">
              <div role="tablist" className="flex items-center gap-0 -mb-px">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    role="tab"
                    aria-selected={activeTab === tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'border-nch-blue-600 text-nch-blue-700'
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    {tab.label}
                    {tab.count !== undefined && (
                      <span className={`px-1.5 py-0.5 rounded text-xs leading-none ${
                        activeTab === tab.id ? 'bg-nch-blue-100 text-nch-blue-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab content */}
            <div className="p-5">
              {activeTab === 'overview' && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Complaint Description</h2>
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{complaint.description}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100 text-sm">
                    <div>
                      <p className="text-xs text-slate-400 mb-0.5">Sub-Category</p>
                      <p className="text-slate-700">{complaint.subCategory || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-0.5">Channel</p>
                      <p className="text-slate-700">{complaint.channel}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-0.5">Language</p>
                      <p className="text-slate-700">{complaint.language}</p>
                    </div>
                    {complaint.amount != null && (
                      <div>
                        <p className="text-xs text-slate-400 mb-0.5">Amount Involved</p>
                        <p className="text-slate-700 font-medium">{amountFormatted}</p>
                      </div>
                    )}
                  </div>
                  {complaint.sla && !['Resolved', 'Closed'].includes(complaint.status) && (
                    <div className={`rounded border px-4 py-3 text-xs ${complaint.sla.breached ? 'bg-red-50 border-red-200 text-red-700' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                      <p className="font-semibold mb-0.5 flex items-center gap-1.5">
                        <Clock size={12} /> SLA Window (prototype): {complaint.sla.hours}h for {complaint.sector}
                      </p>
                      {complaint.sla.breached
                        ? `Deadline exceeded by ${complaint.sla.overdueHours}h. The case has been flagged for escalation review by the rules engine — a supervisor will decide on escalation.`
                        : `${complaint.sla.hoursRemaining}h remaining until the deadline (fixed at registration; updates do not reset the clock).`}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'timeline' && <CaseTimeline events={complaint.timeline} />}

              {activeTab === 'documents' && (
                <div className="space-y-4">
                  {complaint.documents.length === 0 ? (
                    <p className="text-sm text-slate-500 py-8 text-center">No documents attached. (Document upload is out of scope for this prototype.)</p>
                  ) : (
                    <ul className="space-y-2">
                      {complaint.documents.map(doc => (
                        <li key={doc.id} className="flex items-center gap-3 px-4 py-3 border border-slate-200 rounded hover:bg-slate-50 transition-colors">
                          <FileText size={16} className="text-slate-400 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">{doc.name}</p>
                            <p className="text-xs text-slate-400">{doc.type} · {doc.size} · Uploaded {doc.uploadedAt}</p>
                          </div>
                          <button className="text-slate-300 cursor-not-allowed p-1" title="Download unavailable in prototype" aria-label={`Download ${doc.name} (unavailable)`} disabled>
                            <Download size={15} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {activeTab === 'response' && (
                <div className="space-y-5">
                  {!complaint.companyResponse ? (
                    <div className="py-8 text-center">
                      <Clock size={28} className="mx-auto text-slate-300 mb-3" />
                      <p className="text-sm text-slate-500">Response from {complaint.companyName} is pending.</p>
                      {complaint.expectedResolutionDate && (
                        <p className="text-xs text-slate-400 mt-1">Response due by {complaint.expectedResolutionDate}</p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Company Response</h2>
                        <StatusBadge status={complaint.companyResponse.status} size="sm" />
                      </div>
                      <div className="bg-slate-50 border border-slate-200 rounded p-4 space-y-3 text-sm">
                        <div>
                          <p className="text-xs text-slate-400 mb-1">Response from {complaint.companyResponse.companyName}</p>
                          <p className="text-slate-700 leading-relaxed">{complaint.companyResponse.responseText}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400 mb-1">Action Taken</p>
                          <p className="text-slate-700">{complaint.companyResponse.actionTaken || '—'}</p>
                        </div>
                        <p className="text-xs text-slate-400">Responded on {fmt(complaint.companyResponse.respondedAt)}</p>
                      </div>
                    </div>
                  )}

                  {complaint.consumerFeedback && (
                    <div>
                      <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Your Feedback</h2>
                      <div className={`border rounded p-4 text-sm space-y-2 ${
                        complaint.consumerFeedback.disputed
                          ? 'bg-red-50 border-red-200'
                          : complaint.consumerFeedback.confirmed
                            ? 'bg-green-50 border-green-200'
                            : 'bg-slate-50 border-slate-200'
                      }`}>
                        <div className="flex items-center gap-2">
                          {complaint.consumerFeedback.confirmed ? (
                            <><CheckCircle2 size={14} className="text-green-600" /><span className="text-green-700 font-medium">Resolution Confirmed</span></>
                          ) : complaint.consumerFeedback.disputed ? (
                            <><XCircle size={14} className="text-red-600" /><span className="text-red-700 font-medium">Resolution Disputed</span></>
                          ) : null}
                        </div>
                        <div className="flex gap-0.5">
                          {[1,2,3,4,5].map(r => (
                            <Star key={r} size={14} className={r <= complaint.consumerFeedback!.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-300'} />
                          ))}
                        </div>
                        <p className="text-slate-600">{complaint.consumerFeedback.comments}</p>
                        {complaint.consumerFeedback.disputeReason && (
                          <p className="text-xs text-red-700 border-t border-red-200 pt-2">
                            <strong>Dispute reason:</strong> {complaint.consumerFeedback.disputeReason}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Right Panel ──────────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Case Status Summary */}
          <div className="bg-white border border-slate-200 rounded">
            <div className="px-4 py-3 border-b border-slate-100">
              <h2 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Case Status</h2>
            </div>
            <div className="px-4 py-3 space-y-3 text-xs">
              <InfoRow label="Status" value={<StatusBadge status={complaint.status} size="sm" />} />
              <InfoRow label="Priority" value={<PriorityBadge priority={complaint.priority} size="sm" />} />
              <InfoRow label="Sector" value={complaint.sector} />
              <InfoRow label="Category" value={complaint.category} />
              <InfoRow label="Company" value={complaint.companyName} />
              <InfoRow label="Registered" value={fmtShort(complaint.registeredAt)} />
              <InfoRow label="Last Updated" value={fmtShort(complaint.lastUpdatedAt)} />
              {complaint.assignedOfficerName && <InfoRow label="NCH Officer" value={complaint.assignedOfficerName} />}
              {complaint.expectedResolutionDate && <InfoRow label="Response Due (NCH SLA)" value={complaint.expectedResolutionDate} />}
              {complaint.actualResolutionDate && <InfoRow label="Resolved On" value={complaint.actualResolutionDate} />}
            </div>
          </div>

          {/* Resolution Status */}
          <div className="bg-white border border-slate-200 rounded">
            <div className="px-4 py-3 border-b border-slate-100">
              <h2 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Resolution Status</h2>
            </div>
            <div className="px-4 py-3 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Company status</span>
                {complaint.companyResponse
                  ? <StatusBadge status={complaint.companyResponse.status} size="sm" />
                  : <span className="text-slate-400">Pending response</span>}
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Your confirmation</span>
                {complaint.consumerFeedback?.confirmed
                  ? <span className="flex items-center gap-1 text-green-700 font-medium"><CheckCircle2 size={12} />Confirmed</span>
                  : complaint.consumerFeedback?.disputed
                    ? <span className="flex items-center gap-1 text-red-700 font-medium"><XCircle size={12} />Disputed</span>
                    : <span className="text-amber-600">Pending</span>}
              </div>
              {complaint.consumerFeedback?.disputed && (
                <p className="text-xs text-red-600 border-t border-red-100 pt-2">
                  Your dispute is under NCH review. You will be notified when the officer takes action.
                </p>
              )}
            </div>
          </div>

          {/* Escalation info */}
          {complaint.escalation && (
            <div className="bg-red-50 border border-red-200 rounded">
              <div className="px-4 py-3 border-b border-red-200">
                <h2 className="text-xs font-semibold text-red-700 uppercase tracking-wide flex items-center gap-1.5">
                  <AlertTriangle size={12} /> Escalation
                </h2>
              </div>
              <div className="px-4 py-3 text-xs space-y-2">
                <p className="text-red-700">
                  This complaint has been{' '}
                  <strong>{complaint.escalation.isEscalated ? 'escalated' : 'flagged for escalation review'}</strong>.
                </p>
                {complaint.escalation.reasons.length > 0 && (
                  <ul className="list-disc pl-4 text-red-600 space-y-0.5">
                    {complaint.escalation.reasons.map(r => <li key={r}>{r}</li>)}
                  </ul>
                )}
                <p className="text-red-600">NCH supervisor is reviewing your case. No action is required from you at this time.</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="bg-white border border-slate-200 rounded">
            <div className="px-4 py-3 border-b border-slate-100">
              <h2 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Actions</h2>
            </div>
            <div className="px-4 py-3 space-y-2">
              {canDisputeResponse && !confirmDone && (
                <>
                  {canConfirmResolution && (
                    <Button size="sm" variant="primary" className="w-full" icon={<CheckCircle2 size={14} />} onClick={() => setConfirmOpen(true)}>
                      Confirm Resolution
                    </Button>
                  )}
                  <Button size="sm" variant="outline" className="w-full border-red-300 text-red-700 hover:bg-red-50" icon={<XCircle size={14} />} onClick={() => setDisputeOpen(true)}>
                    Dispute Response
                  </Button>
                </>
              )}
              <p className="text-xs text-slate-400 flex items-start gap-1.5">
                <Info size={12} className="shrink-0 mt-0.5" />
                Document upload is out of scope for this prototype.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Confirm Resolution Modal */}
      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Confirm Resolution"
        footer={
          <>
            <Button size="sm" variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button size="sm" variant="primary" loading={submitting} icon={<CheckCircle2 size={14} />} onClick={() => submitFeedback('confirm')}>
              Submit Confirmation
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <AlertBanner type="info">
            By confirming, you acknowledge that your grievance has been resolved to your satisfaction. This will mark the complaint as Resolved.
          </AlertBanner>
          <div>
            <p className="text-xs font-medium text-slate-700 mb-2">Rate your experience (optional)</p>
            <div className="flex gap-1">
              {[1,2,3,4,5].map(r => (
                <button key={r} type="button" onClick={() => setFeedbackRating(r)} className="p-1">
                  <Star size={20} className={r <= feedbackRating ? 'text-amber-400 fill-amber-400' : 'text-slate-300 hover:text-amber-300'} />
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-700 mb-1">Additional comments (optional)</p>
            <textarea
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm text-slate-700 resize-none min-h-20 focus:outline-none focus:ring-2 focus:ring-nch-blue-500"
              placeholder="Share your experience with the resolution…"
              value={feedbackComment}
              onChange={e => setFeedbackComment(e.target.value)}
            />
          </div>
        </div>
      </Modal>

      {/* Dispute Modal */}
      <Modal
        open={disputeOpen}
        onClose={() => setDisputeOpen(false)}
        title="Dispute Company Response"
        footer={
          <>
            <Button size="sm" variant="outline" onClick={() => setDisputeOpen(false)}>Cancel</Button>
            <Button size="sm" variant="danger" loading={submitting} icon={<XCircle size={14} />} onClick={() => submitFeedback('dispute')}>
              Submit Dispute
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <AlertBanner type="warning">
            By disputing, you indicate that your grievance is <strong>not resolved</strong>. The complaint will be reopened and flagged for escalation review by NCH.
          </AlertBanner>
          <div>
            <p className="text-xs font-medium text-slate-700 mb-1">Reason for dispute <span className="text-red-500">*</span></p>
            <textarea
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm text-slate-700 resize-none min-h-24 focus:outline-none focus:ring-2 focus:ring-red-400"
              placeholder="Please clearly state why the company's response is unsatisfactory and what resolution you still expect…"
              value={disputeReason}
              onChange={e => setDisputeReason(e.target.value)}
            />
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-slate-400 shrink-0">{label}</span>
      <span className="text-slate-700 text-right">{value}</span>
    </div>
  );
}
