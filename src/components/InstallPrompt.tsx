import React, { useState, useEffect } from 'react';
import { X, Download, Smartphone, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../supabase';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface InstallSettings {
  banner_enabled: string;
  banner_title: string;
  banner_subtitle: string;
  install_button_text: string;
  dismiss_days: string;
  show_instructions_button: string;
  instructions_title: string;
  instructions_step1_title: string;
  instructions_step1_desc: string;
  instructions_step2_title: string;
  instructions_step2_desc: string;
  instructions_step3_title: string;
  instructions_step3_desc: string;
  tracking_enabled: string;
}

const DEFAULT_SETTINGS: InstallSettings = {
  banner_enabled: 'true',
  banner_title: 'Instala Charlitron®',
  banner_subtitle: 'Acceso rápido desde tu pantalla principal',
  install_button_text: 'Instalar',
  dismiss_days: '7',
  show_instructions_button: 'true',
  instructions_title: '📱 Instala la App',
  instructions_step1_title: 'Toca los 3 puntos',
  instructions_step1_desc: 'En la esquina superior derecha del navegador',
  instructions_step2_title: 'Busca "Agregar a pantalla principal"',
  instructions_step2_desc: 'O "Instalar app" dependiendo del navegador',
  instructions_step3_title: '¡Listo! Abre la app desde tu pantalla principal',
  instructions_step3_desc: 'Funcionará incluso sin internet',
  tracking_enabled: 'true'
};

export const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [settings, setSettings] = useState<InstallSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  // Cargar configuración desde Supabase
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('install_settings')
          .select('key, value');

        if (error) throw error;

        if (data) {
          const settingsObj: Record<string, string> = {};
          data.forEach(row => {
            settingsObj[row.key] = row.value;
          });
          setSettings(prev => ({ ...prev, ...settingsObj }));
        }
      } catch (error) {
        console.log('Error cargando configuración de instalación:', error);
        // Usar valores por defecto si hay error
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  // Registrar evento de instalación
  const trackInstallEvent = async (eventType: string, outcome?: string) => {
    if (settings.tracking_enabled !== 'true') return;

    try {
      const browser = detectBrowser();
      const os = detectOS();

      await supabase.from('install_events').insert({
        event_type: eventType,
        outcome: outcome || null,
        device_type: 'mobile',
        browser,
        operating_system: os,
        user_agent: navigator.userAgent
      });
    } catch (error) {
      console.log('Error registrando evento de instalación:', error);
    }
  };

  const detectBrowser = (): string => {
    const ua = navigator.userAgent;
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';
    if (ua.includes('Samsung')) return 'Samsung Internet';
    return 'Unknown';
  };

  const detectOS = (): string => {
    const ua = navigator.userAgent;
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
    return 'Unknown';
  };

  useEffect(() => {
    // Detectar si es móvil
    const checkMobile = () => {
      const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsMobile(mobile);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);

    // Capturar beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const beforeInstallPromptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(beforeInstallPromptEvent);
      trackInstallEvent('banner_shown');
      
      // Solo mostrar si no fue rechazado hace poco
      const lastDismissed = localStorage.getItem('installPromptDismissed');
      const now = Date.now();
      const dismissDays = parseInt(settings.dismiss_days || '7');
      const dismissMs = dismissDays * 24 * 60 * 60 * 1000;

      if (settings.banner_enabled === 'true' && (!lastDismissed || now - parseInt(lastDismissed) > dismissMs)) {
        setShowBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('resize', checkMobile);
    };
  }, [settings.banner_enabled, settings.dismiss_days]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      trackInstallEvent('install_attempted', outcome);

      if (outcome === 'accepted') {
        setShowBanner(false);
        setDeferredPrompt(null);
        localStorage.setItem('installPromptDismissed', Date.now().toString());
      }
    } catch (error) {
      console.log('Error al instalar:', error);
      trackInstallEvent('install_attempted', 'error');
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    trackInstallEvent('banner_shown', 'dismissed');
    const dismissDays = parseInt(settings.dismiss_days || '7');
    localStorage.setItem('installPromptDismissed', Date.now().toString());
  };

  const handleShowInstructions = () => {
    setShowInstructions(true);
    trackInstallEvent('instructions_viewed');
  };

  // No renderizar mientras carga configuración
  if (isLoading) return null;

  // Solo mostrar en móvil
  if (!isMobile || settings.banner_enabled !== 'true') return null;

  return (
    <>
      {/* Banner Automático */}
      <AnimatePresence>
        {showBanner && deferredPrompt && (
          <motion.div
            key="install-banner"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-sepia-900 to-sepia-800 border-b border-sepia-700 shadow-2xl"
          >
            <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4 sm:px-6">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Download className="w-5 h-5 text-sepia-400 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-sepia-100 truncate">{settings.banner_title}</p>
                  <p className="text-xs text-sepia-400 truncate">{settings.banner_subtitle}</p>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={handleInstall}
                  className="px-4 py-2 bg-sepia-500 hover:bg-sepia-400 text-sepia-950 rounded-full text-xs font-bold uppercase tracking-widest transition-all active:scale-95"
                >
                  {settings.install_button_text}
                </button>
                <button
                  onClick={handleDismiss}
                  className="p-2 hover:bg-sepia-700/50 rounded-full transition-colors"
                  aria-label="Cerrar"
                >
                  <X className="w-5 h-5 text-sepia-400" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Botón de Instrucciones */}
      {isMobile && !showBanner && settings.show_instructions_button === 'true' && (
        <motion.button
          onClick={handleShowInstructions}
          className="fixed bottom-24 right-8 z-40 p-3 rounded-full border border-sepia-700 bg-sepia-950/90 hover:bg-sepia-900 text-sepia-400 hover:text-sepia-200 transition-all shadow-xl backdrop-blur-sm"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          title="Cómo instalar la app"
        >
          <Smartphone className="w-6 h-6" />
        </motion.button>
      )}

      {/* Modal de Instrucciones */}
      <AnimatePresence>
        {showInstructions && (
          <motion.div
            key="instructions-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => setShowInstructions(false)}
            className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-sepia-950 rounded-3xl shadow-2xl max-w-md w-full border border-sepia-800 overflow-hidden"
            >
              <div className="p-6 sm:p-8 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-serif font-bold text-sepia-100">
                    {settings.instructions_title}
                  </h3>
                  <button
                    onClick={() => setShowInstructions(false)}
                    className="p-2 hover:bg-sepia-900/50 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 text-sepia-400" />
                  </button>
                </div>

                {/* Instrucciones por pasos */}
                <div className="space-y-4">
                  {/* Paso 1 */}
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-sepia-700 flex items-center justify-center">
                      <span className="text-sm font-bold text-sepia-100">1</span>
                    </div>
                    <div>
                      <p className="font-bold text-sepia-200">{settings.instructions_step1_title}</p>
                      <p className="text-sm text-sepia-500">{settings.instructions_step1_desc}</p>
                    </div>
                  </div>

                  {/* Paso 2 */}
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-sepia-700 flex items-center justify-center">
                      <span className="text-sm font-bold text-sepia-100">2</span>
                    </div>
                    <div>
                      <p className="font-bold text-sepia-200">{settings.instructions_step2_title}</p>
                      <p className="text-sm text-sepia-500">{settings.instructions_step2_desc}</p>
                    </div>
                  </div>

                  {/* Paso 3 */}
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-sepia-700 flex items-center justify-center">
                      <span className="text-sm font-bold text-sepia-100">3</span>
                    </div>
                    <div>
                      <p className="font-bold text-sepia-200">{settings.instructions_step3_title}</p>
                      <p className="text-sm text-sepia-500">{settings.instructions_step3_desc}</p>
                    </div>
                  </div>
                </div>

                {/* Navegadores soportados */}
                <div className="bg-sepia-900/50 rounded-2xl p-4 border border-sepia-800">
                  <p className="text-xs font-bold text-sepia-400 uppercase tracking-widest mb-2">Soportado en:</p>
                  <p className="text-sm text-sepia-300">
                    ✓ Chrome/Edge &nbsp; ✓ Firefox &nbsp; ✓ Samsung Internet
                  </p>
                </div>

                {/* Botón de cierre */}
                <button
                  onClick={() => setShowInstructions(false)}
                  className="w-full py-3 bg-sepia-700 hover:bg-sepia-600 text-sepia-100 rounded-xl font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                >
                  Entendido <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
