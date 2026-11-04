// 2025-2026 grade distribution, from the supplied six-page guidance.
// These columns represent classroom work only; the final exam is separate.
const grades = {
  "السابع": { "اللغة العربية": 600, "الرياضيات": 600, "العلوم العامة": 400, "علم الأحياء": 200, "المعلوماتية": 200, "التربية الرياضية": 200 },
  "الثامن": { "اللغة العربية": 600, "الرياضيات": 600, "العلوم العامة": 400, "علم الأحياء": 200, "المعلوماتية": 200, "التربية الرياضية": 200 },
  "التاسع": { "اللغة العربية": 600, "الرياضيات": 600, "العلوم العامة": 400, "علم الأحياء": 200, "المعلوماتية": 200 },
  "العاشر": { "اللغة العربية": 500, "الرياضيات": 400, "علم الأحياء": 200, "المعلوماتية": 200, "تكنولوجيا المعلومات": 200, "التربية الرياضية": 200 },
  "الحادي عشر": { "اللغة العربية": 600, "الرياضيات": 400, "علم الأحياء": 200, "الإحصاء": 100, "المعلوماتية": 200, "تكنولوجيا المعلومات": 200, "التربية الرياضية": 200 },
  "البكالوريا": { "اللغة العربية": 600, "الرياضيات": 400, "علم الأحياء": 200, "المعلوماتية": 200 }
};
const arabic = [
  ["شفهي", 20], ["وظائف", 15], ["نشاط", 15], ["مذاكرة", 50]
];
const standard = [
  ["شفهي", 25], ["وظائف", 25], ["مذاكرة", 50]
];
const teacherSpecified200Subjects = new Set(["العلوم", "الفيزياء والكيمياء"]);

export function isTeacherSpecified200Subject(subject) {
  return teacherSpecified200Subjects.has(subject);
}

export function isOfficialGradeSubject(grade, subject) {
  return grades[grade]?.[subject] != null;
}

export function officialGradeColumns(grade, subject) {
  const max = grades[grade]?.[subject] ?? (grades[grade] && teacherSpecified200Subjects.has(subject) ? 200 : null);
  if (!max) return null;
  if (subject === "العلوم العامة") {
    const workColumns = ["العلوم", "الفيزياء والكيمياء"].flatMap((part, group) => standard.map(([name, percent], index) => ({
      id: "official_science_" + group + "_" + index,
      name: part + " — " + name,
      max: 200 * percent / 100,
      type: name,
    })));
    return [...workColumns, { id: "official_final_exam", name: "الامتحان الأخير", max, type: "امتحان نهائي" }];
  }
  const parts = subject === "اللغة العربية" ? arabic : standard;
  const columns = parts.map(([name, percent], index) => ({
    id: "official_" + index,
    name,
    max: max * percent / 100,
    type: name,
  }));
  return [...columns, { id: "official_final_exam", name: "الامتحان الأخير", max, type: "امتحان نهائي" }];
}
export function officialGradeMaximum(grade, subject) {
  return grades[grade]?.[subject] ?? (grades[grade] && teacherSpecified200Subjects.has(subject) ? 200 : null);
}
