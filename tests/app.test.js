import test from "node:test";
import assert from "node:assert/strict";
import { autoColorHtml, mergeSubjectOptions } from "../src/preparation-format.js";

test("subject migration adds new options without removing or renaming legacy subjects", () => {
  const old = ["العلوم العامة", "الفيزياء", "الكيمياء", "العربية"];
  const migrated = mergeSubjectOptions(old, ["العلوم", "الفيزياء والكيمياء"]);
  assert.deepEqual(migrated.slice(0, old.length), old);
  assert.deepEqual(migrated.slice(old.length), ["العلوم", "الفيزياء والكيمياء"]);
  assert.deepEqual(mergeSubjectOptions(migrated, ["العلوم"]), migrated);
});

test("automatic preparation colors match categories and escape user text", () => {
  const html = autoColorHtml("عنوان الدرس: المجهر\nالأهداف التعليمية\nملاحظة: راجع الوقت\nشرح المفهوم <script>");
  assert.match(html, /color:#1769aa/);
  assert.match(html, /color:#16834a/);
  assert.match(html, /color:#d32f2f/);
  assert.match(html, /color:#111111/);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
});
