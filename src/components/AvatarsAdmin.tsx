import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus, Trash2, Edit2, Save, X, Loader2,
  Check, AlertCircle, ChevronUp, ChevronDown, Upload,
} from 'lucide-react';
import { Avatar } from '../types';
import { supabase } from '../supabase';

const EMOJI_OPTIONS = ['🎩','🤖','🗺️','👑','⚔️','📜','🏛️','🎭','🧙','👨‍🏫','👩‍🏫','🪖','🔭','📿','🕯️','🌿'];

export const AvatarsAdmin: React.FC = () => {
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [editing, setEditing] = useState<Partial<Avatar> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  useEffect(() => { fetchAvatars(); }, []);

  const fetchAvatars = async () => {
    const { data, error } = await supabase
      .from('avatars')
      .select('*')
      .order('order_index', { ascending: true });
    if (!error && data) setAvatars(data);
  };

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3500);
  };

  // ─── Upload imagen del avatar ───────────────────────────────────
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editing) return;
    setIsUploadingImage(true);
    try {
      const fileName = `avatars/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('images').getPublicUrl(fileName);
      setEditing({ ...editing, image_url: urlData.publicUrl });
    } catch (err) {
      console.error('Error uploading avatar image:', err);
      showMsg('error', 'Error al subir la imagen');
    } finally {
      setIsUploadingImage(false);
    }
  };

  // ─── Guardar (crear o actualizar) ───────────────────────────────
  const handleSave = async () => {
    if (!editing?.label?.trim()) {
      showMsg('error', 'El nombre es obligatorio');
      return;
    }
    if (!editing?.slug?.trim()) {
      showMsg('error', 'El slug es obligatorio');
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        slug:        editing.slug.trim().toLowerCase().replace(/\s+/g, '-'),
        label:       editing.label.trim(),
        description: editing.description?.trim() || null,
        emoji:       editing.emoji || '🎭',
        image_url:   editing.image_url?.trim() || null,
        pub_key:     editing.pub_key?.trim() || '',
        is_active:   editing.pub_key?.trim() ? (editing.is_active ?? true) : false,
        order_index: editing.order_index ?? avatars.length,
      };

      if (editing.id) {
        const { error } = await supabase
          .from('avatars')
          .update(payload)
          .eq('id', editing.id);
        if (error) throw error;
        showMsg('success', 'Avatar actualizado');
      } else {
        const { error } = await supabase
          .from('avatars')
          .insert([payload]);
        if (error) throw error;
        showMsg('success', 'Avatar creado');
      }
      setEditing(null);
      fetchAvatars();
    } catch (err: any) {
      console.error('Error saving avatar:', err);
      showMsg('error', err?.message?.includes('slug') ? 'El slug ya existe, usa otro' : 'Error al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Eliminar ────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este avatar?')) return;
    setIsDeleting(id);
    const { error } = await supabase.from('avatars').delete().eq('id', id);
    if (!error) {
      fetchAvatars();
      showMsg('success', 'Avatar eliminado');
    } else {
      showMsg('error', 'Error al eliminar');
    }
    setIsDeleting(null);
  };

  // ─── Toggle activo ───────────────────────────────────────────────
  const handleToggleActive = async (avatar: Avatar) => {
    if (!avatar.pub_key && !avatar.is_active) {
      showMsg('error', 'Agrega un pub_key antes de activar');
      return;
    }
    const { error } = await supabase
      .from('avatars')
      .update({ is_active: !avatar.is_active })
      .eq('id', avatar.id);
    if (!error) fetchAvatars();
  };

  // ─── Mover orden ─────────────────────────────────────────────────
  const handleMove = async (idx: number, dir: -1 | 1) => {
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= avatars.length) return;
    const a = avatars[idx];
    const b = avatars[swapIdx];
    await supabase.from('avatars').update({ order_index: b.order_index }).eq('id', a.id);
    await supabase.from('avatars').update({ order_index: a.order_index }).eq('id', b.id);
    fetchAvatars();
  };

  return (
    <div className="space-y-6">
      {/* Mensaje */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`flex items-center gap-2 p-3 rounded-xl text-sm border ${
              message.type === 'success'
                ? 'bg-green-900/30 border-green-700 text-green-400'
                : 'bg-red-900/30 border-red-700 text-red-400'
            }`}
          >
            {message.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {message.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Formulario de edición ─────────────────────────────────── */}
      <AnimatePresence>
        {editing && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-sepia-800/50 border border-sepia-700 rounded-2xl p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sepia-100 font-serif text-lg">
                {editing.id ? 'Editar Avatar' : 'Nuevo Avatar'}
              </h3>
              <button onClick={() => setEditing(null)} className="text-sepia-500 hover:text-sepia-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Emoji */}
              <div className="space-y-1">
                <label className="text-xs text-sepia-400 uppercase tracking-widest">Icono</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="w-full bg-sepia-900 border border-sepia-700 rounded-xl px-4 py-2.5 text-sepia-100 text-left flex items-center gap-3 hover:border-sepia-500 transition-all"
                  >
                    <span className="text-2xl">{editing.emoji || '🎭'}</span>
                    <span className="text-sepia-500 text-sm">Cambiar icono</span>
                  </button>
                  {showEmojiPicker && (
                    <div className="absolute top-full left-0 mt-2 z-10 bg-sepia-900 border border-sepia-700 rounded-xl p-3 grid grid-cols-8 gap-2 shadow-xl">
                      {EMOJI_OPTIONS.map((e) => (
                        <button
                          key={e}
                          type="button"
                          onClick={() => { setEditing({ ...editing, emoji: e }); setShowEmojiPicker(false); }}
                          className="text-2xl hover:scale-125 transition-transform"
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Nombre */}
              <div className="space-y-1">
                <label className="text-xs text-sepia-400 uppercase tracking-widest">Nombre *</label>
                <input
                  type="text"
                  value={editing.label || ''}
                  onChange={(e) => setEditing({ ...editing, label: e.target.value })}
                  placeholder="Ej: Don Ramón"
                  className="w-full bg-sepia-900 border border-sepia-700 rounded-xl px-4 py-2.5 text-sepia-100 placeholder-sepia-600 outline-none focus:border-sepia-500"
                />
              </div>

              {/* Slug */}
              <div className="space-y-1">
                <label className="text-xs text-sepia-400 uppercase tracking-widest">
                  Slug * <span className="normal-case text-sepia-600">(único, sin espacios)</span>
                </label>
                <input
                  type="text"
                  value={editing.slug || ''}
                  onChange={(e) => setEditing({ ...editing, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                  placeholder="Ej: don-ramon"
                  className="w-full bg-sepia-900 border border-sepia-700 rounded-xl px-4 py-2.5 text-sepia-100 placeholder-sepia-600 outline-none focus:border-sepia-500 font-mono text-sm"
                />
              </div>

              {/* Descripción */}
              <div className="space-y-1">
                <label className="text-xs text-sepia-400 uppercase tracking-widest">Descripción / Rol</label>
                <input
                  type="text"
                  value={editing.description || ''}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  placeholder="Ej: Comerciante del siglo XIX"
                  className="w-full bg-sepia-900 border border-sepia-700 rounded-xl px-4 py-2.5 text-sepia-100 placeholder-sepia-600 outline-none focus:border-sepia-500"
                />
              </div>

              {/* Imagen del avatar */}
              <div className="md:col-span-2 space-y-2">
                <label className="text-xs text-sepia-400 uppercase tracking-widest">Imagen del personaje <span className="normal-case text-sepia-600">(opcional)</span></label>
                {editing.image_url && (
                  <div className="relative inline-flex rounded-xl overflow-hidden border border-sepia-700 bg-sepia-900">
                    <img src={editing.image_url} alt="Avatar" className="w-24 h-24 object-cover" />
                    <button
                      type="button"
                      onClick={() => setEditing({ ...editing, image_url: '' })}
                      className="absolute top-1 right-1 bg-red-900/80 text-red-300 rounded-full p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                <label className="flex items-center gap-3 cursor-pointer bg-sepia-900 border border-dashed border-sepia-700 rounded-xl px-4 py-3 hover:border-sepia-500 transition-all">
                  {isUploadingImage
                    ? <Loader2 className="w-5 h-5 text-sepia-400 animate-spin" />
                    : <Upload className="w-5 h-5 text-sepia-400" />}
                  <span className="text-sepia-400 text-sm">
                    {isUploadingImage ? 'Subiendo…' : 'Subir imagen (bucket: images)'}
                  </span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isUploadingImage} />
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-sepia-600 text-xs">O pegar URL:</span>
                  <input
                    type="url"
                    value={editing.image_url || ''}
                    onChange={(e) => setEditing({ ...editing, image_url: e.target.value })}
                    placeholder="https://…"
                    className="flex-1 bg-sepia-900 border border-sepia-700 rounded-lg px-3 py-1.5 text-sepia-100 placeholder-sepia-600 outline-none focus:border-sepia-500 text-sm"
                  />
                </div>
              </div>

              {/* Pub Key */}
              <div className="md:col-span-2 space-y-1">
                <label className="text-xs text-sepia-400 uppercase tracking-widest">
                  Pub Key de Runway
                  <span className="normal-case text-sepia-600 ml-2">
                    (dev.runwayml.com → Characters → Embed → data-pub-key)
                  </span>
                </label>
                <input
                  type="text"
                  value={editing.pub_key || ''}
                  onChange={(e) => setEditing({ ...editing, pub_key: e.target.value })}
                  placeholder="pub_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full bg-sepia-900 border border-sepia-700 rounded-xl px-4 py-2.5 text-sepia-100 placeholder-sepia-600 outline-none focus:border-sepia-500 font-mono text-xs"
                />
                {!editing.pub_key && (
                  <p className="text-amber-500/70 text-xs mt-1">
                    Sin pub_key el avatar se guarda como inactivo hasta que lo pegues.
                  </p>
                )}
              </div>

              {/* Orden */}
              <div className="space-y-1">
                <label className="text-xs text-sepia-400 uppercase tracking-widest">Orden de aparición</label>
                <input
                  type="number"
                  min={0}
                  value={editing.order_index ?? 0}
                  onChange={(e) => setEditing({ ...editing, order_index: parseInt(e.target.value) || 0 })}
                  className="w-full bg-sepia-900 border border-sepia-700 rounded-xl px-4 py-2.5 text-sepia-100 outline-none focus:border-sepia-500"
                />
              </div>

              {/* Activo */}
              <div className="flex items-center gap-3 pt-5">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editing.is_active ?? false}
                    onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
                    className="sr-only peer"
                    disabled={!editing.pub_key}
                  />
                  <div className="w-10 h-6 bg-sepia-700 rounded-full peer-checked:bg-sepia-500 transition-all after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-4 peer-disabled:opacity-40" />
                </label>
                <span className="text-sepia-400 text-sm">Visible en la sección pública</span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 bg-sepia-500 hover:bg-sepia-400 disabled:opacity-50 text-sepia-950 font-bold uppercase tracking-widest text-xs px-5 py-2.5 rounded-xl transition-all"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Guardar
              </button>
              <button
                onClick={() => setEditing(null)}
                className="flex items-center gap-2 text-sepia-400 hover:text-sepia-200 border border-sepia-700 px-5 py-2.5 rounded-xl text-xs uppercase tracking-widest transition-all"
              >
                <X className="w-4 h-4" />
                Cancelar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Lista de avatares ─────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h3 className="text-sepia-300 font-bold uppercase tracking-widest text-xs">
          Avatares ({avatars.length})
        </h3>
        <button
          onClick={() => setEditing({ is_active: false, order_index: avatars.length, emoji: '🎭' })}
          className="flex items-center gap-1.5 bg-sepia-600 hover:bg-sepia-500 text-sepia-100 text-xs font-bold uppercase tracking-widest px-3 py-2 rounded-xl transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          Nuevo avatar
        </button>
      </div>

      {avatars.length === 0 ? (
        <div className="bg-sepia-800/20 border border-dashed border-sepia-700 rounded-xl p-10 text-center text-sepia-600 text-sm">
          Sin avatares. Crea el primero o ejecuta el SQL de setup.
        </div>
      ) : (
        <div className="space-y-3">
          {avatars.map((avatar, idx) => (
            <div
              key={avatar.id}
              className="bg-sepia-800/30 border border-sepia-800 rounded-xl p-4 flex items-center gap-4"
            >
              {/* Controles de orden */}
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() => handleMove(idx, -1)}
                  disabled={idx === 0}
                  className="text-sepia-600 hover:text-sepia-300 disabled:opacity-20 transition-colors"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleMove(idx, 1)}
                  disabled={idx === avatars.length - 1}
                  className="text-sepia-600 hover:text-sepia-300 disabled:opacity-20 transition-colors"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>

              {/* Emoji + miniatura en la lista */}
              {avatar.image_url
                ? <img src={avatar.image_url} alt={avatar.label} className="w-10 h-10 rounded-full object-cover border border-sepia-700 flex-shrink-0" />
                : <span className="text-3xl flex-shrink-0">{avatar.emoji}</span>
              }

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sepia-100 font-serif text-sm">{avatar.label}</p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    avatar.is_active
                      ? 'text-green-400 border-green-700 bg-green-900/30'
                      : 'text-sepia-500 border-sepia-700 bg-sepia-800'
                  }`}>
                    {avatar.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                {avatar.description && (
                  <p className="text-sepia-500 text-xs mt-0.5">{avatar.description}</p>
                )}
                <p className="text-sepia-700 text-[10px] font-mono mt-1 truncate">
                  {avatar.pub_key
                    ? avatar.pub_key.slice(0, 36) + '…'
                    : <span className="text-amber-600/60">Sin pub_key — pendiente</span>
                  }
                </p>
              </div>

              {/* Acciones */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Toggle activo */}
                <button
                  onClick={() => handleToggleActive(avatar)}
                  title={avatar.is_active ? 'Desactivar' : 'Activar'}
                  className={`w-9 h-5 rounded-full transition-all relative ${
                    avatar.is_active ? 'bg-sepia-500' : 'bg-sepia-700'
                  }`}
                >
                  <span className={`absolute top-0.5 h-4 w-4 bg-white rounded-full transition-all ${
                    avatar.is_active ? 'left-[18px]' : 'left-0.5'
                  }`} />
                </button>
                <button
                  onClick={() => { setEditing(avatar); setShowEmojiPicker(false); }}
                  className="text-sepia-500 hover:text-sepia-200 p-1.5 rounded-lg hover:bg-sepia-700 transition-all"
                  title="Editar"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(avatar.id)}
                  disabled={isDeleting === avatar.id}
                  className="text-red-500 hover:text-red-300 p-1.5 rounded-lg hover:bg-red-900/20 transition-all"
                  title="Eliminar"
                >
                  {isDeleting === avatar.id
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Trash2 className="w-4 h-4" />
                  }
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
