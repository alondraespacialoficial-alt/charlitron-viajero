import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Loader2, X, AlertCircle, ChevronLeft, MessageCircle, KeyRound, ShieldCheck } from 'lucide-react';
import { Avatar } from '../types';
import { supabase } from '../supabase';
import { WHATSAPP_NUMBER } from '../constants';

const AVATAR_WA_LINK = `https://wa.me/52${WHATSAPP_NUMBER}?text=${encodeURIComponent('Hola Charlitron! Me interesa acceder al Museo de Avatares Interactivos. ¿Cómo obtengo mi código de acceso?')}`;

const RUNWAY_WIDGET_URL  = 'https://cdn.dev.runwayml.com/prod/widget.js';
const WIDGET_SCRIPT_ID   = 'runway-character-widget';
const WIDGET_STYLE_ID    = 'runway-widget-scale';
// Cambia este valor para ajustar el tamaño del botón flotante (1 = normal, 2 = doble, etc.)
const WIDGET_SCALE       = 1.8;

/** Observa el DOM hasta encontrar el contenedor del widget de Runway, lo escala y lo abre. */
function watchAndScaleWidget() {
  const tryNow = () => {
    const fixed = Array.from(document.body.children).find((el) => {
      if (el.id === WIDGET_SCRIPT_ID) return false;
      const s = window.getComputedStyle(el as HTMLElement);
      return s.position === 'fixed';
    }) as HTMLElement | undefined;

    if (fixed && !fixed.dataset.rwScaled) {
      fixed.dataset.rwScaled = '1';
      fixed.style.transform       = `scale(${WIDGET_SCALE})`;
      fixed.style.transformOrigin = 'bottom right';

      // Auto-abrir el widget: buscar el botón del chat y hacer click
      setTimeout(() => {
        const btn = fixed.querySelector<HTMLElement>('button, [role="button"]');
        if (btn) btn.click();
      }, 800);

      return true;
    }
    return false;
  };

  if (tryNow()) return;

  let attempts = 0;
  const observer = new MutationObserver(() => {
    attempts++;
    if (tryNow() || attempts > 40) observer.disconnect();
  });
  observer.observe(document.body, { childList: true });
  // Seguridad: desconectar tras 10 s
  setTimeout(() => observer.disconnect(), 10_000);
}

function injectWidget(pubKey: string) {
  document.getElementById(WIDGET_SCRIPT_ID)?.remove();
  document.getElementById(WIDGET_STYLE_ID)?.remove();

  const script = document.createElement('script');
  script.id  = WIDGET_SCRIPT_ID;
  script.src = RUNWAY_WIDGET_URL;
  script.setAttribute('data-pub-key', pubKey);
  // Pedir a Runway que inicie el widget ya expandido/abierto
  script.setAttribute('data-start-expanded', 'true');
  document.body.appendChild(script);

  // Observar y escalar + abrir automáticamente
  watchAndScaleWidget();
}

function removeWidget() {
  document.getElementById(WIDGET_SCRIPT_ID)?.remove();
  document.getElementById(WIDGET_STYLE_ID)?.remove();
  document.querySelectorAll('[data-runway-widget]').forEach(el => el.remove());
  // Limpiar escala de cualquier elemento que hayamos modificado
  document.querySelectorAll('[data-rw-scaled]').forEach((el) => {
    (el as HTMLElement).style.transform = '';
  });
}

type Step = 'select' | 'auth' | 'loading' | 'active' | 'error'
          | 'private_intake' | 'private_intake_short' | 'private_code';

// Clave en localStorage para recordar que ya completó el formulario completo
const LS_INTAKE_KEY = 'charlitron_private_intake_v1';
// Versión del aviso mostrado — actualizar si cambia el texto del consentimiento
const NOTICE_VERSION = '1.0';

interface AvatarSectionProps {
  accessPassword?: string;
}

// Contraseña maestra del administrador
const MASTER_PASSWORD = '2003';

export const AvatarSection: React.FC<AvatarSectionProps> = ({
  accessPassword = '',
}) => {
  const [step, setStep]                     = useState<Step>('select');
  const [selectedAvatar, setSelectedAvatar] = useState<Avatar | null>(null);
  const [avatars, setAvatars]               = useState<Avatar[]>([]);
  const [loadingAvatars, setLoadingAvatars] = useState(true);
  const [password, setPassword]             = useState('');
  const [errorMsg, setErrorMsg]             = useState('');
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // ── Acceso privado — intake ─────────────────────────────────
  const [intakeName, setIntakeName]         = useState('');
  const [intakeCheck1, setIntakeCheck1]     = useState(false); // código recibido por WA
  const [intakeCheck2, setIntakeCheck2]     = useState(false); // corresponde al acuerdo
  const [intakeShortCheck, setIntakeShortCheck] = useState(false); // reingreso
  const [intakeSaving, setIntakeSaving]     = useState(false);
  const [intakeError, setIntakeError]       = useState('');

  // ── Acceso privado — código ─────────────────────────────────
  const [privateCode, setPrivateCode]       = useState('');
  const [privateLoading, setPrivateLoading] = useState(false);
  const [privateError, setPrivateError]     = useState('');
  const privateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchAvatars = async () => {
      const { data } = await supabase
        .from('avatars')
        .select('*')
        .eq('is_active', true)
        .order('order_index', { ascending: true });
      if (data) setAvatars(data);
      setLoadingAvatars(false);
    };
    fetchAvatars();
    return () => removeWidget();
  }, []);

  const handleSelectAvatar = (avatar: Avatar) => {
    setSelectedAvatar(avatar);
    setPassword('');
    setErrorMsg('');
    setStep('auth');
    setTimeout(() => passwordInputRef.current?.focus(), 100);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAvatar) return;

    if (!selectedAvatar.pub_key || selectedAvatar.pub_key.startsWith('REEMPLAZA_')) {
      setErrorMsg('Pub key no configurada. Ve al panel admin → Avatares y pega el pub_key.');
      setStep('error');
      return;
    }

    const rawPassword = password.trim();
    const normalizedPassword = rawPassword.toUpperCase();

    // ── 1. Contraseña maestra (admin siempre entra) ─────────────
    if (normalizedPassword === MASTER_PASSWORD) {
      // acceso directo, no necesita DB
    } else {
      // ── 2. Código de cliente: validar y consumir (1 solo uso) ──
      let consumeQuery = supabase
        .from('avatars')
        .update({ access_code: null })
        .eq('id', selectedAvatar.id);

      if (rawPassword === normalizedPassword) {
        consumeQuery = consumeQuery.eq('access_code', normalizedPassword);
      } else {
        consumeQuery = consumeQuery.or(`access_code.eq.${rawPassword},access_code.eq.${normalizedPassword}`);
      }

      const { data, error } = await consumeQuery
        .select('id')
        .maybeSingle();

      if (error) {
        setErrorMsg('Error al verificar el código. Intenta de nuevo.');
        return;
      }

      if (!data) {
        setErrorMsg('Código inválido o ya utilizado');
        return;
      }
    }

    setStep('loading');
    setTimeout(() => {
      try {
        injectWidget(selectedAvatar.pub_key);
        setStep('active');
      } catch {
        setErrorMsg('No se pudo cargar el widget de Runway');
        setStep('error');
      }
    }, 300);
  };

  const handleReset = () => {
    removeWidget();
    setStep('select');
    setSelectedAvatar(null);
    setPassword('');
    setErrorMsg('');
    setPrivateCode('');
    setPrivateError('');
    setIntakeName('');
    setIntakeCheck1(false);
    setIntakeCheck2(false);
    setIntakeShortCheck(false);
    setIntakeError('');
  };

  // ── Iniciar flujo privado — decide primera vez o reingreso ──
  const handleStartPrivate = () => {
    const done = localStorage.getItem(LS_INTAKE_KEY);
    setIntakeError('');
    setPrivateError('');
    setPrivateCode('');
    if (done) {
      setIntakeShortCheck(false);
      setStep('private_intake_short');
    } else {
      setIntakeName('');
      setIntakeCheck1(false);
      setIntakeCheck2(false);
      setStep('private_intake');
    }
  };

  // ── Guardar consentimiento en BD y avanzar al código ────────
  const saveConsent = async (name: string, isReturn: boolean) => {
    await supabase.from('avatar_consent_logs').insert([{
      client_name:    name.trim(),
      consent_code:   true,
      consent_terms:  true,
      notice_version: NOTICE_VERSION,
      is_return_visit: isReturn,
      user_agent:     navigator.userAgent.slice(0, 300),
    }]);
    // Aunque falle el INSERT no bloqueamos: el consentimiento ya fue mostrado
  };

  // ── Enviar formulario completo (primera vez) ─────────────────
  const handleIntakeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!intakeName.trim()) { setIntakeError('Por favor escribe tu nombre.'); return; }
    if (!intakeCheck1 || !intakeCheck2) { setIntakeError('Debes marcar ambas casillas para continuar.'); return; }
    setIntakeSaving(true);
    await saveConsent(intakeName, false);
    localStorage.setItem(LS_INTAKE_KEY, new Date().toISOString());
    setIntakeSaving(false);
    setStep('private_code');
    setTimeout(() => privateInputRef.current?.focus(), 100);
  };

  // ── Enviar formulario corto (reingreso) ──────────────────────
  const handleIntakeShortSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!intakeShortCheck) { setIntakeError('Debes confirmar antes de continuar.'); return; }
    setIntakeSaving(true);
    await saveConsent('(reingreso)', true);
    setIntakeSaving(false);
    setStep('private_code');
    setTimeout(() => privateInputRef.current?.focus(), 100);
  };

  // ── Canjear código privado ───────────────────────────────────
  const handlePrivateAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = privateCode.trim().toUpperCase();
    if (!code) return;
    setPrivateLoading(true);
    setPrivateError('');
    try {
      const { data, error } = await supabase
        .rpc('redeem_private_avatar_code', { p_code: code });
      if (error) throw error;
      if (!data || data.length === 0) {
        setPrivateError('Código inválido, ya utilizado o vencido.');
        setPrivateLoading(false);
        return;
      }
      const av = data[0] as { avatar_id: string; slug: string; label: string; description: string; emoji: string; image_url: string; pub_key: string };
      const privateAvatar: Avatar = {
        id: av.avatar_id,
        slug: av.slug,
        label: av.label,
        description: av.description,
        emoji: av.emoji || '🎭',
        image_url: av.image_url,
        pub_key: av.pub_key,
        is_active: true,
        order_index: 0,
        is_private: true,
      };
      setSelectedAvatar(privateAvatar);
      setPrivateCode('');
      setStep('loading');
      setTimeout(() => {
        try {
          injectWidget(privateAvatar.pub_key);
          setStep('active');
        } catch {
          setErrorMsg('No se pudo cargar el widget de Runway');
          setStep('error');
        }
      }, 300);
    } catch {
      setPrivateError('Error al verificar el código. Intenta de nuevo.');
    } finally {
      setPrivateLoading(false);
    }
  };

  return (
    <section className="min-h-screen bg-sepia-950 flex flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-10">
          <p className="text-sepia-500 text-xs uppercase tracking-[0.25em] mb-3">Charlitron® Viajero del Tiempo</p>
          <h2 className="text-sepia-100 font-serif text-3xl md:text-4xl uppercase tracking-widest mb-4">
            Museo de Avatares Interactivos
          </h2>
          <p className="text-sepia-400 text-sm md:text-base tracking-wide max-w-xl mx-auto leading-relaxed">
            Conversaciones con la historia, la memoria y la inteligencia artificial responsable.
          </p>
        </div>

        <AnimatePresence mode="wait">

          {step === 'select' && (
            <motion.div
              key="select"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-10"
            >
              {/* ── Introducción ─────────────────────────────────────── */}
              <div className="space-y-6 text-center">
                <p className="text-sepia-200 font-serif text-lg md:text-xl leading-relaxed max-w-2xl mx-auto">
                  Explora conversaciones inmersivas con personajes históricos, figuras simbólicas
                  y memorias interpretadas mediante inteligencia artificial de forma responsable.
                </p>

                <div className="space-y-4 text-left max-w-2xl mx-auto bg-sepia-900/30 border border-sepia-800/60 rounded-2xl p-6 md:p-8">
                  <p className="text-sepia-300 text-sm md:text-base leading-relaxed">
                    En este espacio, la historia no solo se observa: también se conversa. El{' '}
                    <strong className="text-sepia-200">Museo de Avatares Interactivos</strong> de
                    Charlitron® Viajero del Tiempo reúne experiencias digitales creadas a partir
                    de investigación, memoria documentada y reconstrucción narrativa para acercarte
                    al pasado de una forma viva, accesible y educativa.
                  </p>
                  <p className="text-sepia-300 text-sm md:text-base leading-relaxed">
                    Cada avatar ha sido diseñado con fines culturales, educativos y de divulgación.
                    Sus respuestas forman parte de una{' '}
                    <strong className="text-sepia-200">representación interpretativa</strong> basada
                    en fuentes, contexto histórico y criterios curatoriales del proyecto, por lo
                    que no deben entenderse como declaraciones literales o auténticas de las
                    personas representadas.
                  </p>
                  <p className="text-sepia-300 text-sm md:text-base leading-relaxed">
                    Nuestro objetivo es preservar la memoria, despertar curiosidad por la historia
                    y promover un uso ético y responsable de la inteligencia artificial en la
                    difusión del patrimonio cultural.
                  </p>
                </div>

                {/* ── Aviso legal visible ──────────────────────────────── */}
                <div
                  role="note"
                  aria-label="Aviso importante sobre los avatares"
                  className="flex items-start gap-3 bg-amber-950/40 border border-amber-800/60 rounded-xl px-5 py-4 max-w-2xl mx-auto text-left"
                >
                  <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" aria-hidden="true" />
                  <p className="text-amber-200/80 text-xs md:text-sm leading-relaxed">
                    <strong className="text-amber-300">Aviso importante:</strong> Los avatares de
                    esta sección son recreaciones interpretativas asistidas por inteligencia
                    artificial para fines educativos, culturales y de divulgación.
                  </p>
                </div>
              </div>

              {/* ── ¿Qué puedes hacer? ───────────────────────────────── */}
              <div className="bg-sepia-900/40 border border-sepia-800 rounded-2xl p-6 max-w-lg mx-auto w-full">
                <p className="text-sepia-200 font-serif text-base mb-4 text-center">
                  ¿Qué puedes hacer aquí?
                </p>
                <ul className="space-y-2.5 text-sepia-400 text-sm">
                  {[
                    'Conversar con personajes históricos',
                    'Explorar épocas a través de su mirada',
                    'Descubrir detalles que no vienen en los libros',
                    'Sentir cómo pensaban… cómo hablaban… cómo veían el mundo',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="text-sepia-600 mt-0.5 select-none">—</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* ── Cards de avatares ─────────────────────────────────── */}
              {loadingAvatars ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 text-sepia-600 animate-spin" />
                </div>
              ) : avatars.length === 0 ? (
                <p className="text-sepia-600 text-sm text-center py-8">No hay avatares activos por el momento.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {avatars.map((avatar) => (
                    <motion.button
                      key={avatar.slug}
                      whileHover={{ scale: 1.03, y: -4 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleSelectAvatar(avatar)}
                      className="bg-sepia-900/60 border border-sepia-700 hover:border-sepia-500 rounded-2xl p-6 flex flex-col items-center gap-3 transition-colors group"
                    >
                      {avatar.image_url
                        ? <img src={avatar.image_url} alt={avatar.label} className="w-20 h-20 rounded-full object-cover border-2 border-sepia-700 group-hover:border-sepia-500 transition-colors" />
                        : <span className="text-5xl">{avatar.emoji}</span>
                      }
                      <span className="text-sepia-100 font-serif text-lg">{avatar.label}</span>
                      <span className="text-sepia-500 text-xs">{avatar.description}</span>
                      <MessageCircle className="w-4 h-4 text-sepia-600 group-hover:text-sepia-400 transition-colors mt-1" />
                    </motion.button>
                  ))}
                </div>
              )}

              {/* ── Acceso privado de cliente — botón disparador ─────── */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="bg-sepia-950/60 border border-amber-900/60 rounded-2xl p-6 max-w-lg mx-auto w-full space-y-3"
              >
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-amber-400" />
                  <p className="text-amber-300 font-serif text-base">Acceso privado de cliente</p>
                </div>
                <p className="text-sepia-400 text-xs leading-relaxed">
                  Si adquiriste un avatar personalizado, accede aquí con tu código.
                  Nadie más puede verlo ni usarlo.
                </p>
                <button
                  onClick={handleStartPrivate}
                  className="w-full flex items-center justify-center gap-2 bg-amber-800/80 hover:bg-amber-700 text-amber-100 font-bold uppercase tracking-widest text-xs px-4 py-3 rounded-xl transition-all"
                >
                  <KeyRound className="w-4 h-4" />
                  Iniciar acceso privado
                </button>
              </motion.div>

              {/* ── CTA — ¿Quieres acceder? ─────────────────────────── */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-gradient-to-br from-sepia-900/60 to-sepia-950/80 border border-sepia-700/60 rounded-2xl p-6 max-w-lg mx-auto w-full text-center space-y-4"
              >
                <p className="text-sepia-200 font-serif text-base md:text-lg leading-snug">
                  ¿Te interesa conversar con un avatar?
                </p>
                <p className="text-sepia-400 text-sm leading-relaxed">
                  Cada avatar requiere un <strong className="text-sepia-300">código de acceso personalizado</strong>.
                  Contáctanos por WhatsApp, realiza tu pago y te enviamos tu código en minutos.
                </p>
                <a
                  href={AVATAR_WA_LINK}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2.5 bg-[#25D366] hover:bg-[#1ebe5d] active:scale-95 text-white font-bold uppercase tracking-widest text-xs px-6 py-3.5 rounded-full shadow-lg transition-all"
                >
                  <MessageCircle className="w-4 h-4" />
                  Quiero mi código de acceso
                </a>
              </motion.div>

            </motion.div>
          )}

          {/* ══ INTAKE PRIMERA VEZ ══════════════════════════════════ */}
          {step === 'private_intake' && (
            <motion.div
              key="private_intake"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-sepia-900/70 border border-amber-800/60 rounded-2xl p-8 max-w-lg mx-auto space-y-6"
            >
              <button onClick={handleReset} className="flex items-center gap-1 text-sepia-500 hover:text-sepia-300 text-sm transition-colors">
                <ChevronLeft className="w-4 h-4" /> Volver
              </button>

              <div className="flex items-center gap-3">
                <ShieldCheck className="w-6 h-6 text-amber-400 shrink-0" />
                <div>
                  <h3 className="text-amber-300 font-serif text-lg">Acceso privado al avatar</h3>
                  <p className="text-sepia-500 text-xs mt-0.5">Paso 1 de 2 — Confirmación de identidad y consentimiento</p>
                </div>
              </div>

              <div className="bg-sepia-950/60 border border-sepia-800 rounded-xl p-4 space-y-2 text-sepia-300 text-xs leading-relaxed">
                <p>
                  Esta experiencia es <strong className="text-sepia-100">privada y personalizada</strong>. El código de acceso
                  fue enviado de forma directa por <strong className="text-sepia-200">Charlitron® Viajero del Tiempo</strong> mediante
                  WhatsApp, después de un acuerdo previo con el cliente y del consentimiento correspondiente para el uso
                  de la información compartida.
                </p>
                <p>
                  Antes de ingresar, te pedimos confirmar algunos datos básicos para proteger la privacidad de esta
                  experiencia y el uso responsable del contenido.
                </p>
              </div>

              <form onSubmit={handleIntakeSubmit} className="space-y-5">
                {/* Nombre */}
                <div className="space-y-1.5">
                  <label className="text-xs text-sepia-400 uppercase tracking-widest">
                    Nombre de la persona a quien fue enviado este acceso *
                  </label>
                  <input
                    type="text"
                    value={intakeName}
                    onChange={(e) => { setIntakeName(e.target.value); setIntakeError(''); }}
                    placeholder="Tu nombre completo"
                    maxLength={200}
                    className="w-full bg-sepia-950 border border-sepia-700 focus:border-amber-600 rounded-xl px-4 py-2.5 text-sepia-100 outline-none transition-colors placeholder:text-sepia-600 text-sm"
                  />
                </div>

                {/* Casilla 1 */}
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={intakeCheck1}
                    onChange={(e) => { setIntakeCheck1(e.target.checked); setIntakeError(''); }}
                    className="mt-0.5 w-4 h-4 accent-amber-500 shrink-0"
                  />
                  <span className="text-sepia-300 text-xs leading-relaxed group-hover:text-sepia-200 transition-colors">
                    Confirmo que recibí este código <strong className="text-sepia-200">directamente por WhatsApp</strong> y
                    que <strong className="text-sepia-200">no lo compartiré con terceros</strong>.
                  </span>
                </label>

                {/* Casilla 2 */}
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={intakeCheck2}
                    onChange={(e) => { setIntakeCheck2(e.target.checked); setIntakeError(''); }}
                    className="mt-0.5 w-4 h-4 accent-amber-500 shrink-0"
                  />
                  <span className="text-sepia-300 text-xs leading-relaxed group-hover:text-sepia-200 transition-colors">
                    Confirmo que esta experiencia corresponde al
                    <strong className="text-sepia-200"> acuerdo y consentimiento otorgado previamente</strong> con
                    Charlitron® Viajero del Tiempo.
                  </span>
                </label>

                {intakeError && (
                  <p className="text-red-400 text-xs flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {intakeError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={intakeSaving}
                  className="w-full flex items-center justify-center gap-2 bg-amber-800 hover:bg-amber-700 disabled:opacity-50 text-amber-100 font-bold uppercase tracking-widest text-sm py-3 rounded-xl transition-all"
                >
                  {intakeSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  Continuar
                </button>
              </form>
            </motion.div>
          )}

          {/* ══ INTAKE REINGRESO (formulario corto) ════════════════════ */}
          {step === 'private_intake_short' && (
            <motion.div
              key="private_intake_short"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-sepia-900/70 border border-amber-800/60 rounded-2xl p-8 max-w-lg mx-auto space-y-6"
            >
              <button onClick={handleReset} className="flex items-center gap-1 text-sepia-500 hover:text-sepia-300 text-sm transition-colors">
                <ChevronLeft className="w-4 h-4" /> Volver
              </button>

              <div className="flex items-center gap-3">
                <KeyRound className="w-6 h-6 text-amber-400 shrink-0" />
                <div>
                  <h3 className="text-amber-300 font-serif text-lg">Bienvenido de nuevo</h3>
                  <p className="text-sepia-500 text-xs mt-0.5">Confirmación rápida antes de ingresar</p>
                </div>
              </div>

              <p className="text-sepia-300 text-sm leading-relaxed bg-sepia-950/60 border border-sepia-800 rounded-xl p-4">
                Este acceso es <strong className="text-sepia-100">personal y privado</strong>. Antes de ingresar,
                confirma nuevamente que el código fue enviado directamente a ti.
              </p>

              <form onSubmit={handleIntakeShortSubmit} className="space-y-5">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={intakeShortCheck}
                    onChange={(e) => { setIntakeShortCheck(e.target.checked); setIntakeError(''); }}
                    className="mt-0.5 w-4 h-4 accent-amber-500 shrink-0"
                  />
                  <span className="text-sepia-300 text-xs leading-relaxed group-hover:text-sepia-200 transition-colors">
                    Confirmo que este código me fue enviado <strong className="text-sepia-200">directamente a mí</strong> y
                    que no lo compartiré con terceros.
                  </span>
                </label>

                {intakeError && (
                  <p className="text-red-400 text-xs flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {intakeError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={intakeSaving}
                  className="w-full flex items-center justify-center gap-2 bg-amber-800 hover:bg-amber-700 disabled:opacity-50 text-amber-100 font-bold uppercase tracking-widest text-sm py-3 rounded-xl transition-all"
                >
                  {intakeSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                  Continuar
                </button>
              </form>
            </motion.div>
          )}

          {/* ══ CODIGO PRIVADO ══════════════════════════════════════════ */}
          {step === 'private_code' && (
            <motion.div
              key="private_code"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-sepia-900/70 border border-amber-800/60 rounded-2xl p-8 max-w-sm mx-auto space-y-6"
            >
              <button
                onClick={() => setStep(localStorage.getItem(LS_INTAKE_KEY) ? 'private_intake_short' : 'private_intake')}
                className="flex items-center gap-1 text-sepia-500 hover:text-sepia-300 text-sm transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Volver
              </button>

              <div className="flex items-center gap-3">
                <KeyRound className="w-6 h-6 text-amber-400 shrink-0" />
                <div>
                  <h3 className="text-amber-300 font-serif text-lg">Ingresa tu código personal</h3>
                  <p className="text-sepia-500 text-xs mt-0.5">Paso 2 de 2</p>
                </div>
              </div>

              <p className="text-sepia-400 text-xs leading-relaxed">
                Introduce la clave de acceso que te fue enviada para abrir tu experiencia
                privada en el Museo de Avatares.
              </p>

              <form onSubmit={handlePrivateAccess} className="space-y-4">
                <input
                  ref={privateInputRef}
                  type="text"
                  value={privateCode}
                  onChange={(e) => { setPrivateCode(e.target.value.toUpperCase()); setPrivateError(''); }}
                  placeholder="Tu código privado"
                  autoComplete="off"
                  maxLength={64}
                  className="w-full bg-sepia-950 border border-sepia-700 focus:border-amber-600 rounded-xl px-4 py-3 text-sepia-100 outline-none transition-colors placeholder:text-sepia-600 font-mono tracking-widest uppercase text-sm"
                />
                {privateError && (
                  <p className="text-red-400 text-xs flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {privateError}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={privateLoading || !privateCode.trim()}
                  className="w-full flex items-center justify-center gap-2 bg-amber-800 hover:bg-amber-700 disabled:opacity-40 text-amber-100 font-bold uppercase tracking-widest text-sm py-3 rounded-xl transition-all"
                >
                  {privateLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                  Entrar
                </button>
              </form>
            </motion.div>
          )}

          {step === 'auth' && selectedAvatar && (
            <motion.div
              key="auth"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-sepia-900/60 border border-sepia-700 rounded-2xl p-8 max-w-sm mx-auto"
            >
              <button
                onClick={handleReset}
                className="flex items-center gap-1 text-sepia-500 hover:text-sepia-300 text-sm mb-6 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Volver
              </button>
              <div className="flex items-center gap-3 mb-6">
                {selectedAvatar.image_url
                  ? <img src={selectedAvatar.image_url} alt={selectedAvatar.label} className="w-12 h-12 rounded-full object-cover border border-sepia-700" />
                  : <span className="text-3xl">{selectedAvatar.emoji}</span>
                }
                <div>
                  <p className="text-sepia-100 font-serif">{selectedAvatar.label}</p>
                  <p className="text-sepia-500 text-xs">{selectedAvatar.description}</p>
                </div>
              </div>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <label className="text-sepia-300 text-sm flex items-center gap-2">
                  <Lock className="w-4 h-4" /> Código de acceso
                </label>
                <input
                  ref={passwordInputRef}
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value.toUpperCase())}
                  placeholder="Ej: ABC123"
                  autoComplete="off"
                  className="bg-sepia-950 border border-sepia-700 focus:border-sepia-500 rounded-xl px-4 py-3 text-sepia-100 outline-none transition-colors placeholder:text-sepia-700 font-mono tracking-widest uppercase"
                  required
                />
                {errorMsg && (
                  <p className="text-red-400 text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" /> {errorMsg}
                  </p>
                )}
                <button
                  type="submit"
                  className="bg-sepia-700 hover:bg-sepia-600 text-sepia-100 rounded-xl py-3 font-medium transition-colors"
                >
                  Iniciar sesión
                </button>
              </form>
            </motion.div>
          )}

          {step === 'loading' && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4 py-20"
            >
              <Loader2 className="w-10 h-10 text-sepia-400 animate-spin" />
              <p className="text-sepia-400 text-sm">Cargando avatar…</p>
            </motion.div>
          )}

          {step === 'active' && selectedAvatar && (
            <motion.div
              key="active"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-6"
            >
              <div className="bg-sepia-900/60 border border-sepia-700 rounded-2xl p-8 text-center max-w-md w-full">
                {selectedAvatar.image_url
                  ? <img src={selectedAvatar.image_url} alt={selectedAvatar.label} className="w-24 h-24 rounded-full object-cover border-2 border-sepia-600 mx-auto mb-4" />
                  : <span className="text-6xl block mb-4">{selectedAvatar.emoji}</span>
                }
                <h3 className="text-sepia-100 font-serif text-2xl mb-2">{selectedAvatar.label}</h3>
                <p className="text-sepia-400 text-sm mb-6">{selectedAvatar.description}</p>
                <div className="bg-sepia-800/50 rounded-xl p-4 text-sepia-300 text-sm leading-relaxed">
                  El chat con <strong className="text-sepia-100">{selectedAvatar.label}</strong> se
                  está abriendo automáticamente.<br />
                  Si no aparece, busca el botón en la esquina inferior derecha.
                </div>
              </div>
              <button
                onClick={handleReset}
                className="flex items-center gap-2 text-sepia-500 hover:text-sepia-300 transition-colors text-sm"
              >
                <X className="w-4 h-4" /> Cerrar y elegir otro avatar
              </button>
            </motion.div>
          )}

          {step === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-red-950/40 border border-red-800 rounded-2xl p-8 flex flex-col items-center gap-4 max-w-sm mx-auto"
            >
              <AlertCircle className="w-8 h-8 text-red-400" />
              <p className="text-red-300 text-center text-sm">{errorMsg}</p>
              <button
                onClick={handleReset}
                className="text-sepia-400 hover:text-sepia-200 text-sm underline underline-offset-4 transition-colors"
              >
                Intentar de nuevo
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </section>
  );
};
