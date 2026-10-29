import { test } from "node:test";
import assert from "node:assert/strict";
import { forwardingCodes, forwardingDelay, STOP_FORWARDING, telHref } from "../src/lib/forwarding.ts";

test("forwarding codes carry the répondeur number and the no-answer delay", () => {
  const [noAnswer, busy, unreachable] = forwardingCodes("+33 4 50 12 34 56", 20);
  assert.equal(noAnswer.code, "**61*+33450123456**20#");
  assert.equal(busy.code, "**67*+33450123456#");
  assert.equal(unreachable.code, "**62*+33450123456#");
  assert.equal(noAnswer.label, "Si vous ne répondez pas (20 s)");
});

test("tel: links keep * and encode #", () => {
  const [noAnswer, busy] = forwardingCodes("+33450123456", 20);
  assert.equal(noAnswer.href, "tel:**61*+33450123456**20%23");
  assert.equal(busy.href, "tel:**67*+33450123456%23");
  assert.equal(STOP_FORWARDING.code, "##002#");
  assert.equal(STOP_FORWARDING.href, "tel:%23%23002%23");
  assert.equal(telHref("*#06#"), "tel:*%2306%23");
});

test("no-answer delay rounded to the 5-30 s the network accepts", () => {
  assert.equal(forwardingDelay(15), 15);
  assert.equal(forwardingDelay(40), 30);
  assert.equal(forwardingDelay(2), 5);
  assert.equal(forwardingDelay(22), 20);
  assert.equal(forwardingDelay(NaN), 20);
});
