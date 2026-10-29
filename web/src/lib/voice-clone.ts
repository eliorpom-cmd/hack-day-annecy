// The artisan's own voice: sentences to read, WAV encoding (browser) and checks (server).
// Ported from Mathieu's MVP (app src/lib/voice/audio.ts, voice.server.ts, schema.ts).
// Pure: no DOM, no Cloudflare import. Tested in test/voice-clone.test.ts.

// Three sentences of ~10 s each, worded like an artisan answering his own phone
export const CLONE_SENTENCES = [
  "Oui allô, bonjour. Je suis sur un chantier en ce moment, mais je note votre demande et je vous rappelle dans la journée.",
  "Donnez-moi votre nom, votre adresse et votre numéro de téléphone. Je les note et je passe chez vous dès que possible.",
  "Le devis est gratuit. Je viens voir le chantier, je prends les mesures, puis je vous envoie le prix exact par message.",
] as const;

// Name shown in the app for the artisan's own voice (stored in businesses.voice_name)
export const CLONED_VOICE_NAME = "Ma voix";

// Shown when ElevenLabs refuses the recordings (plan without cloning, voice quota reached, audio rejected)
export const CLONE_REFUSED_HINT = "Votre voix n'a pas pu être créée. Enregistrez les phrases à nouveau, ou choisissez une voix de la liste.";

export const CLONE_LIMITS = {
  minSeconds: 3, // one sentence read in full
  maxSeconds: 60, // per recording (the recorder stops at 30 s)
  minTotalSeconds: 12, // same floor as the MVP
  maxFileBytes: 6_000_000,
  maxFiles: 5,
} as const;

// Mono 16-bit PCM WAV from the channels of a decoded recording (channels are averaged)
export function encodeWav(channels: Float32Array[], sampleRate: number): Uint8Array {
  const length = channels[0]?.length ?? 0;
  const buffer = new ArrayBuffer(44 + length * 2);
  const view = new DataView(buffer);
  const write = (offset: number, text: string) => { for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i)); };
  write(0, "RIFF"); view.setUint32(4, 36 + length * 2, true); write(8, "WAVE");
  write(12, "fmt "); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
  view.setUint16(22, 1, true); view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  write(36, "data"); view.setUint32(40, length * 2, true);
  for (let i = 0; i < length; i++) {
    let sum = 0;
    for (const c of channels) sum += c[i] ?? 0;
    const v = Math.max(-1, Math.min(1, sum / channels.length));
    view.setInt16(44 + i * 2, v * (v < 0 ? 32768 : 32767), true);
  }
  return new Uint8Array(buffer);
}

type WavCheck = { ok: true; seconds: number } | { ok: false; hint: string };

// Reads the RIFF chunks and returns the duration; rejects anything that is not PCM WAV of a sensible length
export function checkWav(bytes: Uint8Array): WavCheck {
  const bad: WavCheck = { ok: false, hint: "Un enregistrement est illisible. Enregistrez la phrase à nouveau." };
  if (bytes.length > CLONE_LIMITS.maxFileBytes) return { ok: false, hint: "Un enregistrement est trop long. Enregistrez la phrase à nouveau." };
  if (bytes.length < 44) return bad;
  const ascii = (o: number) => String.fromCharCode(bytes[o]!, bytes[o + 1]!, bytes[o + 2]!, bytes[o + 3]!);
  if (ascii(0) !== "RIFF" || ascii(8) !== "WAVE") return bad;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let byteRate = 0;
  let dataBytes = 0;
  for (let o = 12; o + 8 <= bytes.length;) {
    const id = ascii(o);
    const size = view.getUint32(o + 4, true);
    if (id === "fmt " && o + 16 <= bytes.length) {
      if (view.getUint16(o + 8, true) !== 1) return bad; // PCM only
      byteRate = view.getUint32(o + 16, true);
    }
    if (id === "data") { dataBytes = Math.min(size, bytes.length - o - 8); break; }
    o += 8 + size + (size % 2);
  }
  if (!byteRate || !dataBytes) return bad;
  const seconds = dataBytes / byteRate;
  if (!Number.isFinite(seconds)) return bad;
  if (seconds < CLONE_LIMITS.minSeconds) return { ok: false, hint: "Un enregistrement est trop court. Lisez toute la phrase." };
  if (seconds > CLONE_LIMITS.maxSeconds) return { ok: false, hint: "Un enregistrement est trop long. Enregistrez la phrase à nouveau." };
  return { ok: true, seconds };
}
