import test from "node:test";
import assert from "node:assert/strict";
import worker from "../cloudflare-worker/worker.js";

const request = body => new Request("https://example.test/api/ai", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

test("Worker rejects PDF references above the bounded payload size before inference", async () => {
  let calls = 0;
  const response = await worker.fetch(request({prompt:"تحضير", referenceText:"x".repeat(18001), context:{task:"lesson_preparation"}}), {AI:{run:async()=>{calls++;return {response:"ok"};}}});
  const body = await response.json();
  assert.equal(response.status, 413);
  assert.equal(body.code, "prompt_too_long");
  assert.equal(calls, 0);
});

test("Worker makes one bounded inference and returns duration and source metadata", async () => {
  let calls = 0;
  let options;
  let runOptions;
  const response = await worker.fetch(request({
    prompt:"حضّر الدرس",
    referenceText:"نص الكتاب",
    context:{task:"lesson_preparation",bookTitle:"كتاب",pageStart:2,pageEnd:3},
  }), {AI:{run:async(model, input, third)=>{calls++; options={model,input}; runOptions=third; return {response:"الأهداف التعليمية\\nأن يشرح الطالب الفكرة."};}}});
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(calls, 1);
  assert.equal(options.model, "@cf/zai-org/glm-4.7-flash");
  assert.equal(options.input.max_completion_tokens, 1800);
  assert.deepEqual(runOptions, {rejectIfBusy:true});
  assert.equal(body.source.referenceChars, "نص الكتاب".length);
  assert.equal(typeof body.durationMs, "number");
  assert.match(body.text, /الأهداف التعليمية/);
});

test("Worker returns a retryable capacity error instead of waiting in an AI queue", async () => {
  const response = await worker.fetch(request({prompt:"حضّر",referenceText:"نص",context:{task:"lesson_preparation"}}), {AI:{run:async()=>{throw new Error("Capacity temporarily exceeded");}}});
  const body = await response.json();
  assert.equal(response.status, 429);
  assert.equal(body.code, "ai_capacity_busy");
  assert.match(body.error, /أعد المحاولة/);
  assert.equal(typeof body.durationMs, "number");
});

test("Worker does not retry empty model output", async () => {
  let calls = 0;
  const response = await worker.fetch(request({prompt:"حضّر", referenceText:"نص", context:{task:"lesson_preparation"}}), {AI:{run:async()=>{calls++;return {response:"رد بلا نص"};}}});
  const body = await response.json();
  assert.equal(response.status, 502);
  assert.equal(body.code, "empty_ai_response");
  assert.equal(calls, 1);
});
