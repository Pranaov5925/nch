'use client';

// NCH 3.0 — Company Response History (ported; live data)

import { Link } from 'react-router-dom';
import { CheckCircle2, Clock } from 'lucide-react';
import { AppLayout, PageHeader, LoadingBlock, ErrorBlock } from '@/components/nch/AppLayout';
import { StatusBadge } from '@/components/nch/ui';
import { useFetch } from '@/lib/nch/client';
import type { Complaint } from '@/lib/nch/types';

export default function CompanyResponses() {
  const { data, loading, error, refetch } = useFetch<{ complaints: Complaint[] }>('/api/complaints');
  if (loading) return <AppLayout><LoadingBlock /></AppLayout>;
  if (error) return <AppLayout><ErrorBlock message={error} onRetry={refetch} /></AppLayout>;

  const complaints = data?.complaints ?? [];
  const responded = complaints.filter(c => c.companyResponse);
  const notResponded = complaints.filter(c => !c.companyResponse);

  return (
    <AppLayout>
      <PageHeader title="Response History" subtitle={`${responded.length} response${responded.length !== 1 ? 's' : ''} submitted`} />

      <div className="space-y-6">
        {/* Pending */}
        {notResponded.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
              <Clock size={13} className="text-amber-500" /> Pending Response ({notResponded.length})
            </h2>
            <div className="space-y-2">
              {notResponded.map(c => (
                <Link key={c.id} to={`/company/complaints/${c.id}`} className="flex items-center gap-3 bg-white border border-amber-200 rounded px-4 py-3 hover:bg-amber-50 transition-colors">
                  <Clock size={14} className="text-amber-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{c.subject}</p>
                    <p className="text-xs font-mono text-slate-400">{c.docketNumber}</p>
                  </div>
                  <StatusBadge status={c.status} size="sm" />
                  <span className="text-xs text-amber-600 font-medium whitespace-nowrap">Respond →</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Responded */}
        <div>
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
            <CheckCircle2 size={13} className="text-green-500" /> Submitted Responses ({responded.length})
          </h2>
          <div className="space-y-3">
            {responded.map(c => (
              <div key={c.id} className="bg-white border border-slate-200 rounded p-4">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <p className="text-xs font-mono text-slate-400 mb-0.5">{c.docketNumber}</p>
                    <p className="text-sm font-medium text-slate-800 line-clamp-1">{c.subject}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={c.companyResponse!.status} size="sm" />
                    {c.consumerFeedback?.confirmed && (
                      <span className="flex items-center gap-1 text-xs text-green-700 font-medium">
                        <CheckCircle2 size={12} />Consumer confirmed
                      </span>
                    )}
                    {c.consumerFeedback?.disputed && (
                      <span className="text-xs text-red-600 font-medium">Consumer disputed</span>
                    )}
                  </div>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded p-3 text-xs text-slate-600 space-y-1.5">
                  <p><span className="text-slate-400">Response: </span>{c.companyResponse!.responseText.slice(0, 150)}{c.companyResponse!.responseText.length > 150 ? '…' : ''}</p>
                  <p><span className="text-slate-400">Action: </span>{c.companyResponse!.actionTaken}</p>
                  <p className="text-slate-400">Submitted: {new Date(c.companyResponse!.respondedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
                {c.consumerFeedback?.disputed && (
                  <div className="mt-2 bg-red-50 border border-red-200 rounded px-3 py-2 text-xs text-red-700">
                    <p className="font-medium mb-0.5">Consumer Dispute Reason:</p>
                    <p>{c.consumerFeedback.disputeReason}</p>
                  </div>
                )}
              </div>
            ))}
            {responded.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-8">No responses submitted yet.</p>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
