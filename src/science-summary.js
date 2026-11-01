import { calculateGradebookTotals, normalizeMarkInput } from "./gradebook.js";

/** Calculates a subject result using the columns already saved in that subject's book. */
export function calculateSubjectResult(book, studentId, officialMaximum = null) {
  const columns = Array.isArray(book?.columns) ? book.columns : [];
  const marks = book?.marks?.[studentId] || {};
  const scienceExamColumns = [0, 1].map((index) => columns.find((column) => column.id === `official_science_exam_${index}`));
  if (scienceExamColumns.every(Boolean)) {
    const components = [0, 1].map((group) => calculateGeneralScienceComponent(book, studentId, group));
    const completed = components.every((component) => component.exam != null);
    return {
      value: components.reduce((total, component) => total + component.value, 0),
      maximum: 400,
      pendingExam: !completed,
      components,
    };
  }
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

export function calculateGeneralScienceComponent(book, studentId, group) {
  const columns = Array.isArray(book?.columns) ? book.columns : [];
  const marks = book?.marks?.[studentId] || {};
  const workColumns = columns.filter((column) =>
    column.id.startsWith(`official_science_${group}_`),
  );
  const work = calculateGradebookTotals(marks, workColumns).earned;
  const examColumn = columns.find((column) => column.id === `official_science_exam_${group}`);
  const examValue = examColumn ? marks[examColumn.id] : null;
  const exam = examValue === "" || examValue == null
    ? null
    : normalizeMarkInput(examValue, examColumn.max);
  return {
    value: exam == null ? work : (work + exam) / 2,
    maximum: 200,
    work,
    exam,
    pendingExam: exam == null,
  };
}

export function calculateSciencePairSummary(gradebooks, grade, section, studentId, getOfficialMaximum = () => null) {
  const scienceBook = gradebooks[`${grade}|${section}|العلوم`];
  const physicsChemistryBook = gradebooks[`${grade}|${section}|الفيزياء والكيمياء`];
  const generalScienceBook = gradebooks[`${grade}|${section}|العلوم العامة`];
  const legacySummary = calculateSubjectResult(generalScienceBook, studentId, 400);
  const hasLegacyPair = Array.isArray(legacySummary.components) && legacySummary.components.length === 2;
  const science = calculateSubjectResult(scienceBook, studentId, getOfficialMaximum(grade, "العلوم"));
  const physicsChemistry = calculateSubjectResult(physicsChemistryBook, studentId, getOfficialMaximum(grade, "الفيزياء والكيمياء"));
  const hasScience = Boolean(scienceBook?.columns?.length) || hasLegacyPair;
  const hasPhysicsChemistry = Boolean(physicsChemistryBook?.columns?.length) || hasLegacyPair;
  const scienceValue = scienceBook?.columns?.length ? (science.value ?? science.earned) : legacySummary.components?.[0]?.value;
  const physicsChemistryValue = physicsChemistryBook?.columns?.length ? (physicsChemistry.value ?? physicsChemistry.earned) : legacySummary.components?.[1]?.value;
  return {
    science: hasScience ? scienceValue : null,
    physicsChemistry: hasPhysicsChemistry ? physicsChemistryValue : null,
    total: hasScience && hasPhysicsChemistry
      ? scienceValue + physicsChemistryValue
      : null,
  };
}
