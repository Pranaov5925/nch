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
    <header className="h-16 bg-white border-b border-slate-200/90 flex items-center px-6 sm:px-8 gap-6 shrink-0 z-20">
      <div className="flex-1 min-w-0">
        <h1 className="text-sm sm:text-base font-semibold text-slate-900 truncate flex items-center gap-2">
          <span>National Consumer Helpline</span>
          <span className="text-slate-400 font-normal hidden md:inline">— Grievance Tracking (Prototype)</span>
        </h1>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setNotifOpen(o => !o)}
            className="relative p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nch-blue-500 cursor-pointer"
            aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
          >
            <Bell size={19} />
            {unreadCount > 0 && (
              <span className="absolute 1 top-1 right-1 h-4 w-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold leading-none shadow-xs">
                {unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setNotifOpen(false)} aria-hidden="true" />
              <div className="absolute right-0 top-12 z-40 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-800">Notifications</p>
                  {unreadCount > 0 && <span className="text-xs text-nch-blue-600 font-semibold bg-nch-blue-50 px-2 py-0.5 rounded-full">{unreadCount} unread</span>}
                </div>
                <ul className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {notifications.length === 0 && (
                    <li className="px-5 py-8 text-xs text-slate-400 text-center">No notifications yet.</li>
                  )}
                  {notifications.map(notif => (
                    <li key={notif.id}>
                      <Link
                        to={notif.link}
                        className="block px-5 py-3.5 hover:bg-slate-50 transition-colors"
                        onClick={() => setNotifOpen(false)}
                      >
                        <div className="flex items-start gap-3">
                          {!notif.read && <span className="mt-1.5 h-2 w-2 rounded-full bg-nch-blue-500 shrink-0" aria-label="Unread" />}
                          <div className={!notif.read ? '' : 'ml-5'}>
                            <p className="text-xs font-semibold text-slate-800">{notif.title}</p>
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed">{notif.detail}</p>
                            <p className="text-[11px] text-slate-400 mt-1.5">{notif.date}</p>
                          </div>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
                <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50">
                  <Link
                    to={`${notifBasePath}/notifications`}
                    className="text-xs text-nch-blue-600 hover:text-nch-blue-800 font-semibold inline-flex items-center gap-1"
                    onClick={() => setNotifOpen(false)}
                  >
                    View all notifications →
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>

        {/* User indicator */}
        {user && (
          <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200 py-1">
            <div className="h-8 w-8 rounded-full bg-nch-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-xs">
              {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
            <span className="text-sm text-slate-700 font-medium hidden sm:inline max-w-28 truncate">{user.name.split(' ')[0]}</span>
            <ChevronDown size={14} className="text-slate-400 hidden sm:inline" />
          </div>
        )}
      </div>
    </header>
  );
}
