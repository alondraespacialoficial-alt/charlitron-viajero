import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BookOpen, Lock, Unlock, Play, FileText, Image as ImageIcon,
  Volume2, Download, Send, X, ChevronRight, CheckCircle2,
  AlertCircle, Clock, Loader2, MessageCircle, Search,
  HelpCircle, User, Award, DollarSign, GraduationCap,
} from 'lucide-react';
import QRCode from 'qrcode';
import { Course, CourseLesson, CourseEnrollment, CourseQuestion } from '../types';
import { supabase } from '../supabase';
import { WHATSAPP_NUMBER } from '../constants';

type ActiveTab = 'catalog' | 'access';

// ── Helpers ──────────────────────────────────────────────────────────
const getYouTubeEmbedUrl = (url: string): string | null => {
  const w = url.match(/youtube\.com\/watch\?v=([^&]+)/);
  if (w) return `https://www.youtube.com/embed/${w[1]}`;
  const s = url.match(/youtu\.be\/([^?]+)/);
  if (s) return `https://www.youtube.com/embed/${s[1]}`;
  if (url.includes('youtube.com/embed/')) return url;
  return null;
};

const isDirectVideo = (url: string) =>
  /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url);

const formatPrice = (price: number) =>
  price === 0 ? 'Acceso libre' : new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(price);

const buildWhatsAppLink = (enrollment: CourseEnrollment, course: Course) => {
  const msg = encodeURIComponent(
    `Hola, me inscribí al curso "${course.title}". Mi nombre es ${enrollment.student_name} y mi email es ${enrollment.student_email}. Quiero confirmar mi pago.`
  );
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`;
};

// ── Component ─────────────────────────────────────────────────────────
export const CoursesSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('catalog');
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Catalog
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [previewLessons, setPreviewLessons] = useState<CourseLesson[]>([]);

  // Register
  const [showRegister, setShowRegister] = useState(false);
  const [regForm, setRegForm] = useState({ name: '', email: '', phone: '' });
  const [isRegistering, setIsRegistering] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [registeredEnrollment, setRegisteredEnrollment] = useState<CourseEnrollment | null>(null);

  // Access
  const [accessCode, setAccessCode] = useState('');
  const [accessLoading, setAccessLoading] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [unlockedEnrollment, setUnlockedEnrollment] = useState<CourseEnrollment | null>(null);
  const [unlockedCourse, setUnlockedCourse] = useState<Course | null>(null);
  const [unlockedLessons, setUnlockedLessons] = useState<CourseLesson[]>([]);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);

  // Questions
  const [questions, setQuestions] = useState<CourseQuestion[]>([]);
  const [questionText, setQuestionText] = useState('');
  const [isAskingQuestion, setIsAskingQuestion] = useState(false);
  const [collabCode, setCollabCode] = useState('');
  const [collabName, setCollabName] = useState<string | null>(null);
  const [collabError, setCollabError] = useState<string | null>(null);
  const [answerTarget, setAnswerTarget] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [isAnswering, setIsAnswering] = useState(false);

  // Image lightbox
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  // Certificate
  const [isGeneratingCertificate, setIsGeneratingCertificate] = useState(false);

  useEffect(() => {
    fetchCourses();
  }, []);

  // ── Fetch ─────────────────────────────────────────────────────────
  const fetchCourses = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from('courses')
      .select('*')
      .eq('is_active', true)
      .order('order_index', { ascending: true });
    setCourses(data || []);
    setIsLoading(false);
  };

  const fetchPreviewLessons = async (courseId: string) => {
    const { data } = await supabase
      .from('course_lessons')
      .select('id, title, description, is_free_preview, order_index')
      .eq('course_id', courseId)
      .order('order_index', { ascending: true });
    setPreviewLessons((data || []).map(l => ({ ...l, images: [] })));
  };

  const fetchUnlockedLessons = async (courseId: string) => {
    const { data } = await supabase
      .from('course_lessons')
      .select('*')
      .eq('course_id', courseId)
      .order('order_index', { ascending: true });
    const lessons = (data || []).map(l => ({ ...l, images: Array.isArray(l.images) ? l.images : [] }));
    setUnlockedLessons(lessons);
    if (lessons.length > 0) setActiveLessonId(lessons[0].id);
  };

  const fetchQuestions = async (courseId: string, lessonId?: string) => {
    let q = supabase
      .from('course_questions')
      .select('*')
      .eq('course_id', courseId)
      .order('created_at', { ascending: true });
    if (lessonId) q = q.eq('lesson_id', lessonId);
    const { data } = await q;
    setQuestions(data || []);
  };

  // ── Select course (catalog) ───────────────────────────────────────
  const handleSelectCourse = async (course: Course) => {
    setSelectedCourse(course);
    setShowRegister(false);
    setRegisteredEnrollment(null);
    setRegForm({ name: '', email: '', phone: '' });
    setRegError(null);
    await fetchPreviewLessons(course.id);
  };

  // ── Register ──────────────────────────────────────────────────────
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse || !regForm.name.trim() || !regForm.email.trim()) return;
    setIsRegistering(true);
    setRegError(null);
    try {
      const { data, error } = await supabase
        .from('course_enrollments')
        .insert([{
          course_id: selectedCourse.id,
          student_name: regForm.name.trim(),
          student_email: regForm.email.trim().toLowerCase(),
          student_phone: regForm.phone.trim() || null,
          status: 'pending',
        }])
        .select()
        .single();
      if (error) throw error;
      setRegisteredEnrollment(data);
    } catch {
      setRegError('Error al registrarse. Intenta de nuevo.');
    } finally {
      setIsRegistering(false);
    }
  };

  // ── Access with code ──────────────────────────────────────────────
  const handleAccessCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = accessCode.trim().toUpperCase();
    if (!code) return;
    setAccessLoading(true);
    setAccessError(null);
    setUnlockedEnrollment(null);
    setUnlockedCourse(null);
    setUnlockedLessons([]);
    try {
      const { data: enrollment, error } = await supabase
        .from('course_enrollments')
        .select('*')
        .eq('access_code', code)
        .eq('status', 'paid')
        .single();
      if (error || !enrollment) {
        setAccessError('Código inválido o curso aún no habilitado. Verifica tu código.');
        return;
      }
      const { data: course } = await supabase
        .from('courses')
        .select('*')
        .eq('id', enrollment.course_id)
        .single();
      setUnlockedEnrollment(enrollment);
      setUnlockedCourse(course);
      await fetchUnlockedLessons(enrollment.course_id);
      await fetchQuestions(enrollment.course_id);
    } catch {
      setAccessError('Error al validar el código. Intenta de nuevo.');
    } finally {
      setAccessLoading(false);
    }
  };

  // ── Active lesson ─────────────────────────────────────────────────
  const activeLesson = unlockedLessons.find(l => l.id === activeLessonId) || null;

  const handleSelectLesson = async (lessonId: string) => {
    setActiveLessonId(lessonId);
    setQuestions([]);
    setAnswerTarget(null);
    if (unlockedCourse) await fetchQuestions(unlockedCourse.id, lessonId);
  };

  // ── Ask question ──────────────────────────────────────────────────
  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionText.trim() || !unlockedEnrollment || !unlockedCourse) return;
    setIsAskingQuestion(true);
    try {
      await supabase.from('course_questions').insert([{
        course_id: unlockedCourse.id,
        lesson_id: activeLessonId || null,
        enrollment_id: unlockedEnrollment.id,
        student_name: unlockedEnrollment.student_name,
        question_text: questionText.trim(),
      }]);
      setQuestionText('');
      await fetchQuestions(unlockedCourse.id, activeLessonId || undefined);
    } finally {
      setIsAskingQuestion(false);
    }
  };

  // ── Validate collaborator code ────────────────────────────────────
  const handleValidateCollab = async () => {
    setCollabError(null);
    setCollabName(null);
    const code = collabCode.trim().toUpperCase();
    if (!code) return;
    const { data } = await supabase
      .from('collaborators')
      .select('name')
      .eq('code', code)
      .eq('is_active', true)
      .single();
    if (!data) {
      setCollabError('Código de colaborador inválido.');
      return;
    }
    setCollabName(data.name);
  };

  // ── Answer question ───────────────────────────────────────────────
  const handleAnswer = async (questionId: string) => {
    if (!answerText.trim() || !collabName) return;
    setIsAnswering(true);
    try {
      await supabase
        .from('course_questions')
        .update({ answer_text: answerText.trim(), answered_by: collabName, answered_at: new Date().toISOString() })
        .eq('id', questionId);
      setAnswerText('');
      setAnswerTarget(null);
      if (unlockedCourse) await fetchQuestions(unlockedCourse.id, activeLessonId || undefined);
    } finally {
      setIsAnswering(false);
    }
  };

  // ── Certificate helpers ───────────────────────────────────────────
  const loadImage = (url: string): Promise<{ base64: string; w: number; h: number } | null> =>
    new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');
          if (!ctx) { resolve(null); return; }
          ctx.drawImage(img, 0, 0);
          resolve({ base64: canvas.toDataURL('image/png'), w: img.naturalWidth, h: img.naturalHeight });
        } catch { resolve(null); }
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });

  const handleDownloadCertificate = async () => {
    if (!unlockedCourse || !unlockedEnrollment) return;
    setIsGeneratingCertificate(true);
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const W = 297, H = 210, cx = W / 2;

      // Fondo oscuro sepia
      doc.setFillColor(20, 16, 12);
      doc.rect(0, 0, W, H, 'F');

      // Imagen de fondo (si existe)
      if (unlockedCourse.certificate_bg_url) {
        const bgData = await loadImage(unlockedCourse.certificate_bg_url);
        if (bgData) {
          const aspect = bgData.w / bgData.h;
          let bW = W, bH = W / aspect;
          if (bH < H) { bH = H; bW = H * aspect; }
          const bX = (W - bW) / 2, bY = (H - bH) / 2;
          doc.saveGraphicsState();
          (doc as any).setGState((doc as any).GState({ opacity: 0.13 }));
          doc.addImage(bgData.base64, 'PNG', bX, bY, bW, bH);
          doc.restoreGraphicsState();
        }
      }

      // Barras laterales doradas
      doc.setFillColor(110, 82, 45);
      doc.rect(0, 0, 7, H, 'F');
      doc.rect(W - 7, 0, 7, H, 'F');
      doc.setFillColor(90, 67, 35);
      doc.rect(0, 0, W, 5, 'F');
      doc.rect(0, H - 5, W, 5, 'F');

      // Borde interior
      doc.setDrawColor(100, 75, 40);
      doc.setLineWidth(0.4);
      doc.rect(10, 7, W - 20, H - 14);

      // Ornamentos en esquinas
      doc.setFillColor(130, 98, 52);
      [[10, 7], [W - 13, 7], [10, H - 10], [W - 13, H - 10]].forEach(([x, y]) => {
        doc.rect(x, y, 3, 3, 'F');
      });

      let y = 13;

      // Logo
      if (unlockedCourse.logo_url) {
        const imgData = await loadImage(unlockedCourse.logo_url);
        if (imgData) {
          const maxH = 22, maxW = 80;
          const aspect = imgData.w / imgData.h;
          let iH = maxH, iW = iH * aspect;
          if (iW > maxW) { iW = maxW; iH = iW / aspect; }
          doc.addImage(imgData.base64, 'PNG', cx - iW / 2, y, iW, iH);
          y += iH + 3;
        }
      }

      // Nombre del sitio
      doc.setFontSize(7.5);
      doc.setTextColor(120, 92, 52);
      doc.setFont('helvetica', 'bold');
      doc.text('CHARLITRON VIAJERO DEL TIEMPO', cx, y + 4.5, { align: 'center', charSpace: 1.5 });
      y += 9;

      // Línea divisoria
      doc.setDrawColor(75, 56, 30);
      doc.setLineWidth(0.3);
      doc.line(30, y, W - 30, y);
      y += 8;

      // Título CONSTANCIA
      doc.setFontSize(23);
      doc.setTextColor(225, 210, 180);
      doc.setFont('helvetica', 'bold');
      doc.text('CONSTANCIA DE CURSO', cx, y + 8, { align: 'center' });
      y += 14;

      // Línea dorada gruesa
      doc.setDrawColor(155, 118, 58);
      doc.setLineWidth(0.6);
      doc.line(50, y, W - 50, y);
      y += 10;

      // "Se otorga a:"
      doc.setFontSize(9.5);
      doc.setTextColor(145, 125, 95);
      doc.setFont('helvetica', 'italic');
      doc.text('Se otorga la presente constancia a:', cx, y, { align: 'center' });
      y += 11;

      // Nombre del alumno
      doc.setFontSize(22);
      doc.setTextColor(208, 165, 88);
      doc.setFont('helvetica', 'bold');
      const nameLines = doc.splitTextToSize(unlockedEnrollment.student_name.toUpperCase(), W - 100) as string[];
      doc.text(nameLines, cx, y, { align: 'center' });
      y += nameLines.length * 9;

      // Línea bajo el nombre
      const nameLineW = Math.min(doc.getTextWidth(nameLines[0]) + 24, W - 80);
      doc.setDrawColor(155, 118, 58);
      doc.setLineWidth(0.5);
      doc.line(cx - nameLineW / 2, y, cx + nameLineW / 2, y);
      y += 9;

      // "Por haber completado..."
      doc.setFontSize(9);
      doc.setTextColor(145, 125, 95);
      doc.setFont('helvetica', 'italic');
      doc.text('Por haber completado satisfactoriamente el curso:', cx, y, { align: 'center' });
      y += 10;

      // Título del curso
      doc.setFontSize(14);
      doc.setTextColor(230, 215, 190);
      doc.setFont('helvetica', 'bold');
      const titleLines = doc.splitTextToSize(`"${unlockedCourse.title}"`, W - 90) as string[];
      doc.text(titleLines, cx, y, { align: 'center' });
      y += titleLines.length * 7 + 5;

      // Instructor
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(155, 135, 105);
      const instructorLabel = unlockedCourse.instructor_name || 'Charlitron Viajero del Tiempo';
      doc.text(`Instructor: ${instructorLabel}`, cx, y, { align: 'center' });
      y += 7;

      // Duración
      if (unlockedCourse.duration_text) {
        doc.setFontSize(8);
        doc.setTextColor(130, 105, 75);
        doc.setFont('helvetica', 'italic');
        doc.text(`Duración: ${unlockedCourse.duration_text}`, cx, y, { align: 'center' });
        y += 7;
      }

      // Sección inferior
      const footerY = H - 20;
      const sigBlockY = 158;

      // Firma digital
      if (unlockedCourse.signature_url) {
        const sigData = await loadImage(unlockedCourse.signature_url);
        if (sigData) {
          const maxSigW = 65, maxSigH = 24;
          const sigAspect = sigData.w / sigData.h;
          let sW = maxSigW, sH = sW / sigAspect;
          if (sH > maxSigH) { sH = maxSigH; sW = sH * sigAspect; }
          doc.saveGraphicsState();
          (doc as any).setGState((doc as any).GState({ opacity: 0.72 }));
          doc.addImage(sigData.base64, 'PNG', 18 + (65 - sW) / 2, sigBlockY, sW, sH);
          doc.restoreGraphicsState();
        }
        doc.setDrawColor(100, 77, 44);
        doc.setLineWidth(0.4);
        doc.line(14, footerY - 6, 84, footerY - 6);
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(120, 95, 58);
        doc.text('Firma y Sello Autorizado', 49, footerY - 1, { align: 'center' });
      }

      // QR de verificación
      const qrUrl = `https://charlitronviajerodeltiempo.com/cursos?codigo=${unlockedEnrollment.access_code}`;
      const qrDataUrl = await QRCode.toDataURL(qrUrl, {
        width: 200, margin: 1,
        color: { dark: '#dab064', light: '#14100c' },
      });
      const qrSize = 22;
      doc.addImage(qrDataUrl, 'PNG', W - 37, sigBlockY, qrSize, qrSize);
      doc.setFontSize(5.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 78, 45);
      doc.text('Escanear para verificar', W - 26, footerY - 8, { align: 'center' });
      doc.setFont('courier', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(130, 100, 55);
      doc.text(unlockedEnrollment.access_code || '', W - 26, footerY - 3, { align: 'center' });

      // Leyenda de federación
      if (unlockedCourse.federation_legend?.trim()) {
        const legendLines = doc.splitTextToSize(unlockedCourse.federation_legend.trim(), 160) as string[];
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(105, 82, 52);
        const legendY = footerY - 6 - legendLines.length * 4;
        doc.text(legendLines, cx, legendY, { align: 'center' });
      }

      // Pie de página
      doc.setDrawColor(65, 50, 28);
      doc.setLineWidth(0.3);
      doc.line(12, footerY, W - 12, footerY);
      doc.setFontSize(7);
      doc.setFont('courier', 'bold');
      doc.setTextColor(140, 110, 68);
      doc.text(`Código: ${unlockedEnrollment.access_code || ''}`, 14, footerY + 6);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(85, 66, 42);
      const fechaGen = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });
      doc.text(`Emitido el ${fechaGen}`, 14, footerY + 11);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(105, 80, 48);
      doc.text('charlitronviajerodeltiempo.com', cx, footerY + 8.5, { align: 'center' });

      doc.save(`constancia-${unlockedEnrollment.access_code || 'curso'}.pdf`);
    } catch (err) {
      console.error('Error generando constancia:', err);
    } finally {
      setIsGeneratingCertificate(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────
  return (
    <section className="py-24 px-6 bg-sepia-950 min-h-screen">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="text-center mb-12 space-y-4">
          <div className="flex items-center justify-center gap-3 mb-4">
            <BookOpen className="text-sepia-500 w-6 h-6" />
            <span className="text-sepia-500 uppercase tracking-widest text-xs font-bold">Formación Histórica</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-serif text-sepia-100">Cursos</h2>
          <p className="text-sepia-400 max-w-xl mx-auto text-sm">
            Aprende historia con videos, audios, PDFs y más. Regístrate, confirma tu pago y accede con tu código personal.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex justify-center mb-12">
          <div className="flex bg-sepia-900/60 border border-sepia-800 rounded-2xl p-1 gap-1">
            {([
              { key: 'catalog', label: 'Catálogo', Icon: BookOpen },
              { key: 'access', label: 'Mi Acceso', Icon: Unlock },
            ] as { key: ActiveTab; label: string; Icon: React.ElementType }[]).map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold uppercase tracking-widest transition-all ${
                  activeTab === key ? 'bg-sepia-500 text-sepia-950' : 'text-sepia-500 hover:text-sepia-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ══ TAB: CATÁLOGO ══════════════════════════════════════════ */}
        {activeTab === 'catalog' && (
          <>
            {isLoading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="w-8 h-8 text-sepia-500 animate-spin" />
              </div>
            ) : courses.length === 0 ? (
              <div className="text-center py-20 text-sepia-600">
                <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-40" />
                <p>Próximamente nuevos cursos.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {courses.map(course => (
                  <motion.div
                    key={course.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ y: -4 }}
                    className="bg-sepia-900/50 border border-sepia-800 rounded-2xl overflow-hidden group cursor-pointer"
                    onClick={() => handleSelectCourse(course)}
                  >
                    {course.banner_url ? (
                      <div className="w-full overflow-hidden bg-sepia-900">
                        <img
                          src={course.banner_url}
                          alt={course.title}
                          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500 pointer-events-none select-none"
                          onContextMenu={e => e.preventDefault()}
                        />
                      </div>
                    ) : (
                      <div className="w-full h-48 bg-sepia-800/40 flex items-center justify-center">
                        <BookOpen className="w-12 h-12 text-sepia-700" />
                      </div>
                    )}
                    <div className="p-5 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sepia-100 font-serif text-lg line-clamp-2 flex-1">{course.title}</h3>
                        {course.level && (
                          <span className={`flex-shrink-0 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                            course.level === 'basico' ? 'text-green-400 border-green-700 bg-green-900/20' :
                            course.level === 'intermedio' ? 'text-amber-400 border-amber-700 bg-amber-900/20' :
                            'text-red-400 border-red-700 bg-red-900/20'
                          }`}>{course.level}</span>
                        )}
                      </div>
                      {course.instructor_name && (
                        <div className="flex items-center gap-1.5 text-sepia-500 text-xs">
                          <User className="w-3 h-3" />
                          <span>{course.instructor_name}</span>
                        </div>
                      )}
                      {course.description && (
                        <p className="text-sepia-400 text-sm line-clamp-2">{course.description}</p>
                      )}
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <span className={`text-sm font-bold ${course.price === 0 ? 'text-green-400' : 'text-sepia-200'}`}>
                            {formatPrice(course.price)}
                          </span>
                          {course.duration_text && (
                            <div className="flex items-center gap-1 text-sepia-600 text-xs">
                              <Clock className="w-3 h-3" />
                              <span>{course.duration_text}</span>
                            </div>
                          )}
                        </div>
                        <button className="flex items-center gap-1.5 text-sepia-400 hover:text-sepia-200 text-xs uppercase tracking-widest font-bold transition-colors">
                          Ver más <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ══ TAB: MI ACCESO ════════════════════════════════════════ */}
        {activeTab === 'access' && !unlockedCourse && (
          <div className="max-w-md mx-auto space-y-8">
            <div className="text-center space-y-2">
              <Unlock className="w-10 h-10 text-sepia-500 mx-auto" />
              <p className="text-sepia-300 font-serif text-lg">Ingresa tu código de acceso</p>
              <p className="text-sepia-500 text-sm">
                Cuando el admin confirme tu pago, te enviarán un código de 8 caracteres para acceder a tu curso.
              </p>
            </div>
            <form onSubmit={handleAccessCode} className="flex gap-3">
              <input
                type="text"
                value={accessCode}
                onChange={e => setAccessCode(e.target.value.toUpperCase())}
                placeholder="XXXXXXXX"
                className="flex-1 bg-sepia-900 border border-sepia-700 rounded-xl px-4 py-3 text-sepia-100 placeholder-sepia-600 outline-none focus:border-sepia-500 font-mono text-center tracking-widest text-lg"
                maxLength={8}
              />
              <button
                type="submit"
                disabled={accessLoading || accessCode.trim().length < 6}
                className="bg-sepia-500 hover:bg-sepia-400 disabled:opacity-50 text-sepia-950 font-bold px-5 py-3 rounded-xl transition-all"
              >
                {accessLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Unlock className="w-5 h-5" />}
              </button>
            </form>
            {accessError && (
              <div className="flex items-center gap-2 bg-red-900/30 border border-red-700 rounded-xl p-4 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {accessError}
              </div>
            )}
          </div>
        )}

        {/* ══ CURSO DESBLOQUEADO ════════════════════════════════════ */}
        {activeTab === 'access' && unlockedCourse && (
          <div className="space-y-6">
            {/* Cabecera del curso */}
            <div className="flex items-start gap-4 bg-sepia-900/50 border border-sepia-700 rounded-2xl p-5">
              {unlockedCourse.banner_url && (
                <img src={unlockedCourse.banner_url} alt="" className="w-20 h-16 object-cover rounded-xl flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sepia-500 text-xs uppercase tracking-widest mb-1">Acceso activo</p>
                <h3 className="text-sepia-100 font-serif text-xl">{unlockedCourse.title}</h3>
                <p className="text-sepia-400 text-sm mt-1">{unlockedEnrollment?.student_name}</p>
                <button
                  onClick={handleDownloadCertificate}
                  disabled={isGeneratingCertificate}
                  className="mt-2 flex items-center gap-1.5 text-xs text-sepia-400 hover:text-sepia-200 border border-sepia-700 hover:border-sepia-500 px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
                >
                  {isGeneratingCertificate
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generando...</>
                    : <><Award className="w-3.5 h-3.5" /> Descargar Constancia PDF</>}
                </button>
              </div>
              <button
                onClick={() => { setUnlockedCourse(null); setUnlockedEnrollment(null); setAccessCode(''); setUnlockedLessons([]); setQuestions([]); }}
                className="text-sepia-600 hover:text-sepia-300 flex-shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
              {/* Sidebar: lista de lecciones */}
              <div className="lg:w-72 flex-shrink-0 space-y-2">
                <p className="text-sepia-500 text-xs uppercase tracking-widest font-bold px-1 mb-3">Lecciones</p>
                {unlockedLessons.map((lesson, i) => (
                  <button
                    key={lesson.id}
                    onClick={() => handleSelectLesson(lesson.id)}
                    className={`w-full text-left px-4 py-3 rounded-xl border transition-all space-y-0.5 ${
                      activeLessonId === lesson.id
                        ? 'bg-sepia-700/60 border-sepia-500 text-sepia-100'
                        : 'bg-sepia-900/40 border-sepia-800 text-sepia-400 hover:border-sepia-600 hover:text-sepia-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-sepia-600 font-mono">{String(i + 1).padStart(2, '0')}</span>
                      <span className="text-sm font-medium line-clamp-1">{lesson.title}</span>
                    </div>
                    <div className="flex gap-2 ml-5 flex-wrap">
                      {lesson.video_url && <Play className="w-3 h-3 text-sepia-600" />}
                      {lesson.audio_url && <Volume2 className="w-3 h-3 text-sepia-600" />}
                      {lesson.pdf_url && <FileText className="w-3 h-3 text-sepia-600" />}
                      {lesson.images && lesson.images.length > 0 && <ImageIcon className="w-3 h-3 text-sepia-600" />}
                      {lesson.text_content && <FileText className="w-3 h-3 text-sepia-600 opacity-50" />}
                    </div>
                  </button>
                ))}
              </div>

              {/* Contenido de la lección */}
              <div className="flex-1 space-y-6 min-w-0">
                {activeLesson ? (
                  <>
                    <div className="space-y-1">
                      <h3 className="text-sepia-100 font-serif text-2xl">{activeLesson.title}</h3>
                      {activeLesson.description && (
                        <p className="text-sepia-400 text-sm">{activeLesson.description}</p>
                      )}
                    </div>

                    {/* Video */}
                    {activeLesson.video_url && (() => {
                      const embedUrl = getYouTubeEmbedUrl(activeLesson.video_url);
                      return embedUrl ? (
                        <div className="relative w-full rounded-2xl overflow-hidden bg-black" style={{ paddingBottom: '56.25%' }}>
                          <iframe
                            src={embedUrl}
                            className="absolute inset-0 w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            title={activeLesson.title}
                          />
                        </div>
                      ) : isDirectVideo(activeLesson.video_url) ? (
                        <video
                          controls
                          src={activeLesson.video_url}
                          className="w-full rounded-2xl bg-black"
                          controlsList="nodownload"
                        />
                      ) : null;
                    })()}

                    {/* Audio */}
                    {activeLesson.audio_url && (
                      <div className="bg-sepia-900/60 border border-sepia-700 rounded-2xl p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <Volume2 className="w-5 h-5 text-sepia-400" />
                          <span className="text-sepia-300 text-sm font-bold uppercase tracking-widest">Audio</span>
                        </div>
                        <audio controls src={activeLesson.audio_url} className="w-full" controlsList="nodownload" />
                      </div>
                    )}

                    {/* PDF */}
                    {activeLesson.pdf_url && (
                      <a
                        href={activeLesson.pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 bg-sepia-900/60 border border-sepia-700 hover:border-sepia-500 rounded-2xl p-4 transition-all group"
                      >
                        <div className="w-10 h-10 bg-red-900/30 border border-red-800 rounded-xl flex items-center justify-center flex-shrink-0">
                          <FileText className="w-5 h-5 text-red-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sepia-200 font-bold text-sm">Material PDF</p>
                          <p className="text-sepia-500 text-xs truncate">{activeLesson.pdf_url}</p>
                        </div>
                        <Download className="w-5 h-5 text-sepia-500 group-hover:text-sepia-200 transition-colors" />
                      </a>
                    )}

                    {/* Imágenes */}
                    {activeLesson.images && activeLesson.images.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <ImageIcon className="w-4 h-4 text-sepia-400" />
                          <span className="text-sepia-400 text-sm font-bold uppercase tracking-widest">Imágenes</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {activeLesson.images.map((img, idx) => (
                            <img
                              key={idx}
                              src={img}
                              alt={`Imagen ${idx + 1}`}
                              onClick={() => setLightboxImg(img)}
                              className="w-full h-32 object-cover rounded-xl border border-sepia-800 cursor-zoom-in hover:border-sepia-500 transition-all"
                              onContextMenu={e => e.preventDefault()}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Texto */}
                    {activeLesson.text_content && (
                      <div className="bg-sepia-900/40 border border-sepia-800 rounded-2xl p-5">
                        <p className="text-sepia-400 text-xs uppercase tracking-widest font-bold mb-3">Notas de la lección</p>
                        <pre className="text-sepia-200 text-sm whitespace-pre-wrap font-sans leading-relaxed">
                          {activeLesson.text_content}
                        </pre>
                      </div>
                    )}

                    {/* ── Sección de preguntas ── */}
                    <div className="space-y-4 pt-4 border-t border-sepia-800">
                      <div className="flex items-center gap-2">
                        <HelpCircle className="w-5 h-5 text-sepia-500" />
                        <span className="text-sepia-300 font-bold uppercase tracking-widest text-sm">Preguntas y respuestas</span>
                      </div>

                      {/* Lista de preguntas */}
                      {questions.length === 0 ? (
                        <p className="text-sepia-600 text-sm">Sé el primero en preguntar sobre esta lección.</p>
                      ) : (
                        <div className="space-y-4">
                          {questions.map(q => (
                            <div key={q.id} className="bg-sepia-900/40 border border-sepia-800 rounded-xl p-4 space-y-3">
                              <div className="flex items-start gap-3">
                                <div className="w-7 h-7 rounded-full bg-sepia-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                                  <User className="w-3.5 h-3.5 text-sepia-300" />
                                </div>
                                <div>
                                  <p className="text-sepia-400 text-xs font-bold">{q.student_name}</p>
                                  <p className="text-sepia-200 text-sm mt-0.5">{q.question_text}</p>
                                </div>
                              </div>

                              {q.answer_text ? (
                                <div className="flex items-start gap-3 bg-sepia-800/40 rounded-xl p-3 ml-4">
                                  <div className="w-7 h-7 rounded-full bg-amber-900/50 border border-amber-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <Award className="w-3.5 h-3.5 text-amber-400" />
                                  </div>
                                  <div>
                                    <p className="text-amber-500 text-xs font-bold">{q.answered_by}</p>
                                    <p className="text-sepia-300 text-sm mt-0.5">{q.answer_text}</p>
                                  </div>
                                </div>
                              ) : collabName ? (
                                answerTarget === q.id ? (
                                  <div className="ml-4 space-y-2">
                                    <textarea
                                      rows={2}
                                      value={answerText}
                                      onChange={e => setAnswerText(e.target.value)}
                                      placeholder="Escribe tu respuesta..."
                                      className="w-full bg-sepia-800 border border-sepia-600 rounded-xl px-3 py-2 text-sepia-100 text-sm placeholder-sepia-600 outline-none focus:border-sepia-400 resize-none"
                                    />
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => handleAnswer(q.id)}
                                        disabled={isAnswering || !answerText.trim()}
                                        className="flex items-center gap-1.5 bg-amber-700/50 hover:bg-amber-700/80 disabled:opacity-50 border border-amber-600 text-amber-200 text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg transition-all"
                                      >
                                        {isAnswering ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                                        Responder
                                      </button>
                                      <button onClick={() => setAnswerTarget(null)} className="text-sepia-600 hover:text-sepia-400 text-xs uppercase tracking-widest">Cancelar</button>
                                    </div>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => { setAnswerTarget(q.id); setAnswerText(''); }}
                                    className="ml-4 text-amber-600 hover:text-amber-400 text-xs font-bold uppercase tracking-widest transition-colors"
                                  >
                                    + Responder
                                  </button>
                                )
                              ) : (
                                <p className="ml-4 text-sepia-700 text-xs italic">Sin respuesta aún.</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Hacer una pregunta */}
                      <form onSubmit={handleAskQuestion} className="space-y-3">
                        <textarea
                          rows={2}
                          value={questionText}
                          onChange={e => setQuestionText(e.target.value)}
                          placeholder="Escribe tu pregunta sobre esta lección..."
                          className="w-full bg-sepia-900 border border-sepia-700 rounded-xl px-4 py-3 text-sepia-100 text-sm placeholder-sepia-600 outline-none focus:border-sepia-500 resize-none"
                        />
                        <button
                          type="submit"
                          disabled={isAskingQuestion || !questionText.trim()}
                          className="flex items-center gap-2 bg-sepia-700/60 hover:bg-sepia-700 disabled:opacity-50 border border-sepia-600 text-sepia-200 text-xs font-bold uppercase tracking-widest px-4 py-2.5 rounded-xl transition-all"
                        >
                          {isAskingQuestion ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <HelpCircle className="w-3.5 h-3.5" />}
                          Enviar pregunta
                        </button>
                      </form>

                      {/* Panel colaborador para responder */}
                      <div className="border-t border-sepia-800 pt-4 space-y-3">
                        <p className="text-sepia-600 text-xs uppercase tracking-widest font-bold">
                          ¿Eres colaborador? Ingresa tu código para responder
                        </p>
                        {!collabName ? (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={collabCode}
                              onChange={e => setCollabCode(e.target.value.toUpperCase())}
                              placeholder="Código colaborador"
                              className="flex-1 bg-sepia-900 border border-sepia-700 rounded-xl px-3 py-2 text-sepia-100 text-sm placeholder-sepia-600 outline-none focus:border-sepia-500 font-mono"
                            />
                            <button
                              onClick={handleValidateCollab}
                              className="bg-sepia-600 hover:bg-sepia-500 text-sepia-100 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all"
                            >
                              Entrar
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <p className="text-amber-400 text-sm font-bold">✓ Colaborador: {collabName}</p>
                            <button onClick={() => { setCollabName(null); setCollabCode(''); }} className="text-sepia-600 hover:text-sepia-400 text-xs">Salir</button>
                          </div>
                        )}
                        {collabError && <p className="text-red-400 text-xs">{collabError}</p>}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12 text-sepia-600">
                    <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-40" />
                    <p>Selecciona una lección para comenzar.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal: Detalle del curso + Registro ── */}
      <AnimatePresence>
        {selectedCourse && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-sepia-950/90 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
            onClick={() => setSelectedCourse(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              onClick={e => e.stopPropagation()}
              className="bg-sepia-900 border border-sepia-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-sepia-800 sticky top-0 bg-sepia-900 z-10">
                <h3 className="text-sepia-100 font-serif text-lg line-clamp-1">{selectedCourse.title}</h3>
                <button onClick={() => setSelectedCourse(null)} className="text-sepia-500 hover:text-sepia-200">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5">
                {registeredEnrollment ? (
                  /* Post-registro */
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-5">
                    <CheckCircle2 className="w-14 h-14 text-green-400 mx-auto" />
                    <div>
                      <p className="text-sepia-100 font-serif text-xl">¡Registro exitoso!</p>
                      <p className="text-sepia-400 text-sm mt-1">Envía tu comprobante de pago para activar tu acceso.</p>
                    </div>
                    {selectedCourse.price > 0 && (
                      <a
                        href={buildWhatsAppLink(registeredEnrollment, selectedCourse)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full bg-green-700/40 hover:bg-green-700/60 border border-green-600 text-green-300 font-bold uppercase tracking-widest text-sm py-3 rounded-xl transition-all"
                      >
                        <MessageCircle className="w-4 h-4" />
                        Enviar comprobante por WhatsApp
                      </a>
                    )}
                    <div className="bg-sepia-800/40 border border-sepia-700 rounded-xl p-4 text-xs text-sepia-500 text-left space-y-1">
                      <p className="font-bold text-sepia-400">¿Cómo acceder?</p>
                      <p>Una vez confirmado tu pago, recibirás un código de acceso de 8 caracteres. Guárdalo y úsalo en la pestaña <strong>"Mi Acceso"</strong>.</p>
                    </div>
                    <button onClick={() => setSelectedCourse(null)} className="w-full bg-sepia-700 hover:bg-sepia-600 text-sepia-100 py-3 rounded-xl font-bold uppercase tracking-widest text-sm transition-all">
                      Entendido
                    </button>
                  </motion.div>
                ) : showRegister ? (
                  /* Formulario de registro */
                  <form onSubmit={handleRegister} className="space-y-4">
                    <p className="text-sepia-400 text-sm">Completa tus datos para inscribirte. Luego confirma tu pago por WhatsApp.</p>
                    {regError && (
                      <div className="flex items-center gap-2 bg-red-900/30 border border-red-700 rounded-xl p-3 text-red-400 text-sm">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        {regError}
                      </div>
                    )}
                    {[
                      { label: 'Nombre completo *', key: 'name', type: 'text', placeholder: 'Tu nombre' },
                      { label: 'Email *', key: 'email', type: 'email', placeholder: 'tu@email.com' },
                      { label: 'Teléfono', key: 'phone', type: 'tel', placeholder: 'Opcional' },
                    ].map(f => (
                      <div key={f.key} className="space-y-1">
                        <label className="text-xs text-sepia-400 uppercase tracking-widest">{f.label}</label>
                        <input
                          type={f.type}
                          value={regForm[f.key as keyof typeof regForm]}
                          onChange={e => setRegForm({ ...regForm, [f.key]: e.target.value })}
                          placeholder={f.placeholder}
                          className="w-full bg-sepia-800 border border-sepia-700 rounded-xl px-4 py-2.5 text-sepia-100 placeholder-sepia-600 outline-none focus:border-sepia-500 text-sm"
                        />
                      </div>
                    ))}
                    <div className="flex gap-2 pt-2">
                      <button type="button" onClick={() => setShowRegister(false)} className="flex-1 bg-sepia-800 hover:bg-sepia-700 text-sepia-400 py-3 rounded-xl text-sm font-bold uppercase tracking-widest transition-all">
                        Atrás
                      </button>
                      <button type="submit" disabled={isRegistering || !regForm.name.trim() || !regForm.email.trim()} className="flex-1 bg-sepia-500 hover:bg-sepia-400 disabled:opacity-50 text-sepia-950 py-3 rounded-xl text-sm font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2">
                        {isRegistering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        Registrarme
                      </button>
                    </div>
                  </form>
                ) : (
                  /* Detalle del curso */
                  <div className="space-y-5">
                    {selectedCourse.banner_url && (
                      <img src={selectedCourse.banner_url} alt="" className="w-full rounded-xl object-cover max-h-52" />
                    )}
                    {/* Metadatos rápidos */}
                    <div className="flex flex-wrap gap-2">
                      {selectedCourse.level && (
                        <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border ${
                          selectedCourse.level === 'basico' ? 'text-green-400 border-green-700 bg-green-900/20' :
                          selectedCourse.level === 'intermedio' ? 'text-amber-400 border-amber-700 bg-amber-900/20' :
                          'text-red-400 border-red-700 bg-red-900/20'
                        }`}>{selectedCourse.level}</span>
                      )}
                      {selectedCourse.duration_text && (
                        <span className="flex items-center gap-1 text-[10px] text-sepia-500 border border-sepia-700 bg-sepia-800/30 px-2.5 py-1 rounded-full">
                          <Clock className="w-3 h-3" />{selectedCourse.duration_text}
                        </span>
                      )}
                      {selectedCourse.instructor_name && (
                        <span className="flex items-center gap-1 text-[10px] text-sepia-500 border border-sepia-700 bg-sepia-800/30 px-2.5 py-1 rounded-full">
                          <User className="w-3 h-3" />{selectedCourse.instructor_name}
                        </span>
                      )}
                    </div>
                    {selectedCourse.description && (
                      <p className="text-sepia-300 text-sm leading-relaxed">{selectedCourse.description}</p>
                    )}
                    {/* ¿Qué aprenderás? */}
                    {selectedCourse.what_you_learn && (
                      <div className="bg-sepia-800/30 border border-sepia-700 rounded-xl p-4 space-y-2">
                        <p className="flex items-center gap-2 text-xs text-sepia-400 uppercase tracking-widest font-bold">
                          <GraduationCap className="w-3.5 h-3.5" /> ¿Qué aprenderás?
                        </p>
                        <ul className="space-y-1.5">
                          {selectedCourse.what_you_learn.split('\n').filter(Boolean).map((item, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-sepia-300">
                              <CheckCircle2 className="w-3.5 h-3.5 text-sepia-500 mt-0.5 flex-shrink-0" />
                              {item.trim()}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Lista de lecciones */}
                    {previewLessons.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sepia-500 text-xs uppercase tracking-widest font-bold">Contenido del curso</p>
                        {previewLessons.map((lesson, i) => (
                          <div key={lesson.id} className="flex items-center gap-3 px-3 py-2.5 bg-sepia-800/30 rounded-xl border border-sepia-800">
                            {lesson.is_free_preview
                              ? <Unlock className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                              : <Lock className="w-3.5 h-3.5 text-sepia-600 flex-shrink-0" />
                            }
                            <span className="text-sepia-400 text-xs font-mono">{String(i + 1).padStart(2, '0')}</span>
                            <span className="text-sepia-200 text-sm flex-1 line-clamp-1">{lesson.title}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between bg-sepia-800/40 border border-sepia-700 rounded-xl px-4 py-3">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-sepia-500" />
                        <span className={`font-bold text-lg ${selectedCourse.price === 0 ? 'text-green-400' : 'text-sepia-100'}`}>
                          {formatPrice(selectedCourse.price)}
                        </span>
                      </div>
                      <button
                        onClick={() => setShowRegister(true)}
                        className="bg-sepia-500 hover:bg-sepia-400 text-sepia-950 font-bold uppercase tracking-widest text-xs px-5 py-2.5 rounded-xl transition-all"
                      >
                        Inscribirme
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Lightbox imágenes ── */}
      <AnimatePresence>
        {lightboxImg && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightboxImg(null)}
            className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4"
          >
            <img src={lightboxImg} alt="" className="max-w-full max-h-full rounded-xl shadow-2xl" onContextMenu={e => e.preventDefault()} />
            <button onClick={() => setLightboxImg(null)} className="absolute top-4 right-4 text-white/70 hover:text-white">
              <X className="w-7 h-7" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};
