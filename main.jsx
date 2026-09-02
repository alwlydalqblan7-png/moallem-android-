import React, {useEffect, useMemo, useState} from 'react';
import { createRoot } from 'react-dom/client';
import { BookOpen, Bot, CalendarDays, CheckCircle2, ClipboardList, FileText, Home, Sparkles, Users, WifiOff, GraduationCap, Clock3, ChevronLeft, UserCheck, UserX, TimerReset, Save, Trash2, Plus, Award, LibraryBig, CircleHelp, WandSparkles, Bell, ListTodo, CalendarPlus, Pencil, Trash, Check, RotateCcw, BarChart3, TrendingUp, TrendingDown, Download, Medal, AlertTriangle } from 'lucide-react';
import './styles.css';

const seedStudents = [
  {id:1,name:'أحمد محمد',status:'present',score:18},
  {id:2,name:'سارة خالد',status:'present',score:20},
  {id:3,name:'وليد محمود',status:'late',score:16},
  {id:4,name:'لانا علي',status:'absent',score:14},
  {id:5,name:'عمر حسن',status:'present',score:19},
  {id:6,name:'ريم يوسف',status:'present',score:17},
];

const statusMeta = {
  present:{label:'حاضر',icon:UserCheck},
  absent:{label:'غائب',icon:UserX},
  late:{label:'متأخر',icon:TimerReset},
};

function loadStudents(){
  try{ return JSON.parse(localStorage.getItem('moallem_students')) || seedStudents; }
  catch{ return seedStudents; }
}

const seedQuestions = [
  {id:101, grade:'السابع', subject:'علوم عامة', topic:'الجهاز التنفسي', type:'اختيار من متعدد', difficulty:'متوسط', text:'ما العضو الرئيس المسؤول عن تبادل الغازات في الجهاز التنفسي؟', answer:'الرئتان'},
  {id:102, grade:'السابع', subject:'علوم عامة', topic:'الجهاز التنفسي', type:'صح أو خطأ', difficulty:'سهل', text:'يدخل الهواء إلى الجسم عبر الأنف أو الفم قبل وصوله إلى الرئتين.', answer:'صح'},
  {id:103, grade:'الثامن', subject:'فيزياء', topic:'القوة والحركة', type:'سؤال قصير', difficulty:'متوسط', text:'اذكر أثراً واحداً للقوة في حركة جسم.', answer:'تغيير السرعة أو الاتجاه أو إيقاف الجسم.'},
];

function loadQuestions(){
  try{ return JSON.parse(localStorage.getItem('moallem_questions')) || seedQuestions; }
  catch{ return seedQuestions; }
}
function loadTests(){
  try{ return JSON.parse(localStorage.getItem('moallem_tests')) || []; }
  catch{ return []; }
}


const seedSchedule = [
  {id:201,day:'الأحد',time:'08:00',subject:'علوم عامة',className:'الصف السابع',room:'الشعبة أ'},
  {id:202,day:'الأحد',time:'09:45',subject:'فيزياء',className:'الصف الثامن',room:'الشعبة ب'},
  {id:203,day:'الاثنين',time:'08:50',subject:'كيمياء',className:'الصف الثامن',room:'الشعبة أ'},
  {id:204,day:'الثلاثاء',time:'10:30',subject:'علوم عامة',className:'الصف السابع',room:'الشعبة ب'},
];
const seedTasks = [
  {id:301,title:'تصحيح اختبار الصف السابع',due:'اليوم',done:false,priority:'مهم'},
  {id:302,title:'تحضير نشاط الجهاز التنفسي',due:'غداً',done:false,priority:'عادي'},
  {id:303,title:'إدخال علامات الواجب',due:'هذا الأسبوع',done:true,priority:'عادي'},
];
function loadSchedule(){ try{return JSON.parse(localStorage.getItem('moallem_schedule'))||seedSchedule}catch{return seedSchedule} }
function loadTasks(){ try{return JSON.parse(localStorage.getItem('moallem_tasks'))||seedTasks}catch{return seedTasks} }

const dayNameMap={0:'الأحد',1:'الاثنين',2:'الثلاثاء',3:'الأربعاء',4:'الخميس',5:'الجمعة',6:'السبت'};
function getTodayName(){return dayNameMap[new Date().getDay()]||'الأحد';}

function App(){
  const [tab,setTab] = useState('home');
  const [grade,setGrade] = useState('السابع');
  const [subject,setSubject] = useState('علوم عامة');
  const [topic,setTopic] = useState('الجهاز التنفسي');
  const [plan,setPlan] = useState('');
  const [students,setStudents] = useState(loadStudents);
  const [saved,setSaved] = useState(false);
  const [questions,setQuestions] = useState(loadQuestions);
  const [tests,setTests] = useState(loadTests);
  const [testTitle,setTestTitle] = useState('اختبار قصير');
  const [testCount,setTestCount] = useState(5);
  const [testDifficulty,setTestDifficulty] = useState('متنوع');
  const [draftTest,setDraftTest] = useState([]);
  const [schedule,setSchedule] = useState(loadSchedule);
  const [tasks,setTasks] = useState(loadTasks);
  const [scheduleDay,setScheduleDay] = useState('الأحد');
  const [newLesson,setNewLesson] = useState({day:'الأحد',time:'08:00',subject:'علوم عامة',className:'الصف السابع',room:'الشعبة أ'});
  const [newTask,setNewTask] = useState('');
  const [remindersEnabled,setRemindersEnabled] = useState(()=>localStorage.getItem('moallem_reminders')!=='false');

  useEffect(()=>{
    localStorage.setItem('moallem_students', JSON.stringify(students));
    setSaved(true);
    const t=setTimeout(()=>setSaved(false),700);
    return ()=>clearTimeout(t);
  },[students]);

  useEffect(()=>{ localStorage.setItem('moallem_questions', JSON.stringify(questions)); },[questions]);
  useEffect(()=>{ localStorage.setItem('moallem_tests', JSON.stringify(tests)); },[tests]);
  useEffect(()=>{ localStorage.setItem('moallem_schedule', JSON.stringify(schedule)); },[schedule]);
  useEffect(()=>{ localStorage.setItem('moallem_tasks', JSON.stringify(tasks)); },[tasks]);
  useEffect(()=>{ localStorage.setItem('moallem_reminders', String(remindersEnabled)); },[remindersEnabled]);

  const generated = useMemo(()=>`عنوان الدرس: ${topic}\n\nالأهداف:\n• أن يعرّف الطالب المفهوم الأساسي للدرس.\n• أن يربط بين مكونات الدرس ووظائفها.\n• أن يجيب عن أسئلة تطبيقية قصيرة.\n\nالتمهيد:\nابدأ بسؤال بسيط مرتبط بحياة الطالب اليومية، ثم اعرض صورة أو مثالاً سريعاً.\n\nسير الحصة:\n1. شرح الفكرة الرئيسية في 10 دقائق.\n2. نشاط ثنائي لمدة 8 دقائق.\n3. مناقشة صفية لمدة 7 دقائق.\n4. تقويم سريع من 3 أسئلة.\n\nالواجب:\nسؤال تطبيقي قصير + مراجعة المصطلحات الأساسية.`,[topic]);

  const totals = useMemo(()=>({
    present: students.filter(s=>s.status==='present').length,
    absent: students.filter(s=>s.status==='absent').length,
    late: students.filter(s=>s.status==='late').length,
  }),[students]);

  const average = useMemo(()=>{
    if(!students.length) return 0;
    return Math.round((students.reduce((n,s)=>n+Number(s.score||0),0)/students.length)*10)/10;
  },[students]);
  const report = useMemo(()=>{
    const total=students.length||1;
    const attendanceRate=Math.round((totals.present/total)*100);
    const sorted=[...students].sort((a,b)=>Number(b.score||0)-Number(a.score||0));
    const high=students.filter(s=>Number(s.score||0)>=17).length;
    const support=students.filter(s=>Number(s.score||0)<12).length;
    return {attendanceRate,sorted,high,support,top:sorted[0],lowest:sorted[sorted.length-1]};
  },[students,totals]);

  const exportReport=()=>{
    const lines=[
      'تقرير معلّم — ملخص الصف',
      `عدد الطلاب: ${students.length}`,
      `الحضور: ${totals.present} | الغياب: ${totals.absent} | التأخير: ${totals.late}`,
      `نسبة الحضور: ${report.attendanceRate}%`,
      `متوسط العلامات: ${average}/20`,
      '',
      'الطلاب:',
      ...students.map((s,i)=>`${i+1}. ${s.name} — ${s.score}/20 — ${statusMeta[s.status]?.label||s.status}`)
    ];
    const blob=new Blob([lines.join('\n')],{type:'text/plain;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.download='moallem-class-report.txt'; a.click();
    URL.revokeObjectURL(url);
  };

  const setStatus=(id,status)=>setStudents(s=>s.map(x=>x.id===id?{...x,status}:x));
  const setScore=(id,score)=>setStudents(s=>s.map(x=>x.id===id?{...x,score:Math.max(0,Math.min(20,Number(score)||0))}:x));
  const addStudent=()=>setStudents(s=>[...s,{id:Date.now(),name:'طالب جديد',status:'present',score:0}]);
  const renameStudent=(id,name)=>setStudents(s=>s.map(x=>x.id===id?{...x,name}:x));
  const removeStudent=id=>setStudents(s=>s.filter(x=>x.id!==id));
  const generateQuestionSet=()=>{
    const templates = [
      {type:'اختيار من متعدد', text:`أي عبارة تصف بشكل أدق الفكرة الأساسية في درس ${topic}؟`, answer:'الإجابة التي يحددها المدرّس بعد مراجعة الدرس.'},
      {type:'صح أو خطأ', text:`صح أم خطأ: يمكن تفسير أحد مفاهيم ${topic} بمثال من الحياة اليومية.`, answer:'صح'},
      {type:'سؤال قصير', text:`اشرح بأسلوبك مفهوماً أساسياً من درس ${topic}.`, answer:'إجابة مفتوحة وفق عناصر الدرس.'},
      {type:'تطبيق', text:`اذكر مثالاً تطبيقياً على ${topic} وفسّر سبب اختيارك.`, answer:'إجابة تطبيقية يراجعها المدرّس.'},
      {type:'مقارنة', text:`قارن بين مفهومين مرتبطين بدرس ${topic} من حيث الوظيفة أو الخصائص.`, answer:'تُقبل المقارنة الصحيحة وفق محتوى الدرس.'},
      {type:'اختيار من متعدد', text:`ما الخطوة الأنسب للتحقق من فهم درس ${topic}؟`, answer:'تطبيق المفهوم في موقف جديد.'},
      {type:'سؤال قصير', text:`اذكر نقطتين مهمتين تعلمتهما من ${topic}.`, answer:'نقطتان صحيحتان من محتوى الدرس.'},
      {type:'تفكير', text:`ماذا تتوقع أن يحدث لو تغيّر أحد العوامل الأساسية في ${topic}؟ علّل.`, answer:'إجابة منطقية مدعومة بتعليل.'},
      {type:'صح أو خطأ', text:`صح أم خطأ: الحفظ وحده يكفي لإتقان ${topic}.`, answer:'خطأ'},
      {type:'تطبيق', text:`صمّم سؤالاً من حياتك اليومية يرتبط بدرس ${topic} ثم أجب عنه.`, answer:'إجابة مفتوحة صحيحة الصلة بالدرس.'},
    ];
    const count=Math.max(1,Math.min(10,Number(testCount)||5));
    const made=templates.slice(0,count).map((q,i)=>({
      id:Date.now()+i, grade, subject, topic, difficulty:testDifficulty==='متنوع'?(i%3===0?'سهل':i%3===1?'متوسط':'صعب'):testDifficulty, ...q
    }));
    setDraftTest(made);
  };
  const saveDraftTest=()=>{
    if(!draftTest.length) return;
    const test={id:Date.now(), title:testTitle || 'اختبار بدون عنوان', grade, subject, topic, createdAt:new Date().toLocaleDateString('ar'), questions:draftTest};
    setTests(t=>[test,...t]);
    setQuestions(q=>[...draftTest,...q]);
    setSaved(true);
  };
  const deleteQuestion=id=>setQuestions(q=>q.filter(x=>x.id!==id));
  const addLesson=()=>{
    if(!newLesson.subject.trim()) return;
    setSchedule(s=>[...s,{...newLesson,id:Date.now()}]);
  };
  const removeLesson=id=>setSchedule(s=>s.filter(x=>x.id!==id));
  const addTask=()=>{
    if(!newTask.trim()) return;
    setTasks(t=>[{id:Date.now(),title:newTask.trim(),due:'اليوم',done:false,priority:'عادي'},...t]);
    setNewTask('');
  };
  const toggleTask=id=>setTasks(t=>t.map(x=>x.id===id?{...x,done:!x.done}:x));
  const removeTask=id=>setTasks(t=>t.filter(x=>x.id!==id));
  const pendingTasks=tasks.filter(t=>!t.done).length;
  const todayName=getTodayName();
  const todayLessons=useMemo(()=>schedule.filter(l=>l.day===todayName).sort((a,b)=>a.time.localeCompare(b.time)).slice(0,3),[schedule,todayName]);



  return <div className="app-shell">
    <header className="topbar">
      <div className="brand-wrap">
        <div className="brand-icon"><BookOpen size={24}/></div>
        <div><h1>معلّم</h1><p>تطبيقك اليومي لإدارة الصف بسهولة وذكاء</p></div>
      </div>
      <div className="top-pills"><div className="offline-pill"><WifiOff size={15}/> يعمل دون إنترنت</div>{saved&&<div className="save-pill"><Save size={14}/> تم الحفظ</div>}</div>
    </header>

    <main className="content">
      {tab==='home' && <>
        <section className="hero-card">
          <div>
            <span className="eyebrow">مساء الخير 👋</span>
            <h2>شو بدك ننجز لحصة اليوم؟</h2>
            <p>المساعد الذكي جاهز يساعدك بالتحضير، الأسئلة، الأنشطة، والتقارير.</p>
            <button className="primary" onClick={()=>setTab('ai')}><Sparkles size={18}/> ابدأ مع المساعد الذكي</button>
          </div>
          <div className="hero-bot"><Bot size={64}/></div>
        </section>

        <section className="stats-grid">
          <Stat icon={<Users/>} value={students.length} label="طالباً" tone="green"/>
          <Stat icon={<CheckCircle2/>} value={totals.present} label="حاضراً" tone="blue"/>
          <Stat icon={<ClipboardList/>} value={pendingTasks} label="مهام معلّقة" tone="orange"/>
          <Stat icon={<CalendarDays/>} value={todayLessons.length} label="حصص اليوم" tone="purple"/>
        </section>

        <section className="section-head"><div><span className="eyebrow">يومي كمدرّس</span><h3>الحصص القادمة</h3></div><button className="text-btn" onClick={()=>setTab('schedule')}>عرض الجدول <ChevronLeft size={16}/></button></section>
        <div className="lesson-list">{todayLessons.length?todayLessons.map((l,i)=><div className="lesson-card" key={l.id}><div className="time-badge"><Clock3 size={16}/>{l.time}</div><div className="lesson-main"><strong>{l.subject}</strong><span>{l.className} • {l.room}</span></div><span className="status">{i===0?'القادمة':'لاحقاً'}</span></div>):<div className="empty-state compact"><CalendarDays size={28}/><p>ما عندك حصص مسجلة اليوم. أضفها من الجدول الأسبوعي.</p></div>}</div>

        <section className="quick-grid">
          <Quick icon={<Bot/>} title="تحضير ذكي" text="أنشئ خطة حصة بثوانٍ" onClick={()=>setTab('ai')}/>
          <Quick icon={<Users/>} title="الحضور" text="تسجيل سريع بضغطة" onClick={()=>setTab('students')}/>
          <Quick icon={<FileText/>} title="إنشاء اختبار" text="أسئلة مع إجابات" onClick={()=>setTab('tests')}/>
          <Quick icon={<GraduationCap/>} title="تقارير الطلاب" text="ملخص أداء واضح" onClick={()=>setTab('reports')}/>
        </section>
      </>}

      {tab==='ai' && <section className="workspace-card">
        <div className="assistant-title"><div className="assistant-avatar"><Bot size={26}/></div><div><span className="eyebrow">مساعد معلّم الذكي</span><h2>تحضير درس جديد</h2></div></div>
        <div className="form-grid">
          <label>الصف<select value={grade} onChange={e=>setGrade(e.target.value)}><option>السابع</option><option>الثامن</option></select></label>
          <label>المادة<select value={subject} onChange={e=>setSubject(e.target.value)}><option>علوم عامة</option><option>فيزياء</option><option>كيمياء</option><option>أحياء</option></select></label>
          <label className="full">عنوان الدرس<input value={topic} onChange={e=>setTopic(e.target.value)} placeholder="مثال: الجهاز التنفسي"/></label>
        </div>
        <button className="primary wide" onClick={()=>setPlan(generated)}><Sparkles size={18}/> جهّز الحصة</button><button className="secondary wide" onClick={()=>setTab('tests')}><FileText size={18}/> إنشاء اختبار من نفس الدرس</button>
        {plan ? <div className="generated"><div className="generated-head"><strong>خطة الدرس المقترحة</strong><span>{subject} • الصف {grade}</span></div><pre>{plan}</pre></div> : <div className="empty-state"><Sparkles size={32}/><p>اختر الصف والمادة واكتب عنوان الدرس، وأنا أجهز لك مسودة قابلة للتعديل.</p></div>}
      </section>}

      {tab==='students' && <section className="workspace-card students-page">
        <div className="students-head"><div><span className="eyebrow">إدارة الصف</span><h2>الحضور والعلامات</h2><p>كل تعديل ينحفظ تلقائياً على الجهاز ويظل موجوداً بدون إنترنت.</p></div><button className="icon-btn" onClick={addStudent}><Plus size={19}/></button></div>
        <div className="attendance-summary">
          <MiniStat label="حاضر" value={totals.present} cls="ok"/><MiniStat label="غائب" value={totals.absent} cls="bad"/><MiniStat label="متأخر" value={totals.late} cls="warn"/><MiniStat label="المتوسط" value={`${average}/20`} cls="score"/>
        </div>
        <div className="student-list">
          {students.map((s,index)=><div className="student-card" key={s.id}>
            <div className="student-number">{index+1}</div>
            <div className="student-info"><input className="name-input" value={s.name} onChange={e=>renameStudent(s.id,e.target.value)}/><div className="status-actions">{Object.entries(statusMeta).map(([key,m])=>{const Icon=m.icon;return <button key={key} className={`status-btn ${key} ${s.status===key?'selected':''}`} onClick={()=>setStatus(s.id,key)}><Icon size={15}/>{m.label}</button>})}</div></div>
            <label className="score-box"><Award size={15}/><input type="number" min="0" max="20" value={s.score} onChange={e=>setScore(s.id,e.target.value)}/><span>/20</span></label>
            <button className="delete-btn" onClick={()=>removeStudent(s.id)} aria-label="حذف الطالب"><Trash2 size={17}/></button>
          </div>)}
        </div>
        {!students.length && <div className="empty-state"><Users size={30}/><p>ما في طلاب حالياً. اضغط زر + لإضافة أول طالب.</p></div>}
        <div className="privacy-note"><CheckCircle2 size={18}/><div><strong>بيانات النسخة الحالية محلية</strong><span>أسماء الطلاب والعلامات والحضور تُحفظ على هذا الجهاز فقط، ولا تُرسل إلى خدمة ذكاء اصطناعي.</span></div></div>
      </section>}

      {tab==='tests' && <section className="workspace-card tests-page">
        <div className="students-head"><div><span className="eyebrow">الاختبارات وبنك الأسئلة</span><h2>أنشئ اختباراً خلال دقائق</h2><p>هذه النسخة تولّد مسودة محلية قابلة للمراجعة. عند ربط الذكاء الاصطناعي الحقيقي سنستخدم نفس الواجهة.</p></div><div className="assistant-avatar"><WandSparkles size={24}/></div></div>

        <div className="test-builder">
          <label>عنوان الاختبار<input value={testTitle} onChange={e=>setTestTitle(e.target.value)}/></label>
          <label>الصف<select value={grade} onChange={e=>setGrade(e.target.value)}><option>السابع</option><option>الثامن</option></select></label>
          <label>المادة<select value={subject} onChange={e=>setSubject(e.target.value)}><option>علوم عامة</option><option>فيزياء</option><option>كيمياء</option><option>أحياء</option></select></label>
          <label>الدرس<input value={topic} onChange={e=>setTopic(e.target.value)}/></label>
          <label>عدد الأسئلة<input type="number" min="1" max="10" value={testCount} onChange={e=>setTestCount(e.target.value)}/></label>
          <label>المستوى<select value={testDifficulty} onChange={e=>setTestDifficulty(e.target.value)}><option>متنوع</option><option>سهل</option><option>متوسط</option><option>صعب</option></select></label>
        </div>
        <button className="primary wide" onClick={generateQuestionSet}><Sparkles size={18}/> أنشئ مسودة الاختبار</button>

        {draftTest.length>0 && <div className="draft-test">
          <div className="section-head"><div><span className="eyebrow">مسودة جاهزة للمراجعة</span><h3>{testTitle}</h3></div><button className="text-btn" onClick={saveDraftTest}><Save size={16}/> حفظ في بنك الأسئلة</button></div>
          {draftTest.map((q,i)=><div className="question-card" key={q.id}>
            <div className="question-meta"><span>سؤال {i+1}</span><span>{q.type}</span><span>{q.difficulty}</span></div>
            <strong>{q.text}</strong>
            <div className="answer-box"><CircleHelp size={16}/><span><b>الإجابة المقترحة:</b> {q.answer}</span></div>
          </div>)}
        </div>}

        <div className="bank-head"><div><LibraryBig size={21}/><div><strong>بنك الأسئلة</strong><span>{questions.length} سؤال محفوظ على الجهاز</span></div></div><span className="offline-pill"><WifiOff size={14}/> متاح بدون إنترنت</span></div>
        <div className="question-bank">
          {questions.slice().reverse().map(q=><div className="bank-card" key={q.id}>
            <div><div className="question-meta"><span>{q.subject}</span><span>الصف {q.grade}</span><span>{q.difficulty}</span></div><strong>{q.text}</strong><small>{q.topic} • {q.type}</small></div>
            <button className="delete-btn" onClick={()=>deleteQuestion(q.id)}><Trash2 size={16}/></button>
          </div>)}
        </div>

        {tests.length>0 && <div className="saved-tests"><span className="eyebrow">اختبارات محفوظة</span><div className="saved-test-grid">{tests.map(t=><div className="saved-test-card" key={t.id}><FileText size={21}/><strong>{t.title}</strong><span>{t.subject} • الصف {t.grade}</span><small>{t.questions.length} أسئلة • {t.createdAt}</small></div>)}</div></div>}
      </section>}

      {tab==='schedule' && <section className="workspace-card schedule-page">
        <div className="students-head">
          <div><span className="eyebrow">تنظيم أسبوعك</span><h2>الجدول والمهام</h2><p>الحصص والمهام محفوظة على الجهاز وتعمل بدون إنترنت.</p></div>
          <button className={`reminder-toggle ${remindersEnabled?'on':''}`} onClick={()=>setRemindersEnabled(v=>!v)}><Bell size={18}/>{remindersEnabled?'التنبيهات مفعلة':'التنبيهات متوقفة'}</button>
        </div>

        <div className="day-tabs">{['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس'].map(d=><button key={d} className={scheduleDay===d?'active':''} onClick={()=>setScheduleDay(d)}>{d}</button>)}</div>

        <div className="schedule-list">
          {schedule.filter(l=>l.day===scheduleDay).sort((a,b)=>a.time.localeCompare(b.time)).map(l=><div className="schedule-card" key={l.id}>
            <div className="schedule-time"><Clock3 size={17}/><strong>{l.time}</strong></div>
            <div className="schedule-info"><strong>{l.subject}</strong><span>{l.className} • {l.room}</span></div>
            <button className="delete-btn" onClick={()=>removeLesson(l.id)}><Trash2 size={16}/></button>
          </div>)}
          {!schedule.some(l=>l.day===scheduleDay)&&<div className="empty-state"><CalendarDays size={30}/><p>ما عندك حصص مسجلة يوم {scheduleDay}.</p></div>}
        </div>

        <div className="add-panel">
          <div className="section-head"><div><span className="eyebrow">إضافة سريعة</span><h3>حصة جديدة</h3></div><CalendarPlus size={22}/></div>
          <div className="schedule-form">
            <select value={newLesson.day} onChange={e=>setNewLesson({...newLesson,day:e.target.value})}>{['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس'].map(d=><option key={d}>{d}</option>)}</select>
            <input type="time" value={newLesson.time} onChange={e=>setNewLesson({...newLesson,time:e.target.value})}/>
            <input value={newLesson.subject} onChange={e=>setNewLesson({...newLesson,subject:e.target.value})} placeholder="المادة"/>
            <input value={newLesson.className} onChange={e=>setNewLesson({...newLesson,className:e.target.value})} placeholder="الصف"/>
            <input value={newLesson.room} onChange={e=>setNewLesson({...newLesson,room:e.target.value})} placeholder="الشعبة"/>
            <button className="primary" onClick={addLesson}><Plus size={17}/> إضافة الحصة</button>
          </div>
        </div>

        <div className="tasks-section">
          <div className="section-head"><div><span className="eyebrow">مهامي</span><h3>{pendingTasks} مهام متبقية</h3></div><ListTodo size={22}/></div>
          <div className="task-add"><input value={newTask} onChange={e=>setNewTask(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addTask()} placeholder="مثال: تصحيح دفاتر الصف الثامن"/><button className="primary" onClick={addTask}><Plus size={17}/> إضافة</button></div>
          <div className="task-list">{tasks.map(t=><div className={`task-card ${t.done?'done':''}`} key={t.id}>
            <button className="task-check" onClick={()=>toggleTask(t.id)}>{t.done?<Check size={17}/>:<span/>}</button>
            <div><strong>{t.title}</strong><span>{t.due} • {t.priority}</span></div>
            <button className="delete-btn" onClick={()=>removeTask(t.id)}><Trash2 size={16}/></button>
          </div>)}</div>
        </div>

        <div className="notice-card"><Bell size={20}/><div><strong>تنبيه قبل الحصة</strong><span>{remindersEnabled?'سيكون النظام جاهزاً لتنبيهك قبل الحصة بـ 10 دقائق عند تحويل المشروع لتطبيق Android.':'فعّل التنبيهات لتجهيز تذكير قبل الحصة.'}</span></div></div>
      </section>}


      {tab==='reports' && <section className="workspace-card reports-page">
        <div className="students-head">
          <div><span className="eyebrow">تحليل أداء الصف</span><h2>التقارير والملخصات</h2><p>قراءة سريعة للحضور والعلامات، مع إبراز الطلاب المتفوقين ومن يحتاجون متابعة.</p></div>
          <button className="primary report-export" onClick={exportReport}><Download size={17}/> تصدير التقرير</button>
        </div>

        <div className="report-kpis">
          <div className="report-kpi"><div className="kpi-icon"><Users size={20}/></div><strong>{students.length}</strong><span>عدد الطلاب</span></div>
          <div className="report-kpi"><div className="kpi-icon"><UserCheck size={20}/></div><strong>{report.attendanceRate}%</strong><span>نسبة الحضور</span></div>
          <div className="report-kpi"><div className="kpi-icon"><Award size={20}/></div><strong>{average}/20</strong><span>متوسط العلامات</span></div>
          <div className="report-kpi"><div className="kpi-icon"><Medal size={20}/></div><strong>{report.high}</strong><span>أداء مرتفع</span></div>
        </div>

        <div className="report-grid">
          <div className="report-panel">
            <div className="section-head"><div><span className="eyebrow">الحضور</span><h3>توزيع حالة الطلاب</h3></div><BarChart3 size={22}/></div>
            <div className="bar-row"><span>حاضر</span><div className="bar-track"><i className="bar present-bar" style={{width:`${students.length?totals.present/students.length*100:0}%`}}/></div><b>{totals.present}</b></div>
            <div className="bar-row"><span>غائب</span><div className="bar-track"><i className="bar absent-bar" style={{width:`${students.length?totals.absent/students.length*100:0}%`}}/></div><b>{totals.absent}</b></div>
            <div className="bar-row"><span>متأخر</span><div className="bar-track"><i className="bar late-bar" style={{width:`${students.length?totals.late/students.length*100:0}%`}}/></div><b>{totals.late}</b></div>
          </div>

          <div className="report-panel">
            <div className="section-head"><div><span className="eyebrow">ملخص ذكي</span><h3>ماذا يحتاج انتباهك؟</h3></div><Sparkles size={22}/></div>
            <div className="insight good"><TrendingUp size={19}/><div><strong>{report.top?.name||'—'}</strong><span>أعلى علامة حالياً: {report.top?.score||0}/20</span></div></div>
            <div className="insight warn"><AlertTriangle size={19}/><div><strong>{report.support} طلاب</strong><span>علامتهم أقل من 12 ويستحسن متابعتهم.</span></div></div>
            <div className="insight neutral"><UserX size={19}/><div><strong>{totals.absent} غياب</strong><span>راجع الغياب قبل إعداد الملخص الأسبوعي.</span></div></div>
          </div>
        </div>

        <div className="student-performance">
          <div className="section-head"><div><span className="eyebrow">ترتيب سريع</span><h3>أداء الطلاب</h3></div><span className="offline-pill"><WifiOff size={14}/> محفوظ محلياً</span></div>
          <div className="performance-list">
            {report.sorted.map((s,i)=><div className="performance-row" key={s.id}>
              <div className="rank">{i+1}</div>
              <div className="performance-name"><strong>{s.name}</strong><span>{statusMeta[s.status]?.label}</span></div>
              <div className="score-progress"><div><i style={{width:`${Math.min(100,(Number(s.score||0)/20)*100)}%`}}/></div><b>{s.score}/20</b></div>
            </div>)}
          </div>
        </div>

        <div className="period-summary">
          <button className="period-card active"><span>هذا الأسبوع</span><strong>{average}/20</strong><small>متوسط الصف الحالي</small></button>
          <button className="period-card"><span>هذا الشهر</span><strong>{report.attendanceRate}%</strong><small>مؤشر الحضور الحالي</small></button>
        </div>
        <div className="notice-card"><Sparkles size={20}/><div><strong>جاهز للذكاء الاصطناعي الحقيقي</strong><span>بعد ربط خدمة الذكاء الاصطناعي، سيحوّل «معلّم» هذه البيانات إلى ملخص أسبوعي وشهري مكتوب تلقائياً، مع بقاء اعتماد التقرير النهائي بيد المدرّس.</span></div></div>
      </section>}

    </main>

    <nav className="bottom-nav">
      <button className={tab==='home'?'active':''} onClick={()=>setTab('home')}><Home/><span>الرئيسية</span></button>
      <button className={tab==='ai'?'active':''} onClick={()=>setTab('ai')}><Bot/><span>المساعد</span></button>
      <button className={tab==='students'?'active':''} onClick={()=>setTab('students')}><Users/><span>الطلاب</span></button>
      <button className={tab==='schedule'?'active':''} onClick={()=>setTab('schedule')}><CalendarDays/><span>الجدول</span></button>
    </nav>
  </div>
}

function Stat({icon,value,label,tone}){return <div className={`stat-card ${tone}`}><div className="stat-icon">{icon}</div><div><strong>{value}</strong><span>{label}</span></div></div>}
function Quick({icon,title,text,onClick}){return <button className="quick-card" onClick={onClick}><div className="quick-icon">{icon}</div><div><strong>{title}</strong><span>{text}</span></div><ChevronLeft size={18}/></button>}
function MiniStat({label,value,cls}){return <div className={`mini-stat ${cls}`}><strong>{value}</strong><span>{label}</span></div>}

createRoot(document.getElementById('root')).render(<App/>);
