'use client';

// NCH 3.0 — Supervisor Reports Page (ported; live snapshot + browser print)

import { AppLayout, PageHeader, SectionCard, LoadingBlock, ErrorBlock } from '@/components/nch/AppLayout';
import { FileCheck, Printer } from 'lucide-react';
import { Button } from '@/components/nch/ui';
import { useFetch } from '@/lib/nch/client';
import type { AnalyticsData, Officer } from '@/lib/nch/types';

const REPORT_TYPES = [
  { title: 'Monthly Performance Report', desc: 'Total complaints registered, resolved, and pending for the current month.' },
  { title: 'Escalation Summary Report', desc: 'All escalated and flagged cases with rules-engine reasons and decision status.' },
  { title: 'Sector-wise Grievance Report', desc: 'Complaint distribution and resolution rate by sector.' },
  { title: 'Company Performance Report', desc: 'Organisation response rate and resolution performance.' },
  { title: 'Officer Caseload Report', desc: 'Complaint assignment and resolution statistics per officer.' },
];

export default function SupervisorReports() {
  const { data, loading, error, refetch } = useFetch<AnalyticsData>('/api/analytics');
  const { data: oData } = useFetch<{ officers: Officer[] }>('/api/officers');
  if (loading) return <AppLayout><LoadingBlock /></AppLayout>;
  if (error || !data) return <AppLayout><ErrorBlock message={error ?? 'Failed to load'} onRetry={refetch} /></AppLayout>;

  const { overview, bySector, byStatus, sla } = data;

  return (
    <AppLayout>
      <PageHeader
        title="Reports"
        subtitle="Live system snapshot — use the browser print dialog to export as PDF"
        actions={
          <Button size="sm" variant="outline" icon={<Printer size={13} />} onClick={() => window.print()} className="no-print">
            Print / Save as PDF
          </Button>
        }
      />

      <SectionCard title="System Snapshot Report">
        <div className="space-y-6 text-sm">
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Overview</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                ['Total Complaints', overview.totalComplaints],
                ['Pending (Active)', overview.pendingComplaints],
                ['Resolved This Month', overview.resolvedThisMonth],
                ['Escalated Active', overview.escalatedActive],
                ['Avg. Resolution Days', overview.avgResolutionDays],
                ['SLA Compliance', `${sla?.complianceRate ?? 100}%`],
              ].map(([label, value]) => (
                <div key={String(label)} className="border border-slate-200 rounded p-3">
                  <p className="text-xs text-slate-400">{label}</p>
                  <p className="text-lg font-bold text-slate-900">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">By Sector</h3>
            <table className="min-w-full text-xs border border-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-3 py-2 border-b border-slate-200">Sector</th>
                  <th className="text-left px-3 py-2 border-b border-slate-200">Total</th>
                  <th className="text-left px-3 py-2 border-b border-slate-200">Resolved</th>
                  <th className="text-left px-3 py-2 border-b border-slate-200">Pending</th>
                </tr>
              </thead>
              <tbody>
                {bySector.map(s => (
                  <tr key={s.sector} className="border-b border-slate-100">
                    <td className="px-3 py-2">{s.sector}</td>
                    <td className="px-3 py-2">{s.count}</td>
                    <td className="px-3 py-2">{s.resolved}</td>
                    <td className="px-3 py-2">{s.pending}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">By Status</h3>
            <div className="flex flex-wrap gap-2">
              {byStatus.map(s => (
                <span key={s.status} className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded text-xs">
                  {s.status}: <strong>{s.count}</strong>
                </span>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Officer Caseload</h3>
            <ul className="text-xs text-slate-600 space-y-1">
              {(oData?.officers ?? []).map(o => (
                <li key={o.id}>• {o.name} — {o.assignedComplaints} active · {o.resolvedThisMonth} resolved this month · avg {o.avgResolutionDays} days</li>
              ))}
            </ul>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Available Report Types" className="mt-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 no-print">
          {REPORT_TYPES.map(report => (
            <div key={report.title} className="border border-slate-200 rounded p-4 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <FileCheck size={16} className="text-nch-blue-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-slate-800">{report.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{report.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-4 border-t border-slate-100 pt-3 no-print">
          The snapshot above is generated live from the database. File exports are a placeholder in this academic prototype — use “Print / Save as PDF”.
        </p>
      </SectionCard>
    </AppLayout>
  );
}
