// NCH 3.0 — LLM Assist Layer (provider-agnostic)
//
// Exactly THREE assisted features, per the project blueprint:
//   1. CASE_SUMMARY       — structured brief of the case file for officers
//   2. RESOLUTION_CHECK   — soft advisory check of the company response
//   3. ESCALATION_CONTEXT — neutral context note for supervisor review
//
// Hard guarantees:
//   - The AI layer NEVER decides escalation. Rules engine only (see rules.ts).
//   - No API key configured → MockProvider produces clearly-labelled text that
//     ONLY restates stored case fields. It never invents facts, verdicts or
//     gaps, and the app remains fully functional without any provider.
//   - Every successful output is cached (AiCache) keyed by provider mode +
//     model + a hash of the FULL model payload — any change to the case
//     context OR the provider configuration invalidates the cache.
//   - Any provider failure falls back to the mock output gracefully (the
//     fallback itself is never cached, so the real provider is retried).

import { createHash } from 'crypto';
import { db } from '@/lib/db';
import { AI_DISCLAIMER } from './constants';
import type { AiAssist } from './types';

export type AiFeature = AiAssist['feature'];

interface AiTimelineEntry {
  event: string;
  description: string;
  actor: string;
  actorRole: string;
  date: string;
}

interface AiInput {
  feature: AiFeature;
  docketNumber: string;
  sector: string;
  category: string;
  subject: string;
  description: string;
  amount?: number | null;
  status: string;
  registeredAt: string;
  companyName: string;
  companyResponseText?: string | null;
  companyClaimStatus?: string | null;
  escalationReasons?: string[];
  daysOpen?: number;
  // Full-case context (bounded) so summaries see the whole file, not a subset.
  timeline?: AiTimelineEntry[];
  officerRemarks?: Array<{ officerName: string; remark: string; isInternal: boolean; date: string }>;
  consumerFeedback?: { rating: number; comments: string; confirmed: boolean; disputed: boolean } | null;
}

// ─── Provider interface ──────────────────────────────────────────────────────

interface AiProvider {
  name: string;
  complete(system: string, user: string): Promise<string>;
}

const TIMEOUT_MS = 12_000;

class GeminiProvider implements AiProvider {
  name = 'gemini';
  constructor(
    private apiKey: string,
    private model = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
  ) {}

  async complete(system: string, user: string): Promise<string> {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: 'user', parts: [{ text: user }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 700 },
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      }
    );
    if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ?? '';
    if (!text.trim()) throw new Error('Gemini returned empty text');
    return text.trim();
  }
}

class MistralProvider implements AiProvider {
  name = 'mistral';
  constructor(
    private apiKey: string,
    private model = process.env.MISTRAL_MODEL || 'mistral-small-latest'
  ) {}

  async complete(system: string, user: string): Promise<string> {
    const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature: 0.2,
        max_tokens: 700,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`Mistral HTTP ${res.status}`);
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content ?? '';
    if (!text.trim()) throw new Error('Mistral returned empty text');
    return text.trim();
  }
}

class MockProvider implements AiProvider {
  name = 'mock (placeholder)';

  async complete(_system: string, user: string): Promise<string> {
    // The user prompt carries a JSON dump of the case; the mock provider
    // produces a deterministic, clearly-labelled RESTATEMENT of stored fields.
    // It deliberately does NOT simulate analysis, verdicts or conclusions.
    let input: Record<string, unknown> = {};
    try {
      input = JSON.parse(user);
    } catch {
      /* ignore */
    }
    const feature = String(input.feature ?? '');
    await new Promise((r) => setTimeout(r, 150)); // simulate latency for demo realism
    return mockText(feature, input);
  }
}

function mockText(feature: string, input: Record<string, unknown>): string {
  const docket = String(input.docketNumber ?? '—');
  const company = String(input.companyName ?? 'the organization');
  const sector = String(input.sector ?? '—');
  const category = String(input.category ?? '—');
  const subject = String(input.subject ?? '');
  const status = String(input.status ?? '—');
  const amount = input.amount != null ? `₹${Number(input.amount).toLocaleString('en-IN')}` : 'not specified';
  const days = Number(input.daysOpen ?? 0);
  const reasons = Array.isArray(input.escalationReasons) ? (input.escalationReasons as string[]) : [];
  const timeline = Array.isArray(input.timeline) ? (input.timeline as AiTimelineEntry[]) : [];
  const remarks = Array.isArray(input.officerRemarks) ? input.officerRemarks : [];
  const feedback = input.consumerFeedback as AiInput['consumerFeedback'] | null;
  const label = `[PLACEHOLDER — Mock AI provider. Configure GEMINI_API_KEY to enable real generation. The lines below only restate the case record; no automated analysis was performed.]`;

  switch (feature) {
    case 'CASE_SUMMARY':
      return [
        label,
        ``,
        `Case record restatement for ${docket} (${sector} → ${category}):`,
        `• Subject on file: ${subject}`,
        `• Organization: ${company}; amount in dispute: ${amount}.`,
        `• Current stage: ${status}; case has been open for ~${days} day(s).`,
        `• Timeline events on record: ${timeline.length}.`,
        `• Officer remarks on file: ${remarks.length}.`,
        `• Consumer feedback on file: ${feedback ? `rated ${feedback.rating}/5${feedback.confirmed ? ', resolution confirmed' : feedback.disputed ? ', resolution disputed' : ''}` : 'none recorded'}.`,
        `• Automated narrative analysis is unavailable without a provider key — verify the file manually before acting.`,
      ].join('\n');

    case 'RESOLUTION_CHECK':
      return [
        label,
        ``,
        `Response record restatement for ${docket}:`,
        `• ${company} responded; recorded claim status: "${String(input.companyClaimStatus ?? '—')}".`,
        `• Response text length on record: ${String(input.companyResponseText ?? '').length} characters.`,
        `• Current case stage: ${status}.`,
        `• Automated response-vs-grievance analysis is unavailable without a provider key. The consumer's confirmation or dispute remains the deciding factor.`,
      ].join('\n');

    case 'ESCALATION_CONTEXT':
      return [
        label,
        ``,
        `Escalation-file restatement for ${docket}:`,
        `• Case is at "${status}" in ${sector}; amount involved: ${amount}.`,
        `• Rules-engine flags on record: ${reasons.length ? reasons.join('; ') : 'none currently active'}.`,
        `• Timeline events on record: ${timeline.length}.`,
        `• Flags were generated by deterministic rules; this note only restates the file. It carries no recommendation and no weight in the escalation decision.`,
      ].join('\n');

    default:
      return `[PLACEHOLDER — Mock AI provider] No template for feature "${feature}".`;
  }
}

function systemPromptFor(feature: AiFeature): string {
  const base =
    'You are an assistant inside a National Consumer Helpline (India) complaint-tracking prototype. ' +
    'You NEVER decide escalations, priorities, or outcomes — deterministic rules and human officers do. ' +
    'Be neutral, factual and concise. Use only the case data provided. Output plain text with short bullet points.';
  switch (feature) {
    case 'CASE_SUMMARY':
      return base + ' Task: produce a structured case brief (issue, parties, current stage, key events from the timeline, feedback status, suggested verification focus) for the reviewing officer.';
    case 'RESOLUTION_CHECK':
      return (
        base +
        ' Task: advisory-only check of the organization response. Phrase: does the response APPEAR to address the grievance? Identify any APPARENT gaps. Never declare the complaint resolved; the consumer confirmation decides.'
      );
    case 'ESCALATION_CONTEXT':
      return base + ' Task: write a neutral context note for a supervisor reviewing an escalation flag. Restate facts and the rule-generated flags only; no recommendation.';
  }
}

function userPromptFor(input: AiInput): string {
  return JSON.stringify({
    feature: input.feature,
    docketNumber: input.docketNumber,
    sector: input.sector,
    category: input.category,
    subject: input.subject,
    description: input.description.slice(0, 2500),
    amount: input.amount ?? null,
    status: input.status,
    registeredAt: input.registeredAt,
    companyName: input.companyName,
    companyResponseText: input.companyResponseText?.slice(0, 1500) ?? null,
    companyClaimStatus: input.companyClaimStatus ?? null,
    escalationReasons: input.escalationReasons ?? [],
    daysOpen: input.daysOpen ?? 0,
    // Full-case context, bounded to keep prompts small:
    timeline: (input.timeline ?? []).slice(-15), // last 15 events
    officerRemarks: (input.officerRemarks ?? []).slice(0, 10),
    consumerFeedback: input.consumerFeedback ?? null,
  });
}

function pickProvider(): { provider: AiProvider; modelName: string } {
  const mistralKey = process.env.MISTRAL_API_KEY;
  if (mistralKey) {
    const model = process.env.MISTRAL_MODEL || 'mistral-small-latest';
    return { provider: new MistralProvider(mistralKey, model), modelName: model };
  }

  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
  if (geminiKey) {
    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    return { provider: new GeminiProvider(geminiKey, model), modelName: model };
  }

  return { provider: new MockProvider(), modelName: 'mock' };
}

// ─── Public API: cache + fallback ────────────────────────────────────────────

export async function generateAiAssist(input: AiInput): Promise<AiAssist> {
  // The provider is resolved BEFORE the cache lookup so the cache key carries
  // the provider mode ("mistral", "gemini", vs "mock (placeholder)") and the model name.
  // Adding/removing API keys therefore invalidates all previous entries:
  // a cached mock result can never shadow a real LLM call (or vice versa).
  const { provider, modelName } = pickProvider();

  // Cache key = hash of provider + model + the FULL model payload. Any change
  // to the case context (status, timeline, remarks, feedback, response, age…)
  // produces a new key, so a cached summary can never go stale silently.
  const payload = userPromptFor(input);
  const cacheKey = createHash('sha256')
    .update(`${input.feature}|${provider.name}|${modelName}|${payload}`)
    .digest('hex');

  const hit = await db.aiCache.findUnique({ where: { cacheKey } }).catch(() => null);
  if (hit) {
    return { feature: input.feature, text: hit.text, provider: hit.provider, cached: true, disclaimer: AI_DISCLAIMER };
  }

  let text = '';
  let providerName = provider.name;
  let usedFallback = false;
  try {
    text = await provider.complete(systemPromptFor(input.feature), payload);
  } catch (err) {
    // Graceful fallback — a real provider failure must never break the flow.
    // The fallback output is NOT cached: the next request retries the real
    // provider instead of being pinned to the fallback text.
    usedFallback = true;
    const mock = new MockProvider();
    providerName = `${mock.name} (fallback after provider error: ${(err as Error).message.slice(0, 80)})`;
    text = await mock.complete(systemPromptFor(input.feature), userPromptFor(input));
  }

  if (!usedFallback) {
    await db.aiCache
      .create({ data: { cacheKey, feature: input.feature, provider: providerName, text } })
      .catch(() => undefined);
  }

  return { feature: input.feature, text, provider: providerName, cached: false, disclaimer: AI_DISCLAIMER };
}
