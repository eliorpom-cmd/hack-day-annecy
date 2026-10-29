// « Fiche Google », I/O part: loads the facts of a business, applies the rate limit, calls Workers AI.
import { askJson } from "./ai";
import type { Business } from "./db";
import { googleFacts, rateHint, rateStore, takeToken, type GoogleFacts } from "./google.ts";
import { HttpError } from "./http";
import { siteData } from "./site-run";

export async function factsFor(b: Business): Promise<GoogleFacts> {
  const { faqs, hours, answeringNumber } = await siteData(b.id);
  return googleFacts({ business: b, faqs, hours, answeringNumber });
}

// 20 generations per hour per business, all generators together
export function limit(businessId: string): void {
  const t = takeToken(rateStore, businessId, Date.now());
  if (!t.ok) throw new HttpError(429, "rate_limited", rateHint(t.retryInMin));
}

// One model call, parsed by `parse`; one more try when the answer is unusable
export async function generate<T>(system: string, user: string, parse: (d: Record<string, unknown> | null) => T | null, opts: { temperature?: number; maxTokens?: number } = {}): Promise<T | null> {
  for (let i = 0; i < 2; i++) {
    const out = await askJson(system, user, { temperature: (opts.temperature ?? 0.5) + i * 0.15, maxTokens: opts.maxTokens ?? 900 });
    const v = parse(out.data);
    if (v) return v;
    console.log(JSON.stringify({ event: "google.ai_unusable", model: out.model, error: out.error ?? null, attempt: i + 1 }));
  }
  return null;
}
