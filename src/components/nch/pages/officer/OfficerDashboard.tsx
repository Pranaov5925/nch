'use client';

// NCH 3.0 — Officer Dashboard (ported; live data)

import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { AppLayout, PageHeader, SectionCard, StatCard, LoadingBlock, ErrorBlock } from '@/components/nch/AppLayout';
import { StatusBadge, PriorityBadge } from '@/components/nch/ui';
import { useAuth } from '@/context/AuthContext';
import { useFetch } from '@/lib/nch/client';
import type { Complaint, AnalyticsData } from '@/lib/nch/types';

export default function OfficerDashboard() {
  const { user } = useAuth();
  const { data, loading, error, refetch } = useFetch<{ complaints: Complaint[] }>('/api/complaints');
  const { data: analytics } = useFetch<AnalyticsData>('/api/analytics');

  if (loading) return <AppLayout><LoadingBlock /></AppLayout>;
  if (error) return <AppLayout><ErrorBlock message={error} onRetry={refetch} /></AppLayout>;

  const complaints = data?.complaints ?? [];
  const assigned = complaints.filter(c => c.assignedOfficerId === user?.id);
  const pool = complaints.filter(c => !c.assignedOfficerId);

  const pending = assigned.filter(c => !['Resolved', 'Closed'].includes(c.status));
  const escalated = assigned.filter(c => ['Escalated', 'Escalation Review', 'Reopened'].includes(c.status));
  const needsAction = assigned.filter(c => ['Reopened', 'Confirmation Pending', 'Awaiting Response'].includes(c.status));
  const resolvedThisMonth = analytics?.overview.resolvedThisMonth ?? 0;
  const avgDays = analytics?.overview.avgResolutionDays ?? 0;

  const highPriority = complaints
    .filter(c => (c.priority === 'Critical' || c.priority === 'High') && !['Resolved', 'Closed'].includes(c.status))
    .slice(0, 5);

  const assignedShow = [...assigned, ...pool].slice(0, 6);

  return (
    <AppLayout>
      <PageHeader
        title="Officer Dashboard"
        subtitle={`${user?.name} — ${new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`}
      />

      {/* Alert for escalated cases */}
      {escalated.length > 0 && (
        <div className="mb-6 flex items-start gap-3.5 px-4.5 py-3.5 bg-red-50 border border-red-200 rounded-xl shadow-xs">
          <AlertTriangle size={16} className="text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-red-900">
              {escalated.length} escalated/reopened case{escalated.length > 1 ? 's' : ''} require immediate attention
            </p>
            <p className="text-xs text-red-700 mt-0.5 leading-relaxed">Please review escalated cases and take appropriate action.</p>
          </div>
          <Link to="/officer/escalations" className="shrink-0 text-xs font-semibold text-red-700 hover:text-red-900 underline self-center">
            Review →
          </Link>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-5 mb-8">
        <StatCard label="Assigned to Me" value={assigned.length} />
        <StatCard label="Pending Cases" value={pending.length} accent />
        <StatCard label="Resolved This Month" value={resolvedThisMonth} sub="This month" />
        <StatCard label="Avg. Resolution" value={`${avgDays || '—'} days`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Assigned complaints */}
        <div className="lg:col-span-2 space-y-6">
          <SectionCard
            title="My Casebook (assigned + unassigned pool)"
            actions={
              <Link to="/officer/queue" className="text-xs text-nch-blue-600 hover:text-nch-blue-800 font-semibold">
                Full queue →
              </Link>
            }
            noPad
          >
            <ul className="divide-y divide-slate-100">
              {assignedShow.map(c => (
                <li key={c.id}>
                  <Link to={`/officer/complaints/${c.id}`} className="flex items-start gap-4 px-5 py-4 hover:bg-slate-50/80 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-3 mb-1.5">
                        <p className="text-sm font-semibold text-slate-800 line-clamp-1">{c.subject}</p>
                        <StatusBadge status={c.status} size="sm" />
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-400">
                        <span className="font-mono">{c.docketNumber}</span>
                        <span>·</span>
                        <span>{c.consumerName}</span>
                        <span>·</span>
                        <span>{c.companyName}</span>
                        {!c.assignedOfficerId && <span className="text-nch-blue-600 font-semibold">· unassigned</span>}
                      </div>
                    </div>
                    <PriorityBadge priority={c.priority} size="sm" />
                  </Link>
                </li>
              ))}
              {assignedShow.length === 0 && (
                <li className="px-5 py-12 text-center text-sm text-slate-400">No complaints in your queue yet.</li>
              )}
            </ul>
          </SectionCard>

          {/* High priority queue */}
          <SectionCard title="High Priority — All Officers" noPad>
            <ul className="divide-y divide-slate-100">
              {highPriority.map(c => (
                <li key={c.id}>
                  <Link to={`/officer/complaints/${c.id}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50/80 transition-colors">
                    <PriorityBadge priority={c.priority} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">{c.subject}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{c.docketNumber} · {c.consumerName}</p>
                    </div>
                    <StatusBadge status={c.status} size="sm" />
                  </Link>
                </li>
              ))}
              {highPriority.length === 0 && (
                <li className="px-5 py-8 text-center text-xs text-slate-400">No high-priority active cases.</li>
              )}
            </ul>
          </SectionCard>
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          {/* Action items */}
          <SectionCard title="Requires Action">
            {needsAction.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No items requiring immediate action.</p>
            ) : (
              <ul className="space-y-2.5">
                {needsAction.map(c => (
                  <li key={c.id}>
                    <Link to={`/officer/complaints/${c.id}`} className="block p-3.5 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100/80 transition-colors shadow-2xs">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-semibold text-amber-900 line-clamp-2">{c.subject}</p>
                        <StatusBadge status={c.status} size="sm" />
                      </div>
                      <p className="text-xs text-amber-700 mt-1.5">{c.consumerName}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          {/* Escalation queue link */}
          <Link to="/officer/escalations" className="flex items-center justify-between px-4 py-3 bg-red-50 border border-red-200 rounded hover:bg-red-100 transition-colors group">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className="text-red-600" />
              <div>
                <p className="text-sm font-semibold text-red-800">Escalation Queue</p>
                <p className="text-xs text-red-600">{analytics?.overview.escalatedActive ?? 0} cases in escalation</p>
              </div>
            </div>
            <ArrowRight size={14} className="text-red-400 group-hover:text-red-600" />
          </Link>

          {/* System stats */}
          <SectionCard title="System Overview">
            <div className="space-y-2 text-xs">
              {[
                { label: 'Total Active Complaints', value: (analytics?.overview.pendingComplaints ?? 0).toLocaleString() },
                { label: 'Resolved This Month', value: (analytics?.overview.resolvedThisMonth ?? 0).toLocaleString() },
                { label: 'Avg. Resolution (System)', value: `${analytics?.overview.avgResolutionDays ?? 0} days` },
                { label: 'Resolution Rate', value: `${analytics?.overview.resolutionRate ?? 0}%` },
                { label: 'SLA Compliance (active)', value: `${analytics?.sla?.complianceRate ?? 100}%` },
              ].map(item => (
                <div key={item.label} className="flex justify-between">
                  <span className="text-slate-400">{item.label}</span>
                  <span className="font-medium text-slate-700">{item.value}</span>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
    </AppLayout>
  );
}
