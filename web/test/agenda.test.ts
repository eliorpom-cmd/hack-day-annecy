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
