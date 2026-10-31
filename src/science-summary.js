import { calculateGradebookTotals, normalizeMarkInput } from "./gradebook.js";

/** Calculates a subject result using the columns already saved in that subject's book. */
export function calculateSubjectResult(book, studentId, officialMaximum = null) {
  const columns = Array.isArray(book?.columns) ? book.columns : [];
  const marks = book?.marks?.[studentId] || {};
  const examColumn = columns.find((column) => column.id === "official_final_exam");
  if (Number.isFinite(Number(officialMaximum)) && Number(officialMaximum) > 0 && examColumn) {
    const workColumns = columns.filter((column) => column.id !== "official_final_exam");
    const work = calculateGradebookTotals(marks, workColumns).earned;
    const examMark = marks[examColumn.id];
    const exam = examMark === "" || examMark == null
      ? null
      : normalizeMarkInput(examMark, examColumn.max);
    return { value: exam == null ? work : (work + exam) / 2, maximum: Number(officialMaximum), pendingExam: exam == null };
  }
  const examColumns = columns.filter((column) =>
    column.id === "official_final_exam" || /امتحان/.test(`${column.type || ""} ${column.name || ""}`),
  );
  if (examColumns.length) {
    const exams = new Set(examColumns.map((column) => column.id));
    const workTotals = calculateGradebookTotals(marks, columns.filter((column) => !exams.has(column.id)));
    const examTotals = calculateGradebookTotals(marks, examColumns);
    const hasExamMark = examColumns.some((column) => marks[column.id] !== "" && marks[column.id] != null);
    return {
      value: hasExamMark ? (workTotals.earned + examTotals.earned) / 2 : workTotals.earned,
      maximum: hasExamMark || examColumns.length ? (workTotals.maximum + examTotals.maximum) / 2 : workTotals.maximum,
      pendingExam: !hasExamMark,
    };
  }
  return calculateGradebookTotals(marks, columns);
}

export function calculateSciencePairSummary(gradebooks, grade, section, studentId, getOfficialMaximum = () => null) {
  const scienceBook = gradebooks[`${grade}|${section}|العلوم`];
  const physicsChemistryBook = gradebooks[`${grade}|${section}|الفيزياء والكيمياء`];
  const science = calculateSubjectResult(scienceBook, studentId, getOfficialMaximum(grade, "العلوم"));
  const physicsChemistry = calculateSubjectResult(physicsChemistryBook, studentId, getOfficialMaximum(grade, "الفيزياء والكيمياء"));
  const hasScience = Boolean(scienceBook?.columns?.length);
  const hasPhysicsChemistry = Boolean(physicsChemistryBook?.columns?.length);
  return {
    science: hasScience ? science.value ?? science.earned : null,
    physicsChemistry: hasPhysicsChemistry ? physicsChemistry.value ?? physicsChemistry.earned : null,
    total: hasScience && hasPhysicsChemistry
      ? (science.value ?? science.earned) + (physicsChemistry.value ?? physicsChemistry.earned)
      : null,
  };
}
