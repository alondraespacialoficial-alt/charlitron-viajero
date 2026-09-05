import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus, Trash2, Edit2, X, Loader2, Check, AlertCircle, Upload, RefreshCw,
  Copy, Search, Music, Link2, MessageCircle, Flower2, CheckCircle2, XCircle,
} from 'lucide-react';
import { Memorial, MemorialGesture, MemorialGuestbookEntry, MemorialVisibility } from '../types';
import { supabase } from '../supabase';

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

const VISIBILITY_INFO: Record<MemorialVisibility, { label: string; hint: string; color: string }> = {
  public: { label: 'Público', hint: 'Aparece en el buscador del Jardín y se puede compartir libremente.', color: 'text-cyan-300 border-cyan-700 bg-cyan-900/20' },
  shareable: { label: 'Compartible', hint: 'No aparece en el buscador, pero cualquiera con el enlace puede verlo.', color: 'text-green-300 border-green-700 bg-green-900/20' },
  private: { label: 'Privado', hint: 'No aparece en el buscador; el enlace pide el código de acceso.', color: 'text-amber-300 border-amber-700 bg-amber-900/20' },
};

export const MemorialsAdmin: React.FC = () => {
  const [memorials, setMemorials] = useState<Memorial[]>([]);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Partial<Memorial> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [slugEdited, setSlugEdited] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Vínculo con Historia (stories)
  const [storyOptions, setStoryOptions] = useState<{ id: string; title: string }[]>([]);
  const [storySearch, setStorySearch] = useState('');

  // Vínculo con Árbol de Linaje (family_members)
  const [memberSearch, setMemberSearch] = useState('');
  const [memberResults, setMemberResults] = useState<{ id: string; name: string; treeName?: string; clientName?: string }[]>([]);
  const [memberSearching, setMemberSearching] = useState(false);
  const [linkedMemberName, setLinkedMemberName] = useState('');
  const [linkedMemberContext, setLinkedMemberContext] = useState('');

  // Libro de visitas
  const [guestbook, setGuestbook] = useState<MemorialGuestbookEntry[]>([]);
  const [guestbookLoading, setGuestbookLoading] = useState(false);

  // Gestos (flores/velas)
  const [gestures, setGestures] = useState<MemorialGesture[]>([]);

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3500);
  };

  const fetchMemorials = async () => {
    const { data, error } = await supabase
      .from('memorials')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setMemorials(data);
  };

  useEffect(() => { fetchMemorials(); }, []);

  useEffect(() => {
    supabase.from('stories').select('id, title').order('title').then(({ data }) => {
      if (data) setStoryOptions(data as { id: string; title: string }[]);
    });
  }, []);

  const filteredMemorials = (() => {
    const q = search.trim().toLowerCase();
    if (!q) return memorials;
    return memorials.filter(m =>
      m.full_name.toLowerCase().includes(q) ||
      (m.family_label ?? '').toLowerCase().includes(q) ||
      (m.client_name ?? '').toLowerCase().includes(q) ||
      m.slug.toLowerCase().includes(q)
    );
  })();

  const searchFamilyMembers = async () => {
    const q = memberSearch.trim();
    if (q.length < 2) { setMemberResults([]); return; }
    setMemberSearching(true);
    // Se incluye el árbol y el cliente dueño de la clave para poder ubicar
    // al familiar correcto cuando hay nombres repetidos entre árboles.
    const { data } = await supabase
      .from('family_members')
      .select('id, name, family_trees(name, access_keys(client_name))')
      .ilike('name', `%${q}%`)
      .limit(15);
    const mapped = (data || []).map((m: any) => ({
      id: m.id,
      name: m.name,
      treeName: m.family_trees?.name,
      clientName: m.family_trees?.access_keys?.client_name,
    }));
    setMemberResults(mapped);
    setMemberSearching(false);
  };

  // Búsqueda automática mientras se escribe (con debounce), además del botón/Enter
  useEffect(() => {
    if (memberSearch.trim().length < 2) { setMemberResults([]); return; }
    const t = setTimeout(() => { searchFamilyMembers(); }, 400);
    return () => clearTimeout(t);
  }, [memberSearch]); // eslint-disable-line

  const loadGuestbook = async (memorialId: string) => {
    setGuestbookLoading(true);
    const { data } = await supabase
      .from('memorial_guestbook')
      .select('*')
      .eq('memorial_id', memorialId)
      .order('created_at', { ascending: false });
    setGuestbook((data as MemorialGuestbookEntry[]) || []);
    setGuestbookLoading(false);
  };

  const loadGestures = async (memorialId: string) => {
    const { data } = await supabase
      .from('memorial_gestures')
      .select('*')
      .eq('memorial_id', memorialId)
      .order('created_at', { ascending: false })
      .limit(50);
    setGestures((data as MemorialGesture[]) || []);
  };

  useEffect(() => {
    if (editing?.id) {
      loadGuestbook(editing.id);
      loadGestures(editing.id);
      if (editing.family_member_id) {
        supabase.from('family_members').select('name, family_trees(name, access_keys(client_name))').eq('id', editing.family_member_id).maybeSingle()
          .then(({ data }) => {
            const m = data as any;
            setLinkedMemberName(m?.name || '');
            const treeName = m?.family_trees?.name;
            const clientName = m?.family_trees?.access_keys?.client_name;
            setLinkedMemberContext([treeName, clientName].filter(Boolean).join(' · '));
          });
      } else {
        setLinkedMemberName('');
        setLinkedMemberContext('');
      }
    } else {
      setGuestbook([]);
      setGestures([]);
      setLinkedMemberName('');
    }
    setMemberSearch('');
    setMemberResults([]);
  }, [editing?.id]); // eslint-disable-line

  const moderateGuestbook = async (entryId: string, status: 'approved' | 'rejected') => {
    await supabase.from('memorial_guestbook').update({ status }).eq('id', entryId);
    setGuestbook(prev => prev.map(g => g.id === entryId ? { ...g, status } : g));
  };

  const deleteGuestbookEntry = async (entryId: string) => {
    if (!confirm('¿Eliminar este mensaje?')) return;
    await supabase.from('memorial_guestbook').delete().eq('id', entryId);
    setGuestbook(prev => prev.filter(g => g.id !== entryId));
  };

  const deleteGesture = async (gestureId: string) => {
    await supabase.from('memorial_gestures').delete().eq('id', gestureId);
    setGestures(prev => prev.filter(g => g.id !== gestureId));
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editing) return;
    setIsUploadingPhoto(true);
    try {
      const fileName = `memorials/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from('images').upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('images').getPublicUrl(fileName);
      setEditing({ ...editing, photo_url: urlData.publicUrl });
    } catch {
      showMsg('error', 'Error al subir la foto');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editing) return;
    setIsUploadingAudio(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `memorial-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('audio').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('audio').getPublicUrl(fileName);
      setEditing({ ...editing, tribute_song_url: urlData.publicUrl });
    } catch {
      showMsg('error', 'Error al subir el audio');
    } finally {
      setIsUploadingAudio(false);
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editing) return;
    setIsUploadingVideo(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `memorial-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('video').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('video').getPublicUrl(fileName);
      setEditing({ ...editing, tribute_video_url: urlData.publicUrl });
    } catch {
      showMsg('error', 'Error al subir el video');
    } finally {
      setIsUploadingVideo(false);
    }
  };

  const handleSave = async () => {
    if (!editing?.full_name?.trim()) { showMsg('error', 'El nombre completo es obligatorio'); return; }
    if (!editing?.slug?.trim()) { showMsg('error', 'El slug es obligatorio'); return; }
    if (editing.visibility === 'private' && !editing.access_code?.trim()) {
      showMsg('error', 'Un memorial privado necesita un código de acceso'); return;
    }
    setIsSaving(true);
    try {
      const payload = {
        slug: editing.slug.trim().toLowerCase().replace(/\s+/g, '-'),
        full_name: editing.full_name.trim(),
        family_label: editing.family_label?.trim() || null,
        photo_url: editing.photo_url?.trim() || null,
        birth_date: editing.birth_date?.trim() || null,
        death_date: editing.death_date?.trim() || null,
        epitaph: editing.epitaph?.trim() || null,
        bio_short: editing.bio_short?.trim() || null,
        visibility: editing.visibility ?? 'private',
        access_code: editing.visibility === 'public' ? null : (editing.access_code?.trim().toUpperCase() || null),
        story_id: editing.story_id || null,
        family_member_id: editing.family_member_id || null,
        tribute_song_url: editing.tribute_song_url?.trim() || null,
        spotify_link: editing.spotify_link?.trim() || null,
        tribute_video_url: editing.tribute_video_url?.trim() || null,
        requires_approval: editing.requires_approval ?? true,
        client_name: editing.client_name?.trim() || null,
        client_contact: editing.client_contact?.trim() || null,
      };

      if (editing.id) {
        const { error } = await supabase.from('memorials').update(payload).eq('id', editing.id);
        if (error) throw error;
        showMsg('success', 'Memorial actualizado');
      } else {
        const { error } = await supabase.from('memorials').insert([payload]);
        if (error) throw error;
        showMsg('success', 'Memorial creado');
      }
      setEditing(null);
      fetchMemorials();
    } catch (err: any) {
      showMsg('error', err?.message?.includes('slug') ? 'El slug ya existe, usa otro' : 'Error al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este memorial? Se borrarán también sus mensajes y flores.')) return;
    setIsDeleting(id);
    const { error } = await supabase.from('memorials').delete().eq('id', id);
    if (!error) { fetchMemorials(); showMsg('success', 'Memorial eliminado'); }
    else showMsg('error', 'Error al eliminar');
    setIsDeleting(null);
  };

  const filteredStoryOptions = storyOptions.filter(s =>
    !storySearch.trim() || s.title.toLowerCase().includes(storySearch.trim().toLowerCase())
  );
  const linkedStory = storyOptions.find(s => s.id === editing?.story_id);

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className={`flex items-center gap-2 p-3 rounded-xl text-sm border ${
              message.type === 'success' ? 'bg-green-900/30 border-green-700 text-green-400' : 'bg-red-900/30 border-red-700 text-red-400'
            }`}
          >
            {message.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {message.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Formulario ─────────────────────────────────────────── */}
      <AnimatePresence>
        {editing && (
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="bg-sepia-800/50 border border-sepia-700 rounded-2xl p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sepia-100 font-serif text-lg">
                {editing.id ? 'Editar Memorial' : 'Nuevo Memorial'}
              </h3>
              <button onClick={() => setEditing(null)} className="text-sepia-500 hover:text-sepia-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-sepia-400 uppercase tracking-widest">Nombre completo *</label>
                <input
                  type="text"
                  value={editing.full_name || ''}
                  onChange={(e) => {
                    const full_name = e.target.value;
                    const update: Partial<Memorial> = { full_name };
                    if (!editing.id && !slugEdited) update.slug = toSlug(full_name);
                    setEditing({ ...editing, ...update });
                  }}
                  placeholder="Ej: Juan Pérez López"
                  className="w-full bg-sepia-900 border border-sepia-700 rounded-xl px-4 py-2.5 text-sepia-100 placeholder-sepia-600 outline-none focus:border-sepia-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-sepia-400 uppercase tracking-widest flex items-center gap-2">
                  Slug * <span className="normal-case text-sepia-600">(único, para /jardin/slug)</span>
                </label>
                <input
                  type="text"
                  value={editing.slug || ''}
                  onChange={(e) => { setSlugEdited(true); setEditing({ ...editing, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }); }}
                  placeholder="Ej: juan-perez-lopez"
                  className="w-full bg-sepia-900 border border-sepia-700 rounded-xl px-4 py-2.5 text-sepia-100 placeholder-sepia-600 outline-none focus:border-sepia-500 font-mono text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-sepia-400 uppercase tracking-widest">Familia / apellido <span className="normal-case text-sepia-600">(para el buscador)</span></label>
                <input
                  type="text"
                  value={editing.family_label || ''}
                  onChange={(e) => setEditing({ ...editing, family_label: e.target.value })}
                  placeholder="Ej: Familia Pérez"
                  className="w-full bg-sepia-900 border border-sepia-700 rounded-xl px-4 py-2.5 text-sepia-100 placeholder-sepia-600 outline-none focus:border-sepia-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-sepia-400 uppercase tracking-widest">Epitafio / frase</label>
                <input
                  type="text"
                  value={editing.epitaph || ''}
                  onChange={(e) => setEditing({ ...editing, epitaph: e.target.value })}
                  placeholder="Ej: Siempre en nuestro corazón"
                  className="w-full bg-sepia-900 border border-sepia-700 rounded-xl px-4 py-2.5 text-sepia-100 placeholder-sepia-600 outline-none focus:border-sepia-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-sepia-400 uppercase tracking-widest">Fecha de nacimiento</label>
                <input
                  type="text"
                  value={editing.birth_date || ''}
                  onChange={(e) => setEditing({ ...editing, birth_date: e.target.value })}
                  placeholder="Ej: 12 de marzo de 1945"
                  className="w-full bg-sepia-900 border border-sepia-700 rounded-xl px-4 py-2.5 text-sepia-100 placeholder-sepia-600 outline-none focus:border-sepia-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-sepia-400 uppercase tracking-widest">Fecha de fallecimiento</label>
                <input
                  type="text"
                  value={editing.death_date || ''}
                  onChange={(e) => setEditing({ ...editing, death_date: e.target.value })}
                  placeholder="Ej: 4 de enero de 2020"
                  className="w-full bg-sepia-900 border border-sepia-700 rounded-xl px-4 py-2.5 text-sepia-100 placeholder-sepia-600 outline-none focus:border-sepia-500"
                />
              </div>

              <div className="md:col-span-2 space-y-1">
                <label className="text-xs text-sepia-400 uppercase tracking-widest">Presentación breve</label>
                <textarea
                  value={editing.bio_short || ''}
                  onChange={(e) => setEditing({ ...editing, bio_short: e.target.value })}
                  rows={3}
                  placeholder="Una pequeña reseña de su vida…"
                  className="w-full bg-sepia-900 border border-sepia-700 rounded-xl px-4 py-2.5 text-sepia-100 placeholder-sepia-600 outline-none focus:border-sepia-500 resize-none"
                />
              </div>

              {/* Foto principal */}
              <div className="md:col-span-2 space-y-2">
                <label className="text-xs text-sepia-400 uppercase tracking-widest">Fotografía principal</label>
                {editing.photo_url && (
                  <div className="relative inline-flex rounded-xl overflow-hidden border border-sepia-700 bg-sepia-900">
                    <img src={editing.photo_url} alt={editing.full_name} className="w-24 h-24 object-cover" />
                    <button type="button" onClick={() => setEditing({ ...editing, photo_url: '' })} className="absolute top-1 right-1 bg-red-900/80 text-red-300 rounded-full p-0.5">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                <label className="flex items-center gap-3 cursor-pointer bg-sepia-900 border border-dashed border-sepia-700 rounded-xl px-4 py-3 hover:border-sepia-500 transition-all w-fit">
                  {isUploadingPhoto ? <Loader2 className="w-5 h-5 text-sepia-400 animate-spin" /> : <Upload className="w-5 h-5 text-sepia-400" />}
                  <span className="text-sepia-400 text-sm">{isUploadingPhoto ? 'Subiendo…' : 'Subir foto (bucket: images)'}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={isUploadingPhoto} />
                </label>
              </div>

              {/* Visibilidad */}
              <div className="md:col-span-2 space-y-2">
                <label className="text-xs text-sepia-400 uppercase tracking-widest">Nivel de acceso</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {(Object.keys(VISIBILITY_INFO) as MemorialVisibility[]).map(v => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setEditing({ ...editing, visibility: v })}
                      className={`text-left rounded-xl border px-4 py-3 transition-all ${
                        editing.visibility === v ? VISIBILITY_INFO[v].color : 'bg-sepia-900 border-sepia-700 text-sepia-400'
                      }`}
                    >
                      <p className="text-sm font-semibold uppercase tracking-wider">{VISIBILITY_INFO[v].label}</p>
                      <p className="text-xs opacity-80 mt-1">{VISIBILITY_INFO[v].hint}</p>
                    </button>
                  ))}
                </div>
              </div>

              {editing.visibility !== 'public' && (
                <div className="md:col-span-2 space-y-1">
                  <label className="text-xs text-sepia-400 uppercase tracking-widest">Código de acceso *</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editing.access_code || ''}
                      onChange={(e) => setEditing({ ...editing, access_code: e.target.value.toUpperCase() })}
                      placeholder="Ej: PEREZ2026"
                      maxLength={20}
                      className="flex-1 bg-sepia-900 border border-sepia-700 rounded-xl px-4 py-2.5 text-sepia-100 placeholder-sepia-600 outline-none focus:border-sepia-500 font-mono tracking-widest text-sm uppercase"
                    />
                    <button
                      type="button"
                      onClick={() => setEditing({ ...editing, access_code: generateCode() })}
                      className="flex items-center gap-1.5 bg-sepia-700 hover:bg-sepia-600 text-sepia-200 px-3 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all shrink-0"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Generar
                    </button>
                    {editing.access_code && (
                      <button
                        type="button"
                        onClick={() => navigator.clipboard.writeText(editing.access_code!)}
                        className="flex items-center gap-1.5 bg-sepia-800 hover:bg-sepia-700 text-sepia-300 px-3 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all shrink-0"
                      >
                        <Copy className="w-3.5 h-3.5" /> Copiar
                      </button>
                    )}
                  </div>
                  <p className="text-sepia-600 text-xs mt-1">La familia lo usará junto con el enlace para entrar cuantas veces quiera.</p>
                </div>
              )}

              {/* Cliente */}
              <div className="space-y-1">
                <label className="text-xs text-sepia-400 uppercase tracking-widest">Cliente <span className="normal-case text-sepia-600">(quién lo solicitó)</span></label>
                <input
                  type="text"
                  value={editing.client_name || ''}
                  onChange={(e) => setEditing({ ...editing, client_name: e.target.value })}
                  placeholder="Ej: Familia Pérez"
                  className="w-full bg-sepia-900 border border-sepia-700 rounded-xl px-4 py-2.5 text-sepia-100 placeholder-sepia-600 outline-none focus:border-sepia-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-sepia-400 uppercase tracking-widest">Contacto del cliente</label>
                <input
                  type="text"
                  value={editing.client_contact || ''}
                  onChange={(e) => setEditing({ ...editing, client_contact: e.target.value })}
                  placeholder="Teléfono o correo"
                  className="w-full bg-sepia-900 border border-sepia-700 rounded-xl px-4 py-2.5 text-sepia-100 placeholder-sepia-600 outline-none focus:border-sepia-500"
                />
              </div>

              {/* Música */}
              <div className="space-y-2">
                <label className="text-xs text-sepia-400 uppercase tracking-widest flex items-center gap-2"><Music className="w-3.5 h-3.5" /> Canción homenaje</label>
                {editing.tribute_song_url && (
                  <audio controls src={editing.tribute_song_url} className="w-full h-9" />
                )}
                <label className="flex items-center gap-3 cursor-pointer bg-sepia-900 border border-dashed border-sepia-700 rounded-xl px-4 py-2.5 hover:border-sepia-500 transition-all w-fit">
                  {isUploadingAudio ? <Loader2 className="w-4 h-4 text-sepia-400 animate-spin" /> : <Upload className="w-4 h-4 text-sepia-400" />}
                  <span className="text-sepia-400 text-xs">{isUploadingAudio ? 'Subiendo…' : 'Subir audio (bucket: audio)'}</span>
                  <input type="file" accept="audio/*" className="hidden" onChange={handleAudioUpload} disabled={isUploadingAudio} />
                </label>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-sepia-400 uppercase tracking-widest flex items-center gap-2"><Link2 className="w-3.5 h-3.5" /> Link de Spotify</label>
                <input
                  type="url"
                  value={editing.spotify_link || ''}
                  onChange={(e) => setEditing({ ...editing, spotify_link: e.target.value })}
                  placeholder="https://open.spotify.com/track/…"
                  className="w-full bg-sepia-900 border border-sepia-700 rounded-xl px-4 py-2.5 text-sepia-100 placeholder-sepia-600 outline-none focus:border-sepia-500 text-sm"
                />
              </div>

              {/* Video homenaje */}
              <div className="md:col-span-2 space-y-2">
                <label className="text-xs text-sepia-400 uppercase tracking-widest">Video homenaje <span className="normal-case text-sepia-600">(se muestra debajo de la foto)</span></label>
                {editing.tribute_video_url && (
                  <video controls src={editing.tribute_video_url} className="w-full max-w-xs rounded-xl border border-sepia-700" />
                )}
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-3 cursor-pointer bg-sepia-900 border border-dashed border-sepia-700 rounded-xl px-4 py-2.5 hover:border-sepia-500 transition-all w-fit">
                    {isUploadingVideo ? <Loader2 className="w-4 h-4 text-sepia-400 animate-spin" /> : <Upload className="w-4 h-4 text-sepia-400" />}
                    <span className="text-sepia-400 text-xs">{isUploadingVideo ? 'Subiendo…' : 'Subir video (bucket: video)'}</span>
                    <input type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} disabled={isUploadingVideo} />
                  </label>
                  {editing.tribute_video_url && (
                    <button type="button" onClick={() => setEditing({ ...editing, tribute_video_url: '' })} className="text-sepia-500 hover:text-red-400 p-1.5"><X className="w-4 h-4" /></button>
                  )}
                </div>
              </div>

              {/* Vincular Historia */}
              <div className="md:col-span-2 space-y-1">
                <label className="text-xs text-sepia-400 uppercase tracking-widest">Vincular con una Historia del Baúl</label>
                {linkedStory ? (
                  <div className="flex items-center gap-2 bg-sepia-900 border border-sepia-700 rounded-xl px-4 py-2.5">
                    <span className="text-sepia-100 text-sm flex-1">{linkedStory.title}</span>
                    <button type="button" onClick={() => setEditing({ ...editing, story_id: null })} className="text-sepia-500 hover:text-red-400"><X className="w-4 h-4" /></button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      value={storySearch}
                      onChange={(e) => setStorySearch(e.target.value)}
                      placeholder="Buscar historia por título…"
                      className="w-full bg-sepia-900 border border-sepia-700 rounded-xl px-4 py-2.5 text-sepia-100 placeholder-sepia-600 outline-none focus:border-sepia-500 text-sm"
                    />
                    {storySearch.trim() && filteredStoryOptions.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full bg-sepia-900 border border-sepia-700 rounded-xl max-h-48 overflow-y-auto">
                        {filteredStoryOptions.slice(0, 20).map(s => (
                          <button
                            key={s.id} type="button"
                            onClick={() => { setEditing({ ...editing, story_id: s.id }); setStorySearch(''); }}
                            className="block w-full text-left px-4 py-2 text-sepia-200 text-sm hover:bg-sepia-800"
                          >
                            {s.title}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Vincular Árbol de Linaje */}
              <div className="md:col-span-2 space-y-1">
                <label className="text-xs text-sepia-400 uppercase tracking-widest">Vincular con el Árbol de Linaje</label>
                {linkedMemberName ? (
                  <div className="flex items-center gap-2 bg-sepia-900 border border-sepia-700 rounded-xl px-4 py-2.5">
                    <div className="flex-1 min-w-0">
                      <span className="text-sepia-100 text-sm">{linkedMemberName}</span>
                      {linkedMemberContext && <p className="text-sepia-600 text-xs truncate">{linkedMemberContext}</p>}
                    </div>
                    <button type="button" onClick={() => { setEditing({ ...editing, family_member_id: null }); setLinkedMemberName(''); setLinkedMemberContext(''); }} className="text-sepia-500 hover:text-red-400"><X className="w-4 h-4" /></button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={memberSearch}
                        onChange={(e) => setMemberSearch(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); searchFamilyMembers(); } }}
                        placeholder="Buscar familiar por nombre… (mín. 2 letras)"
                        className="flex-1 bg-sepia-900 border border-sepia-700 rounded-xl px-4 py-2.5 text-sepia-100 placeholder-sepia-600 outline-none focus:border-sepia-500 text-sm"
                      />
                      <button type="button" onClick={searchFamilyMembers} disabled={memberSearching} className="bg-sepia-700 hover:bg-sepia-600 text-sepia-200 px-3 rounded-xl shrink-0">
                        {memberSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-sepia-600 text-xs">
                      Solo aparecen familiares que ya fueron agregados a un Árbol de Linaje (creado con una clave familiar). Se busca por el nombre exacto que se usó al crearlo ahí.
                    </p>
                    {memberSearch.trim().length >= 2 && !memberSearching && memberResults.length === 0 && (
                      <p className="text-sepia-600 text-xs italic">Sin coincidencias para "{memberSearch.trim()}".</p>
                    )}
                    {memberResults.length > 0 && (
                      <div className="bg-sepia-900 border border-sepia-700 rounded-xl max-h-56 overflow-y-auto divide-y divide-sepia-800">
                        {memberResults.map(m => (
                          <button
                            key={m.id} type="button"
                            onClick={() => { setEditing({ ...editing, family_member_id: m.id }); setLinkedMemberName(m.name); setLinkedMemberContext([m.treeName, m.clientName].filter(Boolean).join(' · ')); setMemberResults([]); setMemberSearch(''); }}
                            className="block w-full text-left px-4 py-2 hover:bg-sepia-800"
                          >
                            <span className="text-sepia-200 text-sm block">{m.name}</span>
                            {(m.treeName || m.clientName) && (
                              <span className="text-sepia-600 text-xs">{[m.treeName, m.clientName].filter(Boolean).join(' · ')}</span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Moderación de mensajes */}
              <div className="md:col-span-2 flex items-center justify-between bg-sepia-900/50 border border-sepia-700 rounded-xl px-4 py-3">
                <div>
                  <p className="text-sepia-200 text-sm font-semibold">Requiere aprobación de mensajes</p>
                  <p className="text-sepia-500 text-xs">Si está activo, los mensajes del libro de visitas no se publican hasta aprobarlos.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditing({ ...editing, requires_approval: !editing.requires_approval })}
                  className={`w-11 h-6 rounded-full transition-all relative shrink-0 ${editing.requires_approval ?? true ? 'bg-sepia-500' : 'bg-sepia-700'}`}
                >
                  <span className={`absolute top-0.5 h-5 w-5 bg-white rounded-full transition-all ${(editing.requires_approval ?? true) ? 'left-[22px]' : 'left-0.5'}`} />
                </button>
              </div>
            </div>

            {/* Libro de visitas y flores — solo si ya existe */}
            {editing.id && (
              <div className="space-y-4 pt-2 border-t border-sepia-800">
                <div>
                  <h4 className="text-sepia-300 font-bold uppercase tracking-widest text-xs flex items-center gap-2 mb-2">
                    <MessageCircle className="w-3.5 h-3.5" /> Libro de visitas {guestbookLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                  </h4>
                  {guestbook.length === 0 ? (
                    <p className="text-sepia-600 text-xs">Sin mensajes todavía.</p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {guestbook.map(g => (
                        <div key={g.id} className="bg-sepia-900/40 border border-sepia-800 rounded-lg px-3 py-2 flex items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sepia-200 text-sm">
                              <span className="font-semibold">{g.visitor_name}</span>{' '}
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ml-1 ${
                                g.status === 'approved' ? 'text-green-300 border-green-700 bg-green-900/20'
                                : g.status === 'rejected' ? 'text-red-300 border-red-700 bg-red-900/20'
                                : 'text-orange-300 border-orange-700 bg-orange-900/20'
                              }`}>{g.status}</span>
                            </p>
                            <p className="text-sepia-400 text-xs mt-0.5">{g.message}</p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {g.status !== 'approved' && (
                              <button onClick={() => moderateGuestbook(g.id, 'approved')} title="Aprobar" className="text-green-500 hover:text-green-300 p-1"><CheckCircle2 className="w-4 h-4" /></button>
                            )}
                            {g.status !== 'rejected' && (
                              <button onClick={() => moderateGuestbook(g.id, 'rejected')} title="Rechazar" className="text-red-500 hover:text-red-300 p-1"><XCircle className="w-4 h-4" /></button>
                            )}
                            <button onClick={() => deleteGuestbookEntry(g.id)} title="Eliminar" className="text-sepia-500 hover:text-red-400 p-1"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="text-sepia-300 font-bold uppercase tracking-widest text-xs flex items-center gap-2 mb-2">
                    <Flower2 className="w-3.5 h-3.5" /> Flores y velas ({gestures.length})
                  </h4>
                  {gestures.length === 0 ? (
                    <p className="text-sepia-600 text-xs">Nadie ha dejado un gesto todavía.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                      {gestures.map(g => (
                        <span key={g.id} className="flex items-center gap-1.5 bg-sepia-900/40 border border-sepia-800 rounded-full px-3 py-1 text-xs text-sepia-300">
                          {g.gesture_type === 'candle' ? '🕯️' : '🌸'} {g.visitor_name || 'Anónimo'}
                          <button onClick={() => deleteGesture(g.id)} className="text-sepia-600 hover:text-red-400"><X className="w-3 h-3" /></button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setEditing(null)} className="px-4 py-2 rounded-xl text-sepia-400 hover:text-sepia-200 text-sm">Cancelar</button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 bg-sepia-600 hover:bg-sepia-500 disabled:opacity-50 text-sepia-100 px-5 py-2 rounded-xl text-sm font-bold uppercase tracking-widest transition-all"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Guardar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Lista ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h3 className="text-sepia-300 font-bold uppercase tracking-widest text-xs">
          Memoriales ({filteredMemorials.length}{search.trim() ? ` de ${memorials.length}` : ''})
        </h3>
        <button
          onClick={() => { setEditing({ visibility: 'private', requires_approval: true }); setSlugEdited(false); }}
          className="flex items-center gap-1.5 bg-sepia-600 hover:bg-sepia-500 text-sepia-100 text-xs font-bold uppercase tracking-widest px-3 py-2 rounded-xl transition-all"
        >
          <Plus className="w-3.5 h-3.5" /> Nuevo memorial
        </button>
      </div>

      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, familia o cliente…"
          className="w-full bg-sepia-900 border border-sepia-700 rounded-xl px-4 py-2.5 text-sepia-100 placeholder-sepia-600 outline-none focus:border-sepia-500 text-sm"
        />
      </div>

      {memorials.length === 0 ? (
        <div className="bg-sepia-800/20 border border-dashed border-sepia-700 rounded-xl p-10 text-center text-sepia-600 text-sm">
          Sin memoriales todavía. Crea el primero o ejecuta el SQL de setup.
        </div>
      ) : filteredMemorials.length === 0 ? (
        <div className="bg-sepia-800/20 border border-dashed border-sepia-700 rounded-xl p-10 text-center text-sepia-600 text-sm">
          Ningún memorial coincide con "{search}".
        </div>
      ) : (
        <div className="space-y-3">
          {filteredMemorials.map(m => (
            <div key={m.id} className="bg-sepia-800/30 border border-sepia-800 rounded-xl p-4 flex items-center gap-4">
              {m.photo_url
                ? <img src={m.photo_url} alt={m.full_name} className="w-10 h-10 rounded-full object-cover border border-sepia-700 flex-shrink-0" />
                : <span className="text-3xl flex-shrink-0">🌷</span>
              }
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sepia-100 font-serif text-sm">{m.full_name}</p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${VISIBILITY_INFO[m.visibility].color}`}>
                    {VISIBILITY_INFO[m.visibility].label}
                  </span>
                  {m.family_label && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border text-purple-300 border-purple-700 bg-purple-900/20">{m.family_label}</span>
                  )}
                  {m.access_code && (
                    <button
                      type="button"
                      title="Copiar código"
                      onClick={() => navigator.clipboard.writeText(m.access_code!)}
                      className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border text-green-300 border-green-700 bg-green-900/20 hover:bg-green-900/40 transition-all"
                    >
                      <Copy className="w-2.5 h-2.5" /> {m.access_code}
                    </button>
                  )}
                </div>
                <p className="text-sepia-600 text-[10px] font-mono mt-1 truncate">/jardin/{m.slug}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => { setEditing(m); setSlugEdited(true); }} className="text-sepia-500 hover:text-sepia-200 p-1.5 rounded-lg hover:bg-sepia-700 transition-all" title="Editar">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(m.id)} disabled={isDeleting === m.id} className="text-red-500 hover:text-red-300 p-1.5 rounded-lg hover:bg-red-900/20 transition-all" title="Eliminar">
                  {isDeleting === m.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
