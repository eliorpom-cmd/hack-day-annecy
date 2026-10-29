// Free slots of the artisan's calendar, in Paris time: the répondeur offers the first one, then the second if the
// caller cannot make it, and books the one he picks (post-call webhook). Until the Google Calendar API is plugged
// in, « busy » means the appointments the répondeur already booked. Pure: tested in test/calendar.test.ts.

export type CalendarHour = { weekday: number; opens: string; closes: string }; // weekday 0 = Monday
export type Busy = { starts_at: number; ends_at: number }; // unix seconds
export type Slot = { start: number; end: number; label: string; iso: string };

export const SLOT_MINUTES = 60;
// Not sooner than this after the call: the artisan needs the time to get there
export const LEAD_MINUTES = 90;
// Without fixed hours: Monday to Friday, 8 h to 18 h
const DEFAULT_HOURS: CalendarHour[] = [0, 1, 2, 3, 4].map((weekday) => ({ weekday, opens: "08:00", closes: "18:00" }));

const TZ = "Europe/Paris";
const DAYS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

// Year, month, day, weekday (0 = Monday), hour and minute of an instant, in Paris
export function parisParts(ms: number) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return {
    year: Number(p.year), month: Number(p.month), day: Number(p.day),
    weekday: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(p.weekday!),
    hour: Number(p.hour), minute: Number(p.minute),
  };
}

// Instant (ms) of a Paris wall-clock time; handles summer and winter time
export function parisTime(year: number, month: number, day: number, hour: number, minute: number): number {
  let guess = Date.UTC(year, month - 1, day, hour, minute);
  for (let i = 0; i < 2; i++) {
    const p = parisParts(guess);
    const diff = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) - Date.UTC(year, month - 1, day, hour, minute);
    guess -= diff;
  }
  return guess;
}

const hm = (t: string) => { const [h, m] = t.split(":").map(Number); return { h: h ?? 0, m: m ?? 0 }; };

// « aujourd'hui à 16 h », « demain à 9 h 30 », « lundi 2 novembre à 9 h »
export function slotLabel(startMs: number, nowMs: number): string {
  const s = parisParts(startMs);
  const n = parisParts(nowMs);
  const dayIndex = (p: { year: number; month: number; day: number }) => Math.round(Date.UTC(p.year, p.month - 1, p.day) / 86400000);
  const gap = dayIndex(s) - dayIndex(n);
  const time = s.minute ? `${s.hour} h ${String(s.minute).padStart(2, "0")}` : `${s.hour} h`;
  const day = gap === 0 ? "aujourd’hui" : gap === 1 ? "demain" : `${DAYS[s.weekday]} ${s.day === 1 ? "1er" : s.day} ${MONTHS[s.month - 1]}`;
  return `${day} à ${time}`;
}

// The `count` next free slots of SLOT_MINUTES, within the opening hours, at least LEAD_MINUTES from now
export function nextSlots(hours: CalendarHour[], busy: Busy[], nowMs: number, count = 2): Slot[] {
  const week = hours.length ? hours : DEFAULT_HOURS;
  const earliest = nowMs + LEAD_MINUTES * 60000;
  const slots: Slot[] = [];
  const today = parisParts(nowMs);
  for (let d = 0; d < 21 && slots.length < count; d++) {
    // Calendar day d after today, at noon to stay clear of the clock change
    const noon = parisParts(parisTime(today.year, today.month, today.day, 12, 0) + d * 86400000);
    const ranges = week.filter((h) => h.weekday === noon.weekday).sort((a, b) => a.opens.localeCompare(b.opens));
    for (const r of ranges) {
      const o = hm(r.opens), c = hm(r.closes);
      const close = parisTime(noon.year, noon.month, noon.day, c.h, c.m);
      for (let t = parisTime(noon.year, noon.month, noon.day, o.h, o.m); t + SLOT_MINUTES * 60000 <= close; t += SLOT_MINUTES * 60000) {
        const end = t + SLOT_MINUTES * 60000;
        if (t < earliest) continue;
        if (busy.some((b) => b.starts_at * 1000 < end && t < b.ends_at * 1000)) continue;
        slots.push({ start: t, end, label: slotLabel(t, nowMs), iso: new Date(t).toISOString() });
        if (slots.length >= count) break;
      }
      if (slots.length >= count) break;
    }
  }
  return slots;
}

// The slot the caller picked, as the agent reported it (« creneau_1 », « creneau_2 », anything else = none)
export function pickedSlot(choice: string | null | undefined, slots: { iso?: string | null }[]): string | null {
  const m = /([12])/.exec(choice ?? "");
  if (!m || /aucun|non|none/i.test(choice ?? "")) return null;
  return slots[Number(m[1]) - 1]?.iso ?? null;
}
