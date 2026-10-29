// Twilio <Dial action>: the artisan's phone stopped ringing. Answered → done, else the AI agent.
import type { APIRoute } from "astro";
import { db, type Business } from "../../../lib/db";
import { telEnv } from "../../../lib/telephony/env";
import { checkToken } from "../../../lib/telephony/signature";
import { artisanMissed, hangup, sayAndHangup, twimlResponse } from "../../../lib/telephony/twiml";
import { logEvent } from "../../../lib/telephony/providers";
import { connectAgent } from "../../../lib/telephony/connect";

export const POST: APIRoute = async ({ request, url }) => {
  if (!checkToken(url.searchParams.get("token"), telEnv().TWILIO_WEBHOOK_TOKEN)) {
    return new Response("Forbidden", { status: 403 });
  }
  const callId = url.searchParams.get("call") ?? "";
  const form = await request.formData();
  const status = String(form.get("DialCallStatus") ?? "");
  const to = String(form.get("To") ?? "");
  const from = String(form.get("From") ?? "");

  const business = await db().prepare(
    "SELECT b.* FROM calls c JOIN businesses b ON b.id = c.business_id WHERE c.id = ?",
  ).bind(callId).first<Business>();
  if (!business) {
    logEvent("warn", "twilio.fallback_unknown_call", { call: callId });
    return twimlResponse(sayAndHangup());
  }

  if (status === "completed" || status === "answered") {
    await db().prepare("UPDATE calls SET handled_by = 'artisan' WHERE id = ?").bind(callId).run();
    logEvent("info", "twilio.artisan_answered", { call: callId });
    return twimlResponse(hangup());
  }
  if (!artisanMissed(status)) logEvent("warn", "twilio.fallback_unknown_status", { call: callId, status });
  return twimlResponse(await connectAgent(business, from, to, callId));
};
