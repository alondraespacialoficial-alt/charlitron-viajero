import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar, MapPin, Users, Ticket, X, Send, CheckCircle2,
  AlertCircle, DollarSign, Clock, MessageCircle, Download,
  Search, UserCheck, Loader2, CheckSquare, ChevronRight, Award,
} from 'lucide-react';
import QRCode from 'qrcode';
import { Conference, ConferenceTicket } from '../types';
import { supabase } from '../supabase';
import { WHATSAPP_NUMBER } from '../constants';

type ActiveTab = 'events' | 'lookup' | 'collab';

export const ConferencesSection: React.FC = () => {
  // ── Core ──────────────────────────────────────────────────────────
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>('events');

  // ── Registration modal ────────────────────────────────────────────
  const [selectedConference, setSelectedConference] = useState<Conference | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState<ConferenceTicket | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState({
    attendee_name: '',
    attendee_email: '',
    attendee_phone: '',
    collaborator_code: '',
  });

  // ── Ticket lookup ─────────────────────────────────────────────────
  const [lookupFolio, setLookupFolio] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupTicket, setLookupTicket] = useState<ConferenceTicket | null>(null);
  const [lookupConference, setLookupConference] = useState<Conference | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isGeneratingCertificate, setIsGeneratingCertificate] = useState(false);

  // ── Collaborator portal ───────────────────────────────────────────
  const [collabCode, setCollabCode] = useState('');
  const [collabLoading, setCollabLoading] = useState(false);
  const [collabData, setCollabData] = useState<{ id: string; name: string; code: string } | null>(null);
  const [collabTickets, setCollabTickets] = useState<ConferenceTicket[]>([]);
  const [collabConferences, setCollabConferences] = useState<Record<string, Conference>>({});
  const [collabError, setCollabError] = useState<string | null>(null);
  const [collabMarkingPaid, setCollabMarkingPaid] = useState<string | null>(null);

  useEffect(() => { fetchConferences(); }, []);

  const fetchConferences = async () => {
    try {
      const { data, error } = await supabase
        .from('conferences')
        .select('*')
        .eq('is_active', true)
        .order('event_date', { ascending: true });
      if (error) throw error;
      if (data) setConferences(data);
    } catch (err) {
      console.error('Error fetching conferences:', err);
    }
  };

  // ── Registration ──────────────────────────────────────────────────
  const handleOpenForm = (conference: Conference) => {
    setSelectedConference(conference);
    setShowForm(true);
    setSubmittedTicket(null);
    setFormError(null);
    setForm({ attendee_name: '', attendee_email: '', attendee_phone: '', collaborator_code: '' });
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setSelectedConference(null);
    setSubmittedTicket(null);
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConference) return;

    if (!form.attendee_name.trim()) {
      setFormError('El nombre completo es obligatorio.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      let collaboratorId: string | null = null;
      let collaboratorName: string | null = null;
      const codeInput = form.collaborator_code.trim().toUpperCase();

      if (codeInput) {
        const { data: collabs, error: collabErr } = await supabase
          .from('collaborators')
          .select('id, name')
          .eq('code', codeInput)
          .eq('is_active', true)
          .limit(1);
        if (collabErr) throw collabErr;
        if (!collabs || collabs.length === 0) {
          setFormError('Código de colaborador no válido o inactivo. Déjalo vacío si no aplica.');
          setIsSubmitting(false);
          return;
        }
        collaboratorId = collabs[0].id;
        collaboratorName = collabs[0].name;
      }

      const { data, error } = await supabase
        .from('conference_tickets')
        .insert([{
          conference_id: selectedConference.id,
          folio: '',
          attendee_name: form.attendee_name.trim(),
          attendee_email: form.attendee_email.trim().toLowerCase() || 'sin-correo@reserva.local',
          attendee_phone: form.attendee_phone.trim() || null,
          status: 'pending',
          collaborator_id: collaboratorId,
          collaborator_name: collaboratorName,
          registered_by: collaboratorId ? 'collaborator' : 'client',
        }])
        .select()
        .single();

      if (error) throw error;
      setSubmittedTicket(data);
    } catch (err: any) {
      console.error('Error registering ticket:', err);
      setFormError('Ocurrió un error al registrar tu boleto. Intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── WhatsApp link ─────────────────────────────────────────────────
  const buildWhatsAppLink = (ticket: ConferenceTicket, conference: Conference) => {
    const msg = encodeURIComponent(
      `Hola, me registré para "${conference.title}". Mi folio es ${ticket.folio} y mi nombre es ${ticket.attendee_name}. Quiero confirmar mi pago.`
    );
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`;
  };

  // ── Ticket Lookup ─────────────────────────────────────────────────
  const handleLookupTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    const folio = lookupFolio.trim().toUpperCase();
    if (!folio) return;
    setLookupLoading(true);
    setLookupTicket(null);
    setLookupConference(null);
    setLookupError(null);

    try {
      const { data: ticketData, error: ticketErr } = await supabase
        .from('conference_tickets')
        .select('*')
        .eq('folio', folio)
        .single();

      if (ticketErr || !ticketData) {
        setLookupError('No se encontró un boleto con ese folio. Verifica que esté escrito correctamente.');
        return;
      }

      const { data: confData, error: confErr } = await supabase
        .from('conferences')
        .select('*')
        .eq('id', ticketData.conference_id)
        .single();

      if (confErr || !confData) {
        setLookupError('Error al obtener los datos del evento.');
        return;
      }

      setLookupTicket(ticketData);
      setLookupConference(confData);
    } catch (err) {
      setLookupError('Error al buscar el boleto. Intenta de nuevo.');
    } finally {
      setLookupLoading(false);
    }
  };

  // ── PDF Generation ────────────────────────────────────────────────
  const handleDownloadPDF = async (ticket: ConferenceTicket, conference: Conference) => {
    setIsGeneratingPDF(true);
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [148, 105] });

      doc.setFillColor(20, 16, 12);
      doc.rect(0, 0, 148, 105, 'F');
      doc.setFillColor(120, 90, 50);
      doc.rect(0, 0, 7, 105, 'F');
      doc.rect(141, 0, 7, 105, 'F');
      doc.setDrawColor(120, 90, 50);
      doc.setLineWidth(0.4);
      doc.line(9, 7, 139, 7);
      doc.line(9, 98, 139, 98);

      doc.setFontSize(22);
      doc.setTextColor(50, 180, 90);
      doc.setFont('helvetica', 'bold');
      doc.text('PAGADO', 74, 19, { align: 'center' });

      doc.setFontSize(7);
      doc.setTextColor(140, 110, 70);
      doc.text('CHARLITRON(R) VIAJERO DEL TIEMPO', 74, 26, { align: 'center' });

      doc.setDrawColor(70, 55, 35);
      doc.setLineWidth(0.3);
      doc.line(13, 29, 135, 29);

      doc.setFontSize(13);
      doc.setTextColor(240, 228, 210);
      doc.setFont('helvetica', 'bold');
      const titleLines = doc.splitTextToSize(conference.title.toUpperCase(), 110) as string[];
      doc.text(titleLines, 74, 37, { align: 'center' });

      let y = 37 + titleLines.length * 6;

      doc.setFontSize(8);
      doc.setTextColor(160, 138, 108);
      doc.setFont('helvetica', 'normal');
      if (conference.event_date) {
        const dateStr = new Date(conference.event_date).toLocaleDateString('es-MX', {
          weekday: 'long', year: 'numeric', month: 'long',
          day: 'numeric', hour: '2-digit', minute: '2-digit',
        });
        doc.text(dateStr, 74, y + 5, { align: 'center' });
        y += 9;
      }
      if (conference.location) {
        doc.text(`Lugar: ${conference.location}`, 74, y + 5, { align: 'center' });
        y += 9;
      }

      doc.setDrawColor(70, 55, 35);
      doc.line(13, y + 6, 135, y + 6);
      y += 10;

      doc.setFontSize(8);
      doc.setTextColor(180, 165, 140);
      doc.setFont('helvetica', 'normal');
      doc.text('ASISTENTE', 18, y + 4);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(240, 228, 210);
      doc.text(ticket.attendee_name, 18, y + 11);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(180, 165, 140);
      doc.text('FOLIO', 92, y + 4);
      doc.setFont('courier', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(220, 178, 100);
      doc.text(ticket.folio, 92, y + 12);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(90, 72, 50);
      const fechaGen = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
      doc.text(`Boleto generado el ${fechaGen}  -  charlitronviajero.com`, 74, 94, { align: 'center' });

      doc.save(`boleto-${ticket.folio}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // ── Certificate PDF ───────────────────────────────────────────────
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

  const handleDownloadCertificate = async (ticket: ConferenceTicket, conference: Conference) => {
    setIsGeneratingCertificate(true);
    try {
      const { jsPDF } = await import('jspdf');
      // A4 landscape: 297 x 210 mm
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const W = 297, H = 210, cx = W / 2;

      // ── Fondo oscuro sepia
      doc.setFillColor(20, 16, 12);
      doc.rect(0, 0, W, H, 'F');

      // ── Imagen de fondo difuminada (si existe)
      if (conference.certificate_bg_url) {
        const bgData = await loadImage(conference.certificate_bg_url);
        if (bgData) {
          // Calcular dimensiones para cubrir toda la página manteniendo aspecto
          const aspect = bgData.w / bgData.h;
          let bW = W, bH = W / aspect;
          if (bH < H) { bH = H; bW = H * aspect; }
          const bX = (W - bW) / 2;
          const bY = (H - bH) / 2;
          // Dibujar con opacidad baja para que no tape el texto
          doc.saveGraphicsState();
          (doc as any).setGState((doc as any).GState({ opacity: 0.13 }));
          doc.addImage(bgData.base64, 'PNG', bX, bY, bW, bH);
          doc.restoreGraphicsState();
        }
      }

      // ── Barras laterales doradas
      doc.setFillColor(110, 82, 45);
      doc.rect(0, 0, 7, H, 'F');
      doc.rect(W - 7, 0, 7, H, 'F');

      // ── Barras superior e inferior
      doc.setFillColor(90, 67, 35);
      doc.rect(0, 0, W, 5, 'F');
      doc.rect(0, H - 5, W, 5, 'F');

      // ── Borde interior rectangular
      doc.setDrawColor(100, 75, 40);
      doc.setLineWidth(0.4);
      doc.rect(10, 7, W - 20, H - 14);

      // ── Ornamentos en esquinas
      doc.setFillColor(130, 98, 52);
      [[10, 7], [W - 13, 7], [10, H - 10], [W - 13, H - 10]].forEach(([x, y]) => {
        doc.rect(x, y, 3, 3, 'F');
      });

      let y = 13;

      // ── Logo (si existe)
      if (conference.logo_url) {
        const imgData = await loadImage(conference.logo_url);
        if (imgData) {
          const maxH = 22, maxW = 80;
          const aspect = imgData.w / imgData.h;
          let iH = maxH, iW = iH * aspect;
          if (iW > maxW) { iW = maxW; iH = iW / aspect; }
          doc.addImage(imgData.base64, 'PNG', cx - iW / 2, y, iW, iH);
          y += iH + 3;
        }
      }

      // ── Nombre del sitio
      doc.setFontSize(7.5);
      doc.setTextColor(120, 92, 52);
      doc.setFont('helvetica', 'bold');
      doc.text('CHARLITRON VIAJERO DEL TIEMPO', cx, y + 4.5, { align: 'center', charSpace: 1.5 });
      y += 9;

      // ── Línea divisoria
      doc.setDrawColor(75, 56, 30);
      doc.setLineWidth(0.3);
      doc.line(30, y, W - 30, y);
      y += 8;

      // ── Título RECONOCIMIENTO
      doc.setFontSize(23);
      doc.setTextColor(225, 210, 180);
      doc.setFont('helvetica', 'bold');
      doc.text('RECONOCIMIENTO DE PARTICIPACIÓN', cx, y + 8, { align: 'center' });
      y += 14;

      // ── Línea dorada gruesa
      doc.setDrawColor(155, 118, 58);
      doc.setLineWidth(0.6);
      doc.line(50, y, W - 50, y);
      y += 10;

      // ── "Se otorga a:"
      doc.setFontSize(9.5);
      doc.setTextColor(145, 125, 95);
      doc.setFont('helvetica', 'italic');
      doc.text('Se otorga el presente reconocimiento a:', cx, y, { align: 'center' });
      y += 11;

      // ── Nombre del asistente (grande, dorado)
      doc.setFontSize(22);
      doc.setTextColor(208, 165, 88);
      doc.setFont('helvetica', 'bold');
      const nameLines = doc.splitTextToSize(ticket.attendee_name.toUpperCase(), W - 100) as string[];
      doc.text(nameLines, cx, y, { align: 'center' });
      y += nameLines.length * 9;

      // ── Línea bajo el nombre
      const nameLineW = Math.min(doc.getTextWidth(nameLines[0]) + 24, W - 80);
      doc.setDrawColor(155, 118, 58);
      doc.setLineWidth(0.5);
      doc.line(cx - nameLineW / 2, y, cx + nameLineW / 2, y);
      y += 9;

      // ── "Por su participación..."
      doc.setFontSize(9);
      doc.setTextColor(145, 125, 95);
      doc.setFont('helvetica', 'italic');
      doc.text('Por su participación en la conferencia:', cx, y, { align: 'center' });
      y += 10;

      // ── Título de la conferencia
      doc.setFontSize(14);
      doc.setTextColor(230, 215, 190);
      doc.setFont('helvetica', 'bold');
      const titleLines = doc.splitTextToSize(`"${conference.title}"`, W - 90) as string[];
      doc.text(titleLines, cx, y, { align: 'center' });
      y += titleLines.length * 7 + 5;

      // ── Ponentes
      const s1 = conference.speaker_name;
      const s2 = conference.speaker_name_2;
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(155, 135, 105);
      if (s1 && s2) {
        doc.text(`Ponente Principal: ${s1}   ·   ${s2}`, cx, y, { align: 'center' });
        y += 7;
      } else if (s1) {
        doc.text(`Ponente Principal: ${s1}`, cx, y, { align: 'center' });
        y += 7;
      } else {
        doc.text('Charlitron Viajero del Tiempo', cx, y, { align: 'center' });
        y += 7;
      }

      // ── Fecha y lugar
      doc.setFontSize(8);
      doc.setTextColor(110, 90, 65);
      const infoParts: string[] = [];
      if (conference.event_date) {
        infoParts.push(new Date(conference.event_date).toLocaleDateString('es-MX', {
          weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        }));
      }
      if (conference.location) infoParts.push(conference.location);
      if (infoParts.length > 0) {
        doc.text(infoParts.join('   ·   '), cx, y, { align: 'center' });
        y += 7;
      }

      // ── Duración en horas
      if (conference.duration_hours && conference.duration_hours > 0) {
        doc.setFontSize(8);
        doc.setTextColor(130, 105, 75);
        doc.setFont('helvetica', 'italic');
        doc.text(`Duración: ${conference.duration_hours} hora${conference.duration_hours !== 1 ? 's' : ''}`, cx, y, { align: 'center' });
        y += 7;
      }

      // ── Sección inferior (firma + QR) — posiciones absolutas
      const footerY = H - 20;   // 190
      const sigBlockY = 158;    // tope de firma y QR

      // ── Firma digital
      if (conference.signature_url) {
        const sigData = await loadImage(conference.signature_url);
        if (sigData) {
          const maxSigW = 65, maxSigH = 24;
          const sigAspect = sigData.w / sigData.h;
          let sW = maxSigW, sH = sW / sigAspect;
          if (sH > maxSigH) { sH = maxSigH; sW = sH * sigAspect; }
          // Dibujar con opacidad natural (firma con fondo transparente)
          doc.saveGraphicsState();
          (doc as any).setGState((doc as any).GState({ opacity: 0.72 }));
          doc.addImage(sigData.base64, 'PNG', 18 + (65 - sW) / 2, sigBlockY, sW, sH);
          doc.restoreGraphicsState();
        }
        // Línea de firma
        doc.setDrawColor(100, 77, 44);
        doc.setLineWidth(0.4);
        doc.line(14, footerY - 6, 84, footerY - 6);
        // Etiqueta
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(120, 95, 58);
        doc.text('Firma y Sello Autorizado', 49, footerY - 1, { align: 'center' });
      }

      // ── Código QR de verificación
      const qrUrl = `https://charlitronviajerodeltiempo.com/?folio=${ticket.folio}`;
      const qrDataUrl = await QRCode.toDataURL(qrUrl, {
        width: 200,
        margin: 1,
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
      doc.text(ticket.folio, W - 26, footerY - 3, { align: 'center' });

      // ── Leyenda de membresía / federación
      if (conference.federation_legend?.trim()) {
        const legendLines = doc.splitTextToSize(conference.federation_legend.trim(), 160) as string[];
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(105, 82, 52);
        const legendY = footerY - 6 - legendLines.length * 4;
        doc.text(legendLines, cx, legendY, { align: 'center' });
      }

      // ── Pie de página
      doc.setDrawColor(65, 50, 28);
      doc.setLineWidth(0.3);
      doc.line(12, footerY, W - 12, footerY);

      doc.setFontSize(7);
      doc.setFont('courier', 'bold');
      doc.setTextColor(140, 110, 68);
      doc.text(`Folio: ${ticket.folio}`, 14, footerY + 6);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(85, 66, 42);
      const fechaGen = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });
      doc.text(`Emitido el ${fechaGen}`, 14, footerY + 11);

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(105, 80, 48);
      doc.text('charlitronviajerodeltiempo.com', cx, footerY + 8.5, { align: 'center' });

      doc.save(`reconocimiento-${ticket.folio}.pdf`);
    } catch (err) {
      console.error('Error generating certificate:', err);
    } finally {
      setIsGeneratingCertificate(false);
    }
  };

  // ── Collaborator Login ────────────────────────────────────────────
  const handleCollabLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = collabCode.trim().toUpperCase();
    if (!code) return;
    setCollabLoading(true);
    setCollabData(null);
    setCollabTickets([]);
    setCollabConferences({});
    setCollabError(null);

    try {
      const { data: collabs, error: collabErr } = await supabase
        .from('collaborators')
        .select('id, name, code')
        .eq('code', code)
        .eq('is_active', true)
        .limit(1);

      if (collabErr) throw collabErr;
      if (!collabs || collabs.length === 0) {
        setCollabError('Código no válido o inactivo. Contacta al administrador.');
        return;
      }

      const collab = collabs[0];
      setCollabData(collab);

      const { data: ticketsData, error: ticketsErr } = await supabase
        .from('conference_tickets')
        .select('*')
        .eq('collaborator_id', collab.id)
        .order('created_at', { ascending: false });

      if (ticketsErr) throw ticketsErr;
      setCollabTickets(ticketsData || []);

      const confIds = [...new Set((ticketsData || []).map((t) => t.conference_id))];
      if (confIds.length > 0) {
        const { data: confsData } = await supabase
          .from('conferences')
          .select('*')
          .in('id', confIds);
        if (confsData) {
          const confMap: Record<string, Conference> = {};
          confsData.forEach((c) => { confMap[c.id] = c; });
          setCollabConferences(confMap);
        }
      }
    } catch (err) {
      console.error('Collab login error:', err);
      setCollabError('Error al conectar. Intenta de nuevo.');
    } finally {
      setCollabLoading(false);
    }
  };

  const handleCollabMarkPaid = async (ticketId: string, alreadyPaid: boolean) => {
    setCollabMarkingPaid(ticketId);
    try {
      const { error } = await supabase
        .from('conference_tickets')
        .update({ collaborator_paid_at: alreadyPaid ? null : new Date().toISOString() })
        .eq('id', ticketId);
      if (error) throw error;
      setCollabTickets((prev) =>
        prev.map((t) =>
          t.id === ticketId
            ? { ...t, collaborator_paid_at: alreadyPaid ? undefined : new Date().toISOString() }
            : t
        )
      );
    } catch (err) {
      console.error('Error updating collaborator_paid_at:', err);
    } finally {
      setCollabMarkingPaid(null);
    }
  };

  // ── Helpers ───────────────────────────────────────────────────────
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('es-MX', {
      weekday: 'long', year: 'numeric', month: 'long',
      day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  const formatDateShort = (dateStr?: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('es-MX', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const formatPrice = (price: number) => {
    if (price === 0) return 'Entrada libre';
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(price);
  };

  // ── Render ────────────────────────────────────────────────────────
  return (
    <section className="py-24 px-6 bg-sepia-950">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="text-center mb-12 space-y-4">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Ticket className="text-sepia-500 w-6 h-6" />
            <span className="text-sepia-500 uppercase tracking-widest text-xs font-bold">
              Eventos y Conferencias
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl font-serif text-sepia-100">Próximos Eventos</h2>
        </div>

        {/* Tabs */}
        <div className="flex justify-center mb-12">
          <div className="flex bg-sepia-900/60 border border-sepia-800 rounded-2xl p-1 gap-1 flex-wrap justify-center">
            {([
              { key: 'events', label: 'Eventos',     Icon: Ticket },
              { key: 'lookup', label: 'Mi Boleto',   Icon: Search },
              { key: 'collab', label: 'Colaborador', Icon: UserCheck },
            ] as { key: ActiveTab; label: string; Icon: React.ElementType }[]).map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold uppercase tracking-widest transition-all ${
                  activeTab === key
                    ? 'bg-sepia-500 text-sepia-950'
                    : 'text-sepia-500 hover:text-sepia-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ══ TAB: Eventos ══════════════════════════════════════════════ */}
        {activeTab === 'events' && (
          <>
            {conferences.length === 0 ? (
              <div className="text-center space-y-4 py-16">
                <Ticket className="w-12 h-12 text-sepia-700 mx-auto" />
                <h3 className="text-2xl font-serif text-sepia-300">Sin conferencias por el momento</h3>
                <p className="text-sepia-500">Pronto habrá nuevos eventos. ¡Estate al pendiente!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {conferences.map((conf) => (
                  <motion.div
                    key={conf.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ y: -4 }}
                    className="bg-sepia-900/50 border border-sepia-800 rounded-2xl overflow-hidden group"
                  >
                    {conf.banner_url ? (
                      <div className="w-full overflow-hidden bg-sepia-900 rounded-t-2xl">
                        <img
                          src={conf.banner_url}
                          alt={conf.title}
                          className="w-full h-auto max-h-[28rem] object-contain group-hover:scale-105 transition-transform duration-500 pointer-events-none select-none"
                          onContextMenu={(e) => e.preventDefault()}
                          onDragStart={(e) => e.preventDefault()}
                        />
                      </div>
                    ) : (
                      <div className="aspect-video bg-sepia-800/50 flex items-center justify-center">
                        <Ticket className="w-12 h-12 text-sepia-700" />
                      </div>
                    )}
                    <div className="p-6 space-y-4">
                      <h3 className="text-xl font-serif text-sepia-100 line-clamp-2">{conf.title}</h3>
                      {conf.description && (
                        <p className="text-sepia-400 text-sm line-clamp-3">{conf.description}</p>
                      )}
                      <div className="space-y-2 text-sm">
                        {conf.event_date && (
                          <div className="flex items-center gap-2 text-sepia-400">
                            <Calendar className="w-4 h-4 flex-shrink-0 text-sepia-500" />
                            <span>{formatDate(conf.event_date)}</span>
                          </div>
                        )}
                        {conf.location && (
                          <div className="flex items-center gap-2 text-sepia-400">
                            <MapPin className="w-4 h-4 flex-shrink-0 text-sepia-500" />
                            <span>{conf.location}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-sepia-400">
                          <Users className="w-4 h-4 flex-shrink-0 text-sepia-500" />
                          <span>Cupo limitado: {conf.capacity} lugares</span>
                        </div>
                        <div className="flex items-center gap-2 font-bold">
                          <DollarSign className="w-4 h-4 flex-shrink-0 text-sepia-500" />
                          <span className={conf.price === 0 ? 'text-green-400' : 'text-sepia-200'}>
                            {formatPrice(conf.price)}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleOpenForm(conf)}
                        className="w-full mt-4 bg-sepia-500 hover:bg-sepia-400 text-sepia-950 font-bold uppercase tracking-widest text-sm py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                      >
                        <Ticket className="w-4 h-4" />
                        Reservar Boleto
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ══ TAB: Mi Boleto ════════════════════════════════════════════ */}
        {activeTab === 'lookup' && (
          <div className="max-w-lg mx-auto space-y-8">
            <div className="text-center space-y-2">
              <Search className="w-10 h-10 text-sepia-500 mx-auto" />
              <h3 className="text-2xl font-serif text-sepia-100">Consulta tu boleto</h3>
              <p className="text-sepia-400 text-sm">
                Ingresa tu folio para ver el estado. Cuando esté pagado podrás descargar tu boleto en PDF.
              </p>
            </div>

            <form onSubmit={handleLookupTicket} className="flex gap-3">
              <input
                type="text"
                value={lookupFolio}
                onChange={(e) => setLookupFolio(e.target.value.toUpperCase())}
                placeholder="CHARLI-2026-0001"
                className="flex-1 bg-sepia-900 border border-sepia-700 rounded-xl px-4 py-3 text-sepia-100 placeholder-sepia-600 outline-none focus:border-sepia-500 font-mono text-sm"
              />
              <button
                type="submit"
                disabled={lookupLoading || !lookupFolio.trim()}
                className="bg-sepia-500 hover:bg-sepia-400 disabled:opacity-50 text-sepia-950 font-bold px-5 py-3 rounded-xl transition-all flex items-center gap-2"
              >
                {lookupLoading
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Search className="w-4 h-4" />
                }
              </button>
            </form>

            {lookupError && (
              <div className="flex items-center gap-2 bg-red-900/30 border border-red-700 rounded-xl p-4 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {lookupError}
              </div>
            )}

            <AnimatePresence>
              {lookupTicket && lookupConference && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-sepia-900/60 border border-sepia-700 rounded-2xl overflow-hidden"
                >
                  <div className="bg-sepia-800/60 px-6 py-4 border-b border-sepia-700">
                    <h4 className="text-sepia-100 font-serif text-lg">{lookupConference.title}</h4>
                    {lookupConference.event_date && (
                      <p className="text-sepia-400 text-xs mt-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(lookupConference.event_date)}
                      </p>
                    )}
                    {lookupConference.location && (
                      <p className="text-sepia-500 text-xs mt-0.5 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {lookupConference.location}
                      </p>
                    )}
                  </div>

                  <div className="p-6 space-y-4">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div>
                        <p className="text-sepia-500 text-xs uppercase tracking-widest">Folio</p>
                        <p className="font-mono font-bold text-sepia-100 text-xl tracking-wider mt-1">
                          {lookupTicket.folio}
                        </p>
                      </div>
                      <div>
                        <p className="text-sepia-500 text-xs uppercase tracking-widest">Asistente</p>
                        <p className="text-sepia-200 font-medium mt-1">{lookupTicket.attendee_name}</p>
                      </div>
                    </div>

                    {lookupTicket.status === 'paid' ? (
                      <div className="flex items-center gap-3 bg-green-900/30 border border-green-700 rounded-xl p-4">
                        <CheckCircle2 className="w-6 h-6 text-green-400 flex-shrink-0" />
                        <div>
                          <p className="text-green-300 font-bold">¡Pago confirmado!</p>
                          {lookupTicket.paid_at && (
                            <p className="text-green-600 text-xs mt-0.5">
                              Confirmado el {formatDateShort(lookupTicket.paid_at)}
                            </p>
                          )}
                        </div>
                      </div>
                    ) : lookupTicket.status === 'cancelled' ? (
                      <div className="flex items-center gap-3 bg-red-900/30 border border-red-700 rounded-xl p-4">
                        <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0" />
                        <div>
                          <p className="text-red-300 font-bold">Boleto cancelado</p>
                          <p className="text-red-600 text-xs mt-0.5">
                            Contacta al administrador para más información.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 bg-amber-900/30 border border-amber-700 rounded-xl p-4">
                          <Clock className="w-6 h-6 text-amber-400 flex-shrink-0" />
                          <div>
                            <p className="text-amber-300 font-bold">Pago pendiente</p>
                            <p className="text-amber-600 text-xs mt-0.5">
                              Tu registro está guardado. Realiza tu pago para confirmar el boleto.
                            </p>
                          </div>
                        </div>
                        {lookupConference.price > 0 && (
                          <a
                            href={buildWhatsAppLink(lookupTicket, lookupConference)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 w-full bg-green-700/40 hover:bg-green-700/60 border border-green-600 text-green-300 font-bold uppercase tracking-widest text-sm py-3 rounded-xl transition-all"
                          >
                            <MessageCircle className="w-4 h-4" />
                            Enviar comprobante por WhatsApp
                          </a>
                        )}
                      </div>
                    )}

                    {lookupTicket.status === 'paid' && (
                      <button
                        onClick={() => handleDownloadPDF(lookupTicket, lookupConference)}
                        disabled={isGeneratingPDF}
                        className="flex items-center justify-center gap-2 w-full bg-sepia-600 hover:bg-sepia-500 disabled:opacity-50 text-sepia-100 font-bold uppercase tracking-widest text-sm py-3 rounded-xl transition-all"
                      >
                        {isGeneratingPDF
                          ? <><Loader2 className="w-4 h-4 animate-spin" /> Generando PDF...</>
                          : <><Download className="w-4 h-4" /> Descargar Boleto PDF</>
                        }
                      </button>
                    )}

                    {lookupTicket.status === 'paid' && (
                      <button
                        onClick={() => handleDownloadCertificate(lookupTicket, lookupConference)}
                        disabled={isGeneratingCertificate}
                        className="flex items-center justify-center gap-2 w-full bg-amber-900/40 hover:bg-amber-800/50 disabled:opacity-50 border border-amber-700/60 text-amber-300 font-bold uppercase tracking-widest text-sm py-3 rounded-xl transition-all"
                      >
                        {isGeneratingCertificate
                          ? <><Loader2 className="w-4 h-4 animate-spin" /> Generando reconocimiento...</>
                          : <><Award className="w-4 h-4" /> Descargar Reconocimiento PDF</>
                        }
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ══ TAB: Colaborador ══════════════════════════════════════════ */}
        {activeTab === 'collab' && (
          <div className="max-w-2xl mx-auto space-y-8">
            {!collabData ? (
              <>
                <div className="text-center space-y-2">
                  <UserCheck className="w-10 h-10 text-sepia-500 mx-auto" />
                  <h3 className="text-2xl font-serif text-sepia-100">Portal Colaborador</h3>
                  <p className="text-sepia-400 text-sm">
                    Ingresa tu código para ver los boletos que registraste y marcar los pagos recibidos.
                  </p>
                </div>
                <form onSubmit={handleCollabLogin} className="flex gap-3">
                  <input
                    type="text"
                    value={collabCode}
                    onChange={(e) => setCollabCode(e.target.value.toUpperCase())}
                    placeholder="Tu código de colaborador"
                    className="flex-1 bg-sepia-900 border border-sepia-700 rounded-xl px-4 py-3 text-sepia-100 placeholder-sepia-600 outline-none focus:border-sepia-500 uppercase font-mono"
                  />
                  <button
                    type="submit"
                    disabled={collabLoading || !collabCode.trim()}
                    className="bg-sepia-500 hover:bg-sepia-400 disabled:opacity-50 text-sepia-950 font-bold px-5 py-3 rounded-xl transition-all flex items-center gap-2"
                  >
                    {collabLoading
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <ChevronRight className="w-4 h-4" />
                    }
                  </button>
                </form>
                {collabError && (
                  <div className="flex items-center gap-2 bg-red-900/30 border border-red-700 rounded-xl p-4 text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {collabError}
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <p className="text-sepia-400 text-xs uppercase tracking-widest">Bienvenido</p>
                    <h3 className="text-sepia-100 font-serif text-xl">{collabData.name}</h3>
                    <p className="text-sepia-600 text-xs font-mono mt-0.5">{collabData.code}</p>
                  </div>
                  <button
                    onClick={() => { setCollabData(null); setCollabCode(''); setCollabTickets([]); setCollabConferences({}); }}
                    className="flex items-center gap-1.5 text-sepia-500 hover:text-sepia-200 border border-sepia-700 rounded-xl px-3 py-2 text-xs uppercase tracking-widest transition-all"
                  >
                    <X className="w-3.5 h-3.5" /> Salir
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="bg-sepia-900/60 border border-sepia-800 rounded-xl p-4">
                    <p className="text-2xl font-bold text-sepia-100">{collabTickets.length}</p>
                    <p className="text-sepia-500 text-xs uppercase tracking-widest mt-1">Total</p>
                  </div>
                  <div className="bg-sepia-900/60 border border-sepia-800 rounded-xl p-4">
                    <p className="text-2xl font-bold text-green-400">
                      {collabTickets.filter((t) => t.collaborator_paid_at).length}
                    </p>
                    <p className="text-sepia-500 text-xs uppercase tracking-widest mt-1">Cobrados</p>
                  </div>
                  <div className="bg-sepia-900/60 border border-sepia-800 rounded-xl p-4">
                    <p className="text-2xl font-bold text-amber-400">
                      {collabTickets.filter((t) => !t.collaborator_paid_at).length}
                    </p>
                    <p className="text-sepia-500 text-xs uppercase tracking-widest mt-1">Pendientes</p>
                  </div>
                </div>

                {collabTickets.length === 0 ? (
                  <div className="bg-sepia-800/20 border border-dashed border-sepia-800 rounded-xl p-10 text-center text-sepia-600 text-sm">
                    No tienes boletos registrados aún.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {collabTickets.map((ticket) => {
                      const conf = collabConferences[ticket.conference_id];
                      const alreadyPaid = !!ticket.collaborator_paid_at;
                      return (
                        <div
                          key={ticket.id}
                          className={`border rounded-xl p-4 space-y-3 transition-all ${
                            alreadyPaid ? 'border-green-800 bg-green-900/10' : 'border-sepia-800 bg-sepia-900/40'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div className="space-y-1">
                              <p className="font-mono font-bold text-sepia-100 tracking-wider">{ticket.folio}</p>
                              <p className="text-sepia-200 font-medium text-sm">{ticket.attendee_name}</p>
                              {conf && <p className="text-sepia-500 text-xs line-clamp-1">{conf.title}</p>}
                              <p className="text-sepia-700 text-xs">Registrado: {formatDateShort(ticket.created_at)}</p>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                ticket.status === 'paid' ? 'text-green-400 border-green-700 bg-green-900/30'
                                : ticket.status === 'cancelled' ? 'text-red-400 border-red-700 bg-red-900/30'
                                : 'text-amber-400 border-amber-700 bg-amber-900/30'
                              }`}>
                                {ticket.status === 'paid' ? 'Confirmado al admin' : ticket.status === 'cancelled' ? 'Cancelado' : 'Sin confirmar al admin'}
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                alreadyPaid ? 'text-green-300 border-green-600 bg-green-900/20' : 'text-sepia-400 border-sepia-700 bg-sepia-900'
                              }`}>
                                {alreadyPaid ? 'Cobrado por ti' : 'Sin cobrar'}
                              </span>
                            </div>
                          </div>
                          {alreadyPaid && ticket.collaborator_paid_at && (
                            <p className="text-green-700 text-xs">Marcado cobrado el {formatDateShort(ticket.collaborator_paid_at)}</p>
                          )}
                          <button
                            onClick={() => handleCollabMarkPaid(ticket.id, alreadyPaid)}
                            disabled={collabMarkingPaid === ticket.id}
                            className={`w-full flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest py-2.5 rounded-xl transition-all border disabled:opacity-50 ${
                              alreadyPaid
                                ? 'border-sepia-700 text-sepia-500 hover:text-sepia-200 hover:border-sepia-500'
                                : 'border-green-700 bg-green-900/30 text-green-300 hover:bg-green-800/40'
                            }`}
                          >
                            {collabMarkingPaid === ticket.id
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : alreadyPaid ? 'Desmarcar cobro'
                              : <><CheckSquare className="w-3.5 h-3.5" /> Marcar que ya cobré</>
                            }
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </div>

      {/* ══ Modal Registro ════════════════════════════════════════════ */}
      <AnimatePresence>
        {showForm && selectedConference && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={(e) => { if (e.target === e.currentTarget) handleCloseForm(); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-sepia-900 border border-sepia-700 rounded-2xl w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between p-6 border-b border-sepia-800 sticky top-0 bg-sepia-900 z-10">
                <div>
                  <h3 className="text-lg font-serif text-sepia-100">Reservar Boleto</h3>
                  <p className="text-sepia-500 text-sm mt-1 line-clamp-1">{selectedConference.title}</p>
                </div>
                <button onClick={handleCloseForm} className="text-sepia-500 hover:text-sepia-200 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6">
                {submittedTicket ? (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-6">
                    <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto" />
                    <div className="space-y-2">
                      <h4 className="text-xl font-serif text-sepia-100">¡Registro exitoso!</h4>
                      <p className="text-sepia-400 text-sm">Tu lugar ha sido reservado. Guarda tu folio.</p>
                    </div>

                    <div className="bg-sepia-800/60 border border-sepia-600 rounded-xl p-5 space-y-2">
                      <p className="text-sepia-400 text-xs uppercase tracking-widest">Tu folio</p>
                      <p className="text-3xl font-mono font-bold text-sepia-100 tracking-wider">{submittedTicket.folio}</p>
                      <div className="flex items-center justify-center gap-2 text-amber-400 text-sm">
                        <Clock className="w-4 h-4" />
                        <span>Pendiente de pago</span>
                      </div>
                    </div>

                    {selectedConference.price > 0 && (
                      <div className="space-y-3">
                        <p className="text-sepia-400 text-sm">Para confirmar tu lugar, realiza el pago y envía tu comprobante:</p>
                        <a
                          href={buildWhatsAppLink(submittedTicket, selectedConference)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 w-full bg-green-700/40 hover:bg-green-700/60 border border-green-600 text-green-300 font-bold uppercase tracking-widest text-sm py-3 rounded-xl transition-all"
                        >
                          <MessageCircle className="w-4 h-4" />
                          Avisar pago por WhatsApp
                        </a>
                      </div>
                    )}

                    <div className="bg-sepia-800/40 border border-sepia-700 rounded-xl p-4 text-xs text-sepia-500 space-y-1 text-left">
                      <p className="font-bold text-sepia-400">¿Ya pagaste? Descarga tu boleto:</p>
                      <p>
                        Regresa aquí → pestaña <strong>"Mi Boleto"</strong> → ingresa tu folio{' '}
                        <strong className="font-mono text-sepia-300">{submittedTicket.folio}</strong>
                        {' '}→ descarga el PDF cuando el admin confirme tu pago.
                      </p>
                    </div>

                    {submittedTicket.status === 'paid' && (
                      <button
                        onClick={() => handleDownloadCertificate(submittedTicket, selectedConference)}
                        disabled={isGeneratingCertificate}
                        className="flex items-center justify-center gap-2 w-full bg-amber-900/40 hover:bg-amber-800/50 disabled:opacity-50 border border-amber-700/60 text-amber-300 font-bold uppercase tracking-widest text-sm py-3 rounded-xl transition-all"
                      >
                        {isGeneratingCertificate
                          ? <><Loader2 className="w-4 h-4 animate-spin" /> Generando reconocimiento...</>
                          : <><Award className="w-4 h-4" /> Descargar Reconocimiento PDF</>
                        }
                      </button>
                    )}

                    <button onClick={handleCloseForm} className="w-full bg-sepia-700 hover:bg-sepia-600 text-sepia-100 py-3 rounded-xl font-bold uppercase tracking-widest text-sm transition-all">
                      Entendido
                    </button>
                  </motion.div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {formError && (
                      <div className="flex items-center gap-2 bg-red-900/30 border border-red-700 rounded-xl p-3 text-red-400 text-sm">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span>{formError}</span>
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="block text-xs uppercase tracking-widest font-bold text-sepia-500">
                        Nombre completo <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={form.attendee_name}
                        onChange={(e) => setForm({ ...form, attendee_name: e.target.value })}
                        placeholder="Ej: Juan García López"
                        className="w-full bg-sepia-800 border border-sepia-700 rounded-xl px-4 py-3 text-sepia-100 placeholder-sepia-600 outline-none focus:border-sepia-500 transition-all"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs uppercase tracking-widest font-bold text-sepia-500">
                        Correo electrónico <span className="text-sepia-600 font-normal">(opcional)</span>
                      </label>
                      <input
                        type="email"
                        value={form.attendee_email}
                        onChange={(e) => setForm({ ...form, attendee_email: e.target.value })}
                        placeholder="tucorreo@ejemplo.com"
                        className="w-full bg-sepia-800 border border-sepia-700 rounded-xl px-4 py-3 text-sepia-100 placeholder-sepia-600 outline-none focus:border-sepia-500 transition-all"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs uppercase tracking-widest font-bold text-sepia-500">
                        Teléfono <span className="text-sepia-600 font-normal">(opcional)</span>
                      </label>
                      <input
                        type="tel"
                        value={form.attendee_phone}
                        onChange={(e) => setForm({ ...form, attendee_phone: e.target.value })}
                        placeholder="444 123 4567"
                        className="w-full bg-sepia-800 border border-sepia-700 rounded-xl px-4 py-3 text-sepia-100 placeholder-sepia-600 outline-none focus:border-sepia-500 transition-all"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs uppercase tracking-widest font-bold text-sepia-500">
                        Código de colaborador{' '}
                        <span className="text-sepia-600 font-normal">(si alguien te ayudó a registrarte)</span>
                      </label>
                      <input
                        type="text"
                        value={form.collaborator_code}
                        onChange={(e) => setForm({ ...form, collaborator_code: e.target.value.toUpperCase() })}
                        placeholder="Déjalo vacío si no aplica"
                        className="w-full bg-sepia-800 border border-sepia-700 rounded-xl px-4 py-3 text-sepia-100 placeholder-sepia-600 outline-none focus:border-sepia-500 transition-all uppercase font-mono"
                      />
                    </div>

                    {selectedConference.price > 0 && (
                      <div className="bg-sepia-800/40 border border-sepia-700 rounded-xl p-4 text-sm text-sepia-400 space-y-1">
                        <p className="font-bold text-sepia-300">Costo: {formatPrice(selectedConference.price)}</p>
                        <p>Al registrarte recibirás un folio. Coordina el pago por WhatsApp para confirmar tu lugar.</p>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-sepia-500 hover:bg-sepia-400 disabled:opacity-50 disabled:cursor-not-allowed text-sepia-950 font-bold uppercase tracking-widest text-sm py-3 rounded-xl transition-all flex items-center justify-center gap-2 mt-2"
                    >
                      {isSubmitting
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Registrando...</>
                        : <><Send className="w-4 h-4" /> Reservar mi boleto</>
                      }
                    </button>
                  </form>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};
