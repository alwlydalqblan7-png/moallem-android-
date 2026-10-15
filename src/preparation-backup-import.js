const ARRAY_SECTIONS = new Set(["preparations", "annualPlan", "students", "books"]);
const OBJECT_SECTIONS = new Set([
  "weeklySchedule",
  "studentNotes",
  "studentAnnualReviews",
  "gradebookRecords",
  "gradebookLimits",
  "gradebookRules",
  "appSettings",
]);
const SECTION_NAMES = new Set([...ARRAY_SECTIONS, ...OBJECT_SECTIONS]);

const TARGET_KEYS = {
  preparations: "m2_saved_preparations",
  annualPlan: "m2_curriculum_plans",
  weeklySchedule: "m2_weekly_schedule",
  students: "m2_students",
  books: "m2_library_books",
};

const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const stableValue = (value) => {
  if (Array.isArray(value)) return `[${value.map(stableValue).join(",")}]`;
  if (isRecord(value)) return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableValue(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
};

export function validatePreparationBackup(backup) {
  if (!isRecord(backup) || backup.app !== "daftar-altahdir" || backup.version !== 1 || !isRecord(backup.data)) {
    throw new Error("صيغة نسخة دفتر التحضير غير مدعومة");
  }
  const keys = Object.keys(backup.data);
  if (!keys.length || keys.some((key) => !SECTION_NAMES.has(key))) {
    throw new Error("النسخة فارغة أو تحتوي على أقسام غير معروفة");
  }
  for (const key of keys) {
    const value = backup.data[key];
    if (ARRAY_SECTIONS.has(key) && !Array.isArray(value)) throw new Error(`بيانات غير صالحة: ${key}`);
    if (OBJECT_SECTIONS.has(key) && !isRecord(value)) throw new Error(`بيانات غير صالحة: ${key}`);
  }
  return backup;
}

function mergeById(existing, incoming, prefix) {
  const result = [...existing];
  const byId = new Map(result.map((item, index) => [String(item?.id ?? `__missing_${index}`), index]));
  const fingerprints = new Set(result.map(stableValue));
  let added = 0;
  let duplicates = 0;
  for (const item of incoming) {
    if (!isRecord(item)) {
      const fingerprint = stableValue(item);
      if (fingerprints.has(fingerprint)) { duplicates++; continue; }
      result.push(item);
      fingerprints.add(fingerprint);
      added++;
      continue;
    }
    const fingerprint = stableValue(item);
    if (fingerprints.has(fingerprint)) { duplicates++; continue; }
    const originalId = item.id == null ? null : String(item.id);
    const existingIndex = originalId == null ? undefined : byId.get(originalId);
    if (existingIndex !== undefined) {
      const timestamp = Date.now();
      let newId = `${prefix}-import-${timestamp}-${added}`;
      while (byId.has(newId)) newId += "-x";
      const copy = { ...item, id: newId, sourceId: item.sourceId ?? item.id };
      result.push(copy);
      byId.set(newId, result.length - 1);
      fingerprints.add(stableValue(copy));
      added++;
      continue;
    }
    const copy = originalId == null ? { ...item, id: `${prefix}-import-${Date.now()}-${added}` } : item;
    result.push(copy);
    if (copy.id != null) byId.set(String(copy.id), result.length - 1);
    fingerprints.add(stableValue(copy));
    added++;
  }
  return { value: result, added, duplicates };
}

function readStored(currentData, key, fallback) {
  const raw = currentData[key];
  if (typeof raw !== "string") return fallback;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(fallback) ? (Array.isArray(parsed) ? parsed : fallback) : (isRecord(parsed) ? parsed : fallback);
  } catch { return fallback; }
}

export function mergePreparationBackup(backupValue, currentData = {}) {
  const backup = validatePreparationBackup(backupValue);
  const nextData = {};
  const report = [];
  const archivedSections = {};

  for (const [section, value] of Object.entries(backup.data)) {
    const targetKey = TARGET_KEYS[section];
    if (!targetKey) {
      archivedSections[section] = value;
      report.push({ section, imported: 0, archived: OBJECT_SECTIONS.has(section) ? Object.keys(value).length : 0, kind: "archive" });
      continue;
    }
    if (section === "weeklySchedule") {
      // Existing days/cells win on conflicts; imported empty slots only fill gaps.
      const current = readStored(currentData, targetKey, {});
      const merged = { ...value, ...current };
      for (const [day, periods] of Object.entries(value)) {
        if (!Array.isArray(periods) || !Array.isArray(current[day])) continue;
        const cells = [...periods];
        for (let i = 0; i < current[day].length; i++) if (current[day][i] != null) cells[i] = current[day][i];
        merged[day] = cells;
      }
      const count = Object.values(value).reduce((sum, day) => sum + (Array.isArray(day) ? day.length : 0), 0);
      nextData[targetKey] = JSON.stringify(merged);
      report.push({ section, imported: count, archived: 0, kind: "merged" });
      continue;
    }
    const current = readStored(currentData, targetKey, []);
    const merged = mergeById(current, value, section);
    nextData[targetKey] = JSON.stringify(merged.value);
    report.push({ section, imported: merged.added, archived: 0, duplicates: merged.duplicates, kind: "merged" });
  }

  const archiveKey = "m2_imported_preparation_archives";
  const archives = readStored(currentData, archiveKey, []);
  archives.push({
    source: "daftar-altahdir",
    version: 1,
    exportedAt: typeof backup.exportedAt === "string" ? backup.exportedAt : null,
    importedAt: new Date().toISOString(),
    sections: archivedSections,
  });
  nextData[archiveKey] = JSON.stringify(archives);
  return {
    data: nextData,
    report,
    archivedSections: Object.keys(archivedSections),
    warnings: [
      ...(Array.isArray(backup.data.books) && backup.data.books.length ? ["النسخة العامة لا تحتوي ملفات PDF المحفوظة؛ أُضيفت بيانات الكتب فقط، ويمكن إرفاق ملفات PDF لاحقاً."] : []),
      ...(Object.keys(archivedSections).length ? ["حُفظت أقسام الملاحظات والتقويمات والعلامات والإعدادات في أرشيف الاستيراد وضمن النسخ الاحتياطي؛ لم تُدمج في شاشات معلّم لعدم تطابق بنيتها."] : []),
    ],
  };
}
