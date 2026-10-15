const validMaximum = (maximum) => Number.isFinite(Number(maximum)) && Number(maximum) >= 0;

export function normalizeMarkInput(value, maximum) {
  if (value === "") return "";
  const number = Number(value);
  if (!Number.isFinite(number)) return "";
  const max = validMaximum(maximum) ? Number(maximum) : 0;
  return Math.min(max, Math.max(0, number));
}

export function calculateGradebookTotals(marks = {}, columns = []) {
  const result = { earned: 0, maximum: 0 };
  for (const column of columns) {
    if (!column || !validMaximum(column.max)) continue;
    const maximum = Number(column.max);
    const mark = marks[column.id];
    result.maximum += maximum;
    if (mark !== "" && mark != null && Number.isFinite(Number(mark))) {
      result.earned += normalizeMarkInput(mark, maximum);
    }
  }
  return result;
}
