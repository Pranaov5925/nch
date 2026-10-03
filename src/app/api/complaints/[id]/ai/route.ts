import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/nch/auth';
import { fail, handleError } from '@/lib/nch/api';
import { generateAiAssist } from '@/lib/nch/ai';
import type { AiFeature } from '@/lib/nch/ai';

const VALID: AiFeature[] = ['CASE_SUMMARY', 'RESOLUTION_CHECK', 'ESCALATION_CONTEXT'];

// POST /api/complaints/[id]/ai — LLM-assisted features (advisory only)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole('officer', 'supervisor');
    const { id } = await params;
    const { feature } = await req.json();
    if (!VALID.includes(feature)) return fail('Unknown AI feature');

    const complaint = await db.complaint.findUnique({
      where: { id },
      include: {
        company: true,
        events: { orderBy: { createdAt: 'asc' } },
        responses: { orderBy: { createdAt: 'desc' }, take: 1 },
        remarks: { orderBy: { createdAt: 'asc' } },
        feedback: true,
      },
    });
    if (!complaint) return fail('Complaint not found', 404);

    // officers only assist on their own/pool complaints; supervisor on any
    if (user.role === 'officer' && complaint.assignedOfficerId && complaint.assignedOfficerId !== user.id) {
      return fail('This complaint is assigned to another officer', 403);
    }

    // RESOLUTION_CHECK is only meaningful once the organization has responded
    if (feature === 'RESOLUTION_CHECK' && complaint.responses.length === 0) {
      return fail('The organization has not responded yet — nothing to verify', 409);
    }

    const daysOpen = Math.max(0, Math.round((Date.now() - complaint.createdAt.getTime()) / 86_400_000));
    const assist = await generateAiAssist({
      feature,
      docketNumber: complaint.docketNumber,
      sector: complaint.sector,
      category: complaint.category,
      subject: complaint.subject,
      description: complaint.description,
      amount: complaint.amount,
      status: complaint.status,
      registeredAt: complaint.createdAt.toISOString(),
      companyName: complaint.company.name,
      companyResponseText: complaint.responses[0]?.responseText,
      companyClaimStatus: complaint.responses[0]?.claimStatus,
      escalationReasons: complaint.escalationReasons ? JSON.parse(complaint.escalationReasons) : [],
      daysOpen,
      // Full case context so the model summarizes the FILE, not a subset.
      timeline: complaint.events.map((e) => ({
        event: e.title,
        description: e.description,
        actor: e.actorName,
        actorRole: e.actorRole,
        date: e.createdAt.toISOString(),
      })),
      officerRemarks: complaint.remarks.map((r) => ({
        officerName: r.officerName,
        remark: r.remark,
        isInternal: r.isInternal,
        date: r.createdAt.toISOString(),
      })),
      consumerFeedback: complaint.feedback
        ? {
            rating: complaint.feedback.rating,
            comments: complaint.feedback.comments,
            confirmed: complaint.feedback.confirmed,
            disputed: complaint.feedback.disputed,
          }
        : null,
    });

    await db.complaintEvent.create({
      data: {
        complaintId: id,
        type: 'AI',
        title: `AI assist used: ${feature.replaceAll('_', ' ').toLowerCase()}`,
        description: `${user.name} generated an advisory ${feature === 'CASE_SUMMARY' ? 'case brief' : feature === 'RESOLUTION_CHECK' ? 'response check' : 'escalation context note'} (provider: ${assist.provider}${assist.cached ? ', cached' : ''}). Advisory only — no decision effect.`,
        actorName: 'NCH AI Layer',
        actorRole: 'System',
      },
    }).catch(() => undefined);

    return Response.json({ assist });
  } catch (err) {
    return handleError(err);
  }
}
