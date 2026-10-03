'use client';

// NCH 3.0 — Follow-ups (Officer) (ported; live data)

import { Link } from 'react-router-dom';
import { RefreshCw, Calendar } from 'lucide-react';
import { AppLayout, PageHeader, LoadingBlock, ErrorBlock } from '@/components/nch/AppLayout';
import { StatusBadge, PriorityBadge } from '@/components/nch/ui';
import { useFetch } from '@/lib/nch/client';
import type { Complaint } from '@/lib/nch/types';

export default function OfficerFollowups() {
  const { data, loading, error, refetch } = useFetch<{ complaints: Complaint[] }>('/api/complaints');
  if (loading) return <AppLayout><LoadingBlock /></AppLayout>;
  if (error) return <AppLayout><ErrorBlock message={error} onRetry={refetch} /></AppLayout>;

  const followups = (data?.complaints ?? []).filter(c =>
    ['Awaiting Response', 'Forwarded', 'Action Pending'].includes(c.status)
  );

  return (
    <AppLayout>
      <PageHeader
        title="Follow-up Required"
        subtitle={`${followups.length} case${followups.length !== 1 ? 's' : ''} pending follow-up action`}
      />

      <div className="space-y-3">
        {followups.map(c => {
          const isOverdue = c.sla?.breached;
          return (
            <Link
              key={c.id}
              to={`/officer/complaints/${c.id}`}
              className={`block bg-white border rounded hover:shadow-sm transition-all ${isOverdue ? 'border-amber-300' : 'border-slate-200 hover:border-slate-300'}`}
            >
              <div className="px-4 py-3.5">
                <div className="flex items-start justify-between gap-3 mb-1.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{c.subject}</p>
                    <p className="text-xs font-mono text-slate-400 mt-0.5">{c.docketNumber}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <PriorityBadge priority={c.priority} size="sm" />
                    <StatusBadge status={c.status} size="sm" />
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                  <span>{c.consumerName}</span>
                  <span>·</span>
                  <span>{c.companyName}</span>
                  {c.sla && (
                    <>
                      <span>·</span>
                      <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 font-medium' : ''}`}>
                        <Calendar size={11} />
                        {isOverdue ? `Overdue by ${c.sla.overdueHours}h — ` : 'Deadline: '}
                        {new Date(c.sla.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </Link>
          );
        })}

        {followups.length === 0 && (
          <div className="bg-white border border-slate-200 rounded py-16 text-center">
            <RefreshCw size={32} className="mx-auto text-slate-300 mb-3" />
            <p className="text-sm text-slate-500">No follow-ups pending at this time.</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
