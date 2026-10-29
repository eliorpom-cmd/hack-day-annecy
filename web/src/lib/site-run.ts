// Site, I/O part: loads what the site shows, picks a free slug, asks Workers AI for the headline.
import { env } from "cloudflare:workers";
import { db } from "./db";
import { baseSlug, cleanHeadline, HEADLINE_SYSTEM, headlinePrompt, pickSlug, type SiteBusiness, type SiteFaq, type SiteHour } from "./site";

export type SiteRow = SiteBusiness & { id: string; site_slug: string | null; site_published: number; site_headline: string | null };

const HEADLINE_MODELS = ["@cf/google/gemma-4-26b-a4b-it", "@cf/mistralai/mistral-small-3.1-24b-instruct"] as const;

// FAQs, hours and the answering number (the bought Twilio number) of a business
export async function siteData(businessId: string) {
  const [faqs, hours, number] = await Promise.all([
    db().prepare("SELECT question, answer, kind FROM faqs WHERE business_id = ? ORDER BY created_at, id").bind(businessId).all<SiteFaq>(),
    db().prepare("SELECT weekday, opens, closes FROM business_hours WHERE business_id = ? ORDER BY weekday, opens").bind(businessId).all<SiteHour>(),
    db().prepare("SELECT e164 FROM phone_numbers WHERE business_id = ? AND status = 'live' LIMIT 1").bind(businessId).first<{ e164: string }>(),
  ]);
  return { faqs: faqs.results, hours: hours.results, answeringNumber: number?.e164 ?? null };
}

export async function siteBySlug(slug: string): Promise<SiteRow | null> {
  return db().prepare("SELECT * FROM businesses WHERE site_slug = ? AND site_published = 1").bind(slug).first<SiteRow>();
}

// Keeps the current slug; otherwise the first free one built from the name
export async function freeSlug(b: SiteRow): Promise<string> {
  if (b.site_slug) return b.site_slug;
  const base = baseSlug(b);
  const { results } = await db().prepare("SELECT site_slug FROM businesses WHERE (site_slug = ? OR site_slug LIKE ?) AND id != ?")
    .bind(base, `${base}-%`, b.id).all<{ site_slug: string }>();
  return pickSlug(base, results.map((r) => r.site_slug));
}

// One short sentence from the documentation; null when the model is missing or answers badly
export async function aiHeadline(b: SiteBusiness, faqs: SiteFaq[]): Promise<string | null> {
  const ai = (env as unknown as { AI?: Ai }).AI;
  if (!ai) return null;
  for (const model of HEADLINE_MODELS) {
    try {
      const out = await (ai.run as (m: string, i: unknown) => Promise<unknown>)(model, {
        messages: [{ role: "system", content: HEADLINE_SYSTEM }, { role: "user", content: headlinePrompt(b, faqs) }],
        chat_template_kwargs: { enable_thinking: false },
        max_tokens: 80,
        temperature: 0.4,
      });
      const o = out as { response?: unknown; choices?: { message?: { content?: unknown } }[] };
      const line = cleanHeadline(o.response ?? o.choices?.[0]?.message?.content ?? null);
      if (line) return line;
    } catch (e) {
      console.log(JSON.stringify({ event: "site.headline_error", model, error: String(e).slice(0, 200) }));
    }
  }
  return null;
}
