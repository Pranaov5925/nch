'use client';

// NCH 3.0 — Company/Sector Performance (Supervisor) (ported; live data)

import { AppLayout, PageHeader, LoadingBlock, ErrorBlock } from '@/components/nch/AppLayout';
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/nch/ui';
import { useFetch } from '@/lib/nch/client';
import { TrendingUp, TrendingDown } from 'lucide-react';
import type { Company } from '@/lib/nch/types';

export default function SupervisorCompanies() {
  const { data, loading, error, refetch } = useFetch<{ companies: Company[] }>('/api/companies');
  if (loading) return <AppLayout><LoadingBlock /></AppLayout>;
  if (error) return <AppLayout><ErrorBlock message={error} onRetry={refetch} /></AppLayout>;

  const sorted = [...(data?.companies ?? [])].sort((a, b) => b.totalComplaints - a.totalComplaints);

  return (
    <AppLayout>
      <PageHeader
        title="Company / Organisation Performance"
        subtitle="Response rates and resolution performance by registered organisation (prototype dataset)"
      />

      <div className="bg-white border border-slate-200 rounded overflow-hidden">
        <Table>
          <Thead>
            <Tr>
              <Th>Organisation</Th>
              <Th>Sector</Th>
              <Th>Total Complaints</Th>
              <Th>Resolved</Th>
              <Th>Pending</Th>
              <Th>Resolution Rate</Th>
              <Th>Avg. Response (Days)</Th>
              <Th>Nodal Officer</Th>
            </Tr>
          </Thead>
          <Tbody>
            {sorted.map(company => {
              const rateColor = company.resolutionRate >= 85
                ? 'text-green-700'
                : company.resolutionRate < 70
                  ? 'text-red-600'
                  : 'text-amber-700';

              const responseDayColor = company.avgResponseDays <= 10
                ? 'text-green-700'
                : company.avgResponseDays > 15
                  ? 'text-red-600'
                  : 'text-amber-700';

              return (
                <Tr key={company.id}>
                  <Td>
                    <div>
                      <p className="font-medium text-slate-800">{company.name}</p>
                      <p className="text-xs text-slate-400">{company.contactEmail}</p>
                    </div>
                  </Td>
                  <Td>
                    <span className="text-xs text-slate-500">{company.sector}</span>
                  </Td>
                  <Td>
                    <span className="font-semibold text-slate-800">{company.totalComplaints.toLocaleString()}</span>
                  </Td>
                  <Td>
                    <span className="text-green-700 font-medium">{company.resolvedComplaints.toLocaleString()}</span>
                  </Td>
                  <Td>
                    <span className={company.pendingComplaints > 2 ? 'text-red-600 font-medium' : 'text-amber-700'}>
                      {company.pendingComplaints}
                    </span>
                  </Td>
                  <Td>
                    <div className="flex items-center gap-1.5">
                      {company.resolutionRate >= 85 && <TrendingUp size={13} className="text-green-600" />}
                      {company.resolutionRate < 70 && <TrendingDown size={13} className="text-red-500" />}
                      <span className={`font-semibold ${rateColor}`}>{company.resolutionRate}%</span>
                    </div>
                  </Td>
                  <Td>
                    <span className={`font-medium ${responseDayColor}`}>{company.avgResponseDays || '—'} {company.avgResponseDays ? 'days' : ''}</span>
                  </Td>
                  <Td>
                    <span className="text-xs text-slate-600">{company.nodalofficer}</span>
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-400">
        <span className="flex items-center gap-1.5"><TrendingUp size={12} className="text-green-600" />Resolution rate ≥ 85%</span>
        <span className="flex items-center gap-1.5"><TrendingDown size={12} className="text-red-500" />Resolution rate &lt; 70%</span>
        <span>Avg. response ≤ 10 days = good · &gt; 15 days = concern</span>
      </div>
    </AppLayout>
  );
}
