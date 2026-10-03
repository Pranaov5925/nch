import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { fail, handleError } from '@/lib/nch/api';
import { complaintInclude, serializeComplaint } from '@/lib/nch/serialize';

// GET /api/track?docket=…&contact=… — public tracking (sanitized, READ-ONLY)
//
// Privacy model (aligned with the real NCH portal): the docket number alone is
// NOT sufficient — the caller must also present the registered contact detail
// (email OR mobile). This endpoint performs NO writes: escalation flagging is
// never triggered from an unauthenticated GET (side-effect-free by design).

const normalizePhone = (s: string) => s.replace(/\D/g, '');

// PUBLIC-SAFE IDENTITIES: the unauthenticated tracker must not disclose staff
// names. Timeline actors are reduced to their institutional role — the
// timeline stays readable, but no officer/supervisor/company employee name
// leaks through it. (Event descriptions are written with this in mind.)
const PUBLIC_ACTOR_LABELS: Record<string, string> = {
  'NCH Officer': 'NCH Officer',
  Supervisor: 'NCH Supervisor',
  Organization: 'Organization',
  Consumer: 'Consumer',
  System: 'NCH Rules Engine',
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const docket = searchParams.get('docket')?.trim();
    const contact = searchParams.get('contact')?.trim();
    if (!docket) return fail('Docket number is required');
    if (!contact) return fail('Registered email or mobile number is required');

    const complaint = await db.complaint.findFirst({
      where: { docketNumber: { equals: docket } },
      include: complaintInclude,
    });

    // Single generic failure message: do not reveal whether the docket or the
    // contact detail mismatched.
    const emailOk = !!complaint && complaint.consumer.email.toLowerCase() === contact.toLowerCase();
    const phoneOk =
      !!complaint &&
      normalizePhone(complaint.consumer.phone).length > 0 &&
      normalizePhone(complaint.consumer.phone) === normalizePhone(contact);
    if (!complaint || (!emailOk && !phoneOk)) {
      return fail('No complaint found for this docket number and contact detail', 404);
    }

    const full = serializeComplaint(complaint, { includeInternal: false });

    // Public-safe projection: no consumer contact details, no internal remarks,
    // no individual staff names in the timeline.
    return Response.json({
      complaint: {
        docketNumber: full.docketNumber,
        subject: full.subject,
        sector: full.sector,
        category: full.category,
        companyName: full.companyName,
        status: full.status,
        priority: full.priority,
        registeredAt: full.registeredAt,
        lastUpdatedAt: full.lastUpdatedAt,
        expectedResolutionDate: full.expectedResolutionDate,
        companyExpectedResolutionDate: full.companyResponse?.expectedResolutionDate || null,
        timeline: full.timeline.map((e) => ({
          ...e,
          actor: PUBLIC_ACTOR_LABELS[e.actorRole] ?? 'NCH',
        })),
        consumerFirstName: full.consumerName.split(' ')[0],
      },
    });
  } catch (err) {
    return handleError(err);
  }
}
