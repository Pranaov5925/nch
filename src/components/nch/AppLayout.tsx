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
        <main className="flex-1 overflow-y-auto px-6 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-8 flex flex-col justify-between">
          <div className="w-full max-w-7xl mx-auto space-y-6">
            {children}
          </div>
          {/* Prototype disclaimer stays visible on every authenticated screen */}
          <footer className="w-full max-w-7xl mx-auto mt-12 pt-6 border-t border-slate-200/80 text-xs text-slate-400 leading-relaxed text-center sm:text-left">
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
    <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-2 border-b border-slate-200/60">
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-1 leading-normal">{subtitle}</p>}
        {meta && <div className="mt-2">{meta}</div>}
      </div>
      {actions && <div className="flex items-center gap-2.5 shrink-0">{actions}</div>}
    </div>
  );
}

export function SectionCard({ title, children, className, noPad, actions }: {
  title?: string; children: ReactNode; className?: string; noPad?: boolean; actions?: ReactNode;
}) {
  return (
    <div className={`bg-white border border-slate-200/90 rounded-xl shadow-xs ${className ?? ''}`}>
      {(title || actions) && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 gap-3">
          {title && <h2 className="text-sm font-semibold text-slate-800 tracking-tight">{title}</h2>}
          {actions && <div className="flex items-center gap-2.5">{actions}</div>}
        </div>
      )}
      <div className={noPad ? '' : 'p-5 sm:p-6'}>{children}</div>
    </div>
  );
}

export function StatCard({ label, value, sub, accent }: {
  label: string; value: string | number; sub?: string; accent?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-5 sm:p-6 shadow-xs flex flex-col justify-between transition-all ${accent ? 'bg-nch-blue-50 border-nch-blue-200' : 'bg-white border-slate-200/90'}`}>
      <div>
        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">{label}</p>
        <p className={`text-2xl sm:text-3xl font-bold tracking-tight mt-2 mb-0.5 ${accent ? 'text-nch-blue-700' : 'text-slate-900'}`}>{value}</p>
      </div>
      {sub && <p className="text-xs text-slate-400 mt-2">{sub}</p>}
    </div>
  );
}

export function LoadingBlock({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="py-24 flex items-center justify-center text-slate-400 text-sm">{label}</div>
  );
}

export function ErrorBlock({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="py-20 px-4 flex flex-col items-center justify-center gap-3.5 text-sm text-center">
      <p className="text-red-600 font-medium">{message}</p>
      {onRetry && <button className="text-nch-blue-600 hover:text-nch-blue-800 underline font-medium cursor-pointer" onClick={onRetry}>Try again</button>}
    </div>
  );
}
