import { test } from "node:test";
import assert from "node:assert/strict";
import { demoJobs, groupAgenda, timeRange } from "../src/lib/agenda.ts";

test("agenda: grouped by Paris day from today, booked ones kept, demo slots left free", () => {
  const now = Math.floor(Date.parse("2026-10-29T20:00:00Z") / 1000);
  const booked = { start: Math.floor(Date.parse("2026-10-30T10:00:00Z") / 1000), end: Math.floor(Date.parse("2026-10-30T11:00:00Z") / 1000), title: "Plus d’eau chaude, Mathieu", place: "1 rue Royale", booked: true, link_token: "x" };
  const days = groupAgenda([booked, ...demoJobs()], now);
  assert.equal(days[0]!.label, "Demain");
  assert.ok(days[0]!.items.some((i) => i.booked));
  assert.equal(timeRange(booked), "11 h à 12 h");
  assert.ok(days.some((d) => d.label === "Lundi 2 novembre"));
  // The two pitch slots (30/10 11 h, 2/11 14 h) are free among the fake jobs
  const busyAt = (iso: string) => demoJobs().some((j) => j.start * 1000 <= Date.parse(iso) && Date.parse(iso) < j.end * 1000);
  assert.ok(!busyAt("2026-10-30T10:00:00Z"));
  assert.ok(!busyAt("2026-11-02T13:00:00Z"));
});

test("agenda week: Monday to Sunday in Paris, blocks placed on the hours", async () => {
  const { weekOf, placeInWeek, parseDay } = await import("../src/lib/agenda.ts");
  const now = Math.floor(Date.parse("2026-10-29T20:00:00Z") / 1000);
  const w = weekOf(now, now);
  assert.equal(w.monday, "2026-10-26");
  assert.equal(w.next, "2026-11-02");
  assert.equal(w.prev, "2026-10-19");
  assert.equal(w.label, "26 oct. – 1er nov. 2026");
  assert.ok(w.days[3]!.isToday);
  // Friday 30/10 11 h Paris: column 4, 4 hours below 7 h, 1 hour tall
  const fri = Math.floor(Date.parse("2026-10-30T10:00:00Z") / 1000);
  assert.deepEqual(placeInWeek({ start: fri, end: fri + 3600 }, w), { col: 4, top: 4, height: 1 });
  // Monday 2/11 is next week
  const mon = Math.floor(Date.parse("2026-11-02T13:00:00Z") / 1000);
  assert.equal(placeInWeek({ start: mon, end: mon + 3600 }, w), null);
  assert.deepEqual(placeInWeek({ start: mon, end: mon + 3600 }, weekOf(parseDay("2026-11-02")!, now)), { col: 0, top: 7, height: 1 });
});
