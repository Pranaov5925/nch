'use client';

// NCH 3.0 — Officer Complaint Detail / Case Management (ported; live API)
// State-machine actions, internal remarks, and the 3 advisory AI features.
// INVARIANT: the officer acts; AI only assists. Escalation decisions belong
// to the Supervisor (human-in-the-loop), driven by the rules engine.

import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Send, AlertTriangle, CheckCircle2, XCircle, FileText, Clock,
  User, Building2, Lock, Info, Star, Bot, UserCheck, ShieldAlert,
  Download, Eye, UploadCloud
} from 'lucide-react';
import { AppLayout, LoadingBlock, ErrorBlock } from '@/components/nch/AppLayout';
import { StatusBadge, PriorityBadge, CaseTimeline, Button, AlertBanner, Modal, Textarea } from '@/components/nch/ui';
import { DocumentPreviewModal } from '@/components/nch/DocumentPreviewModal';
import { api, useFetch } from '@/lib/nch/client';
import { useAuth } from '@/context/AuthContext';
import type { Complaint, AiAssist, Document } from '@/lib/nch/types';

type TabId = 'overview' | 'timeline' | 'documents' | 'response' | 'remarks';

export default function OfficerComplaintDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, loading, error, refetch, setData } = useFetch<{ complaint: Complaint }>(id ? `/api/complaints/${id}` : null);
  const complaint = data?.complaint;

  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [remarkText, setRemarkText] = useState('');
  const [forwardOpen, setForwardOpen] = useState(false);
  const [remarkSaved, setRemarkSaved] = useState(false);
  const [actionBusy, setActionBusy] = useState('');
  const [actionError, setActionError] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiResult, setAiResult] = useState<AiAssist | null>(null);
  const [aiError, setAiError] = useState('');

  // Document state
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [docError, setDocError] = useState('');
  const docInputRef = useRef<HTMLInputElement>(null);

  if (loading) return <AppLayout><LoadingBlock /></AppLayout>;
  if (error || !complaint) {
    return (
      <AppLayout>
        {error ? <ErrorBlock message={error} onRetry={refetch} /> : (
          <div className="text-center py-16">
            <FileText size={40} className="mx-auto text-slate-300 mb-4" />
            <p className="text-sm text-slate-600">Complaint not found.</p>
          </div>
        )}
      </AppLayout>
    );
  }

  const amountFormatted = complaint.amount?.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
  const fmtShort = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  const runAction = async (action: string) => {
    setActionBusy(action);
    setActionError('');
    try {
      const res = await api<{ complaint: Complaint }>(`/api/complaints/${complaint.id}/action`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      });
      setData({ complaint: res.complaint });
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setActionBusy('');
    }
  };

  const assignToMe = async () => {
    setActionBusy('assign');
    setActionError('');
    try {
      const res = await api<{ complaint: Complaint }>(`/api/complaints/${complaint.id}/assign`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      setData({ complaint: res.complaint });
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setActionBusy('');
    }
  };

  const saveRemark = async () => {
    setActionBusy('remark');
    setActionError('');
    try {
      await api(`/api/complaints/${complaint.id}/remarks`, {
        method: 'POST',
        body: JSON.stringify({ remark: remarkText, isInternal: true }),
      });
      setRemarkText('');
      setRemarkSaved(true);
      setTimeout(() => setRemarkSaved(false), 3000);
      await refetch();
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setActionBusy('');
    }
  };

  const generateAi = async (feature: AiAssist['feature']) => {
    setAiBusy(true);
    setAiError('');
    setAiResult(null);
    try {
      const res = await api<{ assist: AiAssist }>(`/api/complaints/${complaint.id}/ai`, {
        method: 'POST',
        body: JSON.stringify({ feature }),
      });
      setAiResult(res.assist);
    } catch (err) {
      setAiError((err as Error).message);
    } finally {
      setAiBusy(false);
    }
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingDoc(true);
    setDocError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`/api/complaints/${complaint.id}/documents`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to upload document');
      await refetch();
      if (docInputRef.current) docInputRef.current.value = '';
    } catch (err) {
      setDocError((err as Error).message);
    } finally {
      setUploadingDoc(false);
    }
  };

  const isMine = complaint.assignedOfficerId === user?.id;
  const canStartReview = ['Registered', 'Reopened'].includes(complaint.status);
  const canForward = ['Under Review', 'Reopened', 'Response Received', 'Action Pending'].includes(complaint.status);
  const canRequestConfirmation = ['Response Received', 'Resolution Claimed'].includes(complaint.status);
  // 'Under Review' deliberately excluded — a case must pass through the
  // organization-response stage before it can be marked resolved.
  // Mirrors OFFICER_TRANSITIONS.mark_resolved — 'Response Received' is absent:
  // a non-resolution company response (Under Process / Rejected) must not be
  // overridden into "Resolved" by the officer; ask the consumer or follow up.
  const canMarkResolved = ['Confirmation Pending', 'Action Pending', 'Escalated'].includes(complaint.status);
  const canClose = complaint.status === 'Resolved';

  const tabs: Array<{ id: TabId; label: string; count?: number }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'timeline', label: 'Timeline', count: complaint.timeline.length },
    { id: 'documents', label: 'Documents', count: complaint.documents.length },
    { id: 'response', label: 'Responses' },
    { id: 'remarks', label: 'Officer Remarks', count: complaint.officerRemarks.length },
  ];

  return (
    <AppLayout>
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-nch-blue-600 mb-4"
      >
        <ArrowLeft size={13} /> Back to Queue
      </button>

      {actionError && <AlertBanner type="error" title="Action failed" className="mb-4">{actionError}</AlertBanner>}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* ── Left / Main ──────────────────────────────────────────────── */}
        <div className="xl:col-span-2 space-y-4">

          {/* Case header */}
          <div className="bg-white border border-slate-200 rounded">
            <div className="px-5 py-4 border-b border-slate-100">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-xs font-mono text-slate-400">{complaint.docketNumber}</p>
                    {complaint.status === 'Escalated' && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded px-2 py-0.5">
                        <AlertTriangle size={10} /> Escalated
                      </span>
                    )}
                  </div>
                  <h1 className="text-base font-semibold text-slate-900 leading-snug">{complaint.subject}</h1>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <PriorityBadge priority={complaint.priority} />
                  <StatusBadge status={complaint.status} />
                </div>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 text-xs text-slate-500">
                <span className="flex items-center gap-1"><User size={11} />{complaint.consumerName}</span>
                <span>·</span>
                <span className="flex items-center gap-1"><Building2 size={11} />{complaint.companyName}</span>
                <span>·</span>
                <span>{complaint.sector} — {complaint.category}</span>
                {complaint.amount != null && (
                  <>
                    <span>·</span>
                    <span className="font-medium text-slate-700">{amountFormatted}</span>
                  </>
                )}
              </div>
            </div>

            {/* Quick action bar — state machine actions */}
            <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap gap-2">
              {/* Only OFFICERS see self-assign, and only while the case is
                  still unassigned (assigned cases cannot be taken over). */}
              {!isMine && !complaint.assignedOfficerId && user?.role === 'officer' && (
                <Button size="sm" variant="secondary" icon={<UserCheck size={13} />} loading={actionBusy === 'assign'} onClick={assignToMe}>
                  Assign to Me
                </Button>
              )}
              {canStartReview && (
                <Button size="sm" variant="outline" icon={<CheckCircle2 size={13} />} loading={actionBusy === 'start_review'} onClick={() => runAction('start_review')}>
                  Start Review
                </Button>
              )}
              {canForward && (
                <Button size="sm" variant="outline" icon={<Send size={13} />} onClick={() => setForwardOpen(true)}>
                  Forward / Follow-up
                </Button>
              )}
              {canRequestConfirmation && (
                <Button size="sm" variant="outline" icon={<Info size={13} />} loading={actionBusy === 'request_confirmation'} onClick={() => runAction('request_confirmation')}>
                  Ask Consumer to Confirm
                </Button>
              )}
              {canMarkResolved && (
                <Button size="sm" variant="outline" icon={<CheckCircle2 size={13} />} loading={actionBusy === 'mark_resolved'} onClick={() => runAction('mark_resolved')}>
                  Mark Resolved
                </Button>
              )}
              {canClose && (
                <Button size="sm" variant="ghost" icon={<XCircle size={13} />} loading={actionBusy === 'close'} onClick={() => runAction('close')}>
                  Close Case
                </Button>
              )}
              {complaint.status === 'Escalation Review' && (
                <span className="inline-flex items-center gap-1.5 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded px-2.5 py-1">
                  <ShieldAlert size={12} /> Flagged — supervisor decision pending
                </span>
              )}
            </div>

            {/* Tabs */}
            <div className="border-b border-slate-200 px-5">
              <div role="tablist" className="flex items-center -mb-px overflow-x-auto">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    role="tab"
                    aria-selected={activeTab === tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                      activeTab === tab.id
                        ? 'border-nch-blue-600 text-nch-blue-700'
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    {tab.label}
                    {tab.count !== undefined && (
                      <span className={`px-1.5 py-0.5 rounded text-xs ${activeTab === tab.id ? 'bg-nch-blue-100 text-nch-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-5">
              {/* Overview */}
              {activeTab === 'overview' && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Consumer Information</h2>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <InfoRow label="Name" value={complaint.consumerName} />
                      <InfoRow label="Phone" value={complaint.consumerPhone} />
                      <InfoRow label="Email" value={complaint.consumerEmail} />
                      <InfoRow label="Address" value={complaint.consumerAddress} />
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-4">
                    <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Complaint Description</h2>
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{complaint.description}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100 text-sm">
                    <InfoRow label="Sub-Category" value={complaint.subCategory} />
                    <InfoRow label="Channel" value={complaint.channel} />
                    <InfoRow label="Language" value={complaint.language} />
                    {complaint.amount != null && <InfoRow label="Amount" value={amountFormatted ?? ''} />}
                  </div>
                </div>
              )}

              {activeTab === 'timeline' && <CaseTimeline events={complaint.timeline} />}

              {activeTab === 'documents' && (
                <div className="space-y-4">
                  {/* Officer Upload Section */}
                  <div className="bg-slate-50 border border-dashed border-slate-300 rounded-lg p-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold text-slate-800">Attach Scrutiny Record / Official Notice</p>
                        <p className="text-2xs text-slate-500 mt-0.5">Attach assessment files, notices, or official records (PDF, PNG, JPG, DOC up to 15MB)</p>
                      </div>
                      <div>
                        <input
                          type="file"
                          ref={docInputRef}
                          onChange={handleDocUpload}
                          className="hidden"
                          accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
                        />
                        <Button
                          size="sm"
                          variant="secondary"
                          icon={<UploadCloud size={14} />}
                          loading={uploadingDoc}
                          onClick={() => docInputRef.current?.click()}
                        >
                          Attach Document
                        </Button>
                      </div>
                    </div>
                    {docError && (
                      <p className="text-xs text-red-600 mt-2 bg-red-50 border border-red-200 rounded p-2">{docError}</p>
                    )}
                  </div>

                  {complaint.documents.length === 0 ? (
                    <div className="text-center py-8 bg-white border border-slate-200 rounded-lg">
                      <FileText size={32} className="mx-auto text-slate-300 mb-2" />
                      <p className="text-sm font-medium text-slate-600">No documents attached</p>
                      <p className="text-xs text-slate-400 mt-0.5">No consumer evidence or officer attachments on this case.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2.5">
                      {complaint.documents.map(doc => {
                        const isImg = ['PNG', 'JPG', 'JPEG', 'WEBP', 'IMAGE'].includes(doc.type.toUpperCase());
                        return (
                          <div key={doc.id} className="flex items-center justify-between gap-3 px-4 py-3 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-colors shadow-2xs">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`p-2 rounded-lg shrink-0 ${isImg ? 'bg-sky-50 text-sky-600' : 'bg-rose-50 text-rose-600'}`}>
                                <FileText size={18} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-slate-800 truncate">{doc.name}</p>
                                <p className="text-2xs text-slate-400 mt-0.5">
                                  <span className="font-medium text-slate-600">{doc.type}</span> · {doc.size} · Uploaded by <strong className="text-slate-600">{doc.uploadedBy}</strong> · {doc.uploadedAt}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => setPreviewDoc(doc)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-md hover:bg-slate-100 hover:text-nch-blue-700 transition-colors cursor-pointer"
                              >
                                <Eye size={13} />
                                <span>Preview</span>
                              </button>
                              <a
                                href={`/api/documents/${doc.id}?download=1`}
                                download={doc.name}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-nch-blue-700 bg-nch-blue-50 border border-nch-blue-200 rounded-md hover:bg-nch-blue-100 transition-colors cursor-pointer"
                              >
                                <Download size={13} />
                                <span>Download</span>
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Response */}
              {activeTab === 'response' && (
                <div className="space-y-5">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Company Response</h2>
                      {complaint.companyResponse && (
                        <Button size="sm" variant="secondary" icon={<Bot size={12} />} loading={aiBusy} onClick={() => generateAi('RESOLUTION_CHECK')}>
                          AI Check Response
                        </Button>
                      )}
                    </div>
                    {!complaint.companyResponse ? (
                      <div className="py-6 text-center text-slate-400">
                        <Clock size={24} className="mx-auto mb-2" />
                        <p className="text-sm">Response from {complaint.companyName} is pending.</p>
                      </div>
                    ) : (
                      <div className="border border-slate-200 rounded divide-y divide-slate-100">
                        <div className="p-4">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <p className="text-xs font-medium text-slate-500">Response Statement</p>
                            <StatusBadge status={complaint.companyResponse.status} size="sm" />
                          </div>
                          <p className="text-sm text-slate-700 leading-relaxed">{complaint.companyResponse.responseText}</p>
                        </div>
                        <div className="p-4">
                          <p className="text-xs font-medium text-slate-500 mb-1">Action Taken</p>
                          <p className="text-sm text-slate-700">{complaint.companyResponse.actionTaken || '—'}</p>
                        </div>
                        <div className="p-4 text-xs text-slate-400">
                          Responded on {new Date(complaint.companyResponse.respondedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </div>
                      </div>
                    )}
                  </div>

                  {aiResult?.feature === 'RESOLUTION_CHECK' && <AiAssistCard assist={aiResult} onClear={() => setAiResult(null)} />}
                  {aiError && <AlertBanner type="error">{aiError}</AlertBanner>}

                  {/* Consumer feedback */}
                  {complaint.consumerFeedback && (
                    <div>
                      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Consumer Feedback</h2>
                      <div className={`border rounded p-4 space-y-2 ${
                        complaint.consumerFeedback.disputed
                          ? 'bg-red-50 border-red-200'
                          : complaint.consumerFeedback.confirmed
                            ? 'bg-green-50 border-green-200'
                            : 'bg-slate-50 border-slate-200'
                      }`}>
                        <div className="flex items-center gap-2">
                          {complaint.consumerFeedback.confirmed && <><CheckCircle2 size={14} className="text-green-600" /><span className="text-sm font-medium text-green-700">Confirmed — Resolution accepted by consumer</span></>}
                          {complaint.consumerFeedback.disputed && <><XCircle size={14} className="text-red-600" /><span className="text-sm font-medium text-red-700">Disputed — Consumer rejected company response</span></>}
                        </div>
                        <div className="flex gap-0.5">
                          {[1,2,3,4,5].map(r => (
                            <Star key={r} size={13} className={r <= complaint.consumerFeedback!.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-300'} />
                          ))}
                          <span className="text-xs text-slate-500 ml-1">({complaint.consumerFeedback.rating}/5)</span>
                        </div>
                        <p className="text-sm text-slate-700">{complaint.consumerFeedback.comments}</p>
                        {complaint.consumerFeedback.disputeReason && (
                          <div className="border-t border-red-200 pt-2">
                            <p className="text-xs font-medium text-red-700 mb-0.5">Dispute Reason:</p>
                            <p className="text-xs text-red-700">{complaint.consumerFeedback.disputeReason}</p>
                          </div>
                        )}
                        <p className="text-xs text-slate-400">
                          Submitted: {new Date(complaint.consumerFeedback.submittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Officer Remarks (Internal) */}
              {activeTab === 'remarks' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-xs text-slate-500 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                    <Lock size={12} className="text-amber-600 shrink-0" />
                    <span>Officer remarks are internal and not visible to the consumer or company.</span>
                  </div>

                  {complaint.officerRemarks.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-6">No remarks added yet.</p>
                  ) : (
                    <ul className="space-y-3">
                      {complaint.officerRemarks.map(rem => (
                        <li key={rem.id} className="border border-slate-200 rounded p-4">
                          <p className="text-sm text-slate-700 leading-relaxed">{rem.remark}</p>
                          <p className="text-xs text-slate-400 mt-2">{rem.officerName} · {rem.date}, {rem.time}</p>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="border-t border-slate-100 pt-4">
                    <p className="text-xs font-medium text-slate-700 mb-2">Add Internal Remark</p>
                    <Textarea
                      value={remarkText}
                      onChange={e => setRemarkText(e.target.value)}
                      placeholder="Add internal notes, observations, or follow-up actions…"
                      rows={3}
                    />
                    <div className="mt-2 flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="primary"
                        disabled={!remarkText.trim()}
                        loading={actionBusy === 'remark'}
                        onClick={saveRemark}
                      >
                        Save Remark
                      </Button>
                      {remarkSaved && <span className="text-xs text-green-600">✓ Remark saved</span>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Right Panel ──────────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Case metadata */}
          <div className="bg-white border border-slate-200 rounded">
            <div className="px-4 py-3 border-b border-slate-100">
              <h2 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Case Information</h2>
            </div>
            <div className="px-4 py-3 space-y-2.5 text-xs">
              <MetaRow label="Docket" value={<span className="font-mono text-slate-700">{complaint.docketNumber}</span>} />
              <MetaRow label="Status" value={<StatusBadge status={complaint.status} size="sm" />} />
              <MetaRow label="Priority" value={<PriorityBadge priority={complaint.priority} size="sm" />} />
              <MetaRow label="Sector" value={complaint.sector} />
              <MetaRow label="Category" value={complaint.category} />
              <MetaRow label="Company" value={complaint.companyName} />
              <MetaRow label="Consumer" value={complaint.consumerName} />
              <MetaRow label="Registered" value={fmtShort(complaint.registeredAt)} />
              <MetaRow label="Last Update" value={fmtShort(complaint.lastUpdatedAt)} />
              {complaint.sla && (
                <MetaRow
                  label="SLA Deadline"
                  value={
                    <span className={complaint.sla.breached ? 'text-red-700 font-medium' : 'text-amber-700'}>
                      {new Date(complaint.sla.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {complaint.sla.breached ? ` · +${complaint.sla.overdueHours}h over` : ` · ${complaint.sla.hoursRemaining}h left`}
                    </span>
                  }
                />
              )}
              {complaint.amount != null && (
                <MetaRow label="Amount" value={<span className="font-medium text-slate-800">{amountFormatted}</span>} />
              )}
            </div>
          </div>

          {/* Resolution Status */}
          <div className="bg-white border border-slate-200 rounded">
            <div className="px-4 py-3 border-b border-slate-100">
              <h2 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Resolution Status</h2>
            </div>
            <div className="px-4 py-3 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Company status</span>
                {complaint.companyResponse
                  ? <StatusBadge status={complaint.companyResponse.status} size="sm" />
                  : <span className="text-slate-400 italic">Pending response</span>}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Consumer confirmation</span>
                {complaint.consumerFeedback?.confirmed
                  ? <span className="flex items-center gap-1 text-green-700 font-medium"><CheckCircle2 size={12} />Confirmed</span>
                  : complaint.consumerFeedback?.disputed
                    ? <span className="flex items-center gap-1 text-red-700 font-medium"><XCircle size={12} />Disputed</span>
                    : <span className="text-amber-600 italic">Pending</span>}
              </div>
              {complaint.consumerFeedback?.disputed && (
                <div className="bg-red-50 border border-red-200 rounded px-3 py-2 mt-1">
                  <p className="font-medium text-red-700 mb-0.5">Action required:</p>
                  <p className="text-red-600">Consumer has disputed the resolution. Case reopened — review and re-engage the organization.</p>
                </div>
              )}
            </div>
          </div>

          {/* ── AI: Case Summary (Feature 1 of 3) ─────────────────────── */}
          <div className="bg-white border border-slate-200 rounded">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xs font-semibold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                <Bot size={13} className="text-slate-400" /> Case Summary
              </h2>
              <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">AI — advisory</span>
            </div>
            <div className="px-4 py-4">
              {aiResult?.feature === 'CASE_SUMMARY' ? (
                <div className="space-y-2">
                  <pre className="text-xs text-slate-700 whitespace-pre-wrap font-sans bg-slate-50 border border-slate-200 rounded p-3 leading-relaxed">{aiResult.text}</pre>
                  <p className="text-xs text-slate-400">{aiResult.provider}{aiResult.cached ? ' · cached' : ''}</p>
                  <p className="text-xs text-slate-400 border-t border-slate-100 pt-2">{aiResult.disclaimer}</p>
                  <Button size="sm" variant="ghost" onClick={() => setAiResult(null)}>Clear</Button>
                </div>
              ) : (
                <>
                  <p className="text-xs text-slate-500 mb-3">
                    Generate a structured brief of this case file (issue, parties, stage, verification focus). Advisory output only.
                  </p>
                  <Button size="sm" variant="secondary" className="w-full" icon={<Bot size={13} />} loading={aiBusy} onClick={() => generateAi('CASE_SUMMARY')}>
                    Generate Case Summary
                  </Button>
                  {aiError && <p className="text-xs text-red-600 mt-2">{aiError}</p>}
                </>
              )}
            </div>
          </div>

          {/* ── Escalation Review (rules-engine flags; supervisor decides) */}
          {complaint.escalation && (
            <div className={`border rounded ${complaint.escalation.isEscalated ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
              <div className={`px-4 py-3 border-b flex items-center justify-between ${complaint.escalation.isEscalated ? 'border-red-200' : 'border-slate-200'}`}>
                <h2 className={`text-xs font-semibold uppercase tracking-wide flex items-center gap-1.5 ${complaint.escalation.isEscalated ? 'text-red-700' : 'text-slate-700'}`}>
                  <AlertTriangle size={13} /> Escalation Review
                </h2>
                <PriorityBadge priority={complaint.escalation.riskLevel} size="sm" />
              </div>
              <div className="px-4 py-4 space-y-3">
                <div>
                  <p className="text-xs font-medium text-slate-600 mb-1.5">Signals / Reasons (rules engine)</p>
                  <ul className="space-y-1">
                    {complaint.escalation.reasons.map((r, idx) => (
                      <li key={idx} className="text-xs text-slate-600 flex items-start gap-1.5">
                        <span className="text-amber-500 shrink-0 mt-0.5">•</span> {r}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded px-3 py-2.5">
                  <p className="text-xs font-semibold text-amber-800 mb-1 flex items-center gap-1">
                    <Info size={11} /> Recommended Action <span className="text-amber-600 font-normal">(deterministic rules)</span>
                  </p>
                  <p className="text-xs text-amber-700">{complaint.escalation.recommendedAction}</p>
                </div>

                <div className="border border-slate-200 rounded px-3 py-2 bg-slate-50">
                  <p className="text-xs text-slate-500 italic">
                    Flags are produced by deterministic SLA rules — never by AI. The escalation decision is made by the NCH Supervisor (human-in-the-loop).
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Forward Modal */}
      <Modal
        open={forwardOpen}
        onClose={() => setForwardOpen(false)}
        title="Forward to Organization"
        footer={
          <>
            <Button size="sm" variant="outline" onClick={() => setForwardOpen(false)}>Cancel</Button>
            <Button
              size="sm" variant="primary" icon={<Send size={13} />}
              loading={actionBusy === 'forward'}
              onClick={async () => { await runAction('forward'); setForwardOpen(false); }}
            >
              Send
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <p className="text-xs text-slate-500 mb-1">Sending to</p>
            <p className="text-sm font-medium text-slate-800">{complaint.companyName}</p>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs text-slate-600">
            Forwarding issues the official NCH notice to the organization's nodal officer. The response
            deadline is fixed by the sector SLA ({complaint.sla?.hours ?? '—'}h from registration) and does
            not reset on follow-ups.
          </div>
          {complaint.sla && (
            <div>
              <p className="text-xs font-medium text-slate-700 mb-1">Response Deadline (fixed)</p>
              <input
                type="text"
                readOnly
                value={new Date(complaint.sla.deadline).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                className="w-full border border-slate-200 bg-slate-50 rounded px-3 py-2 text-sm text-slate-500"
              />
            </div>
          )}
        </div>
      </Modal>

      {/* Document Preview Modal */}
      <DocumentPreviewModal
        document={previewDoc}
        docketNumber={complaint.docketNumber}
        open={Boolean(previewDoc)}
        onClose={() => setPreviewDoc(null)}
      />
    </AppLayout>
  );
}

function AiAssistCard({ assist, onClear }: { assist: AiAssist; onClear: () => void }) {
  return (
    <div className="border border-nch-blue-200 bg-nch-blue-50/50 rounded p-4 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-nch-blue-700 flex items-center gap-1.5">
          <Bot size={12} /> AI advisory — resolution check
        </p>
        <button onClick={onClear} className="text-xs text-slate-400 hover:text-slate-600">Clear</button>
      </div>
      <pre className="text-xs text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">{assist.text}</pre>
      <p className="text-xs text-slate-400">{assist.provider}{assist.cached ? ' · cached' : ''}</p>
      <p className="text-xs text-slate-400 border-t border-nch-blue-100 pt-2">{assist.disclaimer}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | undefined }) {
  return (
    <div>
      <p className="text-xs text-slate-400 mb-0.5">{label}</p>
      <p className="text-sm text-slate-700">{value || '—'}</p>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-slate-400 shrink-0">{label}</span>
      <span className="text-slate-700 text-right">{value}</span>
    </div>
  );
}
