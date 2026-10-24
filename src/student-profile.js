import { calculateSubjectResult } from "./science-summary.js";
import { getHomeworkStatus } from "./homework.js";

export function collectStudentProfile({
  student,
  gradebooks = {},
  attendanceHistory = {},
  homeworkItems = [],
  notes = [],
  officialGradeMaximum = () => null,
}) {
  if (!student) return null;
  const classPrefix = `${student.grade}|${student.section}|`;
  const grades = Object.entries(gradebooks || {})
    .filter(([key, book]) => key.startsWith(classPrefix) && Array.isArray(book?.columns) && book.columns.length)
    .map(([key, book]) => {
      const subject = key.slice(classPrefix.length);
      const result = calculateSubjectResult(book, student.id, officialGradeMaximum(student.grade, subject));
      return {
        subject,
        value: result.value ?? result.earned ?? 0,
        maximum: result.maximum ?? 0,
        pendingExam: Boolean(result.pendingExam),
      };
    });
  const attendance = Object.entries(attendanceHistory || {})
    .filter(([key]) => key.startsWith(classPrefix))
    .map(([key, records]) => {
      const date = key.slice(classPrefix.length);
      const record = records?.[student.id] || records?.[String(student.id)];
      const status = typeof record === "string" ? record : record?.status || "";
      return { date, status, note: typeof record === "object" ? record?.note || "" : "" };
    })
    .filter((record) => ["present", "absent", "late"].includes(record.status))
    .sort((a, b) => b.date.localeCompare(a.date));
  const homework = (Array.isArray(homeworkItems) ? homeworkItems : [])
    .filter((item) => item.grade === student.grade && item.section === student.section)
    .map((item) => ({ ...item, status: getHomeworkStatus(item, student.id) }))
    .sort((a, b) => String(a.dueDate || "").localeCompare(String(b.dueDate || "")));
  const studentNotes = (Array.isArray(notes) ? notes : [])
    .filter((note) => String(note.studentId) === String(student.id))
    .slice()
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  const attendanceSummary = attendance.reduce((summary, record) => {
    if (record.status === "present") summary.present += 1;
    if (record.status === "absent") summary.absent += 1;
    if (record.status === "late") summary.late += 1;
    return summary;
  }, { present: 0, absent: 0, late: 0 });
  return { student, grades, attendance, attendanceSummary, homework, notes: studentNotes };
}

const escapeHtml = (value) => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#39;");

export function buildStudentProfileHtml(profile, school = {}) {
  if (!profile?.student) throw new Error("ملف الطالب غير متوفر");
  const { student, grades = [], attendance = [], attendanceSummary = {}, homework = [], notes = [] } = profile;
  const gradeRows = grades.length
    ? grades.map((item) => `<tr><td>${escapeHtml(item.subject)}</td><td>${escapeHtml(item.value)}</td><td>${escapeHtml(item.maximum || "—")}</td><td>${item.pendingExam ? "بانتظار الامتحان" : "—"}</td></tr>`).join("")
    : '<tr><td colspan="4">لا توجد علامات محفوظة</td></tr>';
  const attendanceRows = attendance.length
    ? attendance.map((item) => `<tr><td>${escapeHtml(item.date)}</td><td>${item.status === "present" ? "حاضر" : item.status === "absent" ? "غائب" : "متأخر"}</td><td>${escapeHtml(item.note || "—")}</td></tr>`).join("")
    : '<tr><td colspan="3">لا توجد أيام حضور مؤرخة</td></tr>';
  const homeworkRows = homework.length
    ? homework.map((item) => `<tr><td>${escapeHtml(item.type || "واجب")}</td><td>${escapeHtml(item.title)}</td><td>${escapeHtml(item.subject || "—")}</td><td>${item.status === "submitted" ? "مُسلّم" : item.status === "absent" ? "غائب ويحتاج استدراك" : "لم يسلّم"}</td><td>${escapeHtml(item.dueDate || "—")}</td></tr>`).join("")
    : '<tr><td colspan="5">لا توجد واجبات أو مذكرات مسجلة</td></tr>';
  const noteRows = notes.length
    ? notes.map((item) => `<li><span>${escapeHtml(item.createdAt ? String(item.createdAt).slice(0, 10) : "")}</span> ${escapeHtml(item.text)}</li>`).join("")
    : "<li>لا توجد ملاحظات مسجلة</li>";
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>ملف متابعة الطالب</title><style>
    @page{size:A4;margin:14mm}body{font-family:Arial,sans-serif;color:#182533;line-height:1.6}h1{text-align:center;color:#173653;margin:0 0 5px}h2{font-size:16px;color:#173653;border-bottom:1px solid #cfdbe4;padding-bottom:4px;margin:17px 0 7px}.school{text-align:center;color:#526577}.identity{background:#f2f7fb;border:1px solid #dbe6ee;border-radius:9px;padding:10px;margin:12px 0}.summary{color:#37566e}table{width:100%;border-collapse:collapse;font-size:12px;page-break-inside:avoid}th,td{border:1px solid #cfd8df;text-align:right;padding:6px}th{background:#eaf1f6}ul{padding-right:22px}li{margin:5px 0}.footer{margin-top:20px;color:#526577;font-size:11px}
    </style></head><body><h1>ملف متابعة الطالب</h1><div class="school">${escapeHtml(school.school || "المدرسة")}${school.teacher ? ` · المعلم: ${escapeHtml(school.teacher)}` : ""}</div>
    <div class="identity"><strong>${escapeHtml(student.name)}</strong> · الصف ${escapeHtml(student.grade)} · الشعبة ${escapeHtml(student.section)}</div>
    <p class="summary">الحضور: ${attendanceSummary.present || 0} يوم · الغياب: ${attendanceSummary.absent || 0} يوم · التأخر: ${attendanceSummary.late || 0} يوم</p>
    <h2>العلامات والمحصلات</h2><table><thead><tr><th>المادة</th><th>المحصلة</th><th>الدرجة العظمى</th><th>الحالة</th></tr></thead><tbody>${gradeRows}</tbody></table>
    <h2>الحضور والغياب</h2><table><thead><tr><th>التاريخ</th><th>الحالة</th><th>ملاحظة</th></tr></thead><tbody>${attendanceRows}</tbody></table>
    <h2>الواجبات والمذكرات</h2><table><thead><tr><th>النوع</th><th>العنوان</th><th>المادة</th><th>التسليم</th><th>الموعد</th></tr></thead><tbody>${homeworkRows}</tbody></table>
    <h2>ملاحظات المعلم</h2><ul>${noteRows}</ul><div class="footer">تاريخ إعداد التقرير: ${new Date().toISOString().slice(0, 10)}</div></body></html>`;
}
