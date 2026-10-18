Warning: truncated output (original token count: 35564)
Total output lines: 2803

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
  Share2,
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
import { attendanceDateKey, formatClassRoster, getDailyWidgetStatus, parseStudentNames, summarizeAttendance } from "./student-tools.js";
import { calculateGradebookTotals, normalizeMarkInput } from "./gradebook.js";
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
const HomeWidget = registerPlugin("HomeWidget");
const BackupFile = registerPlugin("BackupFile");
const ShareText = registerPlugin("ShareText");
const localDateKey = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

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
  const [boardStrokes, setBoardStrokes] = useState(() => load("m2_board_strokes", []));
  useEffect(() => persist("m2_board_strokes", boardStrokes), [boardStrokes]);
  useEffect(() => {
    const openRoute = (url) => {
      try {
        const path = new URL(url).pathname.replace(/^\//, "");
        const routes = { home: "home", gradebook: "gradebook", attendance: "attendance", preparation: "ai", board: "board" };
        if (routes[path]) setTab(routes[path]);
      } catch {}
    };
    let handle;
    CapacitorApp.getLaunchUrl().then((launch) => launch?.url && openRoute(launch.url)).catch(() => {});
    CapacitorApp.addListener("appUrlOpen", ({ url }) => openRoute(url)).then((listener) => { handle = listener; });
    return () => { handle?.remove(); };
  }, []);
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
  const [attendanceHistory, setAttendanceHistory] = useState(() => load("m2_attendance_history", {}));
  const [attendanceDate, setAttendanceDate] = useState(() => localDateKey());
  const [attendanceMessage, setAttendanceMessage] = useState("");
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
  const [knowledgeDraft, setKnowledgeDraft] = useState({title:"", …23564 tokens truncated…ndPage}
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
function DrawingBoard({ strokes, onChange, onClose }) {
  const canvasRef = useRef(null);
  const activeStroke = useRef(false);
  const [color, setColor] = useState("#111111");
  const [redoStack, setRedoStack] = useState([]);
  useEffect(() => {
    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(rect.width * ratio));
      canvas.height = Math.max(1, Math.floor(rect.height * ratio));
      const context = canvas.getContext("2d");
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, rect.width, rect.height);
      for (const stroke of strokes) {
        if (!stroke.points?.length) continue;
        context.beginPath(); context.strokeStyle = stroke.color; context.lineWidth = stroke.width || 3;
        context.lineCap = "round"; context.lineJoin = "round";
        stroke.points.forEach(([x, y], index) => { const px = x * rect.width, py = y * rect.height; index ? context.lineTo(px, py) : context.moveTo(px, py); });
        context.stroke();
      }
    };
    draw(); window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
  }, [strokes]);
  const position = (event) => { const rect = canvasRef.current.getBoundingClientRect(); return [Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)), Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height))]; };
  const start = (event) => { event.currentTarget.setPointerCapture(event.pointerId); activeStroke.current = true; setRedoStack([]); onChange([...strokes, { color, width: color === "#ffffff" ? 22 : 3, points: [position(event)] }]); };
  const move = (event) => { if (!activeStroke.current) return; const point = position(event); onChange((previous) => { const next = [...previous]; const last = next[next.length - 1]; next[next.length - 1] = { ...last, points: [...last.points, point] }; return next; }); };
  const undo = () => { if (!strokes.length) return; setRedoStack((stack) => [...stack, strokes[strokes.length - 1]]); onChange(strokes.slice(0, -1)); };
  const redo = () => { if (!redoStack.length) return; onChange([...strokes, redoStack[redoStack.length - 1]]); setRedoStack((stack) => stack.slice(0, -1)); };
  return <section className="drawing-board" dir="rtl"><div className="drawing-toolbar"><strong>دفتر السبورة</strong><button type="button" onClick={() => setColor("#111111")}>قلم أسود</button><button type="button" onClick={() => setColor("#c62828")}>قلم أحمر</button><button type="button" onClick={() => setColor("#ffffff")}>ممحاة</button><button type="button" onClick={undo} disabled={!strokes.length}>تراجع</button><button type="button" onClick={redo} disabled={!redoStack.length}>إعادة</button><button type="button" onClick={onClose}>تم</button></div><canvas ref={canvasRef} className="drawing-canvas" aria-label="مساحة الكتابة على السبورة" onPointerDown={start} onPointerMove={move} onPointerUp={() => { activeStroke.current = false; }} onPointerCancel={() => { activeStroke.current = false; }} /></section>;
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
