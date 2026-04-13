import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus,
  Trash2,
  Key,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Copy,
  AlertCircle,
  Eye,
  ChevronDown,
  ChevronUp,
  ToggleLeft,
  ToggleRight,
  MessageSquare,
  Send,
} from 'lucide-react';
import { supabase } from '../supabase';
import { Collaborator, PendingStory, Story } from '../types';

const STATUS_CONFIG = {
  pending: { label: 'En Revisión', icon: Clock, color: 'text-amber-400', bg: 'bg-amber-400/10 border-amber-400/30' },
  approved: { label: 'Aprobada', icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/30' },
  rejected: { label: 'Rechazada', icon: XCircle, color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/30' },
};

interface CollaboratorsAdminProps {
  onStoriesUpdate: (stories: Story[]) => void;
}

export const CollaboratorsAdmin: React.FC<CollaboratorsAdminProps> = ({ onStoriesUpdate }) => {
  const [subView, setSubView] = useState<'collaborators' | 'reviews'>('collaborators');
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [pendingStories, setPendingStories] = useState<PendingStory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form for new collaborator
  const [newName, setNewName] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);

  // Reject modal
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = useState('');

  // Expanded story preview
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchCollaborators();
    fetchPendingStories();
  }, []);

  const fetchCollaborators = async () => {
    const { data } = await supabase
      .from('collaborators')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setCollaborators(data);
  };

  const fetchPendingStories = async () => {
    const { data } = await supabase
      .from('pending_stories')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setPendingStories(data);
  };

  const generateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'COLB-';
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  };

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleCreateCollaborator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setIsLoading(true);
    try {
      const code = generateCode();
      const toInsert = {
        id: crypto.randomUUID(),
        name: newName.trim(),
        code,
        is_active: true,
        notes: newNotes.trim() || null,
      };
      const { data, error } = await supabase.from('collaborators').insert([toInsert]).select();
      if (error) throw error;
      if (data) {
        setCollaborators(prev => [data[0], ...prev]);
        setNewName('');
        setNewNotes('');
        setShowNewForm(false);
        showMsg('success', `Colaborador creado. Código: ${code}`);
      }
    } catch (err: any) {
      showMsg('error', `Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleActive = async (collaborator: Collaborator) => {
    try {
      const { error } = await supabase
        .from('collaborators')
        .update({ is_active: !collaborator.is_active })
        .eq('id', collaborator.id);
      if (error) throw error;
      setCollaborators(prev =>
        prev.map(c => c.id === collaborator.id ? { ...c, is_active: !c.is_active } : c)
      );
      showMsg('success', collaborator.is_active ? 'Código desactivado' : 'Código reactivado');
    } catch (err: any) {
      showMsg('error', `Error: ${err.message}`);
    }
  };

  const handleDeleteCollaborator = async (id: string) => {
    if (!window.confirm('¿Eliminar este colaborador y todos sus envíos pendientes?')) return;
    try {
      await supabase.from('pending_stories').delete().eq('collaborator_id', id);
      const { error } = await supabase.from('collaborators').delete().eq('id', id);
      if (error) throw error;
      setCollaborators(prev => prev.filter(c => c.id !== id));
      setPendingStories(prev => prev.filter(s => s.collaborator_id !== id));
      showMsg('success', 'Colaborador eliminado');
    } catch (err: any) {
      showMsg('error', `Error: ${err.message}`);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    showMsg('success', `Código copiado: ${code}`);
  };

  const handleApprove = async (story: PendingStory) => {
    if (!window.confirm(`¿Aprobar y publicar "${story.title}"?`)) return;
    setIsLoading(true);
    try {
      // Copy to stories table
      const storyToPublish: Partial<Story> = {
        id: crypto.randomUUID(),
        title: story.title,
        description: story.description || '',
        fullNarrative: story.full_narrative || '',
        year: story.year || String(new Date().getFullYear()),
        category: story.category || 'Historia',
        thumbnail: story.thumbnail || '',
        videoUrl: story.video_url || '',
        audioUrl: story.audio_url,
        mapsUrl: story.maps_url,
        gallery: story.gallery || [],
        isPrivate: story.is_private || false,
        isVideoVertical: story.is_video_vertical || false,
        expires_at: story.expires_at,
        historian_id: story.historian_id || undefined,
        historian_name: story.historian_name || undefined,
        historian_photo: story.historian_photo || undefined,
      };
      const { data: storyData, error: storyError } = await supabase
        .from('stories')
        .insert([storyToPublish])
        .select();
      if (storyError) throw storyError;

      // Mark as approved
      await supabase
        .from('pending_stories')
        .update({ status: 'approved', reviewed_at: new Date().toISOString() })
        .eq('id', story.id);

      setPendingStories(prev =>
        prev.map(s => s.id === story.id ? { ...s, status: 'approved' as const, reviewed_at: new Date().toISOString() } : s)
      );

      // Refresh stories list in parent
      const { data: allStories } = await supabase
        .from('stories')
        .select('*')
        .order('year', { ascending: false });
      if (allStories) onStoriesUpdate(allStories);

      showMsg('success', `"${story.title}" aprobada y publicada en el álbum`);
    } catch (err: any) {
      showMsg('error', `Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectingId) return;
    const story = pendingStories.find(s => s.id === rejectingId);
    if (!story) return;
    setIsLoading(true);
    try {
      await supabase
        .from('pending_stories')
        .update({
          status: 'rejected',
          admin_notes: rejectNotes.trim() || null,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', rejectingId);
      setPendingStories(prev =>
        prev.map(s => s.id === rejectingId
          ? { ...s, status: 'rejected' as const, admin_notes: rejectNotes.trim() || undefined, reviewed_at: new Date().toISOString() }
          : s
        )
      );
      setRejectingId(null);
      setRejectNotes('');
      showMsg('success', `"${story.title}" rechazada`);
    } catch (err: any) {
      showMsg('error', `Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const pendingCount = pendingStories.filter(s => s.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Message */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`p-4 rounded-xl border text-sm font-medium ${
              message.type === 'success'
                ? 'bg-green-500/10 border-green-500/30 text-green-400'
                : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}
          >
            {message.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sub-tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setSubView('collaborators')}
          className={`px-5 py-2.5 rounded-xl text-xs uppercase tracking-widest font-bold transition-all flex items-center gap-2 ${
            subView === 'collaborators'
              ? 'bg-sepia-500 text-sepia-950'
              : 'bg-sepia-900 text-sepia-400 hover:bg-sepia-800'
          }`}
        >
          <User className="w-4 h-4" />
          Colaboradores ({collaborators.length})
        </button>
        <button
          onClick={() => setSubView('reviews')}
          className={`px-5 py-2.5 rounded-xl text-xs uppercase tracking-widest font-bold transition-all flex items-center gap-2 ${
            subView === 'reviews'
              ? 'bg-sepia-500 text-sepia-950'
              : 'bg-sepia-900 text-sepia-400 hover:bg-sepia-800'
          }`}
        >
          <Eye className="w-4 h-4" />
          Revisión
          {pendingCount > 0 && (
            <span className="bg-amber-400 text-sepia-950 rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-black">
              {pendingCount}
            </span>
          )}
        </button>
      </div>

      {/* ─── COLLABORATORS SUB-VIEW ─────────────────────────────────── */}
      {subView === 'collaborators' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sepia-200 font-serif text-lg">Gestión de Colaboradores</h3>
            <button
              onClick={() => setShowNewForm(!showNewForm)}
              className="flex items-center gap-2 bg-sepia-500 text-sepia-950 px-4 py-2 rounded-xl text-xs uppercase tracking-widest font-bold hover:bg-sepia-400 transition-all"
            >
              <Plus className="w-4 h-4" />
              Nuevo Colaborador
            </button>
          </div>

          {/* New collaborator form */}
          <AnimatePresence>
            {showNewForm && (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handleCreateCollaborator}
                className="bg-sepia-900 rounded-2xl border border-sepia-700 p-5 space-y-4 overflow-hidden"
              >
                <h4 className="text-sepia-300 text-sm font-bold uppercase tracking-widest">Nuevo Colaborador</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-sepia-500 mb-1">Nombre / Identificador *</label>
                    <input
                      autoFocus
                      type="text"
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      placeholder="Ej: María García"
                      className="w-full bg-sepia-950 border border-sepia-700 rounded-xl p-3 text-sepia-100 outline-none focus:border-sepia-500 transition-all text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-sepia-500 mb-1">Notas (opcional)</label>
                    <input
                      type="text"
                      value={newNotes}
                      onChange={e => setNewNotes(e.target.value)}
                      placeholder="Ej: fotógrafa, zona norte"
                      className="w-full bg-sepia-950 border border-sepia-700 rounded-xl p-3 text-sepia-100 outline-none focus:border-sepia-500 transition-all text-sm"
                    />
                  </div>
                </div>
                <p className="text-sepia-500 text-xs flex items-center gap-1.5">
                  <Key className="w-3 h-3" />
                  El código se genera automáticamente con formato COLB-XXXXXX
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => { setShowNewForm(false); setNewName(''); setNewNotes(''); }}
                    className="flex-1 py-2.5 rounded-xl border border-sepia-700 text-sepia-400 hover:bg-sepia-800 transition-all text-xs uppercase tracking-widest font-bold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || !newName.trim()}
                    className="flex-1 py-2.5 rounded-xl bg-sepia-500 text-sepia-950 font-bold uppercase tracking-widest text-xs hover:bg-sepia-400 transition-all disabled:opacity-50"
                  >
                    {isLoading ? 'Creando...' : 'Crear y Generar Código'}
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Collaborators list */}
          {collaborators.length === 0 ? (
            <div className="text-center py-12 text-sepia-600">
              <User className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-serif italic">No hay colaboradores todavía.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {collaborators.map(collab => {
                const myStories = pendingStories.filter(s => s.collaborator_id === collab.id);
                return (
                  <div
                    key={collab.id}
                    className={`bg-sepia-900 rounded-2xl border p-4 transition-all ${
                      collab.is_active ? 'border-sepia-800' : 'border-red-900/40 opacity-60'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        collab.is_active ? 'bg-sepia-700' : 'bg-red-900/30'
                      }`}>
                        <User className={`w-5 h-5 ${collab.is_active ? 'text-sepia-300' : 'text-red-400'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sepia-100 font-serif text-base">{collab.name}</span>
                          {!collab.is_active && (
                            <span className="text-red-400 text-xs font-bold uppercase tracking-widest bg-red-900/20 px-2 py-0.5 rounded-full border border-red-800/40">
                              Desactivado
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="font-mono text-sepia-400 text-sm bg-sepia-950 px-3 py-1 rounded-lg">{collab.code}</span>
                          <button
                            onClick={() => handleCopyCode(collab.code)}
                            className="text-sepia-500 hover:text-sepia-300 transition-colors"
                            title="Copiar código"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {collab.notes && (
                          <p className="text-sepia-600 text-xs mt-1">{collab.notes}</p>
                        )}
                        <p className="text-sepia-600 text-xs mt-1">
                          {myStories.length} historia(s) enviada(s) ·{' '}
                          {myStories.filter(s => s.status === 'pending').length} pendiente(s)
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleToggleActive(collab)}
                          title={collab.is_active ? 'Desactivar código' : 'Reactivar código'}
                          className="text-sepia-400 hover:text-sepia-200 transition-colors"
                        >
                          {collab.is_active
                            ? <ToggleRight className="w-6 h-6 text-green-400" />
                            : <ToggleLeft className="w-6 h-6 text-sepia-600" />
                          }
                        </button>
                        <button
                          onClick={() => handleDeleteCollaborator(collab.id)}
                          className="text-sepia-600 hover:text-red-400 transition-colors"
                          title="Eliminar colaborador"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── REVIEWS SUB-VIEW ───────────────────────────────────────── */}
      {subView === 'reviews' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sepia-200 font-serif text-lg">Historias para Revisar</h3>
            <button
              onClick={fetchPendingStories}
              className="flex items-center gap-2 text-sepia-400 hover:text-sepia-200 transition-colors text-xs uppercase tracking-widest"
            >
              <RefreshCw className="w-4 h-4" /> Actualizar
            </button>
          </div>

          {pendingStories.length === 0 ? (
            <div className="text-center py-12 text-sepia-600">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-serif italic">No hay historias pendientes de revisión.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingStories.map(story => {
                const cfg = STATUS_CONFIG[story.status] || STATUS_CONFIG.pending;
                const StatusIcon = cfg.icon;
                const isExpanded = expandedId === story.id;
                return (
                  <div
                    key={story.id}
                    className={`bg-sepia-900 rounded-2xl border overflow-hidden ${
                      story.status === 'pending' ? 'border-amber-800/40' : 'border-sepia-800'
                    }`}
                  >
                    <div className="p-5">
                      <div className="flex gap-4">
                        {story.thumbnail && (
                          <img
                            src={story.thumbnail}
                            alt=""
                            className="w-16 h-16 rounded-xl object-cover flex-shrink-0 border border-sepia-800"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 flex-wrap">
                            <div>
                              <h4 className="text-sepia-100 font-serif text-base">{story.title}</h4>
                              <p className="text-sepia-500 text-xs mt-0.5">
                                Por: <span className="text-sepia-400">{story.collaborator_name || '—'}</span>
                                {' · '}{story.category} · {story.year}
                                {' · '}{new Date(story.created_at!).toLocaleDateString('es-MX')}
                              </p>
                              {story.historian_id && (
                                <div className="flex items-center gap-2 mt-1.5">
                                  {story.historian_photo && (
                                    <img
                                      src={story.historian_photo}
                                      alt={story.historian_name}
                                      className="w-5 h-5 rounded-full object-cover border border-sepia-700"
                                    />
                                  )}
                                  <span className="text-sepia-500 text-xs">
                                    Guardián: <span className="text-amber-400 font-bold">{story.historian_name}</span>
                                  </span>
                                </div>
                              )}
                            </div>
                            <span className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full border flex-shrink-0 ${cfg.bg} ${cfg.color}`}>
                              <StatusIcon className="w-3.5 h-3.5" />
                              {cfg.label}
                            </span>
                          </div>
                          {story.description && (
                            <p className="text-sepia-400 text-sm mt-2 line-clamp-2">{story.description}</p>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 mt-4 flex-wrap">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : story.id)}
                          className="flex items-center gap-1.5 text-sepia-400 hover:text-sepia-200 transition-colors text-xs uppercase tracking-widest"
                        >
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          {isExpanded ? 'Ocultar Detalles' : 'Ver Detalles'}
                        </button>
                        {story.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(story)}
                              disabled={isLoading}
                              className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20 transition-all rounded-xl px-4 py-2 text-xs uppercase tracking-widest font-bold disabled:opacity-50"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              Aprobar y Publicar
                            </button>
                            <button
                              onClick={() => { setRejectingId(story.id); setRejectNotes(''); }}
                              className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all rounded-xl px-4 py-2 text-xs uppercase tracking-widest font-bold"
                            >
                              <XCircle className="w-4 h-4" />
                              Rechazar
                            </button>
                          </>
                        )}
                        {story.status !== 'pending' && story.admin_notes && (
                          <p className="text-sepia-500 text-xs italic">
                            Nota: "{story.admin_notes}"
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Expanded details */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="border-t border-sepia-800 p-5 space-y-4">
                            {story.full_narrative && (
                              <div>
                                <p className="text-xs uppercase tracking-widest text-sepia-500 mb-1 font-bold">Narrativa Completa</p>
                                <p className="text-sepia-300 text-sm leading-relaxed">{story.full_narrative}</p>
                              </div>
                            )}
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                              {story.video_url && (
                                <div className="bg-sepia-950 rounded-lg p-2">
                                  <p className="text-sepia-600 mb-0.5">Video</p>
                                  <a href={story.video_url} target="_blank" rel="noreferrer" className="text-sepia-400 underline truncate block">{story.video_url}</a>
                                </div>
                              )}
                              {story.audio_url && (
                                <div className="bg-sepia-950 rounded-lg p-2">
                                  <p className="text-sepia-600 mb-0.5">Audio</p>
                                  <a href={story.audio_url} target="_blank" rel="noreferrer" className="text-sepia-400 underline truncate block">{story.audio_url}</a>
                                </div>
                              )}
                              {story.maps_url && (
                                <div className="bg-sepia-950 rounded-lg p-2">
                                  <p className="text-sepia-600 mb-0.5">Mapa</p>
                                  <a href={story.maps_url} target="_blank" rel="noreferrer" className="text-sepia-400 underline truncate block">{story.maps_url}</a>
                                </div>
                              )}
                            </div>
                            {(story.gallery || []).length > 0 && (
                              <div>
                                <p className="text-xs uppercase tracking-widest text-sepia-500 mb-2 font-bold">Galería ({story.gallery!.length} fotos)</p>
                                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                                  {story.gallery!.map((url, i) => (
                                    <img key={i} src={url} alt="" className="aspect-square rounded-lg object-cover border border-sepia-800" />
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── REJECT MODAL ───────────────────────────────────────────── */}
      <AnimatePresence>
        {rejectingId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-sepia-950/80 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-sepia-900 rounded-3xl border border-sepia-700 p-8 max-w-md w-full shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <XCircle className="w-6 h-6 text-red-400" />
                <h3 className="text-sepia-100 font-serif text-xl">Rechazar Historia</h3>
              </div>
              <p className="text-sepia-400 text-sm mb-4">
                Puedes dejar una nota al colaborador explicando el motivo del rechazo (opcional).
              </p>
              <textarea
                rows={3}
                value={rejectNotes}
                onChange={e => setRejectNotes(e.target.value)}
                placeholder="Ej: La historia necesita más detalles, favor de revisar..."
                className="w-full bg-sepia-950 border border-sepia-700 rounded-xl p-3 text-sepia-100 outline-none focus:border-sepia-500 transition-all resize-none text-sm mb-4"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => { setRejectingId(null); setRejectNotes(''); }}
                  className="flex-1 py-3 rounded-xl border border-sepia-700 text-sepia-400 hover:bg-sepia-800 transition-all text-xs uppercase tracking-widest font-bold"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleReject}
                  disabled={isLoading}
                  className="flex-1 py-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-all text-xs uppercase tracking-widest font-bold disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  {isLoading ? 'Rechazando...' : 'Confirmar Rechazo'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
