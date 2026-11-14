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
export function calculateEleventhStatisticsResult(book, studentId) {
  const marks = book?.marks?.[studentId] ?? book?.marks?.[String(studentId)] ?? {};
  const courseworkMark = (id, maximum) => {
    const raw = marks[id];
    if (raw === "" || raw == null) return 0;
    const normalized = normalizeMarkInput(raw, maximum);
    return normalized === "" ? 0 : normalized;
  };
  const work =
    courseworkMark("term1_oral", 25) +
    courseworkMark("term1_homework", 25) +
    courseworkMark("term1_quiz", 50);
  const rawExam = marks.term1_exam;
  const exam = rawExam === "" || rawExam == null ? null : normalizeMarkInput(rawExam, 100);
  return {
    work,
    exam,
    value: exam == null ? work : (work + exam) / 2,
    maximum: 100,
    pendingExam: exam == null,
  };
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
