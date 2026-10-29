import type { AstroCookies } from "astro";
import { env } from "cloudflare:workers";
import { db, type User } from "./db";
import { hashToken, newId, newToken, nowSeconds, MAGIC_LINK_MINUTES, SESSION_DAYS } from "./tokens";

export const SESSION_COOKIE = "sid";

export async function startSession(cookies: AstroCookies, userId: string, secure: boolean) {
  const token = newToken();
  const expires = nowSeconds() + SESSION_DAYS * 86400;
  await db().prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)")
    .bind(await hashToken(token), userId, expires).run();
  cookies.set(SESSION_COOKIE, token, { path: "/", httpOnly: true, sameSite: "lax", secure, maxAge: SESSION_DAYS * 86400 });
}

export async function userFromSession(token: string | undefined): Promise<User | null> {
  if (!token) return null;
  return db().prepare(
    "SELECT u.id, u.email FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?",
  ).bind(await hashToken(token), nowSeconds()).first<User>();
}

export async function endSession(cookies: AstroCookies) {
  const token = cookies.get(SESSION_COOKIE)?.value;
  if (token) await db().prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await hashToken(token)).run();
  cookies.delete(SESSION_COOKIE, { path: "/" });
}

// Creates the link; sends it by e-mail when Resend is configured.
// Without RESEND_API_KEY (local dev, demo) the link is returned to show on screen.
export async function createMagicLink(email: string, origin: string): Promise<{ sent: boolean; link?: string }> {
  const token = newToken();
  await db().prepare("INSERT INTO magic_links (token_hash, email, expires_at) VALUES (?, ?, ?)")
    .bind(await hashToken(token), email, nowSeconds() + MAGIC_LINK_MINUTES * 60).run();
  const link = `${origin}/auth/verify?token=${encodeURIComponent(token)}`;
  const key = (env as unknown as Record<string, string | undefined>).RESEND_API_KEY;
  if (!key) return { sent: false, link };
  const from = (env as unknown as Record<string, string | undefined>).MAIL_FROM ?? "onboarding@resend.dev";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from, to: email, subject: "Votre lien de connexion",
      html: `<p>Cliquez pour vous connecter (valable ${MAGIC_LINK_MINUTES} minutes) :</p><p><a href="${link}">Se connecter</a></p>`,
    }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
  return { sent: true };
}

// Returns the user id when the token is valid and unused; creates the user on first login
export async function consumeMagicLink(token: string): Promise<string | null> {
  const hash = await hashToken(token);
  const row = await db().prepare(
    "UPDATE magic_links SET used_at = ? WHERE token_hash = ? AND used_at IS NULL AND expires_at > ? RETURNING email",
  ).bind(nowSeconds(), hash, nowSeconds()).first<{ email: string }>();
  if (!row) return null;
  const existing = await db().prepare("SELECT id FROM users WHERE email = ?").bind(row.email).first<{ id: string }>();
  if (existing) return existing.id;
  const id = newId();
  await db().batch([
    db().prepare("INSERT INTO users (id, email) VALUES (?, ?)").bind(id, row.email),
    db().prepare("INSERT INTO businesses (id, owner_id) VALUES (?, ?)").bind(newId(), id),
  ]);
  return id;
}
