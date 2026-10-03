'use client';

// NCH 3.0 — Supervisor Escalation Monitoring (ported; live data + decisions)
// THE human-in-the-loop decision point: escalate / dismiss / mark for review.

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Bot, Filter, ShieldAlert } from 'lucide-react';
import { AppLayout, PageHeader, LoadingBlock, ErrorBlock } from '@/components/nch/AppLayout';
import { StatusBadge, PriorityBadge, Select, Button, Modal, Textarea, AlertBanner } from '@/components/nch/ui';
import { api, useFetch } from '@/lib/nch/client';
import type { AiAssist, Complaint } from '@/lib/nch/types';

export default function SupervisorEscalations() {
  const { data, loading, error, refetch, setData } = useFetch<{ complaints: Complaint[] }>('/api/complaints');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [decideFor, setDecideFor] = useState<Complaint | null>(null);
  const [decision, setDecision] = useState<'review' | 'escalate' | 'dismiss'>('escalate');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [decideError, setDecideError] = useState('');
  const [done, setDone] = useState('');

  // AI ESCALATION_CONTEXT — the third advisory feature, surfaced exactly where
  // the supervisor makes the escalation decision. Advisory only.
  const [aiFor, setAiFor] = useState<Complaint | null>(null);
  const [aiResult, setAiResult] = useState<AiAssist | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState('');

  const openAiContext = (c: Complaint) => {
    setAiFor(c);
    setAiResult(null);
    setAiError('');
    setAiBusy(true);
    api<{ assist: AiAssist }>(`/api/complaints/${c.id}/ai`, {
      method: 'POST',
      body: JSON.stringify({ feature: 'ESCALATION_CONTEXT' }),
    })
      .then((res) => setAiResult(res.assist))
      .catch((err) => setAiError((err as Error).message))
      .finally(() => setAiBusy(false));
  };

  if (loading) return <AppLayout><LoadingBlock /></AppLayout>;
  if (error) return <AppLayout><ErrorBlock message={error} onRetry={refetch} /></AppLayout>;

  const complaints = data?.complaints ?? [];
  const escalated = complaints.filter(c =>
    c.escalation?.isEscalated || ['Escalated', 'Escalation Review'].includes(c.status) ||
    (c.escalation && !['Resolved', 'Closed'].includes(c.status))
  );

  const filtered = priorityFilter ? escalated.filter(c => c.priority === priorityFilter) : escalated;

  const underReview = escalated.filter(c => c.status === 'Escalation Review').length;
  const flaggedCount = escalated.filter(c => !c.escalation?.isEscalated && c.status !== 'Escalation Review' && c.status !== 'Escalated').length;
  const escalatedCount = escalated.filter(c => c.status === 'Escalated').length;

  const openDecision = (c: Complaint, d: 'review' | 'escalate' | 'dismiss') => {
    setDecideFor(c);
    setDecision(d);
    setNotes('');
    setDecideError('');
  };

  const submitDecision = async () => {
    if (!decideFor) return;
    setBusy(true);
    setDecideError('');
    try {
      const res = await api<{ complaint: Complaint }>(`/api/complaints/${decideFor.id}/escalate`, {
        method: 'POST',
        body: JSON.stringify({ decision, notes }),
      });
      // update local copy
      const updated = complaints.map(c => (c.id === res.complaint.id ? res.complaint : c));
      setData({ complaints: updated });
      setDone(
        decision === 'escalate' ? `Complaint ${decideFor.docketNumber} escalated — priority raised and organization notified.`
        : decision === 'review' ? `Complaint ${decideFor.docketNumber} moved to Escalation Review.`
        : `Flag on ${decideFor.docketNumber} dismissed with recorded reason.`
      );
      setDecideFor(null);
      setTimeout(() => setDone(''), 6000);
    } catch (err) {
      setDecideError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title="Escalation Monitoring"
        subtitle={`${escalated.length} active case${escalated.length !== 1 ? 's' : ''} in the escalation pipeline — supervisor decisions`}
      />

      {done && <AlertBanner type="success" title="Decision recorded" className="mb-4">{done}</AlertBanner>}

      {/* Summary bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Flagged (decision needed)', value: flaggedCount },
          { label: 'Under Review', value: underReview },
          { label: 'Escalated', value: escalatedCount },
          { label: 'Total in pipeline', value: escalated.length },
        ].map(s => (
          <div key={s.label} className="bg-white border border-slate-200 rounded p-3 text-center">
            <p className="text-xl font-bold text-slate-900">{s.value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-3 mb-4">
        <div className="w-40">
          <Select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} placeholder="All Priorities">
            {['Critical', 'High', 'Medium', 'Low'].map(p => <option key={p} value={p}>{p}</option>)}
          </Select>
        </div>
        <div className="flex items-center text-xs text-slate-400">
          <Filter size={12} className="mr-1.5" /> Flags are generated by the deterministic rules engine — escalate or dismiss after review.
        </div>
      </div>

      {/* Cases */}
      <div className="space-y-3">
        {filtered.map(c => {
          const needsDecision = !c.escalation?.isEscalated && c.status !== 'Escalated';
          return (
            <div key={c.id} className={`block bg-white border rounded transition-colors ${needsDecision ? 'border-amber-300' : 'border-red-200'}`}>
              <div className="px-4 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {needsDecision ? <ShieldAlert size={13} className="text-amber-500 shrink-0" /> : <AlertTriangle size={13} className="text-red-500 shrink-0" />}
                      <Link to={`/officer/complaints/${c.id}`} className="text-sm font-semibold text-slate-900 truncate hover:text-nch-blue-700">
                        {c.subject}
                      </Link>
                    </div>
                    <p className="text-xs font-mono text-slate-400">{c.docketNumber}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <PriorityBadge priority={c.priority} />
                    <StatusBadge status={c.status} size="sm" />
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 mb-3">
                  <span>{c.consumerName}</span>
                  <span>·</span>
                  <span>{c.companyName}</span>
                  <span>·</span>
                  <span>{c.sector}</span>
                  {c.amount != null && <><span>·</span><span className="font-medium">₹{c.amount.toLocaleString('en-IN')}</span></>}
                  <span>·</span>
                  <span>Officer: {c.assignedOfficerName ?? 'Unassigned'}</span>
                  {c.sla?.breached && <><span>·</span><span className="text-red-600 font-medium">SLA +{c.sla.overdueHours}h</span></>}
                </div>
                {c.escalation?.reasons && c.escalation.reasons.length > 0 && (
                  <div className="bg-red-50 border border-red-100 rounded px-3 py-2 mb-3">
                    <p className="text-xs font-semibold text-red-700 mb-1">Escalation Reasons (rules engine)</p>
                    <ul className="space-y-0.5">
                      {c.escalation.reasons.map((r, i) => (
                        <li key={i} className="text-xs text-red-600 flex items-start gap-1">
                          <span className="shrink-0">•</span>{r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {c.escalation?.recommendedAction && needsDecision && (
                  <p className="text-xs text-slate-500 mb-3"><strong>Recommended:</strong> {c.escalation.recommendedAction}</p>
                )}

                {needsDecision ? (
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="danger" icon={<AlertTriangle size={12} />} onClick={() => openDecision(c, 'escalate')}>
                      Escalate
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openDecision(c, 'review')}>
                      Move to Review
                    </Button>
                    <Button size="sm" variant="outline" icon={<Bot size={12} />} onClick={() => openAiContext(c)}>
                      AI Context
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => openDecision(c, 'dismiss')}>
                      Dismiss Flag
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-red-600">
                    {c.status === 'Escalated'
                      ? `Escalated to organization.${c.supervisorNotes ? ` Supervisor: ${c.supervisorNotes}` : ''}`
                      : 'Under supervisor review.'}
                  </p>
                )}
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="bg-white border border-slate-200 rounded py-16 text-center">
            <ShieldAlert size={32} className="mx-auto text-slate-300 mb-3" />
            <p className="text-sm text-slate-500">No cases in the escalation pipeline.</p>
          </div>
        )}
      </div>

      {/* AI Escalation Context modal */}
      <Modal
        open={!!aiFor}
        onClose={() => setAiFor(null)}
        title="AI Escalation Context"
        footer={
          <Button size="sm" variant="outline" onClick={() => setAiFor(null)}>Close</Button>
        }
      >
        <div className="space-y-3">
          {aiFor && (
            <div className="bg-slate-50 border border-slate-200 rounded p-3 text-xs">
              <p className="font-semibold text-slate-800">{aiFor.docketNumber}</p>
              <p className="text-slate-600 mt-0.5">{aiFor.subject}</p>
            </div>
          )}
          {aiBusy && <p className="text-xs text-slate-500 flex items-center gap-2"><Bot size={14} className="animate-pulse" /> Generating advisory context note…</p>}
          {aiError && <AlertBanner type="error" title="AI request failed">{aiError}</AlertBanner>}
          {aiResult && (
            <>
              <p className="text-[11px] text-slate-400">Provider: {aiResult.provider}{aiResult.cached ? ' · cached' : ''}</p>
              <pre className="text-xs text-slate-700 whitespace-pre-wrap font-sans bg-slate-50 border border-slate-200 rounded p-3 max-h-80 overflow-y-auto">{aiResult.text}</pre>
              <p className="text-[11px] text-slate-400">{aiResult.disclaimer}</p>
            </>
          )}
        </div>
      </Modal>

      {/* Decision modal */}
      <Modal
        open={!!decideFor}
        onClose={() => setDecideFor(null)}
        title={
          decision === 'escalate' ? 'Escalate Complaint' :
          decision === 'review' ? 'Move to Escalation Review' : 'Dismiss Escalation Flag'
        }
        footer={
          <>
            <Button size="sm" variant="outline" onClick={() => setDecideFor(null)}>Cancel</Button>
            <Button
              size="sm"
              variant={decision === 'dismiss' ? 'outline' : decision === 'escalate' ? 'danger' : 'primary'}
              loading={busy}
              onClick={submitDecision}
            >
              {decision === 'escalate' ? 'Confirm Escalation' : decision === 'review' ? 'Move to Review' : 'Confirm Dismissal'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {decideFor && (
            <div className="bg-slate-50 border border-slate-200 rounded p-3 text-xs">
              <p className="font-semibold text-slate-800">{decideFor.docketNumber}</p>
              <p className="text-slate-600 mt-0.5">{decideFor.subject}</p>
              <p className="text-slate-400 mt-1">{decideFor.companyName} · {decideFor.sector} · Priority {decideFor.priority}</p>
            </div>
          )}
          {decision === 'escalate' && (
            <AlertBanner type="warning">
              Escalation refers this case to the organization's principal nodal officer with a compliance window. Priority will be raised by one level.
            </AlertBanner>
          )}
          {decision === 'dismiss' && (
            <AlertBanner type="info">
              Dismissing clears the escalation flag. The original timeline events remain on record for audit purposes.
            </AlertBanner>
          )}
          <div>
            <p className="text-xs font-medium text-slate-700 mb-1">
              {decision === 'escalate' ? 'Escalation Notes / Compliance Expectations' : decision === 'review' ? 'Review Notes (optional)' : 'Reason for Dismissal (recorded)'}
            </p>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder={
                decision === 'escalate'
                  ? 'e.g. Repeated non-response despite reminders; escalate to principal nodal officer with 7-day compliance window…'
                  : decision === 'review'
                    ? 'Optional context for the review record…'
                    : 'e.g. Company response received and under consumer confirmation; flag no longer applicable…'
              }
              rows={4}
            />
          </div>
          {decideError && <p className="text-xs text-red-600">{decideError}</p>}
        </div>
      </Modal>
    </AppLayout>
  );
}
