import type { APIRoute } from "astro";
import { db } from "../../lib/db";
import { appUrl, requireBusiness } from "../../lib/env";
import { handle, json } from "../../lib/http";
import { templateHeadline } from "../../lib/site";
import { aiHeadline, freeSlug, siteData, type SiteRow } from "../../lib/site-run";

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
  const headline = (await aiHeadline(b, faqs)) ?? templateHeadline(b);
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
