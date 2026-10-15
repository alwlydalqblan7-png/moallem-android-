import { officialGradeColumns, officialGradeMaximum } from "./official-grade-distribution.js";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Home,
  Users,
  TableProperties,
  ClipboardList,
  Bot,
  Settings,
  Plus,
  Trash2,
  Save,
  Edit3,
  Printer as PrinterIcon,
  Sparkles,
  WifiOff,
  Wifi,
  ArrowUpDown,
  GraduationCap,
  FileText,
  Search,
  UserPlus,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  Layers3,
  Library,
  Upload,
  FolderOpen,
  CalendarDays,
  Copy,
  RefreshCw,
  Bell,
} from "lucide-react";
import { Printer } from "@capgo/capacitor-printer";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import { LocalNotifications } from "@capacitor/local-notifications";
import "./styles.css";
import moallemIcon from "./assets/moallem-icon.png";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { autoColorHtml, mergeSubjectOptions } from "./preparation-format.js";
import { validateMoallemBackup } from "./backup-format.js";
import { inspectDaftarBackup } from "./legacy-backup-inspector.js";
import { getDailyWidgetStatus, parseStudentNames } from "./student-tools.js";
import { calculateGradebookTotals, normalizeMarkInput } from "./gradebook.js";
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
const HomeWidget = registerPlugin("HomeWidget");
const BackupFile = registerPlugin("BackupFile");

const DEFAULT_GRADES = [
  "السابع",
  "الثامن",
  "التاسع",
  "العاشر",
  "الحادي عشر",
  "البكالوريا",
];
const DEFAULT_SECTIONS = ["أ", "ب"];
const GENERAL_SCIENCE_GRADES = ["السابع", "الثامن", "التاسع"];
const GENERAL_SCIENCE_BRANCHES = [
  { id: "biology", name: "علم الأحياء والأرض", max: 200 },
  { id: "physics", name: "الفيزياء", max: 120 },
  { id: "chemistry", name: "الكيمياء", max: 80 },
];
const GENERAL_SCIENCE_TOTAL = 400;
const DEFAULT_SUBJECTS = [
  "اللغة العربية",
  "اللغة الإنكليزية",
  "اللغة الفرنسية",
  "الرياضيات",
  "العلوم العامة",
  "الفيزياء",
  "الكيمياء",
  "علم الأحياء",
  "علم الأرض",
  "التاريخ",
  "الجغرافيا",
  "المعلوماتية",
  "التربية الدينية",
  "التربية الفنية",
  "التربية الموسيقية",
  "التربية الرياضية",
];
const ADDED_SUBJECTS = ["العلوم", "الفيزياء والكيمياء"];
const seedStudents = [
  { id: 1, name: "أحمد محمد", grade: "السابع", section: "أ" },
  { id: 2, name: "سارة خالد", grade: "السابع", section: "أ" },
  { id: 3, name: "وليد محمود", grade: "السابع", section: "أ" },
  { id: 4, name: "لانا علي", grade: "السابع", section: "ب" },
  { id: 5, name: "عمر حسن", grade: "الثامن", section: "أ" },
  { id: 6, name: "ريم يوسف", grade: "الثامن", section: "أ" },
];
const seedColumns = [
  { id: "c1", name: "مذاكرة 1", max: 10, type: "مذاكرة" },
  { id: "c2", name: "واجب", max: 5, type: "واجب" },
  { id: "c3", name: "امتحان", max: 50, type: "امتحان" },
];
const scienceTotalColumns = [
  {
    id: "science_biology",
    name: "علم الأحياء والأرض",
    max: 200,
    type: "فرع العلوم",
  },
  { id: "science_physics", name: "الفيزياء", max: 120, type: "فرع العلوم" },
  { id: "science_chemistry", name: "الكيمياء", max: 80, type: "فرع العلوم" },
];
const load = (k, f) => {
  try {
    return JSON.parse(localStorage.getItem(k)) ?? f;
  } catch {
    return f;
  }
};
const persist = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const sanitizeRichHtml = (html) => {
  const doc = new DOMParser().parseFromString(`<div>${html || ""}</div>`, "text/html");
  const root = doc.body.firstElementChild;
  const allowed = new Set(["DIV","P","BR","SPAN","B","STRONG","I","EM","U","UL","OL","LI"]);
  const clean = (node) => {
    for (const child of [...node.childNodes]) {
      if (child.nodeType === Node.TEXT_NODE) continue;
      if (child.nodeType !== Node.ELEMENT_NODE || !allowed.has(child.tagName)) { child.replaceWith(...child.childNodes); continue; }
      const color = child.style?.color;
      for (const attr of [...child.attributes]) child.removeAttribute(attr.name);
      if (/^(#[0-9a-f]{3,8}|rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\))$/i.test(color || "")) child.setAttribute("style", `color:${color}`);
      clean(child);
    }
  };
  clean(root);
  return root.innerHTML;
};

const PDF_DB = "moallem_library";
const PDF_STORE = "pdfs";
const openPdfDb = () =>
  new Promise((resolve, reject) => {
    const r = indexedDB.open(PDF_DB, 1);
    r.onupgradeneeded = () => {
      if (!r.result.objectStoreNames.contains(PDF_STORE))
        r.result.createObjectStore(PDF_STORE);
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
const savePdfBlob = async (id, blob) => {
  const db = await openPdfDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(PDF_STORE, "readwrite");
    tx.objectStore(PDF_STORE).put(blob, String(id));
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  db.close();
};
const getPdfBlob = async (id) => {
  const db = await openPdfDb();
  const blob = await new Promise((resolve, reject) => {
    const r = db
      .transaction(PDF_STORE, "readonly")
      .objectStore(PDF_STORE)
      .get(String(id));
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
  db.close();
  return blob;
};
const deletePdfBlob = async (id) => {
  const db = await openPdfDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(PDF_STORE, "readwrite");
    tx.objectStore(PDF_STORE).delete(String(id));
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  db.close();
};
const listPdfBlobs = async () => {
  const db = await openPdfDb();
  const entries = await new Promise((resolve, reject) => {
    const tx = db.transaction(PDF_STORE, "readonly");
    const store = tx.objectStore(PDF_STORE);
    const values = store.getAll();
    const keys = store.getAllKeys();
    tx.oncomplete = () => resolve(keys.result.map((key, i) => ({ id: String(key), blob: values.result[i] })));
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  return entries;
};
const blobToDataUrl = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(blob);
});
const replaceDecodedPdfBlobs = async (decoded) => {
  const db = await openPdfDb();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(PDF_STORE, "readwrite");
      const store = tx.objectStore(PDF_STORE);
      store.clear();
      for (const pdf of decoded) store.put(pdf.blob, pdf.id);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error("تعذرت استعادة ملفات PDF"));
    });
  } finally { db.close(); }
};


const extractAiText = (data) => {
  if (!data) return "";
  const direct = [data.text, data.answer, data.result, data.response, data.output_text];
  for (const value of direct) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  const choice = data?.choices?.[0]?.message?.content;
  if (typeof choice === "string" && choice.trim()) return choice.trim();
  if (Array.isArray(choice)) {
    const joined = choice
      .map((item) =>
        typeof item === "string"
          ? item
          : typeof item?.text === "string"
            ? item.text
            : typeof item?.content === "string"
              ? item.content
              : "",
      )
      .filter(Boolean)
      .join("\n")
      .trim();
    if (joined) return joined;
  }
  if (data.result && typeof data.result === "object") return extractAiText(data.result);
  return "";
};
const extractPdfText = async (bookId, startPage = 1, endPage = startPage) => {
  const blob = await getPdfBlob(bookId);
  if (!blob) throw new Error("لم يتم العثور على ملف الكتاب");
  const data = new Uint8Array(await blob.arrayBuffer());
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const from = Math.max(1, Number(startPage) || 1);
  const to = Math.min(pdf.numPages, Math.max(from, Number(endPage) || from));
  if (to - from + 1 > 8) throw new Error("اختر نطاقاً لا يتجاوز 8 صفحات في كل طلب حتى لا تتأخر الخدمة.");
  const pages = [];
  for (let pageNumber = from; pageNumber <= to; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => item.str || "")
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    pages.push(`الصفحة ${pageNumber}\n${text}`);
  }
  const fullText = pages.join("\n\n");
  return {
    pageCount: pdf.numPages,
    startPage: from,
    endPage: to,
    text: fullText.slice(0, 18000),
    truncated: fullText.length > 18000,
  };
};

function App() {
  const [schoolSettings, setSchoolSettings] = useState(() => load("m2_school_settings", { teacher:"", principal:"", school:"", directorate:"", year:"2026 - 2027", signature:"" }));
  const [periodSettings, setPeriodSettings] = useState(() => load("m2_period_settings", [
    ["08:00","08:40"],["08:40","09:20"],["09:20","10:00"],["10:15","10:55"],
    ["10:55","11:35"],["11:50","12:25"],["12:25","13:00"]
  ]));
  const [widgetMessage, setWidgetMessage] = useState("");
  const [widgetNow, setWidgetNow] = useState(() => new Date());
  const dailyWidgetStatus = useMemo(
    () => getDailyWidgetStatus(periodSettings, widgetNow),
    [periodSettings, widgetNow],
  );
  const [soundSettings, setSoundSettings] = useState(() => load("m2_sound_settings", {enabled:false,start:true,end:true}));
  const [notificationMessage, setNotificationMessage] = useState("");
  useEffect(() => persist("m2_school_settings",schoolSettings),[schoolSettings]);
  useEffect(() => persist("m2_period_settings",periodSettings),[periodSettings]);
  useEffect(() => persist("m2_sound_settings",soundSettings),[soundSettings]);
  useEffect(() => {
    const timer = setInterval(() => setWidgetNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    HomeWidget.syncSchedule({ periods: periodSettings }).catch(() => {});
  }, [periodSettings]);
  const scheduleClassNotifications = async () => {
    if (!Capacitor.isNativePlatform()) { setNotificationMessage("تنبيهات الخلفية متاحة في نسخة Android فقط."); return; }
    try {
      const pendingIds = Array.from({length: 500}, (_, i) => ({id: 260000 + i}));
      if (!soundSettings.enabled || (!soundSettings.start && !soundSettings.end)) {
        await LocalNotifications.cancel({notifications: pendingIds});
        setNotificationMessage("أُوقفت تنبيهات الحصص.");
        return;
      }
      let permission = await LocalNotifications.checkPermissions();
      if (permission.display !== "granted") permission = await LocalNotifications.requestPermissions();
      if (permission.display !== "granted") { setNotificationMessage("لم يُسمح للتطبيق بإظهار التنبيهات."); return; }
      let exactAlarmsAllowed = true;
      if (Capacitor.getPlatform() === "android") {
        let exactSetting = await LocalNotifications.checkExactNotificationSetting();
        if (exactSetting.exact_alarm !== "granted") exactSetting = await LocalNotifications.changeExactNotificationSetting();
        exactAlarmsAllowed = exactSetting.exact_alarm === "granted";
      }
      await LocalNotifications.cancel({notifications: pendingIds});
      const notifications = [];
      const days = [1, 2, 3, 4, 5]; // الأحد إلى الخميس في تقويم Android
      days.forEach((weekday, dayIndex) => periodSettings.forEach((times, periodIndex) => {
        [["start", times?.[0], "بداية"], ["end", times?.[1], "نهاية"]].forEach(([key, time, label], eventIndex) => {
          if (!soundSettings[key] || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time || "")) return;
          const [hour, minute] = time.split(":").map(Number);
          notifications.push({
            id: 260000 + dayIndex * 100 + periodIndex * 2 + eventIndex,
            title: `تنبيه ${label} الحصة ${periodIndex + 1}`,
            body: `${label} الحصة ${periodIndex + 1} — ${WEEK_DAYS[dayIndex]}`,
            schedule: { on: { weekday, hour, minute }, allowWhileIdle: true },
            sound: "default",
            channelId: "moallem-class-bells",
          });
        });
      }));
      if (!notifications.length) { setNotificationMessage("أدخل أوقاتاً صحيحة للحصص وفعّل بداية الحصة أو نهايتها."); return; }
      await LocalNotifications.createChannel({id:"moallem-class-bells",name:"تنبيهات الحصص",description:"بداية الحصة ونهايتها",importance:5,sound:"default",visibility:1});
      await LocalNotifications.schedule({notifications});
      setNotificationMessage(`تمت جدولة ${notifications.length} تنبيهاً أسبوعياً.${exactAlarmsAllowed ? "" : " لم يُسمح بالتنبيه الدقيق؛ قد يتأخر بعضها وفق إدارة النظام."}`);
    } catch (error) { setNotificationMessage(error?.message || "تعذرت جدولة التنبيهات."); }
  };
  const requestHomeWidget = async () => {
    if (!Capacitor.isNativePlatform()) {
      setWidgetMessage("إضافة الويدجت متاحة في نسخة Android فقط.");
      return;
    }
    try {
      const result = await HomeWidget.requestPin();
      setWidgetMessage(result?.supported
        ? "أرسلنا طلب إضافة دفتر المعلّم. وافق في نافذة الشاشة الرئيسية لإتمام الإضافة."
        : "اضغط مطولاً على الشاشة الرئيسية، ثم اختر الأدوات > معلّم تجريبي > دفتر المعلّم.");
    } catch {
      setWidgetMessage("اضغط مطولاً على الشاشة الرئيسية، ثم اختر الأدوات > معلّم تجريبي > دفتر المعلّم.");
    }
  };
  const exportSettingsBackup = async () => {
    try {
      const data = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith("m2_")) data[key] = localStorage.getItem(key);
      }
      const pdfs = await Promise.all((await listPdfBlobs()).map(async ({ id, blob }) => ({
        id, data: await blobToDataUrl(blob),
      })));
      const payload = JSON.stringify({
        format: "moallem-backup-v2", createdAt: new Date().toISOString(), data, pdfs,
      });
      const filename = "moallem-backup-" + new Date().toISOString().slice(0, 10) + ".json";
      if (Capacitor.isNativePlatform()) {
        try {
          await BackupFile.save({ filename, content: payload });
          window.alert("تم حفظ النسخة الاحتياطية بنجاح في المكان الذي اخترته.");
        } catch (error) {
          if (String(error?.message || error).includes("CANCELLED")) return;
          window.alert("تعذر حفظ النسخة: " + (error?.message || error));
        }
        return;
      }
      const blob = new Blob([payload], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      window.alert("تم طلب تنزيل النسخة. تأكد من وجود ملف " + filename + " في التنزيلات؛ لا تعتبر النسخ ناجحًا قبل التأكد.");
    } catch (err) {
      window.alert("فشل إنشاء النسخة الاحتياطية: " + (err?.message || "خطأ غير معروف"));
    }
  };
  const importSettingsBackup = async (file) => {
    if (!file) return;
    try {
      const backup = JSON.parse(await file.text());
      const validated = validateMoallemBackup(backup);
      const entries = Object.entries(validated.data);
      if (!entries.length) throw new Error("النسخة لا تحتوي بيانات معلّم");
      if (!window.confirm(`ستستبدل البيانات التي تحمل المفاتيح نفسها${backup.format === "moallem-backup-v2" ? `، وستستبدل مكتبة PDF بـ ${validated.pdfs.length} ملف` : ""}. احفظ نسخة احتياطية مستقلة قبل المتابعة. هل تريد الاستعادة؟`)) return;
      const previousValues = Object.fromEntries(entries.map(([key]) => [key, localStorage.getItem(key)]));
      const previousPdfs = backup.format === "moallem-backup-v2" ? await listPdfBlobs() : null;
      try {
        if (backup.format === "moallem-backup-v2") await replaceDecodedPdfBlobs(validated.pdfs);
        for (const [key, value] of entries) localStorage.setItem(key, value);
      } catch (writeError) {
        let rollbackError = null;
        for (const [key, value] of Object.entries(previousValues)) {
          try {
            if (value === null) localStorage.removeItem(key);
            else localStorage.setItem(key, value);
          } catch (error) { rollbackError ||= error; }
        }
        if (previousPdfs) {
          try { await replaceDecodedPdfBlobs(previousPdfs); }
          catch (error) { rollbackError ||= error; }
        }
        if (rollbackError) console.error("Backup restore rollback was incomplete", rollbackError);
        throw writeError;
      }
      window.alert("اكتملت استعادة البيانات. سيعاد تحميل التطبيق الآن.");
      window.location.reload();
    } catch (err) {
      window.alert("فشلت الاستعادة دون إكمال العملية: " + (err?.message || "خطأ غير معروف"));
    }
  };
  const [fullPagePreparation, setFullPagePreparation] = useState(false);
  const [legacyBackupReport, setLegacyBackupReport] = useState(null);
  const [legacyBackupError, setLegacyBackupError] = useState("");
  const inspectLegacyBackupFile = async (file) => {
    if (!file) return;
    setLegacyBackupReport(null);
    setLegacyBackupError("");
    try {
      if (file.size > 20 * 1024 * 1024) throw new Error("الملف أكبر من 20 ميغابايت؛ افحصه على جهاز آمن قبل المتابعة");
      const payload = JSON.parse(await file.text());
      setLegacyBackupReport(inspectDaftarBackup(payload));
    } catch (error) {
      setLegacyBackupError(error?.message || "تعذر فحص النسخة");
    }
  };
  const [tab, setTab] = useState("home");
  const [grades, setGrades] = useState(() => load("m2_grades", DEFAULT_GRADES));
  const [sections, setSections] = useState(() =>
    load("m2_sections", DEFAULT_SECTIONS),
  );
  const [subjects, setSubjects] = useState(() => {
    const current = load("m2_subjects", DEFAULT_SUBJECTS);
    // Add options without renaming/removing any subject that may own old records.
    return mergeSubjectOptions(current, ADDED_SUBJECTS);
  });
  const [subjectTeachers, setSubjectTeachers] = useState(() => load("m2_subject_teachers", {}));
  const [students, setStudents] = useState(() =>
    load("m2_students", seedStudents),
  );
  const [bulkNamesOpen, setBulkNamesOpen] = useState(false);
  const [bulkNamesText, setBulkNamesText] = useState("");
  const [bulkNamesMessage, setBulkNamesMessage] = useState("");
  const [attendance, setAttendance] = useState(() => load("m2_attendance", {}));
  const [gradebooks, setGradebooks] = useState(() => load("m2_gradebooks", {}));
  const [grade, setGrade] = useState(() => load("m2_grade", "السابع"));
  const [section, setSection] = useState(() => load("m2_section", "أ"));
  const [subject, setSubject] = useState(() =>
    load("m2_subject", "العلوم العامة"),
  );
  const [sciencePrepSubject, setSciencePrepSubject] = useState(
    "علم الأحياء والأرض",
  );
  const [lessonDate, setLessonDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const isGeneralScience =
    subject === "العلوم العامة" && GENERAL_SCIENCE_GRADES.includes(grade);
  const [editMode, setEditMode] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiResult, setAiResult] = useState("");
  const [aiRichContent, setAiRichContent] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [search, setSearch] = useState("");
  const [libraryBooks, setLibraryBooks] = useState(() =>
    load("m2_library_books", []),
  );
  const [libraryTitle, setLibraryTitle] = useState("");
  const [libraryMessage, setLibraryMessage] = useState("");
  const [plannerBook, setPlannerBook] = useState(null);
  const [plannerStart, setPlannerStart] = useState("");
  const [plannerEnd, setPlannerEnd] = useState("");
  const [plannerPeriods, setPlannerPeriods] = useState(3);
  const [plannerHolidays, setPlannerHolidays] = useState("");
  const [plannerTocStart, setPlannerTocStart] = useState(1);
  const [plannerTocEnd, setPlannerTocEnd] = useState(8);
  const [plannerGenerating, setPlannerGenerating] = useState(false);
  const [bookStartPage, setBookStartPage] = useState(1);
  const [bookEndPage, setBookEndPage] = useState(1);
  const [bookLessonTitle, setBookLessonTitle] = useState("");
  const [savedPreparations, setSavedPreparations] = useState(() =>
    load("m2_saved_preparations", []),
  );
  const [knowledgeBank, setKnowledgeBank] = useState(() => load("m2_knowledge_bank", []));
  const [knowledgeQuery, setKnowledgeQuery] = useState("");
  const [knowledgeTypeFilter, setKnowledgeTypeFilter] = useState("الكل");
  const [knowledgeFormOpen, setKnowledgeFormOpen] = useState(false);
  const [editingKnowledgeId, setEditingKnowledgeId] = useState(null);
  const [knowledgeDraft, setKnowledgeDraft] = useState({title:"", type:"سؤال", subject:"", grade:"", section:"", content:""});
  const [editingPreparationId, setEditingPreparationId] = useState(null);
  const [savedPlans, setSavedPlans] = useState(() =>
    load("m2_curriculum_plans", []),
  );
  const WEEK_DAYS = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس"];
  const [weeklySchedule, setWeeklySchedule] = useState(() =>
    load("m2_weekly_schedule", {}),
  );
  const [scheduleEffectiveDate, setScheduleEffectiveDate] = useState(() => load("m2_schedule_effective_date", ""));
  useEffect(() => persist("m2_schedule_effective_date", scheduleEffectiveDate), [scheduleEffectiveDate]);
  const getSchedulePeriod = (day, index) => (weeklySchedule[day] || [])[index] || null;
  const setScheduleCell = (day, index, value) => setWeeklySchedule((previous) => {
    const periods = [...(previous[day] || [])];
    while (periods.length <= index) periods.push({ id: Date.now() + periods.length, grade: "", section: "", subject: "", time: "" });
    periods[index] = { ...periods[index], note: value };
    return { ...previous, [day]: periods };
  });
  const escapePrint = (value) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const scheduleCellText = (day, index) => {
    const period = getSchedulePeriod(day, index);
    if (!period) return "";
    return period.note !== undefined ? period.note : [period.subject, period.grade && `الصف ${period.grade}`, period.section && `الشعبة ${period.section}`].filter(Boolean).join(" - ");
  };
  const printWeeklySchedule = () => {
    const rows = WEEK_DAYS.map((day) => `<tr><th>${day}</th>${Array.from({length: 7}, (_, i) => `<td>${escapePrint(scheduleCellText(day, i))}</td>`).join("")}</tr>`).join("");
    printDocument("البرنامج الأسبوعي", `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>@page{size:A4 landscape;margin:12mm}body{font-family:Arial,sans-serif;color:#222}h1{text-align:center;font-size:22px}.date{background:#f0ede2;padding:12px;margin:16px 0}table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{border:1px solid #777;text-align:center;padding:10px 4px;height:64px;white-space:pre-wrap;font-size:12px}th{background:#eee9d8}footer{margin-top:20px;background:#f0ede2;padding:16px;display:flex;justify-content:space-between}</style></head><body><h1>البرنامج الأسبوعي</h1><div class="date">يعمل بهذا البرنامج اعتباراً من: ${escapePrint(scheduleEffectiveDate)}</div><table><thead><tr><th>اليوم</th>${Array.from({length:7},(_,i)=>`<th>الدرس ${i+1}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table><footer><span>ملاحظات: ....................................</span><span>اسم المدرس وتوقيعه: ....................................</span></footer></body></html>`);
  };
  const pdfInputRef = useRef(null);
  const [reportPreview, setReportPreview] = useState(false);
  const tabRef = useRef(tab);
  const reportPreviewRef = useRef(reportPreview);
  useEffect(() => {
    tabRef.current = tab;
  }, [tab]);
  useEffect(() => {
    reportPreviewRef.current = reportPreview;
  }, [reportPreview]);
  useEffect(() => {
    let handle;
    CapacitorApp.addListener("backButton", () => {
      if (reportPreviewRef.current) {
        setReportPreview(false);
        return;
      }
      if (tabRef.current !== "home") {
        setTab("home");
        return;
      }
      CapacitorApp.exitApp();
    }).then((h) => {
      handle = h;
    });
    return () => {
      handle && handle.remove();
    };
  }, []);
  useEffect(() => {
    const a = () => setOnline(true),
      b = () => setOnline(false);
    addEventListener("online", a);
    addEventListener("offline", b);
    return () => {
      removeEventListener("online", a);
      removeEventListener("offline", b);
    };
  }, []);
  useEffect(() => persist("m2_grades", grades), [grades]);
  useEffect(() => persist("m2_sections", sections), [sections]);
  useEffect(() => persist("m2_subjects", subjects), [subjects]);
  useEffect(() => persist("m2_subject_teachers", subjectTeachers), [subjectTeachers]);
  useEffect(() => persist("m2_students", students), [students]);
  useEffect(() => persist("m2_attendance", attendance), [attendance]);
  useEffect(() => persist("m2_gradebooks", gradebooks), [gradebooks]);
  useEffect(() => persist("m2_grade", grade), [grade]);
  useEffect(() => persist("m2_section", section), [section]);
  useEffect(() => persist("m2_subject", subject), [subject]);
  useEffect(() => persist("m2_library_books", libraryBooks), [libraryBooks]);
  useEffect(() => persist("m2_curriculum_plans", savedPlans), [savedPlans]);
  useEffect(
    () => persist("m2_weekly_schedule", weeklySchedule),
    [weeklySchedule],
  );
  useEffect(
    () => persist("m2_saved_preparations", savedPreparations),
    [savedPreparations],
  );
  useEffect(() => persist("m2_knowledge_bank", knowledgeBank), [knowledgeBank]);
  useEffect(() => {
    if (!plannerBook) return;
    // الكتاب مصدر مستقل؛ المادة/الفرع يحددان طريقة التحضير فقط.
    // لا نمسح اختيار الكتاب عند تغيير المادة ما دام الكتاب للصف نفسه.
    if (plannerBook.grade !== grade) {
      setPlannerBook(null);
      setAiError("");
    }
  }, [grade, plannerBook]);
  const classStudents = useMemo(
    () => students.filter((s) => s.grade === grade && s.section === section),
    [students, grade, section],
  );
  const bulkNameList = useMemo(() => parseStudentNames(bulkNamesText), [bulkNamesText]);
  const bulkDuplicateCount = useMemo(() => {
    const seen = new Set(classStudents.map((student) => student.name.replace(/\s+/g, " ").trim().toLocaleLowerCase("ar")));
    let count = 0;
    for (const name of bulkNameList) {
      const normalized = name.replace(/\s+/g, " ").trim().toLocaleLowerCase("ar");
      if (seen.has(normalized)) count++;
      seen.add(normalized);
    }
    return count;
  }, [classStudents, bulkNameList]);
  const visibleStudents = useMemo(
    () => classStudents.filter((s) => !search || s.name.includes(search)),
    [classStudents, search],
  );
  // Keep standalone subject choices available in every grade. The legacy
  // aggregate "العلوم العامة" branch remains available without hiding them.
  const availableSubjects = subjects;
  const preparationSubject = isGeneralScience ? sciencePrepSubject : subject;
  const aiBooks = useMemo(
    () => libraryBooks.filter((b) => b.grade === grade),
    [libraryBooks, grade],
  );
  const bookKey = `${grade}|${section}|${subject}`;
  const book = gradebooks[bookKey] || {
    columns: officialGradeColumns(grade, subject) || seedColumns,
    marks: {},
  };
  const updateBook = (next) =>
    setGradebooks((g) => ({ ...g, [bookKey]: next }));
  const applyOfficialDistribution = () => {
    const columns = officialGradeColumns(grade, subject);
    if (!columns) return;
    const hasMarks = Object.values(book.marks || {}).some(row =>
      Object.values(row || {}).some(value => value !== "" && value != null));
    if (hasMarks) {
      window.alert("هذا الدفتر يحتوي على علامات محفوظة. حفاظًا عليها، لا يمكن استبدال أعمدته تلقائيًا. أنشئ نسخة احتياطية وعدّل الأعمدة يدويًا.");
      return;
    }
    updateBook({ ...book, columns });
  };
  const addColumn = () =>
    updateBook({
      ...book,
      columns: [
        ...book.columns,
        { id: "c" + Date.now(), name: "بند جديد", max: 10, type: "نشاط" },
      ],
    });
  const updateColumn = (id, patch) =>
    updateBook({
      ...book,
      columns: book.columns.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    });
  const deleteColumn = (id) => {
    const marks = structuredClone(book.marks || {});
    Object.values(marks).forEach((m) => delete m[id]);
    updateBook({
      ...book,
      columns: book.columns.filter((c) => c.id !== id),
      marks,
    });
  };
  const setMark = (sid, cid, val) =>
    updateBook({
      ...book,
      marks: {
        ...book.marks,
        [sid]: {
          ...(book.marks[sid] || {}),
          [cid]: normalizeMarkInput(val, book.columns.find((column) => column.id === cid)?.max),
        },
      },
    });
  const officialMax = officialGradeMaximum(grade, subject);
  const split200 = Boolean(officialMax);
  const finalExamColumn = book.columns.find(c => c.id === "official_final_exam");
  const ensureFinalExam = () => {
    if (finalExamColumn) return;
    updateBook({ ...book, columns: [...book.columns, {
      id: "official_final_exam", name: "الامتحان الأخير", max: officialMax, type: "امتحان نهائي",
    }] });
  };
  const calc = (s) => {
    const m = book.marks[s.id] || {};
    const totals = calculateGradebookTotals(m, book.columns);
    let { earned: got, maximum: max } = totals;
    if (split200 && finalExamColumn) {
      const workCols = book.columns.filter(c => c.id !== "official_final_exam");
      const works = calculateGradebookTotals(m, workCols).earned;
      const exam = m.official_final_exam === "" || m.official_final_exam == null ? null : normalizeMarkInput(m.official_final_exam, finalExamColumn.max);
      const final = exam == null ? null : (works + exam) / 2;
      return { got: final ?? works, max: officialMax, pct: Math.round(((final ?? works) / officialMax) * 1000) / 10,
        works, exam, final, split: true };
    }
    return { got, max, pct: max ? Math.round((got / max) * 1000) / 10 : 0 };
  };
  const addStudent = () =>
    setStudents((x) => [
      ...x,
      { id: Date.now(), name: "طالب جديد", grade, section },
    ]);
  const addStudentsFromList = () => {
    if (!bulkNameList.length) {
      setBulkNamesMessage("ألصق الأسماء أولاً، اسمًا في كل سطر.");
      return;
    }
    if (bulkDuplicateCount && !window.confirm(`توجد ${bulkDuplicateCount} أسماء مكررة في القائمة أو مسجلة في هذا الصف. ستبقى كطلاب مستقلين إذا أضفتها. هل تريد المتابعة؟`)) return;
    const createdAt = Date.now();
    const additions = bulkNameList.map((name, index) => ({
      id: globalThis.crypto?.randomUUID?.() || `bulk-${createdAt}-${index}`,
      name,
      grade,
      section,
    }));
    setStudents((current) => [...current, ...additions]);
    setBulkNamesMessage(`تمت إضافة ${additions.length} طالبًا إلى ${grade} — الشعبة ${section}.`);
    setBulkNamesText("");
    setBulkNamesOpen(false);
  };
  const loadStudentNamesFile = async (file) => {
    if (!file) return;
    try {
      const text = await file.text();
      setBulkNamesText(text);
      setBulkNamesMessage(`تم تحميل الملف؛ عُثر على ${parseStudentNames(text).length} اسمًا.`);
    } catch {
      setBulkNamesMessage("تعذرت قراءة الملف. جرّب ملف CSV أو TXT بترميز UTF-8.");
    }
  };
  const renameStudent = (id, name) =>
    setStudents((x) => x.map((s) => (s.id === id ? { ...s, name } : s)));
  const deleteStudent = (id) =>
    setStudents((x) => x.filter((s) => s.id !== id));
  const sortArabic = () =>
    setStudents((x) => {
      const a = x
        .filter((s) => s.grade === grade && s.section === section)
        .sort((p, q) => p.name.localeCompare(q.name, "ar"));
      const b = x.filter((s) => !(s.grade === grade && s.section === section));
      return [...b, ...a];
    });
  const setAtt = (id, v) =>
    setAttendance((a) => ({ ...a, [`${grade}|${section}|${id}`]: v }));
  const addItem = (kind) => {
    const v = prompt(`اكتب اسم ${kind} الجديد`);
    if (!v?.trim()) return;
    if (kind === "الصف") setGrades((x) => [...x, v.trim()]);
    if (kind === "الشعبة") setSections((x) => [...x, v.trim()]);
    if (kind === "المادة") setSubjects((x) => [...x, v.trim()]);
  };
  const renameItem = (kind, old) => {
    const v = prompt(`تعديل اسم ${kind}`, old);
    if (!v?.trim() || v.trim() === old) return;
    const n = v.trim();
    if (kind === "الصف") {
      setGrades((x) => x.map((z) => (z === old ? n : z)));
      setStudents((x) =>
        x.map((s) => (s.grade === old ? { ...s, grade: n } : s)),
      );
      if (grade === old) setGrade(n);
    }
    if (kind === "الشعبة") {
      setSections((x) => x.map((z) => (z === old ? n : z)));
      setStudents((x) =>
        x.map((s) => (s.section === old ? { ...s, section: n } : s)),
      );
      if (section === old) setSection(n);
    }
    if (kind === "المادة") {
      setSubjects((x) => x.map((z) => (z === old ? n : z)));
      if (subject === old) setSubject(n);
    }
  };
  const removeItem = (kind, v) => {
    if (!confirm(`حذف ${kind}: ${v}؟`)) return;
    if (kind === "الصف") setGrades((x) => x.filter((z) => z !== v));
    if (kind === "الشعبة") setSections((x) => x.filter((z) => z !== v));
    if (kind === "المادة") setSubjects((x) => x.filter((z) => z !== v));
  };

  const addWeeklyPeriod = (day) =>
    setWeeklySchedule((x) => ({
      ...x,
      [day]: [
        ...(x[day] || []),
        { id: Date.now(), grade, section, subject, time: "" },
      ],
    }));
  const updateWeeklyPeriod = (day, id, patch) =>
    setWeeklySchedule((x) => ({
      ...x,
      [day]: (x[day] || []).map((v) => (v.id === id ? { ...v, ...patch } : v)),
    }));
  const removeWeeklyPeriod = (day, id) =>
    setWeeklySchedule((x) => ({
      ...x,
      [day]: (x[day] || []).filter((v) => v.id !== id),
    }));
  const savePlannerSettings = () => {
    if (!plannerBook) return;
    if (!plannerStart || !plannerEnd) {
      setLibraryMessage("حدد بداية ونهاية الفصل أولاً.");
      return;
    }
    const plan = {
      id: Date.now(),
      bookId: plannerBook.id,
      bookTitle: plannerBook.title,
      grade: plannerBook.grade,
      subject: plannerBook.subject,
      start: plannerStart,
      end: plannerEnd,
      periods: Number(plannerPeriods) || 1,
      holidays: plannerHolidays.trim(),
      status: "بانتظار استخراج فهرس الكتاب",
      createdAt: new Date().toISOString(),
    };
    setSavedPlans((x) => [
      plan,
      ...x.filter((v) => v.bookId !== plannerBook.id),
    ]);
    setLibraryMessage(
      "تم حفظ إعدادات التخطيط. لن ننشئ توزيعاً وهمياً قبل قراءة فهرس الكتاب فعلياً.",
    );
    setPlannerBook(null);
  };

  const addLibraryPdf = async (file) => {
    if (!file) return;
    setLibraryMessage("");
    if (
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      setLibraryMessage("اختر ملف PDF فقط.");
      return;
    }
    const id = Date.now();
    const title = (
      libraryTitle.trim() || file.name.replace(/\.pdf$/i, "")
    ).trim();
    try {
      await savePdfBlob(id, file);
      setLibraryBooks((x) => [
        {
          id,
          title,
          grade,
          subject,
          branch: isGeneralScience ? sciencePrepSubject : null,
          fileName: file.name,
          size: file.size,
          addedAt: new Date().toISOString(),
        },
        ...x,
      ]);
      setLibraryTitle("");
      setLibraryMessage("تم حفظ الكتاب في مكتبتك بنجاح.");
    } catch {
      setLibraryMessage("تعذر حفظ ملف PDF على هذا الجهاز. حاول مرة أخرى.");
    }
  };
  const openLibraryBook = async (bookItem) => {
    setLibraryMessage("");
    try {
      const blob = await getPdfBlob(bookItem.id);
      if (!blob) {
        setLibraryMessage("ملف PDF غير موجود على هذا الجهاز. أعد إضافته.");
        return;
      }
      const url = URL.createObjectURL(blob);
      const w = window.open(url, "_blank");
      if (!w)
        setLibraryMessage(
          "تم العثور على الملف، لكن تعذر فتح نافذة العرض على الجهاز.",
        );
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      setLibraryMessage("تعذر فتح الكتاب.");
    }
  };
  const editLibraryBook = (bookItem) => {
    const title = prompt("اسم الكتاب", bookItem.title);
    if (!title?.trim()) return;
    const nextGrade = prompt("الصف", bookItem.grade);
    if (!nextGrade?.trim()) return;
    const nextSubject = prompt("المادة", bookItem.subject);
    if (!nextSubject?.trim()) return;
    const nextBranch =
      nextSubject.trim() === "العلوم العامة" &&
      GENERAL_SCIENCE_GRADES.includes(nextGrade.trim())
        ? prompt(
            "مادة التحضير: علم الأحياء والأرض أو الفيزياء أو الكيمياء",
            bookItem.branch || "علم الأحياء والأرض",
          )
        : null;
    if (nextSubject.trim() === "العلوم العامة" && !nextBranch?.trim()) return;
    setLibraryBooks((x) =>
      x.map((b) =>
        b.id === bookItem.id
          ? {
              ...b,
              title: title.trim(),
              grade: nextGrade.trim(),
              subject: nextSubject.trim(),
              branch: nextBranch?.trim() || null,
            }
          : b,
      ),
    );
  };
  const removeLibraryBook = async (bookItem) => {
    if (!confirm(`حذف الكتاب: ${bookItem.title}؟`)) return;
    try {
      await deletePdfBlob(bookItem.id);
    } catch {}
    setLibraryBooks((x) => x.filter((b) => b.id !== bookItem.id));
    setLibraryMessage("تم حذف الكتاب.");
  };

  const generateCurriculumPlan = async () => {
    if (!plannerBook) {
      setAiError("اختر كتاباً من مكتبتك أولاً.");
      return;
    }
    if (
      Number(bookStartPage) < 1 ||
      Number(bookEndPage) < Number(bookStartPage)
    ) {
      setAiError(
        "تحقق من أرقام الصفحات: صفحة النهاية يجب أن تكون مساوية أو أكبر من صفحة البداية.",
      );
      return;
    }
    if (!plannerStart || !plannerEnd) {
      setLibraryMessage("حدد بداية ونهاية الفصل أولاً.");
      return;
    }
    setPlannerGenerating(true);
    setLibraryMessage("جاري قراءة فهرس الكتاب وبناء الخطة...");
    try {
      const extracted = await extractPdfText(
        plannerBook.id,
        plannerTocStart,
        plannerTocEnd,
      );
      if (!extracted?.text?.trim())
        throw new Error(
          "لم يظهر نص قابل للقراءة في صفحات الفهرس المحددة. جرّب صفحات أخرى أو نسخة PDF نصية.",
        );
      const endpoint = (
        import.meta.env.VITE_AI_API_URL ||
        "https://moallem-ai.liondangerous65.workers.dev/api/ai"
      ).trim();
      const promptText = `أنت مخطط منهاج للمدرس وفق الكتاب المدرسي السوري المرفق نصه أدناه.
ممنوع اختراع أسماء وحدات أو دروس غير موجودة في النص.${extracted.truncated ? " تنبيه: تم اختصار النص المرجعي عند حد حجم الطلب؛ صرّح بذلك ولا تستنتج من الصفحات التي لم يصل نصها." : ""}

الصف: ${plannerBook.grade}
المادة: ${plannerBook.subject}
${plannerBook.branch ? `الفرع: ${plannerBook.branch}` : ""}
الكتاب: ${plannerBook.title}
بداية الفصل: ${plannerStart}
نهاية الفصل: ${plannerEnd}
عدد الحصص أسبوعياً: ${Number(plannerPeriods) || 1}
العطل والتوقفات: ${plannerHolidays.trim() || "لا توجد عطل محددة"}

المطلوب:
1) استخرج الوحدات والدروس والتسلسل وعدد الحصص المذكور في الفهرس إن وجد.
2) أنشئ خطة فصلية موزعة على أسابيع الفصل.
3) اشتق منها خطة شهرية واضحة.
4) اشتق منها خطة أسبوعية، مع رقم الأسبوع والدروس/الحصص.
5) أضف احتياطاً للمراجعة والتقويم دون تجاوز عدد الحصص المتاح.
6) إذا كانت بيانات الفهرس ناقصة فاذكر ما ينقص صراحة ولا تخترع.

نص صفحات الفهرس من الكتاب:
----------------
${extracted.text}
----------------`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 90000);
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: promptText,
          context: {
            grade: plannerBook.grade,
            section,
            subject: plannerBook.subject,
          },
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      const data = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(data?.error || `خطأ من الخادم (${response.status})`);
      const text = data?.text || data?.answer || data?.result;
      if (!text) throw new Error("لم يرجع الذكاء خطة صالحة.");
      const plan = {
        id: Date.now(),
        bookId: plannerBook.id,
        bookTitle: plannerBook.title,
        grade: plannerBook.grade,
        subject: plannerBook.subject,
        branch: plannerBook.branch || "",
        start: plannerStart,
        end: plannerEnd,
        periods: Number(plannerPeriods) || 1,
        holidays: plannerHolidays.trim(),
        tocPages: `${extracted.startPage}-${extracted.endPage}`,
        content: String(text),
        createdAt: new Date().toISOString(),
      };
      setSavedPlans((x) => [
        plan,
        ...x.filter((v) => v.bookId !== plannerBook.id),
      ]);
      setLibraryMessage(
        "تم إنشاء الخطة الفصلية والشهرية والأسبوعية من فهرس الكتاب.",
      );
    } catch (err) {
      setLibraryMessage(
        err?.name === "AbortError"
          ? "انتهت مهلة إنشاء الخطة. حاول مجدداً."
          : err?.message || "تعذر إنشاء الخطة.",
      );
    } finally {
      setPlannerGenerating(false);
    }
  };
  const printCurriculumPlan = (plan) =>
    printDocument(
      `خطة ${plan.bookTitle}`,
      `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>body{font-family:Arial;padding:28px;line-height:1.9;color:#173653}h1{color:#1c3f66;text-align:center}.meta{background:#f5f7fa;padding:12px;border-radius:10px}pre{white-space:pre-wrap;font-family:Arial}</style></head><body><h1>الخطة التعليمية</h1><div class="meta">${plan.grade} · ${plan.subject}${plan.branch ? ` · ${plan.branch}` : ""}<br>${plan.start} — ${plan.end} · ${plan.periods} حصص أسبوعياً</div><pre>${plan.content.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre></body></html>`,
    );
  const prepareLessonFromBook = async () => {
    if (!plannerBook) {
      setAiError("اختر كتاباً من مكتبتك أولاً.");
      return;
    }
    if (
      Number(bookStartPage) < 1 ||
      Number(bookEndPage) < Number(bookStartPage)
    ) {
      setAiError(
        "تحقق من أرقام الصفحات: صفحة النهاية يجب أن تكون مساوية أو أكبر من صفحة البداية.",
      );
      return;
    }
    setAiLoading(true);
    setAiError("");
    setLibraryMessage("جاري قراءة صفحات الكتاب...");
    let extractedTextForFallback = "";
    let aiTimeout;
    try {
      const extracted = await extractPdfText(
        plannerBook.id,
        bookStartPage,
        bookEndPage,
      );
      if (!extracted?.text?.trim())
        throw new Error(
          "لم يتم العثور على نص قابل للقراءة في الصفحات المحددة.",
        );
      extractedTextForFallback = extracted.text;
      const lessonName = bookLessonTitle.trim() || "الدرس المحدد";
      const promptText = `أنشئ تحضير درس عربيًا عمليًا بعناوين واضحة قابلة للتعديل. لا تدّعِ أن ترتيب العناوين أو القالب معتمد رسميًا؛ لم يُتحقق من نموذج وزاري منشور. اعتمد حصراً على نص الكتاب المرجعي المرفق، وافصل مادة ${preparationSubject} عن فروع العلوم الأخرى. لا تخترع معلومة أو تجربة؛ اذكر بوضوح ما لا يدعمه النص. بيانات الدرس: الصف ${plannerBook.grade}، الشعبة ${section}، المادة ${preparationSubject}، العنوان ${lessonName}، التاريخ ${lessonDate}، الصفحات ${extracted.startPage}-${extracted.endPage}.`;
      const endpoint = (
        import.meta.env.VITE_AI_API_URL ||
        "https://moallem-ai.liondangerous65.workers.dev/api/ai"
      ).trim();
      const controller = new AbortController();
      aiTimeout = setTimeout(() => controller.abort(), 150000);
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: promptText,
          referenceText: extracted.text,
          context: {
            grade: plannerBook.grade,
            section,
            subject: preparationSubject,
            bookId: plannerBook.id,
            bookTitle: plannerBook.title,
            bookFileName: plannerBook.fileName || plannerBook.title,
            librarySubject: plannerBook.subject || "",
            libraryBranch: plannerBook.branch || "",
            lessonTitle: lessonName,
            lessonDate,
            pageStart: extracted.startPage,
            pageEnd: extracted.endPage,
            totalPages: extracted.pageCount,
            task: "lesson_preparation",
            referenceTruncated: extracted.truncated,
          },
        }),
        signal: controller.signal,
      });
      const raw = await response.text();
      let data = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = { text: raw };
      }
      if (!response.ok) {
        const detail = [data?.message || data?.code, Number.isFinite(data?.durationMs) ? `زمن الخادم ${Math.round(data.durationMs / 1000)} ثانية` : ""].filter(Boolean).join(" · ");
        throw new Error(
          `${data?.error || `خطأ من الخادم (${response.status})`}${detail ? ` — ${detail}` : ""}`,
        );
      }
      const text = extractAiText(data);
      if (!text) {
        const keys = data && typeof data === "object" ? Object.keys(data).join(", ") : "";
        throw new Error(
          `وصل رد من خدمة الذكاء بدون نص صالح${keys ? ` (الحقول: ${keys})` : ""}.`,
        );
      }
      setAiResult(String(text));
      setAiPrompt(`تحضير من كتاب ${plannerBook.title} — ${lessonName}`);
      setLibraryMessage(
        `تم تحضير ${lessonName} من الصفحات ${extracted.startPage}-${extracted.endPage} وحُفظ تلقائياً في التحاضير.${extracted.truncated ? " تنبيه: اختُصر نص المصدر عند 18,000 محرف." : ""}${data?.durationMs ? ` زمن الخدمة: ${Math.round(data.durationMs / 1000)} ث.` : ""}`,
      );
      saveCurrentPreparation(String(text), lessonName);
      setTab("ai");
    } catch (err) {
      const message =
        err?.name === "AbortError"
          ? "انتهت مهلة الاتصال بالذكاء. حاول مجدداً."
          : err?.message || "تعذر تحضير الدرس من الكتاب.";
      if (err?.name === "AbortError" && extractedTextForFallback) {
        const sourceExcerpt = extractedTextForFallback.slice(0, 14000);
        setAiResult(`مسودة من نص الكتاب — لم يكتمل اتصال الذكاء الاصطناعي

الموضوع: ${bookLessonTitle.trim() || "الدرس المحدد"}

التهيئة
تُكتب بعد مراجعة نص الدرس أدناه.

الأهداف التعليمية
تُستخرج من نص الدرس أدناه وتُراجع من المعلم.

سير الدرس
النص المستخرج من الصفحات المحددة:
${sourceExcerpt}

التقويم المرحلي
يُعدّ المعلم أسئلة مرتبطة بالنص أعلاه.

التقويم النهائي
يُحدّد بعد مراجعة الأهداف التعليمية.

الإغلاق والتغذية الراجعة
يُستكمل بعد تنفيذ الدرس.`);
        setAiError("انتهت مهلة خدمة الذكاء. عُرضت مسودة من نص الكتاب فقط، وليست تحضيراً مولّداً بالذكاء. راجعها وعدّلها قبل الحفظ.");
        setLibraryMessage("تعذّر التحضير الذكي، لكن نص الصفحات المستخرج متاح للمراجعة.");
      } else {
        setAiError(message);
        setLibraryMessage(message);
      }
    } finally {
      clearTimeout(aiTimeout);
      setAiLoading(false);
    }
  };
  const saveCurrentPreparation = (content = aiResult, titleOverride = "") => {
    if (!String(content || "").trim()) return;
    const title = (titleOverride || bookLessonTitle || aiPrompt || "تحضير درس").trim();
    const previous = savedPreparations.find(v=>v.id===editingPreparationId) || {};
    const item = {
      ...previous,
      id: editingPreparationId || Date.now(),
      title,
      grade,
      section,
      subject: preparationSubject,
      parentSubject: isGeneralScience ? "العلوم العامة" : subject,
      lessonDate,
      bookId: plannerBook?.id || null,
      bookTitle: plannerBook?.title || "",
      pageStart: bookStartPage,
      pageEnd: bookEndPage,
      content: String(content),
      richContent: aiRichContent || previous.richContent || autoColorHtml(content),
      updatedAt: new Date().toISOString(),
    };
    setSavedPreparations((x) => [item, ...x.filter((v) => v.id !== item.id)]);
    setEditingPreparationId(item.id);
  };
  const openPreparation = (item) => {
    setAiResult(item.content);
    setAiRichContent(item.richContent || "");
    setAiPrompt(item.title);
    setGrade(item.grade || grade);
    setSection(item.section || section);
    setSubject(item.parentSubject || item.subject || subject);
    if (item.parentSubject === "العلوم العامة")
      setSciencePrepSubject(item.subject || "علم الأحياء والأرض");
    setLessonDate(item.lessonDate || new Date().toISOString().slice(0, 10));
    setBookLessonTitle(item.title || "");
    setBookStartPage(item.pageStart || 1);
    setBookEndPage(item.pageEnd || 1);
    setPlannerBook(
      libraryBooks.find((b) => b.id === item.bookId) || null,
    );
    setEditingPreparationId(item.id);
    setTab("ai");
  };
  const resetKnowledgeDraft = () => {
    setKnowledgeDraft({title:"",type:"سؤال",subject,grade,section,content:""});
    setEditingKnowledgeId(null);
    setKnowledgeFormOpen(true);
  };
  const saveKnowledgeItem = () => {
    if (!knowledgeDraft.title.trim() || !knowledgeDraft.content.trim()) {
      alert("أدخل عنواناً ومحتوى قبل الحفظ.");
      return;
    }
    const now = new Date().toISOString();
    if (editingKnowledgeId != null) {
      setKnowledgeBank(items => items.map(item => item.id === editingKnowledgeId ? {...item,...knowledgeDraft,title:knowledgeDraft.title.trim(),content:knowledgeDraft.content.trim(),updatedAt:now} : item));
    } else {
      setKnowledgeBank(items => [{id:`knowledge-${Date.now()}`,...knowledgeDraft,title:knowledgeDraft.title.trim(),content:knowledgeDraft.content.trim(),createdAt:now,updatedAt:now},...items]);
    }
    setKnowledgeFormOpen(false);
    setEditingKnowledgeId(null);
  };
  const editKnowledgeItem = (item) => {
    setKnowledgeDraft({title:item.title || "",type:item.type || "سؤال",subject:item.subject || subject,grade:item.grade || grade,section:item.section || section,content:item.content || ""});
    setEditingKnowledgeId(item.id);
    setKnowledgeFormOpen(true);
  };
  const deleteKnowledgeItem = (id) => {
    if (confirm("حذف هذا العنصر من بنك المعلومات؟")) setKnowledgeBank(items => items.filter(item => item.id !== id));
  };
  const visibleKnowledgeItems = knowledgeBank.filter(item => {
    const query=knowledgeQuery.trim().toLocaleLowerCase();
    const matchesQuery=!query || `${item.title} ${item.content} ${item.subject} ${item.grade}`.toLocaleLowerCase().includes(query);
    return matchesQuery && (knowledgeTypeFilter === "الكل" || item.type === knowledgeTypeFilter);
  });
  const deletePreparation = (id) => {
    if (confirm("حذف هذا التحضير؟")) {
      setSavedPreparations((x) => x.filter((v) => v.id !== id));
      if (editingPreparationId === id) setEditingPreparationId(null);
    }
  };
  const updateCurrentPreparation = (text, html = aiRichContent) => {
    setAiResult(text);
    setAiRichContent(html);
    if (editingPreparationId)
      setSavedPreparations((x) =>
        x.map((v) =>
          v.id === editingPreparationId
            ? { ...v, content: text, richContent: html, updatedAt: new Date().toISOString() }
            : v,
        ),
      );
  };
  // Print one complete A4 lesson sheet, using the attached notebook page as a visual reference.
  // Keep the saved rich HTML intact so automatic and manual text colors carry through to PDF.
  const buildPreparationHtml = (item) => {
    const safe = (value) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    const richContent = sanitizeRichHtml(item.richContent || autoColorHtml(item.content || ""));
    const date = item.lessonDate || "";
    const day = date ? new Intl.DateTimeFormat("ar-SY", { weekday: "long" }).format(new Date(`${date}T12:00:00`)) : "";
    return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>
      @page{size:A4 portrait;margin:7mm}
      *{box-sizing:border-box;print-color-adjust:exact;-webkit-print-color-adjust:exact}
      html,body{margin:0;padding:0;font-family:Arial,Tahoma,sans-serif;color:#111;direction:rtl}
      body{font-size:11px;line-height:1.45}
      .sheet{min-height:282mm;display:flex;flex-direction:column;border:1px solid #888;padding:5mm}
      h1{text-align:center;font-size:17px;line-height:1.25;margin:0 0 3mm;color:#1769aa}
      .school{display:flex;justify-content:space-between;gap:8px;border-bottom:1px solid #777;padding:0 1mm 2mm;margin-bottom:2mm;font-size:10px}
      table{width:100%;border-collapse:collapse;table-layout:fixed}
      td,th{border:1px solid #777;padding:2mm 2.4mm;vertical-align:middle;overflow-wrap:anywhere}
      th{width:15%;background:#f2f0e8;text-align:right;color:#1769aa;font-weight:700}
      td{height:9mm}
      .content-title{margin-top:2mm;padding:1.8mm 2.4mm;background:#f2f0e8;border:1px solid #777;border-bottom:0;color:#1769aa;font-weight:bold}
      .content{flex:1;min-height:170mm;border:1px solid #777;padding:3mm 4mm;line-height:1.75;overflow-wrap:anywhere;background-image:repeating-linear-gradient(to bottom,transparent 0,transparent 8.5mm,#d8d8d8 8.6mm,#d8d8d8 8.75mm);background-position:0 2mm}
      .content p{margin:0 0 1.1em}.content h1,.content h2,.content h3,.content strong{color:inherit}
      .foot{padding-top:2mm;font-size:9px;color:#333}
      .signatures{display:flex;justify-content:space-between;align-items:flex-end;gap:10mm;margin-top:3mm;padding-top:2mm;border-top:1px solid #777;min-height:18mm}
      .signature img{display:block;height:14mm;max-width:42mm;object-fit:contain;margin-top:1mm}
      @media screen{body{background:#e8edf1;padding:12px}.sheet{background:#fff;max-width:210mm;margin:0 auto 12px;box-shadow:0 2px 8px #0002}}
      @media print{.sheet{margin:0;box-shadow:none}}
      </style></head><body><article class="sheet">
      <h1>تحضير الدرس</h1>
      <div class="school"><span>المدرسة: ${safe(schoolSettings.school)}</span><span>مديرية التربية: ${safe(schoolSettings.directorate)}</span><span>العام الدراسي: ${safe(schoolSettings.year)}</span></div>
      <table><tbody>
      <tr><th>المعلم</th><td>${safe(subjectTeachers[item.subject] || schoolSettings.teacher)}</td><th>المدير</th><td>${safe(schoolSettings.principal)}</td></tr>
      <tr><th>الصف</th><td>${safe(item.grade)}</td><th>الشعبة</th><td>${safe(item.section)}</td></tr>
      <tr><th>المادة</th><td>${safe(item.subject)}</td><th>الحصة</th><td>${safe(item.period || "")}</td></tr>
      <tr><th>عنوان الدرس</th><td colspan="3">${safe(item.title)}</td></tr>
      <tr><th>اليوم والتاريخ</th><td colspan="3">${safe(day)}${day && date ? " — " : ""}${safe(date)}</td></tr>
      </tbody></table>
      <div class="content-title">محتوى التحضير</div><div class="content">${richContent}</div>
      <div class="foot">${item.bookTitle ? `المصدر: ${safe(item.bookTitle)}` : ""} ${item.pageStart ? `— الصفحات ${safe(item.pageStart)}–${safe(item.pageEnd)}` : ""}</div>
      <div class="signatures"><div class="signature"><b>توقيع المعلم:</b>${schoolSettings.signature ? `<img alt="توقيع المعلم" src="${safe(schoolSettings.signature)}">` : " ........................................"}</div><div><b>توقيع المدير:</b> ........................................</div></div>
      </article></body></html>`;
  };
  const printPreparation = (item) =>
    printDocument(item.title, buildPreparationHtml(item));
  const aiRun = async () => {
    const promptText = aiPrompt.trim();
    if (!promptText) return;
    setAiError("");
    if (!online) {
      setAiResult(
        `وضع بدون إنترنت\n\nخطة محلية سريعة لطلبك: ${promptText}\n• حدد هدف الدرس\n• اكتب 3 أفكار أساسية\n• اختر نشاطاً صفياً\n• ضع 3 أسئلة تقويم\n• اختم بواجب أو مراجعة`,
      );
      return;
    }
    setAiLoading(true);
    setAiResult("");
    try {
      const endpoint = (
        import.meta.env.VITE_AI_API_URL ||
        "https://moallem-ai.liondangerous65.workers.dev/api/ai"
      ).trim();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 90000);
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: promptText,
          context: { grade, section, subject },
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      const data = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(data?.error || `تعذر تنفيذ الطلب (${response.status})`);
      const text = data?.text || data?.answer || data?.result;
      if (!text) throw new Error("لم يُرجع الخادم إجابة صالحة.");
      setAiResult(String(text));
    } catch (err) {
      setAiError(
        err?.name === "AbortError"
          ? "انتهت مهلة الاتصال بالخادم. حاول مجددًا."
          : err?.message || "تعذر الاتصال بخادم الذكاء الاصطناعي.",
      );
    } finally {
      setAiLoading(false);
    }
  };
  const buildGradebookHtml = () => {
    const heads = book.columns
      .map((c) => `<th>${c.name}<br><small>/${c.max}</small></th>`)
      .join("");
    const rows = classStudents
      .map((s, i) => {
        const c = calc(s);
        return `<tr><td>${i + 1}</td><td>${s.name}</td>${book.columns.map((col) => `<td>${book.marks[s.id]?.[col.id] ?? ""}</td>`).join("")}<td>${c.got}/${c.max}</td><td>${c.pct}%</td></tr>`;
      })
      .join("");
    return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>body{font-family:Arial;padding:24px}h1,h2{text-align:center}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #333;padding:7px;text-align:center}</style></head><body><h1>دفتر العلامات</h1><h2>${grade} — الشعبة ${section}</h2><p>المادة: ${subject}</p><table><tr><th>#</th><th>اسم الطالب</th>${heads}<th>المجموع</th><th>النسبة</th></tr>${rows}</table></body></html>`;
  };
  const buildReportCardsHtml = () => {
    const cards = classStudents
      .map((s) => {
        const c = calc(s);
        const scienceDetails = isGeneralScience
          ? `<table style="width:100%;border-collapse:collapse;margin:14px 0"><tr>${scienceTotalColumns.map((col) => `<th style="border:1px solid #aaa;padding:7px">${col.name}</th>`).join("")}</tr><tr>${scienceTotalColumns.map((col) => `<td style="border:1px solid #aaa;padding:7px;text-align:center">${book.marks[s.id]?.[col.id] ?? "—"}/${col.max}</td>`).join("")}</tr></table>`
          : "";
        return `<section style="page-break-after:always;border:2px solid #1c3f66;padding:24px"><h2>جلاء مدرسي</h2><p><b>الطالب:</b> ${s.name}</p><p><b>الصف:</b> ${grade} — <b>الشعبة:</b> ${section}</p><p><b>المادة:</b> ${subject}</p>${scienceDetails}<h3>المجموع: ${c.got}/${c.max} — النسبة: ${c.pct}%</h3><p><b>ملاحظات:</b> ______________________________</p></section>`;
      })
      .join("");
    return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>body{font-family:Arial;margin:0;padding:16px}</style></head><body>${cards}</body></html>`;
  };
  const printDocument = async (name, html) => {
    try {
      await Printer.printHtml({ name, html });
    } catch (err) {
      const w = open("", "_blank");
      if (!w) {
        alert("تعذر تنفيذ الطباعة.");
        return;
      }
      w.document.write(html + "<script>onload=()=>print()</script>");
      w.document.close();
    }
  };
  const printGradebook = () =>
    printDocument("دفتر العلامات", buildGradebookHtml());
  const printReportCards = () =>
    printDocument("جلاء مدرسي", buildReportCardsHtml());
  const previewStudents = classStudents.map((s) => ({
    student: s,
    ...calc(s),
  }));
  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <img src={moallemIcon} />
          <div>
            <h1>معلّم</h1>
            <p>دفترك الرقمي اليومي</p>
          </div>
        </div>
        <div className={`net ${online ? "on" : "off"}`}>
          {online ? <Wifi size={16} /> : <WifiOff size={16} />}{" "}
          {online ? "متصل" : "بدون إنترنت"}
        </div>
      </header>
      {!reportPreview && (
        <div className="classbar">
          <select value={grade} onChange={(e) => setGrade(e.target.value)}>
            {grades.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
          <select value={section} onChange={(e) => setSection(e.target.value)}>
            {sections.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
          <select value={subject} onChange={(e) => setSubject(e.target.value)}>
            {availableSubjects.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </div>
      )}
      <main>
        {reportPreview ? (
          <section className="preview-page">
            <div className="preview-toolbar">
              <button
                className="back-button"
                onClick={() => setReportPreview(false)}
              >
                <ChevronRight size={20} /> رجوع
              </button>
              <div>
                <span className="eyebrow">معاينة الجلاء</span>
                <h2>
                  {grade} — الشعبة {section}
                </h2>
                <p>{subject}</p>
              </div>
              <button
                className="primary print-preview"
                onClick={printReportCards}
              >
                <PrinterIcon size={17} /> طباعة
              </button>
            </div>
            <div className="preview-list">
              {previewStudents.length ? (
                previewStudents.map(({ student, got, max, pct }) => (
                  <article className="student-report-preview" key={student.id}>
                    <div className="report-badge">
                      <GraduationCap size={22} />
                    </div>
                    <div>
                      <small>جلاء مدرسي</small>
                      <h3>{student.name}</h3>
                      <p>
                        {grade} — الشعبة {section} · {subject}
                      </p>
                    </div>
                    <div className="report-score">
                      <strong>
                        {got}/{max}
                      </strong>
                      <span>{pct}%</span>
                    </div>
                  </article>
                ))
              ) : (
                <div className="empty-state">
                  لا يوجد طلاب في الشعبة الحالية.
                </div>
              )}
            </div>
            <p className="note">
              زر الرجوع داخل الواجهة وزر Back في Android يعيدانك إلى شاشة
              التقارير مع بقاء الصف والشعبة والمادة والبيانات كما هي.
            </p>
          </section>
        ) : (
          <>
            {tab === "home" && (
              <div className="stack">
                <section className="hero">
                  <div>
                    <span className="eyebrow">معلّم V2.5</span>
                    <h2>
                      {grade} — الشعبة {section}
                    </h2>
                    <p>{subject} · مساحة يومية واضحة لإدارة الصف بسرعة.</p>
                  </div>
                  <img src={moallemIcon} alt="شعار معلّم" />
                </section>
                <section className="summary-grid">
                  <div className="summary-card">
                    <span className="summary-icon blue">
                      <Layers3 />
                    </span>
                    <div>
                      <small>الصفوف</small>
                      <strong>{grades.length}</strong>
                    </div>
                  </div>
                  <div className="summary-card">
                    <span className="summary-icon green">
                      <Users />
                    </span>
                    <div>
                      <small>الطلاب</small>
                      <strong>{students.length}</strong>
                    </div>
                  </div>
                  <div className="summary-card">
                    <span className="summary-icon amber">
                      <BookOpen />
                    </span>
                    <div>
                      <small>المواد</small>
                      <strong>{subjects.length}</strong>
                    </div>
                  </div>
                </section>
                <div className="section-title">
                  <div>
                    <span className="eyebrow">اختصارات</span>
                    <h3>أدواتك اليومية</h3>
                  </div>
                  <Clock3 size={20} />
                </div>
                <div className="grid4">
                  <Tile
                    tone="blue"
                    icon={<Users />}
                    title="الطلاب"
                    text={`${classStudents.length} طالب`}
                    onClick={() => setTab("students")}
                  />
                  <Tile
                    tone="cyan"
                    icon={<TableProperties />}
                    title="دفتر العلامات"
                    text="مرن وقابل للتعديل"
                    onClick={() => setTab("gradebook")}
                  />
                  <Tile
                    tone="green"
                    icon={<ClipboardList />}
                    title="الحضور"
                    text="حسب الصف والشعبة"
                    onClick={() => setTab("attendance")}
                  />
                  <Tile
                    tone="violet"
                    icon={<FileText />}
                    title="الجلاء والطباعة"
                    text="جاهز للطباعة"
                    onClick={() => setTab("reports")}
                  />
                  <Tile
                    tone="cyan"
                    icon={<Library />}
                    title="مكتبتي"
                    text={`${libraryBooks.length} كتاب PDF`}
                    onClick={() => setTab("library")}
                  />
                  <Tile
                    tone="blue"
                    icon={<CalendarDays />}
                    title="البرنامج الأسبوعي"
                    text="الأحد إلى الخميس"
                    onClick={() => setTab("schedule")}
                  />
                  <Tile
                    tone="violet"
                    icon={<Library />}
                    title="بنك المعلومات"
                    text={`${knowledgeBank.length} سؤال ومذكرة وامتحان`}
                    onClick={() => setTab("knowledge")}
                  />
                </div>
                <section className="home-widget-card" dir="rtl">
                  <div className="home-widget-top">
                    <strong>دفتر المعلّم</strong>
                    <span>✓ اليوم</span>
                  </div>
                  <h3>{dailyWidgetStatus.status}</h3>
                  <p>{dailyWidgetStatus.dayLabel}</p>
                  <div className="home-widget-footer">
                    <small>ويدجت لمتابعة حصص اليوم من الشاشة الرئيسية</small>
                    <button className="primary" type="button" onClick={requestHomeWidget}>
                      <Plus size={16} /> إضافة ويدجت
                    </button>
                  </div>
                  {widgetMessage && <p className="note" role="status">{widgetMessage}</p>}
                </section>
                <section className="ai-card">
                  <div>
                    <span className="ai-icon">
                      <Sparkles />
                    </span>
                    <div>
                      <strong>المساعد الذكي</strong>
                      <span>
                        {online
                          ? "متصل وجاهز لتحضير الدروس"
                          : "وضع Offline فعال"}
                      </span>
                    </div>
                  </div>
                  <button onClick={() => setTab("ai")}>فتح المساعد</button>
                </section>
              </div>
            )}
            {tab === "knowledge" && (
              <section className="panel knowledge-panel" dir="rtl">
                <div className="panelhead">
                  <div><span className="eyebrow">مكتبة الصف والمادة</span><h2>بنك المعلومات</h2><p>احفظ الأسئلة والمذكرات والامتحانات وابحث فيها حسب العنوان أو المحتوى.</p></div>
                  {!knowledgeFormOpen && <button className="primary" onClick={resetKnowledgeDraft}><Plus size={16}/> إضافة إلى البنك</button>}
                </div>
                {knowledgeFormOpen && <div className="knowledge-form">
                  <div className="knowledge-fields">
                    <label>نوع المحتوى<select value={knowledgeDraft.type} onChange={e=>setKnowledgeDraft(d=>({...d,type:e.target.value}))}>{["سؤال","مذكرة","امتحان"].map(type=><option key={type}>{type}</option>)}</select></label>
                    <label>المادة<select value={knowledgeDraft.subject} onChange={e=>setKnowledgeDraft(d=>({...d,subject:e.target.value}))}>{subjects.map(value=><option key={value}>{value}</option>)}</select></label>
                    <label>الصف<select value={knowledgeDraft.grade} onChange={e=>setKnowledgeDraft(d=>({...d,grade:e.target.value}))}>{grades.map(value=><option key={value}>{value}</option>)}</select></label>
                    <label>الشعبة<select value={knowledgeDraft.section} onChange={e=>setKnowledgeDraft(d=>({...d,section:e.target.value}))}>{sections.map(value=><option key={value}>{value}</option>)}</select></label>
                    <label className="knowledge-title">العنوان<input value={knowledgeDraft.title} onChange={e=>setKnowledgeDraft(d=>({...d,title:e.target.value}))} placeholder="مثال: أسئلة الوحدة الأولى"/></label>
                    <label className="knowledge-content">المحتوى<textarea value={knowledgeDraft.content} onChange={e=>setKnowledgeDraft(d=>({...d,content:e.target.value}))} placeholder="اكتب السؤال أو المذكرة أو محتوى الامتحان..."/></label>
                  </div>
                  <div className="actions"><button className="primary" onClick={saveKnowledgeItem}><Save size={16}/> حفظ</button><button onClick={()=>{setKnowledgeFormOpen(false);setEditingKnowledgeId(null);}}>إلغاء</button></div>
                </div>}
                <div className="knowledge-filters">
                  <label className="search"><Search size={17}/><input value={knowledgeQuery} onChange={e=>setKnowledgeQuery(e.target.value)} placeholder="ابحث في الأسئلة والمذكرات والامتحانات..."/></label>
                  <select aria-label="تصفية نوع بنك المعلومات" value={knowledgeTypeFilter} onChange={e=>setKnowledgeTypeFilter(e.target.value)}>{["الكل","سؤال","مذكرة","امتحان"].map(type=><option key={type}>{type}</option>)}</select>
                </div>
                {visibleKnowledgeItems.length === 0 ? <div className="empty-state">لا توجد عناصر مطابقة. أضف سؤالاً أو مذكرة أو امتحاناً ليظهر هنا.</div> : <div className="knowledge-list">{visibleKnowledgeItems.map(item=><article className="knowledge-item" key={item.id}>
                  <div className="knowledge-item-head"><div><span className={`knowledge-badge ${item.type === "امتحان" ? "exam" : item.type === "مذكرة" ? "note" : "question"}`}>{item.type || "سؤال"}</span><h3>{item.title}</h3><small>{item.subject || "—"} · {item.grade || "—"} · الشعبة {item.section || "—"}</small></div><div className="actions"><button onClick={()=>editKnowledgeItem(item)}><Edit3 size={15}/> تعديل</button><button className="danger" aria-label="حذف العنصر" onClick={()=>deleteKnowledgeItem(item.id)}><Trash2 size={15}/></button></div></div>
                  <p className="knowledge-item-content">{item.content}</p>
                </article>)}</div>}
              </section>
            )}
            {tab === "schedule" && (
              <section className="panel weekly-panel">
                <div className="panelhead">
                  <div>
                    <span className="eyebrow">دفتر التحضير الرسمي 2026–2027</span>
                    <h2>البرنامج الأسبوعي</h2>
                    <p>خمسة أيام وسبع حصص لكل يوم. التعديل يُحفظ تلقائياً على جهازك.</p>
                  </div>
                  <button className="primary" onClick={printWeeklySchedule}><PrinterIcon size={16} /> طباعة / PDF</button>
                </div>
                <label className="schedule-date-label">يعمل بهذا البرنامج اعتباراً من:
                  <input type="date" value={scheduleEffectiveDate} onChange={(e) => setScheduleEffectiveDate(e.target.value)} />
                </label>
                <div className="official-schedule-scroll">
                  <table className="official-schedule" dir="rtl">
                    <thead><tr><th>اليوم</th>{Array.from({length:7},(_,i)=><th key={i}>الدرس {i+1}</th>)}</tr></thead>
                    <tbody>{WEEK_DAYS.map(day=><tr key={day}>
                      <th>{day}</th>
                      {Array.from({length:7},(_,i)=><td key={i}><textarea
                        aria-label={`${day} - الدرس ${i+1}`}
                        value={scheduleCellText(day,i)}
                        onChange={e=>setScheduleCell(day,i,e.target.value)}
                        rows={3}
                      /></td>)}
                    </tr>)}</tbody>
                  </table>
                </div>
                <p className="note">الخانات القديمة تظهر تلقائياً؛ تعديل أي خانة يحفظ نصها الجديد دون حذف بيانات بقية الحصص.</p>
                <div className="official-schedule-footer"><span>ملاحظات: ................................</span><span>اسم المدرس وتوقيعه: ................................</span></div>
              </section>
            )}
            {tab === "students" && (
              <section className="panel">
                <div className="panelhead">
                  <div>
                    <span className="eyebrow">إدارة الطلاب</span>
                    <h2>
                      {grade} — الشعبة {section}
                    </h2>
                  </div>
                  <div className="actions">
                    <button onClick={sortArabic}>
                      <ArrowUpDown size={17} /> ترتيب أبجدي
                    </button>
                    <button type="button" onClick={() => { setBulkNamesOpen((open) => !open); setBulkNamesMessage(""); }}>
                      <Upload size={17} /> إضافة جماعية
                    </button>
                    <button className="primary" onClick={addStudent}>
                      <UserPlus size={17} /> إضافة طالب
                    </button>
                  </div>
                </div>
                <div className="search">
                  <Search size={17} />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="ابحث عن طالب..."
                  />
                </div>
                {bulkNamesOpen && (
                  <div className="bulk-students-box">
                    <div className="bulk-students-head">
                      <div>
                        <strong>إضافة مجموعة أسماء</strong>
                        <small>ستُضاف الأسماء إلى {grade} — الشعبة {section}</small>
                      </div>
                      <label className="bulk-file-button">
                        <FileText size={16} /> تحميل CSV أو TXT
                        <input type="file" accept=".csv,.txt,text/csv,text/plain" onChange={(event) => { loadStudentNamesFile(event.target.files?.[0]); event.target.value = ""; }} />
                      </label>
                    </div>
                    <textarea
                      className="bulk-students-input"
                      value={bulkNamesText}
                      onChange={(event) => { setBulkNamesText(event.target.value); setBulkNamesMessage(""); }}
                      placeholder="الصق الأسماء هنا، اسمًا في كل سطر. يمكنك نسخ عمود الأسماء مباشرة من Excel أو Google Sheets."
                      rows={5}
                      dir="auto"
                    />
                    <div className="bulk-students-meta">
                      <span>الأسماء المكتشفة: <strong>{bulkNameList.length}</strong></span>
                      {bulkDuplicateCount > 0 && <span className="duplicate-hint">أسماء متكررة: {bulkDuplicateCount} — ستُضاف كطلاب منفصلين بعد التأكيد.</span>}
                    </div>
                    {bulkNamesMessage && <p className="bulk-message" role="status">{bulkNamesMessage}</p>}
                    <div className="actions">
                      <button className="primary" type="button" onClick={addStudentsFromList} disabled={!bulkNameList.length}>
                        إضافة {bulkNameList.length} اسمًا
                      </button>
                      <button type="button" onClick={() => { setBulkNamesOpen(false); setBulkNamesMessage(""); }}>إغلاق</button>
                    </div>
                  </div>
                )}
                <div className="studentlist">
                  {visibleStudents.map((s, i) => (
                    <div className="studentrow" key={s.id}>
                      <span className="num">{i + 1}</span>
                      <input
                        value={s.name}
                        onChange={(e) => renameStudent(s.id, e.target.value)}
                      />
                      <select
                        value={s.grade}
                        onChange={(e) =>
                          setStudents((x) =>
                            x.map((v) =>
                              v.id === s.id
                                ? { ...v, grade: e.target.value }
                                : v,
                            ),
                          )
                        }
                      >
                        {grades.map((g) => (
                          <option key={g}>{g}</option>
                        ))}
                      </select>
                      <select
                        value={s.section}
                        onChange={(e) =>
                          setStudents((x) =>
                            x.map((v) =>
                              v.id === s.id
                                ? { ...v, section: e.target.value }
                                : v,
                            ),
                          )
                        }
                      >
                        {sections.map((g) => (
                          <option key={g}>{g}</option>
                        ))}
                      </select>
                      <button
                        className="danger"
                        onClick={() => deleteStudent(s.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}
            {tab === "gradebook" && (
              <section className="panel">
                <div className="panelhead">
                  <div>
                    <span className="eyebrow">دفتر العلامات</span>
                    <h2>{subject}</h2>
                    <p>
                      {grade} — الشعبة {section}
                    </p>
                    {isGeneralScience && (
                      <div className="science-scale">
                        {GENERAL_SCIENCE_BRANCHES.map((b) => (
                          <span key={b.id}>
                            {b.name} <b>{b.max}</b>
                          </span>
                        ))}
                        <strong>المجموع {GENERAL_SCIENCE_TOTAL}</strong>
                      </div>
                    )}
                  </div>
                  <div className="actions">
                    <button onClick={() => setEditMode((v) => !v)}>
                      {editMode ? <Save size={17} /> : <Edit3 size={17} />}{" "}
                      {editMode ? "حفظ" : "تعديل"}
                    </button>
                    <button className="primary" onClick={printGradebook}>
                      <PrinterIcon size={17} /> طباعة
                    </button>
                  </div>
                </div>
                {editMode && (
                  <div className="column-tools">
                    {officialGradeMaximum(grade, subject) != null && (
                      <button type="button" onClick={applyOfficialDistribution}>
                        اعتماد توزيع 2025–2026 ({officialGradeMaximum(grade, subject)})
                      </button>
                    )}
                    {split200 && !finalExamColumn && <button type="button" onClick={ensureFinalExam}>إضافة الامتحان الأخير وحساب المعدّل</button>}
                    <button onClick={addColumn}>
                      <Plus size={16} /> إضافة عمود
                    </button>
                    <span>اسم البند والعلامة العظمى قابلان للتعديل.</span>
                  </div>
                )}
                <div className="tablewrap">
                  <table className="gradebook">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th className="namecol">الطالب</th>
                        {book.columns.map((c) => (
                          <th key={c.id}>
                            {editMode ? (
                              <div className="coledit">
                                <input
                                  value={c.name}
                                  onChange={(e) =>
                                    updateColumn(c.id, { name: e.target.value })
                                  }
                                />
                                <input
                                  type="number"
                                  value={c.max}
                                  onChange={(e) =>
                                    updateColumn(c.id, {
                                      max: Number(e.target.value) || 0,
                                    })
                                  }
                                />
                                <button onClick={() => deleteColumn(c.id)}>
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ) : (
                              <>
                                {c.name}
                                <small>/{c.max}</small>
                              </>
                            )}
                          </th>
                        ))}
                        {split200 && finalExamColumn && <th>درجة الأعمال /{officialMax}</th>}
                        <th>{split200 && finalExamColumn ? "العلامة النهائية /{officialMax}" : "المجموع"}</th>
                        <th>النسبة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classStudents.map((s, i) => {
                        const c = calc(s);
                        return (
                          <tr key={s.id}>
                            <td>{i + 1}</td>
                            <td className="namecol">{s.name}</td>
                            {book.columns.map((col) => (
                              <td key={col.id}>
                                <input
                                  className="mark"
                                  type="number"
                                  value={book.marks[s.id]?.[col.id] ?? ""}
                                  onChange={(e) =>
                                    setMark(s.id, col.id, e.target.value)
                                  }
                                  placeholder="—"
                                />
                              </td>
                            ))}
                            {c.split && <td><b>{c.works}/{officialMax}</b></td>}
                            <td>
                              <b>
                                {c.final == null && c.split ? "بانتظار الامتحان" : `${c.got}/${c.max}`}
                              </b>
                            </td>
                            <td>
                              <b>{c.pct}%</b>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
            {tab === "attendance" && (
              <section className="panel">
                <div className="panelhead">
                  <div>
                    <span className="eyebrow">الحضور والغياب</span>
                    <h2>
                      {grade} — الشعبة {section}
                    </h2>
                  </div>
                </div>
                <div className="studentlist">
                  {classStudents.map((s, i) => {
                    const k = `${grade}|${section}|${s.id}`,
                      st = attendance[k] || "present";
                    return (
                      <div className="attrow" key={s.id}>
                        <span className="num">{i + 1}</span>
                        <strong>{s.name}</strong>
                        <div className="seg">
                          {["present", "absent", "late"].map((v) => (
                            <button
                              key={v}
                              className={st === v ? "active" : ""}
                              onClick={() => setAtt(s.id, v)}
                            >
                              {v === "present"
                                ? "حاضر"
                                : v === "absent"
                                  ? "غائب"
                                  : "متأخر"}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
            {tab === "reports" && (
              <section className="panel">
                <div className="panelhead">
                  <div>
                    <span className="eyebrow">التقارير والجلاء</span>
                    <h2>جاهز للطباعة</h2>
                  </div>
                </div>
                <div className="reportcards">
                  <button className="reportcard" onClick={printGradebook}>
                    <TableProperties />
                    <strong>دفتر العلامات</strong>
                    <span>أسماء الطلاب + البنود + المجاميع والنسب</span>
                    <PrinterIcon />
                  </button>
                  <button
                    className="reportcard"
                    onClick={() => setReportPreview(true)}
                  >
                    <GraduationCap />
                    <strong>جلاء مدرسي</strong>
                    <span>معاينة الجلاء قبل الطباعة</span>
                    <ChevronLeft />
                  </button>
                </div>
                <p className="note">
                  قالب الجلاء الحالي تجريبي، وسيتم توسيعه ليجمع عدة مواد وفترات
                  في صفحة واحدة.
                </p>
              </section>
            )}
            {tab === "library" && (
              <section className="panel library-panel">
                <div className="panelhead">
                  <div>
                    <span className="eyebrow">مكتبتي</span>
                    <h2>كتبك وموادك في مكان واحد</h2>
                    <p>
                      أضف كتب PDF واربط كل كتاب بالصف والمادة والفرع الصحيح.
                    </p>
                    {isGeneralScience && (
                      <div className="science-scale">
                        {GENERAL_SCIENCE_BRANCHES.map((b) => (
                          <span key={b.id}>
                            {b.name} <b>{b.max}</b>
                          </span>
                        ))}
                        <strong>العلوم العامة {GENERAL_SCIENCE_TOTAL}</strong>
                      </div>
                    )}
                  </div>
                </div>
                <div className="library-add">
                  <div className="library-fields">
                    <input
                      value={libraryTitle}
                      onChange={(e) => setLibraryTitle(e.target.value)}
                      placeholder="اسم الكتاب (اختياري)"
                    />
                    <select
                      value={grade}
                      onChange={(e) => setGrade(e.target.value)}
                    >
                      {grades.map((g) => (
                        <option key={g}>{g}</option>
                      ))}
                    </select>
                    <select
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                    >
                      {availableSubjects.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                    {isGeneralScience && (
                      <select
                        value={sciencePrepSubject}
                        onChange={(e) => setSciencePrepSubject(e.target.value)}
                        aria-label="مادة كتاب العلوم"
                      >
                        {GENERAL_SCIENCE_BRANCHES.map((branch) => (
                          <option key={branch.id} value={branch.name}>
                            {branch.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <input
                    ref={pdfInputRef}
                    className="hidden-file"
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      addLibraryPdf(f);
                      e.target.value = "";
                    }}
                  />
                  <button
                    className="primary library-upload"
                    onClick={() => pdfInputRef.current?.click()}
                  >
                    <Upload size={18} /> إضافة كتاب PDF
                  </button>
                </div>
                {libraryMessage && <div className="note">{libraryMessage}</div>}
                <div className="library-list">
                  {libraryBooks.length ? (
                    libraryBooks.map((b) => (
                      <article className="library-book" key={b.id}>
                        <div className="library-cover">
                          <BookOpen size={24} />
                        </div>
                        <div className="library-info">
                          <span>
                            PDF · {b.grade} · {b.subject}
                            {b.branch ? ` · ${b.branch}` : ""}
                          </span>
                          <h3>{b.title}</h3>
                          <small>
                            {b.fileName} ·{" "}
                            {Math.max(
                              1,
                              Math.round(((b.size || 0) / 1024 / 1024) * 10) /
                                10,
                            )}{" "}
                            MB
                          </small>
                        </div>
                        <div className="library-actions">
                          <button onClick={() => openLibraryBook(b)}>
                            <FolderOpen size={16} /> فتح
                          </button>
                          <button onClick={() => editLibraryBook(b)}>
                            <Edit3 size={16} /> تعديل
                          </button>
                          <button
                            onClick={() => {
                              setPlannerBook(b);
                              setLibraryMessage("");
                            }}
                          >
                            <CalendarDays size={16} /> التخطيط
                          </button>
                          <button
                            className="danger"
                            onClick={() => removeLibraryBook(b)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </article>
                    ))
                  ) : (
                    <div className="empty-state">
                      <Library size={28} />
                      <strong>مكتبتك فارغة</strong>
                      <span>أضف أول كتاب PDF للبدء.</span>
                    </div>
                  )}
                </div>
                {plannerBook && (
                  <div className="planner-box">
                    <div className="panelhead">
                      <div>
                        <span className="eyebrow">التخطيط الذكي</span>
                        <h3>{plannerBook.title}</h3>
                        <p>
                          {plannerBook.grade} · {plannerBook.subject}
                          {plannerBook.branch ? ` · ${plannerBook.branch}` : ""}
                        </p>
                      </div>
                      <button onClick={() => setPlannerBook(null)}>
                        إغلاق
                      </button>
                    </div>
                    <div className="planner-fields">
                      <label>
                        بداية الفصل
                        <input
                          type="date"
                          value={plannerStart}
                          onChange={(e) => setPlannerStart(e.target.value)}
                        />
                      </label>
                      <label>
                        نهاية الفصل
                        <input
                          type="date"
                          value={plannerEnd}
                          onChange={(e) => setPlannerEnd(e.target.value)}
                        />
                      </label>
                      <label>
                        الحصص أسبوعياً
                        <input
                          type="number"
                          min="1"
                          max="12"
                          value={plannerPeriods}
                          onChange={(e) => setPlannerPeriods(e.target.value)}
                        />
                      </label>
                      <label>
                        العطل والتوقفات
                        <textarea
                          value={plannerHolidays}
                          onChange={(e) => setPlannerHolidays(e.target.value)}
                          placeholder="مثال: عطلة من 10/10 إلى 12/10"
                        />
                      </label>
                      <label>
                        بداية صفحات الفهرس
                        <input
                          type="number"
                          min="1"
                          value={plannerTocStart}
                          onChange={(e) => setPlannerTocStart(e.target.value)}
                        />
                      </label>
                      <label>
                        نهاية صفحات الفهرس
                        <input
                          type="number"
                          min="1"
                          value={plannerTocEnd}
                          onChange={(e) => setPlannerTocEnd(e.target.value)}
                        />
                      </label>
                    </div>
                    <button
                      className="primary wide"
                      onClick={generateCurriculumPlan}
                      disabled={plannerGenerating}
                    >
                      <CalendarDays size={17} />
                      {plannerGenerating
                        ? "جاري إنشاء الخطة..."
                        : "إنشاء الخطة الفصلية / الشهرية / الأسبوعية"}
                    </button>
                    {savedPlans.find((v) => v.bookId === plannerBook.id)
                      ?.content && (
                      <div className="generated-plan">
                        <textarea
                          value={
                            savedPlans.find((v) => v.bookId === plannerBook.id)
                              .content
                          }
                          onChange={(e) =>
                            setSavedPlans((x) =>
                              x.map((v) =>
                                v.bookId === plannerBook.id
                                  ? { ...v, content: e.target.value }
                                  : v,
                              ),
                            )
                          }
                        />
                        <button
                          onClick={() =>
                            printCurriculumPlan(
                              savedPlans.find(
                                (v) => v.bookId === plannerBook.id,
                              ),
                            )
                          }
                        >
                          <PrinterIcon size={16} /> طباعة / PDF
                        </button>
                      </div>
                    )}
                    <div className="planner-fields book-prep-fields">
                      <label>
                        اسم الدرس
                        <input
                          value={bookLessonTitle}
                          onChange={(e) => setBookLessonTitle(e.target.value)}
                          placeholder="مثال: المجهر"
                        />
                      </label>
                      <label>
                        من صفحة
                        <input
                          type="number"
                          min="1"
                          value={bookStartPage}
                          onChange={(e) => setBookStartPage(e.target.value)}
                        />
                      </label>
                      <label>
                        إلى صفحة
                        <input
                          type="number"
                          min="1"
                          value={bookEndPage}
                          onChange={(e) => setBookEndPage(e.target.value)}
                        />
                      </label>
                      <button
                        className="primary wide"
                        onClick={prepareLessonFromBook}
                        disabled={aiLoading}
                      >
                        <Sparkles size={17} />
                        {aiLoading ? "جاري التحضير..." : "تحضير من الكتاب"}
                      </button>
                    </div>
                    <p className="note">
                      يعتمد التحضير على النص الحقيقي المستخرج من الصفحات المحددة
                      في ملف PDF.
                    </p>
                    <div className="plan-levels">
                      <span>فصلية</span>
                      <ChevronLeft />
                      <span>شهرية</span>
                      <ChevronLeft />
                      <span>أسبوعية</span>
                      <ChevronLeft />
                      <span>تحضير الدرس</span>
                    </div>
                    <button
                      className="primary wide"
                      onClick={savePlannerSettings}
                    >
                      <Save size={17} /> حفظ إعدادات التخطيط
                    </button>
                    <p className="note">
                      حماية من الهلوسة: لن يُنشئ التطبيق أسماء وحدات أو دروس من
                      عنده. إنشاء الخطة يتفعّل بعد استخراج فهرس وصفحات هذا
                      الـPDF فعلياً.
                    </p>
                  </div>
                )}
                <p className="note">
                  الكتب تُحفظ محليًا على هذا الجهاز. التخطيط مرتبط بكل كتاب على
                  حدة ويحافظ على الصف والمادة والفرع.
                </p>
              </section>
            )}
            {tab === "ai" && (
              <section className="panel">
                <div className="panelhead">
                  <div>
                    <span className="eyebrow">التحضير الذكي من الكتاب</span>
                    <h2>حضّر حصرياً من صفحات كتابك</h2>
                    <p>
                      اختر كتاباً محفوظاً في «مكتبتي»، وحدد الصفحات. لن يُنشئ
                      معلّم تحضيراً عاماً من خارج النص المحدد.
                    </p>
                  </div>
                </div>
                <div className="planner-box ai-book-prep">
                  <div className="planner-fields book-prep-fields">
                    {isGeneralScience && (
                      <label>
                        مادة التحضير
                        <select
                          value={sciencePrepSubject}
                          onChange={(e) =>
                            setSciencePrepSubject(e.target.value)
                          }
                        >
                          {GENERAL_SCIENCE_BRANCHES.map((branch) => (
                            <option key={branch.id} value={branch.name}>
                              {branch.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    <label>
                      الكتاب
                      <select
                        value={plannerBook?.id || ""}
                        onChange={(e) => {
                          const b =
                            libraryBooks.find(
                              (x) => String(x.id) === e.target.value,
                            ) || null;
                          setPlannerBook(b);
                          setAiError("");
                          setLibraryMessage("");
                        }}
                      >
                        <option value="">اختر الكتاب</option>
                        {aiBooks.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.title}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      عنوان الدرس/الوحدة
                      <input
                        value={bookLessonTitle}
                        onChange={(e) => setBookLessonTitle(e.target.value)}
                        placeholder="مثال: المجهر"
                      />
                    </label>
                    <label>
                      التاريخ
                      <input
                        type="date"
                        value={lessonDate}
                        onChange={(e) => setLessonDate(e.target.value)}
                      />
                    </label>
                    <label>
                      من صفحة
                      <input
                        type="number"
                        min="1"
                        value={bookStartPage}
                        onChange={(e) => setBookStartPage(e.target.value)}
                      />
                    </label>
                    <label>
                      إلى صفحة
                      <input
                        type="number"
                        min="1"
                        value={bookEndPage}
                        onChange={(e) => setBookEndPage(e.target.value)}
                      />
                    </label>
                  </div>
                  {plannerBook ? (
                    <div className="note">
                      <strong>ملف المصدر:</strong> {plannerBook.fileName || plannerBook.title}
                      <br />
                      <strong>الكتاب:</strong> {plannerBook.title} · {plannerBook.grade}
                      <br />
                      <strong>مادة التحضير:</strong> {preparationSubject} · الصفحات {bookStartPage}–{bookEndPage}
                    </div>
                  ) : (
                    <div className="note">
                      {aiBooks.length
                        ? "اختر الكتاب الذي تريد التحضير منه."
                        : "لا يوجد كتاب محفوظ لهذا الصف. أضفه أولاً من «مكتبتي»."}
                    </div>
                  )}
                  <button
                    className="primary wide"
                    onClick={prepareLessonFromBook}
                    disabled={aiLoading || !plannerBook}
                  >
                    <BookOpen size={17} />
                    {aiLoading
                      ? "جاري قراءة الصفحات والتحضير..."
                      : "تحضير من الصفحات المحددة"}
                  </button>
                  <p className="note">
                    🔒 المصدر حصري: يُستخرج نص الصفحات المحددة من ملف PDF
                    المحفوظ على جهازك، ثم يُبنى نموذج التحضير 2026–2027 اعتماداً
                    عليه فقط.
                  </p>
                </div>
                {aiError && (
                  <div className="note" role="alert">
                    {aiError}
                  </div>
                )}
                {aiResult && (
                  <>
                    <div className="prep-page-toggle"><button type="button" onClick={() => setFullPagePreparation(value => !value)}>{fullPagePreparation ? "تصغير صفحة التحضير" : "عرض التحضير بصفحة كاملة"}</button><span>الألوان محفوظة كما تظهر في الطباعة</span></div>
                    <div className={fullPagePreparation ? "prep-fullpage" : "prep-standard"}>
                      <PreparationEditor key={String(editingPreparationId || "draft")} text={aiResult} initialHtml={aiRichContent || autoColorHtml(aiResult)} onChange={updateCurrentPreparation}/>
                    </div>
                    <div className="actions prep-actions">
                      <button
                        className="primary"
                        onClick={saveCurrentPreparation}
                      >
                        <Save size={16} /> حفظ التحضير
                      </button>
                      <button
                        onClick={() =>
                          printPreparation({
                            title: bookLessonTitle || aiPrompt || "تحضير درس",
                            grade,
                            section,
                            subject: preparationSubject,
                            parentSubject: isGeneralScience
                              ? "العلوم العامة"
                              : subject,
                            lessonDate,
                            bookTitle: plannerBook?.title || "",
                            pageStart: bookStartPage,
                            pageEnd: bookEndPage,
                            content: aiResult,
                            richContent: aiRichContent || autoColorHtml(aiResult),
                          })
                        }
                      >
                        <PrinterIcon size={16} /> طباعة / PDF
                      </button>
                    </div>
                  </>
                )}
                {savedPreparations.length > 0 && (
                  <div className="saved-preps">
                    <div className="section-title">
                      <div>
                        <span className="eyebrow">المحفوظات</span>
                        <h3>تحضيرات محفوظة</h3>
                      </div>
                    </div>
                    {savedPreparations.map((item) => (
                      <article className="saved-prep" key={item.id}>
                        <div>
                          <strong>{item.title}</strong>
                          <span>
                            {item.grade} · {item.subject} · الشعبة{" "}
                            {item.section}
                            {item.lessonDate ? ` · ${item.lessonDate}` : ""}
                            {item.bookTitle ? ` · ${item.bookTitle}` : ""}
                            {item.pageStart
                              ? ` · ص ${item.pageStart}-${item.pageEnd}`
                              : ""}
                          </span>
                        </div>
                        <div className="actions">
                          <button onClick={() => openPreparation(item)}>
                            <FolderOpen size={15} /> فتح
                          </button>
                          <button onClick={() => printPreparation(item)}>
                            <PrinterIcon size={15} /> طباعة
                          </button>
                          <button
                            className="danger"
                            onClick={() => deletePreparation(item.id)}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            )}
            {tab === "settings" && (
              <section className="panel settings-panel" dir="rtl">
                <div className="panelhead"><div><span className="eyebrow">التخصيص</span><h2>الإعدادات</h2><p>بياناتك محفوظة على هذا الجهاز تلقائياً.</p></div></div>
                <details className="settings-section" open><summary>١. بيانات المعلم</summary><label className="setting-field">اسم المعلم<input value={schoolSettings.teacher || ""} onChange={e=>setSchoolSettings(v=>({...v,teacher:e.target.value}))}/></label><label className="setting-field">اسم المدير<input value={schoolSettings.principal || ""} onChange={e=>setSchoolSettings(v=>({...v,principal:e.target.value}))}/></label></details>
                <details className="settings-section"><summary>٢. بيانات المدرسة</summary><label className="setting-field">اسم المدرسة<input value={schoolSettings.school || ""} onChange={e=>setSchoolSettings(v=>({...v,school:e.target.value}))}/></label><label className="setting-field">مديرية التربية<input value={schoolSettings.directorate || ""} onChange={e=>setSchoolSettings(v=>({...v,directorate:e.target.value}))}/></label><label className="setting-field">العام الدراسي<input value={schoolSettings.year || ""} onChange={e=>setSchoolSettings(v=>({...v,year:e.target.value}))}/></label></details>
                <details className="settings-section"><summary>٣. المواد الدراسية والمعلمون</summary><p className="note">لكل مادة دفتر علامات وتحاضير مستقلان. عند إضافة هذه الخيارات تبقى المواد والسجلات القديمة كما هي.</p><Config title="المواد" items={subjects} kind="المادة" add={() => addItem("المادة")} rename={renameItem} remove={removeItem}/><div className="subject-teachers"><h4>معلم المادة</h4>{subjects.map(name=><label className="setting-field" key={name}>{name}<input placeholder={schoolSettings.teacher || "اسم المعلم"} value={subjectTeachers[name] || ""} onChange={e=>setSubjectTeachers(v=>({...v,[name]:e.target.value}))}/></label>)}</div></details>
                <details className="settings-section"><summary>٤. الجدول المدرسي وأوقات الحصص</summary><p className="note">تُضبط هنا أوقات الحصص السبع. تفاصيل توزيع الصفوف والأيام تبقى في صفحة الجدول.</p>{periodSettings.map((times,index)=><div className="period-row" key={index}><strong>الحصة {index+1}</strong><label>من<input type="time" value={times[0]} onChange={e=>setPeriodSettings(p=>p.map((t,i)=>i===index?[e.target.value,t[1]]:t))}/></label><label>إلى<input type="time" value={times[1]} onChange={e=>setPeriodSettings(p=>p.map((t,i)=>i===index?[t[0],e.target.value]:t))}/></label></div>)}</details>
                <details className="settings-section"><summary>٥. التنبيهات الصوتية</summary>{[["enabled","تفعيل التنبيهات"],["start","تنبيه بداية الحصة"],["end","تنبيه نهاية الحصة"]].map(([key,label])=><label className="setting-check" key={key}><input type="checkbox" checked={Boolean(soundSettings[key])} onChange={e=>setSoundSettings(v=>({...v,[key]:e.target.checked}))}/>{label}</label>)}<button type="button" className="primary" onClick={scheduleClassNotifications}><Bell size={16}/> جدولة تنبيهات الأسبوع</button>{notificationMessage && <p className="note" role="status">{notificationMessage}</p>}<p className="note">تُجدول تنبيهات محلية في Android. قد يؤخر وضع توفير الطاقة الإشعار، وقد يتطلب Android 12+ السماح بالتنبيهات الدقيقة.</p></details>
                <details className="settings-section"><summary>٦. إعدادات دفتر التحضير والطباعة</summary><p className="note">الألوان الافتراضية: الأزرق للعناوين، الأحمر للملاحظات والتنبيهات، الأخضر للأهداف والأنشطة، والأسود للنص الأساسي. يمكن تغيير لون نص محدد من شريط المحرر وإعادة اللون التلقائي.</p><p className="note">لم نعثر في ملفات المشروع أو البحث بالمصادر الرسمية على نموذج تحضير وزاري منشور لعام 2026–2027. لذلك أبقينا الطباعة قالبًا عامًا قابلًا للتخصيص، ولم نسمِّه نموذجًا رسميًا.</p></details>
                <details className="settings-section"><summary>٧. توقيع المعلم</summary><SignaturePad value={schoolSettings.signature || ""} onChange={signature=>setSchoolSettings(v=>({...v,signature}))}/><p className="note">ارسم توقيعك بالإصبع. يظهر في طباعة التحضير العام.</p></details>
                <details className="settings-section"><summary>٨. النسخ الاحتياطي والاستعادة</summary><p className="note">تتضمن النسخة بيانات الطلاب والعلامات والتحاضير والإعدادات والتوقيع وملفات كتب PDF المخزنة محلياً.</p><div className="settings-actions"><button type="button" onClick={exportSettingsBackup}>تنزيل نسخة احتياطية</button><label className="restore-file">استعادة نسخة احتياطية<input type="file" accept=".json,application/json" onChange={e=>importSettingsBackup(e.target.files?.[0])}/></label></div><p className="note">تطلب الاستعادة تأكيداً قبل استبدال البيانات الموجودة.</p></details>
                <details className="settings-section"><summary>٩. فحص نسخة دفتر التحضير — دون استيراد</summary>
                  <p className="note">اختر نسخة دفتر التحضير العامة بصيغة JSON. يعرض الفحص أعداد السجلات فقط، ولا يحفظ الملف أو ينقل بياناته أو يغيّر أي شيء في معلّم.</p>
                  <label className="restore-file">اختيار نسخة للفحص فقط<input type="file" accept=".json,application/json" onChange={e=>{inspectLegacyBackupFile(e.target.files?.[0]);e.target.value="";}}/></label>
                  {legacyBackupError && <p role="alert" className="note">{legacyBackupError}</p>}
                  {legacyBackupReport && <div role="status" className="note">
                    <p>تم فحص نسخة دفتر التحضير (الإصدار {legacyBackupReport.version}).</p>
                    <p><strong>مقارنة أولية قبل النقل:</strong> في معلّم حاليًا {savedPreparations.length} تحضير محفوظ، و{students.length} طالب. الأعداد لا تكفي لاكتشاف التكرارات؛ يجب فحص المعرفات قبل أي دمج.</p>
                    <ul>{legacyBackupReport.sections.map(section=><li key={section.key}>{section.key}: {section.count} سجل/عنصر</li>)}</ul>
                    <ul>{legacyBackupReport.warnings.map(warning=><li key={warning}>{warning}</li>)}</ul>
                  </div>}
                </details>
                <details className="settings-section"><summary>إدارة الصفوف والشُعب</summary><Config title="الصفوف" items={grades} kind="الصف" add={() => addItem("الصف")} rename={renameItem} remove={removeItem}/><Config title="الشُعب" items={sections} kind="الشعبة" add={() => addItem("الشعبة")} rename={renameItem} remove={removeItem}/></details>
              </section>
            )}
          </>
        )}
      </main>
      {!reportPreview && (
        <nav className="nav">
          <button
            className={tab === "home" ? "active" : ""}
            onClick={() => setTab("home")}
          >
            <Home />
            <span>الرئيسية</span>
          </button>
          <button
            className={tab === "students" ? "active" : ""}
            onClick={() => setTab("students")}
          >
            <Users />
            <span>الطلاب</span>
          </button>
          <button
            className={tab === "gradebook" ? "active" : ""}
            onClick={() => setTab("gradebook")}
          >
            <TableProperties />
            <span>العلامات</span>
          </button>
          <button
            className={tab === "ai" ? "active" : ""}
            onClick={() => setTab("ai")}
          >
            <Bot />
            <span>الذكاء</span>
          </button>
          <button
            className={tab === "knowledge" ? "active" : ""}
            onClick={() => setTab("knowledge")}
          >
            <Library />
            <span>البنك</span>
          </button>
          <button
            className={tab === "settings" ? "active" : ""}
            onClick={() => setTab("settings")}
          >
            <Settings />
            <span>الإعدادات</span>
          </button>
        </nav>
      )}
    </div>
  );
}
function SignaturePad({ value, onChange }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const width = Math.max(280, canvas.clientWidth || 320);
    const height = 150;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    const context = canvas.getContext("2d");
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);
    if (value) {
      const image = new Image();
      image.onload = () => context.drawImage(image, 0, 0, width, height);
      image.src = value;
    }
  }, [value]);
  const point = event => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {x: event.clientX - rect.left, y: event.clientY - rect.top};
  };
  const begin = event => {
    const canvas = event.currentTarget;
    canvas.setPointerCapture(event.pointerId);
    drawing.current = true;
    const context = canvas.getContext("2d");
    const p = point(event);
    context.beginPath(); context.moveTo(p.x, p.y); context.lineWidth = 2.5; context.lineCap = "round"; context.lineJoin = "round"; context.strokeStyle = "#173653";
  };
  const move = event => {
    if (!drawing.current) return;
    const p = point(event); const context = event.currentTarget.getContext("2d");
    context.lineTo(p.x, p.y); context.stroke();
  };
  const finish = event => {
    if (!drawing.current) return;
    drawing.current = false;
    onChange(event.currentTarget.toDataURL("image/png"));
  };
  const clear = () => { const canvas = canvasRef.current; const context = canvas.getContext("2d"); context.clearRect(0, 0, canvas.clientWidth, 150); onChange(""); };
  return <div className="signature-pad"><canvas ref={canvasRef} aria-label="ارسم توقيع المعلم بالإصبع" onPointerDown={begin} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish}/><div><span>ارسم التوقيع داخل الإطار</span><button type="button" onClick={clear}>مسح التوقيع</button></div></div>;
}
function PreparationEditor({ text, initialHtml, onChange }) {
  const editorRef = useRef(null);
  useEffect(() => { if(editorRef.current) editorRef.current.innerHTML = sanitizeRichHtml(initialHtml || autoColorHtml(text)); }, []);
  const notify = () => {
    const editor=editorRef.current;
    if(!editor)return;
    const html=sanitizeRichHtml(editor.innerHTML);
    const plain=(editor.innerText || editor.textContent || "").replace(/\u00a0/g," ").replace(/\n{3,}/g,"\n\n").trim();
    onChange(plain,html);
  };
  const paint = (color) => {
    const editor=editorRef.current;
    if(!editor)return;
    editor.focus();
    const selection=window.getSelection();
    if(!selection || selection.isCollapsed || !editor.contains(selection.anchorNode))return;
    document.execCommand("styleWithCSS",false,true);
    document.execCommand("foreColor",false,color);
    notify();
  };
  const automatic = () => {
    const editor=editorRef.current;
    const value=(editor?.innerText || editor?.textContent || text).replace(/\u00a0/g," ");
    if(editor)editor.innerHTML=autoColorHtml(value);
    notify();
  };
  return <div className="preparation-editor"><div className="prep-color-tools"><strong>لون النص المحدد:</strong><button type="button" className="prep-blue" onMouseDown={e=>e.preventDefault()} onClick={()=>paint("#1769aa")}>أزرق</button><button type="button" className="prep-red" onMouseDown={e=>e.preventDefault()} onClick={()=>paint("#d32f2f")}>أحمر</button><button type="button" className="prep-green" onMouseDown={e=>e.preventDefault()} onClick={()=>paint("#16834a")}>أخضر</button><button type="button" className="prep-black" onMouseDown={e=>e.preventDefault()} onClick={()=>paint("#111111")}>أسود</button><button type="button" onClick={automatic}>إعادة اللون التلقائي</button></div><div ref={editorRef} className="airesult editable-result rich-editor" contentEditable suppressContentEditableWarning dir="rtl" role="textbox" aria-label="نص التحضير القابل للتحرير" onInput={notify}/><p className="note">حدّد الكلمات أولاً ثم اختر لونها. تحفظ الألوان مع التحضير وتظهر في الطباعة وملف PDF.</p></div>;
}
function Tile({ icon, title, text, onClick, tone = "blue" }) {
  return (
    <button className={`tile ${tone}`} onClick={onClick}>
      <span className="tileicon">{icon}</span>
      <strong>{title}</strong>
      <small>{text}</small>
      <ChevronLeft className="tilearrow" />
    </button>
  );
}
function Config({ title, items, kind, add, rename, remove }) {
  return (
    <div className="config">
      <div className="confighead">
        <h3>{title}</h3>
        <button onClick={add}>
          <Plus size={16} /> إضافة
        </button>
      </div>
      <div className="chips">
        {items.map((x) => (
          <div className="chip" key={x}>
            <span>{x}</span>
            <button onClick={() => rename(kind, x)}>
              <Edit3 size={14} />
            </button>
            <button onClick={() => remove(kind, x)}>
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);
