// « Réseaux sociaux », pure part: topic chips built from real data (anonymised call subjects, season,
// services, before/after), prompt for the post, network-specific cleanup and clamps, input validation.
// No Cloudflare import: tested in test/social.test.ts.

export const NETWORKS = ["facebook", "instagram", "linkedin"] as const;
export type Network = (typeof NETWORKS)[number];
export const isNetwork = (v: unknown): v is Network => typeof v === "string" && (NETWORKS as readonly string[]).includes(v);

type NetworkRule = { label: string; maxChars: number; minTags: number; maxTags: number; url: string; brief: string };
export const NETWORK_RULES: Record<Network, NetworkRule> = {
  facebook: {
    label: "Facebook", maxChars: 600, minTags: 0, maxTags: 2, url: "https://www.facebook.com/",
    brief: "Facebook : 3 à 5 phrases courtes, 500 caractères maximum, ton chaleureux de voisin. 0 à 2 hashtags.",
  },
  instagram: {
    label: "Instagram", maxChars: 450, minTags: 3, maxTags: 5, url: "https://www.instagram.com/",
    brief: "Instagram : légende d'une photo du chantier, 2 à 4 phrases courtes, 400 caractères maximum, 1 ou 2 emojis au plus. Exactement 3 à 5 hashtags locaux (ville, métier + ville, département ou région).",
  },
  linkedin: {
    label: "LinkedIn", maxChars: 900, minTags: 0, maxTags: 2, url: "https://www.linkedin.com/feed/",
    brief: "LinkedIn : 4 à 6 phrases, 700 caractères maximum, ton professionnel et sobre, aucun emoji. 0 à 2 hashtags, jamais plus.",
  },
};

export type Topic = { id: string; label: string; prompt: string };
export type TopicLead = { name: string | null; address: string | null; subject: string | null; need: string | null };
export type TopicFaq = { question: string; kind: string };
export type PostBusiness = { name: string; trade: string; city: string; description: string; first_name?: string | null };

const clean = (s: string | null | undefined) => (s ?? "").replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim();
const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const STREET = String.raw`(?:\d{1,4}\s*(?:bis|ter)?\s*,?\s*)?(?:rue|avenue|av\.|boulevard|bd|chemin|place|impasse|all[ée]e|route|quai|cours|square|lotissement|r[ée]sidence)\b[^,.;]*`;

// Removes emails, phone numbers, streets, postal codes and « M. Dupont »-style names from any text
export function scrubContact(raw: string | null | undefined): string {
  let s = clean(raw);
  s = s.replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, " ");
  s = s.replace(/(?:\+33\s?|0)[1-9](?:[\s.-]?\d{2}){4}/g, " ");
  s = s.replace(/\+?\d[\d\s.-]{7,}\d/g, " ");
  s = s.replace(new RegExp(STREET, "gi"), " ");
  s = s.replace(/\b\d{5}\b/g, " ");
  s = s.replace(/(?:\bchez\s+)?(?:\bM\.|\bMr\.?|\bMme\.?|\bMlle\.?|\bMadame|\bMonsieur|\bMademoiselle)\s+[A-ZÀ-Ý][\p{L}'’-]*/gu, " ");
  return s.replace(/\s+([,.;:])/g, "$1").replace(/\s+/g, " ").trim();
}

// Removes what could identify a client from a call subject: names, civilities, phones, emails,
// streets, postal codes. Returns a short lowercase subject (40 chars max) or null if nothing is left.
export function anonymiseSubject(raw: string | null | undefined, lead: { name?: string | null; address?: string | null } = {}): string | null {
  let s = scrubContact(raw);
  if (!s) return null;
  for (const part of [lead.name, lead.address]) {
    for (const word of clean(part).split(/[\s,]+/)) {
      if (word.length < 3 || /^\d+$/.test(word) || /^(rue|avenue|chemin|place|route|des|les|de|du|la|le)$/i.test(word)) continue;
      s = s.replace(new RegExp(`(?<![\\p{L}])(?:chez\\s+)?${escapeRe(word)}(?![\\p{L}])`, "giu"), " ");
    }
  }
  s = s.replace(/\s+([,.;:])/g, "$1").replace(/\s+/g, " ").replace(/^[\s,.;:–-]+|[\s,.;:–-]+$/g, "").trim();
  if (s.length > 40) s = s.slice(0, 41).replace(/\s+\S*$/, "").replace(/[\s,.;:–-]+$/, "");
  // Words left dangling once a name or an address is gone (« … pour », « … chez »)
  for (let prev = ""; prev !== s;) { prev = s; s = s.replace(/[\s,]+(?:pour|au|aux|à|chez|de|du|des|avec|par|et|le|la|les)$/i, "").trim(); }
  if (s.length < 3) return null;
  // Lowercase the first letter, except for acronyms (« WC bouché »)
  return /^\p{Lu}\p{Ll}/u.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s;
}

export type Season = "hiver" | "printemps" | "été" | "automne";
export function seasonOf(date: Date): Season {
  const m = date.getUTCMonth();
  return m === 11 || m <= 1 ? "hiver" : m <= 4 ? "printemps" : m <= 7 ? "été" : "automne";
}
const SEASON_LABEL: Record<Season, string> = { hiver: "Conseil d’hiver", printemps: "Conseil de printemps", été: "Conseil d’été", automne: "Conseil d’automne" };

// « Combien coûte un débouchage d'évier ? » → « Débouchage d'évier » (same idea as the site's price labels)
export function serviceLabel(question: string): string | null {
  let s = clean(question).replace(/\s*\?+$/, "");
  s = s.replace(/^(combien (co[uû]te(nt)?|faut-il compter pour)|quel(le)?s? (est|sont) (le|les) (prix|tarifs?) (d['’]|de |du |des )?|quel (prix|tarif) pour|prix (d['’]|de |du |des )?|tarif (d['’]|de |du |des )?|(?:faites|proposez|installez|r[ée]parez|posez|r[ée]novez)-vous( des| les| un| une| la| le)?|intervenez-vous pour)\s*/i, "");
  s = s.replace(/^(le |la |les |l['’]|un |une |des |du )/i, "").trim();
  if (s.length < 3 || s.length > 40 || /\?/.test(s)) return null;
  return cap(s);
}

// Chips shown under « Sujet »: up to 3 recent jobs, the season, up to 2 services, before/after
export function buildTopics(input: { leads: TopicLead[]; faqs: TopicFaq[]; date: Date; trade: string }): Topic[] {
  const topics: Topic[] = [];
  const seen = new Set<string>();
  for (const l of input.leads) {
    const subject = anonymiseSubject(l.subject || l.need, l);
    if (!subject) continue;
    const key = fold(subject.toLowerCase());
    if (seen.has(key)) continue;
    seen.add(key);
    topics.push({ id: `job-${topics.length}`, label: cap(subject), prompt: `Intervention récente : ${subject}` });
    if (topics.length >= 3) break;
  }
  const season = seasonOf(input.date);
  const trade = clean(input.trade) || "artisan";
  topics.push({ id: "season", label: SEASON_LABEL[season], prompt: `Conseil de saison (${season}) utile aux clients d'un ${trade}` });
  let services = 0;
  const offered = /^(faites|proposez|installez|r[ée]parez|posez|r[ée]novez)-vous\b/i;
  for (const f of [...input.faqs.filter((f) => f.kind === "price"), ...input.faqs.filter((f) => f.kind !== "price" && offered.test(f.question.trim()))]) {
    const label = serviceLabel(f.question);
    if (!label || /d[ée]placement|devis|frais|forfait/i.test(label) || seen.has(fold(label.toLowerCase()))) continue;
    seen.add(fold(label.toLowerCase()));
    topics.push({ id: `service-${services}`, label, prompt: `Présenter un service : ${label.toLowerCase()}` });
    if (++services >= 2) break;
  }
  topics.push({ id: "before-after", label: "Avant / après", prompt: "Photo avant / après d'un chantier récent" });
  return topics;
}

export type PostRequest = { network: Network; topic: string };

// Validates the POST body; returns a French hint on bad input
export function parsePostRequest(body: unknown): { ok: true; value: PostRequest } | { ok: false; hint: string } {
  const b = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;
  if (!isNetwork(b.network)) return { ok: false, hint: "Choisissez Facebook, Instagram ou LinkedIn." };
  const topic = scrubContact(typeof b.topic === "string" ? b.topic : "");
  if (topic.length < 3) return { ok: false, hint: "Choisissez un sujet ou écrivez-en un." };
  if (topic.length > 200) return { ok: false, hint: "Le sujet est trop long : 200 caractères au plus." };
  return { ok: true, value: { network: b.network, topic } };
}

export const POST_SYSTEM = [
  "Tu écris des publications de réseaux sociaux pour un artisan français, à la première personne (« je »), comme s'il les écrivait lui-même.",
  "Voix : directe, simple, concrète, fière du travail bien fait. Phrases courtes. Aucun mot technique du numérique.",
  "Règles strictes :",
  "- N'invente jamais de prix, de montant, de chiffre, de délai, de pourcentage, d'année d'expérience, d'avis client, de note ou de promotion.",
  "- Ne cite jamais de nom de client, d'adresse ni de numéro de téléphone (le numéro est ajouté après).",
  "- Cite la ville de l'artisan une fois.",
  "- Ne termine pas par « appelez-moi » ni « contactez-moi » : la ligne « Appelez le … » est ajoutée après.",
  "- Pas de tiret long, pas de point d'exclamation en série, pas de majuscules criardes.",
  "- Si le sujet est une photo avant / après, écris la légende de cette photo sans décrire de détail que tu ne connais pas.",
  'Réponds uniquement en JSON : {"text": "la publication sans hashtags", "hashtags": ["MotSansDiese", …]}.',
].join("\n");

// User message: who the artisan is, his services, the topic, the network's rules
export function buildPostPrompt(b: PostBusiness, topic: string, network: Network, services: string[] = []): string {
  const lines = [
    `Entreprise : ${clean(b.name) || "Artisan"}`,
    `Métier : ${clean(b.trade) || "artisan"}`,
    `Ville : ${clean(b.city) || "non précisée"}`,
  ];
  if (clean(b.first_name)) lines.push(`Prénom de l'artisan : ${clean(b.first_name)}`);
  const desc = clean(b.description).slice(0, 300);
  if (desc) lines.push(`Présentation : ${desc}`);
  const list = services.map(clean).filter(Boolean).slice(0, 6);
  if (list.length) lines.push(`Services : ${list.join(" ; ")}`);
  lines.push(`Sujet de la publication : ${clean(topic)}`);
  lines.push(`Réseau : ${NETWORK_RULES[network].brief}`);
  return lines.join("\n");
}

// « Plombier Annecy » → « PlombierAnnecy », accents folded, letters and digits only
export function normaliseHashtag(raw: string): string | null {
  const words = fold(clean(raw).replace(/^#+/, "")).split(/[^A-Za-z0-9]+/).filter(Boolean);
  const tag = words.map((w, i) => (i === 0 && words.length === 1 ? cap(w) : cap(w))).join("");
  return tag.length >= 2 && tag.length <= 40 && /[A-Za-z]/.test(tag) ? tag : null;
}

// Fallback local hashtags: city, trade + city, trade
export function defaultHashtags(b: Pick<PostBusiness, "trade" | "city">): string[] {
  const city = clean(b.city), trade = clean(b.trade);
  return [city, trade && city ? `${trade} ${city}` : "", trade, city ? `Artisan ${city}` : "Artisan"]
    .map((t) => (t ? normaliseHashtag(t) : null)).filter((t): t is string => !!t);
}

// Numbers allowed in the post: only those present in what the model was given
const numbersIn = (s: string) => new Set(s.match(/\d+(?:[.,]\d+)?/g) ?? []);

// Drops sentences that carry a price, a percentage, a rating or a number the context does not contain
export function dropInventedClaims(text: string, context: string): string {
  const allowed = numbersIn(context);
  const sentences = text.match(/[^.!?…\n]+[.!?…]*\s*|\n+/g) ?? [text];
  return sentences.filter((s) => {
    if (/€|\beuros?\b|%|★|⭐|\b(?:étoiles?|avis clients?|note de|clients? satisfaits?|ans d['’]expérience)\b/i.test(s)) return false;
    return [...numbersIn(s)].every((n) => allowed.has(n));
  }).join("").replace(/[ \t]+\n/g, "\n").trim();
}

// Cuts at the last sentence end that fits, else at the last word
export function clampText(text: string, max: number): string {
  if (text.length <= max) return text;
  const head = text.slice(0, max);
  const end = Math.max(head.lastIndexOf(". "), head.lastIndexOf(".\n"), head.lastIndexOf("? "), head.lastIndexOf("! "), head.lastIndexOf("…"));
  if (end > max * 0.5) return head.slice(0, end + 1).trim();
  return head.replace(/\s+\S*$/, "").replace(/[\s,;:]+$/, "") + "…";
}

export function formatFrNumber(e164: string): string {
  const m = /^\+33([1-9])(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(e164.replace(/\s+/g, ""));
  return m ? `0${m[1]} ${m[2]} ${m[3]} ${m[4]} ${m[5]}` : e164;
}

// Turns the model's JSON into the final post: no invented claims, no phone, network length and
// hashtag count, the real number of the répondeur appended. Null when the text is unusable.
export function finalizePost(
  network: Network,
  data: Record<string, unknown> | null,
  ctx: { business: PostBusiness; context: string; phone?: string | null },
): string | null {
  if (!data) return null;
  const rule = NETWORK_RULES[network];
  let text = typeof data.text === "string" ? data.text : typeof data.post === "string" ? data.post : "";
  text = text.replace(/\r/g, "").replace(/ /g, " ");
  const inline = [...text.matchAll(/(?:^|\s)#([\p{L}\p{N}_]+)/gu)].map((m) => m[1]!);
  text = text.replace(/(?:^|[ \t])#[\p{L}\p{N}_]+/gu, "");
  text = text.replace(/(?:\+33\s?|0)[1-9](?:[\s.-]?\d{2}){4}/g, "").replace(/\s*[—–]\s*/g, ", ").replace(/!{2,}/g, "!");
  text = text.split("\n").map((l) => l.replace(/[ \t]+/g, " ").trim()).join("\n").replace(/\n{3,}/g, "\n\n").trim();
  if (network === "linkedin") text = text.replace(/[\p{Extended_Pictographic}️]/gu, "").replace(/ {2,}/g, " ");
  text = dropInventedClaims(text, ctx.context);
  const phoneLine = ctx.phone ? `Appelez le ${formatFrNumber(ctx.phone)}.` : "";
  text = clampText(text, rule.maxChars - (phoneLine ? phoneLine.length + 2 : 0));
  if (text.length < 20) return null;

  const raw = [...(Array.isArray(data.hashtags) ? data.hashtags.filter((t): t is string => typeof t === "string") : []), ...inline];
  const tags: string[] = [];
  const seen = new Set<string>();
  const push = (t: string | null) => { if (t && !seen.has(t.toLowerCase()) && tags.length < rule.maxTags) { seen.add(t.toLowerCase()); tags.push(t); } };
  raw.forEach((t) => push(normaliseHashtag(t)));
  if (tags.length < rule.minTags) defaultHashtags(ctx.business).forEach(push);

  return [text, phoneLine, tags.map((t) => `#${t}`).join(" ")].filter(Boolean).join("\n\n");
}

// Link that opens the network: LinkedIn accepts the text prefilled, the others open their site
export function composerUrl(network: Network, text = ""): string {
  if (network === "linkedin" && text) return `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(text.slice(0, 1200))}`;
  return NETWORK_RULES[network].url;
}

// « Plomberie Démo » → « PD »; one word → its first two letters
export function initials(name: string): string {
  const words = clean(name).split(/[\s'’-]+/).filter((w) => /\p{L}/u.test(w) && !/^(de|du|des|la|le|les|et|l|d)$/i.test(w));
  if (!words.length) return "A";
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase();
  return (words[0]![0]! + words[1]![0]!).toUpperCase();
}

// Generation limits per business: 8 in 10 minutes, 40 in a day
export const RATE_LIMITS = [{ seconds: 600, max: 8 }, { seconds: 86400, max: 40 }] as const;
export function isRateLimited(createdAt: number[], now: number): boolean {
  return RATE_LIMITS.some((l) => createdAt.filter((t) => t > now - l.seconds).length >= l.max);
}

// « À l’instant », « Il y a 12 min », « Il y a 3 h », « Le 27/10 » (shown under a post)
export function postAge(createdAt: number, now: number): string {
  const s = Math.max(0, now - createdAt);
  if (s < 60) return "À l’instant";
  if (s < 3600) return `Il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `Il y a ${Math.floor(s / 3600)} h`;
  const d = new Date(createdAt * 1000);
  return `Le ${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
