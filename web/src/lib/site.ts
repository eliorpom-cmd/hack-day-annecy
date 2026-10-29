// One-page public site of the artisan, pure part: slug, content built from the business, its FAQs
// and hours, headline prompt and cleanup. No Cloudflare import: tested in test/site.test.ts.

export type SiteBusiness = {
  name: string; trade: string; city: string; description: string; artisan_phone: string | null;
  first_name?: string; site_headline?: string | null;
};
export type SiteFaq = { question: string; answer: string; kind: string };
export type SiteHour = { weekday: number; opens: string; closes: string };

export type SitePrice = { label: string; amount: string | null; detail: string };
export type SiteInfo = { question: string; answer: string };
export type SiteHoursLine = { days: string; time: string; closed: boolean };
export type SiteContent = {
  name: string; kicker: string; headline: string; description: string;
  phone: string | null; phoneDisplay: string | null;
  infos: SiteInfo[]; prices: SitePrice[]; priceOnQuote: boolean;
  hours: SiteHoursLine[]; area: string;
  title: string; metaDescription: string;
};

// « Plomberie Démo » → « plomberie-demo »; accents folded, œ/æ expanded, 60 chars max
export function slugify(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/œ/g, "oe").replace(/æ/g, "ae").replace(/ß/g, "ss")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " et ")
    .replace(/['’]/g, "-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}

// Base slug for a business: its name, else « trade-city », else a neutral word
export function baseSlug(b: Pick<SiteBusiness, "name" | "trade" | "city">): string {
  return slugify(b.name) || slugify(`${b.trade} ${b.city}`) || "artisan";
}

// First free slug among base, base-2, base-3… (`taken` holds the slugs already used by others)
export function pickSlug(base: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  if (!used.has(base)) return base;
  for (let i = 2; ; i++) if (!used.has(`${base}-${i}`)) return `${base}-${i}`;
}

export const isValidSlug = (s: string) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s) && s.length <= 64;

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const clean = (s: string | null | undefined) => (s ?? "").replace(/\s+/g, " ").trim();

// « +33639980000 » → « 06 39 98 00 00 »
export function formatPhone(e164: string): string {
  const m = /^\+33([1-9])(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(e164.replace(/\s+/g, ""));
  return m ? `0${m[1]} ${m[2]} ${m[3]} ${m[4]} ${m[5]}` : e164;
}

// « 08:00 » → « 8 h », « 14:30 » → « 14 h 30 » (COPY.md)
export function formatTime(t: string): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t);
  if (!m) return t;
  const h = String(Number(m[1]));
  return m[2] === "00" ? `${h} h` : `${h} h ${m[2]}`;
}

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

// Groups consecutive days with the same slots: « Lundi au jeudi · 8 h à 18 h », « Samedi et dimanche · Fermé »
export function groupHours(hours: SiteHour[]): SiteHoursLine[] {
  if (!hours.length) return [];
  const slots = DAYS.map((_, d) =>
    hours.filter((h) => h.weekday === d).sort((a, b) => a.opens.localeCompare(b.opens))
      .map((h) => `${formatTime(h.opens)} à ${formatTime(h.closes)}`).join(", "));
  const lines: SiteHoursLine[] = [];
  let start = 0;
  for (let d = 1; d <= 7; d++) {
    if (d < 7 && slots[d] === slots[start]) continue;
    const end = d - 1;
    const days = start === end ? DAYS[start]! : end === start + 1
      ? `${DAYS[start]} et ${DAYS[end]!.toLowerCase()}` : `${DAYS[start]} au ${DAYS[end]!.toLowerCase()}`;
    lines.push({ days, time: slots[start] || "Fermé", closed: !slots[start] });
    start = d;
  }
  return lines;
}

// « Combien coûte un débouchage d'évier ? » → « Débouchage d'évier »
export function priceLabel(question: string): string {
  let s = clean(question).replace(/\s*\?+$/, "");
  s = s.replace(/^(combien (co[uû]te(nt)?|faut-il compter pour|(vous )?prenez-vous pour)|quel(le)?s? (est|sont) (le|les) (prix|tarifs?|co[uû]ts?) (d['’]|de |du |des )?|quel (prix|tarif) pour|prix (d['’]|de |du |des )?|tarif (d['’]|de |du |des )?)\s*/i, "");
  s = s.replace(/^(le |la |les |l['’]|un |une |des |du )/i, "");
  return cap(s.trim()) || cap(clean(question));
}

const NUM = String.raw`\d{1,3}(?:[\s  .]\d{3})*(?:,\d{1,2})?`;

// Short amount shown next to the label, only from what the answer says (never invented)
export function priceAmount(answer: string): string | null {
  const a = clean(answer).replace(/[  ]/g, " ");
  const range = new RegExp(String.raw`(?:entre|de)\s+(${NUM})\s*(?:€|euros?)?\s+(?:et|à)\s+(${NUM})\s*(?:€|euros?)`, "i").exec(a)
    ?? new RegExp(String.raw`(${NUM})\s*(?:€|euros?)?\s*[-–]\s*(${NUM})\s*(?:€|euros?)`, "i").exec(a);
  if (range) return `${range[1]} à ${range[2]} €`;
  const from = new RegExp(String.raw`(?:à partir de|dès|minimum)\s+(${NUM})\s*(?:€|euros?)`, "i").exec(a);
  if (from) return `À partir de ${from[1]} €`;
  const one = new RegExp(String.raw`(${NUM})\s*(?:€|euros?)`, "i").exec(a);
  return one ? `${one[1]} €` : null;
}

const AREA_Q = /zone|secteur|o[uù] intervenez|interven(ez|ir)[^?]*o[uù]|quelles? (villes?|communes?)|rayon|d[ée]placez-vous/i;

export function buildSiteContent(input: {
  business: SiteBusiness; faqs: SiteFaq[]; hours: SiteHour[]; answeringNumber: string | null;
}): SiteContent {
  const b = input.business;
  const name = clean(b.name) || cap(clean(b.trade)) || "Artisan";
  const trade = cap(clean(b.trade));
  const city = clean(b.city);
  const kicker = [trade, city].filter(Boolean).join(" · ");

  const faqs = input.faqs.map((f) => ({ question: clean(f.question), answer: clean(f.answer), kind: f.kind }))
    .filter((f) => f.question && f.answer);
  const areaFaq = faqs.find((f) => f.kind !== "price" && AREA_Q.test(f.question));
  const infos = faqs.filter((f) => f.kind !== "price" && f !== areaFaq).map(({ question, answer }) => ({ question, answer }));
  const prices = faqs.filter((f) => f.kind === "price")
    .map((f) => ({ label: priceLabel(f.question), amount: priceAmount(f.answer), detail: f.answer }));
  const priceOnQuote = prices.some((p) => p.amount?.includes(" à ") && !p.amount.startsWith("À partir"));

  const phone = input.answeringNumber || b.artisan_phone || null;
  const description = clean(b.description);
  const headline = clean(b.site_headline) || templateHeadline(b);

  const title = [name, trade && city ? `${trade} à ${city}` : trade || city].filter(Boolean).join(", ");
  const meta = description || headline;
  const metaDescription = (phone ? `${meta} ${meta.endsWith(".") ? "" : ". "}Appelez le ${formatPhone(phone)}.` : meta)
    .replace(/\s+/g, " ").replace(/ \./g, ".").trim().slice(0, 160);

  return {
    name, kicker, headline, description: description === headline ? "" : description,
    phone, phoneDisplay: phone ? formatPhone(phone) : null,
    infos, prices, priceOnQuote,
    hours: groupHours(input.hours),
    area: areaFaq?.answer ?? (city ? city : ""),
    title, metaDescription,
  };
}

// Used when Workers AI is unavailable or answers badly
export function templateHeadline(b: Pick<SiteBusiness, "trade" | "city" | "description">): string {
  const trade = cap(clean(b.trade)), city = clean(b.city);
  if (trade && city) return `${trade} à ${city}.`;
  const first = clean(b.description).split(/(?<=[.!?])\s/)[0] ?? "";
  return first.length && first.length <= 90 ? first : trade ? `${trade}.` : "";
}

export const HEADLINE_SYSTEM = `Tu écris l'accroche d'un site d'artisan, en français.
Une seule phrase, 6 à 12 mots, qui dit ce que fait l'artisan et où.
Règles : n'invente rien (aucun chiffre, délai, garantie ou prix absent des informations), pas de point d'exclamation, pas de tiret long, pas de guillemets, pas d’emoji, pas de « nous », ne répète pas le nom de l’entreprise (il est déjà affiché au-dessus).
Réponds uniquement avec la phrase.`;

export function headlinePrompt(b: SiteBusiness, faqs: SiteFaq[]): string {
  const facts = faqs.filter((f) => f.kind !== "price").slice(0, 8).map((f) => `- ${clean(f.question)} ${clean(f.answer)}`).join("\n");
  return `Nom : ${clean(b.name)}\nMétier : ${clean(b.trade)}\nVille : ${clean(b.city)}\nPrésentation : ${clean(b.description)}\n${facts ? `Infos :\n${facts}` : ""}`.trim();
}

// Keeps a model answer only if it looks like one clean French sentence; null otherwise
export function cleanHeadline(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  let s = raw.replace(/<think>[\s\S]*?<\/think>/gi, "").trim().split(/\n/)[0] ?? "";
  s = s.replace(/^(accroche|phrase)\s*:\s*/i, "").replace(/^["'«“\s]+|["'»”\s]+$/g, "").replace(/\s+/g, " ").trim();
  if (!s || s.length < 12 || s.length > 100) return null;
  if (/[!—*#<>{}]|\bnous\b|\bIA\b/i.test(s)) return null;
  if (/\p{Extended_Pictographic}/u.test(s)) return null;
  return /[.?]$/.test(s) ? s : `${s}.`;
}
