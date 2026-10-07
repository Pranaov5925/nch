'use client';

// NCH 3.0 — Documents Page
// Unified document center allowing consumers to search, preview, and download all case evidence.

import { useState, useMemo } from 'react';
import { FileText, Search, Download, Eye, ExternalLink, ShieldCheck, FileCheck2, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AppLayout, PageHeader, SectionCard, LoadingBlock, ErrorBlock } from '@/components/nch/AppLayout';
import { DocumentPreviewModal } from '@/components/nch/DocumentPreviewModal';
import { useFetch } from '@/lib/nch/client';
import type { Complaint, Document } from '@/lib/nch/types';

interface DocumentWithDocket extends Document {
  docket: string;
  complaintId: string;
  subject: string;
  companyName: string;
}

export default function DocumentsPage() {
  const { data, loading, error, refetch } = useFetch<{ complaints: Complaint[] }>('/api/complaints');
  const complaints = data?.complaints ?? [];
  const [search, setSearch] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<DocumentWithDocket | null>(null);

  const allDocs = useMemo<DocumentWithDocket[]>(() => {
    return complaints.flatMap(c =>
      c.documents.map(d => ({
        ...d,
        docket: c.docketNumber,
        complaintId: c.id,
        subject: c.subject,
        companyName: c.companyName,
      }))
    );
  }, [complaints]);

  const filteredDocs = useMemo(() => {
    if (!search.trim()) return allDocs;
    const q = search.toLowerCase();
    return allDocs.filter(d =>
      d.name.toLowerCase().includes(q) ||
      d.docket.toLowerCase().includes(q) ||
      d.companyName.toLowerCase().includes(q) ||
      d.type.toLowerCase().includes(q)
    );
  }, [allDocs, search]);

  const pdfCount = allDocs.filter(d => d.type.toUpperCase() === 'PDF').length;
  const imgCount = allDocs.filter(d => ['PNG', 'JPG', 'JPEG', 'WEBP', 'IMAGE'].includes(d.type.toUpperCase())).length;

  return (
    <AppLayout>
      <PageHeader
        title="Documents Hub"
        subtitle="Access, inspect, and download all supporting evidence attached to your grievances"
      />

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <p className="text-2xs font-semibold uppercase text-slate-400 tracking-wider">Total Attachments</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{allDocs.length}</p>
          <p className="text-2xs text-slate-500 mt-0.5">Across {complaints.length} registered grievances</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <p className="text-2xs font-semibold uppercase text-slate-400 tracking-wider">PDF Invoices & Letters</p>
          <p className="text-2xl font-bold text-nch-blue-700 mt-1">{pdfCount}</p>
          <p className="text-2xs text-slate-500 mt-0.5">Official invoices & policies</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <p className="text-2xs font-semibold uppercase text-slate-400 tracking-wider">Screenshots & Photos</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{imgCount}</p>
          <p className="text-2xs text-slate-500 mt-0.5">Visual damage & transaction proof</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left 2 Cols: Search & Documents List */}
        <div className="lg:col-span-2 space-y-4">
          <SectionCard
            title="Case Documents Repository"
            actions={
              <div className="relative w-full sm:w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search by file, docket, company…"
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-nch-blue-500"
                />
              </div>
            }
          >
            {loading ? (
              <LoadingBlock />
            ) : error ? (
              <ErrorBlock message={error} onRetry={refetch} />
            ) : filteredDocs.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <FileText size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm font-medium text-slate-600">No documents found</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {search ? 'Try clearing your search filter.' : 'Attach receipts or invoices directly inside any case detail.'}
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
                {filteredDocs.map(doc => {
                  const isImg = ['PNG', 'JPG', 'JPEG', 'WEBP', 'IMAGE'].includes(doc.type.toUpperCase());
                  return (
                    <div
                      key={doc.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 border border-slate-200 rounded-xl bg-white hover:border-slate-300 hover:shadow-2xs transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`p-2.5 rounded-lg shrink-0 ${isImg ? 'bg-sky-50 text-sky-600' : 'bg-rose-50 text-rose-600'}`}>
                          <FileText size={18} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-900 truncate">{doc.name}</p>
                          <div className="flex flex-wrap items-center gap-1.5 text-2xs text-slate-500 mt-0.5">
                            <span className="font-mono text-nch-blue-700 bg-nch-blue-50 px-1.5 py-0.5 rounded border border-nch-blue-200">
                              {doc.docket}
                            </span>
                            <span>·</span>
                            <span>{doc.companyName}</span>
                            <span>·</span>
                            <span>{doc.size}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => setSelectedDoc(doc)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 hover:text-nch-blue-700 transition-colors cursor-pointer"
                        >
                          <Eye size={13} />
                          <span>Preview</span>
                        </button>
                        <a
                          href={`/api/documents/${doc.id}?download=1`}
                          download={doc.name}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-nch-blue-700 transition-colors shadow-2xs"
                        >
                          <Download size={13} />
                          <span>Download</span>
                        </a>
                        <Link
                          to={`/consumer/complaints/${doc.complaintId}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-nch-blue-700 bg-nch-blue-50 border border-nch-blue-200 rounded-lg hover:bg-nch-blue-100 transition-colors"
                          title="Open Complaint File"
                        >
                          <ExternalLink size={12} />
                          <span>Case</span>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>
        </div>

        {/* Right Col: Evidence Guidelines */}
        <div className="space-y-4">
          <SectionCard title="Evidence Guidelines">
            <div className="space-y-3.5 text-xs text-slate-600 leading-relaxed">
              <div className="flex items-start gap-2.5">
                <FileCheck2 size={16} className="text-nch-blue-600 shrink-0 mt-0.5" />
                <p>
                  <strong>Acceptable File Types:</strong> Invoices, purchase receipts, warranty cards, courier delivery slips, and customer support chat screenshots.
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <ShieldCheck size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                <p>
                  <strong>Security & Legality:</strong> All evidence uploaded is securely referenced with your case docket and made accessible to assigned NCH officers and nodal company authorities for grievance disposal.
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <p>
                  <strong>How to Attach More Evidence:</strong> Open any grievance under <em>My Complaints</em> and navigate to the <strong>Documents</strong> tab to attach additional evidence at any time.
                </p>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>

      {/* Document Preview Modal */}
      <DocumentPreviewModal
        document={selectedDoc}
        docketNumber={selectedDoc?.docket}
        open={Boolean(selectedDoc)}
        onClose={() => setSelectedDoc(null)}
      />
    </AppLayout>
  );
}
