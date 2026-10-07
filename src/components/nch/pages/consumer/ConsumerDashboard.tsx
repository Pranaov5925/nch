'use client';

// NCH 3.0 — Consumer Dashboard (ported; live data)

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FilePlus, FileText, Search, Bell, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { AppLayout, PageHeader, SectionCard, StatCard, LoadingBlock, ErrorBlock } from '@/components/nch/AppLayout';
import { StatusBadge, Button } from '@/components/nch/ui';
import { TrackStatusModal } from '@/components/nch/TrackStatusModal';
import { useAuth } from '@/context/AuthContext';
import { useFetch } from '@/lib/nch/client';
import type { Complaint, Notification } from '@/lib/nch/types';

export default function ConsumerDashboard() {
  const { user } = useAuth();
  const { data, loading, error, refetch } = useFetch<{ complaints: Complaint[] }>('/api/complaints');
  const { data: notifData } = useFetch<{ notifications: Notification[] }>(user ? '/api/notifications' : null);
  const [selectedComplaintForTrack, setSelectedComplaintForTrack] = useState<Complaint | null>(null);

  if (loading) return <AppLayout><LoadingBlock /></AppLayout>;
  if (error) return <AppLayout><ErrorBlock message={error} onRetry={refetch} /></AppLayout>;

  const complaints = data?.complaints ?? [];
  const notifications = notifData?.notifications ?? [];
  const active = complaints.filter(c => !['Resolved', 'Closed'].includes(c.status));
  const resolved = complaints.filter(c => ['Resolved', 'Closed'].includes(c.status));
  const pending_action = complaints.filter(c => ['Confirmation Pending', 'Response Received'].includes(c.status));
  const escalated = complaints.filter(c => ['Escalated', 'Escalation Review'].includes(c.status));
  const unreadNotifs = notifications.filter(n => !n.read);

  return (
    <AppLayout>
      <PageHeader
        title={`Welcome back, ${user?.name.split(' ')[0]}`}
        subtitle="Your complaint dashboard — National Consumer Helpline"
        actions={
          <Link to="/consumer/register">
            <Button variant="primary" icon={<FilePlus size={15} />} size="sm">
              Register New Complaint
            </Button>
          </Link>
        }
      />

      {/* Alerts */}
      {unreadNotifs.length > 0 && (
        <div className="mb-6 space-y-3">
          {unreadNotifs.slice(0, 2).map(notif => (
            <Link
              key={notif.id}
              to={notif.link}
              className="flex items-start gap-3.5 px-4.5 py-3.5 bg-blue-50 border border-blue-200 rounded-xl text-sm hover:bg-blue-100/80 transition-colors shadow-xs"
            >
              <Bell size={16} className="text-blue-600 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-blue-900">{notif.title}</span>
                <span className="text-blue-700 ml-2 text-xs">{notif.detail}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pending action alert */}
      {pending_action.length > 0 && (
        <div className="mb-6 flex items-start gap-3.5 px-4.5 py-3.5 bg-amber-50 border border-amber-200 rounded-xl shadow-xs">
          <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-900">Action Required</p>
            <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
              {pending_action.length} complaint{pending_action.length > 1 ? 's require' : ' requires'} your attention — please confirm resolution or dispute the company's response.
            </p>
          </div>
          <Link to="/consumer/complaints" className="shrink-0 ml-auto text-xs font-semibold text-amber-800 hover:text-amber-950 underline self-center">
            View →
          </Link>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-5 mb-8">
        <StatCard label="Total Complaints" value={complaints.length} />
        <StatCard label="Active Cases" value={active.length} accent />
        <StatCard label="Resolved" value={resolved.length} />
        <StatCard label="Escalated" value={escalated.length} sub={escalated.length > 0 ? 'Needs attention' : 'None'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Recent complaints */}
        <div className="lg:col-span-2">
          <SectionCard
            title="My Complaints"
            actions={
              <Link to="/consumer/complaints" className="text-xs text-nch-blue-600 font-semibold hover:text-nch-blue-800">
                View all →
              </Link>
            }
            noPad
          >
            {complaints.length === 0 ? (
              <div className="px-6 py-16 text-center text-slate-400 space-y-2">
                <FileText size={36} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium text-slate-600">No complaints registered yet.</p>
                <Link to="/consumer/register" className="text-xs text-nch-blue-600 font-semibold mt-1 inline-block hover:underline">
                  Register your first complaint →
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {complaints.map(c => (
                  <li key={c.id}>
                    <Link
                      to={`/consumer/complaints/${c.id}`}
                      className="flex items-start gap-4 px-5 py-4 hover:bg-slate-50/80 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-1.5">
                          <p className="text-sm font-semibold text-slate-800 line-clamp-1">{c.subject}</p>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setSelectedComplaintForTrack(c);
                              }}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md text-nch-blue-700 bg-nch-blue-50 border border-nch-blue-200 hover:bg-nch-blue-100 hover:border-nch-blue-300 transition-colors shadow-2xs cursor-pointer"
                            >
                              <Search size={12} />
                              <span>Track</span>
                            </button>
                            <StatusBadge status={c.status} size="sm" />
                          </div>
                        </div>
                        <div className="flex items-center gap-2.5 text-xs text-slate-400">
                          <span className="font-mono">{c.docketNumber}</span>
                          <span>·</span>
                          <span>{c.companyName}</span>
                          <span>·</span>
                          <span>{new Date(c.registeredAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>

        {/* Quick Actions + Info */}
        <div className="space-y-6">
          <SectionCard title="Quick Actions">
            <div className="space-y-2.5">
              {[
                { label: 'Register a New Complaint', to: '/consumer/register', icon: <FilePlus size={16} /> },
                { label: 'Track Complaint Status', to: '/consumer/complaints', icon: <Search size={16} /> },
                { label: 'View Documents', to: '/consumer/documents', icon: <FileText size={16} /> },
                { label: 'View Notifications', to: '/consumer/notifications', icon: <Bell size={16} /> },
              ].map(action => (
                <Link
                  key={action.label}
                  to={action.to}
                  className="flex items-center gap-3 px-3.5 py-3 rounded-lg border border-slate-200 hover:border-nch-blue-300 hover:bg-nch-blue-50/60 text-sm font-medium text-slate-700 transition-colors group shadow-2xs"
                >
                  <span className="text-nch-blue-500 group-hover:text-nch-blue-700 shrink-0">{action.icon}</span>
                  {action.label}
                </Link>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Helpline">
            <div className="space-y-2.5 text-xs text-slate-600">
              <p className="flex items-center gap-2">
                <span className="font-bold text-nch-blue-700 text-base">1800-11-4000</span>
                <span className="text-slate-400 font-medium">Toll-Free</span>
              </p>
              <p className="text-slate-700">SMS: <strong className="font-semibold text-slate-900">8800001915</strong></p>
              <p className="text-slate-400">Mon–Sat, 8:00 AM – 8:00 PM</p>
            </div>
          </SectionCard>

          <div className="bg-slate-50/80 border border-slate-200/90 rounded-xl p-5 shadow-2xs">
            <p className="text-xs font-semibold text-slate-700 mb-2.5 flex items-center gap-2">
              <CheckCircle2 size={14} className="text-green-600 shrink-0" /> Your Consumer Rights
            </p>
            <ul className="text-xs text-slate-500 space-y-1.5 leading-relaxed">
              <li>• Right to be informed</li>
              <li>• Right to choose</li>
              <li>• Right to be heard</li>
              <li>• Right to seek redressal</li>
              <li>• Right to consumer education</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Tracking Modal */}
      <TrackStatusModal
        complaint={selectedComplaintForTrack}
        open={Boolean(selectedComplaintForTrack)}
        onClose={() => setSelectedComplaintForTrack(null)}
      />
    </AppLayout>
  );
}
