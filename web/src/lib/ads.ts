// « Publicités », pure part: ad text limits, cleanup of what the model writes, fallbacks,
// target zone, budget and rate limit. No Cloudflare import: tested in test/ads.test.ts.
import { formatPhone } from "./site.ts";

export type AdChannel = "google" | "meta";
export const AD_CHANNELS: readonly AdChannel[] = ["google", "meta"];
export const isAdChannel = (v: unknown): v is AdChannel => v === "google" || v === "meta";

// Character limits of the ad platforms (Google responsive search ads, Meta feed ads)
export const LIMITS = {
  googleHeadline: 30,
  googleDescription: 90,
  keyword: 80,
  metaPrimary: 125,
  metaHeadline: 40,
} as const;
export const COUNTS = { headlines: 3, descriptions: 2, keywordsMin: 10, keywordsMax: 15 } as const;

export type AdBusiness = { name: string; trade: string; city: string; description: string };
export type AdFaq = { question: string; answer: string; kind: string };

export type GoogleDraft = { keywords: string[]; headlines: string[]; descriptions: string[] };
export type MetaDraft = { primaryText: string; headline: string; zone: string; radiusKm: number; cta: "Appeler" };

// Collapses spaces, strips quotes, emoji, exclamation marks and edge punctuation the model adds
export function cleanLine(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw
    .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, "")
    .replace(/\s*!+/g, ".")
    .replace(/\s*[—–]\s*/g, ", ")
    .replace(/\.{3}/g, "…")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^["'«»“”\s]+|["'«»“”\s]+$/g, "")
    .replace(/\s*\.\s*\.$/, ".")
    .replace(/^[,;:.\-\s]+/, "")
    .trim();
}

// Cuts at the last word that fits; never splits a word. Trailing , ; : - are removed.
export function fitText(raw: unknown, max: number): string {
  const s = cleanLine(raw);
  if (s.length <= max) return s;
  const cut = s.slice(0, max + 1);
  const lastSpace = cut.lastIndexOf(" ");
  const base = lastSpace > 0 ? cut.slice(0, lastSpace) : s.slice(0, max);
  return base.replace(/[\s,;:\-–(]+$/, "").replace(/\s+(et|ou|de|du|des|à|au|aux|en|le|la|les|un|une|pour|avec|sur|par)$/i, "").trim();
}

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

// Picks `count` distinct texts within `max`: first the ones that already fit, then fallbacks.
// `overflow` counts model texts that were too long (the caller asks the model once more).
export function pickFitting(candidates: unknown, max: number, count: number, fallbacks: string[]): { items: string[]; overflow: number; filled: number } {
  const list = Array.isArray(candidates) ? candidates : [];
  const items: string[] = [];
  const seen = new Set<string>();
  const add = (s: string) => {
    const k = norm(s);
    if (!s || !k || seen.has(k) || s.length > max || items.length >= count) return false;
    seen.add(k);
    items.push(s);
    return true;
  };
  let overflow = 0;
  for (const c of list) {
    const s = cleanLine(c);
    if (s.length > max) overflow++;
    else add(s);
  }
  let filled = 0;
  for (const f of fallbacks) if (add(fitText(f, max))) filled++;
  return { items, overflow, filled };
}

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const tradeOf = (b: AdBusiness) => b.trade.trim().toLowerCase() || "artisan";
const cityOf = (b: AdBusiness) => b.city.trim();

// « d'Annecy », « de Lyon »
export function deCity(city: string): string {
  return /^[aeiouyhàâéèêîôûAEIOUYHÀÂÉÈÊÎÔÛ]/.test(city) ? `d’${city}` : `de ${city}`;
}

// Keywords: lowercase, plain words, 2 to 7 words, no duplicates; template terms fill up to 10
export function templateKeywords(b: AdBusiness): string[] {
  const t = tradeOf(b);
  const c = cityOf(b).toLowerCase();
  const at = c ? ` ${c}` : "";
  return [
    `${t}${at}`, `${t} urgence${at}`, `dépannage ${t}${at}`, `${t} urgent${at}`, `${t} pas cher${at}`,
    `${t} week-end${at}`, `${t} devis${at}`, `${t} disponible${at}`, `${t} près de chez moi`, `urgence ${t}`,
    `${t} rapide${at}`, `bon ${t}${at}`,
  ];
}

export function cleanKeyword(raw: unknown): string {
  const s = cleanLine(raw).toLowerCase().replace(/[«»"“”+[\]().,;:!?/\\#*]/g, " ").replace(/\s+/g, " ").trim();
  const words = s.split(" ").filter(Boolean);
  if (words.length < 1 || words.length > 7 || s.length > LIMITS.keyword) return "";
  return s;
}

export function pickKeywords(candidates: unknown, b: AdBusiness): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const add = (raw: unknown) => {
    const k = cleanKeyword(raw);
    const n = norm(k);
    if (!k || seen.has(n) || out.length >= COUNTS.keywordsMax) return;
    seen.add(n);
    out.push(k);
  };
  (Array.isArray(candidates) ? candidates : []).forEach(add);
  for (const t of templateKeywords(b)) {
    if (out.length >= COUNTS.keywordsMin) break;
    add(t);
  }
  return out;
}

export function fallbackHeadlines(b: AdBusiness): string[] {
  const t = cap(tradeOf(b));
  const c = cityOf(b);
  return [b.name.trim(), c ? `${t} à ${c}` : t, c ? `Dépannage à ${c}` : "Dépannage rapide", "Appelez maintenant", "Devis sur demande"];
}

export function fallbackDescriptions(b: AdBusiness): string[] {
  const t = tradeOf(b);
  const c = cityOf(b);
  return [
    cleanLine(b.description),
    c ? `${cap(t)} à ${c} et alentours. Appelez, votre demande est prise à toute heure.` : `Appelez, votre demande est prise à toute heure.`,
    `Décrivez votre besoin au téléphone. Vous êtes rappelé rapidement.`,
  ];
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Sentence case and proper names (city, business) written as the artisan writes them
export function polish(raw: unknown, b: AdBusiness): string {
  let s = cleanLine(raw);
  if (!s) return s;
  if (s === s.toUpperCase() && /[A-Z]/.test(s)) s = s.toLowerCase();
  for (const name of [b.name.trim(), b.city.trim()].filter((n) => n.length > 1)) {
    s = s.replace(new RegExp(`(^|[^\\p{L}])${escapeRe(name)}(?![\\p{L}])`, "giu"), (_m, pre: string) => `${pre}${name}`);
  }
  return cap(s);
}
const polishAll = (v: unknown, b: AdBusiness) => (Array.isArray(v) ? v : v === undefined ? [] : [v]).map((x) => polish(x, b));

// Builds the Google draft from what the model returned. `overflow` > 0 means some texts were too long.
export function buildGoogleDraft(raw: Record<string, unknown> | null, b: AdBusiness): { draft: GoogleDraft; overflow: number } {
  const h = pickFitting(polishAll(raw?.headlines, b), LIMITS.googleHeadline, COUNTS.headlines, fallbackHeadlines(b));
  const d = pickFitting(polishAll(raw?.descriptions, b), LIMITS.googleDescription, COUNTS.descriptions, fallbackDescriptions(b));
  return { draft: { keywords: pickKeywords(raw?.keywords, b), headlines: h.items, descriptions: d.items }, overflow: h.overflow + d.overflow };
}

// Merges two model answers: the texts that fit come first, in order
export function mergeRaw(a: Record<string, unknown> | null, b: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!a) return b;
  if (!b) return a;
  const arr = (v: unknown) => (Array.isArray(v) ? v : typeof v === "string" ? [v] : []);
  const out: Record<string, unknown> = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) out[k] = [...arr(a[k]), ...arr(b[k])];
  return out;
}

// Radius from the documentation (« jusqu'à 20 km »), else 15 km
export function radiusFromFaqs(faqs: AdFaq[]): number {
  for (const f of faqs) {
    const text = `${f.question} ${f.answer}`;
    if (!/zone|secteur|d[ée]place|rayon|km|kilom|alentours|interven/i.test(text)) continue;
    const m = /(\d{1,3})\s*(?:km|kilom)/i.exec(text);
    if (m) {
      const km = Number(m[1]);
      if (km >= 5 && km <= 100) return km;
    }
  }
  return 15;
}

export function zoneSentence(city: string, km: number): string {
  const c = city.trim();
  return c ? `Dans un rayon de ${km} km autour ${deCity(c)}` : `Dans un rayon de ${km} km autour de votre entreprise`;
}

export function fallbackMeta(b: AdBusiness): { primary: string[]; headline: string[] } {
  const t = tradeOf(b);
  const c = cityOf(b);
  return {
    primary: [
      c ? `Besoin d’un ${t} à ${c} ? Appelez, votre demande est prise à toute heure.` : `Besoin d’un ${t} ? Appelez, votre demande est prise à toute heure.`,
    ],
    headline: [c ? `${cap(t)} à ${c}, appelez` : `${cap(t)}, appelez`, b.name.trim()],
  };
}

export function buildMetaDraft(raw: Record<string, unknown> | null, b: AdBusiness, faqs: AdFaq[]): { draft: MetaDraft; overflow: number } {
  const f = fallbackMeta(b);
  const p = pickFitting(polishAll(raw?.primary_text, b), LIMITS.metaPrimary, 1, f.primary);
  const h = pickFitting(polishAll(raw?.headline, b), LIMITS.metaHeadline, 1, f.headline);
  const km = radiusFromFaqs(faqs);
  return {
    draft: { primaryText: p.items[0] ?? "", headline: h.items[0] ?? "", zone: zoneSentence(b.city, km), radiusKm: km, cta: "Appeler" },
    overflow: p.overflow + h.overflow,
  };
}

// Validates a stored draft before showing it (rows are JSON written by this code, but be strict)
export function parseDraft(channel: AdChannel, json: string | null): GoogleDraft | MetaDraft | null {
  if (!json) return null;
  try {
    const d = JSON.parse(json) as Record<string, unknown>;
    const strs = (v: unknown) => Array.isArray(v) && v.every((x) => typeof x === "string");
    if (channel === "google" && strs(d.keywords) && strs(d.headlines) && strs(d.descriptions)) return d as GoogleDraft;
    if (channel === "meta" && typeof d.primaryText === "string" && typeof d.headline === "string" && typeof d.zone === "string") return d as MetaDraft;
  } catch { /* corrupted row: shown as empty */ }
  return null;
}

// Where the ad calls land: the answering number, else the artisan's mobile
export function callDestination(answeringNumber: string | null, artisanPhone: string | null) {
  const e164 = answeringNumber || artisanPhone || null;
  return { e164, display: e164 ? formatPhone(e164) : null, answering: !!answeringNumber };
}

// Budget: 5 to 30 € a day, shown only as a monthly total (30 days). No estimate of clicks or calls.
export const BUDGET = { min: 5, max: 30, step: 1, initial: 10 } as const;
export function clampDaily(v: unknown): number {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return BUDGET.initial;
  return Math.min(BUDGET.max, Math.max(BUDGET.min, n));
}
export const monthlyTotal = (daily: unknown) => clampDaily(daily) * 30;

// Rate limit: at most `max` generations per business in a sliding window
export const RATE = { max: 12, windowSec: 3600 } as const;
export function rateCheck(timestamps: number[], now: number, max: number = RATE.max, windowSec: number = RATE.windowSec): { ok: boolean; retryAfterSec: number } {
  const recent = timestamps.filter((t) => t > now - windowSec).sort((a, b) => a - b);
  if (recent.length < max) return { ok: true, retryAfterSec: 0 };
  return { ok: false, retryAfterSec: Math.max(1, recent[recent.length - max] + windowSec - now) };
}
export function retryHint(sec: number): string {
  const min = Math.max(1, Math.ceil(sec / 60));
  return `Trop d’annonces écrites cette heure-ci. Réessayez dans ${min} min.`;
}

// Text copied by « Copier », ready to paste in the ad platform
export function googleCopyText(d: GoogleDraft, phone: string | null, siteUrl: string | null): string {
  return [
    "Mots-clés :", ...d.keywords,
    "", "Titres :", ...d.headlines,
    "", "Descriptions :", ...d.descriptions,
    ...(phone ? ["", `Numéro d’appel : ${phone}`] : []),
    ...(siteUrl ? [`Lien : ${siteUrl}`] : []),
  ].join("\n");
}
export function metaCopyText(d: MetaDraft, phone: string | null): string {
  return [
    `Texte : ${d.primaryText}`, `Titre : ${d.headline}`, `Zone : ${d.zone}`, `Bouton : ${d.cta}`,
    ...(phone ? [`Numéro d’appel : ${phone}`] : []),
  ].join("\n");
}

// Prompts. The model must not invent facts: only what the documentation says.
const facts = (b: AdBusiness, faqs: AdFaq[]) => [
  `Entreprise : ${b.name || "(sans nom)"}`,
  `Métier : ${b.trade || "artisan"}`,
  `Ville : ${b.city || "(non renseignée)"}`,
  b.description ? `Présentation : ${b.description.slice(0, 400)}` : "",
  faqs.length ? `Documentation :\n${faqs.slice(0, 10).map((f) => `- ${f.question.slice(0, 120)} → ${f.answer.slice(0, 200)}`).join("\n")}` : "",
].filter(Boolean).join("\n");

const RULES = `Règles :
- Français, phrases courtes, ton direct et concret.
- Majuscule au premier mot et aux noms propres (ville, nom de l'entreprise), jamais de texte tout en majuscules.
- Aucun point d'exclamation, aucun emoji.
- N'invente rien : pas de prix, de délai, de garantie, de « 24h/24 » ou de « devis gratuit » si la documentation ne le dit pas.
- Respecte strictement les longueurs maximales en caractères, espaces compris.
- Réponds uniquement par un objet JSON.`;

export const GOOGLE_SYSTEM = `Tu écris une annonce Google Ads de recherche locale pour un artisan.
${RULES}
Format : {"keywords": [12 recherches que tapent les clients, en minuscules, avec le métier, la ville et des mots d'urgence, ex. "plombier urgence annecy"], "headlines": [4 titres de 30 caractères maximum], "descriptions": [3 textes de 90 caractères maximum]}`;

export const META_SYSTEM = `Tu écris une publicité Facebook et Instagram pour un artisan, montrée aux habitants de sa ville. Le bouton de l'annonce est « Appeler ».
${RULES}
Format : {"primary_text": [2 textes de 125 caractères maximum, qui donnent envie d'appeler], "headline": [3 titres de 40 caractères maximum]}`;

export function adPrompt(b: AdBusiness, faqs: AdFaq[], tooLong: string[] = []): string {
  const again = tooLong.length ? `\n\nCes textes étaient trop longs, écris-en de plus courts :\n${tooLong.map((t) => `- ${t}`).join("\n")}` : "";
  return `${facts(b, faqs)}${again}`;
}

// Model texts that did not fit, to quote them in the retry prompt
export function tooLongTexts(raw: Record<string, unknown> | null, fields: Record<string, number>): string[] {
  if (!raw) return [];
  const out: string[] = [];
  for (const [k, max] of Object.entries(fields)) {
    const v = raw[k];
    for (const s of Array.isArray(v) ? v : [v]) {
      const c = cleanLine(s);
      if (c.length > max) out.push(`${c} (${c.length} caractères, maximum ${max})`);
    }
  }
  return out.slice(0, 6);
}
