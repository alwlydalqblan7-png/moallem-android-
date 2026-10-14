export const escapeHtml = (value) => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#39;");

export const autoColorHtml = (text) => String(text || "").split(/\r?\n/).map((line) => {
  const safe = escapeHtml(line);
  const heading = line.trim().replace(/^[\d٠-٩\s.)#*=-]+/, "").replace(/[\s*#=:：-]+$/g, "");
  const color = /^(?:ملاحظة|ملاحظات|تنبيه|تنبيهات)(?:\s|:|$)/.test(heading)
    ? "#d32f2f"
    : /^(?:الأهداف|نواتج التعلم|الأنشطة|نشاط|سير الدرس|التهيئة)(?:\s|:|$)/.test(heading)
      ? "#16834a"
      : /^(?:عنوان الدرس|الدرس|المادة|الوحدة|تحضير درس|العنوان)(?:\s|:|$)/.test(heading)
        ? "#1769aa"
        : "#111111";
  return `<div style="color:${color}">${safe || "<br>"}</div>`;
}).join("");

export const mergeSubjectOptions = (current, additions) => {
  const existing = Array.isArray(current) ? current : [];
  return [...existing, ...additions.filter((name) => !existing.includes(name))];
};
