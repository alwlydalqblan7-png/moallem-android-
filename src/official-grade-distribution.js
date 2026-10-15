// 2025-2026 grade distribution, from the supplied six-page guidance.
// These columns represent classroom work only; the final exam is separate.
const grades = {
  "السابع": { "اللغة العربية": 600, "الرياضيات": 600, "العلوم العامة": 400, "المعلوماتية": 200, "التربية الرياضية": 200 },
  "الثامن": { "اللغة العربية": 600, "الرياضيات": 600, "العلوم العامة": 400, "المعلوماتية": 200, "التربية الرياضية": 200 },
  "التاسع": { "اللغة العربية": 600, "الرياضيات": 600, "العلوم العامة": 400 },
  "العاشر": { "اللغة العربية": 500, "الرياضيات": 400, "المعلوماتية": 200, "تكنولوجيا المعلومات": 200, "التربية الرياضية": 200 },
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
  if (!max) return null;
  if (subject === "العلوم العامة") {
    return ["العلوم", "الفيزياء والكيمياء"].flatMap((part, group) => standard.map(([name, percent], index) => ({
      id: "official_science_" + group + "_" + index,
      name: part + " — " + name,
      max: 200 * percent / 100,
      type: name,
    })));
  }
  const parts = subject === "اللغة العربية" ? arabic : standard;
  return parts.map(([name, percent], index) => ({
    id: "official_" + index,
    name,
    max: max * percent / 100,
    type: name,
  }));
}
export function officialGradeMaximum(grade, subject) {
  return grades[grade]?.[subject] ?? null;
}
