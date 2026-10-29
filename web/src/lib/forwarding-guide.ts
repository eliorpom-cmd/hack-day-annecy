// Full-screen guide that sets call forwarding on the artisan's own mobile, one screen per code (texts: COPY.md).
// iPhone opens no web link that holds * or #: the code is copied, then pasted in the Phone app.
// Android opens the dialer with the code typed in. Pure, tested in test/forwarding-guide.test.ts.
import { forwardingCodes, forwardingDelay, STOP_CODE } from "./forwarding.ts";

export type Platform = "iphone" | "android";
export const isPlatform = (v: unknown): v is Platform => v === "iphone" || v === "android";

export type GuideStep =
  | { kind: "code"; title: string; why: string; code: string; href: string; lines: string[] }
  | { kind: "test"; title: string; lines: string[] };

const NB = "\u00a0"; // non-breaking space before « : ? » and inside « » (COPY.md)
const q = (s: string) => `«${NB}${s}${NB}»`;

// What the operator answers once a code is accepted, as the artisan sees it on screen
const CONFIRM = `Attendez le message ${q("Renvoi activé")} ou ${q("Enregistrement réussi")}, puis fermez-le.`;

function codeLines(platform: Platform): string[] {
  return platform === "android"
    ? [
        `Appuyez sur ${q("Composer le code")}. Le clavier s’ouvre avec le code déjà tapé.`,
        "Appuyez sur la touche verte d’appel.",
        CONFIRM,
      ]
    : [
        `Appuyez sur ${q("Copier le code")}.`,
        `Ouvrez l’app Téléphone, onglet ${q("Clavier")}.`,
        `Appuyez longuement en haut, là où s’affiche le numéro, puis sur ${q("Coller")}.`,
        "Appuyez sur la touche verte d’appel.",
        CONFIRM,
      ];
}

// Formats « +33612345678 » as « 06 12 34 56 78 » (other countries stay as they are)
export function frPhone(e164: string | null | undefined): string {
  const s = (e164 ?? "").replace(/[^\d+]/g, "");
  if (/^\+33\d{9}$/.test(s)) return `0${s.slice(3)}`.replace(/(\d{2})(?=\d)/g, "$1 ");
  return s;
}

export function guideSteps(opts: { platform: Platform; answering: string; mobile: string | null; seconds: number }): GuideStep[] {
  const delay = forwardingDelay(opts.seconds);
  const why: Record<string, string> = {
    "no-answer": `Si vous ne répondez pas en ${delay}${NB}secondes, l’appel passe au répondeur.`,
    busy: "Si vous refusez l’appel ou si vous êtes déjà en ligne, l’appel passe au répondeur.",
    unreachable: "Si votre portable est éteint ou sans réseau, l’appel passe au répondeur.",
  };
  const titles: Record<string, string> = {
    "no-answer": "Quand vous ne répondez pas",
    busy: "Quand vous êtes occupé",
    unreachable: "Quand vous n’avez pas de réseau",
  };
  const steps: GuideStep[] = forwardingCodes(opts.answering, delay).map((c) => ({
    kind: "code", title: titles[c.key]!, why: why[c.key]!, code: c.code, href: c.href, lines: codeLines(opts.platform),
  }));
  const mobile = frPhone(opts.mobile);
  steps.push({
    kind: "test",
    title: "Faites un essai",
    lines: [
      mobile ? `Depuis un autre téléphone, appelez votre portable, le ${mobile}.` : "Depuis un autre téléphone, appelez votre portable.",
      `Ne décrochez pas. Après ${delay}${NB}secondes, le répondeur prend l’appel.`,
      "Vous recevez ensuite un message avec la demande.",
    ],
  });
  return steps;
}

export const STOP_LINE = `Pour arrêter le renvoi un jour${NB}: composez ${STOP_CODE}.`;
