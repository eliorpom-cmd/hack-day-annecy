// Pure working-hours logic (no Cloudflare imports) so it runs under node --test.

export type HoursRow = { weekday: number; opens: string; closes: string }; // weekday 0 = Monday

const WEEKDAYS: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };

// Weekday (0 = Monday) and minutes since midnight of `date` in the given time zone
export function localParts(date: Date, timeZone = "Europe/Paris"): { weekday: number; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return { weekday: WEEKDAYS[get("weekday")] ?? 0, minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

// 'HH:MM' → minutes since midnight, or null when malformed
export function toMinutes(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const h = Number(m[1]), min = Number(m[2]);
  if (h > 24 || min > 59) return null;
  return h * 60 + min;
}

// True when `date` falls inside one of the ranges of that weekday (opens inclusive, closes exclusive)
export function isWithinHours(hours: HoursRow[], date: Date, timeZone = "Europe/Paris"): boolean {
  const { weekday, minutes } = localParts(date, timeZone);
  return hours.some((h) => {
    if (h.weekday !== weekday) return false;
    const o = toMinutes(h.opens), c = toMinutes(h.closes);
    return o !== null && c !== null && minutes >= o && minutes < c;
  });
}
