// Webhook authentication helpers (Web Crypto only, runs in Workers and Node).

export function safeEqual(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a), eb = new TextEncoder().encode(b);
  // Compare against itself when lengths differ so timing stays flat
  const other = ea.length === eb.length ? eb : ea;
  let diff = ea.length === eb.length ? 0 : 1;
  for (let i = 0; i < ea.length; i++) diff |= ea[i] ^ other[i];
  return diff === 0;
}

// Constant-time check of the ?token= query parameter; false when the secret is not set
export function checkToken(given: string | null, expected: string | undefined): boolean {
  if (!expected || !given) return false;
  return safeEqual(given, expected);
}

export async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const SIGNATURE_TOLERANCE_S = 30 * 60;

// ElevenLabs-Signature: "t=<unix seconds>,v0=<hex HMAC-SHA256 of `${t}.${body}`>"
export async function verifyElevenLabsSignature(
  header: string | null, rawBody: string, secret: string | undefined, nowS = Math.floor(Date.now() / 1000),
): Promise<boolean> {
  if (!header || !secret) return false;
  const fields = Object.fromEntries(
    header.split(",").map((p) => { const i = p.indexOf("="); return [p.slice(0, i).trim(), p.slice(i + 1).trim()]; }),
  );
  const t = Number(fields.t), v0 = fields.v0;
  if (!Number.isFinite(t) || !v0) return false;
  if (Math.abs(nowS - t) > SIGNATURE_TOLERANCE_S) return false;
  return safeEqual(await hmacSha256Hex(secret, `${fields.t}.${rawBody}`), v0);
}

export async function signElevenLabsPayload(rawBody: string, secret: string, t = Math.floor(Date.now() / 1000)) {
  return `t=${t},v0=${await hmacSha256Hex(secret, `${t}.${rawBody}`)}`;
}
