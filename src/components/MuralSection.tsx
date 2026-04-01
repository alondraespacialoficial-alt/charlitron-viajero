import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, X, Users, Camera, ChevronLeft, ChevronRight } from 'lucide-react';
import { MuralPhoto } from '../types';
import { supabase } from '../supabase';

interface MuralSectionProps {
  onBack: () => void;
}

// Rotaciones fijas para efecto "foto clavada en corcho"
const ROTATIONS = [-3, 1.5, -1, 2.5, -2, 0.8, -1.8, 3, -0.5, 2, -2.5, 1];

export const MuralSection: React.FC<MuralSectionProps> = ({ onBack }) => {
  const [photos, setPhotos] = useState<MuralPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchPhotos();
  }, []);

  const fetchPhotos = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('mural_photos')
        .select('*')
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false });
      if (!error && data) setPhotos(data);
    } catch (err) {
      console.error('Error fetching mural photos:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const activePrev = () => {
    if (activeIndex === null) return;
    setActiveIndex(activeIndex === 0 ? photos.length - 1 : activeIndex - 1);
  };

  const activeNext = () => {
    if (activeIndex === null) return;
    setActiveIndex(activeIndex === photos.length - 1 ? 0 : activeIndex + 1);
  };

  return (
    <div className="min-h-screen bg-sepia-950 pt-24">
      {/* Header */}
      <header className="relative py-16 px-6 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-sepia-700/20 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-900/15 rounded-full blur-[120px]" />
        </div>

        <div className="max-w-5xl mx-auto relative z-10">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sepia-400 hover:text-sepia-200 transition-colors uppercase tracking-widest text-xs font-bold group mb-10"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Volver al inicio
          </button>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-sepia-900/60 border border-sepia-700/50 text-sepia-400 text-xs font-bold uppercase tracking-widest mb-8">
              <Users className="w-4 h-4" />
              Los que apoyan el viaje
            </div>

            <h1 className="text-5xl md:text-7xl font-serif text-sepia-100 mb-6 leading-tight">
              Mural de Encuentros
            </h1>

            <p className="text-sepia-400 text-base md:text-lg italic font-light max-w-2xl mx-auto mb-6 leading-relaxed">
              "Si nos encontramos en el camino, esa foto no será un recuerdo cualquiera… será prueba de que también formas parte del viaje."
            </p>

            <p className="text-sepia-500 text-sm max-w-xl mx-auto font-light leading-relaxed">
              Este espacio guarda los encuentros con personas que apoyan y hacen crecer el proyecto Charlitron Viajero del Tiempo. Cada foto es una huella de un viaje que ya no se recorre solo.
            </p>

            <div className="mt-10 h-px bg-gradient-to-r from-transparent via-sepia-700/50 to-transparent" />
          </motion.div>
        </div>
      </header>

      {/* Mural Grid */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 pb-24">
        {isLoading ? (
          <div className="flex items-center justify-center py-32">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 rounded-full border-2 border-sepia-500 border-t-transparent animate-spin" />
              <p className="text-sepia-500 text-sm uppercase tracking-widest font-bold">Cargando encuentros…</p>
            </div>
          </div>
        ) : photos.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-32 gap-6"
          >
            <div className="w-20 h-20 rounded-full border-2 border-dashed border-sepia-700 flex items-center justify-center">
              <Camera className="w-8 h-8 text-sepia-600" />
            </div>
            <p className="text-sepia-500 italic font-serif text-xl text-center">
              Los encuentros del viaje están por llegar…
            </p>
            <p className="text-sepia-600 text-sm text-center max-w-xs">
              Pronto este mural empezará a llenarse de memorias compartidas.
            </p>
          </motion.div>
        ) : (
          /* Collage de Polaroids – más columnas para photos más pequeñas */
          <div className="columns-3 sm:columns-4 md:columns-5 lg:columns-6 gap-3 md:gap-4">
            {photos.map((photo, index) => {
              const rotation = ROTATIONS[index % ROTATIONS.length];
              return (
                <motion.div
                  key={photo.id}
                  initial={{ opacity: 0, scale: 0.85, rotate: rotation * 0.5 }}
                  whileInView={{ opacity: 1, scale: 1, rotate: rotation }}
                  viewport={{ once: true, margin: '-20px' }}
                  transition={{ duration: 0.5, delay: (index % 10) * 0.05, type: 'spring', stiffness: 120 }}
                  whileHover={{
                    scale: 1.12,
                    rotate: 0,
                    zIndex: 50,
                    transition: { duration: 0.25 }
                  }}
                  className="break-inside-avoid mb-3 md:mb-4 group cursor-zoom-in relative"
                  style={{ rotate: `${rotation}deg` }}
                  onClick={() => setActiveIndex(index)}
                >
                  {/* Polaroid frame */}
                  <div
                    className="bg-[#f5efe6] shadow-[4px_6px_20px_rgba(0,0,0,0.55)] transition-shadow duration-300 group-hover:shadow-[6px_10px_32px_rgba(0,0,0,0.7)]"
                    style={{ padding: '6px 6px 28px 6px' }}
                  >
                    {/* Photo */}
                    <div className={`relative overflow-hidden ${photo.is_vertical ? 'aspect-[3/4]' : 'aspect-square'}`}>
                      <img
                        src={photo.photo_url}
                        alt={photo.person_name}
                        className="w-full h-full object-cover sepia-[0.4] brightness-[0.88] contrast-[1.06] group-hover:sepia-0 group-hover:brightness-100 transition-all duration-500 select-none pointer-events-none"
                        referrerPolicy="no-referrer"
                        onContextMenu={(e) => e.preventDefault()}
                        onDragStart={(e) => e.preventDefault()}
                      />

                      {/* Grain overlay - textura de película */}
                      <div
                        className="absolute inset-0 pointer-events-none opacity-[0.18] mix-blend-overlay"
                        style={{
                          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
                          backgroundSize: '120px 120px'
                        }}
                      />

                      {/* Viñeta cinematográfica */}
                      <div className="absolute inset-0 pointer-events-none"
                        style={{
                          background: 'radial-gradient(ellipse at center, transparent 50%, rgba(20,10,0,0.55) 100%)'
                        }}
                      />

                      {/* Destellos de esquina tipo foto antigua */}
                      <div className="absolute inset-0 pointer-events-none opacity-30"
                        style={{
                          background: 'linear-gradient(135deg, rgba(255,240,200,0.15) 0%, transparent 50%, rgba(100,60,20,0.2) 100%)'
                        }}
                      />

                      {/* Watermark tenue */}
                      <div className="absolute bottom-1 right-1 pointer-events-none opacity-25">
                        <span className="text-white text-[7px] font-serif tracking-widest">Charlitron®</span>
                      </div>
                    </div>

                    {/* Caption Polaroid */}
                    <div className="flex items-center justify-center pt-1 pb-0 px-1">
                      <p
                        className="text-sepia-900 text-center leading-tight truncate w-full"
                        style={{ fontFamily: 'Georgia, serif', fontSize: '9px', fontStyle: 'italic' }}
                      >
                        {photo.person_name}
                      </p>
                    </div>
                  </div>

                  {/* Pin decorativo */}
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-sepia-600 shadow-md border border-sepia-400/60 z-10 opacity-80" />
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Counter */}
        {!isLoading && photos.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-center mt-16 pt-16 border-t border-sepia-800/50"
          >
            <p className="text-sepia-600 text-xs uppercase tracking-[0.3em] font-bold">
              {photos.length} {photos.length === 1 ? 'encuentro' : 'encuentros'} en el mural
            </p>
            <p className="text-sepia-700 text-xs mt-2 italic font-serif">
              El viaje sigue. El mural crece.
            </p>
          </motion.div>
        )}
      </main>

      {/* Lightbox */}
      <AnimatePresence>
        {activeIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[300] bg-sepia-950/96 backdrop-blur-lg flex items-center justify-center p-4"
            onClick={() => setActiveIndex(null)}
          >
            {/* Close */}
            <button
              onClick={() => setActiveIndex(null)}
              className="absolute top-5 right-5 z-50 bg-sepia-900/70 hover:bg-sepia-700 text-sepia-200 p-3 rounded-full transition-all"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Counter badge */}
            <div className="absolute top-5 left-1/2 -translate-x-1/2 bg-sepia-900/70 backdrop-blur-sm text-sepia-400 text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full">
              {activeIndex + 1} / {photos.length}
            </div>

            <motion.div
              key={activeIndex}
              initial={{ scale: 0.88, opacity: 0, rotate: ROTATIONS[activeIndex % ROTATIONS.length] }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 0.88, opacity: 0 }}
              transition={{ duration: 0.35, type: 'spring', stiffness: 150 }}
              className="relative max-w-lg w-full flex flex-col items-center"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Lightbox en formato Polaroid grande */}
              <div
                className="bg-[#f5efe6] shadow-[0_20px_80px_rgba(0,0,0,0.8)] w-full"
                style={{ padding: '10px 10px 52px 10px' }}
              >
                <div className={`relative overflow-hidden ${photos[activeIndex].is_vertical ? 'aspect-[3/4]' : 'aspect-[4/3]'}`}>
                  <img
                    src={photos[activeIndex].photo_url}
                    alt={photos[activeIndex].person_name}
                    className="w-full h-full object-cover select-none"
                    referrerPolicy="no-referrer"
                    onContextMenu={(e) => e.preventDefault()}
                    onDragStart={(e) => e.preventDefault()}
                  />

                  {/* Grain en lightbox */}
                  <div
                    className="absolute inset-0 pointer-events-none opacity-[0.12] mix-blend-overlay"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
                      backgroundSize: '160px 160px'
                    }}
                  />

                  {/* Viñeta en lightbox */}
                  <div className="absolute inset-0 pointer-events-none"
                    style={{ background: 'radial-gradient(ellipse at center, transparent 55%, rgba(20,10,0,0.45) 100%)' }}
                  />

                  {/* Lightbox watermark */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.07]">
                    <div className="rotate-[-25deg] border-2 border-sepia-900/60 p-6 flex flex-col items-center">
                      <span className="text-sepia-900 text-3xl font-serif tracking-widest">Charlitron®</span>
                    </div>
                  </div>
                </div>

                {/* Caption grande */}
                <div className="flex flex-col items-center justify-center pt-3 pb-1 px-2 gap-1">
                  <p className="text-sepia-950 font-serif text-base italic text-center leading-snug">
                    {photos[activeIndex].person_name}
                  </p>
                  {photos[activeIndex].encounter_text && (
                    <p className="text-sepia-700 text-xs italic text-center leading-relaxed">
                      {photos[activeIndex].encounter_text}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Prev / Next */}
            {photos.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); activePrev(); }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-sepia-900/70 hover:bg-sepia-500 text-sepia-200 hover:text-sepia-950 p-3 rounded-full transition-all"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); activeNext(); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-sepia-900/70 hover:bg-sepia-500 text-sepia-200 hover:text-sepia-950 p-3 rounded-full transition-all"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>

                <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {photos.map((_, i) => (
                    <button
                      key={i}
                      onClick={(e) => { e.stopPropagation(); setActiveIndex(i); }}
                      className={`rounded-full transition-all ${i === activeIndex ? 'w-5 h-2 bg-sepia-400' : 'w-2 h-2 bg-sepia-700 hover:bg-sepia-500'}`}
                    />
                  ))}
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
