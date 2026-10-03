'use client';

// NCH 3.0 — Supervisor Complaints View (ported; live data)

import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { AppLayout, PageHeader, LoadingBlock, ErrorBlock } from '@/components/nch/AppLayout';
import { StatusBadge, PriorityBadge, Table, Thead, Tbody, Tr, Th, Td, Input, Select, Button } from '@/components/nch/ui';
import { useFetch } from '@/lib/nch/client';
import type { Complaint } from '@/lib/nch/types';

const STATUSES = ['Registered','Under Review','Forwarded','Awaiting Response','Response Received','Action Pending','Confirmation Pending','Escalation Review','Escalated','Reopened','Resolved','Closed'];

export default function SupervisorComplaints() {
  const { data, loading, error, refetch } = useFetch<{ complaints: Complaint[] }>('/api/complaints');
  const complaints = data?.complaints ?? [];

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return complaints.filter(c => {
      const matchQ = !query || c.docketNumber.toLowerCase().includes(q) || c.subject.toLowerCase().includes(q) || c.consumerName.toLowerCase().includes(q);
      const matchS = !statusFilter || c.status === statusFilter;
      const matchP = !priorityFilter || c.priority === priorityFilter;
      return matchQ && matchS && matchP;
    });
  }, [complaints, query, statusFilter, priorityFilter]);

  const hasFilters = query || statusFilter || priorityFilter;

  return (
    <AppLayout>
      <PageHeader title="All Complaints" subtitle={`${filtered.length} complaint${filtered.length !== 1 ? 's' : ''} ${hasFilters ? '(filtered)' : 'in system'}`} />

      <div className="bg-white border border-slate-200 rounded p-3 mb-4 flex flex-wrap gap-3">
        <div className="flex-1 min-w-48">
          <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search docket, consumer, subject…" icon={<Search size={14} />} />
        </div>
        <div className="min-w-40">
          <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} placeholder="All Statuses">
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
        </div>
        <div className="min-w-32">
          <Select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} placeholder="All Priorities">
            {['Critical','High','Medium','Low'].map(p => <option key={p} value={p}>{p}</option>)}
          </Select>
        </div>
        {hasFilters && <Button size="sm" variant="ghost" onClick={() => { setQuery(''); setStatusFilter(''); setPriorityFilter(''); }} icon={<X size={13} />}>Clear</Button>}
      </div>

      <div className="bg-white border border-slate-200 rounded overflow-hidden">
        {loading ? (
          <LoadingBlock />
        ) : error ? (
          <ErrorBlock message={error} onRetry={refetch} />
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th>Docket</Th>
                <Th>Consumer</Th>
                <Th className="hidden md:table-cell">Company</Th>
                <Th className="hidden lg:table-cell">Officer</Th>
                <Th>Status</Th>
                <Th>Priority</Th>
                <Th className="hidden md:table-cell">Date</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filtered.map(c => (
                <Tr key={c.id}>
                  <Td>
                    <Link to={`/officer/complaints/${c.id}`} className="font-mono text-xs text-nch-blue-600 hover:underline whitespace-nowrap">
                      {c.docketNumber}
                    </Link>
                  </Td>
                  <Td>
                    <p className="font-medium text-slate-800 text-xs">{c.consumerName}</p>
                  </Td>
                  <Td className="hidden md:table-cell">
                    <p className="text-xs text-slate-600">{c.companyName}</p>
                  </Td>
                  <Td className="hidden lg:table-cell">
                    <p className="text-xs text-slate-500">{c.assignedOfficerName ?? <span className="text-slate-300 italic">Unassigned</span>}</p>
                  </Td>
                  <Td><StatusBadge status={c.status} size="sm" /></Td>
                  <Td><PriorityBadge priority={c.priority} size="sm" /></Td>
                  <Td className="hidden md:table-cell">
                    <span className="text-xs text-slate-400 whitespace-nowrap">
                      {new Date(c.registeredAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </span>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </div>
    </AppLayout>
  );
}
