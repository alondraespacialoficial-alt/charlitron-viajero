import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bot, X } from 'lucide-react';
import { supabase } from '../supabase';

export const AIChatBubble: React.FC = () => {
  const [chatbotUrl, setChatbotUrl] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [{ data: urlData }, { data: enabledData }] = await Promise.all([
          supabase.from('site_settings').select('value').eq('key', 'chatbot_url').maybeSingle(),
          supabase.from('site_settings').select('value').eq('key', 'chatbot_enabled').maybeSingle(),
        ]);
        if (urlData?.value) setChatbotUrl(urlData.value);
        if (enabledData?.value) setEnabled(enabledData.value === 'true');
      } catch (err) {
        console.error('Error loading chatbot settings:', err);
      }
    };
    load();
  }, []);

  if (!enabled || !chatbotUrl) return null;

  return (
    <>
      {/* Burbuja flotante */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen((o) => !o)}
        className="fixed bottom-28 right-8 z-[100] w-16 h-16 rounded-full shadow-2xl bg-sepia-700 hover:bg-sepia-600 text-sepia-100 flex items-center justify-center transition-colors group"
        title="Chat con IA"
        aria-label={isOpen ? 'Cerrar chat' : 'Abrir chat IA'}
      >
        <AnimatePresence mode="wait" initial={false}>
          {isOpen ? (
            <motion.span
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <X className="w-7 h-7" />
            </motion.span>
          ) : (
            <motion.span
              key="bot"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <Bot className="w-7 h-7" />
            </motion.span>
          )}
        </AnimatePresence>
        {!isOpen && (
          <span className="absolute right-full mr-4 top-1/2 -translate-y-1/2 bg-sepia-800 text-sepia-100 px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl border border-sepia-700 pointer-events-none">
            Asistente IA
          </span>
        )}
      </motion.button>

      {/* Panel del chat */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="fixed z-[100] bg-sepia-900 border border-sepia-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col
              bottom-48 right-8 w-[90vw] max-w-sm h-[60vh] max-h-[520px]
              sm:w-96 sm:max-w-none"
          >
            {/* Cabecera */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-sepia-800 bg-sepia-950/80 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-sepia-700 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-sepia-300" />
                </div>
                <div>
                  <p className="text-sepia-100 font-serif text-sm font-bold leading-none">Asistente Charlitron</p>
                  <p className="text-sepia-500 text-[10px] uppercase tracking-widest mt-0.5">IA • En línea</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-sepia-500 hover:text-sepia-300 transition-colors p-1 rounded-lg hover:bg-sepia-800"
                aria-label="Cerrar chat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Iframe del chatbot */}
            <iframe
              src={chatbotUrl}
              className="flex-1 w-full border-none bg-white"
              allow="microphone"
              title="Asistente IA"
              loading="lazy"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
