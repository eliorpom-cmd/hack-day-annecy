// Pure helpers for the « Appels » list: ordering, grouping by day, short dates.
// No database import here so the tests can run under plain Node.

export type Urgency = "urgence" | "urgent" | "normal";

export type ListLead = {
  id: string; name: string | null; phone: string | null; subject: string | null; need: string | null;
  urgency: Urgency; status: string; link_token: string | null; created_at: number;
  // Start (unix s) of the appointment booked by the répondeur during this call, if any
  appointment_at?: number | null;
};

export type DayGroup<T> = { key: string; label: string; items: T[] };

// Artisans are in France: days and hours follow Paris time, whatever the server zone
const TZ = "Europe/Paris";
const dayKeyFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
const hourFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const longDayFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" });
const weekdayFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", weekday: "long" });
const dayMonthFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", day: "numeric", month: "long" });

const RANK: Record<Urgency, number> = { urgence: 0, urgent: 1, normal: 2 };

// « 2026-10-29 » in Paris time
export const dayKey = (unixSeconds: number) => dayKeyFmt.format(new Date(unixSeconds * 1000));

// Whole days between two day keys (b - a)
const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);

// « 14 h 32 » (non-breaking spaces, COPY.md)
export function hourLabel(unixSeconds: number): string {
  const [h, m] = hourFmt.format(new Date(unixSeconds * 1000)).split(":");
  return `${h} h ${m}`;
}

// Group title: « Aujourd'hui », « Hier », then « lundi 26 octobre »
export function dayLabel(key: string, todayKey: string): string {
  const diff = daysBetween(key, todayKey);
  if (diff === 0) return "Aujourd’hui";
  if (diff === 1) return "Hier";
  return longDayFmt.format(new Date(`${key}T12:00:00Z`));
}

// Time in a row: hour today, « hier », weekday within the week, else « 26 octobre »
export function whenLabel(unixSeconds: number, now = Date.now() / 1000): string {
  const key = dayKey(unixSeconds);
  const diff = daysBetween(key, dayKey(now));
  if (diff <= 0) return hourLabel(unixSeconds);
  if (diff === 1) return "hier";
  const d = new Date(`${key}T12:00:00Z`);
  return diff < 7 ? weekdayFmt.format(d) : dayMonthFmt.format(d);
}

// « À rappeler »: new leads only, Urgence then Prioritaire then Normal, newest first in each
// A booked appointment needs no call back: it stays in « Tous » with its « Rendez-vous pris » chip
export function toCallBack<T extends Pick<ListLead, "status" | "urgency" | "created_at" | "appointment_at">>(leads: T[]): T[] {
  return leads
    .filter((l) => l.status === "nouveau" && !l.appointment_at)
    .sort((a, b) => (RANK[a.urgency] ?? 2) - (RANK[b.urgency] ?? 2) || b.created_at - a.created_at);
}

// « Tous »: every lead newest first, grouped by Paris day
export function groupByDay<T extends Pick<ListLead, "created_at">>(leads: T[], now = Date.now() / 1000): DayGroup<T>[] {
  const today = dayKey(now);
  const groups: DayGroup<T>[] = [];
  for (const lead of [...leads].sort((a, b) => b.created_at - a.created_at)) {
    const key = dayKey(lead.created_at);
    let g = groups[groups.length - 1];
    if (!g || g.key !== key) groups.push((g = { key, label: dayLabel(key, today), items: [] }));
    g.items.push(lead);
  }
  return groups;
}

// Status shown in the sub-line once the client has been handled (COPY.md « Statuts d'un client »)
const STATUS: Record<string, string> = { rappele: "Rappelé", devis: "Devis envoyé", gagne: "Gagné", perdu: "Perdu" };
export const statusLabel = (status: string): string | null => STATUS[status] ?? null;
