const ARABIC_DAYS = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

const toMinutes = (value) => {
  const match = /^(\d{2}):(\d{2})$/.exec(String(value || ""));
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return hour < 24 && minute < 60 ? hour * 60 + minute : null;
};

export function parseStudentNames(raw) {
  const headerNames = new Set(["الاسم", "اسم الطالب", "اسم الطالب/ة", "الطالب", "name", "student name"]);
  return String(raw ?? "")
    .split(/\r?\n/)
    .map((line) => {
      // Spreadsheet and CSV imports commonly contain IDs, grades, or other
      // columns after the student name. Only import the first column.
      const firstCell = line.split(/\t|,(?=(?:[^"]*"[^"]*")*[^"]*$)|;(?=(?:[^"]*"[^"]*")*[^"]*$)/, 1)[0];
      return firstCell.replace(/^\s*"|"\s*$/g, "").replace(/[\u200e\u200f]/g, "").trim();
    })
    .filter((name) => name && !headerNames.has(name.toLocaleLowerCase("ar")));
}

export function formatClassRoster(students, grade, section) {
  const roster = (Array.isArray(students) ? students : [])
    .filter((student) => student.grade === grade && student.section === section)
    .map((student, index) => `${index + 1}. ${String(student.name || "").trim()}`)
    .filter((line) => !/^\d+\.\s*$/.test(line));
  return [`قائمة طلاب ${grade} — الشعبة ${section}`, ...roster].join("\n");
}

export function attendanceDateKey(grade, section, date) {
  return `${grade}|${section}|${date}`;
}

export function summarizeAttendance(history, grade, section, studentId) {
  let present = 0;
  let absent = 0;
  for (const [key, record] of Object.entries(history || {})) {
    if (!key.startsWith(`${grade}|${section}|`)) continue;
    const status = record?.[studentId]?.status || record?.[studentId];
    if (status === "present") present++;
    if (status === "absent") absent++;
  }
  return { present, absent, total: present + absent };
}

export function getDailyWidgetStatus(periodSettings, date = new Date()) {
  const day = date.getDay();
  const dayLabel = `${ARABIC_DAYS[day]} · ${date.getDate()}/${date.getMonth() + 1}`;
  if (day === 5 || day === 6) {
    return { dayLabel, status: "عطلة نهاية الأسبوع", state: "holiday" };
  }

  const periods = (Array.isArray(periodSettings) ? periodSettings : [])
    .map((times, index) => ({
      index,
      start: toMinutes(times?.[0]),
      end: toMinutes(times?.[1]),
    }))
    .filter((period) => period.start !== null && period.end !== null && period.end > period.start);
  if (!periods.length) {
    return { dayLabel, status: "أضف أوقات الحصص من الإعدادات", state: "unconfigured" };
  }

  const now = date.getHours() * 60 + date.getMinutes();
  const next = periods.find((period) => now < period.start);
  if (next) {
    const status = next.index === 0
      ? `تبدأ حصتك الأولى الساعة ${String(Math.floor(next.start / 60)).padStart(2, "0")}:${String(next.start % 60).padStart(2, "0")}`
      : `استراحة — الحصة ${next.index + 1} الساعة ${String(Math.floor(next.start / 60)).padStart(2, "0")}:${String(next.start % 60).padStart(2, "0")}`;
    return { dayLabel, status, state: next.index === 0 ? "upcoming" : "break" };
  }

  const current = periods.find((period) => now >= period.start && now < period.end);
  if (current) return { dayLabel, status: `الحصة ${current.index + 1} الآن`, state: "in-progress" };
  return { dayLabel, status: "انتهت حصصك اليوم", state: "finished" };
}
