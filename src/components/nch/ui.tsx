'use client';

// NCH 3.0 — UI primitives (ported 1:1 from the approved Lovable UI template)

import { useEffect, type ButtonHTMLAttributes, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { clsx } from 'clsx';
import type { ComplaintStatus, Priority, TimelineEvent } from '@/lib/nch/types';

// ─── Button ──────────────────────────────────────────────────────────────────

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  children: ReactNode;
}

const VARIANT_STYLES = {
  primary:   'bg-nch-blue-600 text-white hover:bg-nch-blue-700 focus-visible:ring-nch-blue-600 border-transparent',
  secondary: 'bg-nch-blue-50 text-nch-blue-700 hover:bg-nch-blue-100 focus-visible:ring-nch-blue-400 border-transparent',
  ghost:     'bg-transparent text-slate-600 hover:bg-slate-100 focus-visible:ring-slate-400 border-transparent',
  danger:    'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600 border-transparent',
  outline:   'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 focus-visible:ring-slate-400',
};

const SIZE_STYLES = {
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-5 py-2.5 text-sm gap-2',
};

export function Button({
  variant = 'primary', size = 'md', loading = false, icon, iconPosition = 'left',
  children, disabled, className, ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center rounded font-medium border transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        VARIANT_STYLES[variant], SIZE_STYLES[size], className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {!loading && icon && iconPosition === 'left' && <span className="shrink-0">{icon}</span>}
      {children}
      {!loading && icon && iconPosition === 'right' && <span className="shrink-0">{icon}</span>}
    </button>
  );
}

// ─── StatusBadge ─────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  'Registered':              'bg-blue-50 text-blue-700 ring-blue-200',
  'Under Review':            'bg-indigo-50 text-indigo-700 ring-indigo-200',
  'Forwarded':               'bg-amber-50 text-amber-700 ring-amber-200',
  'Awaiting Response':       'bg-orange-50 text-orange-700 ring-orange-200',
  'Response Received':       'bg-teal-50 text-teal-700 ring-teal-200',
  'Action Pending':          'bg-yellow-50 text-yellow-700 ring-yellow-200',
  'Resolution Claimed':      'bg-emerald-50 text-emerald-700 ring-emerald-200',
  'Confirmation Pending':    'bg-lime-50 text-lime-700 ring-lime-200',
  'Escalation Review':       'bg-rose-50 text-rose-700 ring-rose-200',
  'Escalated':               'bg-red-100 text-red-800 ring-red-300',
  'Resolved':                'bg-green-50 text-green-700 ring-green-200',
  'Closed':                  'bg-slate-100 text-slate-600 ring-slate-200',
  'Reopened':                'bg-purple-50 text-purple-700 ring-purple-200',
  'Partial Resolution':      'bg-yellow-50 text-yellow-700 ring-yellow-200',
  'Rejected':                'bg-red-50 text-red-700 ring-red-200',
  'Under Process':           'bg-blue-50 text-blue-600 ring-blue-200',
};

const DEFAULT_STYLE = 'bg-slate-100 text-slate-600 ring-slate-200';

export function StatusBadge({ status, size = 'md' }: { status: ComplaintStatus | string; size?: 'sm' | 'md' }) {
  const style = STATUS_STYLES[status] ?? DEFAULT_STYLE;
  return (
    <span className={clsx('inline-flex items-center font-medium rounded ring-1 whitespace-nowrap', style, size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs')}>
      {status}
    </span>
  );
}

const PRIORITY_STYLES: Record<string, string> = {
  'Low':      'bg-slate-100 text-slate-600',
  'Medium':   'bg-blue-50 text-blue-700',
  'High':     'bg-orange-50 text-orange-700',
  'Critical': 'bg-red-100 text-red-800 font-semibold',
};

export function PriorityBadge({ priority, size = 'md' }: { priority: Priority | string; size?: 'sm' | 'md' }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded font-medium',
        PRIORITY_STYLES[priority] ?? 'bg-slate-100 text-slate-600',
        size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-0.5 text-xs'
      )}
    >
      {priority === 'Critical' && <span className="mr-1">▲</span>}
      {priority}
    </span>
  );
}

// ─── Modal + AlertBanner ─────────────────────────────────────────────────────

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  footer?: ReactNode;
}

export function Modal({ open, onClose, title, children, size = 'md', footer }: ModalProps) {
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const sizeClass = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl' }[size];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} aria-hidden="true" />
      <div className={clsx('relative w-full bg-white rounded-lg shadow-xl flex flex-col max-h-[90vh]', sizeClass)}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 shrink-0">
          <h2 id="modal-title" className="text-sm font-semibold text-slate-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nch-blue-500 rounded"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="px-5 py-3 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0">{footer}</div>
        )}
      </div>
    </div>
  );
}

const ALERT_STYLES = {
  info:    'bg-blue-50 border-blue-200 text-blue-800',
  success: 'bg-green-50 border-green-200 text-green-800',
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
  error:   'bg-red-50 border-red-200 text-red-800',
};

export function AlertBanner({ type, title, children, className }: { type: keyof typeof ALERT_STYLES; title?: string; children: ReactNode; className?: string }) {
  return (
    <div className={clsx('rounded border px-4 py-3 text-sm', ALERT_STYLES[type], className)}>
      {title && <p className="font-semibold mb-0.5">{title}</p>}
      <div>{children}</div>
    </div>
  );
}

// ─── Form primitives ─────────────────────────────────────────────────────────

export function Input({ error, icon, className, ...props }: InputHTMLAttributes<HTMLInputElement> & { error?: string; icon?: ReactNode }) {
  return (
    <div className="relative">
      {icon && <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">{icon}</div>}
      <input
        className={clsx(
          'block w-full rounded border bg-white text-slate-900 placeholder:text-slate-400',
          'text-sm py-2 transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-nch-blue-500 focus:border-nch-blue-500',
          icon ? 'pl-9 pr-3' : 'px-3',
          error ? 'border-red-400 focus:ring-red-400 focus:border-red-400' : 'border-slate-300 hover:border-slate-400',
          'disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed',
          className
        )}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function Select({ error, placeholder, children, className, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { error?: string; placeholder?: string }) {
  return (
    <div>
      <select
        className={clsx(
          'block w-full rounded border bg-white text-slate-900',
          'text-sm px-3 py-2 transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-nch-blue-500 focus:border-nch-blue-500',
          error ? 'border-red-400 focus:ring-red-400 focus:border-red-400' : 'border-slate-300 hover:border-slate-400',
          'disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed',
          className
        )}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {children}
      </select>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function Textarea({ error, className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: string }) {
  return (
    <div>
      <textarea
        className={clsx(
          'block w-full rounded border bg-white text-slate-900 placeholder:text-slate-400',
          'text-sm px-3 py-2 transition-colors resize-y min-h-24',
          'focus:outline-none focus:ring-2 focus:ring-nch-blue-500 focus:border-nch-blue-500',
          error ? 'border-red-400 focus:ring-red-400 focus:border-red-400' : 'border-slate-300 hover:border-slate-400',
          'disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed',
          className
        )}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function FormField({ label, htmlFor, required, hint, error, children, className }: {
  label: string; htmlFor?: string; required?: boolean; hint?: string; error?: string; children: ReactNode; className?: string;
}) {
  return (
    <div className={clsx('space-y-1', className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

// ─── Table ───────────────────────────────────────────────────────────────────

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={clsx('overflow-x-auto', className)}>
      <table className="min-w-full divide-y divide-slate-200 text-sm">{children}</table>
    </div>
  );
}

export function Thead({ children }: { children: ReactNode }) {
  return <thead className="bg-slate-50">{children}</thead>;
}

export function Tbody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-slate-100 bg-white">{children}</tbody>;
}

export function Tr({ children, onClick, className }: { children: ReactNode; onClick?: () => void; className?: string }) {
  return (
    <tr className={clsx(onClick && 'cursor-pointer hover:bg-slate-50 transition-colors', className)} onClick={onClick}>
      {children}
    </tr>
  );
}

export function Th({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <th scope="col" className={clsx('px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide', className)}>
      {children}
    </th>
  );
}

export function Td({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={clsx('px-4 py-3 text-slate-700 align-top', className)}>{children}</td>;
}

export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {icon && <div className="text-slate-300 mb-4">{icon}</div>}
      <p className="text-sm font-medium text-slate-600">{title}</p>
      {description && <p className="text-xs text-slate-400 mt-1 max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ─── CaseTimeline ────────────────────────────────────────────────────────────

const ACTOR_COLORS: Record<string, string> = {
  'System':       'bg-slate-200 text-slate-600',
  'Consumer':     'bg-blue-100 text-blue-700',
  'NCH Officer':  'bg-nch-blue-100 text-nch-blue-700',
  'Organization': 'bg-teal-100 text-teal-700',
  'Supervisor':   'bg-purple-100 text-purple-700',
};

const DOT_COLORS: Record<string, string> = {
  'System':       'bg-slate-300 ring-slate-100',
  'Consumer':     'bg-blue-400 ring-blue-100',
  'NCH Officer':  'bg-nch-blue-600 ring-nch-blue-100',
  'Organization': 'bg-teal-500 ring-teal-100',
  'Supervisor':   'bg-purple-500 ring-purple-100',
};

export function CaseTimeline({ events, compact = false }: { events: TimelineEvent[]; compact?: boolean }) {
  return (
    <ol className="relative">
      {events.map((event, idx) => {
        const isLast = idx === events.length - 1;
        const dotColor = DOT_COLORS[event.actorRole] ?? 'bg-slate-300 ring-slate-100';
        const actorColor = ACTOR_COLORS[event.actorRole] ?? 'bg-slate-100 text-slate-600';
        return (
          <li key={event.id} className="relative flex gap-4 pb-6 last:pb-0">
            {!isLast && <div className="absolute left-3 top-6 bottom-0 w-px bg-slate-200" aria-hidden="true" />}
            <div className={clsx('relative z-10 flex-shrink-0 w-6 h-6 rounded-full ring-4 mt-0.5', dotColor)} aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-start gap-2 mb-1">
                <span className="text-sm font-semibold text-slate-900">{event.event}</span>
                <span className={clsx('inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium', actorColor)}>
                  {event.actorRole === 'NCH Officer' ? 'NCH Officer' : event.actorRole}
                </span>
              </div>
              {!compact && <p className="text-sm text-slate-600 mb-1.5">{event.description}</p>}
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span>{event.date}</span>
                <span aria-hidden="true">·</span>
                <span>{event.time}</span>
                {!compact && event.actor && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{event.actor}</span>
                  </>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
