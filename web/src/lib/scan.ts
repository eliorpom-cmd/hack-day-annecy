// Website scan, pure part: HTML → text, link picking, LLM JSON parsing, heuristics.
// Ported from app/src/lib/crawler/*. No Cloudflare import: tested in test/scan.test.ts.
import { normalizeE164 } from "./phone.ts";

export type ScannedFaq = { question: string; answer: string; kind: "info" | "price" };
export type ScannedHour = { weekday: number; opens: string; closes: string };
export type ScanResult = {
  name: string; trade: string; city: string; description: string; phone: string | null;
  hours: ScannedHour[]; faqs: ScannedFaq[];
};

const ENTITIES: Record<string, string> = {
  nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", eacute: "é", egrave: "è", ecirc: "ê",
  agrave: "à", acirc: "â", ccedil: "ç", ocirc: "ô", ucirc: "û", ugrave: "ù", icirc: "î", iuml: "ï",
  euml: "ë", euro: "€", rsquo: "’", lsquo: "‘", laquo: "«", raquo: "»", hellip: "…", ndash: "–", mdash: "—",
  Eacute: "É", Egrave: "È", Agrave: "À", Ccedil: "Ç", oelig: "œ", deg: "°",
};

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const code = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : Number(e.slice(1));
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e] ?? m;
  });
}

export function htmlToText(html: string, maxChars = 12000): { title: string; text: string } {
  const title = decodeEntities(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").replace(/\s+/g, " ").trim();
  const metaDesc = decodeEntities(
    html.match(/<meta[^>]+(?:name|property)=["'](?:description|og:description)["'][^>]*content=["']([^"']*)["']/i)?.[1] ?? "",
  ).trim();
  // JSON-LD often holds the address, phone and opening hours of local businesses
  const jsonLd = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
    .map((x) => (x[1] ?? "").trim()).filter(Boolean).join("\n").slice(0, 3000);
  const body = html
    .replace(/<(script|style|noscript|svg|template|iframe)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/tr|\/section|\/article|\/header|\/footer)[^>]*>/gi, "\n")
    .replace(/<h[1-6][^>]*>/gi, "\n## ")
    .replace(/<li[^>]*>/gi, "\n- ")
    .replace(/<(td|th)[^>]*>/gi, " | ")
    .replace(/<[^>]+>/g, " ");
  const text = decodeEntities(body)
    .replace(/[ \t\r\f\v]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  const combined = (metaDesc ? `RÉSUMÉ : ${metaDesc}\n` : "") + (jsonLd ? `DONNÉES STRUCTURÉES :\n${jsonLd}\n\n` : "") + text;
  return { title, text: combined.slice(0, maxChars) };
}

const HINTS = ["contact", "tarif", "prix", "prestation", "service", "horaire", "faq", "question", "a-propos", "apropos", "qui-sommes", "about", "entreprise", "depannage", "intervention", "devis", "zone"];

function scorePath(path: string): number {
  const l = path.toLowerCase();
  let s = 0;
  for (const h of HINTS) if (l.includes(h)) s += 10;
  s -= path.split("/").filter(Boolean).length;
  return s;
}

// Same-origin links worth reading (contact, tarifs, services…), best first
export function pickLinks(html: string, baseUrl: string, max = 4): string[] {
  const base = new URL(baseUrl);
  const found = new Map<string, number>();
  for (const m of html.matchAll(/<a\s[^>]*href=["']([^"'#]+)["']/gi)) {
    try {
      const u = new URL(decodeEntities(m[1]!), base);
      if (u.hostname.replace(/^www\./, "") !== base.hostname.replace(/^www\./, "")) continue;
      if (!/^https?:$/.test(u.protocol)) continue;
      if (/\.(pdf|jpe?g|png|gif|svg|webp|zip|mp4|css|js|xml|docx?)$/i.test(u.pathname)) continue;
      if (/(wp-admin|wp-json|login|panier|cart|checkout|mentions|legal|cgv|confidentialit|privacy|cookie|feed)/i.test(u.pathname)) continue;
      u.hash = "";
      u.search = "";
      const key = u.toString().replace(/\/$/, "");
      if (key === base.toString().replace(/\/$/, "")) continue;
      const score = scorePath(u.pathname);
      if (score > 0 && !found.has(key)) found.set(key, score);
    } catch {
      /* skip malformed link */
    }
  }
  return [...found.entries()].sort((a, b) => b[1] - a[1]).slice(0, max).map(([u]) => u);
}

// Rejects anything that is not a public http(s) URL (SSRF guard on top of global_fetch_strictly_public)
export function safeScanUrl(raw: unknown): URL | null {
  if (typeof raw !== "string" || !raw.trim() || raw.length > 500) return null;
  let s = raw.trim();
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  try {
    const u = new URL(s);
    if (!/^https?:$/.test(u.protocol) || u.username || u.password) return null;
    const h = u.hostname.toLowerCase();
    if (!h.includes(".") || h === "localhost" || h.endsWith(".local") || h.endsWith(".internal")) return null;
    if (/^\d+\.\d+\.\d+\.\d+$/.test(h) || h.startsWith("[")) return null;
    if (u.port && u.port !== "80" && u.port !== "443") return null;
    u.hash = "";
    return u;
  } catch {
    return null;
  }
}

export const EXTRACTION_SYSTEM = `Tu extrais les informations d'un artisan à partir du texte de son site web, pour configurer son assistant téléphonique.
Réponds UNIQUEMENT avec un objet JSON de cette forme exacte :
{
  "name": string (nom commercial),
  "trade": string (métier en un ou deux mots, en minuscules, ex. « plombier », « électricien », « couvreur »),
  "city": string (ville principale, "" si inconnue),
  "description": string (2 phrases factuelles en français, pour un client : ce que fait l'entreprise et où),
  "phone": string|null (numéro de téléphone principal tel qu'écrit sur le site),
  "hours": [{"weekday": 0-6 (0 = lundi, 6 = dimanche), "opens": "HH:MM", "closes": "HH:MM"}] ([] si non indiqués),
  "faqs": [{"question": string, "answer": string, "kind": "info" | "price"}]
}
Règles :
- N'invente rien. Seulement ce qui est écrit dans le texte.
- "faqs" : transforme les faits utiles au téléphone en questions/réponses courtes en français (zone d'intervention, prestations, urgences, moyens de paiement, garanties, délais, devis gratuit…).
- Chaque prix ou fourchette de prix trouvé devient une FAQ de kind "price", par exemple {"question": "Combien coûte un débouchage ?", "answer": "Entre 90 et 150 € TTC.", "kind": "price"}. Recopie les montants exactement.
- 25 FAQ maximum.`;

// Pulls the first JSON object out of an LLM answer (code fences, prose around it, reasoning tags)
export function parseLlmJson(raw: unknown): Record<string, unknown> | null {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) return raw as Record<string, unknown>;
  if (typeof raw !== "string") return null;
  const s = raw.replace(/<think>[\s\S]*?<\/think>/gi, "").replace(/```(?:json)?/gi, "").trim();
  const start = s.indexOf("{");
  if (start < 0) return null;
  // Scan for the matching closing brace, ignoring braces inside strings
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === "{") depth++;
    else if (c === "}" && --depth === 0) {
      try {
        const v = JSON.parse(s.slice(start, i + 1));
        return v && typeof v === "object" && !Array.isArray(v) ? v : null;
      } catch {
        return null;
      }
    }
  }
  return null;
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const padTime = (v: unknown) => {
  const m = /^(\d{1,2})[:h](\d{2})?$/i.exec(String(v ?? "").trim());
  return m ? `${m[1]!.padStart(2, "0")}:${m[2] ?? "00"}` : "";
};

// Turns whatever the LLM returned into a clean ScanResult (never throws)
export function normalizeExtraction(raw: Record<string, unknown>, fallback: Partial<ScanResult> = {}): ScanResult {
  const phoneRaw = str(raw.phone, 40);
  const hours: ScannedHour[] = [];
  for (const h of Array.isArray(raw.hours) ? raw.hours : []) {
    const r = (h ?? {}) as Record<string, unknown>;
    const weekday = Number(r.weekday);
    const opens = padTime(r.opens), closes = padTime(r.closes);
    if (Number.isInteger(weekday) && weekday >= 0 && weekday <= 6 && TIME.test(opens) && TIME.test(closes) && opens < closes)
      if (!hours.some((x) => x.weekday === weekday && x.opens === opens)) hours.push({ weekday, opens, closes });
  }
  const faqs: ScannedFaq[] = [];
  for (const f of Array.isArray(raw.faqs) ? raw.faqs : []) {
    const r = (f ?? {}) as Record<string, unknown>;
    const question = str(r.question, 300), answer = str(r.answer, 2000);
    if (!question || !answer) continue;
    const kind = r.kind === "price" || /\d\s*(€|euros?\b)/i.test(answer) ? "price" : "info";
    if (!faqs.some((x) => x.question.toLowerCase() === question.toLowerCase())) faqs.push({ question, answer, kind });
    if (faqs.length >= 25) break;
  }
  return {
    name: str(raw.name, 120) || fallback.name || "",
    trade: str(raw.trade, 80).toLowerCase() || fallback.trade || "",
    city: str(raw.city, 80) || fallback.city || "",
    description: str(raw.description, 2000) || fallback.description || "",
    phone: (phoneRaw && normalizeE164(phoneRaw)) || fallback.phone || null,
    hours: hours.sort((a, b) => a.weekday - b.weekday || a.opens.localeCompare(b.opens)),
    faqs,
  };
}

const TRADES = ["plombier", "chauffagiste", "électricien", "serrurier", "couvreur", "menuisier", "maçon", "peintre", "carreleur", "charpentier", "plaquiste", "paysagiste", "vitrier", "climatisation", "ramoneur", "jardinier"];

// Fallback without an LLM: title, meta description, first French phone number, a known trade word
export function heuristicExtraction(pages: { title: string; text: string }[], hostname: string): ScanResult {
  const first = pages[0] ?? { title: "", text: "" };
  const all = pages.map((p) => p.text).join("\n");
  const name = first.title.split(/\s[|\-–—•:]\s/)[0]?.trim() || hostname.replace(/^www\./, "").split(".")[0] || "";
  const phoneMatch = all.match(/(?:\+33\s?(?:\(0\))?\s?|0)[1-9](?:[\s.-]?\d{2}){4}/);
  const lower = all.toLowerCase();
  const trade = TRADES.find((t) => lower.includes(t)) ?? "";
  const summary = all.match(/^RÉSUMÉ : (.+)$/m)?.[1]?.trim() ?? "";
  return {
    name: name.slice(0, 120),
    trade,
    city: "",
    description: summary.slice(0, 2000),
    phone: phoneMatch ? normalizeE164(phoneMatch[0]) : null,
    hours: [],
    faqs: [],
  };
}
