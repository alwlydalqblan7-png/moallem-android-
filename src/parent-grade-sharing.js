// Parent-facing grade sharing: keep each student's marks private.
export const DISTINCT_SCIENCE_SUBJECTS = Object.freeze([
  "العلوم", "الفيزياء", "الكيمياء", "الفيزياء والكيمياء",
]);
export function subjectGradebookKey(grade, section, subject) {
  return [grade, section, subject].map(v => String(v ?? "").trim()).join("|");
}
export function parentGradeMessage({studentName, grade, section, subject, assessments = [], teacherName = ""}) {
  if (!String(studentName ?? "").trim()) throw new Error("اسم الطالب مطلوب");
  const lines = [
    "إشعار علامات الطالب",
    `الطالب: ${String(studentName).trim()}`,
    `الصف: ${String(grade ?? "").trim()}${section ? " — الشعبة: " + String(section).trim() : ""}`,
    `المادة: ${String(subject ?? "").trim()}`,
  ];
  for (const item of assessments) {
    if (item.value === "" || item.value == null) continue;
    const max = Number(item.max);
    const value = Number(item.value);
    if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0 || value < 0 || value > max) continue;
    lines.push(`${String(item.name ?? "التقييم").trim()}: ${value} / ${max}`);
  }
  if (teacherName) lines.push(`المعلم: ${String(teacherName).trim()}`);
  lines.push("هذه النتيجة خاصة بولي أمر الطالب المذكور فقط.");
  return lines.join("\n");
}
export async function shareParentGrade(message) {
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    await navigator.share({ text: message, title: "علامات الطالب" });
    return "shared";
  }
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(message);
    return "copied";
  }
  throw new Error("المشاركة غير متاحة على هذا الجهاز");
}
