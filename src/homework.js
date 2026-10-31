export const HOMEWORK_STATUSES = ["pending", "submitted", "absent"];

export function filterHomeworkForClass(items, grade, section) {
  return (Array.isArray(items) ? items : [])
    .filter((item) => item.grade === grade && item.section === section)
    .slice()
    .sort((a, b) => String(b.dueDate || "").localeCompare(String(a.dueDate || "")));
}

export function getHomeworkStatus(item, studentId) {
  const status = item?.statuses?.[String(studentId)];
  return HOMEWORK_STATUSES.includes(status) ? status : "pending";
}

export function setHomeworkStatus(items, itemId, studentId, status) {
  if (!HOMEWORK_STATUSES.includes(status)) throw new Error("حالة تسليم غير معروفة");
  return (Array.isArray(items) ? items : []).map((item) =>
    item.id === itemId
      ? { ...item, statuses: { ...(item.statuses || {}), [String(studentId)]: status } }
      : item,
  );
}

export function summarizeHomework(item, students) {
  const counts = { pending: 0, submitted: 0, absent: 0 };
  for (const student of students || []) counts[getHomeworkStatus(item, student.id)] += 1;
  return counts;
}

export function buildStudentHomeworkMessage({ grade, section, student, items }) {
  const pending = (items || []).filter((item) => getHomeworkStatus(item, student.id) !== "submitted");
  const heading = `تنبيه بخصوص ${student.name} — الصف ${grade}، الشعبة ${section}`;
  if (!pending.length) return `${heading}\nتم تسليم جميع الواجبات والمذكرات المسجلة. شكرًا لمتابعتكم.`;
  const lines = pending.map((item) => {
    const status = getHomeworkStatus(item, student.id);
    const state = status === "absent" ? "غائب ويحتاج إلى استدراك" : "لم يسلّم";
    const due = item.dueDate ? ` — الموعد: ${item.dueDate}` : "";
    return `• ${item.type || "واجب"}: ${item.title} (${item.subject || "دون مادة"}) — ${state}${due}`;
  });
  return `${heading}\nيرجى متابعة البنود التالية:\n${lines.join("\n")}`;
}
