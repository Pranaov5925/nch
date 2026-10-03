'use client';

// NCH 3.0 — TopBar (ported; live notifications from API)

import { useEffect, useState } from 'react';
import { Bell, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useFetch, api } from '@/lib/nch/client';
import type { Notification } from '@/lib/nch/types';

export function TopBar() {
  const { user } = useAuth();
  const [notifOpen, setNotifOpen] = useState(false);
  const { data, refetch } = useFetch<{ notifications: Notification[] }>(user ? '/api/notifications' : null);
  const notifications = data?.notifications ?? [];
  const unreadCount = notifications.filter(n => !n.read).length;
  const notifBasePath = user ? `/${user.role}` : '/';

  useEffect(() => {
    if (notifOpen && unreadCount > 0) {
      // mark read when the panel opens (batch), then refresh badge
      api('/api/notifications', { method: 'POST', body: JSON.stringify({}) })
        .then(() => refetch())
        .catch(() => undefined);
    }
  }, [notifOpen]);

  return (
    <header className="h-12 bg-white border-b border-slate-200 flex items-center px-4 gap-4 shrink-0 z-10">
      <div className="flex-1 min-w-0">
        <h1 className="text-sm font-semibold text-slate-900 truncate">
          National Consumer Helpline <span className="text-slate-400 font-normal">— Grievance Tracking (Prototype)</span>
        </h1>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setNotifOpen(o => !o)}
            className="relative p-1.5 rounded text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nch-blue-500"
            aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium leading-none">
                {unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setNotifOpen(false)} aria-hidden="true" />
              <div className="absolute right-0 top-10 z-40 w-80 bg-white rounded-lg shadow-lg border border-slate-200 overflow-hidden">
                <div className="px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-800">Notifications</p>
                  {unreadCount > 0 && <span className="text-xs text-nch-blue-600 font-medium">{unreadCount} unread</span>}
                </div>
                <ul className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                  {notifications.length === 0 && (
                    <li className="px-4 py-6 text-xs text-slate-400 text-center">No notifications yet.</li>
                  )}
                  {notifications.map(notif => (
                    <li key={notif.id}>
                      <Link
                        to={notif.link}
                        className="block px-4 py-3 hover:bg-slate-50 transition-colors"
                        onClick={() => setNotifOpen(false)}
                      >
                        <div className="flex items-start gap-2">
                          {!notif.read && <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-nch-blue-500 shrink-0" aria-label="Unread" />}
                          <div className={!notif.read ? '' : 'ml-3.5'}>
                            <p className="text-xs font-medium text-slate-800">{notif.title}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{notif.detail}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{notif.date}</p>
                          </div>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
                <div className="px-4 py-2 border-t border-slate-200">
                  <Link
                    to={`${notifBasePath}/notifications`}
                    className="text-xs text-nch-blue-600 hover:text-nch-blue-800 font-medium"
                    onClick={() => setNotifOpen(false)}
                  >
                    View all notifications
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>

        {/* User indicator */}
        {user && (
          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
            <div className="h-7 w-7 rounded-full bg-nch-blue-600 flex items-center justify-center text-white text-xs font-semibold shrink-0">
              {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
            <span className="text-xs text-slate-700 font-medium hidden sm:inline max-w-24 truncate">{user.name.split(' ')[0]}</span>
            <ChevronDown size={12} className="text-slate-400 hidden sm:inline" />
          </div>
        )}
      </div>
    </header>
  );
}
