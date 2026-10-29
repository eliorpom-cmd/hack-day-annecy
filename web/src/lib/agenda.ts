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
  latest?: boolean; // the last one booked: highlighted
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

// ---- Week grid (Google Calendar-like): 7 columns, hours DAY_START to DAY_END ----

export const DAY_START = 7;
export const DAY_END = 20;
const SHORT_DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const SHORT_MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

export type WeekDay = { y: number; m: number; d: number; short: string; isToday: boolean; startS: number; endS: number };
export type Week = { monday: string; prev: string; next: string; label: string; days: WeekDay[] };

const iso = (p: { year: number; month: number; day: number }) => `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
// Paris date parts of the Monday of the week holding `s`, shifted by `weeks`
function mondayParts(s: number, weeks = 0) {
  const p = parisParts(s * 1000);
  return parisParts(parisTime(p.year, p.month, p.day, 12, 0) - (p.weekday - 7 * weeks) * 86400000);
}

// The week starting on the Monday of `anchorS` (any instant in it), in Paris time
export function weekOf(anchorS: number, nowS: number): Week {
  const mon = mondayParts(anchorS);
  const today = iso(parisParts(nowS * 1000));
  const noon = parisTime(mon.year, mon.month, mon.day, 12, 0);
  const days: WeekDay[] = Array.from({ length: 7 }, (_, i) => {
    const p = parisParts(noon + i * 86400000);
    const startS = Math.floor(parisTime(p.year, p.month, p.day, 0, 0) / 1000);
    const next = parisParts(noon + (i + 1) * 86400000);
    return { y: p.year, m: p.month, d: p.day, short: SHORT_DAYS[i]!, isToday: iso(p) === today, startS, endS: Math.floor(parisTime(next.year, next.month, next.day, 0, 0) / 1000) };
  });
  const first = days[0]!, last = days[6]!;
  const label = first.m === last.m
    ? `${first.d} – ${last.d} ${MONTHS[last.m - 1]} ${last.y}`
    : `${first.d} ${SHORT_MONTHS[first.m - 1]} – ${last.d === 1 ? "1er" : last.d} ${SHORT_MONTHS[last.m - 1]} ${last.y}`;
  return {
    monday: iso(mon), prev: iso(mondayParts(anchorS, -1)), next: iso(mondayParts(anchorS, 1)), label, days,
  };
}

// « 2026-11-02 » → an instant on that day (noon, Paris), or null
export function parseDay(v: string | null): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v ?? "");
  return m ? Math.floor(parisTime(Number(m[1]), Number(m[2]), Number(m[3]), 12, 0) / 1000) : null;
}

// Column (0 = Monday) and vertical place, in hours from DAY_START, of an item in the week; null when outside
export function placeInWeek(item: Pick<AgendaItem, "start" | "end">, week: Week): { col: number; top: number; height: number } | null {
  const col = week.days.findIndex((d) => item.start >= d.startS && item.start < d.endS);
  if (col < 0) return null;
  const p = parisParts(item.start * 1000);
  const from = Math.max(DAY_START, p.hour + p.minute / 60);
  const to = Math.min(DAY_END, from + (item.end - item.start) / 3600);
  if (to <= from) return null;
  return { col, top: from - DAY_START, height: to - from };
}
