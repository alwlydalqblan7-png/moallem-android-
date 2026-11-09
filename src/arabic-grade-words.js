const feminineUnits = ["", "إحدى", "اثنتان", "ثلاث", "أربع", "خمس", "ست", "سبع", "ثماني", "تسع"];
const teens = ["عشر", "إحدى عشرة", "اثنتا عشرة", "ثلاث عشرة", "أربع عشرة", "خمس عشرة", "ست عشرة", "سبع عشرة", "ثماني عشرة", "تسع عشرة"];
const tens = ["", "", "عشرون", "ثلاثون", "أربعون", "خمسون", "ستون", "سبعون", "ثمانون", "تسعون"];
const hundreds = ["", "مئة", "مئتان", "ثلاثمئة", "أربعمئة", "خمسمئة", "ستمئة", "سبعمئة", "ثمانمئة", "تسعمئة"];

function feminineCardinal(value) {
  if (value < 10) return feminineUnits[value] || "صفر";
  if (value < 20) return teens[value - 10];
  if (value < 100) {
    const unit = value % 10;
    return unit ? `${feminineUnits[unit]} و${tens[Math.floor(value / 10)]}` : tens[Math.floor(value / 10)];
  }
  if (value < 1000) {
    const hundred = hundreds[Math.floor(value / 100)];
    const remainder = value % 100;
    return remainder ? `${hundred} و${feminineCardinal(remainder)}` : hundred;
  }
  return String(value);
}

export function formatGradeInArabicWords(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return "";
  const whole = Math.floor(number);
  const fraction = Math.round((number - whole) * 100) / 100;
  let phrase;
  if (whole === 1) phrase = "درجة واحدة";
  else if (whole === 2) phrase = "درجتان";
  else if (whole >= 3 && whole <= 10) phrase = `${feminineCardinal(whole)} درجات`;
  else if (whole === 100 || whole === 200) phrase = `${whole === 100 ? "مئة" : "مئتا"} درجة`;
  else {
    const remainder = whole % 100;
    const cardinal = feminineCardinal(whole);
    if (remainder === 1) phrase = `${cardinal.slice(0, -"إحدى".length)}درجة واحدة`.replace(/\s+/g, " ").trim();
    else if (remainder === 2) phrase = `${cardinal.slice(0, -"اثنتان".length)}درجتان`.replace(/\s+/g, " ").trim();
    else if (remainder >= 3 && remainder <= 10) phrase = `${cardinal} درجات`;
    else phrase = `${cardinal} درجة`;
  }
  if (!fraction) return phrase;
  if (fraction === 0.5) return `${phrase} ونصف`;
  if (fraction === 0.25) return `${phrase} وربع`;
  const decimalDigits = String(number).split(".")[1] || "";
  const decimalWords = [...decimalDigits].map((digit) => feminineCardinal(Number(digit))).join(" ");
  return `${phrase} فاصلة ${decimalWords}`;
}
