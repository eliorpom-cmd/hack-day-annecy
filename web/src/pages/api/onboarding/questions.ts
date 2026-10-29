import type { APIRoute } from "astro";
import { db } from "../../../lib/db";
import { requireBusiness } from "../../../lib/env";
import { handle, isRecord, json, readJson } from "../../../lib/http";
import type { InterviewContext } from "../../../lib/interview";
import { interviewQuestions } from "../../../lib/interview-run";

const text = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : undefined);

// Questions the répondeur asks the artisan after the scan or the manual form: what clients ask that his site
// does not answer. Body (optional) = the record being filled and the FAQs found; else the saved record is used.
export const POST: APIRoute = handle(async ({ request, locals }) => {
  const b = requireBusiness(locals);
  const body = await readJson<Record<string, unknown>>(request).catch(() => null);
  const given = isRecord(body?.business) ? (body.business as Record<string, unknown>) : {};
  const sent = Array.isArray(body?.faqs) ? (body.faqs as unknown[]) : null;
  const faqs = sent
    ? sent.filter(isRecord).slice(0, 60).map((f) => ({ question: text(f.question, 300) ?? "", answer: text(f.answer, 500) ?? "" }))
    : (await db().prepare("SELECT question, answer FROM faqs WHERE business_id = ?").bind(b.id).all<{ question: string; answer: string }>()).results;
  const context: InterviewContext = {
    name: text(given.name, 120) ?? b.name,
    trade: text(given.trade, 80) ?? b.trade,
    city: text(given.city, 80) ?? b.city,
    description: text(given.description, 2000) ?? b.description,
    faqs: faqs.filter((f) => f.question.trim()),
  };
  const { questions, model } = await interviewQuestions(context);
  return json({ questions, source: { ai_model: model } });
});
