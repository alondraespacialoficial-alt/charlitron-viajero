import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Key,
  Plus,
  Send,
  CheckCircle2,
  Clock,
  XCircle,
  Image as ImageIcon,
  Video,
  Volume2,
  MapPin,
  Trash2,
  ChevronLeft,
  Upload,
  LogOut,
  User,
} from 'lucide-react';
import { supabase } from '../supabase';
import { Collaborator, PendingStory, Historian } from '../types';

interface CollaboratorsSectionProps {
  onBack: () => void;
}

const CATEGORIES = ['Familia', 'Viaje', 'Historia', 'Tradición', 'Cultura', 'Otro'];

const STATUS_CONFIG = {
  pending: { label: 'En Revisión', icon: Clock, color: 'text-amber-400', bg: 'bg-amber-400/10 border-amber-400/30' },
  approved: { label: 'Aprobada', icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/30' },
  rejected: { label: 'Rechazada', icon: XCircle, color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/30' },
};

export const CollaboratorsSection: React.FC<CollaboratorsSectionProps> = ({ onBack }) => {
  const [accessCode, setAccessCode] = useState('');
  const [collaborator, setCollaborator] = useState<Collaborator | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  const [pendingStories, setPendingStories] = useState<PendingStory[]>([]);
  const [historians, setHistorians] = useState<Historian[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [form, setForm] = useState<Partial<PendingStory>>({
    title: '',
    description: '',
    full_narrative: '',
    year: String(new Date().getFullYear()),
    category: 'Familia',
    thumbnail: '',
    video_url: '',
    audio_url: '',
    maps_url: '',
    gallery: [],
    is_private: false,
    is_video_vertical: false,
    historian_id: '',
    historian_name: '',
    historian_photo: '',
  });
  const [newGalleryUrl, setNewGalleryUrl] = useState('');

  // Persist session in localStorage
  useEffect(() => {
    const saved = localStorage.getItem('collaborator_session');
    if (saved) {
      try {
        const parsed: Collaborator = JSON.parse(saved);
        // Revalidate that the code is still active
        revalidateSession(parsed.id);
      } catch {
        localStorage.removeItem('collaborator_session');
      }
    }
  }, []);

  const revalidateSession = async (id: string) => {
    const { data } = await supabase
      .from('collaborators')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .maybeSingle();
    if (data) {
      setCollaborator(data);
      fetchMyStories(data.id);
      fetchHistorians();
    } else {
      localStorage.removeItem('collaborator_session');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessCode.trim()) return;
    setIsLoading(true);
    setLoginError('');
    try {
      const { data, error } = await supabase
        .from('collaborators')
        .select('*')
        .eq('code', accessCode.trim().toUpperCase())
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        setLoginError('Código inválido o no autorizado. Verifica con el administrador.');
        return;
      }
      setCollaborator(data);
      localStorage.setItem('collaborator_session', JSON.stringify(data));
      fetchMyStories(data.id);
      fetchHistorians();
    } catch {
      setLoginError('Error al verificar el código. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setCollaborator(null);
    localStorage.removeItem('collaborator_session');
    setPendingStories([]);
    setShowForm(false);
    setAccessCode('');
  };

  const fetchMyStories = async (collaboratorId: string) => {
    const { data } = await supabase
      .from('pending_stories')
      .select('*')
      .eq('collaborator_id', collaboratorId)
      .order('created_at', { ascending: false });
    if (data) setPendingStories(data);
  };

  const fetchHistorians = async () => {
    const { data } = await supabase
      .from('historians')
      .select('id, name, photo, specialty')
      .order('created_at', { ascending: true });
    if (data) setHistorians(data);
  };

  const handleImageUpload = async (file: File): Promise<string | null> => {
    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `collab-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(fileName);
      return publicUrl;
    } catch {
      setMessage({ type: 'error', text: 'Error al subir imagen' });
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `collab-audio-${Date.now()}.${fileExt}`;
      const { error } = await supabase.storage.from('audio').upload(fileName, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('audio').getPublicUrl(fileName);
      setForm(f => ({ ...f, audio_url: publicUrl }));
      setMessage({ type: 'success', text: 'Audio subido correctamente' });
    } catch {
      setMessage({ type: 'error', text: 'Error al subir audio' });
    } finally {
      setIsUploading(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await handleImageUpload(file);
    if (url) setForm(f => ({ ...f, thumbnail: url }));
  };

  const handleAddGalleryImage = async (e?: React.ChangeEvent<HTMLInputElement>) => {
    if (e?.target.files?.[0]) {
      const url = await handleImageUpload(e.target.files[0]);
      if (url) setForm(f => ({ ...f, gallery: [...(f.gallery || []), url] }));
    } else if (newGalleryUrl.trim()) {
      setForm(f => ({ ...f, gallery: [...(f.gallery || []), newGalleryUrl.trim()] }));
      setNewGalleryUrl('');
    }
  };

  const handleRemoveGalleryImage = (index: number) => {
    setForm(f => ({ ...f, gallery: (f.gallery || []).filter((_, i) => i !== index) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title?.trim()) {
      setMessage({ type: 'error', text: 'El título es obligatorio' });
      return;
    }
    if (!collaborator) return;
    setIsSaving(true);
    try {
      const toSave = {
        ...form,
        id: crypto.randomUUID(),
        collaborator_id: collaborator.id,
        collaborator_name: collaborator.name,
        status: 'pending' as const,
        gallery: form.gallery || [],
      };
      const { data, error } = await supabase.from('pending_stories').insert([toSave]).select();
      if (error) throw error;
      if (data) {
        setPendingStories(prev => [data[0], ...prev]);
        setShowForm(false);
        resetForm();
        setMessage({ type: 'success', text: '¡Historia enviada! El administrador la revisará pronto.' });
        setTimeout(() => setMessage(null), 5000);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: `Error al enviar: ${err.message || 'Desconocido'}` });
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setForm({
      title: '',
      description: '',
      full_narrative: '',
      year: String(new Date().getFullYear()),
      category: 'Familia',
      thumbnail: '',
      video_url: '',
      audio_url: '',
      maps_url: '',
      gallery: [],
      is_private: false,
      is_video_vertical: false,
      historian_id: '',
      historian_name: '',
      historian_photo: '',
    });
    setNewGalleryUrl('');
  };

  // ─── LOGIN SCREEN ───────────────────────────────────────────────────
  if (!collaborator) {
    return (
      <div className="min-h-screen bg-sepia-950 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full"
        >
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sepia-400 hover:text-sepia-100 transition-colors mb-8 text-sm uppercase tracking-widest"
          >
            <ChevronLeft className="w-4 h-4" /> Volver al Inicio
          </button>

          <div className="bg-sepia-900 rounded-3xl border border-sepia-800 p-10 shadow-2xl">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-sepia-800 rounded-2xl flex items-center justify-center">
                <Key className="w-8 h-8 text-sepia-400" />
              </div>
            </div>
            <h2 className="text-3xl font-serif text-sepia-100 text-center mb-2">Portal Colaboradores</h2>
            <p className="text-sepia-400 text-center text-sm mb-8">
              Ingresa tu código de acceso para enviar historias
            </p>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-widest font-bold text-sepia-500 mb-2">
                  Código de Acceso
                </label>
                <input
                  autoFocus
                  type="text"
                  value={accessCode}
                  onChange={e => setAccessCode(e.target.value.toUpperCase())}
                  placeholder="Ej: COLB-XXXX"
                  className="w-full bg-sepia-950 border border-sepia-700 rounded-xl p-4 text-sepia-100 text-center font-mono text-lg outline-none focus:border-sepia-500 transition-all uppercase tracking-widest"
                />
              </div>

              {loginError && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-red-400 text-sm text-center"
                >
                  {loginError}
                </motion.p>
              )}

              <button
                type="submit"
                disabled={isLoading || !accessCode.trim()}
                className="w-full py-4 rounded-xl bg-sepia-500 text-sepia-950 font-bold uppercase tracking-widest hover:bg-sepia-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Verificando...' : 'Ingresar'}
              </button>
            </form>

            <p className="text-sepia-600 text-xs text-center mt-6">
              ¿No tienes un código? Contacta al administrador de Charlitron.
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  // ─── COLLABORATOR DASHBOARD ──────────────────────────────────────────
  return (
    <div className="min-h-screen bg-sepia-950 pt-24 pb-20">
      <div className="max-w-4xl mx-auto px-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-sepia-400 hover:text-sepia-100 transition-colors mb-2 text-sm uppercase tracking-widest"
            >
              <ChevronLeft className="w-4 h-4" /> Inicio
            </button>
            <h1 className="text-3xl font-serif text-sepia-100">Bienvenido, <span className="text-sepia-400">{collaborator.name}</span></h1>
            <p className="text-sepia-500 text-sm mt-1 font-mono">Código: {collaborator.code}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sepia-500 hover:text-red-400 transition-colors text-sm"
          >
            <LogOut className="w-4 h-4" /> Salir
          </button>
        </div>

        {/* Message */}
        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`mb-6 p-4 rounded-xl border text-sm font-medium ${
                message.type === 'success'
                  ? 'bg-green-500/10 border-green-500/30 text-green-400'
                  : 'bg-red-500/10 border-red-500/30 text-red-400'
              }`}
            >
              {message.text}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action button */}
        {!showForm && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowForm(true)}
            className="w-full mb-8 py-5 rounded-2xl border-2 border-dashed border-sepia-700 text-sepia-400 hover:border-sepia-500 hover:text-sepia-300 transition-all flex items-center justify-center gap-3 text-sm uppercase tracking-widest font-bold"
          >
            <Plus className="w-5 h-5" /> Enviar Nueva Historia
          </motion.button>
        )}

        {/* Story Form */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-sepia-900 rounded-3xl border border-sepia-800 p-8 mb-8"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-serif text-sepia-100">Nueva Historia</h2>
                <button
                  onClick={() => { setShowForm(false); resetForm(); }}
                  className="text-sepia-500 hover:text-sepia-300 transition-colors text-sm uppercase tracking-widest"
                >
                  Cancelar
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">

                {/* ── Selector de Guardián de la Historia ── */}
                {historians.length > 0 && (
                  <div>
                    <label className="block text-xs uppercase tracking-widest font-bold text-sepia-500 mb-3">
                      <User className="w-3 h-3 inline mr-1" /> ¿Quién escribió esta historia?
                      <span className="ml-2 text-sepia-700 normal-case tracking-normal font-normal">(opcional)</span>
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {/* Opción "Ninguno" */}
                      <button
                        type="button"
                        onClick={() => setForm(f => ({ ...f, historian_id: '', historian_name: '', historian_photo: '' }))}
                        className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all text-left ${
                          !form.historian_id
                            ? 'border-sepia-500 bg-sepia-800'
                            : 'border-sepia-800 bg-sepia-950 hover:border-sepia-700'
                        }`}
                      >
                        <div className="w-12 h-12 rounded-full bg-sepia-800 border-2 border-sepia-700 flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 text-sepia-500" />
                        </div>
                        <span className="text-sepia-400 text-xs text-center leading-tight">Sin asignar</span>
                      </button>

                      {historians.map(h => (
                        <button
                          key={h.id}
                          type="button"
                          onClick={() => setForm(f => ({ ...f, historian_id: h.id, historian_name: h.name, historian_photo: h.photo }))}
                          className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all ${
                            form.historian_id === h.id
                              ? 'border-sepia-400 bg-sepia-800 shadow-lg'
                              : 'border-sepia-800 bg-sepia-950 hover:border-sepia-700'
                          }`}
                        >
                          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-sepia-700 flex-shrink-0">
                            {h.photo ? (
                              <img src={h.photo} alt={h.name} className="w-full h-full object-cover" referrerPolicy="no-referrer"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                              />
                            ) : (
                              <div className="w-full h-full bg-sepia-800 flex items-center justify-center">
                                <User className="w-5 h-5 text-sepia-500" />
                              </div>
                            )}
                          </div>
                          <div className="text-center">
                            <p className={`text-xs font-bold leading-tight line-clamp-2 ${form.historian_id === h.id ? 'text-sepia-100' : 'text-sepia-300'}`}>
                              {h.name}
                            </p>
                            {h.specialty && (
                              <p className="text-sepia-600 text-[10px] mt-0.5 line-clamp-1">{h.specialty}</p>
                            )}
                          </div>
                          {form.historian_id === h.id && (
                            <CheckCircle2 className="w-4 h-4 text-sepia-400 flex-shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                    {form.historian_id && (
                      <p className="mt-2 text-sepia-500 text-xs">
                        ✓ Historia atribuida a <span className="text-sepia-300 font-bold">{form.historian_name}</span>
                      </p>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left column */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs uppercase tracking-widest font-bold text-sepia-500 mb-2">
                        Título de la Historia *
                      </label>
                      <input
                        type="text"
                        value={form.title || ''}
                        onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                        placeholder="Ej: La Boda de mis Abuelos"
                        className="w-full bg-sepia-950 border border-sepia-700 rounded-xl p-3 text-sepia-100 outline-none focus:border-sepia-500 transition-all"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs uppercase tracking-widest font-bold text-sepia-500 mb-2">Categoría</label>
                        <select
                          value={form.category || 'Familia'}
                          onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                          className="w-full bg-sepia-950 border border-sepia-700 rounded-xl p-3 text-sepia-100 outline-none focus:border-sepia-500 transition-all"
                        >
                          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs uppercase tracking-widest font-bold text-sepia-500 mb-2">Año</label>
                        <input
                          type="text"
                          value={form.year || ''}
                          onChange={e => setForm(f => ({ ...f, year: e.target.value }))}
                          placeholder="2026"
                          className="w-full bg-sepia-950 border border-sepia-700 rounded-xl p-3 text-sepia-100 outline-none focus:border-sepia-500 transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs uppercase tracking-widest font-bold text-sepia-500 mb-2">Descripción Corta</label>
                      <textarea
                        rows={3}
                        value={form.description || ''}
                        onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                        placeholder="Una breve introducción..."
                        className="w-full bg-sepia-950 border border-sepia-700 rounded-xl p-3 text-sepia-100 outline-none focus:border-sepia-500 transition-all resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs uppercase tracking-widest font-bold text-sepia-500 mb-2">Narrativa Completa</label>
                      <textarea
                        rows={6}
                        value={form.full_narrative || ''}
                        onChange={e => setForm(f => ({ ...f, full_narrative: e.target.value }))}
                        placeholder="Escribe toda la historia aquí..."
                        className="w-full bg-sepia-950 border border-sepia-700 rounded-xl p-3 text-sepia-100 outline-none focus:border-sepia-500 transition-all resize-none"
                      />
                    </div>
                  </div>

                  {/* Right column */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs uppercase tracking-widest font-bold text-sepia-500 mb-2">
                        <ImageIcon className="w-3 h-3 inline mr-1" /> Portada (URL)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="url"
                          value={form.thumbnail || ''}
                          onChange={e => setForm(f => ({ ...f, thumbnail: e.target.value }))}
                          placeholder="https://..."
                          className="flex-1 bg-sepia-950 border border-sepia-700 rounded-xl p-3 text-sepia-100 outline-none focus:border-sepia-500 transition-all"
                        />
                        <label className="cursor-pointer bg-sepia-800 hover:bg-sepia-700 rounded-xl px-3 flex items-center transition-all" title="Subir imagen">
                          <Upload className="w-4 h-4 text-sepia-300" />
                          <input type="file" accept="image/*" className="hidden" onChange={handleThumbnailUpload} />
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs uppercase tracking-widest font-bold text-sepia-500 mb-2">
                        <Video className="w-3 h-3 inline mr-1" /> Video URL (YouTube/Vimeo)
                      </label>
                      <input
                        type="url"
                        value={form.video_url || ''}
                        onChange={e => setForm(f => ({ ...f, video_url: e.target.value }))}
                        placeholder="https://..."
                        className="w-full bg-sepia-950 border border-sepia-700 rounded-xl p-3 text-sepia-100 outline-none focus:border-sepia-500 transition-all"
                      />
                      <label className="flex items-center gap-2 mt-2 cursor-pointer text-sepia-500 text-xs">
                        <input
                          type="checkbox"
                          checked={form.is_video_vertical || false}
                          onChange={e => setForm(f => ({ ...f, is_video_vertical: e.target.checked }))}
                          className="accent-sepia-500"
                        />
                        ¿Es video vertical? (Reel/TikTok/Shorts)
                      </label>
                    </div>

                    <div>
                      <label className="block text-xs uppercase tracking-widest font-bold text-sepia-500 mb-2">
                        <Volume2 className="w-3 h-3 inline mr-1" /> Audio (MP3 / Spotify)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="url"
                          value={form.audio_url || ''}
                          onChange={e => setForm(f => ({ ...f, audio_url: e.target.value }))}
                          placeholder="https://... (MP3 o Spotify)"
                          className="flex-1 bg-sepia-950 border border-sepia-700 rounded-xl p-3 text-sepia-100 outline-none focus:border-sepia-500 transition-all"
                        />
                        <label className="cursor-pointer bg-sepia-800 hover:bg-sepia-700 rounded-xl px-3 flex items-center transition-all" title="Subir audio">
                          <Upload className="w-4 h-4 text-sepia-300" />
                          <input type="file" accept="audio/*" className="hidden" onChange={handleAudioUpload} />
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs uppercase tracking-widest font-bold text-sepia-500 mb-2">
                        <MapPin className="w-3 h-3 inline mr-1" /> Google Maps URL
                      </label>
                      <input
                        type="url"
                        value={form.maps_url || ''}
                        onChange={e => setForm(f => ({ ...f, maps_url: e.target.value }))}
                        placeholder="https://goo.gl/maps/..."
                        className="w-full bg-sepia-950 border border-sepia-700 rounded-xl p-3 text-sepia-100 outline-none focus:border-sepia-500 transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Gallery */}
                <div>
                  <label className="block text-xs uppercase tracking-widest font-bold text-sepia-500 mb-3">
                    <ImageIcon className="w-3 h-3 inline mr-1" /> Galería de Fotos
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-3">
                    {(form.gallery || []).map((url, i) => (
                      <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border border-sepia-700">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemoveGalleryImage(i)}
                          className="absolute inset-0 bg-red-900/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                        >
                          <Trash2 className="w-5 h-5 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={newGalleryUrl}
                      onChange={e => setNewGalleryUrl(e.target.value)}
                      placeholder="URL de imagen..."
                      className="flex-1 bg-sepia-950 border border-sepia-700 rounded-xl p-3 text-sepia-100 outline-none focus:border-sepia-500 transition-all text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddGalleryImage()}
                      className="bg-sepia-800 hover:bg-sepia-700 text-sepia-200 rounded-xl px-4 text-sm transition-all"
                    >
                      + URL
                    </button>
                    <label className="cursor-pointer bg-sepia-800 hover:bg-sepia-700 text-sepia-200 rounded-xl px-4 text-sm transition-all flex items-center gap-1">
                      <Upload className="w-4 h-4" /> Subir
                      <input type="file" accept="image/*" className="hidden" onChange={e => handleAddGalleryImage(e)} />
                    </label>
                  </div>
                </div>

                {/* Upload indicator */}
                {isUploading && (
                  <p className="text-sepia-400 text-sm animate-pulse">Subiendo archivo...</p>
                )}

                <div className="flex gap-4 pt-2">
                  <button
                    type="button"
                    onClick={() => { setShowForm(false); resetForm(); }}
                    className="flex-1 py-3 rounded-xl border border-sepia-700 text-sepia-400 hover:bg-sepia-800 transition-all text-sm uppercase tracking-widest font-bold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving || isUploading}
                    className="flex-1 py-3 rounded-xl bg-sepia-500 text-sepia-950 font-bold uppercase tracking-widest hover:bg-sepia-400 transition-all text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    {isSaving ? 'Enviando...' : 'Enviar para Revisión'}
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* My submitted stories */}
        <div>
          <h2 className="text-lg font-serif text-sepia-300 mb-4 uppercase tracking-widest">
            Mis Historias Enviadas ({pendingStories.length})
          </h2>

          {pendingStories.length === 0 ? (
            <div className="text-center py-16 text-sepia-600">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-serif italic">Aún no has enviado ninguna historia.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingStories.map(story => {
                const cfg = STATUS_CONFIG[story.status] || STATUS_CONFIG.pending;
                const StatusIcon = cfg.icon;
                return (
                  <motion.div
                    key={story.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-sepia-900 rounded-2xl border border-sepia-800 p-5 flex gap-4 items-start"
                  >
                    {story.thumbnail && (
                      <img
                        src={story.thumbnail}
                        alt=""
                        className="w-16 h-16 rounded-xl object-cover flex-shrink-0 border border-sepia-800"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sepia-100 font-serif text-lg leading-tight">{story.title}</h3>
                        <span className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full border flex-shrink-0 ${cfg.bg} ${cfg.color}`}>
                          <StatusIcon className="w-3.5 h-3.5" />
                          {cfg.label}
                        </span>
                      </div>
                      <p className="text-sepia-500 text-xs mt-1">
                        {story.category} · {story.year} · Enviada {new Date(story.created_at!).toLocaleDateString('es-MX')}
                      </p>
                      {story.description && (
                        <p className="text-sepia-400 text-sm mt-2 line-clamp-2">{story.description}</p>
                      )}
                      {story.status === 'rejected' && story.admin_notes && (
                        <div className="mt-3 p-3 bg-red-900/20 border border-red-800/40 rounded-lg">
                          <p className="text-red-400 text-xs font-bold uppercase tracking-widest mb-1">Notas del administrador:</p>
                          <p className="text-red-300 text-sm">{story.admin_notes}</p>
                        </div>
                      )}
                      {story.status === 'approved' && (
                        <div className="mt-3 p-3 bg-green-900/20 border border-green-800/40 rounded-lg">
                          <p className="text-green-400 text-xs">¡Tu historia fue aprobada y está disponible en el álbum público!</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
