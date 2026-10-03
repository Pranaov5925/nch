'use client';

// NCH 3.0 — Company Dashboard (ported; live data, company-scoped API)

import { Link } from 'react-router-dom';
import { FileText, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { AppLayout, PageHeader, SectionCard, StatCard, LoadingBlock, ErrorBlock } from '@/components/nch/AppLayout';
import { StatusBadge } from '@/components/nch/ui';
import { useAuth } from '@/context/AuthContext';
import { useFetch } from '@/lib/nch/client';
import type { Complaint } from '@/lib/nch/types';
import { SLA_WINDOW_RANGE } from '@/lib/nch/constants';

export default function CompanyDashboard() {
  const { user } = useAuth();
  const { data, loading, error, refetch } = useFetch<{ complaints: Complaint[] }>('/api/complaints');
  if (loading) return <AppLayout><LoadingBlock /></AppLayout>;
  if (error) return <AppLayout><ErrorBlock message={error} onRetry={refetch} /></AppLayout>;

  const complaints = data?.complaints ?? [];
  const pending = complaints.filter(c => !['Resolved', 'Closed'].includes(c.status));
  const responded = complaints.filter(c => c.companyResponse);
  const awaiting = complaints.filter(c => ['Forwarded', 'Awaiting Response', 'Escalated', 'Reopened'].includes(c.status));

  return (
    <AppLayout>
      <PageHeader
        title="Company Dashboard"
        subtitle={user?.companyName ?? 'Company Portal'}
      />

      {/* Company info banner */}
      <div className="bg-nch-blue-50 border border-nch-blue-200 rounded p-4 mb-5 flex flex-wrap gap-4 items-start">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-nch-blue-900">{user?.companyName}</p>
          <p className="text-xs text-nch-blue-600 mt-0.5">Nodal account: {user?.email}</p>
          <p className="text-xs text-nch-blue-500 mt-0.5">Responses submitted here reach the assigned NCH officer and the consumer.</p>
        </div>
        <div className="flex gap-6 text-center shrink-0">
          <div>
            <p className="text-lg font-bold text-nch-blue-800">{complaints.length ? Math.round((responded.length / complaints.length) * 100) : 0}%</p>
            <p className="text-xs text-nch-blue-500">Response Coverage</p>
          </div>
          <div>
            <p className="text-lg font-bold text-nch-blue-800">{responded.filter(c => c.consumerFeedback?.confirmed).length}</p>
            <p className="text-xs text-nch-blue-500">Confirmed Resolutions</p>
          </div>
        </div>
      </div>

      {/* Alert for pending responses */}
      {awaiting.length > 0 && (
        <div className="mb-5 flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded">
          <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">Response Required</p>
            <p className="text-xs text-amber-700 mt-0.5">
              {awaiting.length} complaint{awaiting.length > 1 ? 's' : ''} forwarded by NCH (including escalations/reopenings) require your response.
            </p>
          </div>
          <Link to="/company/complaints" className="text-xs font-medium text-amber-700 underline shrink-0">Respond →</Link>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total Received" value={complaints.length} />
        <StatCard label="Pending Response" value={awaiting.length} accent />
        <StatCard label="Responded" value={responded.length} />
        <StatCard label="Escalated / Reopened" value={complaints.filter(c => ['Escalated', 'Reopened'].includes(c.status)).length} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <SectionCard title="Received Complaints" noPad actions={
            <Link to="/company/complaints" className="text-xs text-nch-blue-600 font-medium">View all →</Link>
          }>
            <ul className="divide-y divide-slate-100">
              {complaints.map(c => (
                <li key={c.id}>
                  <Link to={`/company/complaints/${c.id}`} className="flex items-start gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-sm font-medium text-slate-800 line-clamp-1">{c.subject}</p>
                        <StatusBadge status={c.status} size="sm" />
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-400">
                        <span className="font-mono">{c.docketNumber}</span>
                        <span>·</span>
                        <span>{c.category}</span>
                        <span>·</span>
                        <span>{new Date(c.registeredAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>
                    </div>
                    {['Forwarded', 'Awaiting Response', 'Escalated', 'Reopened'].includes(c.status) && (
                      <span className="shrink-0 text-xs text-amber-600 font-medium whitespace-nowrap">Response due</span>
                    )}
                  </Link>
                </li>
              ))}
              {complaints.length === 0 && (
                <li className="px-4 py-8 text-center text-xs text-slate-400">No complaints received yet.</li>
              )}
            </ul>
          </SectionCard>
        </div>

        <div className="space-y-4">
          <SectionCard title="Quick Actions">
            <div className="space-y-2">
              {[
                { label: 'View Pending Responses', to: '/company/complaints', icon: <Clock size={14} /> },
                { label: 'Response History', to: '/company/responses', icon: <CheckCircle2 size={14} /> },
                { label: 'Complaint History', to: '/company/history', icon: <FileText size={14} /> },
              ].map(a => (
                <Link key={a.label} to={a.to} className="flex items-center gap-2 px-3 py-2.5 rounded border border-slate-200 hover:border-nch-blue-300 hover:bg-nch-blue-50 text-sm text-slate-700 transition-colors group">
                  <span className="text-nch-blue-500 group-hover:text-nch-blue-700">{a.icon}</span>
                  {a.label}
                </Link>
              ))}
            </div>
          </SectionCard>

          <div className="bg-amber-50 border border-amber-200 rounded p-4 text-xs text-amber-700">
            <p className="font-semibold mb-1">Response Obligation</p>
            <p className="leading-relaxed">All NCH-forwarded complaints must be responded to within the sector SLA window ({SLA_WINDOW_RANGE} in this prototype). Failure to respond triggers escalation review and possible supervisor escalation.</p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
