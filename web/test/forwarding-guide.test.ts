import { test } from "node:test";
import assert from "node:assert/strict";
import { frPhone, guideSteps, isPlatform } from "../src/lib/forwarding-guide.ts";

test("the guide has the 3 codes, then the test call", () => {
  const steps = guideSteps({ platform: "android", answering: "+33450123456", mobile: "+33612345678", seconds: 20 });
  assert.deepEqual(steps.map((s) => s.kind), ["code", "code", "code", "test"]);
  const first = steps[0]!;
  assert.equal(first.kind === "code" && first.code, "**61*+33450123456**20#");
  assert.equal(first.kind === "code" && first.href, "tel:**61*+33450123456**20%23");
  assert.match(steps[3]!.lines[0]!, /06 12 34 56 78/);
});

test("iPhone copies and pastes the code, Android dials it", () => {
  const [ios] = guideSteps({ platform: "iphone", answering: "+33450123456", mobile: null, seconds: 20 });
  const [android] = guideSteps({ platform: "android", answering: "+33450123456", mobile: null, seconds: 20 });
  assert.ok(ios!.lines.some((l) => l.includes("Coller")));
  assert.ok(android!.lines.some((l) => l.includes("Composer le code")));
});

test("the no-answer delay follows the ring time, within 5 to 30 s", () => {
  const steps = guideSteps({ platform: "android", answering: "+33450123456", mobile: null, seconds: 40 });
  assert.equal(steps[0]!.kind === "code" && steps[0]!.code, "**61*+33450123456**30#");
  assert.match(steps[3]!.lines[1]!, /30\u00a0secondes/);
});

test("platform and phone helpers", () => {
  assert.ok(isPlatform("iphone") && isPlatform("android") && !isPlatform("windows"));
  assert.equal(frPhone("+33639980000"), "06 39 98 00 00");
  assert.equal(frPhone(null), "");
});
