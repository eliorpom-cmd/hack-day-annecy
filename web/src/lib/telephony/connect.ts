// Hands a live call to the ElevenLabs agent and records who handled it.
import { db, type Business } from "../db";
import { telEnv } from "./env";
import { sayAndHangup } from "./twiml";
import { logEvent, registerElevenLabsCall } from "./providers";

// TwiML connecting the caller to the business's ElevenLabs agent, or a French apology
export async function connectAgent(business: Business, from: string, to: string, callId: string): Promise<string> {
  if (!business.elevenlabs_agent_id) {
    logEvent("warn", "twilio.no_agent", { business: business.id, call: callId });
    await db().prepare("UPDATE calls SET handled_by = 'missed' WHERE id = ?").bind(callId).run();
    return sayAndHangup();
  }
  try {
    const xml = await registerElevenLabsCall(telEnv().ELEVENLABS_API_KEY, { agentId: business.elevenlabs_agent_id, from, to });
    await db().prepare("UPDATE calls SET handled_by = 'agent' WHERE id = ?").bind(callId).run();
    logEvent("info", "twilio.agent_connected", { business: business.id, call: callId });
    return xml;
  } catch (e) {
    logEvent("error", "twilio.agent_failed", { business: business.id, call: callId, error: String(e) });
    await db().prepare("UPDATE calls SET handled_by = 'missed' WHERE id = ?").bind(callId).run();
    return sayAndHangup();
  }
}
