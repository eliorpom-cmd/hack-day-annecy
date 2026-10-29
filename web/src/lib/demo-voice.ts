// Demo voice: the team's own voice, cloned once on ElevenLabs. During the demo, « Utiliser ma voix » asks for one
// sentence and uses this voice at once, so the live demo never waits on ElevenLabs (api/voices/clone.ts).
// The voice comes from the DEMO_VOICE_ID secret, else from the first voice recorded on a demo account (app_settings).
import { db } from "./db";
import { secret } from "./env";
import { DEMO_ACCOUNT_ID, isDemoSetupEmail } from "./demo-setup";

const KEY = "demo_voice_id";

// « Voir la démo » (Plomberie Démo) and « Essayer la configuration » accounts
export function isDemoAccount(user: { id: string; email: string } | null | undefined): boolean {
  return !!user && (user.id === DEMO_ACCOUNT_ID || isDemoSetupEmail(user.email));
}

export async function demoVoiceId(): Promise<string | null> {
  const fromSecret = secret("DEMO_VOICE_ID");
  if (fromSecret) return fromSecret;
  const row = await db().prepare("SELECT value FROM app_settings WHERE key = ?").bind(KEY).first<{ value: string }>();
  return row?.value || null;
}

export async function saveDemoVoiceId(voiceId: string): Promise<void> {
  await db().prepare("INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = unixepoch()")
    .bind(KEY, voiceId).run();
}
