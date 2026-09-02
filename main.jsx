import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Home,
  Users,
  TableProperties,
  ClipboardList,
  Bot,
  Settings,
  Plus,
  Trash2,
  Edit3,
  Save,
  Printer,
  Search,
  ArrowUpDown,
  Wifi,
  WifiOff,
  Sparkles,
  GraduationCap,
  FileText,
  CheckCircle2,
  XCircle,
  Clock3,
  ChevronLeft,
  UserPlus
} from 'lucide-react';

import './styles.css';
import appIcon from './moallem-icon.png';

const DEFAULT_GRADES = [
  'السابع',
  'الثامن',
  'التاسع',
  'العاشر',
  'الحادي عشر',
  'البكالوريا'
];

const DEFAULT_SECTIONS = ['أ', 'ب'];

const DEFAULT_SUBJECTS = [
  'اللغة العربية',
  'اللغة الإنكليزية',
  'اللغة الفرنسية',
  'الرياضيات',
  'العلوم العامة',
  'الفيزياء',
  'الكيمياء',
  'علم الأحياء',
  'علم الأرض',
  'التاريخ',
  'الجغرافيا',
  'المعلوماتية',
  'التربية الدينية',
  'التربية الفنية',
  'التربية الموسيقية',
  'التربية الرياضية'
];

const SEED_STUDENTS = [
  { id: 1, name: 'أحمد محمد', grade: 'السابع', section: 'أ' },
  { id: 2, name: 'سارة خالد', grade: 'السابع', section: 'أ' },
  { id: 3, name: 'وليد محمود', grade: 'السابع', section: 'أ' },
  { id: 4, name: 'لانا علي', grade: 'السابع', section: 'ب' }
];

const DEFAULT_COLUMNS = [
  { id: 'c1', name: 'مذاكرة 1', max: 10 },
  { id: 'c2', name: 'واجب', max: 5 },
  { id: 'c3', name: 'امتحان', max: 50 }
];

function load(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function App() {
  const [tab, setTab] = useState('home');

  const [grades, setGrades] = useState(() =>
    load('moallem_v21_grades', DEFAULT_GRADES)
  );

  const [sections, setSections] = useState(() =>
    load('moallem_v21_sections', DEFAULT_SECTIONS)
  );

  const [subjects, setSubjects] = useState(() =>
    load('moallem_v21_subjects', DEFAULT_SUBJECTS)
  );

  const [students, setStudents] = useState(() =>
    load('moallem_v21_students', SEED_STUDENTS)
  );

  const [attendance, setAttendance] = useState(() =>
    load('moallem_v21_attendance', {})
  );

  const [gradebooks, setGradebooks] = useState(() =>
    load('moallem_v21_gradebooks', {})
  );

  const [grade, setGrade] = useState(() =>
    load('moallem_v21_grade', 'السابع')
  );

  const [section, setSection] = useState(() =>
    load('moallem_v21_section', 'أ')
  );

  const [subject, setSubject] = useState(() =>
    load('moallem_v21_subject', 'العلوم العامة')
  );

  const [search, setSearch] = useState('');
  const [editColumns, setEditColumns] = useState(false);

  const [online, setOnline] = useState(navigator.onLine);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResult, setAiResult] = useState('');

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('moallem_v21_grades', JSON.stringify(grades));
    localStorage.setItem('moallem_v21_sections', JSON.stringify(sections));
    localStorage.setItem('moallem_v21_subjects', JSON.stringify(subjects));
    localStorage.setItem('moallem_v21_students', JSON.stringify(students));
    localStorage.setItem('moallem_v21_attendance', JSON.stringify(attendance));
    localStorage.setItem('moallem_v21_gradebooks', JSON.stringify(gradebooks));
    localStorage.setItem('moallem_v21_grade', JSON.stringify(grade));
    localStorage.setItem('
