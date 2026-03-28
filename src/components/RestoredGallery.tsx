import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Maximize2, X, Clock, Camera, MapPin, Calendar, ShieldCheck, MessageCircle } from 'lucide-react';
import { supabase } from '../supabase';
import { RestoredPhoto } from '../types';
import { WHATSAPP_LINK } from '../constants';

const CATEGORIES = [
  'Todos',
  'Negocios',
  'Lugares',
  'Familias',
  'Retratos',
  'San Luis antiguo',
  'Antes y después'
];

const INTERVENTION_LABELS: Record<string, string> = {
  'restauracion': 'Restaurada',
  'colorizacion': 'Colorizada',
  'recreacion': 'Recreada',
  'antes_despues': 'Antes / Después',
  'Restaurada': 'Restaurada',
  'Colorizada': 'Colorizada',
  'Recreada': 'Recreada',
  'Antes / Después': 'Antes / Después'
};

export const RestoredGallery = ({ onBack }: { onBack: () => void }) => {
  const [photos, setPhotos] = useState<RestoredPhoto[]>([]);
  const [activePhoto, setActivePhoto] = useState<RestoredPhoto | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('Todos');

  useEffect(() => {
    setActiveImageIndex(0);
  }, [activePhoto]);

  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        const { data, error } = await supabase
          .from('restored_photos')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        if (data) setPhotos(data);
      } catch (err) {
        console.error('Error fetching restored photos:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPhotos();
  }, []);

  const filteredPhotos = activeCategory === 'Todos' 
    ? photos 
    : photos.filter(p => p.category === activeCategory);

  return (
    <div className="min-h-screen bg-sepia-50 pt-32 pb-24 px-6">
      <div className="max-w-7xl mx-auto">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-sepia-600 hover:text-sepia-950 transition-colors mb-12 group relative z-50"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="uppercase tracking-widest text-sm font-bold">Volver al Baúl</span>
        </button>

        <div className="text-center mb-16">
          <span className="text-sepia-600 uppercase tracking-[0.3em] text-sm font-bold mb-4 block">Legado Visual</span>
          <h2 className="text-4xl md:text-6xl font-serif text-sepia-950 mb-6">Galería Restaurada®</h2>
          <p className="text-sepia-700 max-w-3xl mx-auto font-light text-lg leading-relaxed">
            Hay imágenes que el tiempo quiso apagar. Nosotros las ayudamos a volver a respirar. 
            Aquí puedes recorrer una muestra de restauraciones digitales hechas con detalle, respeto y memoria.
            <span className="block mt-4 italic text-sepia-500 text-sm border-t border-sepia-200 pt-4 max-w-xl mx-auto">
              Nota: Charlitron® — Derechos Reservados de Restauración. Las imágenes incluyen marcas de agua y protección contra descarga. La versión original en alta resolución se entrega exclusivamente al cliente.
            </span>
          </p>
        </div>

        {/* Categories */}
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${
                activeCategory === cat 
                  ? 'bg-sepia-950 text-white shadow-lg' 
                  : 'bg-white text-sepia-600 hover:bg-sepia-100 border border-sepia-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sepia-600"></div>
          </div>
        ) : filteredPhotos.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-sepia-200">
            <Camera className="w-12 h-12 text-sepia-300 mx-auto mb-4" />
            <p className="text-sepia-500 font-serif italic text-xl">No hay fotos en esta categoría todavía...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10 items-start">
            {filteredPhotos.map((photo) => (
              <motion.div
                key={photo.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="group relative"
              >
                <div 
                  className={`${photo.is_vertical ? 'aspect-[4/5]' : 'aspect-video'} rounded-2xl overflow-hidden shadow-xl border-8 border-white cursor-zoom-in relative bg-sepia-200 group-hover:shadow-2xl transition-all duration-500`}
                  onClick={() => setActivePhoto(photo)}
                >
                  {/* The "Old Photo" Filtered Image */}
                  <div className="absolute inset-0 z-0">
                    <img 
                      src={photo.url} 
                      alt={photo.title}
                      className="w-full h-full object-cover transition-all duration-700 sepia-filter grayscale-[0.3] contrast-[1.1] brightness-[0.9] group-hover:sepia-0 group-hover:grayscale-0 group-hover:contrast-100 group-hover:brightness-100 group-hover:scale-105 pointer-events-none select-none"
                      referrerPolicy="no-referrer"
                      onContextMenu={(e) => e.preventDefault()}
                      onDragStart={(e) => e.preventDefault()}
                    />
                    {/* Watermark Overlay */}
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-5 group-hover:opacity-10 transition-opacity">
                      <div className="rotate-[-35deg] border-2 border-white/40 p-4 flex flex-col items-center no-select">
                        <span className="text-white text-xl font-serif tracking-widest">Charlitron®</span>
                        <span className="text-white text-[6px] font-bold uppercase tracking-[0.2em] mt-1">Derechos de Restauración</span>
                      </div>
                    </div>
                    {/* Grain/Texture Overlay */}
                    <div className="absolute inset-0 opacity-20 pointer-events-none mix-blend-overlay bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')]"></div>
                  </div>
                  
                  {/* Labels */}
                  {photo.intervention_type && (
                    <div className="absolute top-4 left-4 z-20">
                      <span className="bg-sepia-950/80 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">
                        {INTERVENTION_LABELS[photo.intervention_type] || photo.intervention_type}
                      </span>
                    </div>
                  )}

                  <div className="absolute inset-0 bg-sepia-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10">
                    <Maximize2 className="text-white w-10 h-10" />
                  </div>
                </div>
                <div className="mt-6 text-center">
                  <h3 className="font-serif text-xl text-sepia-900 leading-tight">
                    {photo.title}
                    {(photo.era || photo.place) && (
                      <span className="block text-sm text-sepia-500 font-sans font-normal mt-1">
                        {photo.era}{photo.era && photo.place ? ' — ' : ''}{photo.place}
                      </span>
                    )}
                  </h3>
                  <div className="h-[1px] w-12 bg-sepia-300 mx-auto mt-3 group-hover:w-20 transition-all duration-500"></div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Final CTA */}
        <div className="mt-32 bg-sepia-950 rounded-[3rem] p-12 md:p-20 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')] pointer-events-none"></div>
          <div className="relative z-10 max-w-3xl mx-auto space-y-8">
            <h3 className="text-3xl md:text-4xl font-serif text-sepia-100">
              ¿Tienes una fotografía antigua que merezca volver a respirar?
            </h3>
            <p className="text-sepia-400 text-lg">
              Podemos restaurarla, colorizarla y convertirla en parte de tu memoria viva.
            </p>
            <a 
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-3 bg-sepia-500 hover:bg-sepia-400 text-sepia-950 px-10 py-5 rounded-full font-bold uppercase tracking-widest text-sm transition-all shadow-2xl hover:scale-105"
            >
              Quiero restaurar una imagen
              <MessageCircle className="w-5 h-5" />
            </a>
          </div>
        </div>

        {/* Lightbox / Ficha */}
        <AnimatePresence>
          {activePhoto && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] bg-sepia-950/95 backdrop-blur-md flex items-center justify-center p-4 md:p-10"
            >
              <button 
                className="absolute top-6 right-6 text-sepia-100 p-2 hover:bg-sepia-800 rounded-full transition-colors z-50"
                onClick={() => setActivePhoto(null)}
              >
                <X className="w-10 h-10" />
              </button>
              
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-sepia-50 w-full max-w-6xl rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Image Side */}
                <div className="w-full h-[45vh] md:h-auto md:w-2/3 bg-black flex items-center justify-center relative overflow-hidden p-2 md:p-4 group/lightbox">
                  <motion.img 
                    key={activeImageIndex}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    onDragEnd={(_, info) => {
                      if (activePhoto.images && activePhoto.images.length > 1) {
                        if (info.offset.x > 100) {
                          setActiveImageIndex((prev) => (prev === 0 ? activePhoto.images!.length - 1 : prev - 1));
                        } else if (info.offset.x < -100) {
                          setActiveImageIndex((prev) => (prev === activePhoto.images!.length - 1 ? 0 : prev + 1));
                        }
                      }
                    }}
                    src={activePhoto.images && activePhoto.images.length > 0 
                      ? activePhoto.images[activeImageIndex].url 
                      : activePhoto.url} 
                    className="max-h-full max-w-full object-contain shadow-2xl sepia-filter grayscale-[0.2] cursor-grab active:cursor-grabbing select-none"
                    referrerPolicy="no-referrer"
                    onContextMenu={(e) => e.preventDefault()}
                    onDragStart={(e) => e.preventDefault()}
                  />

                  {/* Multi-image Navigation */}
                  {activePhoto.images && activePhoto.images.length > 1 && (
                    <>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveImageIndex((prev) => (prev === 0 ? activePhoto.images!.length - 1 : prev - 1));
                        }}
                        className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-sepia-500 text-white p-3 rounded-full transition-all md:opacity-0 group-hover/lightbox:opacity-100"
                      >
                        <ArrowLeft className="w-6 h-6" />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveImageIndex((prev) => (prev === activePhoto.images!.length - 1 ? 0 : prev + 1));
                        }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-sepia-500 text-white p-3 rounded-full transition-all md:opacity-0 group-hover/lightbox:opacity-100"
                      >
                        <ArrowLeft className="w-6 h-6 rotate-180" />
                      </button>

                      {/* Indicators */}
                      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
                        {activePhoto.images.map((_, idx) => (
                          <button
                            key={idx}
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveImageIndex(idx);
                            }}
                            className={`w-2 h-2 rounded-full transition-all ${idx === activeImageIndex ? 'bg-sepia-500 w-6' : 'bg-white/50'}`}
                          />
                        ))}
                      </div>
                    </>
                  )}

                  {/* Watermark */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-15">
                    <div className="rotate-[-25deg] border-4 border-white/40 p-8 flex flex-col items-center no-select">
                      <span className="text-white text-4xl md:text-7xl font-serif tracking-widest">Charlitron®</span>
                      <span className="text-white text-xs md:text-sm font-bold tracking-[0.4em] uppercase mt-2">Derechos de Restauración</span>
                      <span className="text-white text-xl md:text-2xl font-serif mt-6 opacity-60 italic">Propiedad Intelectual</span>
                    </div>
                  </div>
                </div>

                {/* Info Side */}
                <div className="md:w-1/3 p-8 md:p-12 overflow-y-auto bg-white flex flex-col">
                  <div className="flex-grow space-y-8">
                    <div>
                      <span className="text-sepia-500 text-[10px] font-bold uppercase tracking-widest mb-2 block">Ficha de Restauración</span>
                      <h3 className="text-3xl font-serif text-sepia-950 leading-tight">
                        {activePhoto.images && activePhoto.images[activeImageIndex]?.title 
                          ? activePhoto.images[activeImageIndex].title 
                          : activePhoto.title}
                      </h3>
                      {activePhoto.images && activePhoto.images[activeImageIndex]?.title && activePhoto.images[activeImageIndex].title !== activePhoto.title && (
                        <p className="text-sepia-500 text-sm font-medium mt-2 block italic opacity-80">
                          Locación: {activePhoto.title}
                        </p>
                      )}
                    </div>

                    <div className="space-y-4">
                      {activePhoto.place && (
                        <div className="flex items-center gap-3 text-sepia-700">
                          <MapPin className="w-5 h-5 text-sepia-400" />
                          <span className="text-sm">{activePhoto.place}</span>
                        </div>
                      )}
                      {activePhoto.era && (
                        <div className="flex items-center gap-3 text-sepia-700">
                          <Calendar className="w-5 h-5 text-sepia-400" />
                          <span className="text-sm">{activePhoto.era}</span>
                        </div>
                      )}
                      {activePhoto.intervention_type && (
                        <div className="flex items-center gap-3 text-sepia-700">
                          <ShieldCheck className="w-5 h-5 text-sepia-400" />
                          <span className="text-sm font-bold uppercase tracking-widest text-[10px]">
                            {INTERVENTION_LABELS[activePhoto.intervention_type] || activePhoto.intervention_type}
                          </span>
                        </div>
                      )}
                    </div>

                    {activePhoto.description && (
                      <div className="pt-6 border-t border-sepia-100">
                        <p className="text-sepia-700 leading-relaxed italic font-serif">
                          "{activePhoto.description}"
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="mt-12 pt-8 border-t border-sepia-100 space-y-4">
                    <a 
                      href={WHATSAPP_LINK}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full bg-sepia-950 text-white py-4 rounded-xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-sepia-800 transition-all"
                    >
                      Solicitar una restauración
                    </a>
                    <button 
                      onClick={() => setActivePhoto(null)}
                      className="w-full text-sepia-500 text-[10px] font-bold uppercase tracking-widest hover:text-sepia-950 transition-colors"
                    >
                      Seguir explorando la galería
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
