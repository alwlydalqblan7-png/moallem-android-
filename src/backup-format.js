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
