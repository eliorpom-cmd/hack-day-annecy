import { test } from "node:test";
import assert from "node:assert/strict";
import { nextSlots, parisParts, parisTime, pickedSlot, slotLabel } from "../src/lib/calendar.ts";

const week = [0, 1, 2, 3, 4].map((weekday) => ({ weekday, opens: "08:00", closes: "18:00" }));

test("Paris wall-clock times, summer and winter", () => {
  assert.equal(new Date(parisTime(2026, 10, 29, 9, 0)).toISOString(), "2026-10-29T08:00:00.000Z"); // winter, UTC+1
  assert.equal(new Date(parisTime(2026, 7, 1, 9, 0)).toISOString(), "2026-07-01T07:00:00.000Z"); // summer, UTC+2
  assert.equal(parisParts(Date.parse("2026-10-29T08:00:00Z")).weekday, 3); // Thursday
});

test("the two next free slots, 90 min from now, inside the hours", () => {
  // Thursday 29/10/2026 at 10 h in Paris
  const now = parisTime(2026, 10, 29, 10, 0);
  const [a, b] = nextSlots(week, [], now);
  assert.equal(a!.label, "aujourd’hui à 12 h");
  assert.equal(b!.label, "aujourd’hui à 13 h");
});

test("busy slots are skipped, the evening rolls to the next open day", () => {
  const now = parisTime(2026, 10, 30, 17, 0); // Friday 17 h
  const busyMonday = { starts_at: parisTime(2026, 11, 2, 8, 0) / 1000, ends_at: parisTime(2026, 11, 2, 9, 0) / 1000 };
  const [a, b] = nextSlots(week, [busyMonday], now);
  assert.equal(a!.label, "lundi 2 novembre à 9 h");
  assert.equal(b!.label, "lundi 2 novembre à 10 h");
});

test("without fixed hours: Monday to Friday, 8 h to 18 h", () => {
  const now = parisTime(2026, 10, 29, 7, 0);
  assert.equal(nextSlots([], [], now, 1)[0]!.label, "aujourd’hui à 9 h");
});

test("labels and the slot picked by the caller", () => {
  const now = parisTime(2026, 10, 29, 10, 0);
  assert.equal(slotLabel(parisTime(2026, 10, 30, 9, 30), now), "demain à 9 h 30");
  assert.equal(slotLabel(parisTime(2026, 11, 1, 9, 0), now), "dimanche 1er novembre à 9 h");
  const slots = [{ iso: "a" }, { iso: "b" }];
  assert.equal(pickedSlot("creneau_2", slots), "b");
  assert.equal(pickedSlot("aucun", slots), null);
  assert.equal(pickedSlot(null, slots), null);
});

test("demo accounts: the two slots of the pitch script, then the real ones once past", async () => {
  const { demoSlots } = await import("../src/lib/calendar.ts");
  const before = Date.parse("2026-10-29T20:00:00Z");
  const [a, b] = demoSlots([], [], before);
  assert.equal(a.label, "vendredi 30 octobre à 11 h");
  assert.equal(a.iso, "2026-10-30T10:00:00.000Z");
  assert.equal(b.label, "lundi 2 novembre à 14 h");
  assert.equal(b.iso, "2026-11-02T13:00:00.000Z");
  const after = demoSlots([], [], Date.parse("2026-11-05T08:00:00Z"));
  assert.notEqual(after[0].label, "vendredi 30 octobre à 11 h");
});
