import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Loader2, X, AlertCircle, ChevronLeft, MessageCircle } from 'lucide-react';
import { Avatar } from '../types';
import { supabase } from '../supabase';

// IMPORTANTE: en "Allowed Origins" de Runway agrega https://charlitronviajerodeltiempo.com

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

type Step = 'select' | 'auth' | 'loading' | 'active' | 'error';

interface AvatarSectionProps {
  accessPassword?: string;
}

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAvatar) return;

    if (accessPassword && password !== accessPassword) {
      setErrorMsg('Contraseña incorrecta');
      return;
    }

    if (!selectedAvatar.pub_key || selectedAvatar.pub_key.startsWith('REEMPLAZA_')) {
      setErrorMsg('Pub key no configurada. Ve al panel admin → Avatares y pega el pub_key.');
      setStep('error');
      return;
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
  };

  return (
    <section className="min-h-screen bg-sepia-950 flex flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-10">
          <h2 className="text-sepia-100 font-serif text-3xl md:text-4xl uppercase tracking-widest mb-3">
            Avatares Interactivos
          </h2>
          <p className="text-sepia-400 text-sm tracking-wide">
            Sesiones en tiempo real con personajes históricos
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
              <div className="space-y-5 text-center">
                <p className="text-sepia-100 font-serif text-xl md:text-2xl leading-relaxed">
                  Aquí no solo vas a leer historia… vas a conversar con ella.
                </p>
                <p className="text-sepia-400 text-sm md:text-base leading-relaxed max-w-xl mx-auto">
                  En este espacio encontrarás avatares interactivos que representan personajes
                  reales y simbólicos de nuestra memoria colectiva. Podrás hablar con ellos en
                  tiempo real, preguntar, explorar y descubrir historias desde su propia voz.
                </p>
                <p className="text-sepia-500 text-sm leading-relaxed max-w-lg mx-auto italic">
                  Cada respuesta está construida a partir de información histórica, memoria
                  documentada y reconstrucción narrativa, para acercarte lo más posible a lo que
                  fueron… y a lo que significaron.
                </p>
                <p className="text-sepia-300 font-serif text-sm md:text-base leading-relaxed">
                  No estás frente a una simple inteligencia artificial…
                  <br className="hidden sm:block" />
                  estás frente a una interpretación viva del pasado.
                </p>
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
                  className="bg-sepia-950 border border-sepia-700 focus:border-sepia-500 rounded-xl px-4 py-3 text-sepia-100 outline-none transition-colors placeholder:text-sepia-700"
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
