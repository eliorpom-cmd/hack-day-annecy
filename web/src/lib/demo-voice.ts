// Demo voice: the team's own voice, cloned beforehand on ElevenLabs (« Quentin … »). On a demo account the voice step
// shows « Clonage de voix déjà effectué · Voix Quentin sélectionnée » and that voice is used: nothing is recorded
// on stage. Found, in this order: the DEMO_VOICE_ID secret, the account's voice whose name starts with
// DEMO_VOICE_NAME (default « Quentin »), the voice saved in app_settings by an earlier demo recording.
import { db } from "./db";
import { elRequest } from "./elevenlabs";
import { secret } from "./env";
import { DEMO_ACCOUNT_ID, isDemoSetupEmail } from "./demo-setup";
import { pickTeamVoice, shortVoiceName, type TeamVoiceCandidate as ElVoice } from "./voices";

const KEY = "demo_voice_id";

export type DemoVoice = { id: string; name: string; preview_url: string | null };

// « Voir la démo » (Plomberie Démo) and « Essayer la configuration » accounts
export function isDemoAccount(user: { id: string; email: string } | null | undefined): boolean {
  return !!user && (user.id === DEMO_ACCOUNT_ID || isDemoSetupEmail(user.email));
}

export async function demoVoice(): Promise<DemoVoice | null> {
  const id = secret("DEMO_VOICE_ID");
  const hasKey = !!secret("ELEVENLABS_API_KEY");
  if (id) {
    const v = hasKey ? await elRequest<ElVoice>(`/v1/voices/${encodeURIComponent(id)}`).catch(() => null) : null;
    return { id, name: v ? shortVoiceName(v.name) : secret("DEMO_VOICE_NAME") ?? "Quentin", preview_url: v?.preview_url ?? null };
  }
  if (hasKey) {
    const data = await elRequest<{ voices?: ElVoice[] }>("/v1/voices").catch(() => null);
    const v = pickTeamVoice(data?.voices ?? [], secret("DEMO_VOICE_NAME") ?? "Quentin");
    if (v) return { id: v.voice_id, name: shortVoiceName(v.name), preview_url: v.preview_url ?? null };
  }
  const row = await db().prepare("SELECT value FROM app_settings WHERE key = ?").bind(KEY).first<{ value: string }>();
  return row?.value ? { id: row.value, name: secret("DEMO_VOICE_NAME") ?? "Quentin", preview_url: null } : null;
}

export async function demoVoiceId(): Promise<string | null> {
  return (await demoVoice())?.id ?? null;
}

export async function saveDemoVoiceId(voiceId: string): Promise<void> {
  await db().prepare("INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = unixepoch()")
    .bind(KEY, voiceId).run();
}
