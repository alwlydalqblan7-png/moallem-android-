const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[character]));

export function createBoardLesson({ title, grade = "", section = "", subject = "", date = "", content = "", id, createdAt } = {}) {
  const cleanTitle = String(title || "").trim();
  if (!cleanTitle) throw new Error("اكتب عنوان الدرس أولاً");
  return {
    id: id || `board-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: cleanTitle,
    grade: String(grade || ""),
    section: String(section || ""),
    subject: String(subject || ""),
    date: String(date || ""),
    content: String(content || ""),
    strokes: [],
    favorite: false,
    status: "not-started",
    createdAt: createdAt || new Date().toISOString(),
    updatedAt: createdAt || new Date().toISOString(),
  };
}

export function migrateBoardLessons(savedLessons, legacyStrokes = [], today = new Date().toISOString().slice(0, 10)) {
  if (Array.isArray(savedLessons) && savedLessons.length) return savedLessons.filter((lesson) => lesson && typeof lesson === "object" && lesson.id);
  if (!Array.isArray(legacyStrokes) || legacyStrokes.length === 0) return [];
  return [{
    id: "legacy-board-lesson",
    title: "الدرس السابق",
    grade: "",
    section: "",
    subject: "",
    date: today,
    content: "",
    strokes: legacyStrokes,
    favorite: false,
    status: "in-progress",
    createdAt: new Date(`${today}T00:00:00`).toISOString(),
    updatedAt: new Date().toISOString(),
  }];
}

export function upsertBoardLesson(lessons, lesson) {
  const current = Array.isArray(lessons) ? lessons : [];
  const index = current.findIndex((item) => String(item.id) === String(lesson.id));
  if (index < 0) return [lesson, ...current];
  return current.map((item, itemIndex) => itemIndex === index ? { ...item, ...lesson } : item);
}

export function updateBoardLesson(lessons, id, updates) {
  return (Array.isArray(lessons) ? lessons : []).map((lesson) =>
    String(lesson.id) === String(id) ? { ...lesson, ...updates, updatedAt: new Date().toISOString() } : lesson,
  );
}

function renderBoardLesson(lesson) {
  const strokes = Array.isArray(lesson?.strokes) ? lesson.strokes : [];
  const paths = strokes.map((stroke) => {
    const points = simplifyBoardStroke(stroke.points);
    if (!points.length) return "";
    const coordinates = points.map(([x, y]) => `${(Number(x) * 1000).toFixed(1)} ${(Number(y) * 700).toFixed(1)}`);
    const d = coordinates.map((point, index) => `${index ? "L" : "M"} ${point}`).join(" ");
    const color = stroke.color === "#ffffff" ? "#ffffff" : /^#[0-9a-f]{6}$/i.test(stroke.color || "") ? stroke.color : "#111111";
    const width = Math.max(1, Math.min(30, Number(stroke.width) || 3));
    return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
  }).join("");
  const meta = [lesson?.grade, lesson?.section ? `الشعبة ${lesson.section}` : "", lesson?.subject, lesson?.date].filter(Boolean).map(escapeHtml).join(" · ");
  return `<section class="lesson-page"><h1>${escapeHtml(lesson?.title || "درس السبورة")}</h1><p class="meta">${meta}</p>${lesson?.content ? `<p class="content">${escapeHtml(lesson.content)}</p>` : ""}<div class="board"><svg viewBox="0 0 1000 700" preserveAspectRatio="none" role="img" aria-label="محتوى السبورة">${paths}</svg></div></section>`;
}

// Touch screens report many almost-identical coordinates. Thin those points
// before creating print SVG paths; a 2.25-unit tolerance is visually negligible
// at the print scale and greatly reduces WebView layout work for long lessons.
export function simplifyBoardStroke(points, minimumDistance = 2.25) {
  if (!Array.isArray(points)) return [];
  const valid = points.filter((point) => Array.isArray(point) && Number.isFinite(Number(point[0])) && Number.isFinite(Number(point[1])));
  if (valid.length <= 2) return valid;
  const kept = [valid[0]];
  const thresholdSquared = minimumDistance * minimumDistance;
  let previous = valid[0];
  for (let index = 1; index < valid.length - 1; index += 1) {
    const point = valid[index];
    const dx = (Number(point[0]) - Number(previous[0])) * 1000;
    const dy = (Number(point[1]) - Number(previous[1])) * 700;
    if ((dx * dx) + (dy * dy) >= thresholdSquared) {
      kept.push(point);
      previous = point;
    }
  }
  const last = valid[valid.length - 1];
  if (last !== kept[kept.length - 1]) kept.push(last);
  return kept;
}

export function buildBoardLessonPrintHtml(lesson) {
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(lesson?.title || "درس السبورة")}</title><style>@page{size:A4 portrait;margin:14mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#17212b;line-height:1.8;margin:0}h1{color:#173653;margin:0 0 4px}.meta{color:#607080;margin:0 0 14px}.content{white-space:pre-wrap;margin:0 0 14px}.board{width:100%;height:185mm;border:1px solid #d6dee5;border-radius:10px;background:#fff}svg{width:100%;height:100%}</style></head><body>${renderBoardLesson(lesson)}</body></html>`;
}

export function buildBoardLessonsPrintHtml(lessons) {
  const pages = (Array.isArray(lessons) ? lessons : []).map(renderBoardLesson).join("");
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>دفتر السبورة</title><style>@page{size:A4 portrait;margin:14mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#17212b;line-height:1.8;margin:0}h1{color:#173653;margin:0 0 4px}.meta{color:#607080;margin:0 0 14px}.content{white-space:pre-wrap;margin:0 0 14px}.board{width:100%;height:185mm;border:1px solid #d6dee5;border-radius:10px;background:#fff}svg{width:100%;height:100%}.lesson-page:not(:last-child){page-break-after:always;break-after:page}</style></head><body>${pages}</body></html>`;
}
