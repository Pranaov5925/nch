import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/nch/auth';
import { fail, handleError } from '@/lib/nch/api';
import { serializeComplaint, complaintInclude } from '@/lib/nch/serialize';
import { syncEscalationFlags } from '@/lib/nch/escalation-sync';
import { slaHoursForSector, derivePriority, isCompanyHiddenStatus, COMPANY_HIDDEN_STATUSES } from '@/lib/nch/constants';
import { generateDocketNumber, addEvent } from '@/lib/nch/server-utils';
import { SECTORS } from '@/lib/nch/types';
import { STATE_CODES } from '@/lib/nch/constants';

// GET /api/complaints — role-scoped list
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const sector = searchParams.get('sector');
    const q = searchParams.get('q');

    const where: Record<string, unknown> = {};
    if (user.role === 'consumer') where.consumerId = user.id;
    else if (user.role === 'company') {
      where.companyId = user.companyId ?? '__none__';
      // Workflow gating: organizations only see complaints NCH has actually
      // forwarded (or escalated) to them — never pre-forwarding stages.
      where.status = status
        ? (isCompanyHiddenStatus(status) ? '__none__' : status)
        : { notIn: [...COMPANY_HIDDEN_STATUSES] };
    } else if (user.role === 'officer') {
      where.OR = [{ assignedOfficerId: user.id }, { assignedOfficerId: null }];
    }
    if (status && user.role !== 'company') where.status = status;
    if (sector) where.sector = sector;
    if (q) {
      const search = {
        OR: [
          { docketNumber: { contains: q } },
          { subject: { contains: q } },
          { consumer: { name: { contains: q } } },
          { company: { name: { contains: q } } },
        ],
      };
      if (user.role === 'officer') {
        // SECURITY: the search must NARROW the officer's scope, never replace
        // it — combine "mine or unassigned" with the search via AND.
        delete where.OR;
        where.AND = [
          { OR: [{ assignedOfficerId: user.id }, { assignedOfficerId: null }] },
          search,
        ];
      } else {
        where.OR = search.OR;
      }
    }

    let complaints = await db.complaint.findMany({
      where,
      include: complaintInclude,
      orderBy: { createdAt: 'desc' },
    });

    // Write-on-read: persists new SLA-breach flags — staff workflows only.
    // If any flag was written, re-query so this response reflects the state.
    const isStaff = user.role === 'officer' || user.role === 'supervisor';
    if (isStaff) {
      const newlyFlagged = await syncEscalationFlags(complaints);
      if (newlyFlagged > 0) {
        complaints = await db.complaint.findMany({
          where,
          include: complaintInclude,
          orderBy: { createdAt: 'desc' },
        });
      }
    }

    const includeInternal = user.role === 'officer' || user.role === 'supervisor';
    return Response.json({
      complaints: complaints.map((c) => serializeComplaint(c, { includeInternal })),
    });
  } catch (err) {
    return handleError(err);
  }
}

// POST /api/complaints — consumer registers a grievance
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    if (user.role !== 'consumer') return fail('Only consumers can register complaints', 403);

    const body = await req.json();
    const {
      companyId, sector, category, subCategory, subject, description,
      amount, stateCode, channel,
    } = body;

    if (!companyId || !sector || !category || !subject || !description) {
      return fail('Company, sector, category, subject and description are required');
    }
    if (!SECTORS.includes(sector)) return fail('Invalid sector');
    const company = await db.company.findUnique({ where: { id: companyId } });
    if (!company) return fail('Unknown company', 404);

    const state = STATE_CODES.includes(stateCode) ? stateCode : 'DL';
    const slaHours = slaHoursForSector(sector);
    const now = new Date();
    const priority = derivePriority(amount ? Number(amount) : undefined);
    const docketNumber = await generateDocketNumber(state);

    const complaint = await db.complaint.create({
      data: {
        docketNumber,
        consumerId: user.id,
        companyId,
        sector,
        category,
        subCategory: subCategory ?? '',
        subject: String(subject).slice(0, 300),
        description: String(description).slice(0, 8000),
        amount: amount != null && amount !== '' ? Number(amount) : null,
        stateCode: state,
        priority,
        channel: channel ?? 'Online Portal',
        slaHours,
        slaDeadline: new Date(now.getTime() + slaHours * 3_600_000),
      },
    });

    await addEvent({
      complaintId: complaint.id,
      type: 'REGISTERED',
      title: 'Complaint Registered',
      description: `Consumer registered grievance on the NCH portal. Docket ${docketNumber} generated. SLA window: ${slaHours}h for ${sector} (prototype assumption).`,
      actorName: user.name,
      actorRole: 'Consumer',
    });

    // NOTE: the organization is NOT notified here. Company access begins only
    // at the officer's "forward" action (see /api/complaints/[id]/action),
    // which is what notifies the company nodal account.

    return Response.json({ complaint: serializeComplaint(await db.complaint.findUniqueOrThrow({ where: { id: complaint.id }, include: complaintInclude })) }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
