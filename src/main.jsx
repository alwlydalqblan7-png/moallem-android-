import React, {useEffect, useMemo, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Home,Users,TableProperties,ClipboardList,Bot,Settings,Plus,Trash2,Save,Edit3,Printer as PrinterIcon,Sparkles,WifiOff,Wifi,ArrowUpDown,GraduationCap,FileText,Search,UserPlus,ChevronLeft,ChevronRight,BookOpen,CheckCircle2,Clock3,Layers3,Library,Upload,FolderOpen,CalendarDays,RefreshCw} from 'lucide-react';
import {Printer} from '@capgo/capacitor-printer';
import {App as CapacitorApp} from '@capacitor/app';
import './styles.css';
import moallemIcon from './assets/moallem-icon.png';

const DEFAULT_GRADES=['السابع','الثامن','التاسع','العاشر','الحادي عشر','البكالوريا'];
const DEFAULT_SECTIONS=['أ','ب'];
const GENERAL_SCIENCE_GRADES=['السابع','الثامن','التاسع'];
const GENERAL_SCIENCE_BRANCHES=[{id:'biology',name:'علم الأحياء والأرض',max:200},{id:'physics',name:'الفيزياء',max:120},{id:'chemistry',name:'الكيمياء',max:80}];
const GENERAL_SCIENCE_TOTAL=400;
const DEFAULT_SUBJECTS=['اللغة العربية','اللغة الإنكليزية','اللغة الفرنسية','الرياضيات','العلوم العامة','الفيزياء','الكيمياء','علم الأحياء','علم الأرض','التاريخ','الجغرافيا','المعلوماتية','التربية الدينية','التربية الفنية','التربية الموسيقية','التربية الرياضية'];
const seedStudents=[
{id:1,name:'أحمد محمد',grade:'السابع',section:'أ'},{id:2,name:'سارة خالد',grade:'السابع',section:'أ'},{id:3,name:'وليد محمود',grade:'السابع',section:'أ'},
{id:4,name:'لانا علي',grade:'السابع',section:'ب'},{id:5,name:'عمر حسن',grade:'الثامن',section:'أ'},{id:6,name:'ريم يوسف',grade:'الثامن',section:'أ'}];
const seedColumns=[{id:'c1',name:'مذاكرة 1',max:10,type:'مذاكرة'},{id:'c2',name:'واجب',max:5,type:'واجب'},{id:'c3',name:'امتحان',max:50,type:'امتحان'}];
const load=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}};
const persist=(k,v)=>localStorage.setItem(k,JSON.stringify(v));

const PDF_DB='moallem_library';
const PDF_STORE='pdfs';
const openPdfDb=()=>new Promise((resolve,reject)=>{const r=indexedDB.open(PDF_DB,1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(PDF_STORE))r.result.createObjectStore(PDF_STORE)};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
const savePdfBlob=async(id,blob)=>{const db=await openPdfDb();await new Promise((resolve,reject)=>{const tx=db.transaction(PDF_STORE,'readwrite');tx.objectStore(PDF_STORE).put(blob,String(id));tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});db.close()};
const getPdfBlob=async(id)=>{const db=await openPdfDb();const blob=await new Promise((resolve,reject)=>{const r=db.transaction(PDF_STORE,'readonly').objectStore(PDF_STORE).get(String(id));r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});db.close();return blob};
const deletePdfBlob=async(id)=>{const db=await openPdfDb();await new Promise((resolve,reject)=>{const tx=db.transaction(PDF_STORE,'readwrite');tx.objectStore(PDF_STORE).delete(String(id));tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});db.close()};

const extractPdfPages=async(blob,startPage,endPage)=>{
 const pdfjs=await import('pdfjs-dist');
 pdfjs.GlobalWorkerOptions.workerSrc=new URL('pdfjs-dist/build/pdf.worker.min.mjs',import.meta.url).toString();
 const pdf=await pdfjs.getDocument({data:new Uint8Array(await blob.arrayBuffer())}).promise;
 const start=Math.max(1,Math.min(Number(startPage)||1,pdf.numPages));
 const end=Math.max(start,Math.min(Number(endPage)||start,pdf.numPages));
 const parts=[];
 for(let pageNo=start;pageNo<=end;pageNo++){
  const page=await pdf.getPage(pageNo);
  const content=await page.getTextContent();
  const text=content.items.map(item=>item.str||'').join(' ').replace(/\s+/g,' ').trim();
  parts.push(`[صفحة ${pageNo}]\n${text}`);
 }
 const text=parts.join('\n\n').trim();
 if(!text)throw new Error('لم أتمكن من استخراج نص من الصفحات المحددة. قد يكون الكتاب صورًا ممسوحة ضوئيًا.');
 return{text,start,end,totalPages:pdf.numPages};
};


function App(){
 const [tab,setTab]=useState('home');
 const [grades,setGrades]=useState(()=>load('m2_grades',DEFAULT_GRADES));
 const [sections,setSections]=useState(()=>load('m2_sections',DEFAULT_SECTIONS));
 const [subjects,setSubjects]=useState(()=>load('m2_subjects',DEFAULT_SUBJECTS));
 const [students,setStudents]=useState(()=>load('m2_students',seedStudents));
 const [attendance,setAttendance]=useState(()=>load('m2_attendance',{}));
 const [gradebooks,setGradebooks]=useState(()=>load('m2_gradebooks',{}));
 const [grade,setGrade]=useState(()=>load('m2_grade','السابع'));
 const [section,setSection]=useState(()=>load('m2_section','أ'));
 const [subject,setSubject]=useState(()=>load('m2_subject','العلوم العامة'));
 const [editMode,setEditMode]=useState(false);
 const [online,setOnline]=useState(navigator.onLine);
 const [aiPrompt,setAiPrompt]=useState('');
 const [aiResult,setAiResult]=useState('');
 const [aiLoading,setAiLoading]=useState(false);
 const [aiError,setAiError]=useState('');
 const [search,setSearch]=useState('');
 const [libraryBooks,setLibraryBooks]=useState(()=>load('m2_library_books',[]));
 const [libraryTitle,setLibraryTitle]=useState('');
 const [libraryMessage,setLibraryMessage]=useState('');
 const [plannerBook,setPlannerBook]=useState(null);
 const [plannerStart,setPlannerStart]=useState('');
 const [plannerEnd,setPlannerEnd]=useState('');
 const [plannerPeriods,setPlannerPeriods]=useState(3);
 const [plannerHolidays,setPlannerHolidays]=useState('');
 const [savedPlans,setSavedPlans]=useState(()=>load('m2_curriculum_plans',[]));
 const [savedPreparations,setSavedPreparations]=useState(()=>load('m2_pdf_preparations',[]));
 const [selectedBookId,setSelectedBookId]=useState('');
 const [lessonTitle,setLessonTitle]=useState('');
 const [pageStart,setPageStart]=useState(1);
 const [pageEnd,setPageEnd]=useState(2);
 const [editingPreparationId,setEditingPreparationId]=useState(null);
 const pdfInputRef=useRef(null);
 const [reportPreview,setReportPreview]=useState(false);
 const tabRef=useRef(tab);
 const reportPreviewRef=useRef(reportPreview);
 useEffect(()=>{tabRef.current=tab},[tab]);
 useEffect(()=>{reportPreviewRef.current=reportPreview},[reportPreview]);
 useEffect(()=>{
  let handle;
  CapacitorApp.addListener('backButton',()=>{
   if(reportPreviewRef.current){setReportPreview(false);return}
   if(tabRef.current!=='home'){setTab('home');return}
   CapacitorApp.exitApp();
  }).then(h=>{handle=h});
  return ()=>{handle&&handle.remove()};
 },[]);
 useEffect(()=>{const a=()=>setOnline(true),b=()=>setOnline(false);addEventListener('online',a);addEventListener('offline',b);return()=>{removeEventListener('online',a);removeEventListener('offline',b)}},[]);
 useEffect(()=>persist('m2_grades',grades),[grades]); useEffect(()=>persist('m2_sections',sections),[sections]); useEffect(()=>persist('m2_subjects',subjects),[subjects]);
 useEffect(()=>persist('m2_students',students),[students]); useEffect(()=>persist('m2_attendance',attendance),[attendance]); useEffect(()=>persist('m2_gradebooks',gradebooks),[gradebooks]);
 useEffect(()=>persist('m2_grade',grade),[grade]); useEffect(()=>persist('m2_section',section),[section]); useEffect(()=>persist('m2_subject',subject),[subject]); useEffect(()=>persist('m2_library_books',libraryBooks),[libraryBooks]); useEffect(()=>persist('m2_curriculum_plans',savedPlans),[savedPlans]); useEffect(()=>persist('m2_pdf_preparations',savedPreparations),[savedPreparations]);
 const compatibleBooks=useMemo(()=>libraryBooks.filter(b=>b.grade===grade&&b.subject===subject),[libraryBooks,grade,subject]);
 useEffect(()=>{if(!compatibleBooks.some(b=>String(b.id)===String(selectedBookId)))setSelectedBookId(compatibleBooks[0]?String(compatibleBooks[0].id):'')},[compatibleBooks,selectedBookId]);
 const classStudents=useMemo(()=>students.filter(s=>s.grade===grade&&s.section===section),[students,grade,section]);
 const visibleStudents=useMemo(()=>classStudents.filter(s=>!search||s.name.includes(search)),[classStudents,search]);
 const bookKey=`${grade}|${section}|${subject}`; const book=gradebooks[bookKey]||{columns:seedColumns,marks:{}};
 const updateBook=next=>setGradebooks(g=>({...g,[bookKey]:next}));
 const addColumn=()=>updateBook({...book,columns:[...book.columns,{id:'c'+Date.now(),name:'بند جديد',max:10,type:'نشاط'}]});
 const updateColumn=(id,patch)=>updateBook({...book,columns:book.columns.map(c=>c.id===id?{...c,...patch}:c)});
 const deleteColumn=id=>{const marks=structuredClone(book.marks||{});Object.values(marks).forEach(m=>delete m[id]);updateBook({...book,columns:book.columns.filter(c=>c.id!==id),marks})};
 const setMark=(sid,cid,val)=>updateBook({...book,marks:{...book.marks,[sid]:{...(book.marks[sid]||{}),[cid]:val===''?'':Number(val)}}});
 const calc=s=>{const m=book.marks[s.id]||{};let got=0,max=0;book.columns.forEach(c=>{if(m[c.id]!==''&&m[c.id]!=null&&!Number.isNaN(Number(m[c.id]))){got+=Number(m[c.id]);max+=Number(c.max)||0}});return{got,max,pct:max?Math.round(got/max*1000)/10:0}};
 const addStudent=()=>setStudents(x=>[...x,{id:Date.now(),name:'طالب جديد',grade,section}]);
 const renameStudent=(id,name)=>setStudents(x=>x.map(s=>s.id===id?{...s,name}:s));
 const deleteStudent=id=>setStudents(x=>x.filter(s=>s.id!==id));
 const sortArabic=()=>setStudents(x=>{const a=x.filter(s=>s.grade===grade&&s.section===section).sort((p,q)=>p.name.localeCompare(q.name,'ar'));const b=x.filter(s=>!(s.grade===grade&&s.section===section));return[...b,...a]});
 const setAtt=(id,v)=>setAttendance(a=>({...a,[`${grade}|${section}|${id}`]:v}));
 const addItem=kind=>{const v=prompt(`اكتب اسم ${kind} الجديد`);if(!v?.trim())return;if(kind==='الصف')setGrades(x=>[...x,v.trim()]);if(kind==='الشعبة')setSections(x=>[...x,v.trim()]);if(kind==='المادة')setSubjects(x=>[...x,v.trim()])};
 const renameItem=(kind,old)=>{const v=prompt(`تعديل اسم ${kind}`,old);if(!v?.trim()||v.trim()===old)return;const n=v.trim();if(kind==='الصف'){setGrades(x=>x.map(z=>z===old?n:z));setStudents(x=>x.map(s=>s.grade===old?{...s,grade:n}:s));if(grade===old)setGrade(n)}if(kind==='الشعبة'){setSections(x=>x.map(z=>z===old?n:z));setStudents(x=>x.map(s=>s.section===old?{...s,section:n}:s));if(section===old)setSection(n)}if(kind==='المادة'){setSubjects(x=>x.map(z=>z===old?n:z));if(subject===old)setSubject(n)}};
 const removeItem=(kind,v)=>{if(!confirm(`حذف ${kind}: ${v}؟`))return;if(kind==='الصف')setGrades(x=>x.filter(z=>z!==v));if(kind==='الشعبة')setSections(x=>x.filter(z=>z!==v));if(kind==='المادة')setSubjects(x=>x.filter(z=>z!==v))};

 const isGeneralScience=subject==='العلوم العامة'&&GENERAL_SCIENCE_GRADES.includes(grade);
 const savePlannerSettings=()=>{if(!plannerBook)return; if(!plannerStart||!plannerEnd){setLibraryMessage('حدد بداية ونهاية الفصل أولاً.');return} const plan={id:Date.now(),bookId:plannerBook.id,bookTitle:plannerBook.title,grade:plannerBook.grade,subject:plannerBook.subject,start:plannerStart,end:plannerEnd,periods:Number(plannerPeriods)||1,holidays:plannerHolidays.trim(),status:'بانتظار استخراج فهرس الكتاب',createdAt:new Date().toISOString()};setSavedPlans(x=>[plan,...x.filter(v=>v.bookId!==plannerBook.id)]);setLibraryMessage('تم حفظ إعدادات التخطيط. لن ننشئ توزيعاً وهمياً قبل قراءة فهرس الكتاب فعلياً.');setPlannerBook(null)};

 const addLibraryPdf=async(file)=>{
  if(!file)return;
  setLibraryMessage('');
  if(file.type!=='application/pdf'&&!file.name.toLowerCase().endsWith('.pdf')){setLibraryMessage('اختر ملف PDF فقط.');return}
  const id=Date.now();
  const title=(libraryTitle.trim()||file.name.replace(/\.pdf$/i,'')).trim();
  try{
   await savePdfBlob(id,file);
   setLibraryBooks(x=>[{id,title,grade,subject,branch:subject==='العلوم العامة'&&GENERAL_SCIENCE_GRADES.includes(grade)?(title.includes('فيزياء')||title.includes('كيمياء')?'الفيزياء والكيمياء':'علم الأحياء والأرض'):null,fileName:file.name,size:file.size,addedAt:new Date().toISOString()},...x]);
   setLibraryTitle('');
   setLibraryMessage('تم حفظ الكتاب في مكتبتك بنجاح.');
  }catch{setLibraryMessage('تعذر حفظ ملف PDF على هذا الجهاز. حاول مرة أخرى.')}
 };
 const openLibraryBook=async(bookItem)=>{
  setLibraryMessage('');
  try{
   const blob=await getPdfBlob(bookItem.id);
   if(!blob){setLibraryMessage('ملف PDF غير موجود على هذا الجهاز. أعد إضافته.');return}
   const url=URL.createObjectURL(blob); const w=window.open(url,'_blank');
   if(!w)setLibraryMessage('تم العثور على الملف، لكن تعذر فتح نافذة العرض على الجهاز.');
   setTimeout(()=>URL.revokeObjectURL(url),60000);
  }catch{setLibraryMessage('تعذر فتح الكتاب.')}
 };
 const editLibraryBook=(bookItem)=>{
  const title=prompt('اسم الكتاب',bookItem.title); if(!title?.trim())return;
  const nextGrade=prompt('الصف',bookItem.grade); if(!nextGrade?.trim())return;
  const nextSubject=prompt('المادة',bookItem.subject); if(!nextSubject?.trim())return;
  setLibraryBooks(x=>x.map(b=>b.id===bookItem.id?{...b,title:title.trim(),grade:nextGrade.trim(),subject:nextSubject.trim()}:b));
 };
 const removeLibraryBook=async(bookItem)=>{
  if(!confirm(`حذف الكتاب: ${bookItem.title}؟`))return;
  try{await deletePdfBlob(bookItem.id)}catch{}
  setLibraryBooks(x=>x.filter(b=>b.id!==bookItem.id));
  setLibraryMessage('تم حذف الكتاب.');
 };

 const aiRun=async()=>{
  const promptText=aiPrompt.trim();
  const selectedBook=libraryBooks.find(b=>String(b.id)===String(selectedBookId));
  if(!selectedBook){setAiError('اختر كتابًا محفوظًا من «مكتبتي» أولًا.');return}
  if(!lessonTitle.trim()){setAiError('اكتب اسم الدرس.');return}
  if(Number(pageStart)<1||Number(pageEnd)<Number(pageStart)){setAiError('تأكد من نطاق الصفحات المحدد.');return}
  setAiError('');
  if(!online){setAiError('الكتاب محفوظ على الجهاز، لكن توليد التحضير يحتاج اتصالًا بالإنترنت.');return}
  setAiLoading(true); setAiResult('');
  try{
   const blob=await getPdfBlob(selectedBook.id);
   if(!blob)throw new Error('ملف الكتاب غير موجود على هذا الجهاز. أعد إضافته إلى «مكتبتي».');
   const extracted=await extractPdfPages(blob,pageStart,pageEnd);
   if(extracted.text.length>45000)throw new Error('الصفحات المحددة طويلة جدًا. اختر نطاقًا أصغر.');
   const endpoint=(import.meta.env.VITE_AI_API_URL||'https://moallem-ai.liondangerous65.workers.dev/api/ai').trim();
   const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),45000);
   const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:promptText||`حضّر درس ${lessonTitle.trim()} اعتمادًا على النص المرجعي فقط.`,referenceText:extracted.text,context:{grade,section,subject,bookId:selectedBook.id,bookTitle:selectedBook.title,lessonTitle:lessonTitle.trim(),pageStart:extracted.start,pageEnd:extracted.end,totalPages:extracted.totalPages,task:'lesson_preparation'}}),signal:controller.signal}); clearTimeout(timer);
   const data=await response.json().catch(()=>({}));
   if(!response.ok)throw new Error(data?.error||`تعذر تنفيذ الطلب (${response.status})`);
   const text=data?.text||data?.answer||data?.result; if(!text)throw new Error('لم يُرجع الخادم إجابة صالحة.');
   const resultText=String(text); setAiResult(resultText);
   const preparation={id:editingPreparationId||Date.now(),bookId:selectedBook.id,bookTitle:selectedBook.title,grade,section,subject,lessonTitle:lessonTitle.trim(),pageStart:extracted.start,pageEnd:extracted.end,result:resultText,prompt:promptText,updatedAt:new Date().toISOString()};
   setSavedPreparations(x=>[preparation,...x.filter(p=>p.id!==preparation.id)]);
   setEditingPreparationId(preparation.id);
  }catch(err){setAiError(err?.name==='AbortError'?'انتهت مهلة الاتصال بالخادم. حاول مجددًا.':(err?.message||'تعذر الاتصال بخادم الذكاء الاصطناعي.'));}
  finally{setAiLoading(false);}
 };
 const editPreparation=p=>{setGrade(p.grade);setSection(p.section);setSubject(p.subject);setSelectedBookId(String(p.bookId));setLessonTitle(p.lessonTitle);setPageStart(p.pageStart);setPageEnd(p.pageEnd);setAiPrompt(p.prompt||'');setAiResult(p.result);setEditingPreparationId(p.id);setTab('ai')};
 const newPreparation=()=>{setEditingPreparationId(null);setLessonTitle('');setPageStart(1);setPageEnd(2);setAiPrompt('');setAiResult('');setAiError('')};
 const buildGradebookHtml=()=>{const heads=book.columns.map(c=>`<th>${c.name}<br><small>/${c.max}</small></th>`).join('');const rows=classStudents.map((s,i)=>{const c=calc(s);return`<tr><td>${i+1}</td><td>${s.name}</td>${book.columns.map(col=>`<td>${book.marks[s.id]?.[col.id]??''}</td>`).join('')}<td>${c.got}/${c.max}</td><td>${c.pct}%</td></tr>`}).join('');return`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>body{font-family:Arial;padding:24px}h1,h2{text-align:center}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #333;padding:7px;text-align:center}</style></head><body><h1>دفتر العلامات</h1><h2>${grade} — الشعبة ${section}</h2><p>المادة: ${subject}</p><table><tr><th>#</th><th>اسم الطالب</th>${heads}<th>المجموع</th><th>النسبة</th></tr>${rows}</table></body></html>`};
 const buildReportCardsHtml=()=>{const cards=classStudents.map(s=>{const c=calc(s);return`<section style="page-break-after:always;border:2px solid #1c3f66;padding:24px"><h2>جلاء مدرسي</h2><p><b>الطالب:</b> ${s.name}</p><p><b>الصف:</b> ${grade} — <b>الشعبة:</b> ${section}</p><p><b>المادة:</b> ${subject}</p><h3>المجموع: ${c.got}/${c.max} — النسبة: ${c.pct}%</h3><p><b>ملاحظات:</b> ______________________________</p></section>`}).join('');return`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>body{font-family:Arial;margin:0;padding:16px}</style></head><body>${cards}</body></html>`};
 const printDocument=async(name,html)=>{
  try{
   await Printer.printHtml({name,html});
  }catch(err){
   const w=open('','_blank');
   if(!w){alert('تعذر تنفيذ الطباعة.');return}
   w.document.write(html+"<script>onload=()=>print()</script>");
   w.document.close();
  }
 };
 const printGradebook=()=>printDocument('دفتر العلامات',buildGradebookHtml());
 const printReportCards=()=>printDocument('جلاء مدرسي',buildReportCardsHtml());
 const printPreparation=()=>{if(!aiResult)return;const escaped=aiResult.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/\n/g,'<br>');printDocument(`تحضير ${lessonTitle}`,`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>body{font-family:Arial;padding:28px;line-height:1.9}h1{color:#1c3f66}small{color:#555}</style></head><body><h1>تحضير درس: ${lessonTitle}</h1><small>${grade} · ${section} · ${subject} · الصفحات ${pageStart}-${pageEnd}</small><hr><div>${escaped}</div></body></html>`)};
 const previewStudents=classStudents.map(s=>({student:s,...calc(s)}));
 return <div className="app"><header className="top"><div className="brand"><img src={moallemIcon}/><div><h1>معلّم</h1><p>دفترك الرقمي اليومي</p></div></div><div className={`net ${online?'on':'off'}`}>{online?<Wifi size={16}/>:<WifiOff size={16}/>} {online?'متصل':'بدون إنترنت'}</div></header>
 {!reportPreview&&<div className="classbar"><select value={grade} onChange={e=>setGrade(e.target.value)}>{grades.map(x=><option key={x}>{x}</option>)}</select><select value={section} onChange={e=>setSection(e.target.value)}>{sections.map(x=><option key={x}>{x}</option>)}</select><select value={subject} onChange={e=>setSubject(e.target.value)}>{subjects.map(x=><option key={x}>{x}</option>)}</select></div>}
 <main>{reportPreview?<section className="preview-page"><div className="preview-toolbar"><button className="back-button" onClick={()=>setReportPreview(false)}><ChevronRight size={20}/> رجوع</button><div><span className="eyebrow">معاينة الجلاء</span><h2>{grade} — الشعبة {section}</h2><p>{subject}</p></div><button className="primary print-preview" onClick={printReportCards}><PrinterIcon size={17}/> طباعة</button></div><div className="preview-list">{previewStudents.length?previewStudents.map(({student,got,max,pct})=><article className="student-report-preview" key={student.id}><div className="report-badge"><GraduationCap size={22}/></div><div><small>جلاء مدرسي</small><h3>{student.name}</h3><p>{grade} — الشعبة {section} · {subject}</p></div><div className="report-score"><strong>{got}/{max}</strong><span>{pct}%</span></div></article>):<div className="empty-state">لا يوجد طلاب في الشعبة الحالية.</div>}</div><p className="note">زر الرجوع داخل الواجهة وزر Back في Android يعيدانك إلى شاشة التقارير مع بقاء الصف والشعبة والمادة والبيانات كما هي.</p></section>:<>{tab==='home'&&<div className="stack"><section className="hero"><div><span className="eyebrow">معلّم V2.5</span><h2>{grade} — الشعبة {section}</h2><p>{subject} · مساحة يومية واضحة لإدارة الصف بسرعة.</p></div><img src={moallemIcon} alt="شعار معلّم"/></section><section className="summary-grid"><div className="summary-card"><span className="summary-icon blue"><Layers3/></span><div><small>الصفوف</small><strong>{grades.length}</strong></div></div><div className="summary-card"><span className="summary-icon green"><Users/></span><div><small>الطلاب</small><strong>{students.length}</strong></div></div><div className="summary-card"><span className="summary-icon amber"><BookOpen/></span><div><small>المواد</small><strong>{subjects.length}</strong></div></div></section><div className="section-title"><div><span className="eyebrow">اختصارات</span><h3>أدواتك اليومية</h3></div><Clock3 size={20}/></div><div className="grid4"><Tile tone="blue" icon={<Users/>} title="الطلاب" text={`${classStudents.length} طالب`} onClick={()=>setTab('students')}/><Tile tone="cyan" icon={<TableProperties/>} title="دفتر العلامات" text="مرن وقابل للتعديل" onClick={()=>setTab('gradebook')}/><Tile tone="green" icon={<ClipboardList/>} title="الحضور" text="حسب الصف والشعبة" onClick={()=>setTab('attendance')}/><Tile tone="violet" icon={<FileText/>} title="الجلاء والطباعة" text="جاهز للطباعة" onClick={()=>setTab('reports')}/><Tile tone="cyan" icon={<Library/>} title="مكتبتي" text={`${libraryBooks.length} كتاب PDF`} onClick={()=>setTab('library')}/></div><section className="ai-card"><div><span className="ai-icon"><Sparkles/></span><div><strong>المساعد الذكي</strong><span>{online?'متصل وجاهز لتحضير الدروس':'وضع Offline فعال'}</span></div></div><button onClick={()=>setTab('ai')}>فتح المساعد</button></section></div>}
 {tab==='students'&&<section className="panel"><div className="panelhead"><div><span className="eyebrow">إدارة الطلاب</span><h2>{grade} — الشعبة {section}</h2></div><div className="actions"><button onClick={sortArabic}><ArrowUpDown size={17}/> ترتيب أبجدي</button><button className="primary" onClick={addStudent}><UserPlus size={17}/> إضافة طالب</button></div></div><div className="search"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="ابحث عن طالب..."/></div><div className="studentlist">{visibleStudents.map((s,i)=><div className="studentrow" key={s.id}><span className="num">{i+1}</span><input value={s.name} onChange={e=>renameStudent(s.id,e.target.value)}/><select value={s.grade} onChange={e=>setStudents(x=>x.map(v=>v.id===s.id?{...v,grade:e.target.value}:v))}>{grades.map(g=><option key={g}>{g}</option>)}</select><select value={s.section} onChange={e=>setStudents(x=>x.map(v=>v.id===s.id?{...v,section:e.target.value}:v))}>{sections.map(g=><option key={g}>{g}</option>)}</select><button className="danger" onClick={()=>deleteStudent(s.id)}><Trash2 size={16}/></button></div>)}</div></section>}
 {tab==='gradebook'&&<section className="panel"><div className="panelhead"><div><span className="eyebrow">دفتر العلامات</span><h2>{subject}</h2><p>{grade} — الشعبة {section}</p>{isGeneralScience&&<div className="science-scale">{GENERAL_SCIENCE_BRANCHES.map(b=><span key={b.id}>{b.name} <b>{b.max}</b></span>)}<strong>المجموع {GENERAL_SCIENCE_TOTAL}</strong></div>}</div><div className="actions"><button onClick={()=>setEditMode(v=>!v)}>{editMode?<Save size={17}/>:<Edit3 size={17}/>} {editMode?'حفظ':'تعديل'}</button><button className="primary" onClick={printGradebook}><PrinterIcon size={17}/> طباعة</button></div></div>{editMode&&<div className="column-tools"><button onClick={addColumn}><Plus size={16}/> إضافة عمود</button><span>اسم البند والعلامة العظمى قابلان للتعديل.</span></div>}<div className="tablewrap"><table className="gradebook"><thead><tr><th>#</th><th className="namecol">الطالب</th>{book.columns.map(c=><th key={c.id}>{editMode?<div className="coledit"><input value={c.name} onChange={e=>updateColumn(c.id,{name:e.target.value})}/><input type="number" value={c.max} onChange={e=>updateColumn(c.id,{max:Number(e.target.value)||0})}/><button onClick={()=>deleteColumn(c.id)}><Trash2 size={14}/></button></div>:<>{c.name}<small>/{c.max}</small></>}</th>)}<th>المجموع</th><th>النسبة</th></tr></thead><tbody>{classStudents.map((s,i)=>{const c=calc(s);return<tr key={s.id}><td>{i+1}</td><td className="namecol">{s.name}</td>{book.columns.map(col=><td key={col.id}><input className="mark" type="number" value={book.marks[s.id]?.[col.id]??''} onChange={e=>setMark(s.id,col.id,e.target.value)} placeholder="—"/></td>)}<td><b>{c.got}/{c.max}</b></td><td><b>{c.pct}%</b></td></tr>})}</tbody></table></div></section>}
 {tab==='attendance'&&<section className="panel"><div className="panelhead"><div><span className="eyebrow">الحضور والغياب</span><h2>{grade} — الشعبة {section}</h2></div></div><div className="studentlist">{classStudents.map((s,i)=>{const k=`${grade}|${section}|${s.id}`,st=attendance[k]||'present';return<div className="attrow" key={s.id}><span className="num">{i+1}</span><strong>{s.name}</strong><div className="seg">{['present','absent','late'].map(v=><button key={v} className={st===v?'active':''} onClick={()=>setAtt(s.id,v)}>{v==='present'?'حاضر':v==='absent'?'غائب':'متأخر'}</button>)}</div></div>})}</div></section>}
 {tab==='reports'&&<section className="panel"><div className="panelhead"><div><span className="eyebrow">التقارير والجلاء</span><h2>جاهز للطباعة</h2></div></div><div className="reportcards"><button className="reportcard" onClick={printGradebook}><TableProperties/><strong>دفتر العلامات</strong><span>أسماء الطلاب + البنود + المجاميع والنسب</span><PrinterIcon/></button><button className="reportcard" onClick={()=>setReportPreview(true)}><GraduationCap/><strong>جلاء مدرسي</strong><span>معاينة الجلاء قبل الطباعة</span><ChevronLeft/></button></div><p className="note">قالب الجلاء الحالي تجريبي، وسيتم توسيعه ليجمع عدة مواد وفترات في صفحة واحدة.</p></section>}
 {tab==='library'&&<section className="panel library-panel"><div className="panelhead"><div><span className="eyebrow">مكتبتي</span><h2>كتبك وموادك في مكان واحد</h2><p>أضف كتب PDF واربط كل كتاب بالصف والمادة والفرع الصحيح.</p>{isGeneralScience&&<div className="science-scale">{GENERAL_SCIENCE_BRANCHES.map(b=><span key={b.id}>{b.name} <b>{b.max}</b></span>)}<strong>العلوم العامة {GENERAL_SCIENCE_TOTAL}</strong></div>}</div></div><div className="library-add"><div className="library-fields"><input value={libraryTitle} onChange={e=>setLibraryTitle(e.target.value)} placeholder="اسم الكتاب (اختياري)"/><select value={grade} onChange={e=>setGrade(e.target.value)}>{grades.map(g=><option key={g}>{g}</option>)}</select><select value={subject} onChange={e=>setSubject(e.target.value)}>{subjects.map(s=><option key={s}>{s}</option>)}</select></div><input ref={pdfInputRef} className="hidden-file" type="file" accept="application/pdf,.pdf" onChange={e=>{const f=e.target.files?.[0];addLibraryPdf(f);e.target.value=''}}/><button className="primary library-upload" onClick={()=>pdfInputRef.current?.click()}><Upload size={18}/> إضافة كتاب PDF</button></div>{libraryMessage&&<div className="note">{libraryMessage}</div>}<div className="library-list">{libraryBooks.length?libraryBooks.map(b=><article className="library-book" key={b.id}><div className="library-cover"><BookOpen size={24}/></div><div className="library-info"><span>PDF · {b.grade} · {b.subject}{b.branch?` · ${b.branch}`:''}</span><h3>{b.title}</h3><small>{b.fileName} · {Math.max(1,Math.round((b.size||0)/1024/1024*10)/10)} MB</small></div><div className="library-actions"><button onClick={()=>openLibraryBook(b)}><FolderOpen size={16}/> فتح</button><button onClick={()=>editLibraryBook(b)}><Edit3 size={16}/> تعديل</button><button onClick={()=>{setPlannerBook(b);setLibraryMessage('')}}><CalendarDays size={16}/> التخطيط</button><button className="danger" onClick={()=>removeLibraryBook(b)}><Trash2 size={16}/></button></div></article>):<div className="empty-state"><Library size={28}/><strong>مكتبتك فارغة</strong><span>أضف أول كتاب PDF للبدء.</span></div>}</div>{plannerBook&&<div className="planner-box"><div className="panelhead"><div><span className="eyebrow">التخطيط الذكي</span><h3>{plannerBook.title}</h3><p>{plannerBook.grade} · {plannerBook.subject}{plannerBook.branch?` · ${plannerBook.branch}`:''}</p></div><button onClick={()=>setPlannerBook(null)}>إغلاق</button></div><div className="planner-fields"><label>بداية الفصل<input type="date" value={plannerStart} onChange={e=>setPlannerStart(e.target.value)}/></label><label>نهاية الفصل<input type="date" value={plannerEnd} onChange={e=>setPlannerEnd(e.target.value)}/></label><label>الحصص أسبوعياً<input type="number" min="1" max="12" value={plannerPeriods} onChange={e=>setPlannerPeriods(e.target.value)}/></label><label>العطل والتوقفات<textarea value={plannerHolidays} onChange={e=>setPlannerHolidays(e.target.value)} placeholder="مثال: عطلة من 10/10 إلى 12/10"/></label></div><div className="plan-levels"><span>فصلية</span><ChevronLeft/><span>شهرية</span><ChevronLeft/><span>أسبوعية</span><ChevronLeft/><span>تحضير الدرس</span></div><button className="primary wide" onClick={savePlannerSettings}><Save size={17}/> حفظ إعدادات التخطيط</button><p className="note">حماية من الهلوسة: لن يُنشئ التطبيق أسماء وحدات أو دروس من عنده. إنشاء الخطة يتفعّل بعد استخراج فهرس وصفحات هذا الـPDF فعلياً.</p></div>}<p className="note">الكتب تُحفظ محليًا على هذا الجهاز. التخطيط مرتبط بكل كتاب على حدة ويحافظ على الصف والمادة والفرع.</p></section>}
{tab==='ai'&&<section className="panel"><div className="panelhead"><div><span className="eyebrow">TAI-42 · التحضير من الكتاب</span><h2>{online?'تحضير ذكي موثّق':'الكتاب متاح دون إنترنت'}</h2><p>اختر كتابًا وصفحات محددة؛ لن يعتمد التحضير على إجابة عامة.</p></div><button onClick={newPreparation}><Plus size={16}/> تحضير جديد</button></div><div className="ai-source-grid"><label>الكتاب<select value={selectedBookId} onChange={e=>setSelectedBookId(e.target.value)}><option value="">اختر كتابًا</option>{compatibleBooks.map(b=><option key={b.id} value={b.id}>{b.title}</option>)}</select></label><label>اسم الدرس<input value={lessonTitle} onChange={e=>setLessonTitle(e.target.value)} placeholder="مثال: الجهاز التنفسي"/></label><label>من صفحة<input type="number" min="1" value={pageStart} onChange={e=>setPageStart(e.target.value)}/></label><label>إلى صفحة<input type="number" min="1" value={pageEnd} onChange={e=>setPageEnd(e.target.value)}/></label></div>{!compatibleBooks.length&&<div className="note">لا يوجد كتاب مربوط بالصف والمادة الحاليين. أضفه أولًا من «مكتبتي».</div>}<textarea className="prompt" value={aiPrompt} onChange={e=>setAiPrompt(e.target.value)} placeholder="تعليمات إضافية اختيارية للتحضير..."/><div className="actions"><button className="primary" onClick={aiRun} disabled={aiLoading||!compatibleBooks.length}>{aiLoading?'جارٍ قراءة الصفحات والتحضير...':<><Sparkles size={17}/> إنشاء وحفظ التحضير</>}</button>{aiResult&&<><button onClick={aiRun} disabled={aiLoading}><RefreshCw size={16}/> إعادة التوليد</button><button onClick={printPreparation}><PrinterIcon size={16}/> طباعة/PDF</button></>}</div>{aiError&&<div className="note" role="alert">{aiError}</div>}{aiResult&&<textarea className="airesult editable-result" value={aiResult} onChange={e=>{setAiResult(e.target.value);if(editingPreparationId)setSavedPreparations(x=>x.map(p=>p.id===editingPreparationId?{...p,result:e.target.value,updatedAt:new Date().toISOString()}:p))}}/>}<div className="note">النص المستخرج من الصفحات المحددة فقط هو الذي يُرسل إلى الخادم؛ ملف PDF ومفتاح الخدمة لا يدخلان في الطلب.</div>{savedPreparations.length>0&&<div className="saved-preparations"><h3>التحضيرات المحفوظة</h3>{savedPreparations.map(p=><article key={p.id}><div><strong>{p.lessonTitle}</strong><span>{p.grade} · {p.subject} · {p.bookTitle} · ص {p.pageStart}-{p.pageEnd}</span></div><button onClick={()=>editPreparation(p)}><Edit3 size={15}/> فتح وتعديل</button></article>)}</div>}</section>}
 {tab==='settings'&&<section className="panel"><div className="panelhead"><div><span className="eyebrow">التخصيص</span><h2>كل بند قابل للتعديل</h2></div></div><Config title="الصفوف" items={grades} kind="الصف" add={()=>addItem('الصف')} rename={renameItem} remove={removeItem}/><Config title="الشُعب" items={sections} kind="الشعبة" add={()=>addItem('الشعبة')} rename={renameItem} remove={removeItem}/><Config title="المواد" items={subjects} kind="المادة" add={()=>addItem('المادة')} rename={renameItem} remove={removeItem}/></section>}</>}</main>
 {!reportPreview&&<nav className="nav"><button className={tab==='home'?'active':''} onClick={()=>setTab('home')}><Home/><span>الرئيسية</span></button><button className={tab==='students'?'active':''} onClick={()=>setTab('students')}><Users/><span>الطلاب</span></button><button className={tab==='gradebook'?'active':''} onClick={()=>setTab('gradebook')}><TableProperties/><span>العلامات</span></button><button className={tab==='ai'?'active':''} onClick={()=>setTab('ai')}><Bot/><span>الذكاء</span></button><button className={tab==='settings'?'active':''} onClick={()=>setTab('settings')}><Settings/><span>تعديل</span></button></nav>}</div>}
function Tile({icon,title,text,onClick,tone='blue'}){return<button className={`tile ${tone}`} onClick={onClick}><span className="tileicon">{icon}</span><strong>{title}</strong><small>{text}</small><ChevronLeft className="tilearrow"/></button>}
function Config({title,items,kind,add,rename,remove}){return<div className="config"><div className="confighead"><h3>{title}</h3><button onClick={add}><Plus size={16}/> إضافة</button></div><div className="chips">{items.map(x=><div className="chip" key={x}><span>{x}</span><button onClick={()=>rename(kind,x)}><Edit3 size={14}/></button><button onClick={()=>remove(kind,x)}><Trash2 size={14}/></button></div>)}</div></div>}
createRoot(document.getElementById('root')).render(<App/>);
