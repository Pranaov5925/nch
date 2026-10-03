# National Consumer Helpline — Complaint Registration & Escalation Tracking Dashboard (Academic Prototype)

An academic prototype (2-credit project) inspired by the **National Consumer Helpline (India)** — a single-window consumer grievance portal where citizens register complaints, NCH officers drive a state-machine workflow, companies respond, and a **rules engine + human-in-the-loop supervision** handles escalation.

> ⚠️ **Disclaimer:** This is a student prototype for demonstration only. It is **not** an official product of the Department of Consumer Affairs, and all data (companies, officers, complaints) is fictional.

---

## Feature Overview

| Area | What it does |
|---|---|
| **Public pages** | Landing page with live helpline stats · Track any complaint by docket number **+ registered email/mobile** (privacy model, sanitized read-only view) · Login / Register |
| **Consumer portal** | Register grievances · My complaints with full case timeline · Confirm resolution or dispute (auto-reopens) · Feedback · Notifications · Documents |
| **Officer portal** | Case queue · Case detail with state-machine actions · Officer remarks · Internal follow-ups · Assignment · AI case assist · Sector analytics |
| **Supervisor portal** | All complaints · Escalation monitoring (review → escalate / dismiss) · Company directory · Reports · Analytics |
| **Company portal** | View complaints **forwarded to the company by NCH** (pre-forwarding stages are never visible to company accounts) · Submit resolution responses · Response history |
| **Escalation rules** | Purely rule-driven: SLA breach flags + consumer dissatisfaction flags. A **human supervisor** always makes the final escalation decision — AI never does. Dismissing a flag restores the prior workflow status and suppresses re-flagging of the same condition until new evidence (e.g. a dispute) appears. |
| **Complaint lifecycle** | Closing a case requires the consumer to have **confirmed** the resolution; disputes auto-reopen the case. Illegal transitions are rejected server-side. |
| **SLA tracking** | Deadline is fixed at creation (`createdAt + slaHours`) and **never resets** on status updates (anti-timer-tampering). |
| **AI assist (advisory only)** | ① Structured case summary ② Resolution check ③ Escalation context brief — all fed the full case file (timeline, officer remarks, feedback, response). Works out of the box with a labelled mock provider that only restates stored facts; add a Gemini API key for real LLM output. Every output carries a disclaimer and is cached per case-state. |

### Complaint lifecycle (state machine, enforced server-side)

```
Registered → Under Review → [officer forwards] → Awaiting Response → Response Received
    → Action Pending → Confirmation Pending → Resolved → Closed

Branches:
  • Company claims resolution      → Confirmation Pending (consumer decides)
  • Consumer confirms resolution   → Resolved (then officer closes → Closed)
  • Consumer disputes a response   → Reopened (escalation flag ESC-02)
  • SLA breach / dispute           → Escalation Review → Supervisor decides → Escalated / dismissed

Access & confirmation rules:
  • Companies gain access to a case (and are notified) only when the officer
    forwards it — never at registration time.
  • "Confirm Resolution" is available only once the organization claims a
    resolution or the officer explicitly requests confirmation; an ordinary
    response can be rated or disputed, but not confirmed.
  • Officers cannot "Mark Resolved" before the organization-response stage,
    and not from "Response Received" either — that status means the latest
    company response was NOT a resolution claim. The officer asks the
    consumer to confirm or follows up instead.
  • Supervisors may review/forward cases but never become the assigned
    officer; only officers own cases (self-assign or supervisor /assign).
  • Escalation is rules-driven end-to-end: a supervisor can escalate only a
    case carrying an active flag (or already in the escalation pipeline).
Illegal transitions are rejected (HTTP 409); wrong-role actions with 403.
```

### Sector SLA windows (prototype values)

Banking & Finance **48h** · E-Commerce / Consumer Electronics / Telecom **72h** · all other sectors **96h**.
Set `DEMO_SLA_MULTIPLIER` (env) to scale every window at once for demos — the deadline is `base hours × multiplier`. Example: `DEMO_SLA_MULTIPLIER=0.02` turns the 48h Banking window into ~58 minutes and the 72h E-Commerce window into ~86 minutes, so breaches surface live during a presentation. Default `1` applies the documented windows unchanged.

---

## Demo Accounts

Password for **all** demo accounts: `demo1234`

| Role | Email |
|---|---|
| Consumer | `priya.sharma@gmail.com` |
| NCH Officer | `r.verma@nch.gov.in` |
| Supervisor | `m.agarwal@nch.gov.in` |
| Company nodal officer (Flipkart) | `nch.nodal@flipkart.com` |
| Other companies (Jio, HDFC, Star Health, IndiGo, Samsung, Lodha, Amazon) | one login per company — see `prisma/seed.ts` |

The database ships **pre-seeded**: 8 companies, 17 users (5 consumers, 3 officers, 1 supervisor, 8 company nodal logins), and 14 complaints spanning every status — with dates relative to first seed so several cases are live SLA breaches.

---

## Quick Start

Requirements: **Node.js 20+** (or Bun 1.2+). No `.env` file needed (see `.env.example` for the optional knobs). All npm scripts are cross-platform (Windows / macOS / Linux).

```bash
npm install        # prisma client is generated automatically on install
npm run dev        # → http://localhost:3000
```

That's it — the SQLite database (`db/custom.db`) is included with demo data.

With Bun instead:

```bash
bun install
bun run dev
```

### Useful scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Development server on port 3000 |
| `npm run build` / `npm start` | Production build & standalone server |
| `npm run lint` | ESLint (0 errors / 0 warnings at ship time) |
| `npm run test:e2e` | API end-to-end test (`node scripts/e2e-test.mjs`) — run it while the dev server is up; re-seed afterwards |
| `npm run db:seed` | Reset the DB to pristine demo data (`tsx prisma/seed.ts`) |
| `npm run db:push` | Re-sync Prisma schema to SQLite (accepts data loss) |
| `npm run db:generate` | Regenerate the Prisma client |

### Optional environment variables

| Variable | Default | Effect |
|---|---|---|
| `GEMINI_API_KEY` | *(unset)* | When set, the AI layer calls Gemini for the 3 advisory features; without it a clearly-labelled **mock provider** restates stored case facts (never invents analysis). Unreachable/failed providers fall back gracefully — the app never breaks because of AI. |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Model id used by the Gemini provider (override without code changes). |
| `DEMO_SLA_MULTIPLIER` | `1` | Multiplier on all SLA windows (deadline = base hours × multiplier; see above). Applied at registration **and** during seeding. Example: `0.02` → 48h becomes ~58 min. |
| `DATABASE_URL` | `file:../db/custom.db` | Only needed if you swap the schema to `env("DATABASE_URL")`; the DB path is otherwise fixed in `prisma/schema.prisma`. |

---

## Tech Stack & Architecture

- **Next.js 16** (App Router) — one unified full-stack app; API routes under `src/app/api/*`
- **React 19** + SPA navigation via `react-router-dom` v7 (`HashRouter`) mounted at `/`
- **Tailwind CSS 4** + **shadcn/ui** component library; Inter typeface; NCH blue/saffron/teal palette
- **Prisma ORM + SQLite** (`db/custom.db`) — 11 small tables: `User, Company, Session, Complaint, ComplaintEvent, Document, OfficerRemark, CompanyResponse, Feedback, Notification, AiCache`
- **Auth**: scrypt password hashing + DB-backed sessions + httpOnly cookie (`src/lib/nch/auth.ts`)
- **Rules engine** (`src/lib/nch/rules.ts`): deterministic escalation rules only
- **AI layer** (`src/lib/nch/ai.ts`): provider-agnostic interface → `MockProvider` (default) or `GeminiProvider`; results cached in `AiCache` keyed by provider + model + a hash of the full model payload (so switching providers always invalidates stale entries); every output labelled with an AI disclaimer
- **Escalation sync** (`src/lib/nch/escalation-sync.ts`): write-on-read SLA breach flagging — staff workflows only; public tracking is read-only

```
src/
├── app/
│   ├── api/            # 20 REST route files: auth, complaints, actions, respond,
│   │                   # feedback, escalate, remarks, assign, ai, track,
│   │                   # notifications, analytics, companies, officers, stats
│   └── page.tsx        # mounts the SPA (HashRouter)
├── components/nch/
│   ├── pages/          # 28 portal pages (public/consumer/officer/supervisor/company/shared)
│   ├── AppLayout.tsx · SideNav.tsx · TopBar.tsx · ui.tsx
├── components/ui/      # shadcn/ui primitives
├── context/            # AuthContext (session bootstrap)
└── lib/nch/            # domain layer: auth, constants, rules, ai, serialize,
                        # escalation-sync, server-utils, api client, types
prisma/
├── schema.prisma       # data model (SQLite)
└── seed.ts             # demo data — dates relative to "now"
db/custom.db            # pre-seeded database
```

## Design Notes

- **Escalation is rule-driven; humans decide.** SLA breaches and consumer disputes only *flag* cases for review. Only a Supervisor can escalate — and only a flagged case (escalating an unflagged case is rejected with 409). Every decision is recorded on the case timeline. Dismissal restores the prior status and is remembered.
- **AI is advisory only.** It drafts summaries and checks wording; it never mutates complaint state and never decides escalation. The mock fallback only restates stored facts. All outputs are disclaimers-first and cached per case-state.
- **Fixed SLA clocks.** Deadlines are computed once at registration; status changes never reset them.
- **Public tracking is read-only and contact-verified** — a docket number alone reveals nothing, unauthenticated requests never trigger writes, the registered contact detail is never placed in the URL, and timeline actors are shown as institutional roles ("NCH Officer", "Organization") rather than staff names. The SLA date is labelled "Response Due (NCH SLA)" and is distinct from the company's own promised completion date.
- **Docket numbers** share one format everywhere: `NCH/<year>/<state>/<6-digit sequence>`, uniqueness-checked at generation (seeded and live-registered cases are indistinguishable).
- The UI design follows a Lovable-generated template (`Nch_2.0`) used as the single source of truth for look & feel.
