import React, { useEffect, useRef, useState } from "react";
import { BookOpen, CheckCircle2, ChevronLeft, ChevronRight, ClipboardList, Plus, Printer as PrinterIcon } from "lucide-react";
import { buildBoardLessonsPrintHtml, createBoardLesson, updateBoardLesson, upsertBoardLesson } from "./board-notebook.js";

const dateKey = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

export default function BoardNotebook({ lessons, setLessons, grade, section, subject, grades, sections, subjects, printDocument, onWritingChange }) {
  const [page, setPage] = useState("home");
  const [activeId, setActiveId] = useState(null);
  const [activeStrokes, setActiveStrokes] = useState([]);
  const activeStrokesRef = useRef([]);
  const [filter, setFilter] = useState("all");
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState("");
  const [draft, setDraft] = useState({ title: "", grade, section, subject, date: dateKey(), content: "" });
  const activeLesson = lessons.find((lesson) => String(lesson.id) === String(activeId)) || null;
  const favoriteCount = lessons.filter((lesson) => lesson.favorite || lesson.status === "completed").length;
  const visibleLessons = lessons.filter((lesson) => {
    if (page === "saved") return Boolean(lesson.favorite) || lesson.status === "completed";
    if (filter === "current") return lesson.grade === grade && lesson.section === section;
    if (filter === "incomplete") return lesson.status !== "completed";
    return true;
  });

  useEffect(() => { onWritingChange(page === "write"); }, [page, onWritingChange]);
  useEffect(() => {
    if (!activeId || page !== "write") return;
    const timer = window.setTimeout(() => {
      setLessons((current) => updateBoardLesson(current, activeId, {
        strokes: activeStrokes,
        status: activeStrokes.length ? "in-progress" : (activeLesson?.status || "not-started"),
      }));
    }, 160);
    return () => window.clearTimeout(timer);
  }, [activeStrokes, activeId, page]);

  const makeDraft = () => setDraft({ title: "", grade, section, subject, date: dateKey(), content: "" });
  const openLesson = (lesson) => {
    setActiveId(lesson.id);
    const savedStrokes = Array.isArray(lesson.strokes) ? lesson.strokes : [];
    activeStrokesRef.current = savedStrokes;
    setActiveStrokes(savedStrokes);
    setPage("write");
  };
  const createAndStart = (event) => {
    event?.preventDefault?.();
    try {
      const lesson = createBoardLesson(draft);
      setLessons((current) => upsertBoardLesson(current, lesson));
      makeDraft();
      setActiveId(lesson.id);
      activeStrokesRef.current = [];
      setActiveStrokes([]);
      setPage("write");
    } catch (error) {
      window.alert(error?.message || "اكتب عنوان الدرس أولاً");
    }
  };
  const changeStrokes = (next) => {
    const value = typeof next === "function" ? next(activeStrokesRef.current) : next;
    activeStrokesRef.current = value;
    setActiveStrokes(value);
  };
  const saveCurrentLesson = (status) => {
    if (!activeLesson) return;
    const current = activeStrokesRef.current;
    const next = updateBoardLesson(lessons, activeId, {
      strokes: current,
      status: status || (current.length ? "in-progress" : activeLesson.status || "not-started"),
    });
    setLessons(next);
    try { localStorage.setItem("m2_board_lessons", JSON.stringify(next)); } catch {}
  };
  const finishLesson = () => {
    if (!activeLesson) return;
    saveCurrentLesson("completed");
    setPage("lessons");
  };
  const leaveBoard = () => {
    saveCurrentLesson();
    setPage("lessons");
  };
  const exportLessons = async (items) => {
    if (exporting) return;
    if (!items.length) return window.alert("لا توجد دروس لتصديرها بعد.");
    setExporting(true);
    setExportMessage("جارٍ تجهيز صفحات الطباعة… قد يستغرق ذلك لحظات إذا كانت الكتابة كثيرة.");
    await new Promise((resolve) => window.requestAnimationFrame(resolve));
    try {
      const html = buildBoardLessonsPrintHtml(items);
      await printDocument("دفتر السبورة", html);
      setExportMessage("ظهرت نافذة الطباعة. اختر «حفظ كملف PDF» لتنزيل الدروس.");
      window.setTimeout(() => setExportMessage(""), 9000);
    } catch (error) {
      setExportMessage(error?.message || "تعذر تجهيز الطباعة. جرّب تصدير درس واحد من قائمة دروسي.");
    } finally {
      setExporting(false);
    }
  };
  const backHome = () => setPage("home");

  if (page === "write") return activeLesson ? <DrawingBoard lesson={activeLesson} strokes={activeStrokes} onChange={changeStrokes} onBack={leaveBoard} onFinish={finishLesson} /> : (
    <section className="board-notebook panel" dir="rtl"><p>تعذر فتح الدرس.</p><button type="button" onClick={() => setPage("lessons")}>العودة إلى دروسي</button></section>
  );

  if (page === "create") return (
    <section className="board-notebook panel" dir="rtl">
      <div className="board-page-heading">
        <button type="button" className="board-back" onClick={backHome}><ChevronRight size={19}/> دفتر السبورة</button>
        <div><h2>إنشاء درس جديد</h2><p>أدخل عنوان الدرس، ثم احفظه وانتقل مباشرة إلى السبورة.</p></div>
      </div>
      <form className="board-create-form" onSubmit={createAndStart}>
        <label className="board-title-field">عنوان الدرس<input autoFocus value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder="مثال: المجهَر" maxLength={120}/></label>
        <div className="board-form-row">
          <label>الصف<select value={draft.grade} onChange={(event) => setDraft((current) => ({ ...current, grade: event.target.value }))}>{grades.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>الشعبة<select value={draft.section} onChange={(event) => setDraft((current) => ({ ...current, section: event.target.value }))}>{sections.map((item) => <option key={item}>{item}</option>)}</select></label>
        </div>
        <label>المادة<select value={draft.subject} onChange={(event) => setDraft((current) => ({ ...current, subject: event.target.value }))}>{subjects.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="board-date-field">التاريخ<input type="date" value={draft.date} onChange={(event) => setDraft((current) => ({ ...current, date: event.target.value }))}/></label>
        <label>نقاط الدرس (اختياري)<textarea rows={3} value={draft.content} onChange={(event) => setDraft((current) => ({ ...current, content: event.target.value }))} placeholder="اكتب النقاط التي تريد الرجوع إليها أثناء الشرح…" maxLength={4000}/></label>
        <p className="board-form-hint">سيُحفظ الدرس تلقائيًا على هذا الجهاز، ويمكنك فتحه لاحقًا أو تصديره للطباعة.</p>
        <button type="submit" className="board-primary"><Plus size={20}/> حفظ الدرس والبدء بالكتابة</button>
      </form>
    </section>
  );

  if (page === "lessons" || page === "saved") return (
    <section className="board-notebook panel" dir="rtl">
      <div className="board-page-heading">
        <button type="button" className="board-back" onClick={backHome}><ChevronRight size={19}/> دفتر السبورة</button>
        <div><h2>{page === "saved" ? "المحفوظات" : "دروسي"}</h2><p>{page === "saved" ? "الدروس المكتملة أو المفضلة" : "اختر درسًا لفتحه، وسيعود كما تركته."}</p></div>
      </div>
      <div className="board-list-actions">
        <button type="button" className="board-primary" onClick={() => { makeDraft(); setPage("create"); }}><Plus size={19}/> إنشاء درس جديد</button>
        <button type="button" className="board-secondary" onClick={() => exportLessons(page === "saved" ? visibleLessons : lessons)} disabled={exporting}><PrinterIcon size={18}/> {exporting ? "جارٍ التجهيز…" : "تصدير PDF"}</button>
      </div>
      {exportMessage && <p className="board-export-status" role="status" aria-live="polite">{exportMessage}</p>}
      {page === "lessons" && <label className="board-filter">عرض الدروس<select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">كل الدروس</option><option value="current">الصف والشعبة الحالية</option><option value="incomplete">غير المكتملة</option></select></label>}
      <div className="board-lesson-list">{visibleLessons.length ? visibleLessons.map((lesson, index) => (
        <article className="board-lesson-card" key={lesson.id}>
          <button type="button" className="board-open-lesson" onClick={() => openLesson(lesson)}>
            <span className="board-lesson-number">{index + 1}</span>
            <span className="board-lesson-main"><strong>{lesson.title}</strong><small>{[lesson.date, lesson.grade, lesson.section ? `الشعبة ${lesson.section}` : "", lesson.subject].filter(Boolean).join(" · ")}</small><em className={lesson.status === "completed" ? "completed" : lesson.status === "in-progress" ? "in-progress" : "not-started"}>{lesson.status === "completed" ? "✓ تم الانتهاء" : lesson.status === "in-progress" ? "قيد الشرح" : "لم يبدأ"}</em></span>
            <ChevronLeft size={20}/>
          </button>
          <button type="button" className={`board-favorite ${lesson.favorite ? "active" : ""}`} aria-label={lesson.favorite ? "إزالة من المحفوظات" : "حفظ في المفضلة"} onClick={() => setLessons((current) => updateBoardLesson(current, lesson.id, { favorite: !lesson.favorite }))}>{lesson.favorite ? "★" : "☆"}</button>
        </article>
      )) : (
        <div className="board-empty"><BookOpen size={30}/><strong>{page === "saved" ? "لا توجد دروس محفوظة بعد" : "لا توجد دروس هنا بعد"}</strong><span>أنشئ درسًا جديدًا وسيظهر في هذه القائمة.</span><button type="button" className="board-primary" onClick={() => { makeDraft(); setPage("create"); }}><Plus size={18}/> إنشاء أول درس</button></div>
      )}</div>
    </section>
  );

  return (
    <section className="board-notebook board-home panel" dir="rtl">
      <div className="board-welcome"><span className="board-emblem"><BookOpen size={42}/></span><h2>دفتر <b>السبورة</b></h2><p>أنشئ الدرس، ثم اكتب أمام الطلاب. تُحفظ كتابتك تلقائيًا.</p></div>
      <div className="board-home-actions">
        <button type="button" className="board-home-action rose" onClick={() => setPage("lessons")}><span className="board-home-icon"><ClipboardList size={27}/></span><span><strong>دروسي</strong><small>عرض الدروس وإدارتها · {lessons.length} درس</small></span><ChevronLeft size={21}/></button>
        <button type="button" className="board-home-action rose" onClick={() => { makeDraft(); setPage("create"); }}><span className="board-home-icon"><Plus size={32}/></span><span><strong>إنشاء درس جديد</strong><small>ابدأ بعنوان الدرس والصف والمادة</small></span><ChevronLeft size={21}/></button>
        <button type="button" className="board-home-action neutral" onClick={() => exportLessons(lessons)} disabled={exporting}><span className="board-home-icon">{exporting ? "…" : <PrinterIcon size={27}/>}</span><span><strong>{exporting ? "جارٍ تجهيز PDF…" : "تصدير الدروس PDF"}</strong><small>{exporting ? "نختصر نقاط الكتابة لتسريع المعاينة" : "طباعة الدروس والكتابة المحفوظة"}</small></span><ChevronLeft size={21}/></button>
        {exportMessage && <p className="board-export-status" role="status" aria-live="polite">{exportMessage}</p>}
        <button type="button" className="board-home-action amber" onClick={() => setPage("saved")}><span className="board-home-icon"><span className="board-star">★</span></span><span><strong>المحفوظات</strong><small>الدروس المفضلة والمكتملة · {favoriteCount}</small></span><ChevronLeft size={21}/></button>
      </div>
    </section>
  );
}

function DrawingBoard({ lesson, strokes, onChange, onBack, onFinish }) {
  const [color, setColor] = useState("#111111");
  const [redoStack, setRedoStack] = useState([]);
  const canvasRef = React.useRef(null);
  const activeStroke = React.useRef(false);
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
    draw();
    const observer = new ResizeObserver(draw);
    if (canvasRef.current) observer.observe(canvasRef.current);
    window.addEventListener("orientationchange", draw);
    return () => { observer.disconnect(); window.removeEventListener("orientationchange", draw); };
  }, [strokes]);
  const position = (event) => { const rect = canvasRef.current.getBoundingClientRect(); return [Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)), Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height))]; };
  const start = (event) => { event.currentTarget.setPointerCapture(event.pointerId); activeStroke.current = true; setRedoStack([]); onChange([...strokes, { color, width: color === "#ffffff" ? 24 : 3, points: [position(event)] }]); };
  const move = (event) => { if (!activeStroke.current) return; const point = position(event); onChange((previous) => { const next = [...previous]; const last = next[next.length - 1]; next[next.length - 1] = { ...last, points: [...last.points, point] }; return next; }); };
  const undo = () => { if (!strokes.length) return; setRedoStack((stack) => [...stack, strokes[strokes.length - 1]]); onChange(strokes.slice(0, -1)); };
  const redo = () => { if (!redoStack.length) return; onChange([...strokes, redoStack[redoStack.length - 1]]); setRedoStack((stack) => stack.slice(0, -1)); };
  const clearBoard = () => { if (!strokes.length || !window.confirm("هل تريد مسح كل ما كُتب على السبورة؟")) return; setRedoStack([]); onChange([]); };
  return (
    <section className="drawing-board" dir="rtl">
      <header className="drawing-board-head"><button type="button" onClick={onBack}><ChevronRight size={19}/> دروسي</button><div><strong>{lesson.title}</strong><small>{[lesson.grade, lesson.section ? `الشعبة ${lesson.section}` : "", lesson.subject, lesson.date].filter(Boolean).join(" · ")}</small></div><button type="button" className="drawing-finish" onClick={onFinish}><CheckCircle2 size={18}/> إنهاء الدرس</button></header>
      {lesson.content && <details className="drawing-lesson-notes"><summary>نقاط الدرس</summary><p>{lesson.content}</p></details>}
      <div className="drawing-toolbar" aria-label="أدوات السبورة"><div className="drawing-pen-tools"><button type="button" className={color === "#111111" ? "selected" : ""} onClick={() => setColor("#111111")}><span className="pen-dot black"/> أسود</button><button type="button" className={color === "#c62828" ? "selected" : ""} onClick={() => setColor("#c62828")}><span className="pen-dot red"/> أحمر</button><button type="button" className={color === "#ffffff" ? "selected" : ""} onClick={() => setColor("#ffffff")}><span className="eraser-icon">⌫</span> ممحاة</button></div><div className="drawing-edit-tools"><button type="button" onClick={undo} disabled={!strokes.length}>↶ تراجع</button><button type="button" onClick={redo} disabled={!redoStack.length}>↷ إعادة</button><button type="button" onClick={clearBoard} disabled={!strokes.length}>مسح الكل</button></div></div>
      <canvas ref={canvasRef} className="drawing-canvas" aria-label="مساحة الكتابة على السبورة" onPointerDown={start} onPointerMove={move} onPointerUp={() => { activeStroke.current = false; }} onPointerCancel={() => { activeStroke.current = false; }}/>
      <div className="drawing-save-status"><CheckCircle2 size={15}/> الحفظ تلقائي على هذا الجهاز</div>
    </section>
  );
}
