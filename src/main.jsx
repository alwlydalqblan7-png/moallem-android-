Warning: truncated output (original token count: 41291)
Total output lines: 3108

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
  Camera,
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
import { calculateSciencePairSummary, calculateSubjectResult } from "./science-summary.js";
import { buildStudentHomeworkMessage, filterHomeworkForClass, getHomeworkStatus, setHomeworkStatus, summarizeHomework } from "./homework.js";
import { buildStudentIdentityCardHtml, buildStudentProfileHtml, collectStudentProfile } from "./student-profile.js";
import { migrateBoardLessons } from "./board-notebook.js";
import BoardNotebook from "./BoardNotebook.jsx";
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
const studentPhotoToDataUrl = (file) => new Promise((resolve, reject) => {
  if (!file || !/^image\/(jpeg|png|webp)$/.test(file.type || "")) return reject(new Error("اختر صورة بصيغة JPG أو PNG أو WebP."));
  if (file.size > 10 * 1024 * 1024) return reject(new Error("حجم الصورة كبير؛ اختر صورة أصغر من 10 ميغابايت."));
  const reader = new FileReader();
  reader.onerror = () => reject(new Error("تعذرت قراءة الصورة."));
  reader.onload = () => {
    const image = new Image();
    image.onerror = () => reject(new Error("تعذر فتح الصورة."));
    image.onload = () => {
      const maxSide = 360;
      const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext("2d");
      if (!context) return reject(new Error("تعذر تجهيز الصورة."));
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      let dataUrl = "";
      for (const quality of [0.82, 0.72, 0.62, 0.52]) {
        dataUrl = canvas.toDataURL("image/jpeg", quality);
        if (dataUrl.length <= 140 * 1024) break;
      }
      if (dataUrl.length > 140 * 1024) return reject(new Error("تعذر ضغط الصورة للحجم المناسب؛ اختر صورة أصغر."));
      resolve(dataUrl);
    };
    image.src = reader.result;
  };
  reader.readAsDataURL(file);
});
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
  const [boardLessons, setBoardLessons] = useState(() => migrateBoardLessons(load("m2_board_lessons", null), load("m2_board_strokes", [])));
  const [boardIsWriting, setBoardIsWriting] = useState(false);
  useEffect(() => {
    const timeout = window.setTimeout(() => persist("m2_board_lessons", boardLessons), 180);
    return () => window.clearTimeout(timeout);
  }, [boardLessons]);
  useEffect(() => {
    const openRoute = (url) => {
      try {
        const path = new URL(url).pathname.replace(/^\//, "");
        const routes = { home: "home", gradebook: "gradebook", attendance: "attendance", preparation: "ai", board: "board", schedule: "schedule" };
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
  const [homeworkItems, setHomeworkItems] = useState(() => load("m2_homework", []));
  const [homeworkFormOpen, setHomeworkFormOpen] = useState(false);
  const [editingHomeworkId, setEditingHomeworkId] = useState(null);
  const [homeworkDraft, setHomeworkDraft] = useState({ type: "واجب", title: "", subject: "", dueDate: "", details: "" });
  const [studentNotes, setStudentNotes] = useState(() => load("m2_student_notes", []));
  const [profileStudentId, setProfileStudentId] = useState(null);
  const [studentNoteDraft, setStudentNoteDraft] = useState("");
  const [studentPhotoMessage, setStudentPhotoMessage] = useState("");
  const studentPhotoInputRef = useRef(null);
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
  useEffect(() => persist("m2_attendance_history", attendanceHistory), [attendanceHistory]);
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
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    HomeWidget.syncSchedule({ schedule: weeklySchedule }).catch((error) => {
      console.warn("تعذرت مزامنة البرنامج مع ويدجت أندرويد", error);
    });
  }, [weeklySchedule]);
  useEffect(
    () => persist("m2_saved_preparations", savedPreparations),
    [savedPreparations],
  );
  useEffect(() => persist("m2_knowledge_bank", knowledgeBank), [knowledgeBank]);
  useEffect(() => persist("m2_homework", homeworkItems), [homeworkItems]);
  useEffect(() => persist("m2_student_notes", studentNotes), [studentNotes]);
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
  const profileStudent = students.find((student) => String(student.id) === String(profileStudentId)) || null;
  const profileStudentRosterNumber = profileStudent
    ? students.filter((student) => student.grade === profileStudent.grade && student.section === profileStudent.section)
      .findIndex((student) => String(student.id) === String(profileStudent.id)) + 1
    : null;
  const studentProfile = useMemo(() => profileStudent ? collectStudentProfile({
    student: profileStudent, gradebooks, attendanceHistory, homeworkItems, notes: studentNotes, officialGradeMaximum, legacyAttendance: attendance,
  }) : null, [profileStudent, gradebooks, attendanceHistory, homeworkItems, studentNotes, attendance]);
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
  const generalScienceExamColumns = [0, 1].map((index) => book.columns.find(c => c.id === `official_science_exam_${index}`));
  const hasOfficialExam = Boolean(finalExamColumn) || generalScienceExamColumns.every(Boolean);
  const ensureFinalExam = () => {
    if (hasOfficialExam) return;
    updateBook({ ...book, columns: [...book.columns, {
      id: "official_final_exam", name: "الامتحان الأخير", max: officialMax, type: "امتحان نهائي",
    }] });
  };
  const calc = (s) => {
    const m = book.marks[s.id] || {};
    const totals = calculateGradebookTotals(m, book.columns);
    let { earned: got, maximum: max } = totals;
    if (subject === "العلوم العامة" && generalScienceExamColumns.every(Boolean)) {
      const result = calculateSubjectResult(book, s.id, officialMax);
      const works = result.components.reduce((sum, component) => sum + component.work, 0);
      const exams = result.components.reduce((sum, component) => sum + (component.exam ?? 0), 0);
      return { got: result.value, max: officialMax, pct: Math.round((result.value / officialMax) * 1000) / 10,
        works, exam: result.pendingExam ? null : exams, final: result.pendingExam ? null : result.value,
        split: true, pendingExam: result.pendingExam };
    }
    if (split200 && finalExamColumn) {
      const workCols = book.columns.filter(c => c.id !== "official_final_exam");
      const works = calculateGradebookTotals(m, workCols).earned;
      const exam = m.official_final_exam === "" || m.official_final_exam == null ? null : normalizeMarkInput(m.official_final_exam, finalExamColumn.max);
      const final = exam == null ? null : (works + exam) / 2;
      return { got: final ?? works, max: officialMax, pct: Math.round(((final ?? works) / officialMax) * 1000) / 10,
        works, exam, final, split: true, pendingExam: exam == null };
    }
    if (subject === "العلوم" || subject === "الفيزياء والكيمياء") {
      const result = calculateSubjectResult(book, s.id, officialMax);
      const max = result.maximum ?? 0;
      return { got: result.value ?? result.earned, max, pct: max ? Math.round(((result.value ?? result.earned) / max) * 1000) / 10 : 0,
        works: result.value ?? result.earned, exam: null, final: result.value ?? result.earned, split: true, pendingExam: result.pendingExam };
    }
    return { got, max, pct: max ? Math.round((got / max) * 1000) / 10 : 0 };
  };
  const showSciencePairSummary = subject === "العلوم" || subject === "الفيزياء والكيمياء" || subject === "العلوم العامة";
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
    if (bulkDuplicateCount && !window.confirm(`توجد ${bulkDuplicateCount} أسماء مكررة في القائمة أو مسجلة في هذا الصف. ستبقى كطلاب مستقلي…21291 tokens truncated…                           ? "غا · غائب"
                                  : "متأخر"}
                            </button>
                          ))}
                        </div>
                        <input className={`attendance-note ${/غائب/.test(record.note || "") ? "absent" : /حاضر/.test(record.note || "") ? "present" : ""}`} dir="auto" placeholder="ملاحظة" value={record.note || ""} onChange={(event) => setAtt(s.id, st, event.target.value)} />
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
