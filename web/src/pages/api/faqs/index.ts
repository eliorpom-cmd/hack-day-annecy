import type { APIRoute } from "astro";
import { validateFaq, type Faq } from "../../../lib/business";
import { db } from "../../../lib/db";
import { requireBusiness } from "../../../lib/env";
import { handle, HttpError, json, readJson } from "../../../lib/http";
import { newId } from "../../../lib/tokens";

export const GET: APIRoute = handle(async ({ locals }) => {
  const business = requireBusiness(locals);
  const { results } = await db().prepare("SELECT id, question, answer, kind, created_at FROM faqs WHERE business_id = ? ORDER BY kind, created_at")
    .bind(business.id).all<Faq>();
  return json({ faqs: results });
});

// Creates one FAQ, or several at once with {faqs: [...]} (used after the website scan)
export const POST: APIRoute = handle(async ({ request, locals }) => {
  const business = requireBusiness(locals);
  const body = await readJson<Record<string, unknown>>(request);
  const many = Array.isArray(body?.faqs);
  const items = many ? (body.faqs as unknown[]) : [body];
  if (items.length > 50) throw new HttpError(400, "too_many", "50 questions maximum par envoi.");
  const valid = items.map(validateFaq);
  const bad = valid.find((v) => !v.ok);
  if (bad && !bad.ok) throw new HttpError(400, "invalid_faq", bad.hint);
  const created: Faq[] = [];
  for (const v of valid) {
    if (!v.ok) continue;
    const faq = await db().prepare("INSERT INTO faqs (id, business_id, question, answer, kind) VALUES (?, ?, ?, ?, ?) RETURNING id, question, answer, kind, created_at")
      .bind(newId(), business.id, v.value.question, v.value.answer, v.value.kind).first<Faq>();
    if (faq) created.push(faq);
  }
  return json(many ? { faqs: created } : { faq: created[0] }, 201);
});
