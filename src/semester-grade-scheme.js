import { calculateGradebookTotals, normalizeMarkInput } from "./gradebook.js";

export const FIRST_TERM_SCHEME_ID = "first-term-25-25-50-exam-100";
const columns = [
  { id: "term1_oral", name: "شفهي", max: 25, type: "شفهي" },
  { id: "term1_homework", name: "وظائف", max: 25, type: "وظائف" },
  { id: "term1_quiz", name: "مذاكرة", max: 50, type: "مذاكرة" },
  { id: "term1_exam", name: "امتحان الفصل الأول", max: 100, type: "امتحان فصلي" },
];
export function createFirstTermColumns(maximum = 100) {
  const max = Number.isFinite(Number(maximum)) && Number(maximum) > 0 ? Number(maximum) : 100;
  return columns.map((column) => ({ ...column, max: column.id === "term1_exam" ? max : max * column.max / 100 }));
}

// Keep grade 11 statistics on the requested 25/25/50 + 100 exam scheme,
// while migrating marks from older official_0/1/2/final columns in place.
export function migrateStatisticsGradebooks(gradebooks = {}) {
  if (!gradebooks || typeof gradebooks !== "object" || Array.isArray(gradebooks)) return {};
  let changed = false;
  const next = { ...gradebooks };
  const targetColumns = createFirstTermColumns(100);
  const sourceIds = {
    term1_oral: ["term1_oral", "official_0"],
    term1_homework: ["term1_homework", "official_1"],
    term1_quiz: ["term1_quiz", "official_2"],
    term1_exam: ["term1_exam", "official_final_exam"],
  };
  const nameMatches = {
    term1_oral: /شفهي|شفوية/i,
    term1_homework: /وظائف|وظيفة/i,
    term1_quiz: /مذاكرة|مذاكره/i,
    term1_exam: /امتحان|الامتحان/i,
  };
  for (const [key, book] of Object.entries(gradebooks)) {
    if (!key.endsWith("|الإحصاء") || !book || typeof book !== "object") continue;
    const savedColumns = Array.isArray(book.columns) ? book.columns : [];
    const savedMarks = book.marks && typeof book.marks === "object" ? book.marks : {};
    const targetForStatistics = targetColumns.map((column) => ({
      ...column,
      name: column.id === "term1_quiz" ? "مذاكرة خطية" : column.id === "term1_exam" ? "الامتحان الأخير" : column.name,
    }));
    const alreadyCorrect = book.gradingScheme === FIRST_TERM_SCHEME_ID &&
      Number(book.gradingMaximum) === 100 && targetForStatistics.every((target, index) =>
        savedColumns[index]?.id === target.id && Number(savedColumns[index]?.max) === target.max &&
        savedColumns.length === targetForStatistics.length);
    if (alreadyCorrect) continue;
    const mappedSources = Object.fromEntries(targetForStatistics.map((target, index) => {
      const byId = savedColumns.find((column) => sourceIds[target.id].includes(column.id));
      const byName = savedColumns.find((column) => nameMatches[target.id].test(String(column.name || "")));
      return [target.id, byId || byName || savedColumns[index] || null];
    }));
    const marks = Object.fromEntries(Object.entries(savedMarks).map(([studentId, row]) => {
      const migrated = { ...(row && typeof row === "object" ? row : {}) };
      for (const target of targetForStatistics) {
        const source = mappedSources[target.id];
        const sourceId = source?.id;
        const raw = row?.[target.id] ?? (sourceId ? row?.[sourceId] : undefined);
        if (raw === "" || raw == null || !Number.isFinite(Number(raw))) continue;
        const oldMax = Number(source?.max) > 0 ? Number(source.max) : target.max;
        const converted = Number(raw) * target.max / oldMax;
        migrated[target.id] = Math.min(target.max, Math.max(0, converted));
      }
      return [studentId, migrated];
    }));
    next[key] = { ...book, gradingScheme: FIRST_TERM_SCHEME_ID, gradingMaximum: 100, columns: targetForStatistics, marks };
    changed = true;
  }
  return changed ? next : gradebooks;
}

export function calculateFirstTermResult(book, studentId) {
  const savedColumns = Array.isArray(book?.columns) ? book.columns : [];
  const marks = book?.marks?.[studentId] ?? book?.marks?.[String(studentId)] ?? {};
  const examColumn = savedColumns.find((column) => column.id === "term1_exam");
  const workColumns = savedColumns.filter((column) => ["term1_oral", "term1_homework", "term1_quiz"].includes(column.id));
  const work = calculateGradebookTotals(marks, workColumns).earned;
  const rawExam = examColumn ? marks[examColumn.id] : null;
  const exam = rawExam === "" || rawExam == null ? null : normalizeMarkInput(rawExam, examColumn.max);
  return { work, exam, value: exam == null ? work : (work + exam) / 2, maximum: Number(examColumn?.max) > 0 ? Number(examColumn.max) : 100, pendingExam: exam == null };
}
