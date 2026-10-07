'use client';

// NCH 3.0 — My Complaints (Consumer) (ported; live data)

import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, FilePlus, Filter, X } from 'lucide-react';
import { AppLayout, PageHeader, LoadingBlock, ErrorBlock } from '@/components/nch/AppLayout';
import { StatusBadge, PriorityBadge, Button, Input, Select, EmptyState } from '@/components/nch/ui';
import { TrackStatusModal } from '@/components/nch/TrackStatusModal';
import { useFetch } from '@/lib/nch/client';
import type { Complaint, ComplaintStatus } from '@/lib/nch/types';

const ALL_STATUSES: ComplaintStatus[] = [
  'Registered', 'Under Review', 'Forwarded', 'Awaiting Response',
  'Response Received', 'Action Pending', 'Resolution Claimed',
  'Confirmation Pending', 'Escalation Review', 'Escalated',
  'Resolved', 'Closed', 'Reopened'
];

export default function MyComplaints() {
  const { data, loading, error, refetch } = useFetch<{ complaints: Complaint[] }>('/api/complaints');
  const complaints = data?.complaints ?? [];

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [sectorFilter, setSectorFilter] = useState<string>('');
  const [selectedComplaintForTrack, setSelectedComplaintForTrack] = useState<Complaint | null>(null);

  const sectors = useMemo(() => Array.from(new Set(complaints.map(c => c.sector))), [complaints]);

  const filtered = useMemo(() => {
    return complaints.filter(c => {
      const matchQuery = !query ||
        c.docketNumber.toLowerCase().includes(query.toLowerCase()) ||
        c.subject.toLowerCase().includes(query.toLowerCase()) ||
        c.companyName.toLowerCase().includes(query.toLowerCase());
      const matchStatus = !statusFilter || c.status === statusFilter;
      const matchSector = !sectorFilter || c.sector === sectorFilter;
      return matchQuery && matchStatus && matchSector;
    });
  }, [complaints, query, statusFilter, sectorFilter]);

  const clearFilters = () => { setQuery(''); setStatusFilter(''); setSectorFilter(''); };
  const hasFilters = query || statusFilter || sectorFilter;

  return (
    <AppLayout>
      <PageHeader
        title="My Complaints"
        subtitle={`${complaints.length} complaint${complaints.length !== 1 ? 's' : ''} registered`}
        actions={
          <Link to="/consumer/register">
            <Button size="sm" icon={<FilePlus size={14} />}>Register New</Button>
          </Link>
        }
      />

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs mb-6 p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex-1 min-w-48">
            <Input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by docket, subject, or company…"
              icon={<Search size={14} />}
              aria-label="Search complaints"
            />
          </div>
          <div className="min-w-40">
            <Select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              placeholder="All Statuses"
              aria-label="Filter by status"
            >
              {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
          </div>
          <div className="min-w-36">
            <Select
              value={sectorFilter}
              onChange={e => setSectorFilter(e.target.value)}
              placeholder="All Sectors"
              aria-label="Filter by sector"
            >
              {sectors.map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
          </div>
          {hasFilters && (
            <Button size="sm" variant="ghost" onClick={clearFilters} icon={<X size={13} />}>
              Clear
            </Button>
          )}
        </div>
        {hasFilters && (
          <p className="text-xs text-slate-400 mt-2">
            Showing {filtered.length} of {complaints.length} complaints
          </p>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="bg-white border border-slate-200/90 rounded-xl shadow-xs"><LoadingBlock /></div>
      ) : error ? (
        <div className="bg-white border border-slate-200/90 rounded-xl shadow-xs"><ErrorBlock message={error} onRetry={refetch} /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-200/90 rounded-xl shadow-xs">
          <EmptyState
            icon={<Filter size={32} />}
            title="No complaints match your filters"
            description="Try adjusting your search or filter criteria."
            action={<Button size="sm" variant="outline" onClick={clearFilters}>Clear Filters</Button>}
          />
        </div>
      ) : (
        <div className="bg-white border border-slate-200/90 rounded-xl shadow-xs divide-y divide-slate-100 overflow-hidden">
          {filtered.map(c => (
            <Link
              key={c.id}
              to={`/consumer/complaints/${c.id}`}
              className="block hover:bg-slate-50/80 transition-colors"
            >
              <div className="px-5 py-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900 leading-snug line-clamp-2">{c.subject}</p>
                    <p className="text-xs font-mono text-slate-400 mt-1">{c.docketNumber}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedComplaintForTrack(c);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-nch-blue-700 bg-nch-blue-50 border border-nch-blue-200 hover:bg-nch-blue-100 hover:border-nch-blue-300 transition-colors shadow-2xs cursor-pointer"
                    >
                      <Search size={13} />
                      <span>Track Status</span>
                    </button>
                    <PriorityBadge priority={c.priority} size="sm" />
                    <StatusBadge status={c.status} size="sm" />
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                  <span>{c.sector}</span>
                  <span>·</span>
                  <span>{c.companyName}</span>
                  <span>·</span>
                  <span>Registered: {new Date(c.registeredAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  {c.amount != null && (
                    <>
                      <span>·</span>
                      <span>₹{c.amount.toLocaleString('en-IN')}</span>
                    </>
                  )}
                </div>

                {/* Pending actions */}
                <div className="flex flex-wrap gap-2 mt-2.5">
                  {['Response Received', 'Confirmation Pending'].includes(c.status) && (
                    <div className="inline-flex items-center gap-1 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-md">
                      Action required: Review company response
                    </div>
                  )}
                  {c.status === 'Reopened' && (
                    <div className="inline-flex items-center gap-1 text-xs font-medium text-purple-800 bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded-md">
                      Dispute under review by NCH
                    </div>
                  )}
                  {c.sla?.breached && !['Resolved', 'Closed'].includes(c.status) && (
                    <div className="inline-flex items-center gap-1 text-xs font-medium text-red-800 bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-md">
                      SLA deadline exceeded by {c.sla.overdueHours}h — flagged for escalation review
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Tracking Modal */}
      <TrackStatusModal
        complaint={selectedComplaintForTrack}
        open={Boolean(selectedComplaintForTrack)}
        onClose={() => setSelectedComplaintForTrack(null)}
      />
    </AppLayout>
  );
}
