// NCH 3.0 — Shared Types
// Ported from the approved Lovable UI template. Both API serializers and
// client components import from here so the wire format matches the UI exactly.

export type ComplaintStatus =
  | 'Registered'
  | 'Under Review'
  | 'Forwarded'
  | 'Awaiting Response'
  | 'Response Received'
  | 'Action Pending'
  | 'Resolution Claimed'
  | 'Confirmation Pending'
  | 'Escalation Review'
  | 'Escalated'
  | 'Resolved'
  | 'Closed'
  | 'Reopened';

export type Priority = 'Low' | 'Medium' | 'High' | 'Critical';

export type UserRole = 'consumer' | 'officer' | 'supervisor' | 'company';

export type Sector =
  | 'E-Commerce'
  | 'Banking & Finance'
  | 'Telecom'
  | 'Insurance'
  | 'Aviation'
  | 'Real Estate'
  | 'Automobiles'
  | 'Consumer Electronics'
  | 'Food & Beverage'
  | 'Healthcare'
  | 'Education'
  | 'Petroleum'
  | 'Power / Electricity'
  | 'Railway'
  | 'Postal Services'
  | 'Others';

export const SECTORS: Sector[] = [
  'E-Commerce',
  'Banking & Finance',
  'Telecom',
  'Insurance',
  'Aviation',
  'Real Estate',
  'Automobiles',
  'Consumer Electronics',
  'Food & Beverage',
  'Healthcare',
  'Education',
  'Petroleum',
  'Power / Electricity',
  'Railway',
  'Postal Services',
  'Others',
];

export interface TimelineEvent {
  id: string;
  date: string;
  time: string;
  event: string;
  description: string;
  actor: string;
  actorRole: 'Consumer' | 'NCH Officer' | 'Organization' | 'System' | 'Supervisor';
  icon?: string;
}

export interface Document {
  id: string;
  name: string;
  type: string;
  size: string;
  uploadedBy: string;
  uploadedAt: string;
  url?: string;
}

export interface OfficerRemark {
  id: string;
  officerId: string;
  officerName: string;
  remark: string;
  date: string;
  time: string;
  isInternal: boolean;
}

export type CompanyResponseStatus = 'Resolution Claimed' | 'Partial Resolution' | 'Rejected' | 'Under Process';

export interface CompanyResponse {
  id: string;
  companyId: string;
  companyName: string;
  respondedAt: string;
  responseText: string;
  actionTaken: string;
  expectedResolutionDate: string;
  status: CompanyResponseStatus;
}

export interface ConsumerFeedback {
  submittedAt: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comments: string;
  confirmed: boolean;
  disputed: boolean;
  disputeReason?: string;
}

export interface EscalationInfo {
  isEscalated: boolean;
  escalationLevel: number;
  escalatedAt?: string;
  reasons: string[];
  riskLevel: Priority;
  recommendedAction: string;
  aiGenerated: boolean;
  reviewedByOfficer?: boolean;
  supervisorNotes?: string;
}

export interface Complaint {
  id: string;
  docketNumber: string;
  consumerId: string;
  consumerName: string;
  consumerPhone: string;
  consumerEmail: string;
  consumerAddress: string;
  sector: Sector;
  category: string;
  subCategory: string;
  companyId: string;
  companyName: string;
  subject: string;
  description: string;
  amount?: number;
  registeredAt: string;
  lastUpdatedAt: string;
  status: ComplaintStatus;
  priority: Priority;
  assignedOfficerId?: string;
  assignedOfficerName?: string;
  timeline: TimelineEvent[];
  documents: Document[];
  officerRemarks: OfficerRemark[];
  companyResponse?: CompanyResponse;
  consumerFeedback?: ConsumerFeedback;
  escalation?: EscalationInfo;
  expectedResolutionDate?: string;
  actualResolutionDate?: string;
  closedAt?: string;
  /** Supervisor decision notes (staff views) */
  supervisorNotes?: string;
  channel: 'Online Portal' | 'Helpline Call' | 'Mobile App' | 'Walk-in' | 'Email';
  language: string;
  /** Live SLA info computed by the rules engine (prototype extension) */
  sla?: {
    hours: number;
    deadline: string;
    breached: boolean;
    overdueHours: number;
    hoursRemaining: number;
  };
}

export interface Officer {
  id: string;
  name: string;
  empId: string;
  email: string;
  phone: string;
  designation: string;
  department: string;
  sectors: Sector[];
  supervisorId: string;
  assignedComplaints: number;
  resolvedThisMonth: number;
  avgResolutionDays: number;
  joinedAt: string;
}

export interface Company {
  id: string;
  name: string;
  sector: Sector;
  registrationNumber: string;
  contactEmail: string;
  contactPhone: string;
  nodalofficer: string;
  avgResponseDays: number;
  totalComplaints: number;
  resolvedComplaints: number;
  pendingComplaints: number;
  resolutionRate: number;
}

export interface User {
  id: string;
  role: UserRole;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
  companyId?: string;
  companyName?: string;
  designation?: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  detail: string;
  date: string;
  read: boolean;
  type: 'info' | 'warning' | 'success' | 'error';
  link: string;
}

export interface AiAssist {
  feature: 'CASE_SUMMARY' | 'RESOLUTION_CHECK' | 'ESCALATION_CONTEXT';
  text: string;
  provider: string;
  cached: boolean;
  disclaimer: string;
}

export interface AnalyticsData {
  overview: {
    totalComplaints: number;
    pendingComplaints: number;
    resolvedThisMonth: number;
    escalatedActive: number;
    avgResolutionDays: number;
    resolutionRate: number;
  };
  bySector: Array<{ sector: string; count: number; resolved: number; pending: number }>;
  byStatus: Array<{ status: string; count: number }>;
  monthlyTrend: Array<{ month: string; registered: number; resolved: number }>;
  /** Flag-aware escalation pipeline breakdown (prototype extension) */
  escalationBreakdown?: {
    escalated: number;
    escalationReview: number;
    flagged: number;
    reopened: number;
  };
  recentEscalations: Array<{
    docket: string;
    consumer: string;
    sector: string;
    company: string;
    priority: string;
    escalatedAt: string;
  }>;
  sla?: {
    breached: number;
    withinSla: number;
    complianceRate: number;
  };
}
