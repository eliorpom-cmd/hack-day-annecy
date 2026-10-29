// « Documentation par questions »: after the website scan (or the manual form), the répondeur asks the artisan
// the questions clients often ask that his site does not answer. Pure: prompt, parsing, fallback list.
// Tested in test/interview.test.ts; the Workers AI call lives in interview-run.ts.

export type InterviewKind = "info" | "price";
export type InterviewQuestion = { question: string; kind: InterviewKind };
export type InterviewContext = {
  name?: string; trade?: string; city?: string; description?: string;
  faqs?: { question: string; answer?: string }[];
};

export const MIN_QUESTIONS = 5;
export const MAX_QUESTIONS = 7;

export const INTERVIEW_SYSTEM = `Tu prépares l'assistant téléphonique d'un artisan français. Tu reçois ce que l'on sait déjà de lui (fiche et questions déjà répondues).
Liste les questions qu'un client poserait au téléphone à cet artisan et dont la réponse N'EST PAS déjà dans ce qu'on sait.
Réponds UNIQUEMENT avec un objet JSON de cette forme exacte :
{"questions": [{"question": string, "kind": "info" | "price"}]}
Règles :
- Entre 5 et 7 questions, en français, posées comme un client les poserait, en vouvoyant l'artisan (« Vous vous déplacez jusqu'où ? »).
- Une question courte par ligne : 12 mots maximum, un seul sujet.
- Pense d'abord à : prix du déplacement, intervention le week-end ou en urgence, zone d'intervention, délai avant de venir, devis gratuit, moyens de paiement, prix des interventions courantes du métier.
- "kind" vaut "price" quand la réponse attendue est un prix, sinon "info".
- Ne repose jamais une question déjà répondue, même formulée autrement.
- Adapte au métier (un serrurier : ouverture de porte ; un plombier : débouchage ; un électricien : mise aux normes).`;

// Text sent to the model: the record and the questions already answered
export function buildInterviewInput(c: InterviewContext): string {
  const lines = [
    `Entreprise : ${clean(c.name) || "non renseignée"}`,
    `Métier : ${clean(c.trade) || "artisan"}`,
    `Ville : ${clean(c.city) || "non renseignée"}`,
    `Présentation : ${clean(c.description) || "aucune"}`,
    "",
    "Questions déjà répondues :",
    ...(c.faqs?.length ? c.faqs.slice(0, 40).map((f) => `- ${clean(f.question)} → ${clean(f.answer).slice(0, 200)}`) : ["(aucune)"]),
  ];
  return lines.join("\n");
}

const clean = (v: unknown) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "");

// Topics of the usual questions. A topic already covered by the record or an answered FAQ is not asked again.
const TOPICS: { re: RegExp; fallback: InterviewQuestion }[] = [
  { re: /d[ée]placement|frais de (venue|route)/i, fallback: { question: "Combien coûte le déplacement\u00a0?", kind: "price" } },
  { re: /week-?end|samedi|dimanche|urgence|nuit|7\s?j|24\s?h/i, fallback: { question: "Intervenez-vous le week-end ou en urgence\u00a0?", kind: "info" } },
  { re: /zone|secteur|jusqu.o[uù]|km|kilom|alentours|rayon|communes?/i, fallback: { question: "Vous vous déplacez jusqu’où\u00a0?", kind: "info" } },
  { re: /d[ée]lai|sous combien|rapidement|quand pouvez/i, fallback: { question: "Sous quel délai pouvez-vous venir\u00a0?", kind: "info" } },
  { re: /devis/i, fallback: { question: "Le devis est-il gratuit\u00a0?", kind: "info" } },
  { re: /paiement|payer|r[èe]glement|ch[èe]que|esp[èe]ces|carte bancaire|virement/i, fallback: { question: "Quels moyens de paiement acceptez-vous\u00a0?", kind: "info" } },
  { re: /intervention courante|tarif horaire|taux horaire|prix d.une intervention/i, fallback: { question: "Combien coûte une intervention courante\u00a0?", kind: "price" } },
];

// Questions used when the model is not available, minus the topics the artisan already answered
export function fallbackQuestions(c: InterviewContext = {}): InterviewQuestion[] {
  const known = knownText(c);
  return TOPICS.filter((t) => !t.re.test(known)).map((t) => ({ ...t.fallback }));
}

function knownText(c: InterviewContext): string {
  return [c.description, ...(c.faqs ?? []).map((f) => `${f.question} ${f.answer ?? ""}`)].map(clean).join("\n");
}

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
const STOP = new Set(["vous", "est", "il", "le", "la", "les", "de", "du", "des", "un", "une", "a", "au", "aux", "en", "et", "ou", "ce", "que", "qui", "quel", "quelle", "quels", "quelles", "combien", "pour", "sur", "votre", "vos"]);
const words = (s: string) => new Set(norm(s).split(" ").filter((w) => w.length > 2 && !STOP.has(w)));

// Same question asked twice in other words (most of the meaningful words shared)
export function sameQuestion(a: string, b: string): boolean {
  if (norm(a) === norm(b)) return true;
  const wa = words(a), wb = words(b);
  if (!wa.size || !wb.size) return false;
  let shared = 0;
  for (const w of wa) if (wb.has(w)) shared++;
  return shared / Math.min(wa.size, wb.size) >= 0.6;
}

// Clean question line: capital first letter, ends with « ? » after a non-breaking space (COPY.md)
function tidy(q: string): string {
  let s = clean(q).replace(/^[-•\d.)\s]+/, "").replace(/\s*\?+\s*$/, "").trim();
  if (!s) return "";
  s = s.charAt(0).toUpperCase() + s.slice(1);
  return `${s}\u00a0?`;
}

// Turns the model answer into 5 to 7 questions: drops duplicates and questions already answered,
// tops up from the fallback list when the model gave too few. Never throws.
export function parseInterview(raw: Record<string, unknown> | null, c: InterviewContext = {}): InterviewQuestion[] {
  const answered = (c.faqs ?? []).map((f) => f.question);
  const known = knownText(c);
  // Topics of the usual list already covered by the record (« Devis gratuit » in the description…)
  const covered = TOPICS.filter((t) => t.re.test(known));
  const out: InterviewQuestion[] = [];
  const push = (q: InterviewQuestion) => {
    if (out.length >= MAX_QUESTIONS) return;
    if (!q.question || q.question.length > 140) return;
    if (answered.some((a) => sameQuestion(a, q.question))) return;
    if (covered.some((t) => t.re.test(q.question))) return;
    if (out.some((x) => sameQuestion(x.question, q.question))) return;
    out.push(q);
  };
  const list = Array.isArray(raw?.questions) ? raw.questions : [];
  for (const item of list) {
    const r = (typeof item === "string" ? { question: item } : item ?? {}) as Record<string, unknown>;
    const question = tidy(typeof r.question === "string" ? r.question : "");
    const kind: InterviewKind = r.kind === "price" || /\b(combien|prix|tarif|co[uû]te)\b/i.test(question) ? "price" : "info";
    push({ question, kind });
  }
  if (out.length < MIN_QUESTIONS) for (const f of fallbackQuestions(c)) push(f);
  return out;
}
