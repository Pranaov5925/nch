'use client';

// NCH 3.0 — Supervisor Analytics & Trends (ported; live data)

import { AppLayout, PageHeader, SectionCard, StatCard, LoadingBlock, ErrorBlock } from '@/components/nch/AppLayout';
import { useFetch } from '@/lib/nch/client';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { AnalyticsData } from '@/lib/nch/types';
import { SLA_WINDOW_SUMMARY } from '@/lib/nch/constants';

export default function SupervisorAnalytics() {
  const { data, loading, error, refetch } = useFetch<AnalyticsData>('/api/analytics');
  if (loading) return <AppLayout><LoadingBlock /></AppLayout>;
  if (error || !data) return <AppLayout><ErrorBlock message={error ?? 'Failed to load'} onRetry={refetch} /></AppLayout>;

  const { overview, bySector, byStatus, monthlyTrend, sla } = data;

  return (
    <AppLayout>
      <PageHeader
        title="Analytics & Trends"
        subtitle="System-wide complaint performance overview"
      />

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <StatCard label="Total Complaints" value={overview.totalComplaints.toLocaleString('en-IN')} />
        <StatCard label="Pending" value={overview.pendingComplaints.toLocaleString('en-IN')} accent />
        <StatCard label="Resolved (Month)" value={overview.resolvedThisMonth.toLocaleString('en-IN')} />
        <StatCard label="Escalated" value={overview.escalatedActive} />
        <StatCard label="Resolution Rate" value={`${overview.resolutionRate}%`} />
        <StatCard label="SLA Compliance" value={`${sla?.complianceRate ?? 100}%`} sub={`${sla?.breached ?? 0} breached`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">

        {/* Monthly trend */}
        <div className="lg:col-span-2">
          <SectionCard title="Monthly Trend — Registrations vs. Resolutions">
            <div className="space-y-2">
              {monthlyTrend.map(m => {
                const maxVal = Math.max(...monthlyTrend.map(t => Math.max(t.registered, t.resolved)), 1);
                const regPct = Math.round((m.registered / maxVal) * 100);
                const resPct = Math.round((m.resolved / maxVal) * 100);
                return (
                  <div key={m.month} className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-slate-500 w-16 shrink-0">{m.month}</span>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 bg-nch-blue-500 rounded-full" style={{ width: `${regPct}%` }} title={`Registered: ${m.registered}`} />
                        <span className="text-xs text-slate-400">{m.registered.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 bg-green-500 rounded-full" style={{ width: `${resPct}%` }} title={`Resolved: ${m.resolved}`} />
                        <span className="text-xs text-slate-400">{m.resolved.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div className="flex items-center gap-4 text-xs text-slate-400 pt-2 border-t border-slate-100 mt-2">
                <span className="flex items-center gap-1"><span className="h-2 w-3 rounded bg-nch-blue-500 inline-block" />Registered</span>
                <span className="flex items-center gap-1"><span className="h-2 w-3 rounded bg-green-500 inline-block" />Resolved</span>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* SLA compliance */}
        <SectionCard title="SLA Compliance (active cases)">
          <div className="space-y-4">
            <div className="flex items-end gap-3">
              <p className="text-3xl font-bold text-nch-blue-700">{sla?.complianceRate ?? 100}%</p>
              <p className="text-xs text-slate-400 pb-1">of active cases within SLA window</p>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-nch-blue-500 rounded-full" style={{ width: `${sla?.complianceRate ?? 100}%` }} />
            </div>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="bg-green-50 border border-green-200 rounded p-3">
                <p className="text-lg font-bold text-green-700">{sla?.withinSla ?? 0}</p>
                <p className="text-xs text-slate-500">Within SLA</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded p-3">
                <p className="text-lg font-bold text-red-700">{sla?.breached ?? 0}</p>
                <p className="text-xs text-slate-500">Breached (flagged)</p>
              </div>
            </div>
            <p className="text-xs text-slate-400 border-t border-slate-100 pt-2">
              Prototype SLA windows: {SLA_WINDOW_SUMMARY} (scaled by the DEMO_SLA_MULTIPLIER env var). Deadlines are fixed at registration and never reset.
            </p>
          </div>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Sector performance */}
        <SectionCard title="Sector Performance">
          <div className="space-y-3">
            {bySector.map(s => {
              const resRate = s.count > 0 ? Math.round((s.resolved / s.count) * 100) : 0;
              const trend = resRate >= 85 ? 'up' : resRate < 70 ? 'down' : 'flat';
              return (
                <div key={s.sector} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1 text-xs">
                      <span className="font-medium text-slate-700">{s.sector}</span>
                      <div className="flex items-center gap-1.5">
                        {trend === 'up' && <TrendingUp size={11} className="text-green-600" />}
                        {trend === 'down' && <TrendingDown size={11} className="text-red-500" />}
                        {trend === 'flat' && <Minus size={11} className="text-slate-400" />}
                        <span className={`font-semibold ${resRate >= 85 ? 'text-green-700' : resRate < 70 ? 'text-red-600' : 'text-amber-700'}`}>
                          {resRate}%
                        </span>
                        <span className="text-slate-400">({s.count.toLocaleString()} total)</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${resRate >= 85 ? 'bg-green-500' : resRate < 70 ? 'bg-red-400' : 'bg-amber-400'}`}
                        style={{ width: `${resRate}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>

        {/* Status distribution */}
        <SectionCard title="Status Distribution">
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {byStatus.filter(s => s.count > 0).sort((a, b) => b.count - a.count).map(s => {
              const total = byStatus.reduce((sum, x) => sum + x.count, 0);
              const pct = Math.round((s.count / total) * 100);
              return (
                <div key={s.status} className="flex items-center gap-2 text-xs">
                  <span className="w-36 text-slate-600 shrink-0 truncate">{s.status}</span>
                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-nch-blue-400 rounded-full" style={{ width: `${Math.max(pct, 1)}%` }} />
                  </div>
                  <span className="w-12 text-right text-slate-500 shrink-0">{s.count.toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        </SectionCard>
      </div>
    </AppLayout>
  );
}
