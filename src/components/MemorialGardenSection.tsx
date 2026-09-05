import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, ArrowLeft, Loader2, Lock, KeyRound, Flower2, Flame, MessageCircle,
  Share2, Facebook, Copy, Check, Music, ExternalLink, Send,
} from 'lucide-react';
import { Memorial, MemorialGesture, MemorialGuestbookEntry, Story } from '../types';
import { supabase } from '../supabase';
import { WHATSAPP_NUMBER } from '../constants';
import { updateMemorialMetaTags, generateMemorialShareUrl, setSectionMetaTags } from '../seoUtils';

const REQUEST_WA_LINK = `https://wa.me/52${WHATSAPP_NUMBER}?text=${encodeURIComponent('Hola Charlitron! Me gustaría solicitar un memorial en el Jardín de la Memoria para un ser querido.')}`;

const FLOWER_OPTIONS: { type: 'flower_rose' | 'flower_lily' | 'flower_sunflower' | 'flower_daisy'; emoji: string; label: string }[] = [
  { type: 'flower_rose', emoji: '🌹', label: 'Rosa' },
  { type: 'flower_lily', emoji: '⚜️', label: 'Lirio' },
  { type: 'flower_sunflower', emoji: '🌻', label: 'Girasol' },
  { type: 'flower_daisy', emoji: '🌼', label: 'Margarita' },
];

const unlockKey = (slug: string) => `jardin_unlock_${slug}`;

// Convierte un link normal de Spotify en la URL del reproductor embebido
// (play/pausa dentro de la misma app, sin abrir Spotify en otra pestaña).
function spotifyEmbedUrl(link: string): string | null {
  try {
    const url = new URL(link);
    if (!url.hostname.includes('spotify.com')) return null;
    const path = url.pathname.replace(/^\/intl-[a-z]{2}\//, '/').replace(/^\/embed\//, '/');
    return `https://open.spotify.com/embed${path}?utm_source=generator&theme=0`;
  } catch {
    return null;
  }
}

interface MemorialGardenSectionProps {
  onBack: () => void;
  initialSlug?: string;
  stories: Story[];
  onOpenStory: (story: Story) => void;
}

export const MemorialGardenSection: React.FC<MemorialGardenSectionProps> = ({ onBack, initialSlug, stories, onOpenStory }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Memorial[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  const [activeSlug, setActiveSlug] = useState<string | null>(initialSlug || null);
  const [memorial, setMemorial] = useState<Memorial | null>(null);
  const [loadingMemorial, setLoadingMemorial] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const [unlocked, setUnlocked] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [codeError, setCodeError] = useState('');

  const [gestures, setGestures] = useState<MemorialGesture[]>([]);
  const [guestbook, setGuestbook] = useState<MemorialGuestbookEntry[]>([]);
  const [visitorName, setVisitorName] = useState('');
  const [visitorMessage, setVisitorMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageSent, setMessageSent] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (!activeSlug) {
      setSectionMetaTags('jardin');
    }
  }, [activeSlug]);

  const runSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const q = query.trim();
    setSearching(true);
    setSearched(true);
    try {
      let request = supabase.from('memorials').select('*').eq('visibility', 'public');
      if (q) request = request.or(`full_name.ilike.%${q}%,family_label.ilike.%${q}%`);
      const { data } = await request.order('full_name').limit(30);
      setResults((data as Memorial[]) || []);
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => { runSearch(); }, []); // eslint-disable-line

  const loadMemorial = async (slug: string) => {
    setLoadingMemorial(true);
    setNotFound(false);
    setMessageSent(false);
    setUnlocked(localStorage.getItem(unlockKey(slug)) === 'true');
    const { data } = await supabase.from('memorials').select('*').eq('slug', slug).maybeSingle();
    if (!data) {
      setNotFound(true);
      setMemorial(null);
    } else {
      const m = data as Memorial;
      setMemorial(m);
      updateMemorialMetaTags(m.full_name, m.epitaph, m.photo_url, m.slug);
      const [{ data: gestureData }, { data: guestbookData }] = await Promise.all([
        supabase.from('memorial_gestures').select('*').eq('memorial_id', m.id).order('created_at', { ascending: false }).limit(24),
        supabase.from('memorial_guestbook').select('*').eq('memorial_id', m.id).eq('status', 'approved').order('created_at', { ascending: false }).limit(30),
      ]);
      setGestures((gestureData as MemorialGesture[]) || []);
      setGuestbook((guestbookData as MemorialGuestbookEntry[]) || []);
    }
    setLoadingMemorial(false);
  };

  useEffect(() => {
    if (activeSlug) loadMemorial(activeSlug);
    else { setMemorial(null); setGestures([]); setGuestbook([]); }
  }, [activeSlug]); // eslint-disable-line

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!memorial) return;
    if (codeInput.trim().toUpperCase() === (memorial.access_code || '').toUpperCase() && memorial.access_code) {
      localStorage.setItem(unlockKey(memorial.slug), 'true');
      setUnlocked(true);
      setCodeError('');
    } else {
      setCodeError('Código incorrecto. Verifica que lo hayas copiado tal cual te lo entregamos.');
    }
  };

  const leaveGesture = async (type: MemorialGesture['gesture_type']) => {
    if (!memorial) return;
    const name = visitorName.trim() || null;
    const { data } = await supabase
      .from('memorial_gestures')
      .insert([{ memorial_id: memorial.id, gesture_type: type, visitor_name: name }])
      .select()
      .single();
    if (data) setGestures(prev => [data as MemorialGesture, ...prev]);
  };

  const submitGuestbookEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memorial || !visitorName.trim() || !visitorMessage.trim()) return;
    setSendingMessage(true);
    const status = memorial.requires_approval ? 'pending' : 'approved';
    const { data, error } = await supabase
      .from('memorial_guestbook')
      .insert([{ memorial_id: memorial.id, visitor_name: visitorName.trim(), message: visitorMessage.trim(), status }])
      .select()
      .single();
    if (!error) {
      if (status === 'approved' && data) setGuestbook(prev => [data as MemorialGuestbookEntry, ...prev]);
      setVisitorMessage('');
      setMessageSent(true);
    }
    setSendingMessage(false);
  };

  const linkedStory = memorial?.story_id ? stories.find(s => s.id === memorial.story_id) : undefined;
  const shareUrl = memorial ? `https://charlitronviajerodeltiempo.com/jardin/${memorial.slug}` : '';

  // ── Vista de un memorial ──────────────────────────────────────
  if (activeSlug) {
    return (
      <div className="min-h-screen bg-sepia-950 pt-20 pb-16">
        <div className="max-w-3xl mx-auto px-6">
          <button
            onClick={() => { setActiveSlug(null); window.history.pushState(null, '', '/jardin'); }}
            className="flex items-center gap-2 text-sepia-400 hover:text-sepia-100 transition-colors text-sm uppercase tracking-widest mb-6"
          >
            <ArrowLeft className="w-4 h-4" /> Volver al Jardín
          </button>

          {loadingMemorial ? (
            <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-sepia-500 animate-spin" /></div>
          ) : notFound || !memorial ? (
            <div className="text-center py-20 text-sepia-400">
              No encontramos ese memorial. Verifica el enlace que te compartieron.
            </div>
          ) : memorial.visibility === 'private' && !unlocked ? (
            <div className="max-w-sm mx-auto bg-sepia-900/50 border border-sepia-700 rounded-2xl p-8 text-center space-y-4">
              <Lock className="w-10 h-10 text-sepia-500 mx-auto" />
              <h2 className="text-sepia-100 font-serif text-xl">Este espacio es privado</h2>
              <p className="text-sepia-500 text-sm">Introduce el código de acceso que te entregamos para visitarlo.</p>
              <form onSubmit={handleUnlock} className="space-y-3">
                <input
                  autoFocus
                  type="text"
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                  placeholder="Código de acceso"
                  className="w-full bg-sepia-950 border border-sepia-700 rounded-xl px-4 py-3 text-center text-sepia-100 tracking-widest font-mono outline-none focus:border-sepia-500"
                />
                {codeError && <p className="text-red-400 text-xs">{codeError}</p>}
                <button type="submit" className="w-full flex items-center justify-center gap-2 bg-sepia-500 hover:bg-sepia-400 text-sepia-950 font-bold uppercase tracking-widest text-xs py-3 rounded-xl transition-all">
                  <KeyRound className="w-4 h-4" /> Entrar
                </button>
              </form>
            </div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-10">
              {/* Encabezado */}
              <div className="text-center space-y-3">
                {memorial.photo_url && (
                  <img src={memorial.photo_url} alt={memorial.full_name} className="w-32 h-32 rounded-full object-cover border-4 border-sepia-700 mx-auto shadow-xl" />
                )}
                <h1 className="text-sepia-100 font-serif text-3xl">{memorial.full_name}</h1>
                {(memorial.birth_date || memorial.death_date) && (
                  <p className="text-sepia-500 text-sm">
                    {memorial.birth_date || '—'} {(memorial.birth_date || memorial.death_date) && '·'} {memorial.death_date || '—'}
                  </p>
                )}
                {memorial.epitaph && <p className="text-sepia-300 italic font-serif text-lg">"{memorial.epitaph}"</p>}
                {memorial.bio_short && <p className="text-sepia-400 text-sm max-w-xl mx-auto">{memorial.bio_short}</p>}
              </div>

              {/* Conexiones */}
              {linkedStory && (
                <button
                  onClick={() => onOpenStory(linkedStory)}
                  className="w-full flex items-center justify-center gap-2 bg-sepia-800/50 hover:bg-sepia-800 border border-sepia-700 rounded-xl py-3 text-sepia-200 text-sm font-semibold transition-all"
                >
                  <ExternalLink className="w-4 h-4" /> Conocer su historia
                </button>
              )}

              {/* Música */}
              {(memorial.tribute_song_url || memorial.spotify_link) && (
                <div className="bg-sepia-900/40 border border-sepia-800 rounded-2xl p-5 space-y-3">
                  <h3 className="text-sepia-300 text-xs font-bold uppercase tracking-widest flex items-center gap-2"><Music className="w-4 h-4" /> Música</h3>
                  {memorial.tribute_song_url && <audio controls src={memorial.tribute_song_url} className="w-full" />}
                  {memorial.spotify_link && (
                    spotifyEmbedUrl(memorial.spotify_link) ? (
                      <iframe
                        src={spotifyEmbedUrl(memorial.spotify_link)!}
                        width="100%"
                        height="152"
                        style={{ borderRadius: 12, border: 0 }}
                        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                        loading="lazy"
                        title="Reproductor de Spotify"
                      />
                    ) : (
                      <a href={memorial.spotify_link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-green-400 hover:text-green-300 text-sm">
                        <ExternalLink className="w-4 h-4" /> Escuchar en Spotify
                      </a>
                    )
                  )}
                </div>
              )}

              {/* Homenajes: flores y vela */}
              <div className="bg-sepia-900/40 border border-sepia-800 rounded-2xl p-5 space-y-4">
                <h3 className="text-sepia-300 text-xs font-bold uppercase tracking-widest">Deja un homenaje</h3>
                <input
                  type="text"
                  value={visitorName}
                  onChange={(e) => setVisitorName(e.target.value)}
                  placeholder="Tu nombre (opcional)"
                  className="w-full bg-sepia-950 border border-sepia-700 rounded-xl px-4 py-2 text-sepia-100 placeholder-sepia-600 outline-none focus:border-sepia-500 text-sm"
                />
                <div className="flex flex-wrap gap-2">
                  {FLOWER_OPTIONS.map(f => (
                    <button
                      key={f.type}
                      onClick={() => leaveGesture(f.type)}
                      className="flex items-center gap-1.5 bg-sepia-800/60 hover:bg-sepia-800 border border-sepia-700 rounded-full px-4 py-2 text-sm text-sepia-200 transition-all"
                    >
                      <span className="text-lg">{f.emoji}</span> {f.label}
                    </button>
                  ))}
                  <button
                    onClick={() => leaveGesture('candle')}
                    className="flex items-center gap-1.5 bg-sepia-800/60 hover:bg-sepia-800 border border-sepia-700 rounded-full px-4 py-2 text-sm text-sepia-200 transition-all"
                  >
                    <Flame className="w-4 h-4" /> Encender una vela
                  </button>
                </div>
                {gestures.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-sepia-800">
                    {gestures.map(g => (
                      <span key={g.id} className="flex items-center gap-1 text-xs text-sepia-500">
                        {g.gesture_type === 'candle' ? '🕯️' : '🌸'} {g.visitor_name ? `${g.visitor_name} dejó ${g.gesture_type === 'candle' ? 'una vela' : 'una flor'}` : `Alguien dejó ${g.gesture_type === 'candle' ? 'una vela' : 'una flor'}`}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Libro de visitas */}
              <div className="bg-sepia-900/40 border border-sepia-800 rounded-2xl p-5 space-y-4">
                <h3 className="text-sepia-300 text-xs font-bold uppercase tracking-widest flex items-center gap-2"><MessageCircle className="w-4 h-4" /> Recuerdos</h3>
                {guestbook.length === 0 ? (
                  <p className="text-sepia-600 text-sm">Sé el primero en dejar un recuerdo.</p>
                ) : (
                  <div className="space-y-3 max-h-72 overflow-y-auto">
                    {guestbook.map(g => (
                      <div key={g.id} className="border-b border-sepia-800 pb-2">
                        <p className="text-sepia-200 text-sm font-semibold">{g.visitor_name}</p>
                        <p className="text-sepia-400 text-sm">{g.message}</p>
                      </div>
                    ))}
                  </div>
                )}
                {messageSent ? (
                  <p className="text-green-400 text-sm">
                    {memorial.requires_approval ? 'Gracias, tu mensaje quedó pendiente de aprobación de la familia.' : 'Gracias por tu mensaje.'}
                  </p>
                ) : (
                  <form onSubmit={submitGuestbookEntry} className="space-y-2">
                    <input
                      type="text"
                      value={visitorName}
                      onChange={(e) => setVisitorName(e.target.value)}
                      placeholder="Tu nombre"
                      required
                      className="w-full bg-sepia-950 border border-sepia-700 rounded-xl px-4 py-2 text-sepia-100 placeholder-sepia-600 outline-none focus:border-sepia-500 text-sm"
                    />
                    <textarea
                      value={visitorMessage}
                      onChange={(e) => setVisitorMessage(e.target.value)}
                      placeholder="Comparte un recuerdo…"
                      required
                      rows={2}
                      className="w-full bg-sepia-950 border border-sepia-700 rounded-xl px-4 py-2 text-sepia-100 placeholder-sepia-600 outline-none focus:border-sepia-500 text-sm resize-none"
                    />
                    <button
                      type="submit"
                      disabled={sendingMessage}
                      className="flex items-center gap-2 bg-sepia-600 hover:bg-sepia-500 disabled:opacity-50 text-sepia-100 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all"
                    >
                      {sendingMessage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      Enviar recuerdo
                    </button>
                  </form>
                )}
              </div>

              {/* Compartir */}
              {memorial.visibility !== 'private' && (
                <div className="flex items-center justify-center gap-3">
                  <a
                    href={generateMemorialShareUrl(memorial.full_name, memorial.slug)}
                    target="_blank" rel="noreferrer"
                    className="flex items-center gap-2 bg-[#25D366] hover:brightness-110 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all"
                  >
                    <Share2 className="w-4 h-4" /> WhatsApp
                  </a>
                  <a
                    href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
                    target="_blank" rel="noreferrer"
                    className="flex items-center gap-2 bg-[#1877F2] hover:brightness-110 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all"
                  >
                    <Facebook className="w-4 h-4" /> Facebook
                  </a>
                  <button
                    onClick={() => { navigator.clipboard.writeText(shareUrl); setCopiedLink(true); setTimeout(() => setCopiedLink(false), 2000); }}
                    className="flex items-center gap-2 bg-sepia-800 hover:bg-sepia-700 text-sepia-200 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all"
                  >
                    {copiedLink ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    {copiedLink ? 'Copiado' : 'Copiar enlace'}
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    );
  }

  // ── Portada / buscador ────────────────────────────────────────
  return (
    <div className="min-h-screen bg-sepia-950 pt-20 pb-16">
      <div className="max-w-3xl mx-auto px-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sepia-400 hover:text-sepia-100 transition-colors text-sm uppercase tracking-widest mb-8"
        >
          <ArrowLeft className="w-4 h-4" /> Regresar
        </button>

        <div className="text-center space-y-3 mb-10">
          <span className="text-5xl">🌷</span>
          <h1 className="text-sepia-100 font-serif text-3xl md:text-4xl">Jardín de la Memoria</h1>
          <p className="text-sepia-500 max-w-xl mx-auto">
            Un espacio tranquilo para conservar y visitar la memoria de quienes ya no están.
          </p>
        </div>

        <form onSubmit={runSearch} className="flex gap-2 mb-8">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre o familia…"
            className="flex-1 bg-sepia-900 border border-sepia-700 rounded-xl px-4 py-3 text-sepia-100 placeholder-sepia-600 outline-none focus:border-sepia-500"
          />
          <button type="submit" className="flex items-center gap-2 bg-sepia-600 hover:bg-sepia-500 text-sepia-100 px-5 rounded-xl font-bold uppercase tracking-widest text-xs transition-all">
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </button>
        </form>

        {searching ? (
          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-sepia-500 animate-spin" /></div>
        ) : results.length === 0 && searched ? (
          <p className="text-center text-sepia-600 text-sm py-6">No encontramos memoriales públicos con ese nombre.</p>
        ) : (
          <div className="space-y-3">
            {results.map(m => (
              <button
                key={m.id}
                onClick={() => { setActiveSlug(m.slug); window.history.pushState(null, '', `/jardin/${m.slug}`); }}
                className="w-full flex items-center gap-4 bg-sepia-900/40 hover:bg-sepia-900/70 border border-sepia-800 rounded-xl p-4 text-left transition-all"
              >
                {m.photo_url
                  ? <img src={m.photo_url} alt={m.full_name} className="w-12 h-12 rounded-full object-cover border border-sepia-700 flex-shrink-0" />
                  : <span className="text-2xl flex-shrink-0">🌷</span>
                }
                <div className="flex-1 min-w-0">
                  <p className="text-sepia-100 font-serif">{m.full_name}</p>
                  {m.family_label && <p className="text-sepia-500 text-xs">{m.family_label}</p>}
                </div>
                <span className="text-sepia-500 text-xs uppercase tracking-widest">Entrar a su memoria →</span>
              </button>
            ))}
          </div>
        )}

        <div className="text-center mt-12 pt-8 border-t border-sepia-800">
          <p className="text-sepia-500 text-sm mb-3">¿Quieres crear un espacio de memoria para un ser querido?</p>
          <a
            href={REQUEST_WA_LINK}
            target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-2 bg-sepia-500 hover:bg-sepia-400 text-sepia-950 px-6 py-3 rounded-full font-bold uppercase tracking-widest text-xs transition-all"
          >
            <Flower2 className="w-4 h-4" /> Solicitar un memorial
          </a>
        </div>
      </div>
    </div>
  );
};
