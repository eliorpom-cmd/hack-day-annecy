// « Agenda » (/app/agenda): the artisan's coming appointments, grouped by Paris day. The ones booked by the
// répondeur come from the appointments table; demo accounts also get a believable week of fake jobs around them.
// Pure except agendaFor: tested in test/agenda.test.ts.
import { parisParts, parisTime } from "./calendar.ts";

export type AgendaItem = {
  start: number; // unix s
  end: number;
  title: string;
  place: string | null;
  booked: boolean; // booked by the répondeur during a call
  link_token: string | null;
};
export type AgendaDay = { key: string; label: string; items: AgendaItem[] };

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

// Fake jobs of the demo (Paris time), around the two demo slots (30/10 11 h and 2/11 14 h stay free)
const DEMO_JOBS: [number, number, number, number, number, string, string][] = [
  // year, month, day, hour, minute, title, place
  [2026, 10, 30, 8, 30, "Entretien chaudière, Mme Bernard", "Seynod"],
  [2026, 10, 30, 14, 0, "Devis salle de bain, M. Rossi", "Annecy-le-Vieux"],
  [2026, 10, 30, 16, 30, "Remplacement mitigeur, Mme Dupuis", "Annecy"],
  [2026, 10, 31, 9, 30, "Fuite sous évier, Mme Perrin", "Cran-Gevrier"],
  [2026, 11, 2, 8, 0, "Remplacement chauffe-eau, M. Girard", "Meythet"],
  [2026, 11, 2, 16, 30, "Débouchage, boulangerie Favre", "Annecy"],
  [2026, 11, 3, 10, 0, "Pose de robinetterie, Mme Lambert", "Sevrier"],
  [2026, 11, 3, 15, 0, "Recherche de fuite, M. Morel", "Poisy"],
  [2026, 11, 4, 9, 0, "Entretien chaudière, M. Blanc", "Talloires"],
];

export function demoJobs(): AgendaItem[] {
  return DEMO_JOBS.map(([y, mo, d, h, mi, title, place]) => {
    const start = Math.floor(parisTime(y, mo, d, h, mi) / 1000);
    return { start, end: start + 3600, title, place, booked: false, link_token: null };
  });
}

const hm = (s: number) => {
  const p = parisParts(s * 1000);
  return p.minute ? `${p.hour} h ${String(p.minute).padStart(2, "0")}` : `${p.hour} h`;
};
// « 11 h à 12 h »
export function timeRange(item: Pick<AgendaItem, "start" | "end">): string {
  return `${hm(item.start)} à ${hm(item.end)}`;
}

// Items from today on, sorted, grouped by Paris day: « Aujourd'hui », « Demain », « Lundi 2 novembre »
export function groupAgenda(items: AgendaItem[], nowS: number): AgendaDay[] {
  const key = (s: number) => { const p = parisParts(s * 1000); return `${p.year}-${p.month}-${p.day}`; };
  const dayIndex = (s: number) => { const p = parisParts(s * 1000); return Math.round(Date.UTC(p.year, p.month - 1, p.day) / 86400000); };
  const today = dayIndex(nowS);
  const days: AgendaDay[] = [];
  for (const item of [...items].filter((i) => dayIndex(i.start) >= today).sort((a, b) => a.start - b.start)) {
    const k = key(item.start);
    let day = days.find((d) => d.key === k);
    if (!day) {
      const gap = dayIndex(item.start) - today;
      const p = parisParts(item.start * 1000);
      const label = gap === 0 ? "Aujourd’hui" : gap === 1 ? "Demain" : `${DAYS[p.weekday]} ${p.day === 1 ? "1er" : p.day} ${MONTHS[p.month - 1]}`;
      day = { key: k, label, items: [] };
      days.push(day);
    }
    day.items.push(item);
  }
  return days;
}
