// Demo voice: the team's own voice, cloned beforehand on ElevenLabs (« Elior … », « Quentin … » before). On a demo account the voice step
// shows « Clonage de voix déjà effectué · Voix Elior sélectionnée » and that voice is used: nothing is recorded
// on stage. Found, in this order: the DEMO_VOICE_ID secret, the account's voice whose name starts with
// DEMO_VOICE_NAME (default « Elior », else « Quentin »), the voice saved in app_settings by an earlier demo recording.
import { db } from "./db";
import { elRequest } from "./elevenlabs";
import { secret } from "./env";
import { DEMO_ACCOUNT_ID, isDemoSetupEmail } from "./demo-setup";
import { pickTeamVoice, shortVoiceName, type TeamVoiceCandidate as ElVoice } from "./voices";

const KEY = "demo_voice_id";
// First names looked for on the ElevenLabs account, in this order
const TEAM_NAMES = ["Elior", "Quentin"];
const wantedNames = () => { const n = secret("DEMO_VOICE_NAME"); return n ? [n] : TEAM_NAMES; };

export type DemoVoice = { id: string; name: string; preview_url: string | null };

// « Voir la démo » (Plomberie Démo) and « Essayer la configuration » accounts
export function isDemoAccount(user: { id: string; email: string } | null | undefined): boolean {
  return !!user && (user.id === DEMO_ACCOUNT_ID || isDemoSetupEmail(user.email));
}

// Same test from a business record (webhooks have no session): its owner is a demo account
export async function isDemoBusiness(b: { owner_id: string }): Promise<boolean> {
  if (b.owner_id === DEMO_ACCOUNT_ID) return true;
  const u = await db().prepare("SELECT email FROM users WHERE id = ?").bind(b.owner_id).first<{ email: string }>();
  return isDemoSetupEmail(u?.email);
}

export async function demoVoice(): Promise<DemoVoice | null> {
  const id = secret("DEMO_VOICE_ID");
  const hasKey = !!secret("ELEVENLABS_API_KEY");
  if (id) {
    const v = hasKey ? await elRequest<ElVoice>(`/v1/voices/${encodeURIComponent(id)}`).catch(() => null) : null;
    return { id, name: v ? shortVoiceName(v.name) : wantedNames()[0]!, preview_url: v?.preview_url ?? null };
  }
  if (hasKey) {
    const data = await elRequest<{ voices?: ElVoice[] }>("/v1/voices").catch(() => null);
    const v = wantedNames().map((n) => pickTeamVoice(data?.voices ?? [], n)).find(Boolean) ?? null;
    if (v) return { id: v.voice_id, name: shortVoiceName(v.name), preview_url: v.preview_url ?? null };
  }
  const row = await db().prepare("SELECT value FROM app_settings WHERE key = ?").bind(KEY).first<{ value: string }>();
  return row?.value ? { id: row.value, name: wantedNames()[0]!, preview_url: null } : null;
}

export async function demoVoiceId(): Promise<string | null> {
  return (await demoVoice())?.id ?? null;
}

export async function saveDemoVoiceId(voiceId: string): Promise<void> {
  await db().prepare("INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = unixepoch()")
    .bind(KEY, voiceId).run();
}
