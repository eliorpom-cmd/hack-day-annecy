// Hands a live call to the ElevenLabs agent and records who handled it.
import { db, type Business } from "../db";
import { telEnv } from "./env";
import { sayAndHangup } from "./twiml";
import { logEvent, registerElevenLabsCall } from "./providers";
import { demoSlots, nextSlots, type Busy, type CalendarHour } from "../calendar";
import { isDemoBusiness } from "../demo-voice";
import { formatFrPhone } from "./postcall";

// {{caller_phone}}, {{slot_1}}, {{slot_2}} of the prompt (lib/prompt.ts), plus the slots' dates for the booking
export async function callVariables(business: Business, from: string, now = Date.now()): Promise<Record<string, string>> {
  const [hours, busy] = await Promise.all([
    db().prepare("SELECT weekday, opens, closes FROM business_hours WHERE business_id = ?").bind(business.id).all<CalendarHour>(),
    db().prepare("SELECT starts_at, ends_at FROM appointments WHERE business_id = ? AND ends_at > ?").bind(business.id, Math.floor(now / 1000)).all<Busy>(),
  ]);
  // Demo accounts always offer the two slots of the pitch script
  const demo = await isDemoBusiness(business).catch(() => false);
  const [s1, s2] = demo ? demoSlots(hours.results, busy.results, now) : nextSlots(hours.results, busy.results, now);
  return {
    caller_phone: formatFrPhone(from) || "numéro inconnu",
    slot_1: s1?.label ?? "", slot_2: s2?.label ?? "",
    slot_1_iso: s1?.iso ?? "", slot_2_iso: s2?.iso ?? "",
  };
}

// TwiML connecting the caller to the business's ElevenLabs agent, or a French apology
export async function connectAgent(business: Business, from: string, to: string, callId: string): Promise<string> {
  if (!business.elevenlabs_agent_id) {
    logEvent("warn", "twilio.no_agent", { business: business.id, call: callId });
    await db().prepare("UPDATE calls SET handled_by = 'missed' WHERE id = ?").bind(callId).run();
    return sayAndHangup();
  }
  try {
    const variables = await callVariables(business, from).catch((e) => {
      logEvent("warn", "twilio.call_variables_failed", { business: business.id, error: String(e) });
      return undefined;
    });
    const xml = await registerElevenLabsCall(telEnv().ELEVENLABS_API_KEY, { agentId: business.elevenlabs_agent_id, from, to, variables });
    await db().prepare("UPDATE calls SET handled_by = 'agent' WHERE id = ?").bind(callId).run();
    logEvent("info", "twilio.agent_connected", { business: business.id, call: callId });
    return xml;
  } catch (e) {
    logEvent("error", "twilio.agent_failed", { business: business.id, call: callId, error: String(e) });
    await db().prepare("UPDATE calls SET handled_by = 'missed' WHERE id = ?").bind(callId).run();
    return sayAndHangup();
  }
}
