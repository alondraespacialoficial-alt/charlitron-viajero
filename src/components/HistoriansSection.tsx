import React, { useState } from 'react';
import { Book, Mail, Instagram, Facebook, MessageCircle, ArrowLeft, X, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Historian } from '../types';

interface HistoriansSectionProps {
  historians: Historian[];
}

export const HistoriansSection: React.FC<HistoriansSectionProps> = ({ historians }) => {
  const [selectedHistorian, setSelectedHistorian] = useState<Historian | null>(null);
  const [activeBookCover, setActiveBookCover] = useState<{ url: string; title: string; link?: string } | null>(null);

  if (historians.length === 0) return null;

  const getContactIcon = (link: string) => {
    if (link.includes('wa.me') || link.includes('whatsapp.com')) {
      return <MessageCircle className="w-5 h-5" />;
    }
    return <Mail className="w-5 h-5" />;
  };

  return (
    <section id="historiadores" className="py-24 bg-zinc-950 text-zinc-100 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
          <div>
            <span className="text-zinc-500 uppercase tracking-[0.3em] text-sm font-bold mb-4 block">Colaboradores Independientes</span>
            <h2 className="text-4xl md:text-5xl font-serif text-white mb-4">Guardianes de la Historia</h2>
            <p className="text-zinc-400 text-sm max-w-xl leading-relaxed">
              Personas que han dedicado su vida a rescatar lo que otros dejaron pasar. 
              Cronistas, escritores e investigadores que ayudan a que la memoria siga viva.
            </p>
          </div>
          <div className="h-[1px] flex-grow bg-zinc-800 mx-8 hidden md:block mb-4"></div>
        </div>

        {/* Minimalist Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {historians.map((historian, idx) => (
            <motion.div 
              key={historian.id}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              whileTap={{ scale: 0.95 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              onClick={() => setSelectedHistorian(historian)}
              className="group cursor-pointer text-center"
            >
              <div className="aspect-square rounded-full overflow-hidden mb-6 border-2 border-sepia-500 md:border-zinc-800 md:group-hover:border-sepia-500 transition-all duration-500 relative">
                <img 
                  src={historian.photo || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=400&h=400&auto=format&fit=crop'} 
                  alt={historian.name}
                  className="w-full h-full object-cover grayscale-0 md:grayscale md:group-hover:grayscale-0 md:group-hover:scale-110 transition-all duration-700"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-sepia-900/20 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-white text-xs font-bold uppercase tracking-tighter bg-sepia-600 px-3 py-1 rounded-full">Ver Perfil</span>
                </div>
              </div>
              <h3 className="text-xl font-serif text-sepia-400 md:text-white mb-1 md:group-hover:text-sepia-400 transition-colors">{historian.name}</h3>
              <p className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold">{historian.specialty}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Detail View Overlay */}
      <AnimatePresence mode="wait">
        {selectedHistorian && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] bg-zinc-950 flex flex-col md:flex-row overflow-y-auto"
          >
            {/* Back Button */}
            <button 
              onClick={() => setSelectedHistorian(null)}
              className="fixed top-6 left-6 z-[160] flex items-center gap-2 text-zinc-400 hover:text-white transition-colors bg-zinc-900/80 backdrop-blur-md px-4 py-2 rounded-full border border-zinc-800"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-widest">Regresar</span>
            </button>

            {/* Left Side: Photo (Sticky on Desktop) */}
            <div className="w-full md:w-1/2 h-[50vh] md:h-screen sticky top-0">
              <img 
                src={selectedHistorian.photo} 
                alt={selectedHistorian.name}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent md:bg-gradient-to-r"></div>
            </div>

            {/* Right Side: Content */}
            <div className="w-full md:w-1/2 p-8 md:p-20 flex flex-col justify-center">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <span className="text-sepia-500 uppercase tracking-[0.3em] text-xs font-bold mb-4 block">Historiador Colaborador</span>
                <h2 className="text-5xl md:text-7xl font-serif text-white mb-4">{selectedHistorian.name}</h2>
                <p className="text-zinc-500 text-sm uppercase tracking-widest font-bold mb-10">{selectedHistorian.specialty}</p>
                
                <div className="flex gap-4 mb-12">
                  {selectedHistorian.social_link && (
                    <a 
                      href={selectedHistorian.social_link}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 px-6 py-3 rounded-xl hover:bg-zinc-800 transition-all text-zinc-300 hover:text-white"
                    >
                      {selectedHistorian.social_link.includes('facebook') ? <Facebook className="w-5 h-5" /> : <Instagram className="w-5 h-5" />}
                      <span className="text-xs font-bold uppercase">Red Social</span>
                    </a>
                  )}
                  {selectedHistorian.contact_link && (
                    <a 
                      href={selectedHistorian.contact_link}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 bg-sepia-600 px-6 py-3 rounded-xl hover:bg-sepia-500 transition-all text-white"
                    >
                      {getContactIcon(selectedHistorian.contact_link)}
                      <span className="text-xs font-bold uppercase">Contactar</span>
                    </a>
                  )}
                </div>

                <div className="space-y-8">
                  <div>
                    <h4 className="text-zinc-500 text-xs uppercase font-bold mb-4 tracking-widest">Biografía</h4>
                    <p className="text-xl text-zinc-300 font-light leading-relaxed italic border-l-2 border-sepia-500 pl-6">
                      "{selectedHistorian.bio}"
                    </p>
                  </div>

                  {selectedHistorian.books && selectedHistorian.books.length > 0 && (
                    <div>
                      <h4 className="text-zinc-500 text-xs uppercase font-bold mb-6 tracking-widest">Obras y Publicaciones</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                        {selectedHistorian.books.map((book, bIdx) => (
                          <div 
                            key={bIdx}
                            onClick={() => setActiveBookCover({ url: book.cover || '', title: book.title, link: book.url })}
                            className="group/book relative block aspect-[3/4] rounded-xl overflow-hidden border border-zinc-800 hover:border-sepia-500 transition-all shadow-2xl cursor-zoom-in"
                          >
                            {book.cover ? (
                              <img 
                                src={book.cover} 
                                alt={book.title}
                                className="w-full h-full object-cover transition-transform duration-700 group-hover/book:scale-110"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-full h-full bg-zinc-900 flex flex-col items-center justify-center p-4 text-center">
                                <Book className="w-8 h-8 text-zinc-700 mb-2" />
                                <span className="text-[10px] text-zinc-500 font-bold uppercase">{book.title}</span>
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60 group-hover/book:opacity-90 transition-opacity flex items-end p-4">
                              <span className="text-[10px] text-white font-bold uppercase tracking-tighter line-clamp-2">{book.title}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Book Cover Lightbox */}
      <AnimatePresence>
        {activeBookCover && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-md flex items-center justify-center p-6"
            onClick={() => setActiveBookCover(null)}
          >
            <button 
              className="absolute top-6 right-6 text-white p-2 hover:bg-zinc-800 rounded-full transition-colors"
              onClick={() => setActiveBookCover(null)}
            >
              <X className="w-10 h-10" />
            </button>
            
            <div className="max-w-4xl w-full flex flex-col items-center gap-8" onClick={e => e.stopPropagation()}>
              <motion.img 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                src={activeBookCover.url || 'https://images.unsplash.com/photo-1543003919-a9957004b5ed?q=80&w=800&auto=format&fit=crop'} 
                className="max-h-[70vh] rounded-xl shadow-2xl border-4 border-zinc-800"
                referrerPolicy="no-referrer"
              />
              <div className="text-center">
                <h3 className="text-2xl font-serif text-white mb-4">{activeBookCover.title}</h3>
                {activeBookCover.link && (
                  <a 
                    href={activeBookCover.link}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 bg-sepia-600 hover:bg-sepia-500 text-white px-8 py-3 rounded-full font-bold uppercase tracking-widest transition-all"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Ver Obra Completa
                  </a>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};
