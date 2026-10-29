// « Fiche Google », connected profile: until the Google Business Profile API is plugged in, the profile, its
// figures and its reviews are test data built from the business (same artisan, same city, same trade).
// Also the step-by-step guide for an artisan without a profile. Pure: tested in test/google-profile.test.ts.

export type ProfileState = "connected" | "none";
export const isProfileState = (v: unknown): v is ProfileState => v === "connected" || v === "none";

export type TestReview = { id: string; author: string; stars: number; daysAgo: number; text: string; reply: string };
export type ProfileStats = { views: number; calls: number; directions: number };

const NB = " "; // non-breaking space before « : ? » (COPY.md)

type Who = { trade: string; city: string; first_name?: string | null };
const tradeOf = (b: Who) => b.trade.trim().toLowerCase() || "artisan";
const cityOf = (b: Who) => b.city.trim() || "la région";
const signed = (text: string, b: Who) => (b.first_name?.trim() ? `${text}\n${b.first_name.trim()}` : text);

// Six reviews, newest first: five good ones and one bad one, so the artisan sees both kinds of reply
export function testReviews(b: Who): TestReview[] {
  const trade = tradeOf(b);
  const city = cityOf(b);
  const reviews: Omit<TestReview, "reply">[] = [
    { id: "r1", author: "Sophie M.", stars: 5, daysAgo: 2, text: `Intervention rapide un samedi matin. Travail propre, prix annoncé respecté. Je recommande ce ${trade}.` },
    { id: "r2", author: "Karim B.", stars: 2, daysAgo: 6, text: "Bon travail, mais personne n’a répondu au téléphone pendant deux jours. J’ai failli appeler quelqu’un d’autre." },
    { id: "r3", author: "Jean-Pierre L.", stars: 5, daysAgo: 13, text: `Très bon contact, explications claires et devis gratuit. Enfin un ${trade} sérieux à ${city}.` },
    { id: "r4", author: "Claire D.", stars: 4, daysAgo: 21, text: "Travail bien fait et à l’heure. Un peu d’attente pour avoir le devis." },
    { id: "r5", author: "Marc T.", stars: 5, daysAgo: 34, text: "Venu le jour même pour une urgence. Efficace et sympathique." },
    { id: "r6", author: "Nathalie R.", stars: 5, daysAgo: 52, text: "Chantier terminé dans les temps, rien à redire. Merci." },
  ];
  // Prepared replies, used when the reply cannot be written on the spot
  const replies: Record<string, string> = {
    r1: "Merci pour votre avis, Sophie. Ravi d’avoir pu intervenir rapidement. À votre service pour la suite.",
    r2: "Merci pour votre retour, Karim, et pardon pour l’attente au téléphone. Désormais, chaque appel est pris, même quand je suis sur un chantier, et je rappelle dans la journée.",
    r3: "Merci beaucoup, Jean-Pierre. Le devis reste toujours gratuit. Au plaisir de vous revoir.",
    r4: "Merci Claire. Je note pour le devis : je vous l’envoie désormais sous 48 h.",
    r5: "Merci Marc. Les urgences passent en priorité, content d’avoir pu venir le jour même.",
    r6: "Merci Nathalie, ce fut un plaisir de travailler chez vous.",
  };
  return reviews.map((r) => ({ ...r, reply: signed(replies[r.id]!, b) }));
}

export function averageStars(reviews: { stars: number }[]): number {
  if (!reviews.length) return 0;
  return Math.round((reviews.reduce((s, r) => s + r.stars, 0) / reviews.length) * 10) / 10;
}

// « 4,3 » (French decimal comma)
export const frRating = (n: number) => n.toFixed(1).replace(".", ",");

// Figures of the last 30 days, steady for a given business (seeded by its id)
export function testStats(seed: string): ProfileStats {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return { views: 900 + (h % 700), calls: 24 + (h % 23), directions: 12 + ((h >> 5) % 19) };
}

// « il y a 2 jours », « il y a 3 semaines », « il y a 1 mois »
export function reviewAge(daysAgo: number): string {
  if (daysAgo <= 0) return "aujourd’hui";
  if (daysAgo === 1) return "hier";
  if (daysAgo < 7) return `il y a ${daysAgo}${NB}jours`;
  if (daysAgo < 30) { const w = Math.round(daysAgo / 7); return `il y a ${w}${NB}semaine${w > 1 ? "s" : ""}`; }
  const m = Math.round(daysAgo / 30);
  return `il y a ${m}${NB}mois`;
}

export type CreationStep = { title: string; lines: string[]; copy?: { label: string; value: string }; link?: { label: string; href: string } };

// What Google asks, in the order it asks it, with the artisan's own answers ready to copy
export function creationSteps(b: { name: string; trade: string; city: string; first_name?: string | null; last_name?: string | null; phone: string | null; siteUrl: string | null }): CreationStep[] {
  const name = b.name.trim() || [b.first_name, b.last_name, b.trade].map((s) => (s ?? "").trim()).filter(Boolean).join(" ");
  const category = b.trade.trim() ? b.trade.trim().charAt(0).toUpperCase() + b.trade.trim().slice(1) : "";
  const steps: CreationStep[] = [
    {
      title: "Ouvrez Google Business",
      lines: ["Connectez-vous avec votre compte Gmail, ou créez-en un.", `Appuyez sur «${NB}Ajouter votre établissement${NB}».`],
      link: { label: "Ouvrir Google Business", href: "https://business.google.com/create" },
    },
    { title: "Le nom", lines: ["Tapez le nom que vos clients connaissent. Rien d’autre : pas de ville, pas de slogan."], copy: name ? { label: "Votre nom", value: name } : undefined },
    { title: "La catégorie", lines: ["Tapez votre métier, puis choisissez-le dans la liste.", "Vous pourrez ajouter d’autres métiers plus tard."], copy: category ? { label: "Votre métier", value: category } : undefined },
    {
      title: "Où vous travaillez",
      lines: [
        `À la question «${NB}Voulez-vous ajouter un lieu que les clients peuvent visiter${NB}?${NB}», répondez Non si vous travaillez chez vos clients.`,
        `Ajoutez ensuite les villes où vous intervenez${b.city.trim() ? `, à commencer par ${b.city.trim()}` : ""}.`,
      ],
    },
    { title: "Votre numéro", lines: ["Mettez votre numéro habituel. Les appels manqués passent au répondeur."], copy: b.phone ? { label: "Votre numéro", value: b.phone } : undefined },
    { title: "Votre site", lines: [b.siteUrl ? "Collez l’adresse de votre site." : "Pas de site ? Passez cette question, ou créez votre site dans « Site web »."], copy: b.siteUrl ? { label: "Votre site", value: b.siteUrl } : undefined },
    {
      title: "La validation",
      lines: [
        "Google vérifie que vous êtes bien l’artisan : une courte vidéo de votre camion ou de vos outils, ou un code par courrier.",
        "Comptez quelques jours. Votre fiche apparaît ensuite sur Google Maps.",
      ],
    },
  ];
  return steps;
}
