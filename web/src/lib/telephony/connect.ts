// Hands a live call to the ElevenLabs agent and records who handled it.
import { db, type Business } from "../db";
import { telEnv } from "./env";
import { sayAndHangup } from "./twiml";
import { logEvent, registerElevenLabsCall } from "./providers";
import { demoSlots, nextSlots, todayLabel, type Busy, type CalendarHour } from "../calendar";
import { isDemoBusiness } from "../demo-voice";
import { demoCallAgentId } from "../demo-agent";
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
    today: todayLabel(now),
    slot_1: s1?.label ?? "", slot_2: s2?.label ?? "",
    slot_1_iso: s1?.iso ?? "", slot_2_iso: s2?.iso ?? "",
  };
}

// TwiML connecting the caller to the business's ElevenLabs agent, or a French apology
export async function connectAgent(business: Business, from: string, to: string, callId: string): Promise<string> {
  // Demo accounts: the agent tuned by hand on ElevenLabs (lib/demo-agent.ts), unless switched back to the app's
  const demo = await isDemoBusiness(business).catch(() => false);
  const finalId = demo ? await demoCallAgentId().catch(() => null) : null;
  const agentId = finalId ?? business.elevenlabs_agent_id;
  if (!agentId) {
    logEvent("warn", "twilio.no_agent", { business: business.id, call: callId });
    await db().prepare("UPDATE calls SET handled_by = 'missed' WHERE id = ?").bind(callId).run();
    return sayAndHangup();
  }
  try {
    const variables = await callVariables(business, from).catch((e) => {
      logEvent("warn", "twilio.call_variables_failed", { business: business.id, error: String(e) });
      return undefined;
    });
    const key = telEnv().ELEVENLABS_API_KEY;
    // If ElevenLabs refuses the variables (an agent that does not declare them), the call still goes through without
    const xml = await registerElevenLabsCall(key, { agentId, from, to, variables }).catch((e) => {
      if (!variables) throw e;
      logEvent("warn", "twilio.register_call_retry_without_variables", { business: business.id, error: String(e) });
      return registerElevenLabsCall(key, { agentId, from, to });
    });
    await db().prepare("UPDATE calls SET handled_by = 'agent' WHERE id = ?").bind(callId).run();
    logEvent("info", "twilio.agent_connected", { business: business.id, call: callId, agent: agentId, final: !!finalId });
    return xml;
  } catch (e) {
    logEvent("error", "twilio.agent_failed", { business: business.id, call: callId, error: String(e) });
    await db().prepare("UPDATE calls SET handled_by = 'missed' WHERE id = ?").bind(callId).run();
    return sayAndHangup();
  }
}
