import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus, Trash2, Edit2, Save, X, Upload, Loader2,
  Check, AlertCircle, Ticket, CheckCircle2, Clock,
  XCircle, Search, Calendar, MapPin, DollarSign, Users,
  Image as ImageIcon, ChevronDown, ChevronUp,
} from 'lucide-react';
import { Conference, ConferenceTicket } from '../types';
import { supabase } from '../supabase';

interface ConferencesAdminProps {
  onClose?: () => void;
}

// Convierte un ISO string (UTC) al formato requerido por datetime-local en hora local
const toLocalInputValue = (isoStr?: string): string => {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

type StatusFilter = 'all' | 'pending' | 'paid' | 'cancelled';

export const ConferencesAdmin: React.FC<ConferencesAdminProps> = () => {
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [selectedConference, setSelectedConference] = useState<Conference | null>(null);
  const [tickets, setTickets] = useState<ConferenceTicket[]>([]);
  const [editingConference, setEditingConference] = useState<Partial<Conference> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingCertBg, setIsUploadingCertBg] = useState(false);
  const [isUploadingSignature, setIsUploadingSignature] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);
  const [paymentNotes, setPaymentNotes] = useState<Record<string, string>>({});
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  useEffect(() => {
    fetchConferences();
  }, []);

  useEffect(() => {
    if (selectedConference) fetchTickets(selectedConference.id);
  }, [selectedConference]);

  // ─── Fetch ─────────────────────────────────────────────────────────────────

  const fetchConferences = async () => {
    const { data, error } = await supabase
      .from('conferences')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setConferences(data);
  };

  const fetchTickets = async (conferenceId: string) => {
    const { data, error } = await supabase
      .from('conference_tickets')
      .select('*')
      .eq('conference_id', conferenceId)
      .order('created_at', { ascending: false });
    if (!error && data) {
      setTickets(data);
      const notes: Record<string, string> = {};
      data.forEach((t) => { notes[t.id] = t.payment_notes || ''; });
      setPaymentNotes(notes);
    }
  };

  // ─── Banner Upload ──────────────────────────────────────────────────────────

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingConference) return;
    setIsUploading(true);
    try {
      const fileName = `conferences/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('images').getPublicUrl(fileName);
      setEditingConference({ ...editingConference, banner_url: urlData.publicUrl });
    } catch (err) {
      console.error('Error uploading banner:', err);
      setMessage({ type: 'error', text: 'Error al subir el banner' });
    } finally {
      setIsUploading(false);
    }
  };

  // ─── Certificate BG Upload ────────────────────────────────────────────────────

  const handleCertBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingConference) return;
    setIsUploadingCertBg(true);
    try {
      const fileName = `conferences/cert-bg-${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('images').getPublicUrl(fileName);
      setEditingConference({ ...editingConference, certificate_bg_url: urlData.publicUrl });
    } catch (err) {
      console.error('Error uploading cert background:', err);
      setMessage({ type: 'error', text: 'Error al subir la imagen de fondo' });
    } finally {
      setIsUploadingCertBg(false);
    }
  };

  // ─── Signature Upload ────────────────────────────────────────────────────

  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingConference) return;
    setIsUploadingSignature(true);
    try {
      const fileName = `conferences/firma-${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('images').getPublicUrl(fileName);
      setEditingConference({ ...editingConference, signature_url: urlData.publicUrl });
    } catch (err) {
      console.error('Error uploading signature:', err);
      setMessage({ type: 'error', text: 'Error al subir la firma' });
    } finally {
      setIsUploadingSignature(false);
    }
  };

  // ─── Save Conference ────────────────────────────────────────────────────────

  const handleSaveConference = async () => {
    if (!editingConference?.title?.trim()) {
      setMessage({ type: 'error', text: 'El título es obligatorio' });
      return;
    }
    setIsSaving(true);
    try {
      if (editingConference.id) {
        const { error } = await supabase
          .from('conferences')
          .update({
            title: editingConference.title,
            description: editingConference.description || null,
            banner_url: editingConference.banner_url || null,
            event_date: editingConference.event_date || null,
            location: editingConference.location || null,
            price: editingConference.price ?? 0,
            capacity: editingConference.capacity ?? 100,
            is_active: editingConference.is_active ?? true,
            notes: editingConference.notes || null,
            speaker_name: editingConference.speaker_name || null,
            speaker_name_2: editingConference.speaker_name_2 || null,
            logo_url: editingConference.logo_url || null,
            certificate_bg_url: editingConference.certificate_bg_url || null,
            signature_url: editingConference.signature_url || null,
            duration_hours: editingConference.duration_hours ?? null,
            federation_legend: editingConference.federation_legend || null,
            promo_badge: editingConference.promo_badge || null,
          })
          .eq('id', editingConference.id);
        if (error) throw error;
        setMessage({ type: 'success', text: 'Conferencia actualizada' });
      } else {
        const { error } = await supabase
          .from('conferences')
          .insert([{
            title: editingConference.title,
            description: editingConference.description || null,
            banner_url: editingConference.banner_url || null,
            event_date: editingConference.event_date || null,
            location: editingConference.location || null,
            price: editingConference.price ?? 0,
            capacity: editingConference.capacity ?? 100,
            is_active: editingConference.is_active ?? true,
            notes: editingConference.notes || null,
            speaker_name: editingConference.speaker_name || null,
            speaker_name_2: editingConference.speaker_name_2 || null,
            logo_url: editingConference.logo_url || null,
            certificate_bg_url: editingConference.certificate_bg_url || null,
            signature_url: editingConference.signature_url || null,
            duration_hours: editingConference.duration_hours ?? null,
            federation_legend: editingConference.federation_legend || null,
            promo_badge: editingConference.promo_badge || null,
          }]);
        if (error) throw error;
        setMessage({ type: 'success', text: 'Conferencia creada' });
      }
      setEditingConference(null);
      fetchConferences();
    } catch (err) {
      console.error('Error saving conference:', err);
      setMessage({ type: 'error', text: 'Error al guardar la conferencia' });
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Delete Conference ──────────────────────────────────────────────────────

  const handleDeleteConference = async (id: string) => {
    if (!confirm('¿Eliminar esta conferencia y todos sus boletos?')) return;
    setIsDeleting(id);
    const { error } = await supabase.from('conferences').delete().eq('id', id);
    if (!error) {
      fetchConferences();
      if (selectedConference?.id === id) {
        setSelectedConference(null);
        setTickets([]);
      }
      setMessage({ type: 'success', text: 'Conferencia eliminada' });
    }
    setIsDeleting(null);
  };

  // ─── Update Ticket Status ───────────────────────────────────────────────────

  const handleUpdateTicketStatus = async (
    ticketId: string,
    newStatus: 'paid' | 'cancelled' | 'pending'
  ) => {
    setUpdatingStatus(ticketId);
    try {
      const updateData: Partial<ConferenceTicket> = {
        status: newStatus,
        payment_notes: paymentNotes[ticketId] || null,
      };
      if (newStatus === 'paid') {
        updateData.paid_at = new Date().toISOString();
      } else {
        updateData.paid_at = undefined;
      }

      const { error } = await supabase
        .from('conference_tickets')
        .update(updateData)
        .eq('id', ticketId);

      if (error) throw error;
      setMessage({ type: 'success', text: `Boleto marcado como ${statusLabel(newStatus)}` });
      if (selectedConference) fetchTickets(selectedConference.id);
    } catch (err) {
      console.error('Error updating ticket:', err);
      setMessage({ type: 'error', text: 'Error al actualizar el boleto' });
    } finally {
      setUpdatingStatus(null);
    }
  };

  // ─── Delete Ticket ──────────────────────────────────────────────────────────

  const handleDeleteTicket = async (ticketId: string) => {
    if (!confirm('¿Eliminar este boleto permanentemente?')) return;
    const { error } = await supabase.from('conference_tickets').delete().eq('id', ticketId);
    if (!error && selectedConference) {
      fetchTickets(selectedConference.id);
      setMessage({ type: 'success', text: 'Boleto eliminado' });
    }
  };

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const statusLabel = (status: string) => {
    if (status === 'paid') return 'Pagado';
    if (status === 'cancelled') return 'Cancelado';
    return 'Pendiente';
  };

  const statusColor = (status: string) => {
    if (status === 'paid') return 'text-green-400 bg-green-900/30 border-green-700';
    if (status === 'cancelled') return 'text-red-400 bg-red-900/30 border-red-700';
    return 'text-amber-400 bg-amber-900/30 border-amber-700';
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('es-MX', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const filteredTickets = tickets.filter((t) => {
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || t.folio.toLowerCase().includes(q)
      || t.attendee_name.toLowerCase().includes(q)
      || t.attendee_email.toLowerCase().includes(q)
      || (t.attendee_phone || '').includes(q);
    return matchesStatus && matchesSearch;
  });

  const ticketCounts = {
    all: tickets.length,
    pending: tickets.filter((t) => t.status === 'pending').length,
    paid: tickets.filter((t) => t.status === 'paid').length,
    cancelled: tickets.filter((t) => t.status === 'cancelled').length,
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Message */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            onAnimationComplete={() => setTimeout(() => setMessage(null), 3000)}
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

      {/* ── FORM EDICIÓN ────────────────────────────────────────────── */}
      <AnimatePresence>
        {editingConference && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-sepia-800/50 border border-sepia-700 rounded-2xl p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sepia-100 font-serif text-lg">
                {editingConference.id ? 'Editar Conferencia' : 'Nueva Conferencia'}
              </h3>
              <button onClick={() => setEditingConference(null)} className="text-sepia-500 hover:text-sepia-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Título */}
              <div className="md:col-span-2 space-y-1">
                <label className="text-xs text-sepia-400 uppercase tracking-widest">Título *</label>
                <input
                  type="text"
                  value={editingConference.title || ''}
                  onChange={(e) => setEditingConference({ ...editingConference, title: e.target.value })}
                  placeholder="Nombre de la conferencia"
                  className="w-full bg-sepia-900 border border-sepia-700 rounded-xl px-4 py-2.5 text-sepia-100 placeholder-sepia-600 outline-none focus:border-sepia-500"
                />
              </div>

              {/* Descripción */}
              <div className="md:col-span-2 space-y-1">
                <label className="text-xs text-sepia-400 uppercase tracking-widest">Descripción</label>
                <textarea
                  rows={3}
                  value={editingConference.description || ''}
                  onChange={(e) => setEditingConference({ ...editingConference, description: e.target.value })}
                  placeholder="Descripción del evento..."
                  className="w-full bg-sepia-900 border border-sepia-700 rounded-xl px-4 py-2.5 text-sepia-100 placeholder-sepia-600 outline-none focus:border-sepia-500 resize-none"
                />
              </div>

              {/* Banner */}
              <div className="md:col-span-2 space-y-2">
                <label className="text-xs text-sepia-400 uppercase tracking-widest">Banner del evento</label>
                {editingConference.banner_url && (
                  <div className="relative w-full rounded-xl overflow-hidden border border-sepia-700 mb-2 bg-sepia-900">
                    <img
                      src={editingConference.banner_url}
                      alt="Banner"
                      className="w-full h-auto max-h-[24rem] object-contain"
                    />
                    <button
                      onClick={() => setEditingConference({ ...editingConference, banner_url: '' })}
                      className="absolute top-2 right-2 bg-red-900/80 text-red-300 rounded-full p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <label className="flex items-center gap-3 cursor-pointer bg-sepia-900 border border-dashed border-sepia-700 rounded-xl px-4 py-3 hover:border-sepia-500 transition-all">
                  {isUploading ? (
                    <Loader2 className="w-5 h-5 text-sepia-400 animate-spin" />
                  ) : (
                    <Upload className="w-5 h-5 text-sepia-400" />
                  )}
                  <span className="text-sepia-400 text-sm">
                    {isUploading ? 'Subiendo...' : 'Subir banner (bucket: images)'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleBannerUpload}
                    disabled={isUploading}
                  />
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sepia-600 text-xs">O pegar URL:</span>
                  <input
                    type="url"
                    value={editingConference.banner_url || ''}
                    onChange={(e) => setEditingConference({ ...editingConference, banner_url: e.target.value })}
                    placeholder="https://..."
                    className="flex-1 bg-sepia-900 border border-sepia-700 rounded-lg px-3 py-1.5 text-sepia-100 placeholder-sepia-600 outline-none focus:border-sepia-500 text-sm"
                  />
                </div>
              </div>

              {/* Fecha */}
              <div className="space-y-1">
                <label className="text-xs text-sepia-400 uppercase tracking-widest">Fecha y hora</label>
                <input
                  type="datetime-local"
                  value={toLocalInputValue(editingConference.event_date)}
                  onChange={(e) => setEditingConference({ ...editingConference, event_date: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                  className="w-full bg-sepia-900 border border-sepia-700 rounded-xl px-4 py-2.5 text-sepia-100 outline-none focus:border-sepia-500"
                />
              </div>

              {/* Lugar */}
              <div className="space-y-1">
                <label className="text-xs text-sepia-400 uppercase tracking-widest">Lugar</label>
                <input
                  type="text"
                  value={editingConference.location || ''}
                  onChange={(e) => setEditingConference({ ...editingConference, location: e.target.value })}
                  placeholder="Ej: Auditorio Municipal"
                  className="w-full bg-sepia-900 border border-sepia-700 rounded-xl px-4 py-2.5 text-sepia-100 placeholder-sepia-600 outline-none focus:border-sepia-500"
                />
              </div>

              {/* Precio */}
              <div className="space-y-1">
                <label className="text-xs text-sepia-400 uppercase tracking-widest">Precio (MXN) — 0 = libre</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={editingConference.price ?? 0}
                  onChange={(e) => setEditingConference({ ...editingConference, price: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-sepia-900 border border-sepia-700 rounded-xl px-4 py-2.5 text-sepia-100 outline-none focus:border-sepia-500"
                />
              </div>

              {/* Cupo */}
              <div className="space-y-1">
                <label className="text-xs text-sepia-400 uppercase tracking-widest">Cupo máximo</label>
                <input
                  type="number"
                  min={1}
                  value={editingConference.capacity ?? 100}
                  onChange={(e) => setEditingConference({ ...editingConference, capacity: parseInt(e.target.value) || 100 })}
                  className="w-full bg-sepia-900 border border-sepia-700 rounded-xl px-4 py-2.5 text-sepia-100 outline-none focus:border-sepia-500"
                />
              </div>

              {/* Ponente Principal */}
              <div className="space-y-1">
                <label className="text-xs text-sepia-400 uppercase tracking-widest">Ponente principal</label>
                <input
                  type="text"
                  value={editingConference.speaker_name || ''}
                  onChange={(e) => setEditingConference({ ...editingConference, speaker_name: e.target.value })}
                  placeholder="Ej: Dr. Carlos Mendoza"
                  className="w-full bg-sepia-900 border border-sepia-700 rounded-xl px-4 py-2.5 text-sepia-100 placeholder-sepia-600 outline-none focus:border-sepia-500"
                />
              </div>

              {/* Segundo Ponente */}
              <div className="space-y-1">
                <label className="text-xs text-sepia-400 uppercase tracking-widest">Segundo ponente <span className="normal-case text-sepia-600">(opcional)</span></label>
                <input
                  type="text"
                  value={editingConference.speaker_name_2 || ''}
                  onChange={(e) => setEditingConference({ ...editingConference, speaker_name_2: e.target.value })}
                  placeholder="Ej: Mtra. Ana López"
                  className="w-full bg-sepia-900 border border-sepia-700 rounded-xl px-4 py-2.5 text-sepia-100 placeholder-sepia-600 outline-none focus:border-sepia-500"
                />
              </div>

              {/* Logo reconocimiento */}
              <div className="md:col-span-2 space-y-1">
                <label className="text-xs text-sepia-400 uppercase tracking-widest">URL del logo (para el reconocimiento PDF)</label>
                <input
                  type="url"
                  value={editingConference.logo_url || ''}
                  onChange={(e) => setEditingConference({ ...editingConference, logo_url: e.target.value })}
                  placeholder="https://..."
                  className="w-full bg-sepia-900 border border-sepia-700 rounded-xl px-4 py-2.5 text-sepia-100 placeholder-sepia-600 outline-none focus:border-sepia-500"
                />
              </div>

              {/* Imagen de fondo del reconocimiento */}
              <div className="md:col-span-2 space-y-2">
                <label className="text-xs text-sepia-400 uppercase tracking-widest">Fondo del reconocimiento PDF <span className="normal-case text-sepia-600">(difuminado, opcional)</span></label>
                {editingConference.certificate_bg_url && (
                  <div className="relative w-full rounded-xl overflow-hidden border border-sepia-700 mb-2 bg-sepia-900">
                    <img
                      src={editingConference.certificate_bg_url}
                      alt="Fondo reconocimiento"
                      className="w-full h-auto max-h-40 object-cover opacity-60"
                    />
                    <button
                      type="button"
                      onClick={() => setEditingConference({ ...editingConference, certificate_bg_url: '' })}
                      className="absolute top-2 right-2 bg-red-900/80 text-red-300 rounded-full p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <label className="flex items-center gap-3 cursor-pointer bg-sepia-900 border border-dashed border-sepia-700 rounded-xl px-4 py-3 hover:border-sepia-500 transition-all">
                  {isUploadingCertBg ? (
                    <Loader2 className="w-5 h-5 text-sepia-400 animate-spin" />
                  ) : (
                    <ImageIcon className="w-5 h-5 text-sepia-400" />
                  )}
                  <span className="text-sepia-400 text-sm">
                    {isUploadingCertBg ? 'Subiendo...' : 'Subir imagen de fondo'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleCertBgUpload}
                    disabled={isUploadingCertBg}
                  />
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sepia-600 text-xs">O pegar URL:</span>
                  <input
                    type="url"
                    value={editingConference.certificate_bg_url || ''}
                    onChange={(e) => setEditingConference({ ...editingConference, certificate_bg_url: e.target.value })}
                    placeholder="https://..."
                    className="flex-1 bg-sepia-900 border border-sepia-700 rounded-lg px-3 py-1.5 text-sepia-100 placeholder-sepia-600 outline-none focus:border-sepia-500 text-sm"
                  />
                </div>
              </div>

              {/* Notas internas */}
              <div className="md:col-span-2 space-y-1">
                <label className="text-xs text-sepia-400 uppercase tracking-widest">Notas internas (solo tú las ves)</label>
                <input
                  type="text"
                  value={editingConference.notes || ''}
                  onChange={(e) => setEditingConference({ ...editingConference, notes: e.target.value })}
                  placeholder="Ej: Confirmar lugar el día anterior"
                  className="w-full bg-sepia-900 border border-sepia-700 rounded-xl px-4 py-2.5 text-sepia-100 placeholder-sepia-600 outline-none focus:border-sepia-500"
                />
              </div>

              {/* Duración */}
              <div className="space-y-1">
                <label className="text-xs text-sepia-400 uppercase tracking-widest">Duración <span className="normal-case text-sepia-600">(horas, opcional)</span></label>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={editingConference.duration_hours ?? ''}
                  onChange={(e) => setEditingConference({ ...editingConference, duration_hours: e.target.value ? parseFloat(e.target.value) : undefined })}
                  placeholder="Ej: 2"
                  className="w-full bg-sepia-900 border border-sepia-700 rounded-xl px-4 py-2.5 text-sepia-100 placeholder-sepia-600 outline-none focus:border-sepia-500"
                />
              </div>

              {/* Leyenda de membresía */}
              <div className="space-y-1">
                <label className="text-xs text-sepia-400 uppercase tracking-widest">Leyenda del reconocimiento <span className="normal-case text-sepia-600">(opcional)</span></label>
                <input
                  type="text"
                  value={editingConference.federation_legend || ''}
                  onChange={(e) => setEditingConference({ ...editingConference, federation_legend: e.target.value })}
                  placeholder="Ej: Miembro de la Federación Nacional..."
                  className="w-full bg-sepia-900 border border-sepia-700 rounded-xl px-4 py-2.5 text-sepia-100 placeholder-sepia-600 outline-none focus:border-sepia-500"
                />
              </div>

              {/* Leyenda promocional pública */}
              <div className="md:col-span-2 space-y-1">
                <label className="text-xs text-sepia-400 uppercase tracking-widest">
                  🏷️ Leyenda promocional <span className="normal-case text-sepia-600">(visible en la tarjeta pública)</span>
                </label>
                <input
                  type="text"
                  value={editingConference.promo_badge || ''}
                  onChange={(e) => setEditingConference({ ...editingConference, promo_badge: e.target.value })}
                  placeholder="Ej: ¡Quedan pocos lugares! · Precio especial hasta el viernes"
                  className="w-full bg-sepia-900 border border-amber-700/60 rounded-xl px-4 py-2.5 text-sepia-100 placeholder-sepia-600 outline-none focus:border-amber-500"
                />
                <p className="text-sepia-600 text-xs">Déjalo vacío para no mostrar ninguna leyenda.</p>
              </div>

              {/* Firma digital */}
              <div className="md:col-span-2 space-y-2">
                <label className="text-xs text-sepia-400 uppercase tracking-widest">Firma digital PNG <span className="normal-case text-sepia-600">(fondo transparente, opcional)</span></label>
                {editingConference.signature_url && (
                  <div className="relative inline-flex items-center justify-center rounded-xl border border-sepia-700 bg-sepia-900 p-3 mb-2">
                    <img
                      src={editingConference.signature_url}
                      alt="Firma"
                      className="max-h-20 max-w-[200px] object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => setEditingConference({ ...editingConference, signature_url: '' })}
                      className="absolute top-1 right-1 bg-red-900/80 text-red-300 rounded-full p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                <label className="flex items-center gap-3 cursor-pointer bg-sepia-900 border border-dashed border-sepia-700 rounded-xl px-4 py-3 hover:border-sepia-500 transition-all">
                  {isUploadingSignature ? (
                    <Loader2 className="w-5 h-5 text-sepia-400 animate-spin" />
                  ) : (
                    <Upload className="w-5 h-5 text-sepia-400" />
                  )}
                  <span className="text-sepia-400 text-sm">
                    {isUploadingSignature ? 'Subiendo...' : 'Subir firma (PNG con fondo transparente)'}
                  </span>
                  <input
                    type="file"
                    accept="image/png,image/*"
                    className="hidden"
                    onChange={handleSignatureUpload}
                    disabled={isUploadingSignature}
                  />
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sepia-600 text-xs">O pegar URL:</span>
                  <input
                    type="url"
                    value={editingConference.signature_url || ''}
                    onChange={(e) => setEditingConference({ ...editingConference, signature_url: e.target.value })}
                    placeholder="https://..."
                    className="flex-1 bg-sepia-900 border border-sepia-700 rounded-lg px-3 py-1.5 text-sepia-100 placeholder-sepia-600 outline-none focus:border-sepia-500 text-sm"
                  />
                </div>
              </div>

              {/* Activo */}
              <div className="md:col-span-2 flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingConference.is_active ?? true}
                    onChange={(e) => setEditingConference({ ...editingConference, is_active: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-6 bg-sepia-700 rounded-full peer-checked:bg-sepia-500 transition-all after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-4" />
                </label>
                <span className="text-sepia-400 text-sm">Visible en la app pública</span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSaveConference}
                disabled={isSaving}
                className="flex items-center gap-2 bg-sepia-500 hover:bg-sepia-400 disabled:opacity-50 text-sepia-950 font-bold uppercase tracking-widest text-xs px-5 py-2.5 rounded-xl transition-all"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Guardar
              </button>
              <button
                onClick={() => setEditingConference(null)}
                className="flex items-center gap-2 text-sepia-400 hover:text-sepia-200 border border-sepia-700 px-5 py-2.5 rounded-xl text-xs uppercase tracking-widest transition-all"
              >
                <X className="w-4 h-4" />
                Cancelar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── LAYOUT PRINCIPAL ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ─ Lista de Conferencias ─ */}
        <div className="lg:col-span-1 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sepia-300 font-bold uppercase tracking-widest text-xs">
              Conferencias ({conferences.length})
            </h3>
            <button
              onClick={() => setEditingConference({ is_active: true, price: 0, capacity: 100 })}
              className="flex items-center gap-1.5 bg-sepia-600 hover:bg-sepia-500 text-sepia-100 text-xs font-bold uppercase tracking-widest px-3 py-2 rounded-xl transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Nueva
            </button>
          </div>

          {conferences.length === 0 ? (
            <div className="bg-sepia-800/30 border border-dashed border-sepia-700 rounded-xl p-8 text-center text-sepia-600 text-sm">
              Sin conferencias. Crea la primera.
            </div>
          ) : (
            <div className="space-y-3">
              {conferences.map((conf) => (
                <div
                  key={conf.id}
                  onClick={() => setSelectedConference(conf)}
                  className={`cursor-pointer border rounded-xl p-4 transition-all space-y-2 ${
                    selectedConference?.id === conf.id
                      ? 'border-sepia-500 bg-sepia-700/40'
                      : 'border-sepia-800 bg-sepia-800/30 hover:border-sepia-600'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sepia-100 font-serif text-sm line-clamp-1">{conf.title}</p>
                      {conf.event_date && (
                        <p className="text-sepia-500 text-xs mt-0.5 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(conf.event_date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                      )}
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${conf.is_active ? 'text-green-400 border-green-700 bg-green-900/30' : 'text-sepia-500 border-sepia-700 bg-sepia-800'}`}>
                      {conf.is_active ? 'Activa' : 'Oculta'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sepia-400 text-xs">
                      {conf.price === 0 ? 'Libre' : `$${conf.price} MXN`}
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingConference(conf); }}
                        className="text-sepia-500 hover:text-sepia-200 p-1 rounded-lg hover:bg-sepia-700 transition-all"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteConference(conf.id); }}
                        disabled={isDeleting === conf.id}
                        className="text-red-500 hover:text-red-300 p-1 rounded-lg hover:bg-red-900/30 transition-all"
                      >
                        {isDeleting === conf.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Trash2 className="w-3.5 h-3.5" />
                        }
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ─ Panel de Boletos ─ */}
        <div className="lg:col-span-2 space-y-4">
          {!selectedConference ? (
            <div className="bg-sepia-800/20 border border-dashed border-sepia-800 rounded-2xl p-16 text-center space-y-3">
              <Ticket className="w-10 h-10 text-sepia-700 mx-auto" />
              <p className="text-sepia-500 text-sm">Selecciona una conferencia para ver sus boletos</p>
            </div>
          ) : (
            <>
              {/* Header de boletos */}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h3 className="text-sepia-100 font-serif text-lg">{selectedConference.title}</h3>
                  <p className="text-sepia-500 text-xs mt-0.5">Gestión de boletos</p>
                </div>
                {/* Estadísticas rápidas */}
                <div className="flex gap-3 text-xs">
                  <div className="text-center">
                    <p className="text-amber-400 font-bold text-lg">{ticketCounts.pending}</p>
                    <p className="text-sepia-500 uppercase tracking-widest">Pendiente</p>
                  </div>
                  <div className="text-center">
                    <p className="text-green-400 font-bold text-lg">{ticketCounts.paid}</p>
                    <p className="text-sepia-500 uppercase tracking-widest">Pagado</p>
                  </div>
                  <div className="text-center">
                    <p className="text-red-400 font-bold text-lg">{ticketCounts.cancelled}</p>
                    <p className="text-sepia-500 uppercase tracking-widest">Cancelado</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sepia-100 font-bold text-lg">{ticketCounts.all}</p>
                    <p className="text-sepia-500 uppercase tracking-widest">Total</p>
                  </div>
                </div>
              </div>

              {/* Filtros */}
              <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-48">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sepia-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar por folio, nombre, email..."
                    className="w-full bg-sepia-800 border border-sepia-700 rounded-xl pl-9 pr-4 py-2.5 text-sepia-100 placeholder-sepia-600 outline-none focus:border-sepia-500 text-sm"
                  />
                </div>
                <div className="flex gap-1 bg-sepia-800/50 border border-sepia-700 rounded-xl p-1">
                  {(['all', 'pending', 'paid', 'cancelled'] as StatusFilter[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => setStatusFilter(s)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
                        statusFilter === s ? 'bg-sepia-600 text-sepia-100' : 'text-sepia-500 hover:text-sepia-200'
                      }`}
                    >
                      {s === 'all' ? `Todos (${ticketCounts.all})` :
                       s === 'pending' ? `Pend. (${ticketCounts.pending})` :
                       s === 'paid' ? `Pag. (${ticketCounts.paid})` :
                       `Can. (${ticketCounts.cancelled})`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Lista de boletos */}
              {filteredTickets.length === 0 ? (
                <div className="bg-sepia-800/20 border border-dashed border-sepia-800 rounded-xl p-10 text-center text-sepia-600 text-sm">
                  {tickets.length === 0
                    ? 'Sin boletos registrados aún para esta conferencia.'
                    : 'Sin resultados para el filtro aplicado.'}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredTickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="bg-sepia-800/30 border border-sepia-800 rounded-xl overflow-hidden"
                    >
                      {/* Fila principal */}
                      <div className="flex items-center justify-between gap-3 p-4">
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="font-mono font-bold text-sepia-100 text-sm tracking-wider">
                              {ticket.folio}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColor(ticket.status)}`}>
                              {statusLabel(ticket.status)}
                            </span>
                          </div>
                          <p className="text-sepia-300 text-sm font-medium">{ticket.attendee_name}</p>
                          <p className="text-sepia-500 text-xs">{ticket.attendee_email}</p>
                          {ticket.attendee_phone && (
                            <p className="text-sepia-600 text-xs">{ticket.attendee_phone}</p>
                          )}
                          {/* Colaborador */}
                          {ticket.collaborator_name && (
                            <p className="text-sepia-500 text-xs flex items-center gap-1">
                              <span className="text-sepia-600">Registrado por:</span>
                              <span className="text-amber-500 font-medium">{ticket.collaborator_name}</span>
                              {ticket.collaborator_paid_at ? (
                                <span className="text-green-500 ml-1">· cobró ✓ {new Date(ticket.collaborator_paid_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                              ) : (
                                <span className="text-sepia-600 ml-1">· sin cobrar</span>
                              )}
                            </p>
                          )}
                          <p className="text-sepia-700 text-xs">
                            Registrado: {formatDate(ticket.created_at)}
                          </p>
                          {ticket.paid_at && (
                            <p className="text-green-600 text-xs">
                              Pagado el: {formatDate(ticket.paid_at)}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setExpandedTicket(expandedTicket === ticket.id ? null : ticket.id)}
                            className="text-sepia-500 hover:text-sepia-200 p-1.5 rounded-lg hover:bg-sepia-700 transition-all"
                            title="Ver acciones"
                          >
                            {expandedTicket === ticket.id
                              ? <ChevronUp className="w-4 h-4" />
                              : <ChevronDown className="w-4 h-4" />
                            }
                          </button>
                          <button
                            onClick={() => handleDeleteTicket(ticket.id)}
                            className="text-red-500 hover:text-red-300 p-1.5 rounded-lg hover:bg-red-900/20 transition-all"
                            title="Eliminar boleto"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Panel expandido — acciones */}
                      <AnimatePresence>
                        {expandedTicket === ticket.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-t border-sepia-700 overflow-hidden"
                          >
                            <div className="p-4 space-y-3 bg-sepia-900/40">
                              <div className="space-y-1">
                                <label className="text-xs text-sepia-500 uppercase tracking-widest">
                                  Notas de pago (opcional)
                                </label>
                                <input
                                  type="text"
                                  value={paymentNotes[ticket.id] || ''}
                                  onChange={(e) =>
                                    setPaymentNotes({ ...paymentNotes, [ticket.id]: e.target.value })
                                  }
                                  placeholder="Ej: Pagó por transferencia BBVA"
                                  className="w-full bg-sepia-800 border border-sepia-700 rounded-xl px-3 py-2 text-sepia-100 placeholder-sepia-600 outline-none focus:border-sepia-500 text-sm"
                                />
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {ticket.status !== 'paid' && (
                                  <button
                                    onClick={() => handleUpdateTicketStatus(ticket.id, 'paid')}
                                    disabled={updatingStatus === ticket.id}
                                    className="flex items-center gap-2 bg-green-800/50 hover:bg-green-700/60 border border-green-700 text-green-300 text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-xl transition-all disabled:opacity-50"
                                  >
                                    {updatingStatus === ticket.id
                                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                      : <CheckCircle2 className="w-3.5 h-3.5" />
                                    }
                                    Marcar Pagado
                                  </button>
                                )}
                                {ticket.status !== 'pending' && (
                                  <button
                                    onClick={() => handleUpdateTicketStatus(ticket.id, 'pending')}
                                    disabled={updatingStatus === ticket.id}
                                    className="flex items-center gap-2 bg-amber-900/30 hover:bg-amber-800/40 border border-amber-700 text-amber-400 text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-xl transition-all disabled:opacity-50"
                                  >
                                    {updatingStatus === ticket.id
                                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                      : <Clock className="w-3.5 h-3.5" />
                                    }
                                    Marcar Pendiente
                                  </button>
                                )}
                                {ticket.status !== 'cancelled' && (
                                  <button
                                    onClick={() => handleUpdateTicketStatus(ticket.id, 'cancelled')}
                                    disabled={updatingStatus === ticket.id}
                                    className="flex items-center gap-2 bg-red-900/30 hover:bg-red-800/40 border border-red-700 text-red-400 text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-xl transition-all disabled:opacity-50"
                                  >
                                    {updatingStatus === ticket.id
                                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                      : <XCircle className="w-3.5 h-3.5" />
                                    }
                                    Cancelar Boleto
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
            </>
          )}
        </div>
      </div>
    </div>
  );
};
