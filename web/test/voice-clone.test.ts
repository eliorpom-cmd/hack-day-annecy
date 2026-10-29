import { test } from "node:test";
import assert from "node:assert/strict";
import { CLONE_SENTENCES, checkWav, encodeWav } from "../src/lib/voice-clone.ts";

const tone = (seconds: number, rate = 16000) => {
  const a = new Float32Array(Math.round(seconds * rate));
  for (let i = 0; i < a.length; i++) a[i] = Math.sin(i / 10) * 0.5;
  return a;
};

test("three French sentences to read", () => {
  assert.equal(CLONE_SENTENCES.length, 3);
  for (const s of CLONE_SENTENCES) assert.ok(s.length > 60 && s.length < 160);
});

test("encoded WAV is mono 16-bit and its duration is read back", () => {
  const wav = encodeWav([tone(8), tone(8)], 16000);
  assert.equal(String.fromCharCode(...wav.subarray(0, 4)), "RIFF");
  assert.equal(new DataView(wav.buffer).getUint16(22, true), 1); // mono
  assert.equal(wav.length, 44 + 8 * 16000 * 2);
  const r = checkWav(wav);
  assert.ok(r.ok && Math.abs(r.seconds - 8) < 0.01);
});

test("bad recordings are refused with a French hint", () => {
  const short = checkWav(encodeWav([tone(1)], 16000));
  assert.ok(!short.ok && /trop court/.test(short.hint));
  const long = checkWav(encodeWav([tone(61)], 16000));
  assert.ok(!long.ok && /trop long/.test(long.hint));
  assert.ok(!checkWav(new TextEncoder().encode("not a wav file at all, just some text bytes here ok")).ok);
  assert.ok(!checkWav(new Uint8Array(7_000_000)).ok);
});
