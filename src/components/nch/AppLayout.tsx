'use client';

// NCH 3.0 — AppLayout + PageHeader + SectionCard + StatCard (ported)

import { type ReactNode } from 'react';
import { SideNav } from './SideNav';
import { TopBar } from './TopBar';

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="nch-root flex h-screen overflow-hidden bg-slate-50">
      <SideNav />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-5">
          {children}
          {/* Prototype disclaimer stays visible on every authenticated screen */}
          <footer className="mt-8 pt-3 border-t border-slate-200 text-[11px] text-slate-400">
            National Consumer Helpline — Academic Prototype (not an official portal). NCH-inspired grievance dashboard built for a
            coursework project only; not affiliated with any government body or any company shown in the demo data.
          </footer>
        </main>
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, actions, meta }: {
  title: string; subtitle?: string; actions?: ReactNode; meta?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
      <div className="min-w-0">
        <h1 className="text-base font-semibold text-slate-900">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
        {meta && <div className="mt-1">{meta}</div>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

export function SectionCard({ title, children, className, noPad, actions }: {
  title?: string; children: ReactNode; className?: string; noPad?: boolean; actions?: ReactNode;
}) {
  return (
    <div className={`bg-white border border-slate-200 rounded ${className ?? ''}`}>
      {(title || actions) && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          {title && <h2 className="text-sm font-semibold text-slate-800">{title}</h2>}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={noPad ? '' : 'p-4'}>{children}</div>
    </div>
  );
}

export function StatCard({ label, value, sub, accent }: {
  label: string; value: string | number; sub?: string; accent?: boolean;
}) {
  return (
    <div className={`rounded border p-4 ${accent ? 'bg-nch-blue-50 border-nch-blue-200' : 'bg-white border-slate-200'}`}>
      <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${accent ? 'text-nch-blue-700' : 'text-slate-900'}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export function LoadingBlock({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="h-64 flex items-center justify-center text-slate-400 text-sm">{label}</div>
  );
}

export function ErrorBlock({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="h-48 flex flex-col items-center justify-center gap-3 text-sm">
      <p className="text-red-600">{message}</p>
      {onRetry && <button className="text-nch-blue-600 underline" onClick={onRetry}>Try again</button>}
    </div>
  );
}
