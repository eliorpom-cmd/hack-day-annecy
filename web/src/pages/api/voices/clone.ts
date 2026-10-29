import type { APIRoute } from "astro";
import { db, type Business } from "../../../lib/db";
import { elRequest } from "../../../lib/elevenlabs";
import { requireBusiness, secret } from "../../../lib/env";
import { businessDisplayName, defaultGreeting, isDefaultGreeting } from "../../../lib/greeting";
import { fail, handle, HttpError, json } from "../../../lib/http";
import { CLONE_LIMITS, CLONE_REFUSED_HINT, CLONED_VOICE_NAME, checkWav } from "../../../lib/voice-clone";
import { demoVoiceId, isDemoAccount, saveDemoVoiceId } from "../../../lib/demo-voice";

// Creates the artisan's own voice on ElevenLabs from his recorded sentences (multipart: files[] WAV, consent=true).
// The audio goes straight to ElevenLabs and is never stored on our side.
// Demo accounts: once the team's voice is cloned (lib/demo-voice.ts), one sentence is enough and that voice is used
// without calling ElevenLabs; field demo_record=true records the team's voice again.
export const POST: APIRoute = handle(async ({ request, locals }) => {
  const b = requireBusiness(locals);
  const demo = isDemoAccount(locals.user);
  const demoVoice = demo ? await demoVoiceId() : null;
  if (!secret("ELEVENLABS_API_KEY") && !demoVoice)
    return fail(503, "elevenlabs_not_configured", "Votre voix ne peut pas encore être enregistrée. Choisissez une voix de la liste pour continuer.");

  const size = Number(request.headers.get("content-length") ?? 0);
  if (size > CLONE_LIMITS.maxFileBytes * CLONE_LIMITS.maxFiles) throw new HttpError(413, "too_large", "Les enregistrements sont trop longs. Recommencez avec des phrases plus courtes.");
  let form: FormData;
  try { form = await request.formData(); } catch { throw new HttpError(400, "invalid_body", "Envoyez les enregistrements en multipart (champ files)."); }
  if (form.get("consent") !== "true") throw new HttpError(400, "consent_required", "Cochez la case pour accepter que votre voix soit utilisée.");

  const files = form.getAll("files").filter((f): f is File => typeof f !== "string");
  if (!files.length || files.length > CLONE_LIMITS.maxFiles) throw new HttpError(400, "invalid_files", "Enregistrez les 3 phrases avant de continuer.");

  if (demoVoice && form.get("demo_record") !== "true") {
    for (const f of files) {
      const check = checkWav(new Uint8Array(await f.arrayBuffer()));
      if (!check.ok) throw new HttpError(400, "invalid_audio", check.hint);
    }
    // Looks like the real thing on stage: « Création de votre voix… » stays a moment
    await new Promise((r) => setTimeout(r, 2500));
    return json(await useVoice(b, demoVoice, null));
  }

  const upload = new FormData();
  upload.append("name", `Ma voix · ${b.name.trim() || "Artisan"}`.slice(0, 100));
  upload.append("description", "Voix de l'artisan, enregistrée avec son accord pour son répondeur.");
  upload.append("labels", JSON.stringify({ language: "fr" }));
  upload.append("remove_background_noise", "true");
  let total = 0;
  for (const [i, f] of files.entries()) {
    const bytes = new Uint8Array(await f.arrayBuffer());
    const check = checkWav(bytes);
    if (!check.ok) throw new HttpError(400, "invalid_audio", check.hint);
    total += check.seconds;
    upload.append("files", new Blob([bytes], { type: "audio/wav" }), `phrase-${i + 1}.wav`);
  }
  if (total < CLONE_LIMITS.minTotalSeconds) throw new HttpError(400, "too_short", "Les enregistrements sont trop courts. Lisez chaque phrase en entier.");

  const res = await elRequest<{ voice_id?: string; requires_verification?: boolean }>("/v1/voices/add", { method: "POST", body: upload, timeoutMs: 90000 })
    .catch((e: unknown) => {
      // The artisan gets a way forward; ElevenLabs' reason stays in `detail` (and the log) for us
      if (e instanceof HttpError && e.code === "elevenlabs_error") throw new HttpError(e.status, e.code, CLONE_REFUSED_HINT, e.extra);
      throw e;
    });
  if (!res.voice_id) throw new HttpError(502, "elevenlabs_error", "Votre voix n'a pas pu être créée. Réessayez dans un instant.");
  if (res.requires_verification) {
    await elRequest(`/v1/voices/${encodeURIComponent(res.voice_id)}`, { method: "DELETE" }).catch(() => {});
    throw new HttpError(422, "verification_required", "Votre voix n'a pas pu être utilisée. Choisissez une voix de la liste.");
  }

  // A demo account records the team's voice: it becomes the demo voice for the next runs
  if (demo) await saveDemoVoiceId(res.voice_id);
  // The previous own voice of this artisan is replaced (ElevenLabs limits the number of voices per account), never the demo voice
  const previous = b.voice_name === CLONED_VOICE_NAME && b.voice_id && b.voice_id !== res.voice_id && b.voice_id !== demoVoice ? b.voice_id : null;
  return json(await useVoice(b, res.voice_id, previous));
});

// Stores the artisan's own voice on his business, then removes the voice it replaces on ElevenLabs
async function useVoice(b: Business, voiceId: string, previous: string | null) {
  const greeting = isDefaultGreeting(b.greeting) ? defaultGreeting({ name: businessDisplayName(b), first_name: b.first_name, voice: "cloned" }) : b.greeting;
  const updated = await db().prepare("UPDATE businesses SET voice_id = ?, voice_name = ?, voice_gender = NULL, greeting = ? WHERE id = ? RETURNING *")
    .bind(voiceId, CLONED_VOICE_NAME, greeting, b.id).first<Business>();
  if (previous) await elRequest(`/v1/voices/${encodeURIComponent(previous)}`, { method: "DELETE" }).catch(() => {});
  return { voice: { id: voiceId, name: CLONED_VOICE_NAME, preview_url: null, category: "cloned", gender: null }, business: updated };
}
