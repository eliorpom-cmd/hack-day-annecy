import { env } from "cloudflare:workers";
import type { Business } from "./db";
import { HttpError } from "./http";

// Secrets live in .dev.vars / wrangler secrets and are not in the generated Env type
export function secret(name: string): string | undefined {
  const v = (env as unknown as Record<string, unknown>)[name];
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

export function appUrl(): string {
  return (secret("APP_URL") ?? "http://localhost:4321").replace(/\/+$/, "");
}

// The middleware already enforces a session on /api/*; this narrows the type
export function requireBusiness(locals: App.Locals): Business {
  if (!locals.user) throw new HttpError(401, "unauthorized", "Connectez-vous pour continuer.");
  if (!locals.business) throw new HttpError(404, "no_business", "Aucune entreprise n'est liée à ce compte.");
  return locals.business;
}
