// NCH 3.0 — Serialize Prisma rows into the exact shapes the (ported) UI consumes.
// Dates are pre-formatted with date-fns so ported template pages render as-is.

import { format } from 'date-fns';
import type {
  Complaint as UiComplaint,
  TimelineEvent,
  ComplaintStatus,
  Priority,
} from './types';
import { buildEscalationInfo, evaluateSla } from './rules';
import { isActiveStatus } from './constants';

type PrismaComplaint = {
  id: string;
  docketNumber: string;
  sector: string;
  category: string;
  subCategory: string;
  subject: string;
  description: string;
  amount: number | null;
  status: string;
  priority: string;
  channel: string;
  slaHours: number;
  slaDeadline: Date;
  escalationFlagged: boolean;
  escalationReasons: string | null;
  supervisorNotes: string | null;
  preEscalationStatus?: string | null;
  escalationDismissedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt: Date | null;
  closedAt: Date | null;
  consumer: { id: string; name: string; phone: string; email: string; address: string | null };
  company: { id: string; name: string };
  assignedOfficer?: { id: string; name: string } | null;
  events?: Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    actorName: string;
    actorRole: string;
    createdAt: Date;
  }>;
  documents?: Array<{
    id: string;
    name: string;
    type: string;
    size: string;
    uploadedBy: string;
    createdAt: Date;
  }>;
  remarks?: Array<{
    id: string;
    officerId: string;
    officerName: string;
    remark: string;
    isInternal: boolean;
    createdAt: Date;
  }>;
  responses?: Array<{
    id: string;
    responseText: string;
    actionTaken: string;
    claimStatus: string;
    expectedResolutionDate: Date | null;
    respondedById: string;
    respondedByName: string;
    createdAt: Date;
  }>;
  feedback?: {
    rating: number;
    comments: string;
    confirmed: boolean;
    disputed: boolean;
    disputeReason: string | null;
    createdAt: Date;
  } | null;
};

const dt = (d: Date) => format(d, 'd MMM yyyy');
const tm = (d: Date) => format(d, 'h:mm a');

export const fmtDate = dt;
export const fmtTime = tm;
export const fmtDateTime = (d: Date) => `${dt(d)}, ${tm(d)}`;

function mapEvents(c: PrismaComplaint, includeInternal: boolean): TimelineEvent[] {
  if (!c.events) return [];
  return c.events
    .filter((e) => includeInternal || e.type !== 'INTERNAL_REMARK')
    .map((e) => ({
      id: e.id,
      date: dt(e.createdAt),
      time: tm(e.createdAt),
      event: e.title,
      description: e.description,
      actor: e.actorName,
      actorRole: e.actorRole as TimelineEvent['actorRole'],
    }));
}

export function serializeComplaint(c: PrismaComplaint, opts: { includeInternal?: boolean; now?: Date } = {}): UiComplaint {
  const now = opts.now ?? new Date();
  const includeInternal = opts.includeInternal ?? true;
  const sla = evaluateSla(c.createdAt, c.slaDeadline, now);
  const active = isActiveStatus(c.status);

  const escalation = buildEscalationInfo(
    {
      status: c.status,
      priority: c.priority,
      amount: c.amount,
      createdAt: c.createdAt,
      slaDeadline: c.slaDeadline,
      escalationFlagged: c.escalationFlagged,
      escalationReasons: c.escalationReasons,
    },
    now
  );

  const latestResponse = c.responses && c.responses.length > 0
    ? [...c.responses].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0]
    : undefined;

  const hasActiveFlag = c.escalationFlagged && active;

  return {
    id: c.id,
    docketNumber: c.docketNumber,
    consumerId: c.consumer.id,
    consumerName: c.consumer.name,
    consumerPhone: c.consumer.phone,
    consumerEmail: c.consumer.email,
    consumerAddress: c.consumer.address ?? '',
    sector: c.sector as UiComplaint['sector'],
    category: c.category,
    subCategory: c.subCategory,
    companyId: c.company.id,
    companyName: c.company.name,
    subject: c.subject,
    description: c.description,
    amount: c.amount ?? undefined,
    registeredAt: c.createdAt.toISOString(),
    lastUpdatedAt: c.updatedAt.toISOString(),
    status: c.status as ComplaintStatus,
    priority: c.priority as Priority,
    assignedOfficerId: c.assignedOfficer?.id,
    assignedOfficerName: c.assignedOfficer?.name,
    timeline: mapEvents(c, includeInternal),
    documents: (c.documents ?? []).map((d) => ({
      id: d.id,
      name: d.name,
      type: d.type,
      size: d.size,
      uploadedBy: d.uploadedBy,
      uploadedAt: fmtDateTime(d.createdAt),
    })),
    officerRemarks: (c.remarks ?? [])
      .filter((r) => includeInternal || !r.isInternal)
      .map((r) => ({
        id: r.id,
        officerId: r.officerId,
        officerName: r.officerName,
        remark: r.remark,
        date: dt(r.createdAt),
        time: tm(r.createdAt),
        isInternal: r.isInternal,
      })),
    companyResponse: latestResponse
      ? {
          id: latestResponse.id,
          companyId: c.company.id,
          companyName: c.company.name,
          respondedAt: latestResponse.createdAt.toISOString(),
          responseText: latestResponse.responseText,
          actionTaken: latestResponse.actionTaken,
          expectedResolutionDate: latestResponse.expectedResolutionDate
            ? fmtDate(latestResponse.expectedResolutionDate)
            : '',
          status: latestResponse.claimStatus as UiComplaint['companyResponse'] extends infer R
            ? R extends { status: infer S }
              ? S
              : never
            : never,
        }
      : undefined,
    consumerFeedback: c.feedback
      ? {
          submittedAt: c.feedback.createdAt.toISOString(),
          rating: c.feedback.rating as 1 | 2 | 3 | 4 | 5,
          comments: c.feedback.comments,
          confirmed: c.feedback.confirmed,
          disputed: c.feedback.disputed,
          disputeReason: c.feedback.disputeReason ?? undefined,
        }
      : undefined,
    escalation: hasActiveFlag || c.status === 'Escalated' ? escalation : undefined,
    expectedResolutionDate: fmtDate(c.slaDeadline),
    actualResolutionDate: c.resolvedAt ? fmtDate(c.resolvedAt) : undefined,
    closedAt: c.closedAt ? fmtDate(c.closedAt) : undefined,
    supervisorNotes: c.supervisorNotes ?? undefined,
    channel: c.channel as UiComplaint['channel'],
    language: 'English',
    sla: {
      hours: c.slaHours,
      deadline: c.slaDeadline.toISOString(),
      breached: sla.breached && active,
      overdueHours: sla.overdueHours,
      hoursRemaining: sla.hoursRemaining,
    },
  };
}

/** Base include for complaint queries (everything the UI needs). */
export const complaintInclude = {
  consumer: { select: { id: true, name: true, phone: true, email: true, address: true } },
  company: { select: { id: true, name: true } },
  assignedOfficer: { select: { id: true, name: true } },
  events: { orderBy: { createdAt: 'asc' as const } },
  documents: { orderBy: { createdAt: 'asc' as const } },
  remarks: { orderBy: { createdAt: 'asc' as const } },
  responses: { orderBy: { createdAt: 'desc' as const } },
  feedback: true,
} as const;
