// Pure parsing of the ElevenLabs post-call webhook and SMS text.
import { URGENCY_VALUES, type Urgency } from "./agent-config.ts";

export type ParsedPostCall = {
  agentId: string;
  conversationId: string;
  summary: string | null;
  transcript: { role: string; message: string; t: number | null }[];
  durationS: number | null;
  callerNumber: string | null;
  callSid: string | null;
  lead: { name: string | null; phone: string | null; address: string | null; need: string | null; urgency: Urgency };
};

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj => (v && typeof v === "object" ? (v as Obj) : {});
const str = (v: unknown): string | null => {
  if (typeof v === "number") return String(v);
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s && !["null", "none", "unknown", "inconnu"].includes(s.toLowerCase()) ? s : null;
};

export function normalizeUrgency(v: unknown): Urgency {
  const s = (str(v) ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  return (URGENCY_VALUES as readonly string[]).includes(s) ? (s as Urgency) : "normal";
}

// Returns null when the payload is not a usable post_call_transcription event
export function parsePostCall(payload: unknown): ParsedPostCall | null {
  const p = obj(payload);
  if (p.type !== "post_call_transcription") return null;
  const d = obj(p.data);
  const agentId = str(d.agent_id), conversationId = str(d.conversation_id);
  if (!agentId || !conversationId) return null;
  const analysis = obj(d.analysis), meta = obj(d.metadata), phoneCall = obj(meta.phone_call);
  const dyn = obj(obj(d.conversation_initiation_client_data).dynamic_variables);
  const results = obj(analysis.data_collection_results);
  const field = (k: string) => str(obj(results[k]).value);
  const callerNumber = str(phoneCall.external_number) ?? str(dyn.system__caller_id);
  const duration = Number(meta.call_duration_secs);
  const transcript = (Array.isArray(d.transcript) ? d.transcript : [])
    .map(obj)
    .filter((t) => typeof t.message === "string" && t.message)
    .map((t) => ({ role: String(t.role ?? ""), message: String(t.message), t: typeof t.time_in_call_secs === "number" ? t.time_in_call_secs : null }));
  return {
    agentId, conversationId,
    summary: str(analysis.transcript_summary),
    transcript,
    durationS: Number.isFinite(duration) ? Math.round(duration) : null,
    callerNumber,
    callSid: str(phoneCall.call_sid) ?? str(dyn.system__call_sid),
    lead: {
      name: field("name"),
      phone: field("phone") ?? callerNumber,
      address: field("address"),
      need: field("need"),
      urgency: normalizeUrgency(field("urgency")),
    },
  };
}

export const SMS_MAX = 300;

// Short French alert for the artisan, never longer than SMS_MAX characters
export function buildUrgentSms(lead: { name: string | null; phone: string | null; need: string | null }): string {
  const head = `URGENCE – ${lead.name ?? "Client"} (${lead.phone ?? "numéro inconnu"}) : `;
  const tail = ". Rappelez vite.";
  let need = (lead.need ?? "besoin non précisé").replace(/\s+/g, " ").replace(/[.\s]+$/, "");
  const room = SMS_MAX - head.length - tail.length;
  if (room <= 1) return (head + need).slice(0, SMS_MAX - 1) + "…";
  if (need.length > room) need = need.slice(0, room - 1) + "…";
  return head + need + tail;
}
