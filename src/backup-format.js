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

export function validateMoallemBackup(backup) {
  if (!backup || typeof backup !== "object" || Array.isArray(backup)) throw new Error("ملف النسخة غير صالح");
  if (!["moallem-backup-v1", "moallem-backup-v2"].includes(backup.format)) throw new Error("إصدار النسخة الاحتياطية غير مدعوم");
  if (!backup.data || typeof backup.data !== "object" || Array.isArray(backup.data)) throw new Error("بيانات النسخة غير صالحة");

  const entries = Object.entries(backup.data);
  for (const [key, value] of entries) {
    if (!key.startsWith("m2_") || typeof value !== "string") throw new Error("تحتوي النسخة على سجل غير صالح");
    try { JSON.parse(value); } catch { throw new Error(`تعذر التحقق من بيانات: ${key}`); }
  }

  let pdfs = [];
  if (backup.format === "moallem-backup-v2") {
    pdfs = decodePdfBackupEntries(backup.pdfs);
  }
  return { data: backup.data, pdfs };
}
