import type { APIRoute } from "astro";
import { db } from "../../../lib/db";
import { requireBusiness } from "../../../lib/env";
import { handle, HttpError, json, readJson } from "../../../lib/http";
import { normalizeE164 } from "../../../lib/phone";
import { newId } from "../../../lib/tokens";
import { businessDisplayName } from "../../../lib/greeting";
import { canTakeOverNumber } from "../../../lib/demo-setup";
import { configureNumber, listOwnedNumbers, purchaseNumber, voiceWebhook } from "../../../lib/twilio";

type PhoneRow = { id: string; e164: string; twilio_sid: string | null; status: string };

// The business's own numbers
export const GET: APIRoute = handle(async ({ locals }) => {
  const b = requireBusiness(locals);
  const { results } = await db().prepare("SELECT id, e164, twilio_sid, status FROM phone_numbers WHERE business_id = ?").bind(b.id).all<PhoneRow>();
  return json({ numbers: results });
});

// Attaches a number to the business: reuses it if the Twilio account already owns it, buys it otherwise.
// Either way its VoiceUrl is pointed at /api/twilio/voice.
export const POST: APIRoute = handle(async ({ request, locals }) => {
  const b = requireBusiness(locals);
  const body = await readJson<{ e164?: unknown }>(request);
  const e164 = typeof body?.e164 === "string" ? normalizeE164(body.e164) : null;
  if (!e164) throw new HttpError(400, "invalid_number", "Numéro invalide : envoyez-le au format +33…");

  const taken = await db().prepare(
    "SELECT p.business_id, u.id AS owner_id, u.email AS owner_email FROM phone_numbers p JOIN businesses b ON b.id = p.business_id JOIN users u ON u.id = b.owner_id WHERE p.e164 = ?",
  ).bind(e164).first<{ business_id: string; owner_id: string; owner_email: string }>();
  // Demo setup: a new trial account takes the number back from an earlier demo run (lib/demo-setup.ts)
  const takeOver = !!taken && taken.business_id !== b.id && !!locals.user &&
    canTakeOverNumber(locals.user, { id: taken.owner_id, email: taken.owner_email });
  if (taken && taken.business_id !== b.id && !takeOver) throw new HttpError(409, "number_taken", "Ce numéro est déjà utilisé par une autre entreprise.");

  const hook = voiceWebhook();
  const owned = (await listOwnedNumbers()).find((n) => n.e164 === e164);
  const twilioNumber = owned ? await configureNumber(owned.sid, hook.url) : await purchaseNumber(e164, hook.url, businessDisplayName(b) || "Assistant artisan");

  const number = await db().prepare(
    `INSERT INTO phone_numbers (id, business_id, e164, twilio_sid, status) VALUES (?, ?, ?, ?, 'live')
     ON CONFLICT(e164) DO UPDATE SET twilio_sid = excluded.twilio_sid, status = 'live'${takeOver ? ", business_id = excluded.business_id" : ""} RETURNING id, e164, twilio_sid, status`,
  ).bind(newId(), b.id, twilioNumber.e164, twilioNumber.sid).first<PhoneRow>();
  // Moving on in the onboarding once a number is live
  if (b.onboarding_step === "number") await db().prepare("UPDATE businesses SET onboarding_step = 'done' WHERE id = ?").bind(b.id).run();
  return json({ number, purchased: !owned, ...(hook.warning ? { warning: hook.warning } : {}) }, 201);
});
