'use client';

// NCH 3.0 — Notifications Page (ported; live API)

import { Bell, CheckCircle2, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AppLayout, PageHeader, LoadingBlock, ErrorBlock } from '@/components/nch/AppLayout';
import { Button } from '@/components/nch/ui';
import { api, useFetch } from '@/lib/nch/client';
import type { Notification } from '@/lib/nch/types';

export default function NotificationsPage() {
  const { data, loading, error, refetch, setData } = useFetch<{ notifications: Notification[] }>('/api/notifications');
  const notifications = data?.notifications ?? [];
  const unread = notifications.filter(n => !n.read).length;

  const markAllRead = async () => {
    await api('/api/notifications', { method: 'POST', body: JSON.stringify({}) }).catch(() => undefined);
    setData({ notifications: notifications.map(n => ({ ...n, read: true })) });
  };

  const markRead = async (id: string) => {
    await api('/api/notifications', { method: 'POST', body: JSON.stringify({ id }) }).catch(() => undefined);
    setData({ notifications: notifications.map(n => (n.id === id ? { ...n, read: true } : n)) });
  };

  return (
    <AppLayout>
      <PageHeader
        title="Notifications"
        subtitle={unread > 0 ? `${unread} unread notification${unread > 1 ? 's' : ''}` : 'All notifications read'}
        actions={
          unread > 0 ? (
            <Button size="sm" variant="outline" icon={<Check size={13} />} onClick={markAllRead}>
              Mark All Read
            </Button>
          ) : undefined
        }
      />

      {loading ? (
        <div className="bg-white border border-slate-200 rounded"><LoadingBlock /></div>
      ) : error ? (
        <div className="bg-white border border-slate-200 rounded"><ErrorBlock message={error} onRetry={refetch} /></div>
      ) : (
        <div className="bg-white border border-slate-200 rounded divide-y divide-slate-100">
          {notifications.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Bell size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">No notifications yet.</p>
            </div>
          ) : (
            notifications.map(notif => (
              <div
                key={notif.id}
                className={`flex items-start gap-3 px-4 py-4 transition-colors ${notif.read ? '' : 'bg-blue-50/50'}`}
              >
                <div className={`h-2 w-2 rounded-full mt-2 shrink-0 ${notif.read ? 'bg-transparent' : 'bg-nch-blue-500'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className={`text-sm ${notif.read ? 'font-normal text-slate-700' : 'font-semibold text-slate-900'}`}>
                        {notif.title}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">{notif.detail}</p>
                      <p className="text-xs text-slate-400 mt-1">{notif.date}</p>
                    </div>
                    {!notif.read && (
                      <button
                        onClick={() => markRead(notif.id)}
                        className="text-xs text-slate-400 hover:text-nch-blue-600 shrink-0"
                        title="Mark as read"
                      >
                        <CheckCircle2 size={14} />
                      </button>
                    )}
                  </div>
                  {notif.link && notif.link !== '#' && (
                    <Link to={notif.link} className="text-xs text-nch-blue-600 hover:text-nch-blue-800 font-medium mt-1.5 inline-block">
                      View →
                    </Link>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </AppLayout>
  );
}
