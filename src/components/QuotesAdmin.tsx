import React, { useEffect, useMemo, useState } from 'react';
import { Download, FileText, PencilLine, Save, Trash2, X } from 'lucide-react';
import { Quote } from '../types';
import { supabase } from '../supabase';

const DEFAULT_LOGO_URL = 'https://osulhjzqgqzodyjamrmn.supabase.co/storage/v1/object/public/images/image-1783881269239.png';

const createEmptyDraft = (): Omit<Quote, 'id' | 'created_at'> & { id?: string } => ({
  id: undefined,
  client_name: '',
  client_email: '',
  client_phone: '',
  description: '',
  formal_text: '',
  total_amount: 0,
  advance_amount: 0,
  status: 'pending',
  advance_paid_at: '',
  advance_proof_url: '',
  final_paid_at: '',
  final_proof_url: '',
  notes: '',
});

const safeNumber = (value: string | number | undefined) => {
  const numeric = Number(typeof value === 'string' ? value.replace(/[^\d.-]/g, '') : value || 0);
  return Number.isFinite(numeric) ? numeric : 0;
};

const buildFormalText = (quote: { client_name: string; description: string; total_amount: number; advance_amount: number; status?: string }) => {
  const name = quote.client_name?.trim() || 'Cliente';
  const description = quote.description?.trim() || 'servicio solicitado';
  const totalAmount = quote.total_amount ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(quote.total_amount) : '$0.00';
  const advanceAmount = quote.advance_amount ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(quote.advance_amount) : '$0.00';

  return `Estimado/a ${name}:\n\nPor este medio le presentamos la cotización correspondiente a ${description}.\n\nMonto total estimado: ${totalAmount}\nAnticipo sugerido: ${advanceAmount}\n\nQuedamos atentos a cualquier comentario o ajuste que requiera.\n\nAtentamente,\nCharlitron Viajero del Tiempo`;
};

const formatCurrency = (value: number) => new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 0,
}).format(value || 0);

const formatDate = (value?: string) => {
  if (!value) return 'Sin fecha';
  return new Date(value).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const TERMS_AND_CONDITIONS = [
  'TÉRMINOS Y CONDICIONES',
  '1. El anticipo no es reembolsable una vez iniciado el proyecto.',
  '2. El saldo restante deberá liquidarse antes de la entrega del producto final.',
  '3. Los plazos de entrega están sujetos a que el cliente proporcione el material solicitado en tiempo y forma.',
  '4. El servicio incluye 2 revisiones sin costo. Cambios adicionales se cotizan por separado.',
  '5. Charlitron Viajero del Tiempo se reserva el derecho de usar el producto como muestra de portafolio en redes sociales.',
  'Al realizar el pago del anticipo, el cliente acepta los términos descritos en este documento.',
  '— Charlitron Viajero del Tiempo · San Luis Potosí',
];

const getStatusLabel = (status?: Quote['status']) => {
  switch (status) {
    case 'advance_paid':
      return 'Anticipo recibido';
    case 'fully_paid':
      return 'Liquidada';
    case 'accepted':
      return 'Aceptada';
    case 'cancelled':
      return 'Cancelada';
    case 'pending':
    default:
      return 'Pendiente';
  }
};

const blobToDataUrl = async (blob: Blob) => {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('No se pudo leer la imagen del logo'));
    reader.readAsDataURL(blob);
  });
};

export const QuotesAdmin: React.FC = () => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [draft, setDraft] = useState<ReturnType<typeof createEmptyDraft>>(createEmptyDraft());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchQuotes = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('quotes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuotes((data || []) as Quote[]);
    } catch (error) {
      console.error('Error fetching quotes:', error);
      setQuotes([]);
      window.alert('No se pudieron cargar las cotizaciones desde Supabase.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotes();
  }, []);

  const hasDraftContent = useMemo(() => {
    return Boolean(
      draft.client_name ||
      draft.client_email ||
      draft.client_phone ||
      draft.description ||
      draft.formal_text ||
      draft.notes ||
      draft.total_amount ||
      draft.advance_amount ||
      draft.advance_paid_at ||
      draft.advance_proof_url ||
      draft.final_paid_at ||
      draft.final_proof_url
    );
  }, [draft]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!draft.client_name.trim() || !draft.description.trim()) {
      return;
    }

    setIsSaving(true);

    try {
      const normalizedDraft = {
        ...draft,
        client_name: draft.client_name.trim(),
        client_email: draft.client_email.trim(),
        client_phone: draft.client_phone.trim(),
        description: draft.description.trim(),
        formal_text: draft.formal_text.trim() || buildFormalText({
          client_name: draft.client_name,
          description: draft.description,
          total_amount: safeNumber(draft.total_amount),
          advance_amount: safeNumber(draft.advance_amount),
          status: draft.status,
        }),
        total_amount: safeNumber(draft.total_amount),
        advance_amount: safeNumber(draft.advance_amount),
        advance_paid_at: draft.advance_paid_at || null,
        advance_proof_url: draft.advance_proof_url?.trim() || null,
        final_paid_at: draft.final_paid_at || null,
        final_proof_url: draft.final_proof_url?.trim() || null,
        notes: draft.notes.trim(),
      };

      const now = new Date().toISOString();

      if (editingId) {
        const { error } = await supabase
          .from('quotes')
          .update({
            ...normalizedDraft,
            updated_at: now,
          })
          .eq('id', editingId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('quotes')
          .insert({
            ...normalizedDraft,
            id: crypto.randomUUID(),
            created_at: now,
            updated_at: now,
          });

        if (error) throw error;
      }

      await fetchQuotes();
      setDraft(createEmptyDraft());
      setEditingId(null);
    } catch (error) {
      console.error('Error saving quote:', error);
      window.alert('No se pudo guardar la cotización en Supabase.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (quote: Quote) => {
    setEditingId(quote.id);
    setDraft({
      id: quote.id,
      client_name: quote.client_name,
      client_email: quote.client_email || '',
      client_phone: quote.client_phone || '',
      description: quote.description,
      formal_text: quote.formal_text,
      total_amount: quote.total_amount,
      advance_amount: quote.advance_amount,
      status: quote.status,
      advance_paid_at: quote.advance_paid_at || '',
      advance_proof_url: quote.advance_proof_url || '',
      final_paid_at: quote.final_paid_at || '',
      final_proof_url: quote.final_proof_url || '',
      notes: quote.notes || '',
    });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Eliminar esta cotización?')) return;

    try {
      const { error } = await supabase
        .from('quotes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchQuotes();

      if (editingId === id) {
        setDraft(createEmptyDraft());
        setEditingId(null);
      }
    } catch (error) {
      console.error('Error deleting quote:', error);
      window.alert('No se pudo eliminar la cotización de Supabase.');
    }
  };

  const handleDownloadPDF = async (quote: Quote) => {
    setIsGenerating(true);

    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });

      const logoDataUrl = await (async () => {
        try {
          const response = await fetch(DEFAULT_LOGO_URL);
          if (!response.ok) return '';
          const blob = await response.blob();
          return await blobToDataUrl(blob);
        } catch {
          return '';
        }
      })();

      doc.setFillColor(249, 244, 236);
      doc.rect(0, 0, 210, 297, 'F');

      doc.setDrawColor(172, 138, 98);
      doc.setLineWidth(0.6);
      doc.rect(12, 12, 186, 273);

      if (logoDataUrl) {
        doc.addImage(logoDataUrl, 'PNG', 18, 18, 32, 32);
      }

      doc.setTextColor(83, 57, 34);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('Charlitron', 58, 28);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text('Viajero del Tiempo', 58, 35);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.setTextColor(55, 39, 24);
      doc.text('COTIZACIÓN', 105, 52, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(100, 77, 52);
      doc.text(`Fecha: ${formatDate(quote.created_at)}`, 146, 27);

      const statusText = getStatusLabel(quote.status);

      doc.setFillColor(233, 224, 208);
      doc.roundedRect(150, 59, 42, 11, 2, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(76, 48, 22);
      doc.text(statusText.toUpperCase(), 171, 66, { align: 'center' });

      const infoY = 78;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(90, 61, 31);
      doc.text('Cliente', 18, infoY);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(40, 30, 20);
      doc.text(quote.client_name || '—', 58, infoY);

      doc.setFont('helvetica', 'bold');
      doc.text('Correo', 18, infoY + 10);
      doc.setFont('helvetica', 'normal');
      doc.text(quote.client_email || '—', 58, infoY + 10);

      doc.setFont('helvetica', 'bold');
      doc.text('Teléfono', 18, infoY + 20);
      doc.setFont('helvetica', 'normal');
      doc.text(quote.client_phone || '—', 58, infoY + 20);

      doc.setFont('helvetica', 'bold');
      doc.text('Servicio', 18, infoY + 30);
      doc.setFont('helvetica', 'normal');
      const serviceLines = doc.splitTextToSize(quote.description || '—', 140) as string[];
      doc.text(serviceLines, 58, infoY + 30);

      const baseInfoY = infoY + 30 + serviceLines.length * 5;

      doc.setFont('helvetica', 'bold');
      doc.text('Monto total', 18, baseInfoY + 8);
      doc.setFont('helvetica', 'normal');
      doc.text(formatCurrency(quote.total_amount), 58, baseInfoY + 8);

      doc.setFont('helvetica', 'bold');
      doc.text('Anticipo', 18, baseInfoY + 18);
      doc.setFont('helvetica', 'normal');
      doc.text(formatCurrency(quote.advance_amount), 58, baseInfoY + 18);

      if (quote.advance_paid_at) {
        doc.setFont('helvetica', 'bold');
        doc.text('Anticipo pagado', 18, baseInfoY + 28);
        doc.setFont('helvetica', 'normal');
        doc.text(formatDate(quote.advance_paid_at), 58, baseInfoY + 28);
      }

      if (quote.advance_proof_url) {
        doc.setFont('helvetica', 'bold');
        doc.text('Comprobante anticipo', 18, baseInfoY + 38);
        doc.setFont('helvetica', 'normal');
        doc.text(quote.advance_proof_url, 58, baseInfoY + 38);
      }

      if (quote.final_paid_at) {
        doc.setFont('helvetica', 'bold');
        doc.text('Liquidación final', 18, baseInfoY + 48);
        doc.setFont('helvetica', 'normal');
        doc.text(formatDate(quote.final_paid_at), 58, baseInfoY + 48);
      }

      if (quote.final_proof_url) {
        doc.setFont('helvetica', 'bold');
        doc.text('Comprobante final', 18, baseInfoY + 58);
        doc.setFont('helvetica', 'normal');
        doc.text(quote.final_proof_url, 58, baseInfoY + 58);
      }

      const baseTextY = 150;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(58, 39, 24);
      doc.text('Detalle formal', 18, baseTextY);

      const formalText = quote.formal_text || buildFormalText(quote);
      const formalLines = doc.splitTextToSize(formalText, 155) as string[];
      const formalBoxY = 158;
      const formalBoxHeight = Math.max(72, formalLines.length * 4.8 + 16);

      doc.setFillColor(255, 255, 255);
      doc.roundedRect(18, formalBoxY, 174, formalBoxHeight, 3, 3, 'F');
      doc.setDrawColor(219, 199, 171);
      doc.setLineWidth(0.3);
      doc.roundedRect(18, formalBoxY, 174, formalBoxHeight, 3, 3, 'S');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(48, 36, 24);
      doc.text(formalLines, 24, formalBoxY + 12);

      let currentY = formalBoxY + formalBoxHeight + 12;

      if (quote.notes?.trim()) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(83, 57, 34);
        doc.text('Notas', 18, currentY);
        currentY += 8;

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(48, 36, 24);
        const noteLines = doc.splitTextToSize(quote.notes, 150) as string[];
        doc.text(noteLines, 40, currentY);
        currentY += noteLines.length * 4.2 + 8;
      }

      const pageHeight = doc.internal.pageSize.getHeight();
      const footerHeightEstimate = 7 + (TERMS_AND_CONDITIONS.length - 1) * 4.3 + 8;
      let footerStartY = Math.max(24, currentY + 8);

      if (footerStartY + footerHeightEstimate > pageHeight - 18) {
        doc.addPage();
        footerStartY = 24;
      }

      const footerLeftX = 18;
      const footerRightX = 190;
      const footerWrapWidth = footerRightX - footerLeftX;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(83, 57, 34);
      doc.text(TERMS_AND_CONDITIONS[0], footerLeftX, footerStartY);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(48, 36, 24);

      TERMS_AND_CONDITIONS.slice(1).forEach((line, index) => {
        const wrappedLines = doc.splitTextToSize(line, footerWrapWidth) as string[];
        wrappedLines.forEach((wrappedLine, wrappedIndex) => {
          const lineY = footerStartY + 7 + ((index + wrappedIndex) * 4.3);
          doc.text(wrappedLine, footerLeftX + 2, lineY);
        });
      });

      const safeName = (quote.client_name || 'cotizacion')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') || 'cotizacion';

      doc.save(`cotizacion-${safeName}.pdf`);
    } catch (error) {
      console.error('Error generating quote PDF:', error);
      window.alert('No se pudo generar el PDF de la cotización. Inténtalo de nuevo.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 border-b border-sepia-800 pb-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.32em] text-sepia-500 font-bold">Admin</p>
          <h3 className="text-2xl font-serif text-sepia-100">Cotizaciones</h3>
        </div>
        <div className="flex items-center gap-2 text-sepia-400 text-xs">
          <FileText className="w-4 h-4" />
          {quotes.length} guardadas
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-sepia-800 bg-sepia-950/30 p-5">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] uppercase tracking-[0.28em] text-sepia-500 font-bold mb-2">Nombre del cliente</label>
            <input
              value={draft.client_name}
              onChange={e => setDraft(d => ({ ...d, client_name: e.target.value }))}
              className="w-full bg-sepia-900 border border-sepia-700 rounded-xl px-3 py-2 text-sepia-100 placeholder-sepia-600 outline-none focus:border-sepia-500"
              placeholder="Ej: Ana García"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-[0.28em] text-sepia-500 font-bold mb-2">Estado</label>
            <select
              value={draft.status}
              onChange={e => setDraft(d => ({ ...d, status: e.target.value as Quote['status'] }))}
              className="w-full bg-sepia-900 border border-sepia-700 rounded-xl px-3 py-2 text-sepia-100 outline-none focus:border-sepia-500"
            >
              <option value="pending">Pendiente</option>
              <option value="accepted">Aceptada</option>
              <option value="advance_paid">Anticipo recibido</option>
              <option value="fully_paid">Liquidada</option>
              <option value="cancelled">Cancelada</option>
            </select>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] uppercase tracking-[0.28em] text-sepia-500 font-bold mb-2">Correo</label>
            <input
              type="email"
              value={draft.client_email}
              onChange={e => setDraft(d => ({ ...d, client_email: e.target.value }))}
              className="w-full bg-sepia-900 border border-sepia-700 rounded-xl px-3 py-2 text-sepia-100 placeholder-sepia-600 outline-none focus:border-sepia-500"
              placeholder="Ej: ana@gmail.com"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-[0.28em] text-sepia-500 font-bold mb-2">Teléfono</label>
            <input
              value={draft.client_phone}
              onChange={e => setDraft(d => ({ ...d, client_phone: e.target.value }))}
              className="w-full bg-sepia-900 border border-sepia-700 rounded-xl px-3 py-2 text-sepia-100 placeholder-sepia-600 outline-none focus:border-sepia-500"
              placeholder="Ej: 555 123 4567"
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] uppercase tracking-[0.28em] text-sepia-500 font-bold mb-2">Descripción / servicio</label>
          <textarea
            value={draft.description}
            onChange={e => setDraft(d => ({ ...d, description: e.target.value }))}
            rows={3}
            className="w-full bg-sepia-900 border border-sepia-700 rounded-xl px-3 py-2 text-sepia-100 placeholder-sepia-600 outline-none focus:border-sepia-500"
            placeholder="Ej: Producción de video institucional para evento de aniversario"
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] uppercase tracking-[0.28em] text-sepia-500 font-bold mb-2">Monto total</label>
            <input
              type="number"
              min="0"
              value={draft.total_amount}
              onChange={e => setDraft(d => ({ ...d, total_amount: safeNumber(e.target.value) }))}
              className="w-full bg-sepia-900 border border-sepia-700 rounded-xl px-3 py-2 text-sepia-100 outline-none focus:border-sepia-500"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-[0.28em] text-sepia-500 font-bold mb-2">Anticipo</label>
            <input
              type="number"
              min="0"
              value={draft.advance_amount}
              onChange={e => setDraft(d => ({ ...d, advance_amount: safeNumber(e.target.value) }))}
              className="w-full bg-sepia-900 border border-sepia-700 rounded-xl px-3 py-2 text-sepia-100 outline-none focus:border-sepia-500"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] uppercase tracking-[0.28em] text-sepia-500 font-bold mb-2">Fecha anticipo</label>
            <input
              type="date"
              value={draft.advance_paid_at}
              onChange={e => setDraft(d => ({ ...d, advance_paid_at: e.target.value }))}
              className="w-full bg-sepia-900 border border-sepia-700 rounded-xl px-3 py-2 text-sepia-100 outline-none focus:border-sepia-500"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-[0.28em] text-sepia-500 font-bold mb-2">Comprobante anticipo</label>
            <input
              value={draft.advance_proof_url}
              onChange={e => setDraft(d => ({ ...d, advance_proof_url: e.target.value }))}
              className="w-full bg-sepia-900 border border-sepia-700 rounded-xl px-3 py-2 text-sepia-100 placeholder-sepia-600 outline-none focus:border-sepia-500"
              placeholder="URL del comprobante"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] uppercase tracking-[0.28em] text-sepia-500 font-bold mb-2">Fecha liquidación final</label>
            <input
              type="date"
              value={draft.final_paid_at}
              onChange={e => setDraft(d => ({ ...d, final_paid_at: e.target.value }))}
              className="w-full bg-sepia-900 border border-sepia-700 rounded-xl px-3 py-2 text-sepia-100 outline-none focus:border-sepia-500"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-[0.28em] text-sepia-500 font-bold mb-2">Comprobante final</label>
            <input
              value={draft.final_proof_url}
              onChange={e => setDraft(d => ({ ...d, final_proof_url: e.target.value }))}
              className="w-full bg-sepia-900 border border-sepia-700 rounded-xl px-3 py-2 text-sepia-100 placeholder-sepia-600 outline-none focus:border-sepia-500"
              placeholder="URL del comprobante"
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] uppercase tracking-[0.28em] text-sepia-500 font-bold mb-2">Texto formal</label>
          <textarea
            value={draft.formal_text}
            onChange={e => setDraft(d => ({ ...d, formal_text: e.target.value }))}
            rows={5}
            className="w-full bg-sepia-900 border border-sepia-700 rounded-xl px-3 py-2 text-sepia-100 placeholder-sepia-600 outline-none focus:border-sepia-500"
            placeholder="Puedes dejarlo vacío para generar el texto formal automáticamente."
          />
        </div>

        <div>
          <label className="block text-[10px] uppercase tracking-[0.28em] text-sepia-500 font-bold mb-2">Notas internas</label>
          <textarea
            value={draft.notes}
            onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))}
            rows={2}
            className="w-full bg-sepia-900 border border-sepia-700 rounded-xl px-3 py-2 text-sepia-100 placeholder-sepia-600 outline-none focus:border-sepia-500"
            placeholder="Observaciones del admin"
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={isSaving || !draft.client_name.trim() || !draft.description.trim()}
            className="inline-flex items-center gap-2 bg-sepia-500 hover:bg-sepia-400 disabled:opacity-50 disabled:cursor-not-allowed text-sepia-950 px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-[0.2em]"
          >
            {isSaving ? <Save className="w-4 h-4 animate-pulse" /> : <Save className="w-4 h-4" />}
            {editingId ? 'Guardar cambios' : 'Guardar cotización'}
          </button>

          {hasDraftContent && (
            <button
              type="button"
              onClick={() => {
                setDraft(createEmptyDraft());
                setEditingId(null);
              }}
              className="inline-flex items-center gap-2 border border-sepia-700 text-sepia-300 hover:text-sepia-100 px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-[0.2em]"
            >
              <X className="w-4 h-4" />
              Limpiar
            </button>
          )}
        </div>
      </form>

      <div className="space-y-3">
        {isLoading ? (
        <div className="rounded-2xl border border-dashed border-sepia-700 bg-sepia-950/20 p-10 text-center text-sepia-400">
          <p className="font-serif text-xl text-sepia-100 mb-2">Cargando cotizaciones...</p>
        </div>
      ) : quotes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-sepia-700 bg-sepia-950/20 p-10 text-center text-sepia-400">
            <p className="font-serif text-xl text-sepia-100 mb-2">Todavía no hay cotizaciones</p>
            <p className="text-sm">Crea la primera cotización desde este formulario.</p>
          </div>
        ) : (
          quotes.map(quote => (
            <div key={quote.id} className="rounded-2xl border border-sepia-800 bg-sepia-950/30 p-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-lg font-bold text-sepia-100">{quote.client_name}</p>
                    <span className={`px-2 py-1 rounded-full text-[10px] uppercase tracking-[0.2em] font-bold ${
                      quote.status === 'accepted'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : quote.status === 'fully_paid'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : quote.status === 'advance_paid'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : quote.status === 'cancelled'
                              ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    }`}>
                      {getStatusLabel(quote.status)}
                    </span>
                  </div>
                  <p className="text-sm text-sepia-400 mt-1">{quote.description}</p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleEdit(quote)}
                    className="inline-flex items-center gap-2 border border-sepia-700 text-sepia-300 hover:text-sepia-100 px-3 py-2 rounded-xl text-[10px] uppercase tracking-[0.2em] font-bold"
                  >
                    <PencilLine className="w-3.5 h-3.5" />
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(quote.id)}
                    className="inline-flex items-center gap-2 border border-red-700 text-red-300 hover:text-red-100 px-3 py-2 rounded-xl text-[10px] uppercase tracking-[0.2em] font-bold"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Borrar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadPDF(quote)}
                    disabled={isGenerating}
                    className="inline-flex items-center gap-2 bg-sepia-500 hover:bg-sepia-400 disabled:opacity-60 text-sepia-950 px-3 py-2 rounded-xl text-[10px] uppercase tracking-[0.2em] font-bold"
                  >
                    <Download className="w-3.5 h-3.5" />
                    {isGenerating ? 'Generando...' : 'Descargar PDF'}
                  </button>
                </div>
              </div>

              <div className="mt-4 grid md:grid-cols-4 gap-3 text-sm text-sepia-300">
                <div className="rounded-xl border border-sepia-800 bg-sepia-900/40 p-3">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-sepia-500 mb-1">Monto total</p>
                  <p className="text-base font-bold text-sepia-100">{formatCurrency(quote.total_amount)}</p>
                </div>
                <div className="rounded-xl border border-sepia-800 bg-sepia-900/40 p-3">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-sepia-500 mb-1">Anticipo</p>
                  <p className="text-base font-bold text-sepia-100">{formatCurrency(quote.advance_amount)}</p>
                </div>
                <div className="rounded-xl border border-sepia-800 bg-sepia-900/40 p-3">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-sepia-500 mb-1">Correo</p>
                  <p className="text-base font-bold text-sepia-100">{quote.client_email || '—'}</p>
                </div>
                <div className="rounded-xl border border-sepia-800 bg-sepia-900/40 p-3">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-sepia-500 mb-1">Teléfono</p>
                  <p className="text-base font-bold text-sepia-100">{quote.client_phone || '—'}</p>
                </div>
              </div>

              {(quote.advance_paid_at || quote.advance_proof_url || quote.final_paid_at || quote.final_proof_url) && (
                <div className="mt-4 grid md:grid-cols-2 gap-3 text-sm text-sepia-300">
                  {quote.advance_paid_at && (
                    <div className="rounded-xl border border-sepia-800 bg-sepia-900/40 p-3">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-sepia-500 mb-1">Fecha anticipo</p>
                      <p className="text-base font-bold text-sepia-100">{formatDate(quote.advance_paid_at)}</p>
                    </div>
                  )}
                  {quote.advance_proof_url && (
                    <div className="rounded-xl border border-sepia-800 bg-sepia-900/40 p-3">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-sepia-500 mb-1">Comprobante anticipo</p>
                      <a href={quote.advance_proof_url} target="_blank" rel="noreferrer" className="text-base font-bold text-sepia-100 underline break-all">
                        {quote.advance_proof_url}
                      </a>
                    </div>
                  )}
                  {quote.final_paid_at && (
                    <div className="rounded-xl border border-sepia-800 bg-sepia-900/40 p-3">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-sepia-500 mb-1">Fecha liquidación</p>
                      <p className="text-base font-bold text-sepia-100">{formatDate(quote.final_paid_at)}</p>
                    </div>
                  )}
                  {quote.final_proof_url && (
                    <div className="rounded-xl border border-sepia-800 bg-sepia-900/40 p-3">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-sepia-500 mb-1">Comprobante final</p>
                      <a href={quote.final_proof_url} target="_blank" rel="noreferrer" className="text-base font-bold text-sepia-100 underline break-all">
                        {quote.final_proof_url}
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
