'use client';

// NCH 3.0 — Escalation Queue (Officer) (ported; live data)

import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { AppLayout, PageHeader, LoadingBlock, ErrorBlock } from '@/components/nch/AppLayout';
import { StatusBadge, PriorityBadge } from '@/components/nch/ui';
import { useFetch } from '@/lib/nch/client';
import type { Complaint } from '@/lib/nch/types';

export default function OfficerEscalations() {
  const { data, loading, error, refetch } = useFetch<{ complaints: Complaint[] }>('/api/complaints');
  if (loading) return <AppLayout><LoadingBlock /></AppLayout>;
  if (error) return <AppLayout><ErrorBlock message={error} onRetry={refetch} /></AppLayout>;

  const escalated = (data?.complaints ?? []).filter(c =>
    c.escalation?.isEscalated || ['Escalated', 'Escalation Review', 'Reopened'].includes(c.status)
  );

  return (
    <AppLayout>
      <PageHeader
        title="Escalation Queue"
        subtitle={`${escalated.length} case${escalated.length !== 1 ? 's' : ''} in escalation`}
      />

      <div className="space-y-3">
        {escalated.map(c => (
          <Link
            key={c.id}
            to={`/officer/complaints/${c.id}`}
            className="block bg-white border border-red-200 rounded hover:border-red-300 hover:bg-red-50/30 transition-colors"
          >
            <div className="px-4 py-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle size={13} className="text-red-500 shrink-0" />
                    <p className="text-sm font-semibold text-slate-900 truncate">{c.subject}</p>
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
                {c.amount != null && <><span>·</span><span>₹{c.amount.toLocaleString('en-IN')}</span></>}
              </div>

              {c.escalation?.reasons && c.escalation.reasons.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded px-3 py-2">
                  <p className="text-xs font-semibold text-red-700 mb-1">Escalation Reasons</p>
                  <ul className="text-xs text-red-600 space-y-0.5">
                    {c.escalation.reasons.slice(0, 3).map((r, idx) => (
                      <li key={idx} className="flex items-start gap-1">
                        <span className="shrink-0">•</span> {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Link>
        ))}

        {escalated.length === 0 && (
          <div className="bg-white border border-slate-200 rounded py-16 text-center">
            <AlertTriangle size={32} className="mx-auto text-slate-300 mb-3" />
            <p className="text-sm text-slate-500">No escalated cases.</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
