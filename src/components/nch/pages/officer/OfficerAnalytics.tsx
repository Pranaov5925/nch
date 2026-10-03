'use client';

// NCH 3.0 — Officer Analytics (Personal Caseload) (ported; live data)

import { Link } from 'react-router-dom';
import { AppLayout, PageHeader, SectionCard, StatCard, LoadingBlock, ErrorBlock } from '@/components/nch/AppLayout';
import { useAuth } from '@/context/AuthContext';
import { useFetch } from '@/lib/nch/client';
import { StatusBadge } from '@/components/nch/ui';
import type { Complaint, AnalyticsData, Officer } from '@/lib/nch/types';

export default function OfficerAnalytics() {
  const { user } = useAuth();
  const { data, loading, error, refetch } = useFetch<{ complaints: Complaint[] }>('/api/complaints');
  const { data: officersData } = useFetch<{ officers: Officer[] }>(user ? '/api/officers' : null);
  if (loading) return <AppLayout><LoadingBlock /></AppLayout>;
  if (error) return <AppLayout><ErrorBlock message={error} onRetry={refetch} /></AppLayout>;

  const complaints = (data?.complaints ?? []).filter(c => c.assignedOfficerId === user?.id);
  const officer = officersData?.officers.find(o => o.id === user?.id);

  const bySector = complaints.reduce<Record<string, { total: number; resolved: number }>>((acc, c) => {
    if (!acc[c.sector]) acc[c.sector] = { total: 0, resolved: 0 };
    acc[c.sector].total++;
    if (['Resolved', 'Closed'].includes(c.status)) acc[c.sector].resolved++;
    return acc;
  }, {});

  const byStatus = complaints.reduce<Record<string, number>>((acc, c) => {
    acc[c.status] = (acc[c.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <AppLayout>
      <PageHeader title="My Analytics" subtitle="Personal caseload performance overview" />

      {/* Officer profile */}
      {officer && (
        <div className="bg-white border border-slate-200 rounded p-4 mb-5 flex flex-wrap gap-4 items-center">
          <div className="h-12 w-12 rounded-full bg-nch-blue-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
            {officer.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900">{officer.name}</p>
            <p className="text-xs text-slate-500">{officer.designation} · {officer.department}</p>
            <p className="text-xs text-slate-400 font-mono mt-0.5">{officer.empId}</p>
          </div>
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <p className="text-xl font-bold text-slate-900">{complaints.filter(c => !['Resolved', 'Closed'].includes(c.status)).length}</p>
              <p className="text-xs text-slate-400">Active</p>
            </div>
            <div>
              <p className="text-xl font-bold text-green-700">{officer.resolvedThisMonth}</p>
              <p className="text-xs text-slate-400">Resolved (Month)</p>
            </div>
            <div>
              <p className="text-xl font-bold text-nch-blue-700">{officer.avgResolutionDays}</p>
              <p className="text-xs text-slate-400">Avg. Days</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <StatCard label="Total Assigned" value={complaints.length} />
        <StatCard label="Resolved" value={complaints.filter(c => ['Resolved','Closed'].includes(c.status)).length} />
        <StatCard label="Pending" value={complaints.filter(c => !['Resolved','Closed'].includes(c.status)).length} accent />
        <StatCard label="Escalated" value={complaints.filter(c => c.escalation?.isEscalated).length} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* By sector */}
        <SectionCard title="My Cases by Sector">
          <div className="space-y-3">
            {Object.entries(bySector).map(([sector, d]) => {
              const pct = d.total > 0 ? Math.round((d.resolved / d.total) * 100) : 0;
              return (
                <div key={sector}>
                  <div className="flex items-center justify-between mb-1 text-xs">
                    <span className="text-slate-700 font-medium">{sector}</span>
                    <span className="text-slate-500">{d.resolved}/{d.total} resolved ({pct}%)</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-nch-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            {Object.keys(bySector).length === 0 && <p className="text-xs text-slate-400 text-center py-4">No assigned cases yet.</p>}
          </div>
        </SectionCard>

        {/* By status */}
        <SectionCard title="My Cases by Status">
          <div className="space-y-2">
            {Object.entries(byStatus).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <StatusBadge status={status} size="sm" />
                <span className="text-sm font-semibold text-slate-700">{count}</span>
              </div>
            ))}
            {Object.keys(byStatus).length === 0 && <p className="text-xs text-slate-400 text-center py-4">No assigned cases yet.</p>}
          </div>
        </SectionCard>

        {/* Assigned sectors */}
        <SectionCard title="Assigned Sectors">
          <div className="flex flex-wrap gap-2">
            {officer?.sectors.length ? officer.sectors.map(sector => (
              <span key={sector} className="px-2.5 py-1 bg-nch-blue-50 text-nch-blue-700 border border-nch-blue-200 rounded text-xs font-medium">
                {sector}
              </span>
            )) : <p className="text-xs text-slate-400">All sectors (general queue).</p>}
          </div>
        </SectionCard>

        {/* Recent cases */}
        <SectionCard title="Recent Cases">
          <ul className="divide-y divide-slate-100 -mx-4">
            {complaints.slice(0, 4).map(c => (
              <li key={c.id}>
                <Link to={`/officer/complaints/${c.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-800 truncate">{c.subject}</p>
                    <p className="text-xs text-slate-400">{c.consumerName}</p>
                  </div>
                  <StatusBadge status={c.status} size="sm" />
                </Link>
              </li>
            ))}
            {complaints.length === 0 && <li className="px-4 py-6 text-center text-xs text-slate-400">No cases yet.</li>}
          </ul>
        </SectionCard>
      </div>
    </AppLayout>
  );
}
