import type { APIRoute } from "astro";
import { db } from "../../../lib/db";
import { requireBusiness, secret } from "../../../lib/env";
import { handle, HttpError, json } from "../../../lib/http";
import { sendCallNotification } from "../../../lib/telephony/providers";
import { enqueueWhatsApp } from "../../../lib/telephony/whatsapp-relay";

// Test message to the artisan's own mobile, through the same path as the post-call notification
// (WhatsApp relay outbox when WHATSAPP_RELAY_TOKEN is set, else Twilio WhatsApp, else SMS) → {channel, id}
export const POST: APIRoute = handle(async ({ locals }) => {
  const b = requireBusiness(locals);
  if (!b.artisan_phone) throw new HttpError(400, "no_phone", "Indiquez votre portable dans les réglages, puis réessayez.");
  const body = "🟢 Test du répondeur : les messages après chaque appel arriveront ici.";
  const result = await sendCallNotification(
    {
      accountSid: secret("TWILIO_ACCOUNT_SID"), authToken: secret("TWILIO_API_KEY_SECRET") || secret("TWILIO_AUTH_TOKEN"),
      apiKeySid: secret("TWILIO_API_KEY_SID"), smsFrom: secret("TWILIO_SMS_FROM"), whatsappFrom: secret("TWILIO_WHATSAPP_FROM"),
    },
    b.artisan_phone,
    body,
    secret("WHATSAPP_RELAY_TOKEN") ? (to, text) => enqueueWhatsApp(db(), { businessId: b.id, leadId: null, to, body: text }) : undefined,
  );
  return json({ ...result, to: b.artisan_phone });
});

// Where a test message queued for the relay stands: ?id= → {sent_at, error}
export const GET: APIRoute = handle(async ({ locals, url }) => {
  const b = requireBusiness(locals);
  const row = await db().prepare("SELECT created_at, sent_at, error FROM whatsapp_outbox WHERE id = ? AND business_id = ?")
    .bind(url.searchParams.get("id") ?? "", b.id).first();
  if (!row) throw new HttpError(404, "not_found", "Message introuvable.");
  return json(row);
});
