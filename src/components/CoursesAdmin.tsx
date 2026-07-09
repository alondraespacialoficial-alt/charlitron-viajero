import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus, Trash2, Edit2, Save, X, Upload, Loader2, Check,
  AlertCircle, BookOpen, FileText, Image as ImageIcon,
  Video, Volume2, Lock, Unlock, ChevronDown, ChevronUp,
  HelpCircle, MessageSquare, Users, Key, Send, Eye,
} from 'lucide-react';
import { Course, CourseLesson, CourseEnrollment, CourseQuestion } from '../types';
import { supabase } from '../supabase';

type AdminTab = 'courses' | 'lessons' | 'enrollments' | 'questions';

export const CoursesAdmin: React.FC = () => {
  const [adminTab, setAdminTab] = useState<AdminTab>('courses');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ── Courses ────────────────────────────────────────────────────────
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [editingCourse, setEditingCourse] = useState<Partial<Course> | null>(null);
  const [isSavingCourse, setIsSavingCourse] = useState(false);
  const [isDeletingCourse, setIsDeletingCourse] = useState<string | null>(null);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [isUploadingCertImg, setIsUploadingCertImg] = useState<string | null>(null);

  // ── Lessons ────────────────────────────────────────────────────────
  const [lessons, setLessons] = useState<CourseLesson[]>([]);
  const [editingLesson, setEditingLesson] = useState<Partial<CourseLesson> | null>(null);
  const [isSavingLesson, setIsSavingLesson] = useState(false);
  const [isDeletingLesson, setIsDeletingLesson] = useState<string | null>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState<string | null>(null); // field name
  const [newImageUrl, setNewImageUrl] = useState('');

  // ── Enrollments ────────────────────────────────────────────────────
  const [enrollments, setEnrollments] = useState<CourseEnrollment[]>([]);
  const [updatingEnrollment, setUpdatingEnrollment] = useState<string | null>(null);
  const [enrollmentNotes, setEnrollmentNotes] = useState<Record<string, string>>({});
  const [expandedEnrollment, setExpandedEnrollment] = useState<string | null>(null);

  // ── Questions ──────────────────────────────────────────────────────
  const [questions, setQuestions] = useState<CourseQuestion[]>([]);
  const [answerTexts, setAnswerTexts] = useState<Record<string, string>>({});
  const [savingAnswer, setSavingAnswer] = useState<string | null>(null);

  useEffect(() => { fetchCourses(); }, []);
  useEffect(() => {
    if (selectedCourse) {
      fetchLessons(selectedCourse.id);
      fetchEnrollments(selectedCourse.id);
      fetchQuestions(selectedCourse.id);
    }
  }, [selectedCourse]);

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3500);
  };

  // ── Fetch ──────────────────────────────────────────────────────────
  const fetchCourses = async () => {
    const { data } = await supabase.from('courses').select('*').order('order_index', { ascending: true });
    setCourses(data || []);
  };

  const fetchLessons = async (courseId: string) => {
    const { data } = await supabase.from('course_lessons').select('*').eq('course_id', courseId).order('order_index', { ascending: true });
    setLessons((data || []).map(l => ({ ...l, images: Array.isArray(l.images) ? l.images : [] })));
  };

  const fetchEnrollments = async (courseId: string) => {
    const { data } = await supabase.from('course_enrollments').select('*').eq('course_id', courseId).order('created_at', { ascending: false });
    setEnrollments(data || []);
    const notes: Record<string, string> = {};
    (data || []).forEach(e => { notes[e.id] = e.payment_notes || ''; });
    setEnrollmentNotes(notes);
  };

  const fetchQuestions = async (courseId: string) => {
    const { data } = await supabase.from('course_questions').select('*').eq('course_id', courseId).order('created_at', { ascending: true });
    setQuestions(data || []);
    const answers: Record<string, string> = {};
    (data || []).forEach(q => { answers[q.id] = q.answer_text || ''; });
    setAnswerTexts(answers);
  };

  // ── Certificate image upload ─────────────────────────────────────────
  const handleCertImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'certificate_bg_url' | 'logo_url' | 'signature_url') => {
    const file = e.target.files?.[0];
    if (!file || !editingCourse) return;
    setIsUploadingCertImg(field);
    try {
      const folder = 'courses/cert';
      const fileName = `${folder}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from('images').upload(fileName, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from('images').getPublicUrl(fileName);
      setEditingCourse({ ...editingCourse, [field]: data.publicUrl });
    } catch { showMsg('error', 'Error al subir la imagen'); }
    finally { setIsUploadingCertImg(null); }
  };

  // ── Banner upload ──────────────────────────────────────────────────
  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingCourse) return;
    setIsUploadingBanner(true);
    try {
      const fileName = `courses/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from('images').upload(fileName, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from('images').getPublicUrl(fileName);
      setEditingCourse({ ...editingCourse, banner_url: data.publicUrl });
    } catch { showMsg('error', 'Error al subir el banner'); }
    finally { setIsUploadingBanner(false); }
  };

  // ── Media upload for lessons ───────────────────────────────────────
  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'audio_url' | 'pdf_url') => {
    const file = e.target.files?.[0];
    if (!file || !editingLesson) return;
    setIsUploadingMedia(field);
    try {
      const folder = field === 'pdf_url' ? 'courses/pdfs' : 'courses/audio';
      const fileName = `${folder}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from('images').upload(fileName, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from('images').getPublicUrl(fileName);
      setEditingLesson({ ...editingLesson, [field]: data.publicUrl });
    } catch { showMsg('error', `Error al subir el archivo`); }
    finally { setIsUploadingMedia(null); }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingLesson) return;
    setIsUploadingMedia('image');
    try {
      const fileName = `courses/images/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from('images').upload(fileName, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from('images').getPublicUrl(fileName);
      const imgs = editingLesson.images || [];
      setEditingLesson({ ...editingLesson, images: [...imgs, data.publicUrl] });
    } catch { showMsg('error', 'Error al subir la imagen'); }
    finally { setIsUploadingMedia(null); }
  };

  // ── Save course ────────────────────────────────────────────────────
  const handleSaveCourse = async () => {
    if (!editingCourse?.title?.trim()) { showMsg('error', 'El título es obligatorio'); return; }
    setIsSavingCourse(true);
    try {
      const payload = {
        title: editingCourse.title,
        description: editingCourse.description || null,
        banner_url: editingCourse.banner_url || null,
        price: editingCourse.price ?? 0,
        is_active: editingCourse.is_active ?? true,
        order_index: editingCourse.order_index ?? 0,
        collaborator_code: editingCourse.collaborator_code?.trim().toUpperCase() || null,
        instructor_share: editingCourse.instructor_share ?? 0,
        instructor_name: editingCourse.instructor_name?.trim() || null,
        duration_text: editingCourse.duration_text?.trim() || null,
        level: editingCourse.level || null,
        what_you_learn: editingCourse.what_you_learn?.trim() || null,
        certificate_bg_url: editingCourse.certificate_bg_url?.trim() || null,
        logo_url: editingCourse.logo_url?.trim() || null,
        signature_url: editingCourse.signature_url?.trim() || null,
        federation_legend: editingCourse.federation_legend?.trim() || null,
      };
      if (editingCourse.id) {
        const { error } = await supabase.from('courses').update(payload).eq('id', editingCourse.id);
        if (error) throw error;
        showMsg('success', 'Curso actualizado');
      } else {
        const { error } = await supabase.from('courses').insert([payload]);
        if (error) throw error;
        showMsg('success', 'Curso creado');
      }
      setEditingCourse(null);
      fetchCourses();
    } catch { showMsg('error', 'Error al guardar'); }
    finally { setIsSavingCourse(false); }
  };

  const handleDeleteCourse = async (id: string) => {
    if (!confirm('¿Eliminar este curso y todo su contenido?')) return;
    setIsDeletingCourse(id);
    await supabase.from('courses').delete().eq('id', id);
    if (selectedCourse?.id === id) { setSelectedCourse(null); setLessons([]); setEnrollments([]); setQuestions([]); }
    fetchCourses();
    setIsDeletingCourse(null);
  };

  // ── Save lesson ────────────────────────────────────────────────────
  const handleSaveLesson = async () => {
    if (!editingLesson?.title?.trim() || !selectedCourse) { showMsg('error', 'El título es obligatorio'); return; }
    setIsSavingLesson(true);
    try {
      const payload = {
        course_id: selectedCourse.id,
        title: editingLesson.title,
        description: editingLesson.description || null,
        video_url: editingLesson.video_url || null,
        audio_url: editingLesson.audio_url || null,
        pdf_url: editingLesson.pdf_url || null,
        images: editingLesson.images || [],
        text_content: editingLesson.text_content || null,
        order_index: editingLesson.order_index ?? lessons.length,
        is_free_preview: editingLesson.is_free_preview ?? false,
      };
      if (editingLesson.id) {
        const { error } = await supabase.from('course_lessons').update(payload).eq('id', editingLesson.id);
        if (error) throw error;
        showMsg('success', 'Lección actualizada');
      } else {
        const { error } = await supabase.from('course_lessons').insert([payload]);
        if (error) throw error;
        showMsg('success', 'Lección creada');
      }
      setEditingLesson(null);
      fetchLessons(selectedCourse.id);
    } catch { showMsg('error', 'Error al guardar la lección'); }
    finally { setIsSavingLesson(false); }
  };

  const handleDeleteLesson = async (id: string) => {
    if (!confirm('¿Eliminar esta lección?')) return;
    setIsDeletingLesson(id);
    await supabase.from('course_lessons').delete().eq('id', id);
    if (selectedCourse) fetchLessons(selectedCourse.id);
    setIsDeletingLesson(null);
  };

  // ── Enrollment actions ─────────────────────────────────────────────
  const handleUpdateEnrollment = async (id: string, status: 'paid' | 'cancelled' | 'pending') => {
    setUpdatingEnrollment(id);
    try {
      const { error } = await supabase.from('course_enrollments').update({
        status,
        payment_notes: enrollmentNotes[id] || null,
      }).eq('id', id);
      if (error) throw error;
      showMsg('success', status === 'paid' ? '¡Acceso activado! El alumno ya puede entrar.' : `Estado actualizado`);
      if (selectedCourse) {
        await fetchEnrollments(selectedCourse.id);
        // Re-fetch to get the generated access_code
        const { data } = await supabase.from('course_enrollments').select('access_code').eq('id', id).single();
        if (data?.access_code) showMsg('success', `Código generado: ${data.access_code}`);
      }
    } catch { showMsg('error', 'Error al actualizar'); }
    finally { setUpdatingEnrollment(null); }
  };

  // ── Answer question ────────────────────────────────────────────────
  const handleSaveAnswer = async (questionId: string) => {
    if (!answerTexts[questionId]?.trim()) return;
    setSavingAnswer(questionId);
    try {
      await supabase.from('course_questions').update({
        answer_text: answerTexts[questionId].trim(),
        answered_by: 'Administrador',
        answered_at: new Date().toISOString(),
      }).eq('id', questionId);
      showMsg('success', 'Respuesta guardada');
      if (selectedCourse) fetchQuestions(selectedCourse.id);
    } catch { showMsg('error', 'Error al guardar respuesta'); }
    finally { setSavingAnswer(null); }
  };

  const statusLabel = (s: string) => s === 'paid' ? 'Pagado' : s === 'cancelled' ? 'Cancelado' : 'Pendiente';
  const statusColor = (s: string) => s === 'paid' ? 'text-green-400 bg-green-900/30 border-green-700' : s === 'cancelled' ? 'text-red-400 bg-red-900/30 border-red-700' : 'text-amber-400 bg-amber-900/30 border-amber-700';
  const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

  return (
    <div className="space-y-6">
      {/* Message */}
      <AnimatePresence>
        {message && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className={`flex items-center gap-2 p-3 rounded-xl text-sm border ${message.type === 'success' ? 'bg-green-900/30 border-green-700 text-green-400' : 'bg-red-900/30 border-red-700 text-red-400'}`}
          >
            {message.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {message.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── FORM: Editar / Crear curso ── */}
      <AnimatePresence>
        {editingCourse && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="bg-sepia-800/50 border border-sepia-700 rounded-2xl p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sepia-100 font-serif text-lg">{editingCourse.id ? 'Editar Curso' : 'Nuevo Curso'}</h3>
              <button onClick={() => setEditingCourse(null)} className="text-sepia-500 hover:text-sepia-200"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 space-y-1">
                <label className="text-xs text-sepia-400 uppercase tracking-widest">Título *</label>
                <input type="text" value={editingCourse.title || ''} onChange={e => setEditingCourse({ ...editingCourse, title: e.target.value })}
                  placeholder="Nombre del curso" className="w-full bg-sepia-900 border border-sepia-700 rounded-xl px-4 py-2.5 text-sepia-100 placeholder-sepia-600 outline-none focus:border-sepia-500" />
              </div>
              <div className="md:col-span-2 space-y-1">
                <label className="text-xs text-sepia-400 uppercase tracking-widest">Descripción</label>
                <textarea rows={3} value={editingCourse.description || ''} onChange={e => setEditingCourse({ ...editingCourse, description: e.target.value })}
                  placeholder="Descripción del curso..." className="w-full bg-sepia-900 border border-sepia-700 rounded-xl px-4 py-2.5 text-sepia-100 placeholder-sepia-600 outline-none focus:border-sepia-500 resize-none" />
              </div>
              {/* Banner */}
              <div className="md:col-span-2 space-y-2">
                <label className="text-xs text-sepia-400 uppercase tracking-widest">Banner</label>
                {editingCourse.banner_url && (
                  <div className="relative w-full rounded-xl overflow-hidden border border-sepia-700 bg-sepia-900">
                    <img src={editingCourse.banner_url} alt="Banner" className="w-full h-40 object-cover" />
                    <button onClick={() => setEditingCourse({ ...editingCourse, banner_url: '' })} className="absolute top-2 right-2 bg-red-900/80 text-red-300 rounded-full p-1"><X className="w-4 h-4" /></button>
                  </div>
                )}
                <label className="flex items-center gap-3 cursor-pointer bg-sepia-900 border border-dashed border-sepia-700 rounded-xl px-4 py-3 hover:border-sepia-500 transition-all">
                  {isUploadingBanner ? <Loader2 className="w-5 h-5 text-sepia-400 animate-spin" /> : <Upload className="w-5 h-5 text-sepia-400" />}
                  <span className="text-sepia-400 text-sm">{isUploadingBanner ? 'Subiendo...' : 'Subir banner'}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleBannerUpload} disabled={isUploadingBanner} />
                </label>
                <input type="url" value={editingCourse.banner_url || ''} onChange={e => setEditingCourse({ ...editingCourse, banner_url: e.target.value })}
                  placeholder="O pegar URL del banner..." className="w-full bg-sepia-900 border border-sepia-700 rounded-xl px-4 py-2 text-sepia-100 placeholder-sepia-600 outline-none focus:border-sepia-500 text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-sepia-400 uppercase tracking-widest">Precio MXN (0 = libre)</label>
                <input type="number" min={0} step={0.01} value={editingCourse.price ?? 0} onChange={e => setEditingCourse({ ...editingCourse, price: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-sepia-900 border border-sepia-700 rounded-xl px-4 py-2.5 text-sepia-100 outline-none focus:border-sepia-500" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-sepia-400 uppercase tracking-widest">Orden (menor = primero)</label>
                <input type="number" min={0} value={editingCourse.order_index ?? 0} onChange={e => setEditingCourse({ ...editingCourse, order_index: parseInt(e.target.value) || 0 })}
                  className="w-full bg-sepia-900 border border-sepia-700 rounded-xl px-4 py-2.5 text-sepia-100 outline-none focus:border-sepia-500" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-sepia-400 uppercase tracking-widest">Instructor</label>
                <input type="text" value={editingCourse.instructor_name || ''} onChange={e => setEditingCourse({ ...editingCourse, instructor_name: e.target.value })}
                  placeholder="Ej: Adrián Álvarez Carlos" className="w-full bg-sepia-900 border border-sepia-700 rounded-xl px-4 py-2.5 text-sepia-100 placeholder-sepia-600 outline-none focus:border-sepia-500 text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-sepia-400 uppercase tracking-widest">Duración</label>
                <input type="text" value={editingCourse.duration_text || ''} onChange={e => setEditingCourse({ ...editingCourse, duration_text: e.target.value })}
                  placeholder="Ej: 6 horas · 8 lecciones" className="w-full bg-sepia-900 border border-sepia-700 rounded-xl px-4 py-2.5 text-sepia-100 placeholder-sepia-600 outline-none focus:border-sepia-500 text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-sepia-400 uppercase tracking-widest">Nivel</label>
                <select value={editingCourse.level || ''} onChange={e => setEditingCourse({ ...editingCourse, level: (e.target.value as Course['level']) || undefined })}
                  className="w-full bg-sepia-900 border border-sepia-700 rounded-xl px-4 py-2.5 text-sepia-100 outline-none focus:border-sepia-500 text-sm">
                  <option value="">Sin especificar</option>
                  <option value="basico">Básico</option>
                  <option value="intermedio">Intermedio</option>
                  <option value="avanzado">Avanzado</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-sepia-400 uppercase tracking-widest">Código colaborador (opcional)</label>
                <input type="text" value={editingCourse.collaborator_code || ''} onChange={e => setEditingCourse({ ...editingCourse, collaborator_code: e.target.value.toUpperCase() })}
                  placeholder="Ej: COLB-XXXX" className="w-full bg-sepia-900 border border-sepia-700 rounded-xl px-4 py-2.5 text-sepia-100 placeholder-sepia-600 outline-none focus:border-sepia-500 font-mono text-sm" />
              </div>
              <div className="md:col-span-2 space-y-1">
                <label className="text-xs text-sepia-400 uppercase tracking-widest">¿Qué aprenderás? (una línea por punto)</label>
                <textarea rows={4} value={editingCourse.what_you_learn || ''} onChange={e => setEditingCourse({ ...editingCourse, what_you_learn: e.target.value })}
                  placeholder="Identificar apellidos de origen hebreo\nInterpretar documentos del siglo XIX\nUsar herramientas de búsqueda genealógica" className="w-full bg-sepia-900 border border-sepia-700 rounded-xl px-4 py-2.5 text-sepia-100 placeholder-sepia-600 outline-none focus:border-sepia-500 resize-none text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-sepia-400 uppercase tracking-widest">% del instructor (0-100)</label>
                <input type="number" min={0} max={100} step={1} value={editingCourse.instructor_share ?? 0} onChange={e => setEditingCourse({ ...editingCourse, instructor_share: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) })}
                  className="w-full bg-sepia-900 border border-sepia-700 rounded-xl px-4 py-2.5 text-sepia-100 outline-none focus:border-sepia-500" />
              </div>
              {/* ── Constancia / Certificado ── */}
              <div className="md:col-span-2">
                <p className="text-xs text-sepia-400 uppercase tracking-widest font-bold mb-3 border-t border-sepia-700 pt-4">Constancia (PDF)</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {(['certificate_bg_url', 'logo_url', 'signature_url'] as const).map(field => {
                    const labels = { certificate_bg_url: 'Fondo', logo_url: 'Logo', signature_url: 'Firma' };
                    return (
                      <div key={field} className="space-y-2">
                        <label className="text-xs text-sepia-500 uppercase tracking-widest">{labels[field]}</label>
                        {editingCourse[field] && (
                          <div className="relative">
                            <img src={editingCourse[field] as string} alt={labels[field]} className="w-full h-16 object-cover rounded-lg border border-sepia-700" />
                            <button onClick={() => setEditingCourse({ ...editingCourse, [field]: '' })} className="absolute top-1 right-1 bg-red-900/80 text-red-300 rounded-full p-0.5"><X className="w-3 h-3" /></button>
                          </div>
                        )}
                        <label className="flex items-center gap-2 cursor-pointer bg-sepia-900 border border-dashed border-sepia-700 rounded-xl px-3 py-2 hover:border-sepia-500 transition-all text-xs">
                          {isUploadingCertImg === field ? <Loader2 className="w-3.5 h-3.5 text-sepia-400 animate-spin" /> : <Upload className="w-3.5 h-3.5 text-sepia-400" />}
                          <span className="text-sepia-400">{isUploadingCertImg === field ? 'Subiendo...' : 'Subir imagen'}</span>
                          <input type="file" accept="image/*" className="hidden" onChange={e => handleCertImageUpload(e, field)} disabled={!!isUploadingCertImg} />
                        </label>
                        <input type="url" value={(editingCourse[field] as string) || ''} onChange={e => setEditingCourse({ ...editingCourse, [field]: e.target.value })}
                          placeholder="O pegar URL..." className="w-full bg-sepia-900 border border-sepia-700 rounded-xl px-3 py-1.5 text-sepia-100 placeholder-sepia-600 outline-none focus:border-sepia-500 text-xs" />
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="md:col-span-2 space-y-1">
                <label className="text-xs text-sepia-400 uppercase tracking-widest">Leyenda de federación / institución (opcional)</label>
                <textarea rows={2} value={editingCourse.federation_legend || ''} onChange={e => setEditingCourse({ ...editingCourse, federation_legend: e.target.value })}
                  placeholder="Ej: Avalado por la Asociación Mexicana de Genealogía y Heráldica" className="w-full bg-sepia-900 border border-sepia-700 rounded-xl px-4 py-2.5 text-sepia-100 placeholder-sepia-600 outline-none focus:border-sepia-500 resize-none text-sm" />
              </div>
              <div className="md:col-span-2 flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={editingCourse.is_active ?? true} onChange={e => setEditingCourse({ ...editingCourse, is_active: e.target.checked })} className="sr-only peer" />
                  <div className="w-10 h-6 bg-sepia-700 rounded-full peer-checked:bg-sepia-500 transition-all after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-4" />
                </label>
                <span className="text-sepia-400 text-sm">Visible al público</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={handleSaveCourse} disabled={isSavingCourse} className="flex items-center gap-2 bg-sepia-500 hover:bg-sepia-400 disabled:opacity-50 text-sepia-950 font-bold uppercase tracking-widest text-xs px-5 py-2.5 rounded-xl transition-all">
                {isSavingCourse ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar
              </button>
              <button onClick={() => setEditingCourse(null)} className="text-sepia-400 hover:text-sepia-200 border border-sepia-700 px-5 py-2.5 rounded-xl text-xs uppercase tracking-widest transition-all">
                Cancelar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── FORM: Editar / Crear lección ── */}
      <AnimatePresence>
        {editingLesson && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="bg-sepia-800/50 border border-amber-700/40 rounded-2xl p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sepia-100 font-serif text-lg">{editingLesson.id ? 'Editar Lección' : 'Nueva Lección'}</h3>
              <button onClick={() => setEditingLesson(null)} className="text-sepia-500 hover:text-sepia-200"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 space-y-1">
                <label className="text-xs text-sepia-400 uppercase tracking-widest">Título *</label>
                <input type="text" value={editingLesson.title || ''} onChange={e => setEditingLesson({ ...editingLesson, title: e.target.value })}
                  placeholder="Nombre de la lección" className="w-full bg-sepia-900 border border-sepia-700 rounded-xl px-4 py-2.5 text-sepia-100 placeholder-sepia-600 outline-none focus:border-sepia-500" />
              </div>
              <div className="md:col-span-2 space-y-1">
                <label className="text-xs text-sepia-400 uppercase tracking-widest">Descripción corta</label>
                <input type="text" value={editingLesson.description || ''} onChange={e => setEditingLesson({ ...editingLesson, description: e.target.value })}
                  placeholder="Resumen de la lección" className="w-full bg-sepia-900 border border-sepia-700 rounded-xl px-4 py-2.5 text-sepia-100 placeholder-sepia-600 outline-none focus:border-sepia-500" />
              </div>

              {/* Video */}
              <div className="md:col-span-2 space-y-1">
                <label className="flex items-center gap-2 text-xs text-sepia-400 uppercase tracking-widest"><Video className="w-3.5 h-3.5" /> Video (URL YouTube o directo)</label>
                <input type="url" value={editingLesson.video_url || ''} onChange={e => setEditingLesson({ ...editingLesson, video_url: e.target.value })}
                  placeholder="https://youtube.com/watch?v=... o https://..." className="w-full bg-sepia-900 border border-sepia-700 rounded-xl px-4 py-2.5 text-sepia-100 placeholder-sepia-600 outline-none focus:border-sepia-500 text-sm" />
              </div>

              {/* Audio */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs text-sepia-400 uppercase tracking-widest"><Volume2 className="w-3.5 h-3.5" /> Audio</label>
                {editingLesson.audio_url && (
                  <div className="flex items-center gap-2 bg-sepia-900 border border-sepia-700 rounded-xl px-3 py-2">
                    <Volume2 className="w-4 h-4 text-sepia-400 flex-shrink-0" />
                    <span className="text-sepia-300 text-xs truncate flex-1">{editingLesson.audio_url.split('/').pop()}</span>
                    <button onClick={() => setEditingLesson({ ...editingLesson, audio_url: '' })} className="text-sepia-600 hover:text-red-400"><X className="w-4 h-4" /></button>
                  </div>
                )}
                <label className="flex items-center gap-2 cursor-pointer bg-sepia-900 border border-dashed border-sepia-700 rounded-xl px-3 py-2.5 hover:border-sepia-500 transition-all text-sm">
                  {isUploadingMedia === 'audio_url' ? <Loader2 className="w-4 h-4 text-sepia-400 animate-spin" /> : <Upload className="w-4 h-4 text-sepia-400" />}
                  <span className="text-sepia-400">{isUploadingMedia === 'audio_url' ? 'Subiendo...' : 'Subir audio (mp3)'}</span>
                  <input type="file" accept="audio/*" className="hidden" onChange={e => handleMediaUpload(e, 'audio_url')} disabled={!!isUploadingMedia} />
                </label>
                <input type="url" value={editingLesson.audio_url || ''} onChange={e => setEditingLesson({ ...editingLesson, audio_url: e.target.value })}
                  placeholder="O pegar URL del audio..." className="w-full bg-sepia-900 border border-sepia-700 rounded-xl px-3 py-2 text-sepia-100 placeholder-sepia-600 outline-none focus:border-sepia-500 text-xs" />
              </div>

              {/* PDF */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs text-sepia-400 uppercase tracking-widest"><FileText className="w-3.5 h-3.5" /> PDF</label>
                {editingLesson.pdf_url && (
                  <div className="flex items-center gap-2 bg-sepia-900 border border-sepia-700 rounded-xl px-3 py-2">
                    <FileText className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <span className="text-sepia-300 text-xs truncate flex-1">{editingLesson.pdf_url.split('/').pop()}</span>
                    <button onClick={() => setEditingLesson({ ...editingLesson, pdf_url: '' })} className="text-sepia-600 hover:text-red-400"><X className="w-4 h-4" /></button>
                  </div>
                )}
                <label className="flex items-center gap-2 cursor-pointer bg-sepia-900 border border-dashed border-sepia-700 rounded-xl px-3 py-2.5 hover:border-sepia-500 transition-all text-sm">
                  {isUploadingMedia === 'pdf_url' ? <Loader2 className="w-4 h-4 text-sepia-400 animate-spin" /> : <Upload className="w-4 h-4 text-sepia-400" />}
                  <span className="text-sepia-400">{isUploadingMedia === 'pdf_url' ? 'Subiendo...' : 'Subir PDF'}</span>
                  <input type="file" accept="application/pdf" className="hidden" onChange={e => handleMediaUpload(e, 'pdf_url')} disabled={!!isUploadingMedia} />
                </label>
                <input type="url" value={editingLesson.pdf_url || ''} onChange={e => setEditingLesson({ ...editingLesson, pdf_url: e.target.value })}
                  placeholder="O pegar URL del PDF..." className="w-full bg-sepia-900 border border-sepia-700 rounded-xl px-3 py-2 text-sepia-100 placeholder-sepia-600 outline-none focus:border-sepia-500 text-xs" />
              </div>

              {/* Imágenes */}
              <div className="md:col-span-2 space-y-2">
                <label className="flex items-center gap-2 text-xs text-sepia-400 uppercase tracking-widest"><ImageIcon className="w-3.5 h-3.5" /> Imágenes</label>
                {(editingLesson.images || []).length > 0 && (
                  <div className="grid grid-cols-4 gap-2">
                    {(editingLesson.images || []).map((img, idx) => (
                      <div key={idx} className="relative group">
                        <img src={img} alt="" className="w-full h-16 object-cover rounded-lg border border-sepia-700" />
                        <button onClick={() => setEditingLesson({ ...editingLesson, images: editingLesson.images!.filter((_, i) => i !== idx) })}
                          className="absolute top-0.5 right-0.5 bg-red-900/80 text-red-300 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <label className="flex items-center gap-2 cursor-pointer bg-sepia-900 border border-dashed border-sepia-700 rounded-xl px-3 py-2.5 hover:border-sepia-500 transition-all text-sm">
                  {isUploadingMedia === 'image' ? <Loader2 className="w-4 h-4 text-sepia-400 animate-spin" /> : <Upload className="w-4 h-4 text-sepia-400" />}
                  <span className="text-sepia-400">{isUploadingMedia === 'image' ? 'Subiendo...' : 'Subir imagen'}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={!!isUploadingMedia} />
                </label>
                <div className="flex gap-2">
                  <input type="url" value={newImageUrl} onChange={e => setNewImageUrl(e.target.value)}
                    placeholder="O pegar URL de imagen..." className="flex-1 bg-sepia-900 border border-sepia-700 rounded-xl px-3 py-2 text-sepia-100 placeholder-sepia-600 outline-none focus:border-sepia-500 text-xs" />
                  <button onClick={() => { if (newImageUrl.trim()) { setEditingLesson({ ...editingLesson, images: [...(editingLesson.images || []), newImageUrl.trim()] }); setNewImageUrl(''); } }}
                    className="bg-sepia-600 hover:bg-sepia-500 text-sepia-100 px-3 py-2 rounded-xl text-xs font-bold transition-all">
                    + Añadir
                  </button>
                </div>
              </div>

              {/* Texto */}
              <div className="md:col-span-2 space-y-1">
                <label className="flex items-center gap-2 text-xs text-sepia-400 uppercase tracking-widest"><FileText className="w-3.5 h-3.5" /> Notas / Texto de la lección</label>
                <textarea rows={5} value={editingLesson.text_content || ''} onChange={e => setEditingLesson({ ...editingLesson, text_content: e.target.value })}
                  placeholder="Escribe aquí las notas, explicaciones o cualquier texto para esta lección..."
                  className="w-full bg-sepia-900 border border-sepia-700 rounded-xl px-4 py-2.5 text-sepia-100 placeholder-sepia-600 outline-none focus:border-sepia-500 resize-none text-sm leading-relaxed" />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-sepia-400 uppercase tracking-widest">Orden</label>
                <input type="number" min={0} value={editingLesson.order_index ?? lessons.length} onChange={e => setEditingLesson({ ...editingLesson, order_index: parseInt(e.target.value) || 0 })}
                  className="w-full bg-sepia-900 border border-sepia-700 rounded-xl px-4 py-2.5 text-sepia-100 outline-none focus:border-sepia-500" />
              </div>
              <div className="flex items-center gap-3 self-end pb-1">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={editingLesson.is_free_preview ?? false} onChange={e => setEditingLesson({ ...editingLesson, is_free_preview: e.target.checked })} className="sr-only peer" />
                  <div className="w-10 h-6 bg-sepia-700 rounded-full peer-checked:bg-green-600 transition-all after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-4" />
                </label>
                <span className="text-sepia-400 text-sm">Vista previa gratuita</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={handleSaveLesson} disabled={isSavingLesson} className="flex items-center gap-2 bg-amber-700/60 hover:bg-amber-700/80 disabled:opacity-50 text-amber-100 font-bold uppercase tracking-widest text-xs px-5 py-2.5 rounded-xl transition-all border border-amber-600">
                {isSavingLesson ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar Lección
              </button>
              <button onClick={() => setEditingLesson(null)} className="text-sepia-400 hover:text-sepia-200 border border-sepia-700 px-5 py-2.5 rounded-xl text-xs uppercase tracking-widest transition-all">Cancelar</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── LAYOUT PRINCIPAL ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Lista de cursos */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sepia-300 font-bold uppercase tracking-widest text-xs">Cursos ({courses.length})</h3>
            <button onClick={() => setEditingCourse({ is_active: true, price: 0, order_index: courses.length })}
              className="flex items-center gap-1.5 bg-sepia-600 hover:bg-sepia-500 text-sepia-100 text-xs font-bold uppercase tracking-widest px-3 py-2 rounded-xl transition-all">
              <Plus className="w-3.5 h-3.5" /> Nuevo
            </button>
          </div>
          {courses.length === 0 ? (
            <div className="bg-sepia-800/30 border border-dashed border-sepia-700 rounded-xl p-8 text-center text-sepia-600 text-sm">Sin cursos. Crea el primero.</div>
          ) : (
            <div className="space-y-3">
              {courses.map(course => (
                <div key={course.id} onClick={() => { setSelectedCourse(course); setAdminTab('lessons'); }}
                  className={`cursor-pointer border rounded-xl p-4 transition-all space-y-2 ${selectedCourse?.id === course.id ? 'border-sepia-500 bg-sepia-700/40' : 'border-sepia-800 bg-sepia-800/30 hover:border-sepia-600'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sepia-100 font-serif text-sm line-clamp-1 flex-1">{course.title}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${course.is_active ? 'text-green-400 border-green-700 bg-green-900/30' : 'text-sepia-500 border-sepia-700'}`}>
                      {course.is_active ? 'Activo' : 'Oculto'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sepia-400 text-xs">{course.price === 0 ? 'Libre' : `$${course.price} MXN`}</span>
                    <div className="flex gap-1">
                      <button onClick={e => { e.stopPropagation(); setEditingCourse(course); }} className="text-sepia-500 hover:text-sepia-200 p-1 rounded-lg hover:bg-sepia-700 transition-all"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={e => { e.stopPropagation(); handleDeleteCourse(course.id); }} disabled={isDeletingCourse === course.id} className="text-sepia-500 hover:text-red-400 p-1 rounded-lg hover:bg-sepia-700 transition-all">
                        {isDeletingCourse === course.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Panel derecho: Lecciones / Inscritos / Preguntas */}
        <div className="lg:col-span-2 space-y-4">
          {!selectedCourse ? (
            <div className="bg-sepia-800/30 border border-dashed border-sepia-700 rounded-xl p-12 text-center text-sepia-600 text-sm">
              Selecciona un curso para gestionar su contenido.
            </div>
          ) : (
            <>
              {/* Tabs del panel derecho */}
              <div className="flex gap-1 bg-sepia-900/60 border border-sepia-800 rounded-xl p-1 flex-wrap">
                {([
                  { key: 'lessons', label: 'Lecciones', Icon: BookOpen },
                  { key: 'enrollments', label: 'Inscritos', Icon: Users },
                  { key: 'questions', label: 'Preguntas', Icon: HelpCircle },
                ] as { key: AdminTab; label: string; Icon: React.ElementType }[]).map(({ key, label, Icon }) => (
                  <button key={key} onClick={() => setAdminTab(key)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${adminTab === key ? 'bg-sepia-500 text-sepia-950' : 'text-sepia-500 hover:text-sepia-200'}`}>
                    <Icon className="w-3.5 h-3.5" />{label}
                  </button>
                ))}
              </div>

              {/* ─ Lecciones ─ */}
              {adminTab === 'lessons' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sepia-400 text-xs uppercase tracking-widest font-bold">Lecciones de "{selectedCourse.title}"</p>
                    <button onClick={() => setEditingLesson({ is_free_preview: false, order_index: lessons.length })}
                      className="flex items-center gap-1.5 bg-amber-700/50 hover:bg-amber-700/70 border border-amber-600 text-amber-200 text-xs font-bold uppercase tracking-widest px-3 py-2 rounded-xl transition-all">
                      <Plus className="w-3.5 h-3.5" /> Nueva lección
                    </button>
                  </div>
                  {lessons.length === 0 ? (
                    <div className="bg-sepia-800/30 border border-dashed border-sepia-700 rounded-xl p-8 text-center text-sepia-600 text-sm">Sin lecciones. Crea la primera.</div>
                  ) : (
                    <div className="space-y-2">
                      {lessons.map((lesson, i) => (
                        <div key={lesson.id} className="border border-sepia-800 rounded-xl p-4 bg-sepia-900/30 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <span className="text-sepia-600 font-mono text-xs flex-shrink-0">{String(i + 1).padStart(2, '0')}</span>
                              {lesson.is_free_preview ? <Unlock className="w-3.5 h-3.5 text-green-500 flex-shrink-0" /> : <Lock className="w-3.5 h-3.5 text-sepia-600 flex-shrink-0" />}
                              <p className="text-sepia-200 text-sm font-medium line-clamp-1">{lesson.title}</p>
                            </div>
                            <div className="flex gap-1 flex-shrink-0">
                              <button onClick={() => setEditingLesson(lesson)} className="text-sepia-500 hover:text-sepia-200 p-1 rounded-lg hover:bg-sepia-700 transition-all"><Edit2 className="w-3.5 h-3.5" /></button>
                              <button onClick={() => handleDeleteLesson(lesson.id)} disabled={isDeletingLesson === lesson.id} className="text-sepia-500 hover:text-red-400 p-1 rounded-lg hover:bg-sepia-700 transition-all">
                                {isDeletingLesson === lesson.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>
                          <div className="flex gap-2 ml-8 flex-wrap">
                            {lesson.video_url && <span className="flex items-center gap-1 text-[10px] text-sepia-500 bg-sepia-800 px-2 py-0.5 rounded-full"><Video className="w-2.5 h-2.5" />Video</span>}
                            {lesson.audio_url && <span className="flex items-center gap-1 text-[10px] text-sepia-500 bg-sepia-800 px-2 py-0.5 rounded-full"><Volume2 className="w-2.5 h-2.5" />Audio</span>}
                            {lesson.pdf_url && <span className="flex items-center gap-1 text-[10px] text-sepia-500 bg-sepia-800 px-2 py-0.5 rounded-full"><FileText className="w-2.5 h-2.5" />PDF</span>}
                            {lesson.images?.length ? <span className="flex items-center gap-1 text-[10px] text-sepia-500 bg-sepia-800 px-2 py-0.5 rounded-full"><ImageIcon className="w-2.5 h-2.5" />{lesson.images.length} img</span> : null}
                            {lesson.text_content && <span className="flex items-center gap-1 text-[10px] text-sepia-500 bg-sepia-800 px-2 py-0.5 rounded-full"><FileText className="w-2.5 h-2.5" />Texto</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ─ Inscritos ─ */}
              {adminTab === 'enrollments' && (
                <div className="space-y-3">
                  {/* Resumen de pagos */}
                  {selectedCourse && (() => {
                    const paid = enrollments.filter(e => e.status === 'paid').length;
                    const pending = enrollments.filter(e => e.status === 'pending').length;
                    const total = paid * (selectedCourse.price || 0);
                    const share = selectedCourse.instructor_share ?? 0;
                    const instrPart = total * share / 100;
                    const myPart = total - instrPart;
                    return (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-sepia-800/40 border border-sepia-700 rounded-2xl">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-sepia-100">{enrollments.length}</p>
                          <p className="text-[10px] text-sepia-500 uppercase tracking-widest">Total inscritos</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-green-400">{paid}</p>
                          <p className="text-[10px] text-sepia-500 uppercase tracking-widest">{pending} pendientes</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-amber-400">${total.toLocaleString('es-MX')}</p>
                          <p className="text-[10px] text-sepia-500 uppercase tracking-widest">Ingresos totales</p>
                        </div>
                        {share > 0 ? (
                          <div className="text-center">
                            <p className="text-base font-bold text-sepia-300">${instrPart.toLocaleString('es-MX')} <span className="text-sepia-500 text-xs">inst.</span></p>
                            <p className="text-base font-bold text-sepia-100">${myPart.toLocaleString('es-MX')} <span className="text-sepia-500 text-xs">tuyo</span></p>
                            <p className="text-[10px] text-sepia-500 uppercase tracking-widest">{share}% / {100-share}%</p>
                          </div>
                        ) : (
                          <div className="text-center">
                            <p className="text-2xl font-bold text-sepia-100">${myPart.toLocaleString('es-MX')}</p>
                            <p className="text-[10px] text-sepia-500 uppercase tracking-widest">Todo tuyo</p>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  <div className="flex items-center gap-4 flex-wrap">
                    <p className="text-sepia-400 text-xs uppercase tracking-widest font-bold">Inscritos ({enrollments.length})</p>
                    <div className="flex gap-2 text-xs">
                      <span className="text-amber-400">{enrollments.filter(e => e.status === 'pending').length} pendientes</span>
                      <span className="text-green-400">{enrollments.filter(e => e.status === 'paid').length} activos</span>
                    </div>
                  </div>
                  {enrollments.length === 0 ? (
                    <div className="bg-sepia-800/30 border border-dashed border-sepia-700 rounded-xl p-8 text-center text-sepia-600 text-sm">Sin inscripciones aún.</div>
                  ) : (
                    <div className="space-y-2">
                      {enrollments.map(enrollment => (
                        <div key={enrollment.id} className="border border-sepia-800 rounded-xl bg-sepia-900/30 overflow-hidden">
                          <div className="flex items-center justify-between gap-3 p-4 cursor-pointer" onClick={() => setExpandedEnrollment(expandedEnrollment === enrollment.id ? null : enrollment.id)}>
                            <div className="flex-1 min-w-0 space-y-0.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sepia-100 font-medium text-sm">{enrollment.student_name}</span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColor(enrollment.status)}`}>{statusLabel(enrollment.status)}</span>
                                {enrollment.access_code && (
                                  <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-900/30 border border-amber-700 px-2 py-0.5 rounded-full font-mono">
                                    <Key className="w-2.5 h-2.5" />{enrollment.access_code}
                                  </span>
                                )}
                              </div>
                              <p className="text-sepia-500 text-xs">{enrollment.student_email}</p>
                              <p className="text-sepia-600 text-xs">{fmtDate(enrollment.created_at)}</p>
                            </div>
                            {expandedEnrollment === enrollment.id ? <ChevronUp className="w-4 h-4 text-sepia-500 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-sepia-500 flex-shrink-0" />}
                          </div>
                          <AnimatePresence>
                            {expandedEnrollment === enrollment.id && (
                              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-sepia-800 overflow-hidden">
                                <div className="p-4 space-y-3 bg-sepia-900/40">
                                  <div className="space-y-1">
                                    <label className="text-xs text-sepia-500 uppercase tracking-widest">Notas de pago (opcional)</label>
                                    <input type="text" value={enrollmentNotes[enrollment.id] || ''} onChange={e => setEnrollmentNotes({ ...enrollmentNotes, [enrollment.id]: e.target.value })}
                                      placeholder="Ej: Transferencia BBVA #1234" className="w-full bg-sepia-800 border border-sepia-700 rounded-xl px-3 py-2 text-sepia-100 placeholder-sepia-600 outline-none focus:border-sepia-500 text-sm" />
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {enrollment.status !== 'paid' && (
                                      <button onClick={() => handleUpdateEnrollment(enrollment.id, 'paid')} disabled={updatingEnrollment === enrollment.id}
                                        className="flex items-center gap-1.5 bg-green-700/50 hover:bg-green-700/80 border border-green-600 text-green-200 text-xs font-bold uppercase tracking-widest px-3 py-2 rounded-lg transition-all disabled:opacity-50">
                                        {updatingEnrollment === enrollment.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unlock className="w-3.5 h-3.5" />}
                                        Activar acceso
                                      </button>
                                    )}
                                    {enrollment.status !== 'pending' && (
                                      <button onClick={() => handleUpdateEnrollment(enrollment.id, 'pending')} disabled={updatingEnrollment === enrollment.id}
                                        className="flex items-center gap-1.5 bg-amber-700/40 hover:bg-amber-700/60 border border-amber-700 text-amber-300 text-xs font-bold uppercase tracking-widest px-3 py-2 rounded-lg transition-all disabled:opacity-50">
                                        Pendiente
                                      </button>
                                    )}
                                    {enrollment.status !== 'cancelled' && (
                                      <button onClick={() => handleUpdateEnrollment(enrollment.id, 'cancelled')} disabled={updatingEnrollment === enrollment.id}
                                        className="flex items-center gap-1.5 bg-red-900/30 hover:bg-red-900/60 border border-red-800 text-red-400 text-xs font-bold uppercase tracking-widest px-3 py-2 rounded-lg transition-all disabled:opacity-50">
                                        Cancelar
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ─ Preguntas ─ */}
              {adminTab === 'questions' && (
                <div className="space-y-3">
                  <p className="text-sepia-400 text-xs uppercase tracking-widest font-bold">Preguntas ({questions.length})</p>
                  {questions.length === 0 ? (
                    <div className="bg-sepia-800/30 border border-dashed border-sepia-700 rounded-xl p-8 text-center text-sepia-600 text-sm">Sin preguntas aún.</div>
                  ) : (
                    <div className="space-y-3">
                      {questions.map(q => (
                        <div key={q.id} className="border border-sepia-800 rounded-xl p-4 bg-sepia-900/30 space-y-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sepia-300 text-xs font-bold">{q.student_name}</span>
                              <span className="text-sepia-600 text-xs">{fmtDate(q.created_at)}</span>
                              {q.lesson_id && <span className="text-sepia-600 text-[10px] bg-sepia-800 px-2 py-0.5 rounded-full">Lección específica</span>}
                            </div>
                            <p className="text-sepia-200 text-sm">{q.question_text}</p>
                          </div>
                          {q.answer_text ? (
                            <div className="bg-sepia-800/40 border border-amber-800/40 rounded-xl p-3 space-y-1">
                              <p className="text-amber-500 text-xs font-bold">Respondido por: {q.answered_by}</p>
                              <p className="text-sepia-300 text-sm">{q.answer_text}</p>
                            </div>
                          ) : null}
                          <div className="space-y-2">
                            <textarea rows={2} value={answerTexts[q.id] || ''} onChange={e => setAnswerTexts({ ...answerTexts, [q.id]: e.target.value })}
                              placeholder={q.answer_text ? 'Actualizar respuesta...' : 'Escribe tu respuesta...'}
                              className="w-full bg-sepia-800 border border-sepia-700 rounded-xl px-3 py-2 text-sepia-100 text-sm placeholder-sepia-600 outline-none focus:border-sepia-500 resize-none" />
                            <button onClick={() => handleSaveAnswer(q.id)} disabled={savingAnswer === q.id || !answerTexts[q.id]?.trim()}
                              className="flex items-center gap-1.5 bg-sepia-600 hover:bg-sepia-500 disabled:opacity-50 text-sepia-100 text-xs font-bold uppercase tracking-widest px-3 py-2 rounded-lg transition-all">
                              {savingAnswer === q.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                              {q.answer_text ? 'Actualizar' : 'Responder'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
