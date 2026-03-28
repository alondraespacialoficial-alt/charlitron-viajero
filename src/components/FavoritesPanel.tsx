import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Heart, ArrowLeft, Scroll, ShoppingBag, Trash2, ExternalLink } from 'lucide-react';
import { getAllFavorites, removeFromFavorites, UserFavorite } from '../favoritesUtils';

interface FavoritesPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectStory?: (storyId: string) => void;
  onViewShop?: () => void;
}

export const FavoritesPanel: React.FC<FavoritesPanelProps> = ({
  isOpen,
  onClose,
  onSelectStory,
  onViewShop,
}) => {
  const [favorites, setFavorites] = useState<UserFavorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'story' | 'product'>('all');

  useEffect(() => {
    if (isOpen) {
      loadFavorites();
    }
  }, [isOpen]);

  const loadFavorites = async () => {
    setLoading(true);
    const data = await getAllFavorites();
    setFavorites(data);
    setLoading(false);
  };

  const handleRemove = async (favorite: UserFavorite) => {
    await removeFromFavorites(favorite.favorite_type, favorite.favorite_id);
    setFavorites((prev) => prev.filter((f) => f.id !== favorite.id));
  };

  const filteredFavorites =
    filter === 'all' ? favorites : favorites.filter((f) => f.favorite_type === filter);

  const storyCount = favorites.filter((f) => f.favorite_type === 'story').length;
  const productCount = favorites.filter((f) => f.favorite_type === 'product').length;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, x: -400 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -400 }}
          className="fixed left-0 top-0 h-screen w-full md:w-96 bg-sepia-950 border-r border-sepia-800 z-[200] flex flex-col shadow-2xl"
        >
          {/* Header */}
          <div className="border-b border-sepia-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Heart className="w-6 h-6 text-red-500 fill-current" />
                <h2 className="text-2xl font-serif text-sepia-100">Mis Favoritos</h2>
              </div>
              <button
                onClick={onClose}
                className="text-sepia-400 hover:text-sepia-100 p-2 hover:bg-sepia-800 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Stats */}
            <div className="flex gap-4 text-xs">
              <div className="bg-sepia-800/50 rounded-lg px-3 py-2">
                <p className="text-sepia-400">Historias</p>
                <p className="text-lg font-bold text-sepia-100">{storyCount}</p>
              </div>
              <div className="bg-sepia-800/50 rounded-lg px-3 py-2">
                <p className="text-sepia-400">Productos</p>
                <p className="text-lg font-bold text-sepia-100">{productCount}</p>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-2 p-4 border-b border-sepia-800">
            <button
              onClick={() => setFilter('all')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
                filter === 'all'
                  ? 'bg-red-500 text-white'
                  : 'bg-sepia-800/30 text-sepia-400 hover:text-sepia-100'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilter('story')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-1 ${
                filter === 'story'
                  ? 'bg-red-500 text-white'
                  : 'bg-sepia-800/30 text-sepia-400 hover:text-sepia-100'
              }`}
            >
              <Scroll className="w-3 h-3" />
              Historias
            </button>
            <button
              onClick={() => setFilter('product')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-1 ${
                filter === 'product'
                  ? 'bg-red-500 text-white'
                  : 'bg-sepia-800/30 text-sepia-400 hover:text-sepia-100'
              }`}
            >
              <ShoppingBag className="w-3 h-3" />
              Tienda
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="inline-block w-6 h-6 border-2 border-sepia-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : filteredFavorites.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                <Heart className="w-12 h-12 text-sepia-700 mb-4" />
                <h3 className="text-lg font-serif text-sepia-100 mb-2">
                  {filter === 'all'
                    ? 'Sin favoritos aún'
                    : filter === 'story'
                      ? 'Sin historias favoritas'
                      : 'Sin productos favoritos'}
                </h3>
                <p className="text-sepia-500 text-sm">
                  {filter === 'all'
                    ? 'Guarda historias y productos para verlos aquí'
                    : 'Comienza a guardar para verlos aquí'}
                </p>
              </div>
            ) : (
              <div className="space-y-3 p-4">
                {filteredFavorites.map((favorite) => (
                  <motion.div
                    key={favorite.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-sepia-800/30 rounded-xl p-3 border border-sepia-700/50 hover:bg-sepia-800/50 transition-all group"
                  >
                    <div className="flex gap-3">
                      {/* Image */}
                      {favorite.favorite_image && (
                        <img
                          src={favorite.favorite_image}
                          alt={favorite.favorite_title}
                          className="w-16 h-16 rounded-lg object-cover sepia-filter group-hover:sepia-0 transition-all"
                        />
                      )}

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="flex-1 min-w-0">
                            <p className="text-sepia-100 font-bold text-sm truncate">
                              {favorite.favorite_title || 'Sin título'}
                            </p>
                            <p className="text-[10px] text-sepia-500 uppercase tracking-widest font-semibold">
                              {favorite.favorite_type === 'story' ? '📜 Historia' : '🛍️ Producto'}
                            </p>
                          </div>
                          <button
                            onClick={() => handleRemove(favorite)}
                            className="text-red-400 hover:bg-red-400/10 p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Action Button */}
                        {favorite.favorite_type === 'story' ? (
                          <button
                            onClick={() => {
                              if (onSelectStory) {
                                onSelectStory(favorite.favorite_id);
                                onClose();
                              }
                            }}
                            className="w-full mt-2 bg-sepia-700 hover:bg-sepia-600 text-sepia-100 py-2 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Ver Historia
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              if (onViewShop) {
                                onViewShop();
                                onClose();
                              }
                            }}
                            className="w-full mt-2 bg-sepia-700 hover:bg-sepia-600 text-sepia-100 py-2 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
                          >
                            <ShoppingBag className="w-3 h-3" />
                            Ver Tienda
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {filteredFavorites.length > 0 && (
            <div className="border-t border-sepia-800 p-4">
              <button
                onClick={loadFavorites}
                className="w-full bg-sepia-700 hover:bg-sepia-600 text-sepia-100 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all"
              >
                Refrescar
              </button>
            </div>
          )}
        </motion.div>
      )}

      {/* Overlay */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/30 z-[190] md:hidden"
        />
      )}
    </AnimatePresence>
  );
};
