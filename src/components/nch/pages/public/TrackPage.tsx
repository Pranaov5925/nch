'use client';

// NCH 3.0 — Public Complaint Tracker (ported; live API)

import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, ShieldCheck, AlertCircle } from 'lucide-react';
import { Button, Input, StatusBadge, CaseTimeline } from '@/components/nch/ui';
import { api } from '@/lib/nch/client';
import type { Complaint } from '@/lib/nch/types';

interface TrackResponse {
  complaint: Pick<Complaint,
    'docketNumber' | 'subject' | 'sector' | 'category' | 'companyName' | 'status' | 'priority'
    | 'registeredAt' | 'lastUpdatedAt' | 'expectedResolutionDate' | 'timeline'
  > & { consumerFirstName: string; companyExpectedResolutionDate?: string | null };
}

export default function PublicTrackPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  // Only the docket number is reflected in the URL (convenient for sharing/
  // bookmarks). The registered contact detail stays in component state only —
  // it must never end up in browser history or the address bar.
  const [docket, setDocket] = useState(searchParams.get('docket') ?? '');
  const [contact, setContact] = useState('');
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [complaint, setComplaint] = useState<TrackResponse['complaint'] | null>(null);
  const [error, setError] = useState('');

  const doSearch = async (docketVal?: string, contactVal?: string) => {
    const d = (docketVal ?? docket).trim().toUpperCase();
    const c = (contactVal ?? contact).trim();
    if (!d) { setError('Please enter your docket number.'); return; }
    if (!c) { setError('Please enter the email or mobile number registered on the complaint.'); return; }
    setSearching(true);
    try {
      const res = await api<TrackResponse>(`/api/track?docket=${encodeURIComponent(d)}&contact=${encodeURIComponent(c)}`);
      setSearched(true);
      setComplaint(res.complaint);
      setError('');
      setSearchParams({ docket: d });
    } catch {
      setSearched(true);
      setComplaint(null);
      setError('No complaint found for this docket number and contact detail. Please verify both and try again.');
    } finally {
      setSearching(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void doSearch();
  };

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="nch-root min-h-screen bg-slate-50 flex flex-col">
      <div className="bg-slate-900 text-slate-400 text-xs py-1.5 px-4 flex items-center gap-2">
        <ShieldCheck size={11} /> Government of India — Department of Consumer Affairs
      </div>
      <header className="bg-nch-blue-700 text-white px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
              <ShieldCheck size={16} />
            </div>
            <div>
              <p className="text-xs font-bold">National Consumer Helpline</p>
              <p className="text-xs text-nch-blue-300">Track Complaint — Public</p>
            </div>
          </Link>
          <Link to="/login/consumer" className="text-xs text-nch-blue-200 hover:text-white">Consumer Login →</Link>
        </div>
      </header>

      <main className="flex-1 py-8 px-4">
        <div className="max-w-3xl mx-auto">

          {/* Search */}
          <div className="bg-white border border-slate-200 rounded p-5 mb-6">
            <h1 className="text-base font-semibold text-slate-800 mb-1">Track Your Complaint</h1>
            <p className="text-xs text-slate-500 mb-4">Enter your docket number together with the email or mobile number registered on the complaint. Login is not required.</p>
            <form onSubmit={handleSubmit} className="space-y-2">
              <div>
                <label htmlFor="track-docket" className="text-xs font-medium text-slate-600 mb-1 block">Docket number</label>
                <Input
                  id="track-docket"
                  value={docket}
                  onChange={e => { setDocket(e.target.value.toUpperCase()); setError(''); }}
                  placeholder="NCH/2026/UP/478208"
                  className="font-mono"
                  aria-label="Docket number"
                />
              </div>
              <div>
                <label htmlFor="track-contact" className="text-xs font-medium text-slate-600 mb-1 block">Registered email or mobile number</label>
                <Input
                  id="track-contact"
                  value={contact}
                  onChange={e => { setContact(e.target.value); setError(''); }}
                  placeholder="you@example.com or 9876543210"
                  aria-label="Registered email or mobile number"
                />
              </div>
              <Button type="submit" variant="primary" icon={<Search size={15} />} loading={searching} className="w-full sm:w-auto">
                Track
              </Button>
            </form>
            {error && (
              <div className="mt-3 flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
                <AlertCircle size={13} className="shrink-0 mt-0.5" />
                {error}
              </div>
            )}
            <p className="text-xs text-slate-400 mt-3">
              For full complaint details and to take action,{' '}
              <Link to="/login/consumer" className="text-nch-blue-600 hover:underline">log in to your consumer account</Link>.
            </p>
          </div>

          {/* Results */}
          {searched && complaint && (
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded p-5">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                  <div>
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Docket Number</p>
                    <p className="text-sm font-mono font-semibold text-slate-900">{complaint.docketNumber}</p>
                  </div>
                  <StatusBadge status={complaint.status} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5">Subject</p>
                    <p className="text-sm text-slate-700 font-medium line-clamp-2">{complaint.subject}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5">Organisation / Company</p>
                    <p className="text-sm text-slate-700">{complaint.companyName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5">Sector</p>
                    <p className="text-sm text-slate-700">{complaint.sector}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5">Date Registered</p>
                    <p className="text-sm text-slate-700">{fmt(complaint.registeredAt)}</p>
                  </div>
                  {complaint.expectedResolutionDate && (
                    <div>
                      <p className="text-xs text-slate-400 mb-0.5">Response Due (NCH SLA)</p>
                      <p className="text-sm text-slate-700">{complaint.expectedResolutionDate}</p>
                    </div>
                  )}
                  {complaint.companyExpectedResolutionDate && (
                    <div>
                      <p className="text-xs text-slate-400 mb-0.5">Company's Expected Completion</p>
                      <p className="text-sm text-slate-700">{complaint.companyExpectedResolutionDate}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5">Filed By</p>
                    <p className="text-sm text-slate-700">{complaint.consumerFirstName} (name partially withheld)</p>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div className="bg-white border border-slate-200 rounded p-5">
                <h2 className="text-sm font-semibold text-slate-800 mb-4">Complaint Timeline</h2>
                <CaseTimeline events={complaint.timeline} />
              </div>

              <div className="bg-nch-blue-50 border border-nch-blue-200 rounded p-4 text-xs text-nch-blue-800">
                To view the organisation's full response, documents and to confirm or dispute a resolution, please{' '}
                <Link to="/login/consumer" className="font-semibold underline">log in to your consumer account</Link>.
              </div>
            </div>
          )}

          {!searched && (
            <div className="text-center py-16 text-slate-400">
              <Search size={36} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Enter your docket number and registered contact detail above to track your complaint.</p>
              <p className="text-xs mt-1">Docket number format: NCH/YYYY/ST/XXXXXX</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
