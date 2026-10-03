'use client';

// NCH 3.0 — Consumer Dashboard (ported; live data)

import { Link } from 'react-router-dom';
import { FilePlus, FileText, Search, Bell, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { AppLayout, PageHeader, SectionCard, StatCard, LoadingBlock, ErrorBlock } from '@/components/nch/AppLayout';
import { StatusBadge, Button } from '@/components/nch/ui';
import { useAuth } from '@/context/AuthContext';
import { useFetch } from '@/lib/nch/client';
import type { Complaint, Notification } from '@/lib/nch/types';

export default function ConsumerDashboard() {
  const { user } = useAuth();
  const { data, loading, error, refetch } = useFetch<{ complaints: Complaint[] }>('/api/complaints');
  const { data: notifData } = useFetch<{ notifications: Notification[] }>(user ? '/api/notifications' : null);

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
        <div className="mb-5 space-y-2">
          {unreadNotifs.slice(0, 2).map(notif => (
            <Link
              key={notif.id}
              to={notif.link}
              className="flex items-start gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded text-sm hover:bg-blue-100 transition-colors"
            >
              <Bell size={14} className="text-blue-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-medium text-blue-800">{notif.title}</span>
                <span className="text-blue-600 ml-2 text-xs">{notif.detail}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pending action alert */}
      {pending_action.length > 0 && (
        <div className="mb-5 flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded">
          <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">Action Required</p>
            <p className="text-xs text-amber-700 mt-0.5">
              {pending_action.length} complaint{pending_action.length > 1 ? 's require' : ' requires'} your attention — please confirm resolution or dispute the company's response.
            </p>
          </div>
          <Link to="/consumer/complaints" className="shrink-0 ml-auto text-xs font-medium text-amber-700 underline">
            View →
          </Link>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total Complaints" value={complaints.length} />
        <StatCard label="Active Cases" value={active.length} accent />
        <StatCard label="Resolved" value={resolved.length} />
        <StatCard label="Escalated" value={escalated.length} sub={escalated.length > 0 ? 'Needs attention' : 'None'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Recent complaints */}
        <div className="lg:col-span-2">
          <SectionCard
            title="My Complaints"
            actions={
              <Link to="/consumer/complaints" className="text-xs text-nch-blue-600 font-medium hover:text-nch-blue-800">
                View all →
              </Link>
            }
            noPad
          >
            {complaints.length === 0 ? (
              <div className="px-4 py-12 text-center text-slate-400">
                <FileText size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">No complaints registered yet.</p>
                <Link to="/consumer/register" className="text-xs text-nch-blue-600 mt-1 inline-block">
                  Register your first complaint →
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {complaints.map(c => (
                  <li key={c.id}>
                    <Link
                      to={`/consumer/complaints/${c.id}`}
                      className="flex items-start gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="text-sm font-medium text-slate-800 line-clamp-1">{c.subject}</p>
                          <StatusBadge status={c.status} size="sm" />
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-400">
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
        <div className="space-y-4">
          <SectionCard title="Quick Actions">
            <div className="space-y-2">
              {[
                { label: 'Register a New Complaint', to: '/consumer/register', icon: <FilePlus size={15} /> },
                { label: 'Track Complaint Status', to: '/consumer/track', icon: <Search size={15} /> },
                { label: 'View Documents', to: '/consumer/documents', icon: <FileText size={15} /> },
                { label: 'View Notifications', to: '/consumer/notifications', icon: <Bell size={15} /> },
              ].map(action => (
                <Link
                  key={action.label}
                  to={action.to}
                  className="flex items-center gap-3 px-3 py-2.5 rounded border border-slate-200 hover:border-nch-blue-300 hover:bg-nch-blue-50 text-sm text-slate-700 transition-colors group"
                >
                  <span className="text-nch-blue-500 group-hover:text-nch-blue-700">{action.icon}</span>
                  {action.label}
                </Link>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Helpline">
            <div className="space-y-2 text-xs text-slate-600">
              <p className="flex items-center gap-2">
                <span className="font-bold text-nch-blue-700 text-sm">1800-11-4000</span>
                <span className="text-slate-400">Toll-Free</span>
              </p>
              <p>SMS: <strong>8800001915</strong></p>
              <p className="text-slate-400">Mon–Sat, 8:00 AM – 8:00 PM</p>
            </div>
          </SectionCard>

          <div className="bg-slate-50 border border-slate-200 rounded p-4">
            <p className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-green-600" /> Your Consumer Rights
            </p>
            <ul className="text-xs text-slate-500 space-y-1">
              <li>• Right to be informed</li>
              <li>• Right to choose</li>
              <li>• Right to be heard</li>
              <li>• Right to seek redressal</li>
              <li>• Right to consumer education</li>
            </ul>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
