// ElevenLabs post-call webhook: store the call and the lead, text the artisan on emergencies.
import type { APIRoute } from "astro";
import { db, type Business } from "../../../lib/db";
import { newId } from "../../../lib/tokens";
import { telEnv } from "../../../lib/telephony/env";
import { verifyElevenLabsSignature } from "../../../lib/telephony/signature";
import { buildUrgentSms, parsePostCall } from "../../../lib/telephony/postcall";
import { logEvent, sendTwilioSms } from "../../../lib/telephony/providers";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

export const POST: APIRoute = async ({ request }) => {
  const raw = await request.text();
  const env = telEnv();
  if (!(await verifyElevenLabsSignature(request.headers.get("ElevenLabs-Signature"), raw, env.ELEVENLABS_WEBHOOK_SECRET))) {
    logEvent("warn", "elevenlabs.bad_signature", { configured: !!env.ELEVENLABS_WEBHOOK_SECRET });
    return json({ error: "invalid signature" }, 401);
  }

  let payload: unknown;
  try { payload = JSON.parse(raw); } catch { return json({ error: "invalid json" }, 400); }
  const call = parsePostCall(payload);
  // Other event types (audio, failures) are acknowledged and ignored
  if (!call) return json({ ok: true, ignored: true });

  const business = await db().prepare("SELECT * FROM businesses WHERE elevenlabs_agent_id = ?")
    .bind(call.agentId).first<Business>();
  if (!business) {
    logEvent("warn", "elevenlabs.unknown_agent", { agent: call.agentId });
    return json({ ok: true, ignored: true });
  }

  // Match the row created by the Twilio webhook, else a previous delivery, else create one
  const existing = await db().prepare(
    `SELECT id FROM calls WHERE business_id = ?1 AND (conversation_id = ?2 OR (?3 IS NOT NULL AND twilio_call_sid = ?3))
     ORDER BY conversation_id = ?2 DESC LIMIT 1`,
  ).bind(business.id, call.conversationId, call.callSid).first<{ id: string }>();
  const callId = existing?.id ?? newId();
  const transcript = JSON.stringify(call.transcript);
  if (existing) {
    await db().prepare(
      `UPDATE calls SET conversation_id = ?, summary = ?, transcript = ?, duration_s = ?, urgency = ?, handled_by = 'agent',
       from_number = COALESCE(from_number, ?) WHERE id = ?`,
    ).bind(call.conversationId, call.summary, transcript, call.durationS, call.lead.urgency, call.callerNumber, callId).run();
  } else {
    await db().prepare(
      `INSERT INTO calls (id, business_id, from_number, twilio_call_sid, conversation_id, handled_by, urgency, duration_s, summary, transcript)
       VALUES (?, ?, ?, ?, ?, 'agent', ?, ?, ?, ?)`,
    ).bind(callId, business.id, call.callerNumber, call.callSid, call.conversationId, call.lead.urgency, call.durationS, call.summary, transcript).run();
  }

  // One lead per call: ElevenLabs may retry the webhook
  const hadLead = await db().prepare("SELECT id FROM leads WHERE call_id = ?").bind(callId).first<{ id: string }>();
  let leadId = hadLead?.id ?? null;
  if (!leadId) {
    leadId = newId();
    const { name, phone, address, need, urgency } = call.lead;
    await db().prepare(
      "INSERT INTO leads (id, business_id, call_id, name, phone, address, need, urgency) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    ).bind(leadId, business.id, callId, name, phone, address, need ?? call.summary, urgency).run();
  }

  let sms: "sent" | "failed" | "skipped" = "skipped";
  if (!hadLead && call.lead.urgency === "urgence" && business.artisan_phone) {
    try {
      const sid = await sendTwilioSms(
        { accountSid: env.TWILIO_ACCOUNT_SID, authToken: env.TWILIO_AUTH_TOKEN, smsFrom: env.TWILIO_SMS_FROM },
        business.artisan_phone, buildUrgentSms(call.lead),
      );
      sms = "sent";
      logEvent("info", "twilio.urgent_sms_sent", { call: callId, sid });
    } catch (e) {
      sms = "failed";
      logEvent("error", "twilio.urgent_sms_failed", { call: callId, error: String(e) });
    }
  }

  logEvent("info", "elevenlabs.post_call_saved", { business: business.id, call: callId, lead: leadId, sms });
  return json({ ok: true, call_id: callId, lead_id: leadId, sms });
};
