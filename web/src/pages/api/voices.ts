import type { APIRoute } from "astro";
import { elRequest } from "../../lib/elevenlabs";
import { secret } from "../../lib/env";
import { handle, json } from "../../lib/http";
import { DEMO_VOICES, toVoices } from "../../lib/voices";

// ElevenLabs voices of the account, French-capable first. Without a key: a fixed demo list.
export const GET: APIRoute = handle(async () => {
  if (!secret("ELEVENLABS_API_KEY"))
    return json({ voices: DEMO_VOICES, demo: true, hint: "Liste d'exemple : ajoutez ELEVENLABS_API_KEY pour voir les voix du compte et les extraits audio." });
  const data = await elRequest<{ voices?: Parameters<typeof toVoices>[0] }>("/v1/voices");
  return json({ voices: toVoices(data.voices ?? []) });
});
