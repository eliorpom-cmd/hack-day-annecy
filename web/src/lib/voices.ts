// ElevenLabs voice list, pure part (sorting, demo list). Tested in test/prompt.test.ts.
import type { VoiceGender } from "./greeting.ts";

export type Voice = { id: string; name: string; preview_url: string | null; french: boolean; category?: string; gender: VoiceGender | null };

// ElevenLabs gives labels.gender ("female", "male", sometimes capitalised); anything else is unknown
export function voiceGender(labels: Record<string, string | undefined> | undefined): VoiceGender | null {
  const g = (labels?.gender ?? "").trim().toLowerCase();
  return g === "female" || g === "male" ? g : null;
}

type ElVoice = {
  voice_id: string; name: string; preview_url?: string | null; category?: string;
  labels?: Record<string, string | undefined>;
  verified_languages?: { language?: string; accent?: string; preview_url?: string | null }[];
};

export function isFrenchVoice(v: ElVoice): boolean {
  const l = v.labels ?? {};
  if ((l.language ?? "").toLowerCase().startsWith("fr")) return true;
  if (/fran|french/i.test(`${l.accent ?? ""} ${l.description ?? ""}`)) return true;
  return (v.verified_languages ?? []).some((x) => (x.language ?? "").toLowerCase().startsWith("fr"));
}

// French-capable voices first, cloned voices (the artisan's own) on top, then by name
export function toVoices(list: ElVoice[]): Voice[] {
  return list
    .filter((v) => v && typeof v.voice_id === "string")
    .map((v) => {
      const frPreview = (v.verified_languages ?? []).find((x) => (x.language ?? "").startsWith("fr"))?.preview_url;
      return { id: v.voice_id, name: v.name, preview_url: frPreview || v.preview_url || null, french: isFrenchVoice(v), category: v.category, gender: voiceGender(v.labels) };
    })
    .sort((a, b) =>
      Number(b.category === "cloned") - Number(a.category === "cloned") ||
      Number(b.french) - Number(a.french) ||
      a.name.localeCompare(b.name, "fr"));
}

// Shown when ELEVENLABS_API_KEY is missing: ElevenLabs premade multilingual voices
export const DEMO_VOICES: Voice[] = [
  { id: "XB0fDUnXU5powFXDhCwa", name: "Charlotte", preview_url: null, french: true, gender: "female" },
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah", preview_url: null, french: true, gender: "female" },
  { id: "JBFqnCBsd6RMkjVDRZzb", name: "George", preview_url: null, french: true, gender: "male" },
  { id: "onwK4e9ZLuTAKqWW03F9", name: "Daniel", preview_url: null, french: true, gender: "male" },
];
