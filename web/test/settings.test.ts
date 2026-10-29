import { test } from "node:test";
import assert from "node:assert/strict";
import { docSummary, frTime, hoursSummary, parseSection } from "../src/lib/settings.ts";

test("frTime: French hour format", () => {
  assert.equal(frTime("08:00"), "8 h");
  assert.equal(frTime("14:30"), "14 h 30");
});

test("hoursSummary: same slots on consecutive days", () => {
  const week = [0, 1, 2, 3, 4].map((weekday) => ({ weekday, opens: "08:00", closes: "18:00" }));
  assert.equal(hoursSummary(week), "Lundi au vendredi, 8 h à 18 h");
  assert.equal(hoursSummary([{ weekday: 5, opens: "09:00", closes: "12:30" }]), "Samedi, 9 h à 12 h 30");
});

test("hoursSummary: split days, gaps and empty", () => {
  assert.equal(hoursSummary([]), "Aucun horaire");
  assert.equal(hoursSummary([
    { weekday: 0, opens: "08:00", closes: "12:00" }, { weekday: 0, opens: "14:00", closes: "18:00" },
    { weekday: 1, opens: "08:00", closes: "12:00" }, { weekday: 1, opens: "14:00", closes: "18:00" },
  ]), "Lundi et mardi, 8 h à 12 h, 14 h à 18 h");
  assert.equal(hoursSummary([{ weekday: 0, opens: "08:00", closes: "18:00" }, { weekday: 2, opens: "08:00", closes: "18:00" }]), "2 jours par semaine");
});

test("docSummary and parseSection", () => {
  assert.equal(docSummary([]), "Rien pour l’instant");
  assert.equal(docSummary([{ kind: "info" }, { kind: "price" }, { kind: "price" }]), "1 question · 2 prix");
  assert.equal(parseSection("horaires"), "horaires");
  assert.equal(parseSection("x"), null);
});
