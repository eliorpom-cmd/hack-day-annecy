import type { APIRoute } from "astro";
import { requireBusiness } from "../../../lib/env";
import { AI_FAILED_HINT, DESCRIPTION_SYSTEM, descriptionPrompt, parseDescription, PREVIOUS_MAX } from "../../../lib/google.ts";
import { factsFor, generate, limit } from "../../../lib/google-run";
import { fail, handle, isRecord, json } from "../../../lib/http";
import { isDemoAccount } from "../../../lib/demo-voice";
import { demoDescriptionRaw } from "../../../lib/demo-content";

// Writes the Google profile description; {previous} asks for a different version
export const POST: APIRoute = handle(async ({ locals, request }) => {
  const b = requireBusiness(locals);
  const body = await request.json().catch(() => ({}));
  const previous = isRecord(body) && typeof body.previous === "string" ? body.previous.slice(0, PREVIOUS_MAX) : "";
  const facts = await factsFor(b);
  // Demo: written in advance (two versions), no AI call
  if (isDemoAccount(locals.user)) {
    const first = parseDescription(demoDescriptionRaw(b), facts);
    const text = previous && previous === first ? parseDescription(demoDescriptionRaw(b, true), facts) : first;
    if (text) return json({ description: text, length: text.length });
  }
  limit(b.id);
  const text = await generate(DESCRIPTION_SYSTEM, descriptionPrompt(facts, previous), (d) => parseDescription(d, facts), { temperature: previous ? 0.7 : 0.5 });
  if (!text) return fail(502, "ai_failed", AI_FAILED_HINT);
  return json({ description: text, length: text.length });
});
