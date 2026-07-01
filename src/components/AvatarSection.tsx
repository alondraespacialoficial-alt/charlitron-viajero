import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Video, Loader2, X, AlertCircle, ChevronLeft } from 'lucide-react';

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface AvatarConfig {
  slug: string;
  label: string;
  description: string;
  emoji: string;
}

// Ajustar etiquetas / descripción según los personajes reales
const AVATARS: AvatarConfig[] = [
  { slug: 'jose', label: 'José', description: 'Narrador histórico', emoji: '🎩' },
  { slug: 'charlitron', label: 'Charlitron', description: 'Guía viajero', emoji: '🤖' },
  { slug: 'guia', label: 'Guía', description: 'Asistente cultural', emoji: '🗺️' },
];

// Respuesta que devuelve /api/runway-session
// Runway puede retornar una sessionUrl (iframe), un token WebRTC u otro formato.
// Ajustar según la documentación real de la API.
interface RunwaySessionResponse {
  id?: string;
  url?: string;        // URL de embed si la sesión es tipo iframe
  token?: string;      // Token si es WebRTC / SDK
  expiresAt?: string;
  [key: string]: unknown;
}

// ─── Componente ──────────────────────────────────────────────────────────────

interface AvatarSectionProps {
  /** Contraseña de acceso. Pásala desde Supabase site_settings o como prop fija. */
  accessPassword?: string;
}

type Step = 'select' | 'auth' | 'loading' | 'session' | 'error';

export const AvatarSection: React.FC<AvatarSectionProps> = ({
  accessPassword = '',
}) => {
  const [step, setStep] = useState<Step>('select');
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarConfig | null>(null);
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [session, setSession] = useState<RunwaySessionResponse | null>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // ── Selección de avatar ────────────────────────────────────────────────────
  const handleSelectAvatar = (avatar: AvatarConfig) => {
    setSelectedAvatar(avatar);
    setPassword('');
    setErrorMsg('');
    setStep('auth');
    // Foco en el input de contraseña en el siguiente render
    setTimeout(() => passwordInputRef.current?.focus(), 100);
  };

  // ── Validación de contraseña y creación de sesión ─────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAvatar) return;

    // Validar contraseña localmente (ya viene del servidor vía Supabase o prop)
    if (accessPassword && password !== accessPassword) {
      setErrorMsg('Contraseña incorrecta');
      return;
    }

    setErrorMsg('');
    setStep('loading');

    try {
      const res = await fetch('/api/runway-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: selectedAvatar.slug }),
      });

      const data: RunwaySessionResponse | { error: string } = await res.json();

      if (!res.ok || 'error' in data) {
        const msg = 'error' in data ? data.error : `Error ${res.status}`;
        setErrorMsg(msg);
        setStep('error');
        return;
      }

      setSession(data as RunwaySessionResponse);
      setStep('session');
    } catch {
      setErrorMsg('No se pudo conectar con el servidor');
      setStep('error');
    }
  };

  // ── Reset ─────────────────────────────────────────────────────────────────
  const handleReset = () => {
    setStep('select');
    setSelectedAvatar(null);
    setSession(null);
    setPassword('');
    setErrorMsg('');
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <section className="min-h-screen bg-sepia-950 flex flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-2xl">
        {/* Encabezado */}
        <div className="text-center mb-10">
          <h2 className="text-sepia-100 font-serif text-3xl md:text-4xl uppercase tracking-widest mb-3">
            Avatares Interactivos
          </h2>
          <p className="text-sepia-400 text-sm tracking-wide">
            Sesiones en tiempo real con personajes históricos
          </p>
        </div>

        <AnimatePresence mode="wait">
          {/* ── Paso 1: Selección de avatar ── */}
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
                  <Video className="w-4 h-4 text-sepia-600 group-hover:text-sepia-400 transition-colors mt-1" />
                </motion.button>
              ))}
            </motion.div>
          )}

          {/* ── Paso 2: Contraseña ── */}
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

          {/* ── Paso 3: Cargando ── */}
          {step === 'loading' && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4 py-20"
            >
              <Loader2 className="w-10 h-10 text-sepia-400 animate-spin" />
              <p className="text-sepia-400 text-sm">Iniciando sesión con Runway…</p>
            </motion.div>
          )}

          {/* ── Paso 4: Sesión activa ── */}
          {step === 'session' && session && selectedAvatar && (
            <motion.div
              key="session"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-4"
            >
              <div className="flex items-center justify-between">
                <p className="text-sepia-300 text-sm">
                  Sesión activa · {selectedAvatar.emoji} {selectedAvatar.label}
                  {session.id && (
                    <span className="text-sepia-600 ml-2 font-mono text-xs">
                      #{session.id.slice(0, 8)}
                    </span>
                  )}
                </p>
                <button
                  onClick={handleReset}
                  className="text-sepia-500 hover:text-sepia-300 transition-colors"
                  title="Cerrar sesión"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Si Runway devuelve una URL de embed, la mostramos en iframe */}
              {session.url ? (
                <iframe
                  src={session.url}
                  title={`Avatar ${selectedAvatar.label}`}
                  allow="camera; microphone; autoplay; fullscreen"
                  className="w-full aspect-video rounded-2xl border border-sepia-700 bg-sepia-950"
                />
              ) : (
                /* Si no hay URL (sesión WebRTC u otro formato), mostramos
                   los datos de conexión para integrar el SDK de Runway */
                <pre className="bg-sepia-900/60 border border-sepia-700 rounded-2xl p-4 text-sepia-300 text-xs overflow-auto max-h-64">
                  {JSON.stringify(session, null, 2)}
                </pre>
              )}

              {session.expiresAt && (
                <p className="text-sepia-600 text-xs text-center">
                  Sesión expira: {new Date(session.expiresAt).toLocaleTimeString('es')}
                </p>
              )}
            </motion.div>
          )}

          {/* ── Paso 5: Error ── */}
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
