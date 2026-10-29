// Team password in front of everything that costs money or touches real accounts
// (demo login, sign-up, numbers, voices, AI). No Cloudflare import: testable.
// Public: landing, call pages /a/*, artisan sites, webhooks (they check their own token).

export const GATE_COOKIE = "gate";
export const GATE_DAYS = 30;

const GATED = [
  /^\/app(\/|$)/,
  /^\/onboarding(\/|$)/,
  /^\/login(\/|$)/,
  /^\/auth\//,
  /^\/api\/(?!twilio\/|elevenlabs\/|whatsapp-relay\/)/,
];

export function isGated(path: string): boolean {
  return GATED.some((r) => r.test(path));
}

// Cookie value = HMAC of a fixed label with the password: changing the password logs everyone out
export async function gateToken(password: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(password), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode("gate-v1"));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Fails closed: no password configured = nobody gets in
export async function gateOpen(cookie: string | undefined, password: string | undefined): Promise<boolean> {
  if (!password || !cookie) return false;
  return safeEqual(cookie, await gateToken(password));
}

export async function passwordMatches(given: string, password: string | undefined): Promise<boolean> {
  if (!password || !given) return false;
  // Compare hashes so the comparison does not leak the length
  return safeEqual(await gateToken(given), await gateToken(password));
}

// Only same-site paths, so /acces?next= cannot redirect to another site
export function safeNext(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/app";
  return next;
}
