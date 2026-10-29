import type { APIRoute } from "astro";
import { elRequest } from "../../lib/elevenlabs";
import { requireBusiness, secret } from "../../lib/env";
import { handle, json } from "../../lib/http";
import { DEMO_VOICES, toVoices } from "../../lib/voices";

// ElevenLabs voices of the account, French-capable first, each with its gender when ElevenLabs gives it.
// Without a key: a fixed demo list. Cloned voices of other artisans of the same account are never listed.
export const GET: APIRoute = handle(async ({ locals }) => {
  const b = requireBusiness(locals);
  if (!secret("ELEVENLABS_API_KEY"))
    return json({ voices: DEMO_VOICES, demo: true, hint: "Liste d'exemple : ajoutez ELEVENLABS_API_KEY pour voir les voix du compte et les extraits audio." });
  const data = await elRequest<{ voices?: Parameters<typeof toVoices>[0] }>("/v1/voices");
  const voices = toVoices(data.voices ?? []).filter((v) => v.category !== "cloned" || v.id === b.voice_id);
  return json({ voices });
});
