// Pure, non-destructive inspection of legacy Daftar Altahdir backups.
// This module intentionally does not write to localStorage or IndexedDB.
export const LEGACY_BACKUP_KEYS = Object.freeze([
  "preparations", "annualPlan", "weeklySchedule", "students",
  "studentNotes", "studentAnnualReviews", "gradebookRecords",
  "gradebookLimits", "gradebookRules", "books", "appSettings",
]);
const ARRAY_KEYS = new Set(["preparations", "annualPlan", "students", "books"]);
const OBJECT_KEYS = new Set(LEGACY_BACKUP_KEYS.filter((key) => !ARRAY_KEYS.has(key)));

export function inspectDaftarBackup(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload) ||
      payload.app !== "daftar-altahdir" || payload.version !== 1 ||
      !payload.data || typeof payload.data !== "object" || Array.isArray(payload.data)) {
    throw new Error("صيغة نسخة دفتر التحضير غير مدعومة");
  }
  const keys = Object.keys(payload.data);
  if (!keys.length || keys.some((key) => !LEGACY_BACKUP_KEYS.includes(key))) {
    throw new Error("النسخة فارغة أو تحتوي على مفاتيح غير معروفة");
  }
  for (const key of keys) {
    const value = payload.data[key];
    if (ARRAY_KEYS.has(key) && !Array.isArray(value)) {
      throw new Error("بيانات غير صالحة: " + key);
    }
    if (OBJECT_KEYS.has(key) && (!value || typeof value !== "object" || Array.isArray(value))) {
      throw new Error("بيانات غير صالحة: " + key);
    }
  }
  return {
    format: "daftar-altahdir",
    version: 1,
    exportedAt: typeof payload.exportedAt === "string" ? payload.exportedAt : null,
    sections: keys.map((key) => ({
      key,
      kind: ARRAY_KEYS.has(key) ? "array" : "object",
      count: ARRAY_KEYS.has(key) ? payload.data[key].length : Object.keys(payload.data[key]).length,
    })),
    warnings: [
      "هذا فحص فقط؛ لم تُنقل أي بيانات.",
      "ملفات PDF المحفوظة في IndexedDB لا تتضمنها النسخة العامة.",
      "صفحات السبورة تحتاج نسخة احتياطية مستقلة.",
      "يجب مطابقة معرّفات الصفوف والطلاب والكتب قبل الاستيراد.",
    ],
  };
}
