import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus, Trash2, Edit2, Save, X, Loader2,
  Check, AlertCircle, ChevronUp, ChevronDown, Upload, RefreshCw, Copy, Users, KeyRound,
} from 'lucide-react';
import { Avatar } from '../types';
import { supabase } from '../supabase';

const EMOJI_OPTIONS = ['🎩','🤖','🗺️','👑','⚔️','📜','🏛️','🎭','🧙','👨‍🏫','👩‍🏫','🪖','🔭','📿','🕯️','🌿'];

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

/** Genera un código alfanumérico corto (6 chars) para compartir con clientes */
function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export const AvatarsAdmin: React.FC = () => {
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [editing, setEditing] = useState<Partial<Avatar> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [isSavingCode, setIsSavingCode] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [slugEdited, setSlugEdited] = useState(false);

  // ─── Códigos privados (avatar_private_codes) ───────────────────────────────
  type PrivateCode = {
    id: string;
    code: string;
    max_uses: number;
    uses_count: number;
    is_active: boolean;
    assigned_to: string | null;
    expires_at: string | null;
    created_at: string;
    last_used_at: string | null;
  };
  const [privateCodes, setPrivateCodes]           = useState<PrivateCode[]>([]);
  const [privateCodesLoading, setPrivateCodesLoading] = useState(false);
  const [newCodeAssignedTo, setNewCodeAssignedTo] = useState('');
  const [isCreatingCode, setIsCreatingCode]       = useState(false);
  const [deletingCodeId, setDeletingCodeId]       = useState<string | null>(null);
  const [copiedCodeId, setCopiedCodeId]           = useState<string | null>(null);

  const loadPrivateCodes = async (avatarId: string) => {
    setPrivateCodesLoading(true);
    try {
      const { data } = await supabase.functions.invoke('manage-avatar-codes', {
        body: { action: 'list', avatar_id: avatarId },
      });
      setPrivateCodes(data?.data ?? []);
    } catch { /* silencioso */ }
    setPrivateCodesLoading(false);
  };

  const createPrivateCode = async () => {
    if (!editing?.id) return;
    setIsCreatingCode(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-avatar-codes', {
        body: { action: 'create', avatar_id: editing.id, assigned_to: newCodeAssignedTo, max_uses: 1 },
      });
      if (error) throw error;
      if (data?.data) {
        setPrivateCodes(prev => [data.data, ...prev]);
        setNewCodeAssignedTo('');
        showMsg('success', `Código ${data.data.code} creado`);
      }
    } catch { showMsg('error', 'Error al crear el código'); }
    setIsCreatingCode(false);
  };

  const deletePrivateCode = async (codeId: string) => {
    if (!confirm('¿Eliminar este código? No podrá usarse más.')) return;
    setDeletingCodeId(codeId);
    try {
      await supabase.functions.invoke('manage-avatar-codes', {
        body: { action: 'delete', code_id: codeId },
      });
      setPrivateCodes(prev => prev.filter(c => c.id !== codeId));
    } catch { showMsg('error', 'Error al eliminar el código'); }
    setDeletingCodeId(null);
  };

  // Carga códigos al abrir un avatar privado existente
  useEffect(() => {
    if (editing?.id && editing?.is_private) {
      loadPrivateCodes(editing.id);
    } else {
      setPrivateCodes([]);
    }
  }, [editing?.id]); // eslint-disable-line

  // ─── Consentimientos ─────────────────────────────────────────
  type ConsentLog = {
    id: string;
    client_name: string;
    consented_at: string;
    is_return_visit: boolean;
    notice_version: string;
  };
  const [consentLogs, setConsentLogs]     = useState<ConsentLog[]>([]);
  const [consentLoading, setConsentLoading] = useState(false);
  const [consentLoaded, setConsentLoaded]   = useState(false);
  const [consentError, setConsentError]     = useState('');

  const fetchConsentLogs = async () => {
    setConsentLoading(true);
    setConsentError('');
    try {
      const { data, error } = await supabase.functions.invoke('get-consent-logs');
      if (error) throw error;
      setConsentLogs(data?.data ?? []);
      setConsentLoaded(true);
    } catch {
      setConsentError('No se pudieron cargar los registros.');
    } finally {
      setConsentLoading(false);
    }
  };

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

  // ─── Generar código y guardarlo inmediatamente en la BD ─────────
  const handleGenerateAndSaveCode = async () => {
    if (!editing) return;
    const newCode = generateCode();
    const updated = { ...editing, access_code: newCode };
    setEditing(updated);

    // Si el avatar ya existe en BD, guardar el código de inmediato
    if (editing.id) {
      setIsSavingCode(true);
      const { error } = await supabase
        .from('avatars')
        .update({ access_code: newCode })
        .eq('id', editing.id);
      setIsSavingCode(false);
      if (error) {
        showMsg('error', 'Error al guardar el código en la base de datos');
      } else {
        showMsg('success', `Código ${newCode} guardado en la BD ✓`);
        fetchAvatars();
      }
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
        access_code: editing.access_code?.trim() || null,
        is_private:  editing.is_private ?? false,
        private_client_label: editing.private_client_label?.trim() || null,
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
                  onChange={(e) => {
                    const label = e.target.value;
                    const update: Partial<typeof editing> = { label };
                    if (!editing.id && !slugEdited) {
                      update.slug = toSlug(label);
                    }
                    setEditing({ ...editing, ...update });
                  }}
                  placeholder="Ej: Don Ramón"
                  className="w-full bg-sepia-900 border border-sepia-700 rounded-xl px-4 py-2.5 text-sepia-100 placeholder-sepia-600 outline-none focus:border-sepia-500"
                />
              </div>

              {/* Slug */}
              <div className="space-y-1">
                <label className="text-xs text-sepia-400 uppercase tracking-widest flex items-center gap-2">
                  Slug * <span className="normal-case text-sepia-600">(único, sin espacios)</span>
                  {!editing.id && !slugEdited && (
                    <span className="normal-case text-cyan-600 text-[10px]">← auto</span>
                  )}
                </label>
                <input
                  type="text"
                  value={editing.slug || ''}
                  onChange={(e) => {
                    setSlugEdited(true);
                    setEditing({ ...editing, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') });
                  }}
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

              {/* Tipo de avatar */}
              <div className="md:col-span-2 space-y-2">
                <label className="text-xs text-sepia-400 uppercase tracking-widest">Tipo de avatar</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditing({ ...editing, is_private: false })}
                    className={`text-left rounded-xl border px-4 py-3 transition-all ${
                      editing.is_private
                        ? 'bg-sepia-900 border-sepia-700 text-sepia-400'
                        : 'bg-green-900/20 border-green-700 text-green-300'
                    }`}
                  >
                    <p className="text-sm font-semibold uppercase tracking-wider">Público</p>
                    <p className="text-xs opacity-80 mt-1">Se muestra en el catálogo general.</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing({ ...editing, is_private: true })}
                    className={`text-left rounded-xl border px-4 py-3 transition-all ${
                      editing.is_private
                        ? 'bg-amber-900/20 border-amber-700 text-amber-300'
                        : 'bg-sepia-900 border-sepia-700 text-sepia-400'
                    }`}
                  >
                    <p className="text-sm font-semibold uppercase tracking-wider">Privado</p>
                    <p className="text-xs opacity-80 mt-1">No aparece en catálogo; acceso solo por código.</p>
                  </button>
                </div>
              </div>

              {editing.is_private && (
                <div className="md:col-span-2 space-y-1">
                  <label className="text-xs text-sepia-400 uppercase tracking-widest">
                    Etiqueta del cliente privado
                    <span className="normal-case text-sepia-600 ml-2">(opcional)</span>
                  </label>
                  <input
                    type="text"
                    value={editing.private_client_label || ''}
                    onChange={(e) => setEditing({ ...editing, private_client_label: e.target.value })}
                    placeholder="Ej: Familia Pérez"
                    className="w-full bg-sepia-900 border border-sepia-700 rounded-xl px-4 py-2.5 text-sepia-100 placeholder-sepia-600 outline-none focus:border-sepia-500"
                  />
                </div>
              )}

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

              {/* Código de acceso — público: access_code simple / privado: tabla avatar_private_codes */}
              {!editing.is_private ? (
                <div className="md:col-span-2 space-y-1">
                  <label className="text-xs text-sepia-400 uppercase tracking-widest">
                    Código de acceso para clientes
                    <span className="normal-case text-sepia-600 ml-2">(opcional — de un solo uso)</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editing.access_code || ''}
                      onChange={(e) => setEditing({ ...editing, access_code: e.target.value.toUpperCase() })}
                      placeholder="Ej: ABC123"
                      maxLength={20}
                      className="flex-1 bg-sepia-900 border border-sepia-700 rounded-xl px-4 py-2.5 text-sepia-100 placeholder-sepia-600 outline-none focus:border-sepia-500 font-mono tracking-widest text-sm uppercase"
                    />
                    <button
                      type="button"
                      title="Generar código aleatorio y guardarlo"
                      onClick={handleGenerateAndSaveCode}
                      disabled={isSavingCode}
                      className="flex items-center gap-1.5 bg-sepia-700 hover:bg-sepia-600 disabled:opacity-50 text-sepia-200 px-3 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all shrink-0"
                    >
                      {isSavingCode ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                      Generar
                    </button>
                    <button
                      type="button"
                      title="Copiar código"
                      disabled={!editing.access_code}
                      onClick={() => {
                        if (editing.access_code) {
                          navigator.clipboard.writeText(editing.access_code);
                          setCodeCopied(true);
                          setTimeout(() => setCodeCopied(false), 2000);
                        }
                      }}
                      className="flex items-center gap-1.5 bg-sepia-800 hover:bg-sepia-700 disabled:opacity-30 text-sepia-300 px-3 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all shrink-0"
                    >
                      {codeCopied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {codeCopied ? 'Copiado' : 'Copiar'}
                    </button>
                  </div>
                  {editing.access_code ? (
                    <p className="text-green-500/70 text-xs mt-1">
                      ✓ Código activo (1 uso). Al validarse en la sección pública se desactiva automáticamente.
                    </p>
                  ) : (
                    <p className="text-sepia-600 text-xs mt-1">
                      Sin código: solo podrás entrar tú con la contraseña de admin.
                    </p>
                  )}
                </div>
              ) : (
                /* ── Privado: gestión de múltiples códigos ── */
                <div className="md:col-span-2 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-sepia-400 uppercase tracking-widest flex items-center gap-2">
                      <KeyRound className="w-3.5 h-3.5" /> Códigos de acceso privados
                      {privateCodes.length > 0 && (
                        <span className="normal-case text-sepia-600">({privateCodes.length})</span>
                      )}
                    </label>
                    {editing.id && (
                      <button
                        type="button"
                        onClick={() => loadPrivateCodes(editing.id!)}
                        disabled={privateCodesLoading}
                        className="text-sepia-500 hover:text-sepia-300 disabled:opacity-40"
                        title="Actualizar lista"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${privateCodesLoading ? 'animate-spin' : ''}`} />
                      </button>
                    )}
                  </div>

                  {!editing.id ? (
                    <p className="text-sepia-600 text-xs bg-sepia-800/30 rounded-xl px-4 py-3">
                      Guarda el avatar primero para poder crear códigos de acceso.
                    </p>
                  ) : (
                    <>
                      {/* Lista de códigos existentes */}
                      {privateCodes.length === 0 && !privateCodesLoading && (
                        <p className="text-sepia-600 text-xs bg-sepia-800/30 rounded-xl px-4 py-3">
                          Sin códigos todavía. Crea el primero abajo.
                        </p>
                      )}
                      {privateCodes.map(pc => (
                        <div key={pc.id} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 border ${
                          pc.is_active
                            ? 'bg-sepia-800/30 border-sepia-700'
                            : 'bg-sepia-900/20 border-sepia-800 opacity-60'
                        }`}>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                            pc.is_active
                              ? 'text-green-300 border-green-700 bg-green-900/20'
                              : 'text-orange-400 border-orange-800 bg-orange-900/10'
                          }`}>
                            {pc.is_active ? 'Activo' : 'Consumido'}
                          </span>
                          <span className="font-mono text-sepia-100 text-sm tracking-widest flex-1">{pc.code}</span>
                          {pc.assigned_to && (
                            <span className="text-sepia-500 text-xs truncate max-w-[100px]">{pc.assigned_to}</span>
                          )}
                          <span className="text-sepia-600 text-[10px] shrink-0">
                            {pc.uses_count}/{pc.max_uses} uso{pc.max_uses !== 1 ? 's' : ''}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(pc.code);
                              setCopiedCodeId(pc.id);
                              setTimeout(() => setCopiedCodeId(null), 2000);
                            }}
                            className="text-sepia-500 hover:text-sepia-200 shrink-0"
                            title="Copiar código"
                          >
                            {copiedCodeId === pc.id
                              ? <Check className="w-3.5 h-3.5 text-green-400" />
                              : <Copy className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => deletePrivateCode(pc.id)}
                            disabled={deletingCodeId === pc.id}
                            className="text-red-500 hover:text-red-300 disabled:opacity-40 shrink-0"
                            title="Eliminar código"
                          >
                            {deletingCodeId === pc.id
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : <Trash2 className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      ))}

                      {/* Crear nuevo código */}
                      <div className="flex gap-2 pt-1">
                        <input
                          type="text"
                          value={newCodeAssignedTo}
                          onChange={(e) => setNewCodeAssignedTo(e.target.value)}
                          placeholder="Para quién (ej: Familia Pérez)"
                          className="flex-1 bg-sepia-900 border border-sepia-700 rounded-xl px-3 py-2 text-sepia-100 placeholder-sepia-600 outline-none focus:border-sepia-500 text-sm"
                        />
                        <button
                          type="button"
                          onClick={createPrivateCode}
                          disabled={isCreatingCode}
                          className="flex items-center gap-1.5 bg-sepia-600 hover:bg-sepia-500 disabled:opacity-50 text-sepia-100 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all shrink-0"
                        >
                          {isCreatingCode ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                          Nuevo código
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

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
                <span className="text-sepia-400 text-sm">
                  {editing.is_private ? 'Habilitado para acceso privado' : 'Visible en la sección pública'}
                </span>
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
          onClick={() => { setEditing({ is_active: false, is_private: false, order_index: avatars.length, emoji: '🎭' }); setSlugEdited(false); }}
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
                    avatar.is_private
                      ? 'text-amber-300 border-amber-700 bg-amber-900/20'
                      : 'text-cyan-300 border-cyan-700 bg-cyan-900/20'
                  }`}>
                    {avatar.is_private ? 'Privado' : 'Público'}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    avatar.is_active
                      ? 'text-green-400 border-green-700 bg-green-900/30'
                      : 'text-sepia-500 border-sepia-700 bg-sepia-800'
                  }`}>
                    {avatar.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                  {/* Indicador de código */}
                  {avatar.access_code ? (
                    <button
                      type="button"
                      title="Copiar código"
                      onClick={() => navigator.clipboard.writeText(avatar.access_code!)}
                      className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border text-green-300 border-green-700 bg-green-900/20 hover:bg-green-900/40 transition-all"
                    >
                      <Copy className="w-2.5 h-2.5" />
                      {avatar.access_code}
                    </button>
                  ) : avatar.is_private ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border text-orange-400 border-orange-700 bg-orange-900/20">
                      ⚠ Sin código
                    </span>
                  ) : null}
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
      {/* ── Consentimientos ───────────────────────────────────── */}
      <div className="mt-8 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sepia-300 font-bold uppercase tracking-widest text-xs flex items-center gap-2">
            <Users className="w-3.5 h-3.5" />
            Consentimientos{consentLoaded ? ` (${consentLogs.length})` : ''}
          </h3>
          <button
            onClick={fetchConsentLogs}
            disabled={consentLoading}
            className="flex items-center gap-1.5 bg-sepia-700 hover:bg-sepia-600 disabled:opacity-50 text-sepia-200 text-xs font-bold uppercase tracking-widest px-3 py-2 rounded-xl transition-all"
          >
            {consentLoading
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <RefreshCw className="w-3.5 h-3.5" />}
            {consentLoaded ? 'Actualizar' : 'Cargar registros'}
          </button>
        </div>

        {consentError && (
          <p className="text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5" /> {consentError}
          </p>
        )}

        {!consentLoaded && !consentLoading && !consentError && (
          <div className="bg-sepia-800/20 border border-dashed border-sepia-700 rounded-xl p-6 text-center text-sepia-600 text-sm">
            Haz clic en "Cargar registros" para ver quién ha dado su consentimiento.
          </div>
        )}

        {consentLoaded && consentLogs.length === 0 && (
          <div className="bg-sepia-800/20 border border-dashed border-sepia-700 rounded-xl p-6 text-center text-sepia-600 text-sm">
            Sin registros de consentimiento todavía.
          </div>
        )}

        {consentLoaded && consentLogs.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-sepia-800">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-sepia-800/50 text-sepia-400 uppercase tracking-widest">
                  <th className="text-left px-4 py-2.5">Nombre</th>
                  <th className="text-left px-4 py-2.5">Fecha</th>
                  <th className="text-left px-4 py-2.5">Hora</th>
                  <th className="text-left px-4 py-2.5">Tipo</th>
                </tr>
              </thead>
              <tbody>
                {consentLogs.map((log, i) => {
                  const dt = new Date(log.consented_at);
                  return (
                    <tr
                      key={log.id}
                      className={`border-t border-sepia-800 ${
                        i % 2 === 0 ? 'bg-sepia-900/20' : 'bg-sepia-800/10'
                      }`}
                    >
                      <td className="px-4 py-2.5 text-sepia-100 font-medium">{log.client_name}</td>
                      <td className="px-4 py-2.5 text-sepia-400">
                        {dt.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-2.5 text-sepia-500">
                        {dt.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-2.5">
                        {log.is_return_visit
                          ? <span className="text-cyan-400">Reingreso</span>
                          : <span className="text-green-400">Primera vez</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
