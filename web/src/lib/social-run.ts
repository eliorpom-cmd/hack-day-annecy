// « Réseaux sociaux », I/O part: topic data from calls and documentation, post history, generation.
import { db } from "./db";
import { askJson } from "./ai";
import {
  buildPostPrompt, buildTopics, finalizePost, isRateLimited, POST_SYSTEM, serviceLabel,
  type Network, type PostBusiness, type Topic, type TopicFaq, type TopicLead,
} from "./social";

export type SocialPost = { id: string; network: Network; topic: string; body: string; created_at: number };

async function faqsOf(businessId: string): Promise<TopicFaq[]> {
  const { results } = await db().prepare("SELECT question, kind FROM faqs WHERE business_id = ? ORDER BY created_at, id").bind(businessId).all<TopicFaq>();
  return results ?? [];
}

// Chips under « Sujet »: recent calls (anonymised), season, services, before/after
export async function topicsFor(b: { id: string; trade: string }, now = new Date()): Promise<Topic[]> {
  const [leads, faqs] = await Promise.all([
    db().prepare("SELECT name, address, subject, need FROM leads WHERE business_id = ? ORDER BY created_at DESC LIMIT 20").bind(b.id).all<TopicLead>(),
    faqsOf(b.id),
  ]);
  return buildTopics({ leads: leads.results ?? [], faqs, date: now, trade: b.trade });
}

export async function recentPosts(businessId: string, limit = 5): Promise<SocialPost[]> {
  const { results } = await db().prepare(
    "SELECT id, network, topic, body, created_at FROM social_posts WHERE business_id = ? ORDER BY created_at DESC, rowid DESC LIMIT ?",
  ).bind(businessId, limit).all<SocialPost>();
  return results ?? [];
}

export async function rateLimited(businessId: string): Promise<boolean> {
  const now = Math.floor(Date.now() / 1000);
  const { results } = await db().prepare("SELECT created_at FROM social_posts WHERE business_id = ? AND created_at > ?")
    .bind(businessId, now - 86400).all<{ created_at: number }>();
  return isRateLimited((results ?? []).map((r) => r.created_at), now);
}

type GenBusiness = PostBusiness & { id: string; artisan_phone: string | null };

// Writes one post with Workers AI (or from `prepared`, a demo answer: lib/demo-content.ts), stores it, keeps the
// 50 newest per business. Null when the AI fails. `topic` comes from parsePostRequest, already scrubbed of contact details
export async function generatePost(b: GenBusiness, network: Network, topic: string, prepared?: Record<string, unknown>): Promise<SocialPost | null> {
  const [faqs, number] = await Promise.all([
    faqsOf(b.id),
    db().prepare("SELECT e164 FROM phone_numbers WHERE business_id = ? AND status = 'live' LIMIT 1").bind(b.id).first<{ e164: string }>(),
  ]);
  const services = faqs.map((f) => serviceLabel(f.question)).filter((s): s is string => !!s);
  const prompt = buildPostPrompt(b, topic, network, services);
  let body: string | null = null;
  let model: string | null = null;
  if (prepared) {
    body = finalizePost(network, prepared, { business: b, context: `${prompt}\n${String(prepared.text ?? "")}`, phone: number?.e164 ?? b.artisan_phone });
    model = "demo";
  }
  for (let attempt = 0; attempt < 2 && !body; attempt++) {
    const res = await askJson(POST_SYSTEM, prompt, { maxTokens: 700, temperature: 0.7 });
    if (!res.data) console.log(JSON.stringify({ event: "social.ai_error", error: String(res.error).slice(0, 200) }));
    body = finalizePost(network, res.data, { business: b, context: prompt, phone: number?.e164 ?? b.artisan_phone });
    model = res.model;
  }
  if (!body) return null;
  const id = crypto.randomUUID();
  const row = await db().prepare(
    "INSERT INTO social_posts (id, business_id, network, topic, body, model) VALUES (?, ?, ?, ?, ?, ?) RETURNING id, network, topic, body, created_at",
  ).bind(id, b.id, network, topic.slice(0, 200), body, model).first<SocialPost>();
  await db().prepare(
    "DELETE FROM social_posts WHERE business_id = ? AND id NOT IN (SELECT id FROM social_posts WHERE business_id = ? ORDER BY created_at DESC LIMIT 50)",
  ).bind(b.id, b.id).run();
  return row;
}
