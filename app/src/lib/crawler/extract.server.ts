import { completeJson } from "@/lib/ai/gateway.server";
import { businessProfileSchema, defaultHours, type BusinessProfile } from "@/lib/business/schema";
import type { CrawledPage } from "./crawler.server";

const SYSTEM = `You extract structured business information from website text for an AI phone receptionist.
Return ONLY a JSON object with this exact shape (use null for unknown scalars, [] for unknown lists):
{
  "business_name": string,
  "industry": one of ["home-services","plumbers","salons","dentists","law-firms","real-estate","medical","auto","restaurant","fitness","other"],
  "description": string (2-3 sentences, customer-facing, factual),
  "address": string|null, "city": string|null, "state": string|null, "postal_code": string|null, "country": 2-letter code|null,
  "phone": string|null, "email": string|null, "website": string|null, "timezone": IANA tz guess from location|null,
  "booking_url": string|null,
  "policies": string|null (cancellation, payment, warranty, insurance policies in plain text),
  "hours": [{"day_of_week": 0-6 (0=Sunday), "enabled": boolean, "open_time": "HH:MM", "close_time": "HH:MM"}] (all 7 days if hours found, else []),
  "services": [{"name": string, "description": string|null, "duration_minutes": number|null, "price": number|null, "price_note": string|null}],
  "faqs": [{"question": string, "answer": string}],
  "staff": [{"name": string, "role": string|null, "email": string|null, "phone": string|null}]
}
Rules:
- Never invent facts. Only include prices, hours, staff, products and services that appear in the text.
- Be exhaustive: list EVERY distinct service, product, package, plan, treatment or menu item you find, across all pages — not just the homepage highlights.
- Capture prices exactly (starting-at prices, ranges, per-hour rates, packages). Put the numeric value in "price" and wording like "from", "/hr", "per visit", "$80–$120" in "price_note" (max 50 chars).
- Put useful service details (what's included, who it's for, options, service areas) in the service "description".
- Turn clear facts on the site (service areas, payment methods, financing, warranties, emergency availability, insurance accepted, parking) into FAQ entries with factual answers when no FAQ exists for them.
- Max 60 services, 40 FAQs, 30 staff.`;

const MERGE_SYSTEM = `You merge several partial extractions of the same business website into one complete, deduplicated profile for an AI phone receptionist.
Use the exact same JSON shape as the inputs. Keep every distinct service/product, FAQ and staff member; merge duplicates (keep the richest description and any price). Prefer the most specific contact details, hours and policies. Never invent facts. Max 60 services, 40 FAQs, 30 staff.`;

function groupPages(pages: CrawledPage[], groupBudget: number, totalBudget: number): string[] {
  const groups: string[] = [];
  let current = "";
  let total = 0;
  for (const p of pages) {
    const block = `=== PAGE: ${p.url}\nTITLE: ${p.title}\n${p.text}\n`;
    if (total + block.length > totalBudget) break;
    if (current && current.length + block.length > groupBudget) {
      groups.push(current);
      current = "";
    }
    current += block + "\n";
    total += block.length;
  }
  if (current) groups.push(current);
  return groups;
}

export async function extractBusinessProfile(
  pages: CrawledPage[],
  websiteUrl: string,
): Promise<BusinessProfile> {
  // Read the whole site in parallel sections, then merge into one profile.
  const groups = groupPages(pages, 50000, 260000);
  const partials = (
    await Promise.all(
      groups.map((g, i) =>
        completeJson<Record<string, unknown>>({
          system: SYSTEM,
          user: `Website: ${websiteUrl}\nSection ${i + 1} of ${groups.length}.\n\n${g}`,
        }).catch(() => null),
      ),
    )
  ).filter((x): x is Record<string, unknown> => !!x);
  if (partials.length === 0) throw new Error("Website reading failed");
  const raw =
    partials.length === 1
      ? partials[0]!
      : await completeJson<Record<string, unknown>>({
          system: `${MERGE_SYSTEM}\n\nShape reference:\n${SYSTEM.slice(SYSTEM.indexOf("{"), SYSTEM.indexOf("Rules:"))}`,
          user: `Website: ${websiteUrl}\n\n${partials.map((p, i) => `PARTIAL ${i + 1}:\n${JSON.stringify(p)}`).join("\n\n")}`,
          effort: "high",
        }).catch(() => mergeLocally(partials));

  // Normalize before validation
  const normalized: Record<string, unknown> = { ...raw };
  normalized.website = normalized.website || websiteUrl;
  if (!normalized.business_name)
    normalized.business_name = new URL(websiteUrl).hostname.replace(/^www\./, "");
  if (!Array.isArray(normalized.hours) || (normalized.hours as unknown[]).length === 0)
    normalized.hours = defaultHours();
  for (const key of ["services", "faqs", "staff"])
    if (!Array.isArray(normalized[key])) normalized[key] = [];
  normalized.services = (normalized.services as Record<string, unknown>[])
    .map((s) => ({
      ...s,
      price:
        typeof s.price === "number"
          ? s.price
          : s.price
            ? Number(String(s.price).replace(/[^\d.]/g, "")) || null
            : null,
      duration_minutes:
        typeof s.duration_minutes === "number" ? Math.round(s.duration_minutes) : null,
      name: String(s.name ?? "").slice(0, 120),
      description: typeof s.description === "string" ? s.description.slice(0, 1000) : null,
      price_note: typeof s.price_note === "string" ? s.price_note.slice(0, 60) : null,
    }))
    .filter((s) => s.name)
    .slice(0, 60);
  normalized.faqs = (normalized.faqs as Record<string, unknown>[])
    .filter((f) => f.question && f.answer)
    .map((f) => ({
      question: String(f.question).slice(0, 300),
      answer: String(f.answer).slice(0, 2000),
    }))
    .slice(0, 60);
  normalized.staff = (normalized.staff as Record<string, unknown>[])
    .filter((x) => x.name)
    .slice(0, 40);
  if (typeof normalized.policies === "string")
    normalized.policies = normalized.policies.slice(0, 3000);
  if (typeof normalized.description === "string")
    normalized.description = normalized.description.slice(0, 2000);
  normalized.hours = (normalized.hours as Record<string, unknown>[])
    .filter((h) => typeof h.day_of_week === "number")
    .map((h) => ({
      day_of_week: h.day_of_week,
      enabled: h.enabled !== false,
      open_time: /^\d{2}:\d{2}$/.test(String(h.open_time)) ? h.open_time : "09:00",
      close_time: /^\d{2}:\d{2}$/.test(String(h.close_time)) ? h.close_time : "17:00",
    }));
  if ((normalized.hours as unknown[]).length < 7) {
    const present = new Set(
      (normalized.hours as { day_of_week: number }[]).map((h) => h.day_of_week),
    );
    for (const d of defaultHours())
      if (!present.has(d.day_of_week))
        (normalized.hours as unknown[]).push({ ...d, enabled: false });
  }
  const parsed = businessProfileSchema.safeParse(normalized);
  if (parsed.success) return parsed.data;
  // Salvage: fall back to a minimal profile with what validated
  return businessProfileSchema.parse({
    business_name: String(normalized.business_name),
    website: websiteUrl,
    description:
      typeof normalized.description === "string" ? normalized.description.slice(0, 2000) : null,
    hours: defaultHours(),
  });
}

function mergeLocally(partials: Record<string, unknown>[]): Record<string, unknown> {
  const out: Record<string, unknown> = { ...partials[0] };
  for (const key of ["services", "faqs", "staff"] as const) {
    const seen = new Map<string, Record<string, unknown>>();
    for (const p of partials) {
      for (const item of (Array.isArray(p[key]) ? p[key] : []) as Record<string, unknown>[]) {
        const k = String(item.name ?? item.question ?? "")
          .toLowerCase()
          .trim();
        if (k && !seen.has(k)) seen.set(k, item);
      }
    }
    out[key] = [...seen.values()];
  }
  for (const p of partials.slice(1))
    for (const [k, v] of Object.entries(p)) if (out[k] == null && v != null) out[k] = v;
  return out;
}
