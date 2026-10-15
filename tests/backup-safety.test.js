import test from "node:test";
import assert from "node:assert/strict";
import { decodePdfBackupEntries } from "../src/backup-format.js";

test("rejects a non-array PDF backup before migration", () => {
  assert.throws(() => decodePdfBackupEntries(null), /غير صالحة/);
});

test("rejects malformed and empty PDF backup entries", () => {
  assert.throws(() => decodePdfBackupEntries([{ id: "x", data: "bad" }]), /غير صالح/);
  assert.throws(() => decodePdfBackupEntries([{ id: "x", data: "data:application/pdf;base64," }]), /غير صالح/);
});

test("decodes a valid PDF entry without mutating its source", async () => {
  const source = [{ id: "lesson-1", data: "data:application/pdf;base64,JVBERi0xLjQK" }];
  const before = JSON.stringify(source);
  const decoded = decodePdfBackupEntries(source);
  assert.equal(decoded.length, 1);
  assert.equal(decoded[0].id, "lesson-1");
  assert.equal(decoded[0].blob.type, "application/pdf");
  assert.equal(await decoded[0].blob.text(), "%PDF-1.4\n");
  assert.equal(JSON.stringify(source), before);
});
