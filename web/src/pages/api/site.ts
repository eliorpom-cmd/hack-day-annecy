import type { APIRoute } from "astro";
import { db } from "../../lib/db";
import { appUrl, requireBusiness } from "../../lib/env";
import { handle, HttpError, isRecord, json, readJson } from "../../lib/http";
import { templateHeadline } from "../../lib/site";
import { aiHeadline, freeSlug, siteData, type SiteRow } from "../../lib/site-run";
import { isDemoAccount } from "../../lib/demo-voice";
import { demoHeadline } from "../../lib/demo-content";

const view = (b: { site_slug: string | null; site_published: number; site_headline: string | null }) => ({
  slug: b.site_slug, published: !!b.site_published, headline: b.site_headline,
  url: b.site_slug ? `${appUrl()}/site/${b.site_slug}` : null,
});

// Current state of the artisan's site
export const GET: APIRoute = handle(async ({ locals }) => {
  const b = requireBusiness(locals) as unknown as SiteRow;
  return json({ site: view(b) });
});

// Creates or refreshes the site: free slug, new headline (AI, else template), published
export const POST: APIRoute = handle(async ({ locals }) => {
  const b = requireBusiness(locals) as unknown as SiteRow;
  const { faqs } = await siteData(b.id);
  const slug = await freeSlug(b);
  // Demo: written in advance, no AI call
  const headline = isDemoAccount(locals.user) ? demoHeadline(b) : (await aiHeadline(b, faqs)) ?? templateHeadline(b);
  const row = await db().prepare(
    "UPDATE businesses SET site_slug = ?, site_published = 1, site_headline = ?, site_updated_at = unixepoch() WHERE id = ? RETURNING site_slug, site_published, site_headline",
  ).bind(slug, headline, b.id).first<SiteRow>();
  return json({ site: view(row!) });
});

// Takes the site offline (the slug is kept for a later republish)
export const DELETE: APIRoute = handle(async ({ locals }) => {
  const b = requireBusiness(locals) as unknown as SiteRow;
  const row = await db().prepare("UPDATE businesses SET site_published = 0 WHERE id = ? RETURNING site_slug, site_published, site_headline")
    .bind(b.id).first<SiteRow>();
  return json({ site: view(row!) });
});

// The artisan rewrites the headline of his site himself: {headline} → {site}
export const PATCH: APIRoute = handle(async ({ locals, request }) => {
  const b = requireBusiness(locals) as unknown as SiteRow;
  const body = await readJson(request);
  const headline = isRecord(body) && typeof body.headline === "string" ? body.headline.replace(/\s+/g, " ").trim() : "";
  if (headline.length < 10) throw new HttpError(400, "headline_too_short", "Écrivez une phrase d’au moins 10 caractères.");
  if (headline.length > 160) throw new HttpError(400, "headline_too_long", "La phrase est trop longue\u00a0: 160 caractères au plus.");
  const row = await db().prepare("UPDATE businesses SET site_headline = ?, site_updated_at = unixepoch() WHERE id = ? RETURNING site_slug, site_published, site_headline")
    .bind(headline, b.id).first<SiteRow>();
  return json({ site: view(row!) });
});
