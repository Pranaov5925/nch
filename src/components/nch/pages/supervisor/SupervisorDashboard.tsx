'use client';

// NCH 3.0 — Supervisor Dashboard (ported; live data)

import { Link } from 'react-router-dom';
import { AlertTriangle, TrendingUp, ArrowRight } from 'lucide-react';
import { AppLayout, PageHeader, SectionCard, StatCard, LoadingBlock, ErrorBlock } from '@/components/nch/AppLayout';
import { PriorityBadge } from '@/components/nch/ui';
import { useAuth } from '@/context/AuthContext';
import { useFetch } from '@/lib/nch/client';
import type { AnalyticsData, Complaint, Officer } from '@/lib/nch/types';
import { SLA_WINDOW_SUMMARY } from '@/lib/nch/constants';

export default function SupervisorDashboard() {
  const { user } = useAuth();
  const { data: aData, loading, error, refetch } = useFetch<AnalyticsData>('/api/analytics');
  const { data: cData } = useFetch<{ complaints: Complaint[] }>('/api/complaints');
  const { data: oData } = useFetch<{ officers: Officer[] }>('/api/officers');

  if (loading) return <AppLayout><LoadingBlock /></AppLayout>;
  if (error || !aData) return <AppLayout><ErrorBlock message={error ?? 'Failed to load'} onRetry={refetch} /></AppLayout>;

  const { overview, bySector, recentEscalations, sla } = aData;
  const complaints = cData?.complaints ?? [];
  const officers = oData?.officers ?? [];

  const flagged = complaints.filter(c => c.escalation && !c.escalation.isEscalated && !['Resolved', 'Closed'].includes(c.status));
  const highPriority = complaints.filter(c =>
    ['Critical', 'High'].includes(c.priority) && !['Resolved', 'Closed'].includes(c.status)
  );

  return (
    <AppLayout>
      <PageHeader
        title="Supervisor Dashboard"
        subtitle={`${user?.name} — System-wide overview · ${new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`}
      />

      {/* Escalation review banner — human-in-the-loop decision point */}
      {flagged.length > 0 && (
        <Link to="/supervisor/escalations" className="mb-4 flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded hover:bg-amber-100 transition-colors">
          <TrendingUp size={15} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800">
              {flagged.length} complaint{flagged.length > 1 ? 's' : ''} flagged for escalation review — decision required
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              Rules-engine flags (SLA breaches, consumer disputes). Review each case and escalate or dismiss.
            </p>
          </div>
          <span className="text-xs font-medium text-amber-700 underline shrink-0">Review →</span>
        </Link>
      )}

      {/* Top stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <StatCard label="Total Complaints" value={overview.totalComplaints.toLocaleString('en-IN')} />
        <StatCard label="Pending" value={overview.pendingComplaints.toLocaleString('en-IN')} accent />
        <StatCard label="Resolved (Month)" value={overview.resolvedThisMonth.toLocaleString('en-IN')} />
        <StatCard label="Escalated Active" value={overview.escalatedActive} />
        <StatCard label="Resolution Rate" value={`${overview.resolutionRate}%`} />
        <StatCard label="SLA Compliance" value={`${sla?.complianceRate ?? 100}%`} sub={`${sla?.breached ?? 0} breached`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Left 2/3 */}
        <div className="lg:col-span-2 space-y-5">

          {/* Recent escalations */}
          <SectionCard
            title="Recent Escalations"
            actions={<Link to="/supervisor/escalations" className="text-xs text-nch-blue-600 font-medium">View all →</Link>}
            noPad
          >
            <ul className="divide-y divide-slate-100">
              {recentEscalations.map((e, idx) => (
                <li key={idx} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                  <AlertTriangle size={13} className="text-red-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono text-slate-400">{e.docket}</p>
                    <p className="text-xs font-medium text-slate-800 truncate">{e.consumer}</p>
                    <p className="text-xs text-slate-400">{e.company} · {e.sector}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <PriorityBadge priority={e.priority} size="sm" />
                    <span className="text-xs text-slate-400">{e.escalatedAt}</span>
                  </div>
                </li>
              ))}
              {recentEscalations.length === 0 && (
                <li className="px-4 py-8 text-center text-xs text-slate-400">No escalations on record.</li>
              )}
            </ul>
          </SectionCard>

          {/* Sector breakdown */}
          <SectionCard title="Complaints by Sector">
            <div className="space-y-3">
              {bySector.slice(0, 6).map(s => {
                const pct = s.count > 0 ? Math.round((s.resolved / s.count) * 100) : 0;
                const pendingPct = Math.round((s.pending / s.count) * 100);
                return (
                  <div key={s.sector}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-700 font-medium">{s.sector}</span>
                      <span className="text-slate-500">{s.count.toLocaleString()} total · {pct}% resolved</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden flex">
                      <div className="h-full bg-green-500" style={{ width: `${pct}%` }} title={`${pct}% resolved`} />
                      <div className="h-full bg-amber-400" style={{ width: `${pendingPct}%` }} title={`${pendingPct}% pending`} />
                    </div>
                  </div>
                );
              })}
              <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-green-500 inline-block" />Resolved</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-amber-400 inline-block" />Pending</span>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* Right panel */}
        <div className="space-y-4">

          {/* System health (deterministic, computed) */}
          <SectionCard title="System Signals (computed)">
            <div className="space-y-3">
              {[
                {
                  title: `${sla?.breached ?? 0} active case(s) past SLA deadline`,
                  detail: `Deterministic count from the SLA rules engine (${SLA_WINDOW_SUMMARY}, prototype windows).`,
                  high: (sla?.breached ?? 0) > 0,
                },
                {
                  title: `${flagged.length} flag(s) awaiting supervisor decision`,
                  detail: 'Flags never change case status automatically — a supervisor decides to escalate or dismiss.',
                  high: flagged.length > 0,
                },
                {
                  title: `${highPriority.length} high/critical priority active case(s)`,
                  detail: 'Priority is auto-derived from the amount in dispute and supervisor escalation bumps.',
                  high: false,
                },
              ].map((insight, i) => (
                <div key={i} className={`rounded border px-3 py-3 ${insight.high ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'}`}>
                  <div className="flex items-start gap-2">
                    <TrendingUp size={12} className={`shrink-0 mt-0.5 ${insight.high ? 'text-amber-600' : 'text-blue-500'}`} />
                    <div>
                      <p className={`text-xs font-semibold ${insight.high ? 'text-amber-800' : 'text-blue-800'}`}>{insight.title}</p>
                      <p className={`text-xs mt-0.5 leading-relaxed ${insight.high ? 'text-amber-700' : 'text-blue-700'}`}>{insight.detail}</p>
                    </div>
                  </div>
                </div>
              ))}
              <p className="text-xs text-slate-400 border-t border-slate-100 pt-2">
                These signals are computed deterministically from live data — no AI involved in any decision.
              </p>
            </div>
          </SectionCard>

          {/* Officers overview */}
          <SectionCard title="Officer Overview">
            <ul className="space-y-2">
              {officers.map(officer => (
                <li key={officer.id} className="flex items-center gap-2.5 py-1.5">
                  <div className="h-7 w-7 rounded-full bg-nch-blue-100 text-nch-blue-700 flex items-center justify-center text-xs font-semibold shrink-0">
                    {officer.name.split(' ').map(n => n[0]).join('').slice(0,2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-800 truncate">{officer.name}</p>
                    <p className="text-xs text-slate-400">{officer.assignedComplaints} assigned · {officer.resolvedThisMonth} resolved</p>
                  </div>
                </li>
              ))}
            </ul>
          </SectionCard>

          {/* Escalation link */}
          <Link
            to="/supervisor/escalations"
            className="flex items-center justify-between px-4 py-3 bg-red-50 border border-red-200 rounded hover:bg-red-100 transition-colors group"
          >
            <div>
              <p className="text-sm font-semibold text-red-800">Escalation Monitoring</p>
              <p className="text-xs text-red-600">{overview.escalatedActive} case{overview.escalatedActive !== 1 ? 's' : ''} in the escalation pipeline</p>
            </div>
            <ArrowRight size={14} className="text-red-400 group-hover:text-red-600" />
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}
