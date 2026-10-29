// Pure helpers for the « Réglages » page: one-line values shown in the settings list (texts: COPY.md).

export type SettingsHour = { weekday: number; opens: string; closes: string };
export type SettingsFaq = { kind: "info" | "price" | string };

const DAYS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];

// "08:00" → "8 h", "08:30" → "8 h 30" (COPY.md: hours as « 14 h 30 »)
export function frTime(t: string): string {
  const [h, m] = t.split(":");
  const hour = String(Number(h));
  return m && m !== "00" ? `${hour} h ${m}` : `${hour} h`;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// « Lundi au vendredi, 8 h à 18 h » when every open day has the same slots, else « 5 jours par semaine »
export function hoursSummary(hours: SettingsHour[]): string {
  if (!hours.length) return "Aucun horaire";
  const byDay = new Map<number, string>();
  for (const h of [...hours].sort((a, b) => a.weekday - b.weekday || a.opens.localeCompare(b.opens))) {
    const slot = `${frTime(h.opens)} à ${frTime(h.closes)}`;
    byDay.set(h.weekday, byDay.has(h.weekday) ? `${byDay.get(h.weekday)}, ${slot}` : slot);
  }
  const days = [...byDay.keys()];
  const slots = new Set(byDay.values());
  if (slots.size === 1) {
    const slot = [...slots][0];
    if (days.length === 1) return `${cap(DAYS[days[0]])}, ${slot}`;
    const consecutive = days.every((d, i) => i === 0 || d === days[i - 1] + 1);
    if (consecutive) return `${cap(DAYS[days[0]])} ${days.length === 2 ? "et" : "au"} ${DAYS[days[days.length - 1]]}, ${slot}`;
  }
  return days.length === 1 ? "1 jour par semaine" : `${days.length} jours par semaine`;
}

// « 3 questions · 2 prix »
export function docSummary(faqs: SettingsFaq[]): string {
  const prices = faqs.filter((f) => f.kind === "price").length;
  const questions = faqs.length - prices;
  if (!faqs.length) return "Rien pour l’instant";
  const parts: string[] = [];
  if (questions) parts.push(`${questions} question${questions > 1 ? "s" : ""}`);
  if (prices) parts.push(`${prices} prix`);
  return parts.join(" · ");
}

export const SECTIONS = ["horaires", "sonnerie", "portable", "documentation", "accueil", "numero"] as const;
export type Section = (typeof SECTIONS)[number];
export function parseSection(v: string | null): Section | null {
  return (SECTIONS as readonly string[]).includes(v ?? "") ? (v as Section) : null;
}
