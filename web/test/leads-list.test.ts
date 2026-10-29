import { test } from "node:test";
import assert from "node:assert/strict";
import { dayLabel, groupByDay, hourLabel, statusLabel, toCallBack, whenLabel } from "../src/lib/leads-group.ts";

// 2026-10-29 15:00 Paris (UTC+1 after the October time change) = 14:00 UTC
const NOW = Date.UTC(2026, 9, 29, 14, 0) / 1000;
const H = 3600;
const lead = (id: string, urgency: "urgence" | "urgent" | "normal", status: string, created_at: number) =>
  ({ id, name: id, phone: null, subject: null, need: null, urgency, status, link_token: id, created_at });

test("À rappeler: only new leads, Urgence > Prioritaire > Normal, newest first", () => {
  const list = toCallBack([
    lead("n-old", "normal", "nouveau", NOW - 5 * H),
    lead("u-old", "urgence", "nouveau", NOW - 30 * H),
    lead("p", "urgent", "nouveau", NOW - 1 * H),
    lead("n-new", "normal", "nouveau", NOW - 1 * H),
    lead("u-new", "urgence", "nouveau", NOW - 2 * H),
    lead("done", "urgence", "rappele", NOW),
  ]);
  assert.deepEqual(list.map((l) => l.id), ["u-new", "u-old", "p", "n-new", "n-old"]);
});

test("Tous: newest first, grouped by Paris day with French labels", () => {
  const groups = groupByDay([
    lead("a", "normal", "nouveau", NOW - 3 * 86400),
    lead("b", "normal", "gagne", NOW - 1 * H),
    lead("c", "normal", "nouveau", NOW - 26 * H),
    lead("d", "normal", "nouveau", NOW - 14.5 * H), // 00:30 Paris today, still 23:30 UTC yesterday
  ], NOW);
  assert.deepEqual(groups.map((g) => g.label), ["Aujourd’hui", "Hier", "lundi 26 octobre"]);
  assert.deepEqual(groups.map((g) => g.items.map((l) => l.id)), [["b", "d"], ["c"], ["a"]]);
});

test("labels", () => {
  assert.equal(hourLabel(NOW - 28 * 60), "14 h 32");
  assert.equal(dayLabel("2026-10-29", "2026-10-29"), "Aujourd’hui");
  assert.equal(whenLabel(NOW - H, NOW), "14 h 00");
  assert.equal(whenLabel(NOW - 24 * H, NOW), "hier");
  assert.equal(whenLabel(NOW - 3 * 86400, NOW), "lundi");
  assert.equal(whenLabel(NOW - 10 * 86400, NOW), "19 octobre");
  assert.equal(statusLabel("rappele"), "Rappelé");
  assert.equal(statusLabel("nouveau"), null);
});
