import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Loader2, X, AlertCircle, ChevronLeft, MessageCircle } from 'lucide-react';

// ─── Configuración de avatares ────────────────────────────────────────────────
// Para cada avatar:
//   pubKey → cópialo del tab "Embed" en dev.runwayml.com → Embed Snippet → data-pub-key
// IMPORTANTE: en "Allowed Origins" de Runway agrega https://charlitronviajerodeltiempo.com

interface AvatarConfig {
  slug: string;
  label: string;
  description: string;
  emoji: string;
  pubKey: string;
}

const AVATARS: AvatarConfig[] = [
  {
    slug: 'jose',
    label: 'José',
    description: 'Narrador histórico',
    emoji: '🎩',
    pubKey: 'pub_779bcf5b400af4ed97fa96ba92d89369ff9d1c3d1e82194fe84919d160f6ab21',
  },
  {
    slug: 'charlitron',
    label: 'Charlitron',
    description: 'Guía viajero',
    emoji: '🤖',
    pubKey: 'REEMPLAZA_CON_PUB_KEY_DE_CHARLITRON',
  },
  {
    slug: 'guia',
    label: 'Guía',
    description: 'Asistente cultural',
    emoji: '🗺️',
    pubKey: 'REEMPLAZA_CON_PUB_KEY_DE_GUIA',
  },
];

const RUNWAY_WIDGET_URL = 'https://cdn.dev.runwayml.com/prod/widget.js';
const WIDGET_SCRIPT_ID  = 'runway-character-widget';

function injectWidget(pubKey: string) {
  document.getElementById(WIDGET_SCRIPT_ID)?.remove();
  const script = document.createElement('script');
  script.id   = WIDGET_SCRIPT_ID;
  script.src  = RUNWAY_WIDGET_URL;
  script.setAttribute('data-pub-key', pubKey);
  document.body.appendChild(script);
}

function removeWidget() {
  document.getElementById(WIDGET_SCRIPT_ID)?.remove();
  document.querySelectorAll('[data-runway-widget]').forEach(el => el.remove());
}

type Step = 'select' | 'auth' | 'loading' | 'active' | 'error';

interface AvatarSectionProps {
  accessPassword?: string;
}

export const AvatarSection: React.FC<AvatarSectionProps> = ({
  accessPassword = '',
}) => {
  const [step, setStep]                     = useState<Step>('select');
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarConfig | null>(null);
  const [password, setPassword]             = useState('');
  const [errorMsg, setErrorMsg]             = useState('');
  const passwordInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => removeWidget(), []);

  const handleSelectAvatar = (avatar: AvatarConfig) => {
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

    if (selectedAvatar.pubKey.startsWith('REEMPLAZA_')) {
      setErrorMsg('Pub key no configurada. Ve a Runway → Characters → Embed y pega el data-pub-key en el código.');
      setStep('error');
      return;
    }

    setStep('loading');
    setTimeout(() => {
      try {
        injectWidget(selectedAvatar.pubKey);
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
              className="grid grid-cols-1 sm:grid-cols-3 gap-4"
            >
              {AVATARS.map((avatar) => (
                <motion.button
                  key={avatar.slug}
                  whileHover={{ scale: 1.03, y: -4 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleSelectAvatar(avatar)}
                  className="bg-sepia-900/60 border border-sepia-700 hover:border-sepia-500 rounded-2xl p-6 flex flex-col items-center gap-3 transition-colors group"
                >
                  <span className="text-5xl">{avatar.emoji}</span>
                  <span className="text-sepia-100 font-serif text-lg">{avatar.label}</span>
                  <span className="text-sepia-500 text-xs">{avatar.description}</span>
                  <MessageCircle className="w-4 h-4 text-sepia-600 group-hover:text-sepia-400 transition-colors mt-1" />
                </motion.button>
              ))}
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
                <span className="text-3xl">{selectedAvatar.emoji}</span>
                <div>
                  <p className="text-sepia-100 font-serif">{selectedAvatar.label}</p>
                  <p className="text-sepia-500 text-xs">{selectedAvatar.description}</p>
                </div>
              </div>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <label className="text-sepia-300 text-sm flex items-center gap-2">
                  <Lock className="w-4 h-4" /> Contraseña de acceso
                </label>
                <input
                  ref={passwordInputRef}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
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
                <span className="text-6xl block mb-4">{selectedAvatar.emoji}</span>
                <h3 className="text-sepia-100 font-serif text-2xl mb-2">{selectedAvatar.label}</h3>
                <p className="text-sepia-400 text-sm mb-6">{selectedAvatar.description}</p>
                <div className="bg-sepia-800/50 rounded-xl p-4 text-sepia-300 text-sm leading-relaxed">
                  El widget del avatar está activo.<br />
                  <strong className="text-sepia-100">Busca el botón de chat</strong> que apareció
                  en la esquina inferior derecha de la pantalla para iniciar la conversación.
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
