// 2025-2026 grade distribution, transcribed from the six ministry forms supplied
// by the user. Do not treat these values as a verified 2026-2027 distribution.
const grades = {
  "السابع": { "اللغة العربية": 600, "الرياضيات": 600, "العلوم العامة": 400, "المعلوماتية": 200, "التربية الرياضية": 200 },
  "الثامن": { "اللغة العربية": 600, "الرياضيات": 600, "العلوم العامة": 400, "المعلوماتية": 200, "التربية الرياضية": 200 },
  "التاسع": { "اللغة العربية": 600, "الرياضيات": 600, "العلوم العامة": 400 },
  "العاشر": { "اللغة العربية": 500, "الرياضيات": 400, "علم الأحياء والبيئة": 200, "الفيزياء": 200, "الكيمياء": 200, "المعلوماتية": 200, "تكنولوجيا المعلومات": 200, "التربية الرياضية": 200 },
  "الحادي عشر": { "اللغة العربية": 600, "الرياضيات": 400, "المعلوماتية": 200, "تكنولوجيا المعلومات": 200, "التربية الرياضية": 200 },
  "البكالوريا": { "اللغة العربية": 600, "الرياضيات": 400 }
};
const arabic = [
  ["شفهي", 20], ["وظائف", 15], ["نشاط", 15], ["مذاكرة", 50]
];
const standard = [
  ["شفهي", 25], ["وظائف", 25], ["مذاكرة", 50]
];
export function officialGradeColumns(grade, subject) {
  const max = grades[grade]?.[subject];
  if (!max && !(GENERAL_SCIENCE_GRADES.has(grade) && GENERAL_SCIENCE_PARTS.has(subject))) return null;
  if (subject === "العلوم العامة") {
    const workColumns = [...GENERAL_SCIENCE_PARTS].flatMap((part, group) => standard.map(([name, percent], index) => ({
      id: "official_science_" + group + "_" + index,
      name: part + " — " + name,
      max: 200 * percent / 100,
      type: name,
    })));
    const exams = [...GENERAL_SCIENCE_PARTS].map((part, group) => ({
      id: "official_science_exam_" + group,
      name: part + " — الامتحان النهائي",
      max: 200,
      type: "امتحان نهائي",
    }));
    return [...workColumns, ...exams];
  }
  if (GENERAL_SCIENCE_GRADES.has(grade) && GENERAL_SCIENCE_PARTS.has(subject)) {
    return [
      ...standard.map(([name, percent], index) => ({
        id: "official_" + index,
        name,
        max: 200 * percent / 100,
        type: name,
      })),
      { id: "official_final_exam", name: "الامتحان الأخير", max: 200, type: "امتحان نهائي" },
    ];
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
  if (GENERAL_SCIENCE_GRADES.has(grade) && GENERAL_SCIENCE_PARTS.has(subject)) return 200;
  return grades[grade]?.[subject] ?? null;
}

const GENERAL_SCIENCE_GRADES = new Set(["السابع", "الثامن", "التاسع"]);
const GENERAL_SCIENCE_PARTS = new Set(["العلوم", "الفيزياء والكيمياء"]);
