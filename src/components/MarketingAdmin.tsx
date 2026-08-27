import React, { useEffect, useState } from 'react';
import { Mail, Send, Loader2, AlertCircle, CheckCircle2, RefreshCw, Users } from 'lucide-react';

interface Subscriber {
  id: string;
  email: string;
  name: string | null;
  interests: string[];
  is_subscribed: boolean;
  created_at: string;
}

type Segment = 'all' | 'conference' | 'course' | 'contest';

const SEGMENT_LABELS: Record<Segment, string> = {
  all: 'Todos',
  conference: 'Conferencias',
  course: 'Cursos',
  contest: 'Concursos',
};

export const MarketingAdmin: React.FC<{ adminToken?: string }> = ({ adminToken = '' }) => {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [counts, setCounts] = useState<Record<Segment, number>>({ all: 0, conference: 0, course: 0, contest: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');

  const [subject, setSubject] = useState('');
  const [html, setHtml] = useState('');
  const [segment, setSegment] = useState<Segment>('all');
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchSubscribers = async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      const res = await fetch('/api/list-newsletter-subscribers', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${adminToken}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setSubscribers(json?.data ?? []);
      setCounts(json?.counts ?? { all: 0, conference: 0, course: 0, contest: 0 });
    } catch {
      setLoadError('No se pudieron cargar los suscriptores.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscribers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSend = async () => {
    if (!subject.trim() || !html.trim()) {
      setSendResult({ type: 'error', text: 'Escribe el asunto y el contenido del correo.' });
      return;
    }
    setIsSending(true);
    setSendResult(null);
    try {
      const res = await fetch('/api/send-marketing-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
        body: JSON.stringify({ subject, html, segment }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Error al enviar.');
      setSendResult({ type: 'success', text: `Campaña enviada a ${json.sent} suscriptor(es). Fallidos: ${json.failed ?? 0}.` });
      setSubject('');
      setHtml('');
    } catch (err: any) {
      setSendResult({ type: 'error', text: err.message || 'Ocurrió un error al enviar la campaña.' });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Conteos por segmento */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(Object.keys(SEGMENT_LABELS) as Segment[]).map((key) => (
          <div key={key} className="bg-sepia-900/60 border border-sepia-800 rounded-xl p-4 text-center">
            <p className="text-sepia-500 text-[10px] uppercase tracking-widest font-bold flex items-center justify-center gap-1">
              <Users className="w-3 h-3" /> {SEGMENT_LABELS[key]}
            </p>
            <p className="text-sepia-100 text-2xl font-serif mt-1">{counts[key]}</p>
          </div>
        ))}
      </div>

      {/* Compositor de campaña */}
      <div className="bg-sepia-900/60 border border-sepia-800 rounded-xl p-5 space-y-4">
        <h3 className="text-sepia-100 font-serif text-xl flex items-center gap-2">
          <Mail className="w-5 h-5" /> Nueva campaña
        </h3>

        {sendResult && (
          <div className={`flex items-center gap-2 rounded-xl p-3 text-sm border ${sendResult.type === 'success' ? 'bg-green-900/30 border-green-700 text-green-400' : 'bg-red-900/30 border-red-700 text-red-400'}`}>
            {sendResult.type === 'success' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
            <span>{sendResult.text}</span>
          </div>
        )}

        <div className="space-y-1">
          <label className="block text-xs uppercase tracking-widest font-bold text-sepia-500">Destinatarios</label>
          <select
            value={segment}
            onChange={(e) => setSegment(e.target.value as Segment)}
            className="w-full bg-sepia-800 border border-sepia-700 rounded-xl px-4 py-3 text-sepia-100 outline-none focus:border-sepia-500 transition-all"
          >
            {(Object.keys(SEGMENT_LABELS) as Segment[]).map((key) => (
              <option key={key} value={key}>{SEGMENT_LABELS[key]} ({counts[key]})</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="block text-xs uppercase tracking-widest font-bold text-sepia-500">Asunto</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Ej: ¡Nueva conferencia disponible! 🎟️"
            className="w-full bg-sepia-800 border border-sepia-700 rounded-xl px-4 py-3 text-sepia-100 placeholder-sepia-600 outline-none focus:border-sepia-500 transition-all"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-xs uppercase tracking-widest font-bold text-sepia-500">
            Contenido <span className="text-sepia-600 font-normal">(admite HTML)</span>
          </label>
          <textarea
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            rows={8}
            placeholder="<p>Hola viajero, tenemos una nueva conferencia...</p>"
            className="w-full bg-sepia-800 border border-sepia-700 rounded-xl px-4 py-3 text-sepia-100 placeholder-sepia-600 outline-none focus:border-sepia-500 transition-all font-mono text-sm"
          />
        </div>

        <button
          onClick={handleSend}
          disabled={isSending}
          className="w-full bg-sepia-500 hover:bg-sepia-400 disabled:opacity-50 disabled:cursor-not-allowed text-sepia-950 font-bold uppercase tracking-widest text-sm py-3 rounded-xl transition-all flex items-center justify-center gap-2"
        >
          {isSending ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</> : <><Send className="w-4 h-4" /> Enviar campaña</>}
        </button>
      </div>

      {/* Lista de suscriptores */}
      <div className="bg-sepia-900/60 border border-sepia-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sepia-100 font-serif text-xl">Suscriptores ({subscribers.length})</h3>
          <button onClick={fetchSubscribers} className="flex items-center gap-1 text-sepia-400 hover:text-sepia-100 text-xs uppercase tracking-widest font-bold transition-colors">
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} /> Refrescar
          </button>
        </div>

        {loadError && (
          <div className="flex items-center gap-2 bg-red-900/30 border border-red-700 rounded-xl p-3 text-red-400 text-sm mb-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{loadError}</span>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-10 text-sepia-500">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : subscribers.length === 0 ? (
          <p className="text-sepia-500 text-sm text-center py-6">Aún no hay suscriptores.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-sepia-500 text-[10px] uppercase tracking-widest border-b border-sepia-800">
                  <th className="py-2 pr-4">Correo</th>
                  <th className="py-2 pr-4">Nombre</th>
                  <th className="py-2 pr-4">Intereses</th>
                  <th className="py-2 pr-4">Estado</th>
                  <th className="py-2 pr-4">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {subscribers.map((s) => (
                  <tr key={s.id} className="border-b border-sepia-800/50 text-sepia-300 text-sm">
                    <td className="py-2 pr-4">{s.email}</td>
                    <td className="py-2 pr-4">{s.name || '—'}</td>
                    <td className="py-2 pr-4">{s.interests?.join(', ') || '—'}</td>
                    <td className="py-2 pr-4">
                      {s.is_subscribed
                        ? <span className="text-green-400">Activo</span>
                        : <span className="text-red-400">Dado de baja</span>}
                    </td>
                    <td className="py-2 pr-4 text-sepia-500 text-xs">{new Date(s.created_at).toLocaleDateString('es-MX')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
