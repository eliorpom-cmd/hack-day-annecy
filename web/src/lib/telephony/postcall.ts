// Pure parsing of the ElevenLabs post-call webhook and the call notification text.
import { URGENCY_VALUES, type Urgency } from "./agent-config.ts";
import { pickedSlot } from "../calendar.ts";

export type ParsedPostCall = {
  agentId: string;
  conversationId: string;
  summary: string | null;
  transcript: { role: string; message: string; t: number | null }[];
  durationS: number | null;
  callerNumber: string | null;
  callSid: string | null;
  lead: {
    name: string | null;
    phone: string | null;
    address: string | null;
    need: string | null;
    urgency: Urgency;
    urgencyReason: string | null;
    subject: string | null;
    // Slot booked during the call ({{slot_1}} or {{slot_2}} picked by the caller)
    appointment: { iso: string; label: string } | null;
  };
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
  const slots = [1, 2].map((n) => ({ iso: str(dyn[`slot_${n}_iso`]), label: str(dyn[`slot_${n}`]) }));
  const bookedIso = pickedSlot(field("appointment"), slots);
  const booked = bookedIso ? slots.find((s) => s.iso === bookedIso) : null;
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
      urgencyReason: field("urgency_reason"),
      subject: field("subject"),
      appointment: booked?.iso && booked.label ? { iso: booked.iso, label: booked.label } : null,
    },
  };
}

// Hard cap for the whole notification, sized for one WhatsApp or SMS body
export const MESSAGE_MAX = 600;
// Collapses whitespace and cuts a field to `max` characters with an ellipsis
const clip = (s: string | null | undefined, max: number): string => {
  const t = (s ?? "").replace(/\s+/g, " ").trim();
  return t.length > max ? t.slice(0, max - 1) + "…" : t;
};

const PRIORITY_LABEL = {
  urgence: "🔴 Urgence",
  urgent: "🟠 Prioritaire",
  normal: "🟢 Normal",
} as const;

// +33612345678 -> 06 12 34 56 78 ; other formats are returned as is
export function formatFrPhone(phone: string | null | undefined): string {
  const p = (phone ?? "").replace(/\s+/g, "");
  const m = /^\+33([1-9])(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(p);
  return m ? `0${m[1]} ${m[2]} ${m[3]} ${m[4]} ${m[5]}` : p;
}

// Short French notification for the artisan, sent after every call.
// Format and wording are fixed by COPY.md (« Message après un appel »).
export function buildCallMessage(input: {
  urgency: Urgency;
  urgencyReason: string | null;
  subject?: string | null;
  name: string | null;
  phone: string | null;
  address: string | null;
  need: string | null;
  summary: string | null;
  link?: string | null;
  appointment?: string | null;
}): string {
  // Format fixed by COPY.md: priority + subject + client, why, request, address, number, link
  const demand = clip(input.need, 200) || clip(input.summary, 200) || "besoin non précisé";
  const subject = clip(input.subject, 40) || clip(input.need, 40) || clip(input.summary, 40) || "appel";
  const name = clip(input.name, 60) || "un client";
  const lines: string[] = [`${PRIORITY_LABEL[input.urgency]} : ${subject}, ${name}`];

  const reason = clip(input.urgencyReason, 140);
  if (reason && input.urgency !== "normal") lines.push(`Pourquoi : ${reason}`);
  lines.push(`Demande : ${demand}`);
  if (input.appointment) lines.push(`Rendez-vous : ${clip(input.appointment, 60)}, dans votre agenda`);

  const address = clip(input.address, 100);
  if (address) lines.push(address);
  lines.push(`Rappeler : ${clip(formatFrPhone(input.phone), 25) || "numéro inconnu"}`);
  if (input.link) lines.push(`Détails : ${input.link}`);

  const message = lines.join("\n");
  return message.length > MESSAGE_MAX ? message.slice(0, MESSAGE_MAX - 1) + "…" : message;
}
