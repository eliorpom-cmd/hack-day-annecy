// Pure validation of what the artisan sends for their business, hours and FAQs.
import { normalizeE164 } from "./phone.ts";

export type BusinessPatch = Partial<{
  name: string; trade: string; city: string; website: string | null; description: string;
  artisan_phone: string | null; ring_seconds: number; greeting: string; voice_id: string | null;
  voice_name: string | null; onboarding_step: "business" | "voice" | "number" | "done"; advanced_mode: number;
}>;

export type Hour = { weekday: number; opens: string; closes: string };
export type FaqKind = "info" | "price";
export type FaqInput = { question: string; answer: string; kind: FaqKind };

type Result<T> = { ok: true; value: T } | { ok: false; hint: string };

const TEXT_LIMITS = { name: 120, trade: 80, city: 80, description: 2000, greeting: 300, voice_name: 120 } as const;
const STEPS = ["business", "voice", "number", "done"] as const;

export function normalizeWebsite(raw: string): string | null {
  let s = raw.trim();
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  try {
    const u = new URL(s);
    if (!/^https?:$/.test(u.protocol) || !u.hostname.includes(".")) return null;
    return u.toString();
  } catch {
    return null;
  }
}

// Keeps only whitelisted fields and checks each one. Unknown fields are ignored.
export function sanitizeBusinessPatch(input: Record<string, unknown>): Result<BusinessPatch> {
  const out: BusinessPatch = {};
  for (const key of Object.keys(TEXT_LIMITS) as (keyof typeof TEXT_LIMITS)[]) {
    if (!(key in input)) continue;
    const v = input[key];
    if (key === "voice_name" && v === null) { out.voice_name = null; continue; }
    if (typeof v !== "string") return { ok: false, hint: `Le champ « ${key} » doit être un texte.` };
    if (v.length > TEXT_LIMITS[key]) return { ok: false, hint: `Le champ « ${key} » est trop long (${TEXT_LIMITS[key]} caractères max).` };
    out[key] = v.trim();
  }
  if ("website" in input) {
    const v = input.website;
    if (v === null || v === "") out.website = null;
    else if (typeof v !== "string" || !(out.website = normalizeWebsite(v)))
      return { ok: false, hint: "L'adresse du site web n'est pas valide." };
  }
  if ("artisan_phone" in input) {
    const v = input.artisan_phone;
    if (v === null || v === "") out.artisan_phone = null;
    else if (typeof v !== "string" || !(out.artisan_phone = normalizeE164(v)))
      return { ok: false, hint: "Le numéro de portable n'est pas valide (exemple : 06 12 34 56 78)." };
  }
  if ("ring_seconds" in input) {
    const v = Number(input.ring_seconds);
    if (!Number.isInteger(v) || v < 5 || v > 40)
      return { ok: false, hint: "La durée de sonnerie doit être comprise entre 5 et 40 secondes." };
    out.ring_seconds = v;
  }
  if ("voice_id" in input) {
    const v = input.voice_id;
    if (v === null || v === "") out.voice_id = null;
    else if (typeof v !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(v)) return { ok: false, hint: "Identifiant de voix invalide." };
    else out.voice_id = v;
  }
  if ("onboarding_step" in input) {
    const v = input.onboarding_step;
    if (!STEPS.includes(v as (typeof STEPS)[number])) return { ok: false, hint: "Étape d'onboarding inconnue." };
    out.onboarding_step = v as (typeof STEPS)[number];
  }
  if ("advanced_mode" in input) out.advanced_mode = input.advanced_mode === true || input.advanced_mode === 1 ? 1 : 0;
  return { ok: true, value: out };
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export function validateHours(input: unknown): Result<Hour[]> {
  if (!Array.isArray(input)) return { ok: false, hint: "Les horaires doivent être une liste [{weekday, opens, closes}]." };
  if (input.length > 21) return { ok: false, hint: "Trop de créneaux horaires." };
  const out: Hour[] = [];
  const seen = new Set<string>();
  for (const raw of input) {
    const h = raw as Record<string, unknown>;
    const weekday = Number(h?.weekday);
    const opens = String(h?.opens ?? "");
    const closes = String(h?.closes ?? "");
    if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) return { ok: false, hint: "Jour invalide (0 = lundi … 6 = dimanche)." };
    if (!TIME.test(opens) || !TIME.test(closes)) return { ok: false, hint: "Les heures doivent être au format HH:MM." };
    if (opens >= closes) return { ok: false, hint: "L'heure de fermeture doit être après l'heure d'ouverture." };
    const key = `${weekday}-${opens}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ weekday, opens, closes });
  }
  out.sort((a, b) => a.weekday - b.weekday || a.opens.localeCompare(b.opens));
  return { ok: true, value: out };
}

export function validateFaq(input: unknown): Result<FaqInput> {
  const f = (input ?? {}) as Record<string, unknown>;
  const question = typeof f.question === "string" ? f.question.trim() : "";
  const answer = typeof f.answer === "string" ? f.answer.trim() : "";
  const kind = f.kind === undefined ? "info" : f.kind;
  if (!question || !answer) return { ok: false, hint: "La question et la réponse sont obligatoires." };
  if (question.length > 300 || answer.length > 2000) return { ok: false, hint: "Question (300) ou réponse (2000 caractères) trop longue." };
  if (kind !== "info" && kind !== "price") return { ok: false, hint: "Le type doit être « info » ou « price »." };
  return { ok: true, value: { question, answer, kind } };
}

export const LEAD_STATUSES = ["nouveau", "rappele", "devis", "gagne", "perdu"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];
export function isLeadStatus(v: unknown): v is LeadStatus {
  return LEAD_STATUSES.includes(v as LeadStatus);
}

export type Faq = { id: string; question: string; answer: string; kind: FaqKind; created_at: number };
