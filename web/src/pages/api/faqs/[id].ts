import type { APIRoute } from "astro";
import { validateFaq, type Faq } from "../../../lib/business";
import { db } from "../../../lib/db";
import { requireBusiness } from "../../../lib/env";
import { handle, HttpError, json, readJson } from "../../../lib/http";

const notFound = () => new HttpError(404, "not_found", "Cette question n'existe pas ou n'appartient pas à votre entreprise.");

// Every query is scoped to the session's business: an id from another business is a 404
export const PUT: APIRoute = handle(async ({ request, locals, params }) => {
  const business = requireBusiness(locals);
  const v = validateFaq(await readJson(request));
  if (!v.ok) throw new HttpError(400, "invalid_faq", v.hint);
  const faq = await db().prepare("UPDATE faqs SET question = ?, answer = ?, kind = ? WHERE id = ? AND business_id = ? RETURNING id, question, answer, kind, created_at")
    .bind(v.value.question, v.value.answer, v.value.kind, params.id ?? "", business.id).first<Faq>();
  if (!faq) throw notFound();
  return json({ faq });
});

export const DELETE: APIRoute = handle(async ({ locals, params }) => {
  const business = requireBusiness(locals);
  const res = await db().prepare("DELETE FROM faqs WHERE id = ? AND business_id = ?").bind(params.id ?? "", business.id).run();
  if (!res.meta.changes) throw notFound();
  return new Response(null, { status: 204 });
});
