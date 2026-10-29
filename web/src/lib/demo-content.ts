// Demo accounts (« Voir la démo », « Essayer la configuration »): texts written in advance, in the shape the model
// answers, so the demo never waits on Workers AI nor spends credits. The routes run them through the same cleanup
// as a model answer. Also the page addresses pre-filled in the forms. Pure: tested in test/demo-content.test.ts.
import type { Network } from "./social.ts";

const NB = " "; // non-breaking space before « : ? » (COPY.md)

export type DemoBusiness = { name: string; trade: string; city: string; first_name?: string | null; last_name?: string | null };

const nameOf = (b: DemoBusiness) => b.name.trim() || [b.first_name, b.last_name].map((s) => (s ?? "").trim()).filter(Boolean).join(" ") || "Plomberie Martin";
const cityOf = (b: DemoBusiness) => b.city.trim() || "Annecy";
const tradeOf = (b: DemoBusiness) => b.trade.trim().toLowerCase() || "plombier";
const firstOf = (b: DemoBusiness) => b.first_name?.trim() || "Marc";
const slug = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// Addresses pre-filled in « Vos pages » and « J'ai une fiche Google »
export function demoPages(b: DemoBusiness): Record<Network, string> & { google: string } {
  const s = slug(nameOf(b));
  const c = slug(cityOf(b));
  return {
    facebook: `facebook.com/${s.replace(/-/g, "")}.${c}`,
    instagram: `@${s.replace(/-/g, ".")}`,
    linkedin: `linkedin.com/company/${s}`,
    google: `https://g.page/${s}-${c}`,
  };
}

// ---------- Réseaux sociaux ----------

type PostIdea = { match: RegExp; text: (b: DemoBusiness) => string; tags: string[] };
const POSTS: PostIdea[] = [
  {
    match: /fuite|r[ée]flexe|d[ée]g[âa]t/i,
    text: (b) => `Une fuite sous l’évier ou derrière les WC${NB}? Premier réflexe : coupez l’eau au compteur. Ensuite, épongez et mettez une bassine. Je passe dans la journée sur ${cityOf(b)} et alentours, et je répare proprement.`,
    tags: ["fuite", "plomberie"],
  },
  {
    match: /chauffe-eau|ballon|eau chaude/i,
    text: (b) => `Plus d’eau chaude ce matin chez un client de ${cityOf(b)}. Diagnostic : la résistance du chauffe-eau était morte. Remplacée dans la foulée, eau chaude retrouvée le soir même. Un chauffe-eau qui fait du bruit ou chauffe mal, ça se surveille.`,
    tags: ["chauffeeau", "dépannage"],
  },
  {
    match: /pr[ée]senter|parcours|qui je suis/i,
    text: (b) => `Je suis ${firstOf(b)}, ${tradeOf(b)} à ${cityOf(b)}. Après plusieurs années dans un autre métier, j’ai passé mon diplôme pour faire ce que j’aime : réparer, installer, rendre service. Je travaille seul, je viens moi-même, et je rappelle toujours.`,
    tags: ["artisan", "reconversion"],
  },
  {
    match: /saison|automne|hiver|printemps|[ée]t[ée]|conseil/i,
    text: () => `Avant les premiers froids, pensez à purger vos radiateurs. Un radiateur froid en haut, c’est de l’air dans le circuit. Une clé, un chiffon, deux minutes par radiateur. Si ça ne suffit pas, je viens faire le point sur votre chauffage.`,
    tags: ["chauffage", "conseil"],
  },
  {
    match: /avant|apr[èe]s|chantier|termin/i,
    text: (b) => `Avant / après d’une salle de bain à ${cityOf(b)} : baignoire remplacée par une douche à l’italienne, nouveau mitigeur et évacuation refaite. Trois jours de travaux, un client ravi de sa nouvelle pièce.`,
    tags: ["salledebain", "rénovation"],
  },
];

// The model's answer for a post: {text, hashtags}; the topic picks the idea, the network adds its tags
export function demoPostRaw(b: DemoBusiness, network: Network, topic: string): { text: string; hashtags: string[] } {
  const idea = POSTS.find((p) => p.match.test(topic)) ?? {
    text: (x: DemoBusiness) => `${topic.charAt(0).toUpperCase()}${topic.slice(1).replace(/\.$/, "")} : c’était ma journée sur ${cityOf(x)}. Un travail propre, un client content. Besoin d’un ${tradeOf(x)} près de chez vous${NB}? Je viens moi-même.`,
    tags: ["artisan"],
  };
  const city = slug(cityOf(b)).replace(/-/g, "");
  const tags = network === "instagram" ? [...idea.tags, `${slug(tradeOf(b)).replace(/-/g, "")}${city}`, city] : network === "facebook" ? [city] : [];
  return { text: idea.text(b), hashtags: tags };
}

// ---------- Publicités ----------

export function demoAdRaw(b: DemoBusiness, channel: "google" | "meta"): Record<string, unknown> {
  const city = cityOf(b);
  const trade = tradeOf(b);
  if (channel === "meta") {
    return {
      primary_text: `Fuite, plus d’eau chaude, WC bouché${NB}? ${nameOf(b)} vient chez vous à ${city}. Appelez, on décroche.`,
      headline: `Votre ${trade} à ${city}`,
    };
  }
  return {
    headlines: [`${trade.charAt(0).toUpperCase()}${trade.slice(1)} à ${city}`, "Dépannage dans la journée", "Devis gratuit, appelez"],
    descriptions: [
      `Fuite, chauffe-eau, débouchage : ${nameOf(b)} intervient à ${city} et alentours.`,
      "Chaque appel est pris, même pendant un chantier. Rappel dans la journée.",
    ],
    keywords: [
      `${trade} ${city}`, `${trade} urgence ${city}`, `dépannage ${trade} ${city}`, `fuite d'eau ${city}`,
      `chauffe-eau ${city}`, `débouchage ${city}`, `${trade} pas cher ${city}`, `${trade} week-end ${city}`,
      `réparation fuite ${city}`, `${trade} près de chez moi`, `devis ${trade} ${city}`, `salle de bain ${city}`,
    ].map((k) => k.toLowerCase()),
  };
}

// ---------- Fiche Google ----------

export function demoDescriptionRaw(b: DemoBusiness, again = false): { description: string } {
  const name = nameOf(b);
  const city = cityOf(b);
  return {
    description: again
      ? `${firstOf(b)}, ${tradeOf(b)} à ${city}, répare vos fuites, remplace votre chauffe-eau et débouche vos canalisations. Il travaille seul et vient lui-même chez vous, à ${city} et dans les communes voisines. Devis gratuit. Chaque appel est pris, même pendant un chantier, et vous êtes rappelé dans la journée.`
      : `${name}, ${tradeOf(b)} à ${city} et alentours. Dépannage de fuite, débouchage, remplacement de chauffe-eau, salle de bain et entretien de chaudière gaz, pour les particuliers et les petits commerces. Devis gratuit. Votre appel est toujours pris, même pendant un chantier : vous êtes rappelé dans la journée.`,
  };
}

export function demoPostsRaw(b: DemoBusiness): { ideas: { title: string; text: string }[] } {
  const city = cityOf(b);
  return {
    ideas: [
      { title: "Purgez vos radiateurs avant l’hiver", text: `Un radiateur froid en haut, c’est de l’air dans le circuit. Purgez-le avant les grands froids. Besoin d’aide${NB}? ${nameOf(b)} passe à ${city}.` },
      { title: "Chauffe-eau : les signes d’usure", text: "Bruits, eau tiède, traces de rouille : votre chauffe-eau fatigue. Un contrôle évite la panne en plein hiver." },
      { title: "Fuite : le bon réflexe", text: `Coupez l’eau au compteur, puis appelez. Dépannage dans la journée à ${city} et alentours.` },
    ],
  };
}

// Reply to a review pasted by the artisan (the test reviews have their own prepared replies)
export function demoReplyRaw(b: DemoBusiness, stars: number): { reply: string } {
  return {
    reply: stars >= 4
      ? `Merci beaucoup pour votre avis. Ravi que l’intervention vous ait plu. À votre service pour la suite.`
      : `Merci pour votre retour, et pardon pour ce qui n’a pas été. Appelez-moi directement : je veux comprendre et trouver une solution avec vous.`,
  };
}

// ---------- Site ----------

export function demoHeadline(b: DemoBusiness): string {
  return `${tradeOf(b).charAt(0).toUpperCase()}${tradeOf(b).slice(1)} à ${cityOf(b)} : dépannage dans la journée, devis gratuit.`;
}
