import { defineMiddleware } from "astro:middleware";
import { SESSION_COOKIE, userFromSession } from "./lib/auth";
import { businessForUser } from "./lib/db";
import { ensureSchema } from "./lib/schema-upgrade";
import { secret } from "./lib/env";
import { GATE_COOKIE, gateOpen, isGated } from "./lib/gate";

// Pages that need a logged-in artisan; webhooks and the WhatsApp relay authenticate with their own token
const PROTECTED = [/^\/app(\/|$)/, /^\/onboarding(\/|$)/, /^\/api\/(?!auth\/|twilio\/|elevenlabs\/|whatsapp-relay\/)/];

export const onRequest = defineMiddleware(async (ctx, next) => {
  const path = ctx.url.pathname;
  if (ctx.isPrerendered) return next();
  // Team password first: without it, no demo login, no sign-up, no paid API call
  if (isGated(path) && !(await gateOpen(ctx.cookies.get(GATE_COOKIE)?.value, secret("ACCESS_PASSWORD")))) {
    const html = (ctx.request.headers.get("accept") ?? "").includes("text/html");
    if (!html) return new Response(JSON.stringify({ error: "locked" }), { status: 401 });
    const next = ctx.request.method === "GET" && !path.startsWith("/api/") ? path + ctx.url.search : "/app";
    return ctx.redirect(`/acces?next=${encodeURIComponent(next)}`, 303);
  }
  await ensureSchema();
  const user = await userFromSession(ctx.cookies.get(SESSION_COOKIE)?.value);
  ctx.locals.user = user;
  ctx.locals.business = user ? await businessForUser(user.id) : null;
  if (!user && PROTECTED.some((r) => r.test(path))) {
    if (path.startsWith("/api/")) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
    return ctx.redirect("/login");
  }
  return next();
});
