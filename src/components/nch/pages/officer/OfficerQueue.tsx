'use client';

// NCH 3.0 — Officer Complaint Queue (ported; live data)

import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, X } from 'lucide-react';
import { AppLayout, PageHeader, LoadingBlock, ErrorBlock } from '@/components/nch/AppLayout';
import { StatusBadge, PriorityBadge, Table, Thead, Tbody, Tr, Th, Td, EmptyState, Input, Select, Button } from '@/components/nch/ui';
import { useFetch } from '@/lib/nch/client';
import type { Complaint, ComplaintStatus, Priority } from '@/lib/nch/types';

const ALL_STATUSES: ComplaintStatus[] = [
  'Registered', 'Under Review', 'Forwarded', 'Awaiting Response',
  'Response Received', 'Action Pending', 'Resolution Claimed',
  'Confirmation Pending', 'Escalation Review', 'Escalated',
  'Resolved', 'Closed', 'Reopened'
];

const PRIORITIES: Priority[] = ['Critical', 'High', 'Medium', 'Low'];

export default function OfficerQueue() {
  const { data, loading, error, refetch } = useFetch<{ complaints: Complaint[] }>('/api/complaints');
  const complaints = data?.complaints ?? [];
  const SECTORS = useMemo(() => Array.from(new Set(complaints.map(c => c.sector))), [complaints]);

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [sectorFilter, setSectorFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;

  const filtered = useMemo(() => {
    return complaints.filter(c => {
      const q = query.toLowerCase();
      const matchQuery = !query ||
        c.docketNumber.toLowerCase().includes(q) ||
        c.subject.toLowerCase().includes(q) ||
        c.consumerName.toLowerCase().includes(q) ||
        c.companyName.toLowerCase().includes(q);
      const matchStatus = !statusFilter || c.status === statusFilter;
      const matchPriority = !priorityFilter || c.priority === priorityFilter;
      const matchSector = !sectorFilter || c.sector === sectorFilter;
      return matchQuery && matchStatus && matchPriority && matchSector;
    });
  }, [complaints, query, statusFilter, priorityFilter, sectorFilter]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const hasFilters = query || statusFilter || priorityFilter || sectorFilter;
  const clearFilters = () => { setQuery(''); setStatusFilter(''); setPriorityFilter(''); setSectorFilter(''); setPage(1); };

  return (
    <AppLayout>
      <PageHeader
        title="Complaint Queue"
        subtitle={`${filtered.length} complaint${filtered.length !== 1 ? 's' : ''} ${hasFilters ? '(filtered)' : 'total'}`}
      />

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded p-3 mb-4">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-48">
            <Input
              value={query}
              onChange={e => { setQuery(e.target.value); setPage(1); }}
              placeholder="Search docket, consumer, subject, company…"
              icon={<Search size={14} />}
              aria-label="Search complaints"
            />
          </div>
          <div className="min-w-40">
            <Select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} placeholder="All Statuses">
              {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
          </div>
          <div className="min-w-32">
            <Select value={priorityFilter} onChange={e => { setPriorityFilter(e.target.value); setPage(1); }} placeholder="All Priorities">
              {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
            </Select>
          </div>
          <div className="min-w-36">
            <Select value={sectorFilter} onChange={e => { setSectorFilter(e.target.value); setPage(1); }} placeholder="All Sectors">
              {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
          </div>
          {hasFilters && (
            <Button size="sm" variant="ghost" onClick={clearFilters} icon={<X size={13} />}>Clear</Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded overflow-hidden">
        {loading ? (
          <LoadingBlock />
        ) : error ? (
          <ErrorBlock message={error} onRetry={refetch} />
        ) : paginated.length === 0 ? (
          <EmptyState
            icon={<Filter size={32} />}
            title="No complaints match your filters"
            action={<Button size="sm" variant="outline" onClick={clearFilters}>Clear Filters</Button>}
          />
        ) : (
          <>
            <Table>
              <Thead>
                <Tr>
                  <Th>Docket No.</Th>
                  <Th>Consumer</Th>
                  <Th className="hidden md:table-cell">Company</Th>
                  <Th className="hidden lg:table-cell">Sector</Th>
                  <Th>Status</Th>
                  <Th>Priority</Th>
                  <Th className="hidden md:table-cell">Date</Th>
                </Tr>
              </Thead>
              <Tbody>
                {paginated.map(c => (
                  <Tr key={c.id}>
                    <Td>
                      <Link to={`/officer/complaints/${c.id}`} className="font-mono text-xs text-nch-blue-600 hover:text-nch-blue-800 hover:underline whitespace-nowrap">
                        {c.docketNumber}
                      </Link>
                    </Td>
                    <Td>
                      <div>
                        <p className="font-medium text-slate-800">{c.consumerName}</p>
                        <p className="text-xs text-slate-400">{c.consumerPhone}</p>
                      </div>
                    </Td>
                    <Td className="hidden md:table-cell">
                      <p className="text-slate-700 text-xs">{c.companyName}</p>
                    </Td>
                    <Td className="hidden lg:table-cell">
                      <span className="text-xs text-slate-500">{c.sector}</span>
                    </Td>
                    <Td>
                      <StatusBadge status={c.status} size="sm" />
                    </Td>
                    <Td>
                      <PriorityBadge priority={c.priority} size="sm" />
                    </Td>
                    <Td className="hidden md:table-cell">
                      <span className="text-xs text-slate-400 whitespace-nowrap">
                        {new Date(c.registeredAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </span>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
                <p className="text-xs text-slate-500">
                  Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}
                </p>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="outline" onClick={() => setPage(p => p - 1)} disabled={page === 1}>← Prev</Button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`h-7 w-7 rounded text-xs font-medium ${p === page ? 'bg-nch-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                    >
                      {p}
                    </button>
                  ))}
                  <Button size="sm" variant="outline" onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>Next →</Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
