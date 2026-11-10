import { isTeacherSpecified200Subject, officialGradeColumns, officialGradeMaximum } from "./official-grade-distribution.js";
import { calculateFirstTermResult, createFirstTermColumns, FIRST_TERM_SCHEME_ID } from "./semester-grade-scheme.js";
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
import { extractStudentPhotos, validateMoallemBackup } from "./backup-format.js";
import { inspectDaftarBackup } from "./legacy-backup-inspector.js";
import { attendanceDateKey, formatClassRoster, getDailyWidgetStatus, parseStudentNames, summarizeAttendance } from "./student-tools.js";
import { calculateGradebookTotals, normalizeMarkInput } from "./gradebook.js";
import { formatGradeInArabicWords } from "./arabic-grade-words.js";
import { calculateSciencePairSummary, calculateSubjectResult } from "./science-summary.js";
import { buildStudentHomeworkMessage, filterHomeworkForClass, getHomeworkStatus, setHomeworkStatus, summarizeHomework } from "./homework.js";
import { buildStudentIdentityCardHtml, buildStudentProfileHtml, buildStudentProfileShareText, collectStudentProfile } from "./student-profile.js";
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
  "الإحصاء",
  "التاريخ",
  "الجغرافيا",
  "المعلوماتية",
  "التربية الدينية",
  "التربية الفنية",
  "التربية الموسيقية",
  "التربية الرياضية",
];
const ADDED_SUBJECTS = ["العلوم", "الفيزياء والكيمياء"];
const FIRST_TERM_TEACHER_SUBJECTS = new Set(["علم الأحياء", "الإحصاء", "المعلوماتية", "العلوم", "الفيزياء والكيمياء"]);
const firstTermColumnsForSubject = (maximum, subjectName) => createFirstTermColumns(maximum).map((column) =>
  subjectName === "الإحصاء" && column.id === "term1_quiz" ? { ...column, name: "مذاكرة خطية" } : column
);
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
const STUDENT_NOTE_PRESETS = [
  "ملتزم بالدوام ويشارك بفاعلية في الحصة.",
  "يُظهر تحسنًا ملحوظًا في مستواه الدراسي.",
  "يحتاج إلى متابعة أداء الواجبات بانتظام.",
  "يحتاج إلى مراجعة الدروس والمذاكرات بانتظام.",
  "يرجى متابعة مستوى الطالب والتواصل مع المدرسة عند الحاجة.",
  "يحتاج إلى مزيد من التركيز والانتباه أثناء الحصة.",
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
      if (dataUrl.length > 140 * 1024) return reject(new Error("تعذر ضغط الصور�