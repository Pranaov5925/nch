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
      <div className="bg-slate-900 text-slate-400 text-xs py-2 px-6 sm:px-8 flex items-center gap-2">
        <ShieldCheck size={13} /> Government of India — Department of Consumer Affairs
      </div>
      <header className="bg-nch-blue-700 text-white px-6 sm:px-8 py-4 shadow-xs">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3.5">
            <div className="h-9 w-9 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
              <ShieldCheck size={18} />
            </div>
            <div>
              <p className="text-sm font-bold leading-tight">National Consumer Helpline</p>
              <p className="text-xs text-nch-blue-200">Track Complaint — Public</p>
            </div>
          </Link>
          <Link to="/login/consumer" className="text-xs font-semibold text-nch-blue-100 hover:text-white transition-colors">Consumer Login →</Link>
        </div>
      </header>

      <main className="flex-1 py-10 px-6 sm:px-8">
        <div className="max-w-4xl mx-auto">

          {/* Search */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-xs mb-8 space-y-5">
            <div>
              <h1 className="text-lg font-bold text-slate-900 mb-1">Track Your Complaint</h1>
              <p className="text-xs text-slate-500 leading-relaxed">Enter your docket number together with the email or mobile number registered on the complaint. Login is not required.</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="track-docket" className="text-xs font-semibold text-slate-700 block">Docket number</label>
                <Input
                  id="track-docket"
                  value={docket}
                  onChange={e => { setDocket(e.target.value.toUpperCase()); setError(''); }}
                  placeholder="NCH/2026/UP/478208"
                  className="font-mono"
                  aria-label="Docket number"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="track-contact" className="text-xs font-semibold text-slate-700 block">Registered email or mobile number</label>
                <Input
                  id="track-contact"
                  value={contact}
                  onChange={e => { setContact(e.target.value); setError(''); }}
                  placeholder="you@example.com or 9876543210"
                  aria-label="Registered email or mobile number"
                />
              </div>
              <div className="pt-1">
                <Button type="submit" variant="primary" icon={<Search size={16} />} loading={searching} className="w-full sm:w-auto font-semibold">
                  Track Complaint
                </Button>
              </div>
            </form>
            {error && (
              <div className="flex items-start gap-2.5 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3 shadow-2xs">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            <p className="text-xs text-slate-400 pt-2 border-t border-slate-100">
              For full complaint details and to take action,{' '}
              <Link to="/login/consumer" className="text-nch-blue-600 font-semibold hover:underline">log in to your consumer account</Link>.
            </p>
          </div>

          {/* Results */}
          {searched && complaint && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-100">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Docket Number</p>
                    <p className="text-base font-mono font-bold text-slate-900">{complaint.docketNumber}</p>
                  </div>
                  <StatusBadge status={complaint.status} size="md" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-sm">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-slate-400">Subject</p>
                    <p className="text-slate-800 font-medium leading-snug line-clamp-2">{complaint.subject}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-slate-400">Organisation / Company</p>
                    <p className="text-slate-800 font-medium">{complaint.companyName}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-slate-400">Sector</p>
                    <p className="text-slate-700">{complaint.sector}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-slate-400">Date Registered</p>
                    <p className="text-slate-700">{fmt(complaint.registeredAt)}</p>
                  </div>
                  {complaint.expectedResolutionDate && (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-slate-400">Response Due (NCH SLA)</p>
                      <p className="text-slate-700 font-medium">{complaint.expectedResolutionDate}</p>
                    </div>
                  )}
                  {complaint.companyExpectedResolutionDate && (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-slate-400">Company's Expected Completion</p>
                      <p className="text-slate-700">{complaint.companyExpectedResolutionDate}</p>
                    </div>
                  )}
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-slate-400">Filed By</p>
                    <p className="text-slate-700">{complaint.consumerFirstName} (name partially withheld)</p>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-xs">
                <h2 className="text-base font-bold text-slate-900 mb-6">Complaint Timeline</h2>
                <CaseTimeline events={complaint.timeline} />
              </div>

              <div className="bg-nch-blue-50 border border-nch-blue-200 rounded-xl p-4.5 text-xs text-nch-blue-900 leading-relaxed shadow-2xs">
                To view the organisation's full response, documents and to confirm or dispute a resolution, please{' '}
                <Link to="/login/consumer" className="font-semibold underline text-nch-blue-700 hover:text-nch-blue-900">log in to your consumer account</Link>.
              </div>
            </div>
          )}

          {!searched && (
            <div className="text-center py-20 text-slate-400 space-y-2">
              <Search size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium text-slate-600">Enter your docket number and registered contact detail above to track your complaint.</p>
              <p className="text-xs text-slate-400">Docket number format: NCH/YYYY/ST/XXXXXX</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
