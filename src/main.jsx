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
  FileSpreadsheet,
  X,
} from "lucide-react";
import { Printer } from "@capgo/capacitor-printer";
import { App as CapacitorApp } from "@capacitor/app";
import "./styles.css";
import moallemIcon from "./assets/moallem-icon.png";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

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
  return {
    pageCount: pdf.numPages,
    startPage: from,
    endPage: to,
    text: pages.join("\n\n"),
  };
};

function App() {
  const [tab, setTab] = useState("home");
  const [grades, setGrades] = useState(() => load("m2_grades", DEFAULT_GRADES));
  const [sections, setSections] = useState(() =>
    load("m2_sections", DEFAULT_SECTIONS),
  );
  const [subjects, setSubjects] = useState(() =>
    load("m2_subjects", DEFAULT_SUBJECTS),
  );
  const [students, setStudents] = useState(() =>
    load("m2_students", seedStudents),
  );
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
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [search, setSearch] = useState("");
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkMessage, setBulkMessage] = useState("");
  const bulkFileRef = useRef(null);
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
  const [plannerTocEnd, setPlannerTocEnd] = useState(12);
  const [plannerGenerating, setPlannerGenerating] = useState(false);
  const [bookStartPage, setBookStartPage] = useState(1);
  const [bookEndPage, setBookEndPage] = useState(1);
  const [bookLessonTitle, setBookLessonTitle] = useState("");
  const [savedPreparations, setSavedPreparations] = useState(() =>
    load("m2_saved_preparations", []),
  );
  const [editingPreparationId, setEditingPreparationId] = useState(null);
  const [savedPlans, setSavedPlans] = useState(() =>
    load("m2_curriculum_plans", []),
  );
  const WEEK_DAYS = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس"];
  const [weeklySchedule, setWeeklySchedule] = useState(() =>
    load("m2_weekly_schedule", {}),
  );
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
  const visibleStudents = useMemo(
    () => classStudents.filter((s) => !search || s.name.includes(search)),
    [classStudents, search],
  );
  const availableSubjects = useMemo(
    () =>
      GENERAL_SCIENCE_GRADES.includes(grade)
        ? subjects.filter(
            (s) =>
              !["الفيزياء", "الكيمياء", "علم الأحياء", "علم الأرض"].includes(s),
          )
        : subjects,
    [subjects, grade],
  );
  const preparationSubject = isGeneralScience ? sciencePrepSubject : subject;
  const aiBooks = useMemo(
    () => libraryBooks.filter((b) => b.grade === grade),
    [libraryBooks, grade],
  );
  const bookKey = `${grade}|${section}|${subject}`;
  const book = gradebooks[bookKey] || {
    columns:
      subject === "العلوم العامة" && GENERAL_SCIENCE_GRADES.includes(grade)
        ? scienceTotalColumns
        : seedColumns,
    marks: {},
  };
  const updateBook = (next) =>
    setGradebooks((g) => ({ ...g, [bookKey]: next }));
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
          [cid]: val === "" ? "" : Number(val),
        },
      },
    });
  const calc = (s) => {
    const m = book.marks[s.id] || {};
    let got = 0,
      max = 0;
    book.columns.forEach((c) => {
      if (m[c.id] !== "" && m[c.id] != null && !Number.isNaN(Number(m[c.id]))) {
        got += Number(m[c.id]);
        max += Number(c.max) || 0;
      }
    });
    return { got, max, pct: max ? Math.round((got / max) * 1000) / 10 : 0 };
  };
  const addStudent = () =>
    setStudents((x) => [
      ...x,
      { id: Date.now(), name: "طالب جديد", grade, section },
    ]);
  const normalizeStudentNames = (text) => {
    const rows = String(text || "").replace(/\r/g, "").split(/\n+/);
    return rows
      .map((row) => row.split(/[,;\t]/)[0].replace(/^["']|["']$/g, "").trim())
      .filter((name, index, all) => name && all.indexOf(name) === index);
  };
  const confirmBulkStudents = () => {
    const names = normalizeStudentNames(bulkText);
    if (!names.length) {
      setBulkMessage("أدخل أسماء الطلاب أولاً.");
      return;
    }
    const existing = new Set(classStudents.map((s) => s.name.trim()));
    const fresh = names.filter((name) => !existing.has(name));
    if (!fresh.length) {
      setBulkMessage("كل الأسماء موجودة مسبقاً في هذه الشعبة.");
      return;
    }
    const base = Date.now();
    setStudents((x) => [
      ...x,
      ...fresh.map((name, i) => ({ id: base + i, name, grade, section })),
    ]);
    setBulkText("");
    setBulkMessage("");
    setBulkOpen(false);
  };
  const importStudentList = async (file) => {
    if (!file) return;
    setBulkMessage("");
    const ext = file.name.toLowerCase().split(".").pop();
    if (!["csv", "txt"].includes(ext)) {
      setBulkMessage("اختر CSV أو TXT. من Excel اختر حفظ باسم CSV ثم استورده.");
      return;
    }
    try {
      const text = await file.text();
      setBulkText(text);
      setBulkOpen(true);
    } catch {
      setBulkMessage("تعذر قراءة الملف. جرّب ملف CSV بترميز UTF-8.");
    } finally {
      if (bulkFileRef.current) bulkFileRef.current.value = "";
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
ممنوع اختراع أسماء وحدات أو دروس غير موجودة في النص.

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
      const lessonName = bookLessonTitle.trim() || "الدرس المحدد";
      const promptText = `أنت مساعد معلم للمنهاج السوري.
اعتمد حصراً على نص الكتاب المرفق أدناه، ولا تضف معلومات أو دروس غير موجودة فيه.

الصف: ${plannerBook.grade}
الشعبة: ${section}
المادة: ${preparationSubject}
اسم الكتاب الظاهر: ${plannerBook.title}
اسم ملف PDF الحقيقي: ${plannerBook.fileName || plannerBook.title}
تصنيف الكتاب في المكتبة: ${plannerBook.subject}${plannerBook.branch ? ` / ${plannerBook.branch}` : ""}
عنوان الدرس/الوحدة: ${lessonName}
التاريخ: ${lessonDate}
الصفحات: ${extracted.startPage} إلى ${extracted.endPage}

أنشئ نموذج التحضير الحديث المعتمد للعام الدراسي 2026-2027، منظماً بعناوين واضحة وبالترتيب التالي:
1) المعلومات العامة: المادة، الصف، الشعبة، عنوان الدرس/الوحدة، التاريخ، اسم الكتاب والصفحات.
2) النواتج والمخرجات التعليمية: أهداف سلوكية/معرفية واضحة وقابلة للقياس ومناسبة لطبيعة المادة. في الفقه والتفسير والحديث واللغة العربية صغها بما يلائم طبيعة المادة، وفي العلوم أدرج الفهم والتطبيق والملاحظة والاستنتاج عند ملاءمتها للنص.
3) الاستراتيجيات والأنشطة التعليمية التعلمية: اختر ما يلائم الدرس مثل العصف الذهني، الحوار والمناقشة، التعلم النشط، التعلم التعاوني، والنشاط أو التجربة العملية عندما يدعمها محتوى الكتاب.
4) الوسائل والتقنيات التعليمية: الكتاب المدرسي، السبورة، والعروض أو الصور أو الأدوات أو المصادر الإثرائية المناسبة دون افتراض توفر وسيلة غير لازمة.
5) سير الدرس: تمهيد، عرض وشرح منظم خطوة بخطوة، المفاهيم الأساسية، الأنشطة والتطبيق، وتوزيع زمن الحصة/الحصص بصورة عملية.
6) التقويم المرحلي: أسئلة أو تطبيقات موزعة أثناء الدرس لقياس تحقق النواتج، مع إجابات/مؤشرات إجابة مختصرة عند الحاجة.
7) التقويم النهائي: أسئلة أو مهمة ختامية تقيس تحقق النواتج فعلاً، مع الإجابات أو معايير التصحيح.
8) الواجب المنزلي والملاحظات: واجب مرتبط مباشرة بالدرس، ثم ملاحظات عملية للمعلم.
9) أسئلة داعمة من محتوى الدرس عند ملاءمتها: أسئلة شفهية، اختيار من متعدد، صح/خطأ مع التصحيح، وأسئلة تفكير واستنتاج. لا تفرض عدداً مصطنعاً إذا كان النص لا يدعمه.
10) ملخص سريع للدرس يصلح للمراجعة.

قواعد إلزامية: اجعل نص الكتاب المصدر الأساسي للتحضير. لا تخترع حقائق أو تجارب أو أحكاماً غير موجودة أو غير مدعومة بالنص. اجعل التحضير عملياً وقابلاً للتعديل والحفظ والطباعة داخل تطبيق معلّم. إذا كان جزء من المطلوب غير واضح في الصفحات فاذكر ذلك صراحة بدلاً من اختلاق المحتوى.

لا تخلط مادة ${preparationSubject} مع أي فرع آخر من العلوم العامة.`;
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
          },
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      const raw = await response.text();
      let data = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = { text: raw };
      }
      if (!response.ok) {
        const detail = data?.message || data?.code || "";
        throw new Error(
          `${data?.error || `خطأ من الخادم (${response.status})`}${detail ? ` — ${detail}` : ""}`,
        );
      }
      const text = extractAiText(data);
      if (!text || ["رد بلا نص", "لا يوجد نص", "empty response"].includes(String(text).trim().replace(/[.!؟]/g, ""))) {
        const keys = data && typeof data === "object" ? Object.keys(data).join(", ") : "";
        throw new Error(
          `وصل رد من خدمة الذكاء بدون نص صالح${keys ? ` (الحقول: ${keys})` : ""}.`,
        );
      }
      setAiResult(String(text));
      setAiPrompt(`تحضير من كتاب ${plannerBook.title} — ${lessonName}`);
      setLibraryMessage(
        `تم تحضير ${lessonName} من الصفحات ${extracted.startPage}-${extracted.endPage}.`,
      );
      setTab("ai");
    } catch (err) {
      const message =
        err?.name === "AbortError"
          ? "انتهت مهلة الاتصال بالذكاء. حاول مجدداً."
          : err?.message || "تعذر تحضير الدرس من الكتاب.";
      setAiError(message);
      setLibraryMessage(message);
    } finally {
      setAiLoading(false);
    }
  };
  const saveCurrentPreparation = () => {
    if (!aiResult.trim()) return;
    const title = (bookLessonTitle || aiPrompt || "تحضير درس").trim();
    const item = {
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
      content: aiResult,
      updatedAt: new Date().toISOString(),
    };
    setSavedPreparations((x) => [item, ...x.filter((v) => v.id !== item.id)]);
    setEditingPreparationId(item.id);
  };
  const openPreparation = (item) => {
    setAiResult(item.content);
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
  const deletePreparation = (id) => {
    if (confirm("حذف هذا التحضير؟")) {
      setSavedPreparations((x) => x.filter((v) => v.id !== id));
      if (editingPreparationId === id) setEditingPreparationId(null);
    }
  };
  const updateCurrentPreparation = (text) => {
    setAiResult(text);
    if (editingPreparationId)
      setSavedPreparations((x) =>
        x.map((v) =>
          v.id === editingPreparationId
            ? { ...v, content: text, updatedAt: new Date().toISOString() }
            : v,
        ),
      );
  };
  const buildPreparationHtml = (item) =>
    `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>body{font-family:Arial;padding:28px;line-height:1.9;color:#173653}h1{text-align:center;color:#1c3f66}.meta{background:#f5f7fa;padding:12px;border-radius:10px;margin-bottom:16px}pre{white-space:pre-wrap;font-family:Arial;font-size:14px}</style></head><body><h1>${item.title}</h1><div class="meta">المادة: ${item.subject || ""} · الصف: ${item.grade || ""} · الشعبة: ${item.section || ""} · التاريخ: ${item.lessonDate || ""}${item.bookTitle ? `<br>الكتاب: ${item.bookTitle}` : ""}${item.pageStart ? ` · الصفحات: ${item.pageStart}-${item.pageEnd}` : ""}</div><pre>${item.content.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre></body></html>`;
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
                </div>
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
            {tab === "schedule" && (
              <section className="panel weekly-panel">
                <div className="panelhead">
                  <div>
                    <span className="eyebrow">البرنامج الأسبوعي</span>
                    <h2>حصصي من الأحد إلى الخميس</h2>
                    <p>أضف وعدّل واحذف الحصص، والحفظ تلقائي على الجهاز.</p>
                  </div>
                </div>
                <div className="weekly-days">
                  {WEEK_DAYS.map((day) => (
                    <article className="weekly-day" key={day}>
                      <div className="weekly-day-head">
                        <div>
                          <strong>{day}</strong>
                          <span>{(weeklySchedule[day] || []).length} حصة</span>
                        </div>
                        <button
                          className="primary"
                          onClick={() => addWeeklyPeriod(day)}
                        >
                          <Plus size={16} /> إضافة حصة
                        </button>
                      </div>
                      <div className="weekly-periods">
                        {(weeklySchedule[day] || []).length ? (
                          (weeklySchedule[day] || []).map((period, i) => (
                            <div className="weekly-period" key={period.id}>
                              <span className="period-num">{i + 1}</span>
                              <select
                                value={period.grade}
                                onChange={(e) =>
                                  updateWeeklyPeriod(day, period.id, {
                                    grade: e.target.value,
                                  })
                                }
                              >
                                {grades.map((g) => (
                                  <option key={g}>{g}</option>
                                ))}
                              </select>
                              <select
                                value={period.section}
                                onChange={(e) =>
                                  updateWeeklyPeriod(day, period.id, {
                                    section: e.target.value,
                                  })
                                }
                              >
                                {sections.map((v) => (
                                  <option key={v}>{v}</option>
                                ))}
                              </select>
                              <select
                                value={period.subject}
                                onChange={(e) =>
                                  updateWeeklyPeriod(day, period.id, {
                                    subject: e.target.value,
                                  })
                                }
                              >
                                {(GENERAL_SCIENCE_GRADES.includes(period.grade)
                                  ? subjects.filter(
                                      (v) =>
                                        ![
                                          "الفيزياء",
                                          "الكيمياء",
                                          "علم الأحياء",
                                          "علم الأرض",
                                        ].includes(v),
                                    )
                                  : subjects
                                ).map((v) => (
                                  <option key={v}>{v}</option>
                                ))}
                              </select>
                              <input
                                type="time"
                                value={period.time || ""}
                                onChange={(e) =>
                                  updateWeeklyPeriod(day, period.id, {
                                    time: e.target.value,
                                  })
                                }
                                aria-label={`وقت الحصة ${i + 1}`}
                              />
                              <button
                                className="danger"
                                onClick={() =>
                                  removeWeeklyPeriod(day, period.id)
                                }
                                aria-label="حذف الحصة"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ))
                        ) : (
                          <div className="weekly-empty">لا توجد حصص بعد.</div>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
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
                    <button onClick={() => { setBulkMessage(""); setBulkOpen(true); }}>
                      <Users size={17} /> إضافة دفعة
                    </button>
                    <button onClick={() => bulkFileRef.current?.click()}>
                      <FileSpreadsheet size={17} /> استيراد CSV
                    </button>
                    <input
                      ref={bulkFileRef}
                      className="hidden-file"
                      type="file"
                      accept=".csv,.txt,text/csv,text/plain"
                      onChange={(e) => importStudentList(e.target.files?.[0])}
                    />
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
                        <th>المجموع</th>
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
                            <td>
                              <b>
                                {c.got}/{c.max}
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
                    <textarea
                      className="airesult editable-result"
                      value={aiResult}
                      onChange={(e) => updateCurrentPreparation(e.target.value)}
                    />
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
              <section className="panel">
                <div className="panelhead">
                  <div>
                    <span className="eyebrow">التخصيص</span>
                    <h2>كل بند قابل للتعديل</h2>
                  </div>
                </div>
                <Config
                  title="الصفوف"
                  items={grades}
                  kind="الصف"
                  add={() => addItem("الصف")}
                  rename={renameItem}
                  remove={removeItem}
                />
                <Config
                  title="الشُعب"
                  items={sections}
                  kind="الشعبة"
                  add={() => addItem("الشعبة")}
                  rename={renameItem}
                  remove={removeItem}
                />
                <Config
                  title="المواد"
                  items={subjects}
                  kind="المادة"
                  add={() => addItem("المادة")}
                  rename={renameItem}
                  remove={removeItem}
                />
              </section>
            )}
          </>
        )}
      </main>
      {bulkOpen && (
        <div className="bulk-overlay" role="dialog" aria-modal="true" aria-label="إضافة الطلاب دفعة واحدة">
          <section className="bulk-modal">
            <header className="bulk-head">
              <div>
                <span className="eyebrow">إدارة الطلاب</span>
                <h2>إضافة الطلاب دفعة واحدة</h2>
                <p>{grade} — الشعبة {section}</p>
              </div>
              <button className="bulk-close" onClick={() => setBulkOpen(false)} aria-label="إغلاق">
                <X size={20} />
              </button>
            </header>
            <div className="bulk-body">
              <p className="bulk-help">الصق اسماً في كل سطر، أو استورد CSV. سيُتجاهل الاسم المكرر داخل الشعبة.</p>
              <textarea
                className="bulk-textarea"
                value={bulkText}
                onChange={(e) => { setBulkText(e.target.value); setBulkMessage(""); }}
                placeholder={"أحمد محمد\nخالد محمود\nوليد حسن"}
                autoFocus
              />
              {bulkMessage && <div className="bulk-message">{bulkMessage}</div>}
            </div>
            <footer className="bulk-footer">
              <button onClick={() => setBulkOpen(false)}>إلغاء</button>
              <button className="primary" onClick={confirmBulkStudents}>
                <UserPlus size={17} /> إضافة الطلاب
              </button>
            </footer>
          </section>
        </div>
      )}
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
            className={tab === "settings" ? "active" : ""}
            onClick={() => setTab("settings")}
          >
            <Settings />
            <span>تعديل</span>
          </button>
        </nav>
      )}
    </div>
  );
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
