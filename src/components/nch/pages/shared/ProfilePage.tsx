'use client';

// NCH 3.0 — Shared Profile Page (ported; real session data)

import { AppLayout, PageHeader, SectionCard } from '@/components/nch/AppLayout';
import { useAuth } from '@/context/AuthContext';
import { User, Mail, Phone, Shield, Calendar } from 'lucide-react';

const ROLE_LABELS: Record<string, string> = {
  consumer: 'Consumer',
  officer: 'NCH Officer',
  supervisor: 'Supervisor / Admin',
  company: 'Company / Organisation',
};

export default function ProfilePage() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <AppLayout>
      <PageHeader title="My Profile" subtitle="Account information and session details" />

      <div className="max-w-lg space-y-4">
        {/* User info */}
        <SectionCard title="Account Details">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-nch-blue-600 text-white flex items-center justify-center text-lg font-bold shrink-0">
                {user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">{user.name}</p>
                <span className="inline-flex items-center gap-1 text-xs text-nch-blue-700 bg-nch-blue-50 border border-nch-blue-200 rounded px-2 py-0.5 mt-1">
                  <Shield size={11} /> {ROLE_LABELS[user.role]}
                </span>
              </div>
            </div>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded">
              <div className="flex items-center gap-3 px-4 py-3">
                <Mail size={14} className="text-slate-400 shrink-0" />
                <div>
                  <p className="text-xs text-slate-400">Email</p>
                  <p className="text-sm text-slate-700">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 px-4 py-3">
                <Phone size={14} className="text-slate-400 shrink-0" />
                <div>
                  <p className="text-xs text-slate-400">Phone</p>
                  <p className="text-sm text-slate-700">{user.phone || '—'}</p>
                </div>
              </div>
              {user.designation && (
                <div className="flex items-center gap-3 px-4 py-3">
                  <Shield size={14} className="text-slate-400 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-400">Designation</p>
                    <p className="text-sm text-slate-700">{user.designation}</p>
                  </div>
                </div>
              )}
              {user.companyName && (
                <div className="flex items-center gap-3 px-4 py-3">
                  <User size={14} className="text-slate-400 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-400">Organisation</p>
                    <p className="text-sm text-slate-700">{user.companyName}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3 px-4 py-3">
                <Calendar size={14} className="text-slate-400 shrink-0" />
                <div>
                  <p className="text-xs text-slate-400">Member Since</p>
                  <p className="text-sm text-slate-700">{new Date(user.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Security */}
        <SectionCard title="Security">
          <div className="text-sm text-slate-500 space-y-3">
            <p>You are signed in with a server-side session (scrypt-hashed credentials, httpOnly session cookie). Use the “Sign Out” button in the sidebar to end the session.</p>
            <p className="text-xs text-slate-400">Password change and two-factor authentication are out of scope for this academic prototype.</p>
          </div>
        </SectionCard>
      </div>
    </AppLayout>
  );
}
