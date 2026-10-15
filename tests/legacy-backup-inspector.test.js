import test from "node:test";
import assert from "node:assert/strict";
import { inspectDaftarBackup } from "../src/legacy-backup-inspector.js";

const fixture = () => ({
  app: "daftar-altahdir", version: 1, exportedAt: "2026-10-15T00:00:00.000Z",
  data: { preparations: [{ id: "p1" }], students: [{ id: "s1" }, { id: "s2" }], appSettings: { schoolName: "مدرستي" } },
});
test("inspects without modifying original backup", () => {
  const input = fixture();
  const original = JSON.stringify(input);
  const report = inspectDaftarBackup(input);
  assert.deepEqual(report.sections.map(({ key, count }) => [key, count]), [
    ["preparations", 1], ["students", 2], ["appSettings", 1],
  ]);
  assert.equal(JSON.stringify(input), original);
  assert.equal(report.warnings.length, 5);
  assert.ok(report.missingSections.includes("books"));
  assert.ok(report.warnings.some((warning) => warning.includes("8 قسم")));
});
test("rejects wrong application and version", () => {
  assert.throws(() => inspectDaftarBackup({ ...fixture(), app: "other" }));
  assert.throws(() => inspectDaftarBackup({ ...fixture(), version: 2 }));
});
test("rejects invalid shapes and unknown keys", () => {
  assert.throws(() => inspectDaftarBackup({ ...fixture(), data: { students: {} } }));
  assert.throws(() => inspectDaftarBackup({ ...fixture(), data: { appSettings: [] } }));
  assert.throws(() => inspectDaftarBackup({ ...fixture(), data: { secret: "x" } }));
  assert.throws(() => inspectDaftarBackup({ ...fixture(), data: {} }));
});

test("complete backup has no missing sections warning", () => {
  const data = Object.fromEntries([
    ["preparations", []], ["annualPlan", []], ["students", []], ["books", []],
    ["weeklySchedule", {}], ["studentNotes", {}], ["studentAnnualReviews", {}],
    ["gradebookRecords", {}], ["gradebookLimits", {}], ["gradebookRules", {}], ["appSettings", {}],
  ]);
  const report = inspectDaftarBackup({ ...fixture(), data });
  assert.deepEqual(report.missingSections, []);
  assert.equal(report.warnings.length, 4);
});
