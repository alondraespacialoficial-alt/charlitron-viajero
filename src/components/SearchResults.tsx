import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Scroll, Users, Camera, Image as ImageIcon, ShoppingBag, MapPin } from 'lucide-react';
import { Story, Historian, RestoredPhoto, TravelPhoto, Product } from '../types';

interface SearchResultsProps {
  isOpen: boolean;
  onClose: () => void;
  searchTerm: string;
  stories: Story[];
  historians: Historian[];
  restoredPhotos: RestoredPhoto[];
  travelPhotos: TravelPhoto[];
  products: Product[];
  onSelectStory: (story: Story) => void;
  onSelectHistorian?: (historian: Historian) => void;
  onViewGallery?: () => void;
  onViewShop?: () => void;
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  isOpen,
  onClose,
  searchTerm,
  stories,
  historians,
  restoredPhotos,
  travelPhotos,
  products,
  onSelectStory,
  onSelectHistorian,
  onViewGallery,
  onViewShop
}) => {
  // Normalizar término de búsqueda (remover acentos)
  const normalizeText = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, ''); // Remover marcas diacríticas (acentos)
  };
  
  const lowerTerm = normalizeText(searchTerm);

  // Función auxiliar para normalizar y comparar
  const matchesSearch = (text?: string) => {
    if (!text) return false;
    return normalizeText(text).includes(lowerTerm);
  };

  // Filter results from each section
  const filteredStories = stories.filter(s =>
    matchesSearch(s.title) ||
    matchesSearch(s.description) ||
    matchesSearch(s.fullNarrative) ||
    matchesSearch(s.category) ||
    s.year?.includes(lowerTerm)
  );

  const filteredHistorians = historians.filter(h =>
    matchesSearch(h.name) ||
    matchesSearch(h.bio) ||
    matchesSearch(h.specialty)
  );

  const filteredRestoredPhotos = restoredPhotos.filter(p =>
    matchesSearch(p.title) ||
    matchesSearch(p.description) ||
    matchesSearch(p.place) ||
    matchesSearch(p.era) ||
    matchesSearch(p.category)
  );

  const filteredTravelPhotos = travelPhotos.filter(p =>
    matchesSearch(p.character_name) ||
    matchesSearch(p.description) ||
    p.year?.includes(lowerTerm)
  );

  const filteredProducts = products.filter(p =>
    matchesSearch(p.title) ||
    matchesSearch(p.description) ||
    matchesSearch(p.category)
  );

  const hasResults = 
    filteredStories.length > 0 ||
    filteredHistorians.length > 0 ||
    filteredRestoredPhotos.length > 0 ||
    filteredTravelPhotos.length > 0 ||
    filteredProducts.length > 0;

  const handleSelectStory = (story: Story) => {
    onSelectStory(story);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[250] bg-sepia-950/95 backdrop-blur-md flex items-start justify-center pt-20 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="bg-sepia-900 rounded-3xl w-full max-w-4xl max-h-[80vh] overflow-hidden shadow-2xl border border-sepia-800"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-sepia-950 border-b border-sepia-800 px-6 md:px-8 py-4 md:py-6 flex justify-between items-center">
              <div>
                <h2 className="text-xl md:text-2xl font-serif text-sepia-100">
                  Resultados de búsqueda
                </h2>
                <p className="text-sepia-400 text-sm mt-1">
                  "{searchTerm}"
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-sepia-400 hover:text-sepia-100 p-2 hover:bg-sepia-800 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto">
              {!hasResults ? (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-sepia-800/50 flex items-center justify-center">
                    <Scroll className="w-8 h-8 text-sepia-500" />
                  </div>
                  <h3 className="text-xl font-serif text-sepia-100 mb-2">
                    No hay resultados
                  </h3>
                  <p className="text-sepia-400 max-w-sm mx-auto">
                    No encontramos coincidencias para "<strong>{searchTerm}</strong>" en nuestro archivo. Intenta con otros términos en Historias, Historiadores, Galería o Tienda.
                  </p>
                </div>
              ) : (
                <div className="p-6 md:p-8 space-y-8">
                  {/* Historias */}
                  {filteredStories.length > 0 && (
                    <section>
                      <div className="flex items-center gap-2 mb-4">
                        <Scroll className="text-sepia-500 w-5 h-5" />
                        <h3 className="text-lg font-serif text-sepia-100 uppercase tracking-widest">
                          Historias ({filteredStories.length})
                        </h3>
                      </div>
                      <div className="space-y-3">
                        {filteredStories.map(story => (
                          <motion.button
                            key={story.id}
                            whileHover={{ x: 8 }}
                            onClick={() => handleSelectStory(story)}
                            className="w-full text-left bg-sepia-800/30 hover:bg-sepia-800/60 rounded-xl p-4 transition-all group"
                          >
                            <div className="flex items-start gap-4">
                              <img
                                src={story.thumbnail}
                                alt={story.title}
                                className="w-16 h-16 rounded-lg object-cover sepia-filter group-hover:sepia-0 transition-all"
                              />
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sepia-100 font-bold text-sm line-clamp-1 group-hover:text-sepia-400">
                                  {story.title}
                                </h4>
                                <p className="text-sepia-400 text-xs line-clamp-2 mt-1">
                                  {story.description}
                                </p>
                                <div className="flex gap-2 mt-2 text-[11px]">
                                  {story.year && (
                                    <span className="bg-sepia-700/50 px-2 py-1 rounded text-sepia-300">
                                      {story.year}
                                    </span>
                                  )}
                                  {story.category && (
                                    <span className="bg-sepia-700/50 px-2 py-1 rounded text-sepia-300">
                                      {story.category}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </motion.button>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Historiadores */}
                  {filteredHistorians.length > 0 && (
                    <section>
                      <div className="flex items-center gap-2 mb-4">
                        <Users className="text-sepia-500 w-5 h-5" />
                        <h3 className="text-lg font-serif text-sepia-100 uppercase tracking-widest">
                          Historiadores ({filteredHistorians.length})
                        </h3>
                      </div>
                      <div className="space-y-3">
                        {filteredHistorians.map(historian => (
                          <div
                            key={historian.id}
                            className="bg-sepia-800/30 hover:bg-sepia-800/60 rounded-xl p-4 transition-all group cursor-pointer"
                          >
                            <div className="flex items-start gap-4">
                              <img
                                src={historian.photo}
                                alt={historian.name}
                                className="w-16 h-16 rounded-lg object-cover sepia-filter group-hover:sepia-0 transition-all"
                              />
                              <div className="flex-1">
                                <h4 className="text-sepia-100 font-bold text-sm group-hover:text-sepia-400">
                                  {historian.name}
                                </h4>
                                <p className="text-sepia-500 text-xs mb-1 font-semibold">
                                  {historian.specialty}
                                </p>
                                <p className="text-sepia-400 text-xs line-clamp-2">
                                  {historian.bio}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Fotos Restauradas */}
                  {filteredRestoredPhotos.length > 0 && (
                    <section>
                      <div className="flex items-center gap-2 mb-4">
                        <ImageIcon className="text-sepia-500 w-5 h-5" />
                        <h3 className="text-lg font-serif text-sepia-100 uppercase tracking-widest">
                          Galería Restaurada ({filteredRestoredPhotos.length})
                        </h3>
                        {onViewGallery && (
                          <button
                            onClick={onViewGallery}
                            className="ml-auto text-xs text-sepia-500 hover:text-sepia-300 underline"
                          >
                            Ver todo
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {filteredRestoredPhotos.slice(0, 6).map(photo => (
                          <motion.div
                            key={photo.id}
                            whileHover={{ scale: 1.05 }}
                            className="bg-sepia-800/30 rounded-xl overflow-hidden cursor-pointer group"
                          >
                            <img
                              src={photo.url}
                              alt={photo.title}
                              className="w-full aspect-square object-cover sepia-filter group-hover:sepia-0 transition-all"
                            />
                            <div className="p-2">
                              <p className="text-sepia-100 text-xs font-bold line-clamp-1">
                                {photo.title}
                              </p>
                              {photo.era && (
                                <p className="text-sepia-500 text-[10px]">{photo.era}</p>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Fotos de Viaje */}
                  {filteredTravelPhotos.length > 0 && (
                    <section>
                      <div className="flex items-center gap-2 mb-4">
                        <MapPin className="text-sepia-500 w-5 h-5" />
                        <h3 className="text-lg font-serif text-sepia-100 uppercase tracking-widest">
                          Fotos del Viajero ({filteredTravelPhotos.length})
                        </h3>
                      </div>
                      <div className="space-y-3">
                        {filteredTravelPhotos.map(photo => (
                          <div
                            key={photo.id}
                            className="bg-sepia-800/30 hover:bg-sepia-800/60 rounded-xl p-4 transition-all group cursor-pointer"
                          >
                            <div className="flex items-start gap-4">
                              <img
                                src={photo.url}
                                alt={photo.character_name}
                                className="w-16 h-16 rounded-lg object-cover sepia-filter group-hover:sepia-0 transition-all"
                              />
                              <div className="flex-1">
                                <h4 className="text-sepia-100 font-bold text-sm group-hover:text-sepia-400">
                                  {photo.character_name}
                                </h4>
                                <p className="text-sepia-400 text-xs line-clamp-2 mt-1">
                                  {photo.description}
                                </p>
                                {photo.year && (
                                  <p className="text-sepia-500 text-[11px] mt-2">
                                    Año: {photo.year}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Productos */}
                  {filteredProducts.length > 0 && (
                    <section>
                      <div className="flex items-center gap-2 mb-4">
                        <ShoppingBag className="text-sepia-500 w-5 h-5" />
                        <h3 className="text-lg font-serif text-sepia-100 uppercase tracking-widest">
                          Tienda ({filteredProducts.length})
                        </h3>
                        {onViewShop && (
                          <button
                            onClick={onViewShop}
                            className="ml-auto text-xs text-sepia-500 hover:text-sepia-300 underline"
                          >
                            Ver tienda
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {filteredProducts.slice(0, 6).map(product => (
                          <motion.div
                            key={product.id}
                            whileHover={{ scale: 1.05 }}
                            className="bg-sepia-800/30 rounded-xl overflow-hidden cursor-pointer group"
                          >
                            <img
                              src={product.image_url}
                              alt={product.title}
                              className="w-full aspect-square object-cover sepia-filter group-hover:sepia-0 transition-all"
                            />
                            <div className="p-2">
                              <p className="text-sepia-100 text-xs font-bold line-clamp-1">
                                {product.title}
                              </p>
                              <p className="text-sepia-500 text-[11px] font-semibold">
                                ${product.price}
                              </p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </section>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
