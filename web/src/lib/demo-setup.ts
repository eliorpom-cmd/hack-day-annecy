// Demo setup (« Essayer la configuration », for the jury): the setup is pre-filled with Plomberie Martin,
// the fake artisan website served at /plomberie-martin/. Pure: no Cloudflare import, tested in test/demo-setup.test.ts.
// The values below are copied by hand from web/public/plomberie-martin/index.html: no Workers AI call in demo mode.
import { normalizeE164 } from "./phone.ts";
import type { ScannedFaq, ScannedHour } from "./scan.ts";

// Marker: the blank account created by « Essayer la configuration » (POST /api/auth/try) has this e-mail.
// No migration needed, and a real artisan (magic link) can never get it.
const TRIAL_EMAIL = /^essai-[^@\s]+@demo\.local$/;
export const DEMO_ACCOUNT_ID = "demo"; // « Voir la démo » (Plomberie Démo)

export function trialEmail(userId: string): string {
  return `essai-${userId}@demo.local`;
}

export function isDemoSetupEmail(email: string | null | undefined): boolean {
  return typeof email === "string" && TRIAL_EMAIL.test(email);
}

// A trial account may take over a Twilio number held by another demo account (a rehearsal, or Plomberie Démo),
// so that each new run of the demo gets the number the jury calls. Real artisans' numbers are never moved.
export function canTakeOverNumber(current: { email: string }, holder: { id: string; email: string } | null): boolean {
  if (!isDemoSetupEmail(current.email) || !holder) return false;
  return holder.id === DEMO_ACCOUNT_ID || isDemoSetupEmail(holder.email);
}

export function demoSiteUrl(origin: string): string {
  return `${origin.replace(/\/+$/, "")}/plomberie-martin/`;
}

const NB = " "; // non-breaking space before « ? » and units (COPY.md)

export type DemoInterviewQuestion = { question: string; kind: "info" | "price"; answer: string };
export type DemoScan = {
  business: { name: string; first_name: string; last_name: string; trade: string; city: string; description: string };
  hours: ScannedHour[];
  faqs: ScannedFaq[];
};

// What the reading of the site « finds »
export const DEMO_SCAN: DemoScan = {
  business: {
    name: "Plomberie Martin",
    first_name: "Marc",
    last_name: "Martin",
    trade: "plombier",
    city: "Annecy",
    description:
      `Plombier chauffagiste à Annecy et dans un rayon de 30${NB}km. Dépannage de fuite, débouchage, chauffe-eau et ballon, ` +
      `salle de bain clé en main, entretien de chaudière gaz. Particuliers et petits commerces, en neuf comme en rénovation. ` +
      `Je travaille seul. Adresse : 12 rue Royale, 74000 Annecy.`,
  },
  // Monday to Friday 8 h-18 h, Saturday 9 h-12 h, closed on Sunday (0 = Monday)
  hours: [
    ...[0, 1, 2, 3, 4].map((weekday) => ({ weekday, opens: "08:00", closes: "18:00" })),
    { weekday: 5, opens: "09:00", closes: "12:00" },
  ],
  faqs: [
    { question: "Déplacement dans la zone d’intervention", answer: `49${NB}€, offert si les travaux sont réalisés.`, kind: "price" },
    { question: "Main-d’œuvre", answer: `55${NB}€ de l’heure, facturée au temps passé.`, kind: "price" },
    { question: "Majoration le soir et le week-end", answer: `+50${NB}% en urgence le soir et le week-end.`, kind: "price" },
    { question: "Devis", answer: "Gratuit. Les pièces et fournitures sont en plus, détaillées sur le devis.", kind: "price" },
    { question: `Sous quel délai pouvez-vous intervenir${NB}?`, answer: "Pour une urgence (fuite, plus d’eau chaude), en général dans la journée. Pour un entretien ou des travaux, quelques jours à une semaine.", kind: "info" },
    { question: `Intervenez-vous le soir et le week-end${NB}?`, answer: `Oui, en cas de fuite ou sans eau chaude, avec une majoration de 50${NB}%.`, kind: "info" },
    { question: `Dans quelles communes intervenez-vous${NB}?`, answer: `Annecy, Seynod, Cran-Gevrier, Annecy-le-Vieux, Épagny Metz-Tessy, Sévrier et 30${NB}km autour d’Annecy. Pas d’intervention en dehors de cette zone.`, kind: "info" },
    { question: `Le devis est-il payant${NB}?`, answer: `Non, le devis est gratuit. Le déplacement de 49${NB}€ est offert si vous acceptez les travaux.`, kind: "info" },
    { question: `Êtes-vous assuré en garantie décennale${NB}?`, answer: "Oui, responsabilité civile professionnelle et garantie décennale. L’attestation est jointe à chaque devis.", kind: "info" },
    { question: `Comment puis-je payer${NB}?`, answer: "Carte bancaire, virement ou chèque, à la fin de l’intervention.", kind: "info" },
  ],
};

// The interview: what clients ask that the site does not answer, with Marc's answers already typed
export const DEMO_INTERVIEW: DemoInterviewQuestion[] = [
  { question: `Combien coûte un débouchage de WC${NB}?`, kind: "price", answer: `Entre 90 et 150${NB}€ selon l’accès, déplacement compris.` },
  { question: `Combien coûte un chauffe-eau de 200 litres posé${NB}?`, kind: "price", answer: `Entre 900 et 1${NB}400${NB}€ posé selon le modèle. Le prix exact se fait sur devis.` },
  { question: `Entretenez-vous les chaudières au fioul${NB}?`, kind: "info", answer: "Non, seulement les chaudières gaz." },
  { question: `Installez-vous des pompes à chaleur${NB}?`, kind: "info", answer: "Non. Je m’occupe des chauffe-eau, des ballons thermodynamiques et des chaudières gaz." },
  { question: `Je peux acheter les pièces moi-même${NB}?`, kind: "info", answer: "Oui, je peux les poser, mais sans garantie sur la pièce. Sinon je les fournis." },
];

// How long « Lecture de votre site… » stays on screen
export const DEMO_SCAN_MS = 2000;

// The artisan's mobile comes from the DEMO_MOBILE secret (never written in the code); invalid or missing → empty
export function demoMobile(raw: string | null | undefined): string | null {
  return typeof raw === "string" && raw.trim() ? normalizeE164(raw) : null;
}

export type DemoSetup = {
  website: string; scan: DemoScan; interview: DemoInterviewQuestion[]; mobile: string | null; scanMs: number;
};

export function demoSetup(opts: { origin: string; mobile?: string | null }): DemoSetup {
  return {
    website: demoSiteUrl(opts.origin),
    scan: DEMO_SCAN,
    interview: DEMO_INTERVIEW,
    mobile: demoMobile(opts.mobile),
    scanMs: DEMO_SCAN_MS,
  };
}

// Library voice preselected on the voice step: Marc is a man, so a male French voice first (« l’assistant »)
export function pickDemoVoice(voices: { id: string; gender?: string | null; french?: boolean; category?: string }[]): string | null {
  const library = voices.filter((v) => v.category !== "cloned");
  const pick = library.find((v) => v.gender === "male" && v.french !== false) ?? library.find((v) => v.gender === "male") ?? library[0];
  return pick?.id ?? null;
}
