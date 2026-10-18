export const WIDGET_WEEK_DAYS = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس"];

export function widgetDayIndex(date = new Date()) {
  // Sunday through Thursday are the configured school days. Weekends select Sunday.
  const day = date.getDay();
  return day > 0 && day < 5 ? day : 0;
}

export function getWidgetDay(schedule, dayIndex) {
  const day = WIDGET_WEEK_DAYS[((dayIndex % WIDGET_WEEK_DAYS.length) + WIDGET_WEEK_DAYS.length) % WIDGET_WEEK_DAYS.length];
  const periods = Array.isArray(schedule?.[day]) ? schedule[day] : [];
  return {
    day,
    periods: Array.from({ length: 7 }, (_, index) => {
      const period = periods[index];
      if (!period) return { number: index + 1, subject: "", grade: "", section: "", text: "" };
      const subject = String(period.subject || "").trim();
      const grade = String(period.grade || "").trim();
      const section = String(period.section || "").trim();
      const note = String(period.note || "").trim();
      const text = [subject, grade && `الصف ${grade}`, section && `الشعبة ${section}`].filter(Boolean).join(" — ") || note;
      return { number: index + 1, subject, grade, section, text };
    }),
  };
}
