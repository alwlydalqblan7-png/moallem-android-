export const decodePdfBackupEntries = (pdfs) => {
  if (!Array.isArray(pdfs)) throw new Error("قائمة ملفات PDF غير صالحة");
  return pdfs.map((pdf) => {
    if (!pdf?.id || typeof pdf.data !== "string") throw new Error("تحتوي النسخة على ملف PDF غير صالح");
    const match = /^data:application\/pdf;base64,([A-Za-z0-9+/]+={0,2})$/.exec(pdf.data);
    if (!match) throw new Error("تحتوي النسخة على ملف PDF غير صالح");
    let binary;
    try { binary = atob(match[1]); } catch { throw new Error("بيانات أحد ملفات PDF غير صالحة"); }
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    if (!bytes.length) throw new Error("أحد ملفات PDF في النسخة فارغ");
    return { id: String(pdf.id), blob: new Blob([bytes], { type: "application/pdf" }) };
  });
};

const STUDENT_PHOTO_DATA_URL = /^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/;

export function extractStudentPhotos(data) {
  const nextData = { ...data };
  const encodedStudents = nextData.m2_students;
  if (encodedStudents === undefined) return { data: nextData, photos: [] };
  let students;
  try { students = JSON.parse(encodedStudents); } catch { throw new Error("تعذر قراءة بيانات الطلاب لإضافة صورهم إلى النسخة"); }
  if (!Array.isArray(students)) throw new Error("قائمة الطلاب غير صالحة في النسخة الاحتياطية");
  const photos = [];
  nextData.m2_students = JSON.stringify(students.map((student) => {
    if (!student || typeof student !== "object" || Array.isArray(student)) throw new Error("يوجد سجل طالب غير صالح في النسخة");
    if (student.photo == null || student.photo === "") return student;
    if (!student.id || typeof student.photo !== "string" || !STUDENT_PHOTO_DATA_URL.test(student.photo)) {
      throw new Error("توجد صورة طالب غير صالحة؛ لم تُنشأ النسخة لتجنب فقدانها");
    }
    photos.push({ studentId: String(student.id), data: student.photo });
    const { photo, ...withoutPhoto } = student;
    return withoutPhoto;
  }));
  return { data: nextData, photos };
}

export function validateMoallemBackup(backup) {
  if (!backup || typeof backup !== "object" || Array.isArray(backup)) throw new Error("ملف النسخة غير صالح");
  if (!["moallem-backup-v1", "moallem-backup-v2", "moallem-backup-v3"].includes(backup.format)) throw new Error("إصدار النسخة الاحتياطية غير مدعوم");
  if (!backup.data || typeof backup.data !== "object" || Array.isArray(backup.data)) throw new Error("بيانات النسخة غير صالحة");

  const entries = Object.entries(backup.data);
  for (const [key, value] of entries) {
    if (!key.startsWith("m2_") || typeof value !== "string") throw new Error("تحتوي النسخة على سجل غير صالح");
    try { JSON.parse(value); } catch { throw new Error(`تعذر التحقق من بيانات: ${key}`); }
  }

  let pdfs = [];
  if (backup.format === "moallem-backup-v2" || backup.format === "moallem-backup-v3") {
    pdfs = decodePdfBackupEntries(backup.pdfs);
  }
  let data = backup.data;
  if (backup.format === "moallem-backup-v3") {
    if (!Array.isArray(backup.photos)) throw new Error("قائمة صور الطلاب غير صالحة");
    let students;
    try { students = JSON.parse(data.m2_students || "[]"); } catch { throw new Error("بيانات الطلاب في النسخة غير صالحة"); }
    if (!Array.isArray(students)) throw new Error("قائمة الطلاب في النسخة غير صالحة");
    const studentById = new Map(students.map((student) => [String(student?.id), student]));
    const seen = new Set();
    for (const photo of backup.photos) {
      if (!photo || typeof photo.studentId !== "string" || !photo.studentId || typeof photo.data !== "string" || !STUDENT_PHOTO_DATA_URL.test(photo.data)) {
        throw new Error("تحتوي النسخة على صورة طالب غير صالحة");
      }
      if (seen.has(photo.studentId) || !studentById.has(photo.studentId)) throw new Error("تعذر ربط صورة طالب بسجله في النسخة");
      seen.add(photo.studentId);
      studentById.get(photo.studentId).photo = photo.data;
    }
    if (backup.photos.length) data = { ...data, m2_students: JSON.stringify(students) };
  }
  return { data, pdfs };
}
