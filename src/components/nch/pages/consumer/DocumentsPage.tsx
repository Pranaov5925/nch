'use client';

// NCH 3.0 — Documents Page (ported; upload out of scope per blueprint — read-only)

import { FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AppLayout, PageHeader, SectionCard, LoadingBlock, ErrorBlock } from '@/components/nch/AppLayout';
import { useFetch } from '@/lib/nch/client';
import type { Complaint } from '@/lib/nch/types';

export default function DocumentsPage() {
  const { data, loading, error, refetch } = useFetch<{ complaints: Complaint[] }>('/api/complaints');
  const complaints = data?.complaints ?? [];
  const allDocs = complaints.flatMap(c => c.documents.map(d => ({ ...d, docket: c.docketNumber, complaintId: c.id })));

  return (
    <AppLayout>
      <PageHeader title="Documents" subtitle="Documents referenced across your complaints" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SectionCard title="Uploaded Documents">
          {loading ? (
            <LoadingBlock />
          ) : error ? (
            <ErrorBlock message={error} onRetry={refetch} />
          ) : allDocs.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <FileText size={28} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No documents attached yet.</p>
            </div>
          ) : (
            <ul className="space-y-2 max-h-96 overflow-y-auto">
              {allDocs.map(doc => (
                <li key={doc.id} className="flex items-center gap-2 px-3 py-3 border border-slate-200 rounded hover:bg-slate-50 transition-colors">
                  <FileText size={14} className="text-slate-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-800 truncate">{doc.name}</p>
                    <p className="text-xs text-slate-400 font-mono">{doc.docket}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-slate-400">{doc.size}</span>
                    <Link to={`/consumer/complaints/${doc.complaintId}`} className="text-xs text-nch-blue-600 hover:text-nch-blue-800 font-medium">
                      View case →
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="About Documents">
          <div className="space-y-3 text-xs text-slate-500 leading-relaxed">
            <p>
              Documents listed here were registered as part of the seed data for this prototype. They
              represent receipts, invoices, screenshots and correspondence that a consumer would attach
              to a real complaint.
            </p>
            <p>
              <strong className="text-slate-700">Why can't I upload files?</strong> File upload was
              intentionally excluded from the prototype scope (see the project blueprint) to keep the
              system focused on the complaint lifecycle, SLA-driven escalation review and the LLM
              assist layer.
            </p>
            <p>
              To view the documents related to a specific case, open the case and switch to the
              <strong> Documents</strong> tab.
            </p>
          </div>
        </SectionCard>
      </div>
    </AppLayout>
  );
}
