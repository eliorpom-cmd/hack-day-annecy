import { defineMiddleware } from "astro:middleware";
import { SESSION_COOKIE, userFromSession } from "./lib/auth";
import { businessForUser } from "./lib/db";
import { ensureSchema } from "./lib/schema-upgrade";

// Pages that need a logged-in artisan; webhooks and the WhatsApp relay authenticate with their own token
const PROTECTED = [/^\/app(\/|$)/, /^\/onboarding(\/|$)/, /^\/api\/(?!auth\/|twilio\/|elevenlabs\/|whatsapp-relay\/)/];

export const onRequest = defineMiddleware(async (ctx, next) => {
  const path = ctx.url.pathname;
  if (ctx.isPrerendered) return next();
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
