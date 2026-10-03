'use client';

// NCH 3.0 — Company Received Complaints (ported; live data)

import { Link } from 'react-router-dom';
import { Clock, CheckCircle2 } from 'lucide-react';
import { AppLayout, PageHeader, LoadingBlock, ErrorBlock } from '@/components/nch/AppLayout';
import { StatusBadge, PriorityBadge } from '@/components/nch/ui';
import { useFetch } from '@/lib/nch/client';
import type { Complaint } from '@/lib/nch/types';

export default function CompanyComplaints() {
  const { data, loading, error, refetch } = useFetch<{ complaints: Complaint[] }>('/api/complaints');
  if (loading) return <AppLayout><LoadingBlock /></AppLayout>;
  if (error) return <AppLayout><ErrorBlock message={error} onRetry={refetch} /></AppLayout>;

  const complaints = data?.complaints ?? [];
  const pending = complaints.filter(c => ['Forwarded', 'Awaiting Response', 'Escalated', 'Reopened'].includes(c.status));

  return (
    <AppLayout>
      <PageHeader
        title="Received Complaints"
        subtitle={`${complaints.length} complaint${complaints.length !== 1 ? 's' : ''} forwarded by NCH`}
      />

      {/* Pending first */}
      {pending.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
            <Clock size={13} className="text-amber-500" />
            Awaiting Response ({pending.length})
          </h2>
          <div className="space-y-2">
            {pending.map(c => (
              <Link
                key={c.id}
                to={`/company/complaints/${c.id}`}
                className="block bg-white border border-amber-200 rounded hover:border-amber-300 hover:bg-amber-50/30 transition-colors"
              >
                <div className="px-4 py-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 line-clamp-1">{c.subject}</p>
                      <p className="text-xs font-mono text-slate-400 mt-0.5">{c.docketNumber}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <PriorityBadge priority={c.priority} size="sm" />
                      <StatusBadge status={c.status} size="sm" />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400">
                    <span>{c.category}</span>
                    <span>·</span>
                    <span>Registered: {new Date(c.registeredAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    {c.amount != null && <><span>·</span><span>₹{c.amount.toLocaleString('en-IN')}</span></>}
                    {c.sla && (
                      <><span>·</span><span className={c.sla.breached ? 'text-red-600 font-medium' : 'text-amber-600 font-medium'}>
                        {c.sla.breached ? `Deadline passed (+${c.sla.overdueHours}h)` : `Due: ${new Date(c.sla.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                      </span></>
                    )}
                  </div>
                  <div className="mt-3">
                    <span className="text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded">Response required →</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* All complaints */}
      <div>
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
          <CheckCircle2 size={13} className="text-green-500" />
          All Complaints ({complaints.length})
        </h2>
        <div className="bg-white border border-slate-200 rounded divide-y divide-slate-100">
          {complaints.map(c => (
            <Link
              key={c.id}
              to={`/company/complaints/${c.id}`}
              className="block hover:bg-slate-50 transition-colors"
            >
              <div className="px-4 py-3.5">
                <div className="flex items-start justify-between gap-3 mb-1">
                  <p className="text-sm font-medium text-slate-800 line-clamp-1">{c.subject}</p>
                  <div className="flex items-center gap-2 shrink-0">
                    <PriorityBadge priority={c.priority} size="sm" />
                    <StatusBadge status={c.status} size="sm" />
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-400">
                  <span className="font-mono">{c.docketNumber}</span>
                  <span>·</span>
                  <span>{c.category}</span>
                  <span>·</span>
                  <span>{new Date(c.registeredAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  {c.companyResponse && <><span>·</span><span className="text-green-600">Responded</span></>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
