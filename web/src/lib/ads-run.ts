// « Publicités », I/O part: rate limit and storage in D1, ad writing with Workers AI (askJson).
import { askJson } from "./ai";
import { db } from "./db";
import { HttpError } from "./http";
import {
  adPrompt, buildGoogleDraft, buildMetaDraft, callDestination, GOOGLE_SYSTEM, LIMITS, mergeRaw, META_SYSTEM, parseDraft,
  rateCheck, retryHint, tooLongTexts, type AdBusiness, type AdChannel, type AdFaq, type GoogleDraft, type MetaDraft,
} from "./ads";
import { siteData } from "./site-run";
import { appUrl } from "./env";

export type AdsBusiness = AdBusiness & { id: string; artisan_phone: string | null; site_slug?: string | null; site_published?: number };

// Latest successful draft of each channel
export async function latestDrafts(businessId: string): Promise<{ google: GoogleDraft | null; meta: MetaDraft | null }> {
  const { results } = await db().prepare(
    "SELECT channel, data FROM ad_drafts WHERE business_id = ? AND data IS NOT NULL AND id IN (SELECT MAX(id) FROM ad_drafts WHERE business_id = ? AND data IS NOT NULL GROUP BY channel)",
  ).bind(businessId, businessId).all<{ channel: AdChannel; data: string }>();
  const row = (c: AdChannel) => results.find((r) => r.channel === c)?.data ?? null;
  return { google: parseDraft("google", row("google")) as GoogleDraft | null, meta: parseDraft("meta", row("meta")) as MetaDraft | null };
}

// Where calls land and which link the Google ad opens (live, so a number bought later shows up)
export async function adTargets(b: AdsBusiness, answeringNumber?: string | null) {
  const answering = answeringNumber !== undefined ? answeringNumber : (await siteData(b.id)).answeringNumber;
  const phone = callDestination(answering, b.artisan_phone);
  const siteUrl = b.site_published && b.site_slug ? `${appUrl()}/site/${b.site_slug}` : null;
  return { phone, siteUrl };
}

// Reserves one generation slot, or throws a 429 with a French hint
async function reserveSlot(businessId: string, channel: AdChannel): Promise<number> {
  const now = Math.floor(Date.now() / 1000);
  const { results } = await db().prepare("SELECT created_at FROM ad_drafts WHERE business_id = ? AND created_at > ?")
    .bind(businessId, now - 3600).all<{ created_at: number }>();
  const r = rateCheck(results.map((x) => x.created_at), now);
  if (!r.ok) throw new HttpError(429, "rate_limited", retryHint(r.retryAfterSec), { retry_after: r.retryAfterSec });
  const row = await db().prepare("INSERT INTO ad_drafts (business_id, channel, created_at) VALUES (?, ?, ?) RETURNING id")
    .bind(businessId, channel, now).first<{ id: number }>();
  return row!.id;
}

const FIELDS = {
  google: { headlines: LIMITS.googleHeadline, descriptions: LIMITS.googleDescription },
  meta: { primary_text: LIMITS.metaPrimary, headline: LIMITS.metaHeadline },
} as const;

// Writes one draft: a first answer, a second one if some texts were too long, then fallbacks
export async function generateDraft(b: AdsBusiness, channel: AdChannel): Promise<GoogleDraft | MetaDraft> {
  const slot = await reserveSlot(b.id, channel);
  const { faqs } = await siteData(b.id);
  const f = faqs as AdFaq[];
  const system = channel === "google" ? GOOGLE_SYSTEM : META_SYSTEM;
  const build = (raw: Record<string, unknown> | null) => (channel === "google" ? buildGoogleDraft(raw, b) : buildMetaDraft(raw, b, f));

  const first = await askJson(system, adPrompt(b, f), { maxTokens: 900, temperature: 0.5 });
  let raw = first.data;
  if (raw && build(raw).overflow > 0) {
    const second = await askJson(system, adPrompt(b, f, tooLongTexts(raw, FIELDS[channel])), { maxTokens: 900, temperature: 0.4 });
    raw = mergeRaw(raw, second.data);
  }
  if (!raw) {
    console.log(JSON.stringify({ event: "ads.ai_error", channel, error: String(first.error).slice(0, 200) }));
    throw new HttpError(502, "ai_failed", "L’annonce n’a pas pu être écrite. Réessayez dans un instant.");
  }
  const { draft } = build(raw);
  await db().prepare("UPDATE ad_drafts SET data = ? WHERE id = ?").bind(JSON.stringify(draft), slot).run();
  return draft;
}
