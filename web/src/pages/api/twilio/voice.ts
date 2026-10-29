// Twilio incoming-call webhook: ring the artisan during working hours, otherwise the AI agent.
import type { APIRoute } from "astro";
import { db, type Business } from "../../../lib/db";
import { newId } from "../../../lib/tokens";
import { telEnv } from "../../../lib/telephony/env";
import { isWithinHours, type HoursRow } from "../../../lib/telephony/hours";
import { checkToken } from "../../../lib/telephony/signature";
import { dialArtisan, sayAndHangup, twimlResponse } from "../../../lib/telephony/twiml";
import { logEvent } from "../../../lib/telephony/providers";
import { connectAgent } from "../../../lib/telephony/connect";

export const POST: APIRoute = async ({ request, url }) => {
  const token = url.searchParams.get("token");
  if (!checkToken(token, telEnv().TWILIO_WEBHOOK_TOKEN)) return new Response("Forbidden", { status: 403 });

  const form = await request.formData();
  const to = String(form.get("To") ?? "");
  const from = String(form.get("From") ?? "");
  const callSid = String(form.get("CallSid") ?? "") || null;

  const business = await db().prepare(
    "SELECT b.* FROM phone_numbers p JOIN businesses b ON b.id = p.business_id WHERE p.e164 = ? AND p.status = 'live'",
  ).bind(to).first<Business>();
  if (!business) {
    logEvent("warn", "twilio.unknown_number", { to });
    return twimlResponse(sayAndHangup());
  }

  const { results: hours } = await db().prepare(
    "SELECT weekday, opens, closes FROM business_hours WHERE business_id = ?",
  ).bind(business.id).all<HoursRow>();
  const ringArtisan = !!business.artisan_phone && isWithinHours(hours, new Date());

  // 'missed' until the dial outcome (fallback) or the agent says otherwise
  const callId = newId();
  await db().prepare(
    "INSERT INTO calls (id, business_id, from_number, twilio_call_sid, handled_by) VALUES (?, ?, ?, ?, ?)",
  ).bind(callId, business.id, from || null, callSid, ringArtisan ? "missed" : "agent").run();

  if (ringArtisan) {
    const action = `/api/twilio/fallback?token=${encodeURIComponent(token!)}&call=${encodeURIComponent(callId)}`;
    logEvent("info", "twilio.ring_artisan", { business: business.id, call: callId });
    return twimlResponse(dialArtisan(business.artisan_phone!, business.ring_seconds, action));
  }

  return twimlResponse(await connectAgent(business, from, to, callId));
};
