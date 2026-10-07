'use client';

// NCH 3.0 — TrackStatusModal
// Reusable modal for in-dashboard complaint tracking with lifecycle stage stepper, SLA counter, and live case timeline.

import { Link } from 'react-router-dom';
import {
  CheckCircle2, Clock, Building2, AlertTriangle,
  ArrowRight, ShieldCheck, X
} from 'lucide-react';
import { StatusBadge, PriorityBadge, CaseTimeline, Button, Modal } from '@/components/nch/ui';
import type { Complaint, ComplaintStatus } from '@/lib/nch/types';

interface TrackStatusModalProps {
  complaint: Complaint | null;
  open: boolean;
  onClose: () => void;
}

const STAGES = [
  { step: 1, label: 'Registered', sub: 'Docket issued' },
  { step: 2, label: 'Under Review', sub: 'Officer scrutiny' },
  { step: 3, label: 'Company Action', sub: 'Company investigating' },
  { step: 4, label: 'Resolution Review', sub: 'Response / Confirmation' },
  { step: 5, label: 'Closed', sub: 'Redressal finalized' },
];

function getStageStep(status: ComplaintStatus): number {
  switch (status) {
    case 'Registered':
      return 1;
    case 'Under Review':
      return 2;
    case 'Forwarded':
    case 'Awaiting Response':
      return 3;
    case 'Response Received':
    case 'Action Pending':
    case 'Resolution Claimed':
    case 'Confirmation Pending':
    case 'Escalation Review':
    case 'Escalated':
    case 'Reopened':
      return 4;
    case 'Resolved':
    case 'Closed':
      return 5;
    default:
      return 1;
  }
}

function getStatusDescription(complaint: Complaint): {
  headline: string;
  detail: string;
  type: 'info' | 'warning' | 'success' | 'alert';
} {
  switch (complaint.status) {
    case 'Registered':
      return {
        headline: 'Grievance Registered',
        detail: 'Your complaint has been assigned a docket number. An NCH officer will review and forward it to the nodal company within 24–48 hours.',
        type: 'info',
      };
    case 'Under Review':
      return {
        headline: 'Officer Scrutiny in Progress',
        detail: `Officer ${complaint.assignedOfficerName ? `(${complaint.assignedOfficerName})` : ''} is assessing the grievance facts, categorization, and preparing case forwarding.`,
        type: 'info',
      };
    case 'Forwarded':
    case 'Awaiting Response':
      return {
        headline: `Awaiting Response from ${complaint.companyName}`,
        detail: `The complaint has been officially served to ${complaint.companyName}. The company is required to respond within the mandated sector SLA deadline.`,
        type: 'info',
      };
    case 'Response Received':
      return {
        headline: 'Company Response Received',
        detail: `${complaint.companyName} has submitted an update. The assigned officer and consumer can inspect the response records.`,
        type: 'info',
      };
    case 'Resolution Claimed':
    case 'Confirmation Pending':
      return {
        headline: 'Resolution Claimed — Your Confirmation Needed',
        detail: `${complaint.companyName} has claimed that your grievance has been resolved. Please review the response and confirm or dispute the resolution.`,
        type: 'warning',
      };
    case 'Reopened':
      return {
        headline: 'Case Disputed & Reopened',
        detail: 'You have disputed the resolution. The case has been marked Reopened and escalated for officer & supervisor follow-up.',
        type: 'warning',
      };
    case 'Escalation Review':
    case 'Escalated':
      return {
        headline: 'Under Escalation Review',
        detail: 'This grievance has breached standard SLA thresholds or received consumer dispute. An NCH supervisor is actively reviewing intervention actions.',
        type: 'alert',
      };
    case 'Resolved':
      return {
        headline: 'Resolution Confirmed',
        detail: 'The grievance resolution was accepted. Formal case closing records are being completed.',
        type: 'success',
      };
    case 'Closed':
      return {
        headline: 'Case Successfully Closed',
        detail: 'The grievance lifecycle is complete and this case is archived as resolved.',
        type: 'success',
      };
    default:
      return {
        headline: complaint.status,
        detail: `Current status is ${complaint.status}.`,
        type: 'info',
      };
  }
}

export function TrackStatusModal({ complaint, open, onClose }: TrackStatusModalProps) {
  if (!complaint) return null;

  const currentStep = getStageStep(complaint.status);
  const statusInfo = getStatusDescription(complaint);
  const registeredDate = new Date(complaint.registeredAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Complaint Tracking — ${complaint.docketNumber}`}
      size="lg"
      footer={
        <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3">
          <Link
            to={`/consumer/complaints/${complaint.id}`}
            onClick={onClose}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-xs font-semibold text-nch-blue-700 bg-nch-blue-50 border border-nch-blue-200 hover:bg-nch-blue-100 px-4 py-2 rounded-lg transition-colors"
          >
            <span>View Full Case Details & Documents</span>
            <ArrowRight size={14} />
          </Link>
          <Button variant="outline" size="sm" onClick={onClose} className="w-full sm:w-auto">
            Close
          </Button>
        </div>
      }
    >
      <div className="space-y-6">

        {/* Header Summary Card */}
        <div className="p-4 bg-slate-50 border border-slate-200/90 rounded-xl space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Docket Number</span>
              <p className="font-mono text-base font-bold text-slate-900">{complaint.docketNumber}</p>
            </div>
            <div className="flex items-center gap-2">
              <PriorityBadge priority={complaint.priority} size="sm" />
              <StatusBadge status={complaint.status} size="md" />
            </div>
          </div>

          <p className="text-sm font-semibold text-slate-800 leading-snug line-clamp-2">
            {complaint.subject}
          </p>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500 pt-2 border-t border-slate-200/60">
            <span className="flex items-center gap-1.5 font-medium text-slate-700">
              <Building2 size={13} className="text-slate-400" />
              {complaint.companyName}
            </span>
            <span>·</span>
            <span>Sector: {complaint.sector}</span>
            <span>·</span>
            <span>Filed: {registeredDate}</span>
          </div>
        </div>

        {/* 5-Step Progress Stepper */}
        <div className="space-y-3">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Grievance Lifecycle Stage
          </p>

          <div className="p-4 sm:p-5 bg-white border border-slate-200/90 rounded-xl shadow-2xs">
            <div className="relative flex items-center justify-between">
              {/* Stepper background track */}
              <div className="absolute left-4 right-4 top-4 h-1 bg-slate-100 z-0" aria-hidden="true" />
              {/* Stepper active track */}
              <div
                className="absolute left-4 top-4 h-1 bg-nch-blue-600 transition-all duration-300 z-0"
                style={{ width: `${((currentStep - 1) / (STAGES.length - 1)) * 90}%` }}
                aria-hidden="true"
              />

              {STAGES.map((s) => {
                const isPassed = s.step < currentStep;
                const isCurrent = s.step === currentStep;
                return (
                  <div key={s.step} className="relative z-10 flex flex-col items-center text-center">
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-xs ${
                        isPassed
                          ? 'bg-nch-blue-600 text-white'
                          : isCurrent
                          ? 'bg-nch-blue-700 text-white ring-4 ring-nch-blue-100 scale-105'
                          : 'bg-white text-slate-400 border-2 border-slate-200'
                      }`}
                    >
                      {isPassed ? <CheckCircle2 size={16} /> : s.step}
                    </div>
                    <span
                      className={`text-xs mt-2 font-semibold hidden sm:block ${
                        isCurrent
                          ? 'text-nch-blue-700'
                          : isPassed
                          ? 'text-slate-800'
                          : 'text-slate-400'
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Current Stage Explanation Banner */}
            <div
              className={`mt-6 p-3.5 rounded-xl border text-xs leading-relaxed ${
                statusInfo.type === 'alert'
                  ? 'bg-red-50 border-red-200 text-red-900'
                  : statusInfo.type === 'warning'
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : statusInfo.type === 'success'
                  ? 'bg-green-50 border-green-200 text-green-900'
                  : 'bg-nch-blue-50/70 border-nch-blue-200 text-nch-blue-900'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <ShieldCheck
                  size={16}
                  className={`shrink-0 mt-0.5 ${
                    statusInfo.type === 'alert'
                      ? 'text-red-600'
                      : statusInfo.type === 'warning'
                      ? 'text-amber-600'
                      : statusInfo.type === 'success'
                      ? 'text-green-600'
                      : 'text-nch-blue-600'
                  }`}
                />
                <div>
                  <p className="font-bold mb-0.5">{statusInfo.headline}</p>
                  <p>{statusInfo.detail}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SLA Status Card */}
        {complaint.sla && (
          <div className="p-4 bg-slate-50 border border-slate-200/90 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <Clock size={16} className={complaint.sla.breached ? 'text-red-600' : 'text-nch-blue-600'} />
              <div>
                <span className="font-semibold text-slate-800">Response SLA Deadline: </span>
                <span className="text-slate-600">{new Date(complaint.sla.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
            {complaint.sla.breached && !['Resolved', 'Closed'].includes(complaint.status) ? (
              <span className="px-2.5 py-1 rounded-md bg-red-100 text-red-800 font-semibold border border-red-200">
                Breached by {complaint.sla.overdueHours}h
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200">
                {complaint.sla.hoursRemaining}h remaining
              </span>
            )}
          </div>
        )}

        {/* Case Timeline History */}
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Live Case Activity Timeline ({complaint.timeline.length} events)
          </p>
          <div className="p-4 bg-white border border-slate-200/90 rounded-xl shadow-2xs">
            <CaseTimeline events={complaint.timeline} />
          </div>
        </div>

      </div>
    </Modal>
  );
}
