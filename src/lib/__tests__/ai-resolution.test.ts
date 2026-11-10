import test from "node:test";
import assert from "node:assert/strict";
import { classifyCall, classifyChat, resolutionForRange, type CallForResolution, type ChatForResolution } from "../ai-resolution";

const NOW = Date.parse("2026-11-09T12:00:00Z");
const ago = (days: number) => new Date(NOW - days * 86_400_000).toISOString();
const spoke = [{ role: "assistant", text: "Hello" }, { role: "user", text: "Hi" }];
const greetOnly = [{ role: "assistant", text: "Hello" }];
const call = (o: Partial<CallForResolution>): CallForResolution => ({ created_at: ago(1), outcome: "customer-ended-call", duration_seconds: 60, transcript: spoke, ...o });
const chat = (o: Partial<ChatForResolution>): ChatForResolution => ({ created_at: ago(1), needs_human: false, needs_human_resolved_at: null, ai_enabled: true, ...o });

test("a normal finished call is handled by AI", () => {
  assert.equal(classifyCall(call({})), "ai");
  assert.equal(classifyCall(call({ outcome: "assistant-ended-call" })), "ai");
  assert.equal(classifyCall(call({ outcome: "completed" })), "ai");
});
test("transfers, failures and no answer need a human", () => {
  for (const outcome of ["assistant-forwarded-call", "customer-transferred-call", "pipeline-error-openai-llm-failed", "customer-did-not-answer", "voicemail", "missed"]) {
    assert.equal(classifyCall(call({ outcome })), "human", outcome);
  }
});
test("short calls where the caller never spoke are not real conversations", () => {
  assert.equal(classifyCall(call({ duration_seconds: 7, transcript: [] })), "excluded");
  assert.equal(classifyCall(call({ duration_seconds: 7, transcript: greetOnly })), "excluded");
  assert.equal(classifyCall(call({ duration_seconds: null, transcript: [], outcome: "twilio-reported-customer-misdialed" })), "excluded");
  assert.equal(classifyCall(call({ duration_seconds: 7, transcript: spoke })), "ai");
  assert.equal(classifyCall(call({ duration_seconds: 12, transcript: [] })), "ai");
});
test("text uses the handoff and takeover flags", () => {
  assert.equal(classifyChat(chat({})), "ai");
  assert.equal(classifyChat(chat({ needs_human: true })), "human");
  assert.equal(classifyChat(chat({ needs_human_resolved_at: ago(1) })), "human");
  assert.equal(classifyChat(chat({ ai_enabled: false })), "human");
});
test("mixed phone and text: excluded calls count on neither side", () => {
  const r = resolutionForRange(
    [call({}), call({ outcome: "assistant-forwarded-call" }), call({ duration_seconds: 2, transcript: [] })],
    [chat({}), chat({ needs_human: true })],
    NOW, 7,
  );
  assert.deepEqual(r.current, { rate: 50, handled: 2, needed: 2 });
});
test("only phone calls still produce a rate", () => {
  assert.equal(resolutionForRange([call({}), call({})], [], NOW, 7).current.rate, 100);
});
test("nothing real gives no rate, never 0%", () => {
  assert.equal(resolutionForRange([call({ duration_seconds: 1, transcript: [] })], [], NOW, 7).current.rate, null);
});
for (const [days, inside, previous] of [[7, 6, 8], [30, 29, 31], [90, 89, 91]] as const) {
  test(`${days}d range puts rows in the right window`, () => {
    const r = resolutionForRange([call({ created_at: ago(inside) }), call({ created_at: ago(previous), outcome: "voicemail" }), call({ created_at: ago(days * 2 + 1) })], [], NOW, days);
    assert.deepEqual(r.current, { rate: 100, handled: 1, needed: 0 });
    assert.deepEqual(r.previous, { rate: 0, handled: 0, needed: 1 });
  });
}
