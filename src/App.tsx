/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Search, Play, Image as ImageIcon, Share2, Clock, Camera, MessageCircle, ArrowLeft, Menu, X, Facebook, Calendar, Volume2, Send, ChevronRight, ChevronLeft, Heart, MapPin, ExternalLink, Maximize2, Scroll, Shield, Users, ShoppingBag, Trophy, Frame } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { STORIES, WHATSAPP_LINK, FACEBOOK_LINK, TIKTOK_LINK } from './constants';
import { Story, TravelPhoto, Historian, Sponsor, RestoredPhoto, Product, Contest } from './types';
import { FamilyTreeManager } from './components/FamilyTreeManager';
import { supabase } from './supabase';
import { AdminPanel } from './components/AdminPanel';
import { LegalPage } from './components/LegalPage';
import { HistoriansSection } from './components/HistoriansSection';
import { RestoredGallery } from './components/RestoredGallery';
import { InvestigationSection } from './components/InvestigationSection';
import { ShopSection } from './components/ShopSection';
import { ContestsSection } from './components/ContestsSection';
import { MuralSection } from './components/MuralSection';
import { SearchResults } from './components/SearchResults';
import { FavoritesPanel } from './components/FavoritesPanel';
import { InstallPrompt } from './components/InstallPrompt';
import { updateMetaTags, generateSlug, generateShareUrl, resetMetaTags } from './seoUtils';
import { trackPageView, getPageViews, formatViewCount } from './analyticsUtils';
import { addToFavorites, removeFromFavorites, isFavorited } from './favoritesUtils';

// --- Components ---

const Timeline = ({ stories, onSelectStory }: { stories: Story[], onSelectStory: (s: Story) => void }) => {
  if (stories.length === 0) return null;
  const years = Array.from(new Set(stories.map(s => s.year))).sort((a, b) => parseInt(a) - parseInt(b));
  
  return (
    <div className="py-12 bg-sepia-950/50 border-y border-sepia-900 overflow-hidden relative group">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center gap-4 mb-8">
          <Calendar className="text-sepia-500 w-5 h-5" />
          <h3 className="text-sepia-100 font-serif text-xl uppercase tracking-widest">Línea del Tiempo</h3>
        </div>
        
        <div className="flex gap-8 overflow-x-auto pb-6 scrollbar-hide snap-x">
          {years.map(year => {
            const storiesInYear = stories.filter(s => s.year === year);
            return (
              <div key={year} className="flex-shrink-0 snap-start">
                <div className="text-sepia-500 font-serif text-4xl mb-4 opacity-50">{year}</div>
                <div className="flex gap-4">
                  {storiesInYear.map(story => (
                    <motion.button
                      key={story.id}
                      whileHover={{ scale: 1.05, y: -5 }}
                      onClick={() => onSelectStory(story)}
                      className="w-48 text-left group/item"
                    >
                      <div className="aspect-[4/3] rounded-xl overflow-hidden mb-3 border border-sepia-800">
                        <img 
                          src={story.thumbnail} 
                          alt={story.title} 
                          className="w-full h-full object-cover sepia-filter group-hover/item:sepia-0 transition-all duration-500 pointer-events-none select-none"
                          referrerPolicy="no-referrer"
                          onContextMenu={(e) => e.preventDefault()}
                          onDragStart={(e) => e.preventDefault()}
                        />
                        {/* Small Watermark */}
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-5 group-hover/item:opacity-10 transition-opacity">
                          <span className="text-white text-[10px] font-serif tracking-widest rotate-[-15deg]">Charlitron®</span>
                        </div>
                      </div>
                      <h4 className="text-sepia-100 font-serif text-sm line-clamp-1 group-hover/item:text-sepia-400 transition-colors">{story.title}</h4>
                    </motion.button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const Guestbook = ({ storyId }: { storyId: string }) => {
  const [comments, setComments] = useState<{ id: string, name: string, content: string, created_at: string }[]>([]);
  const [newName, setNewName] = useState('');
  const [newContent, setNewContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchComments = async () => {
      const { data } = await supabase
        .from('comments')
        .select('*')
        .eq('story_id', storyId)
        .order('created_at', { ascending: false });
      if (data) setComments(data);
    };
    fetchComments();
  }, [storyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newContent) return;
    setIsSubmitting(true);
    
    const { data, error } = await supabase
      .from('comments')
      .insert([{ story_id: storyId, name: newName, content: newContent }])
      .select();

    if (!error && data) {
      setComments([data[0], ...comments]);
      setNewName('');
      setNewContent('');
    }
    setIsSubmitting(false);
  };

  return (
    <section className="mt-24 border-t border-sepia-200 pt-24">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-12">
          <MessageCircle className="text-sepia-600 w-8 h-8" />
          <h3 className="text-3xl font-serif text-sepia-950">Libro de Visitas</h3>
        </div>

        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-3xl shadow-xl border border-sepia-100 mb-16">
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-xs uppercase tracking-widest font-bold text-sepia-600 mb-2">Tu Nombre</label>
              <input 
                type="text" 
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className="w-full bg-sepia-50 border border-sepia-100 rounded-xl p-4 outline-none focus:border-sepia-400 transition-all"
                placeholder="Ej: Familia Martínez"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest font-bold text-sepia-600 mb-2">Tu Mensaje</label>
              <textarea 
                rows={4}
                value={newContent}
                onChange={e => setNewContent(e.target.value)}
                className="w-full bg-sepia-50 border border-sepia-100 rounded-xl p-4 outline-none focus:border-sepia-400 transition-all resize-none"
                placeholder="Escribe un mensaje para el recuerdo..."
              />
            </div>
            <button 
              disabled={isSubmitting}
              className="bg-sepia-950 text-sepia-100 py-4 rounded-xl font-bold uppercase tracking-widest hover:bg-sepia-800 transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? 'Enviando...' : <><Send className="w-4 h-4" /> Dejar Mensaje</>}
            </button>
          </div>
        </form>

        <div className="space-y-8">
          {comments.length === 0 ? (
            <p className="text-center text-sepia-500 italic font-serif">Sé el primero en dejar un mensaje en este recuerdo.</p>
          ) : (
            comments.map(comment => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={comment.id} 
                className="border-l-4 border-sepia-300 pl-6 py-2"
              >
                <p className="text-sepia-900 mb-2 font-light italic">"{comment.content}"</p>
                <div className="flex items-center gap-3">
                  <span className="text-sepia-950 font-bold text-sm uppercase tracking-wider">{comment.name}</span>
                  <span className="text-sepia-400 text-xs">{new Date(comment.created_at).toLocaleDateString()}</span>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </section>
  );
};

const Navbar = ({ onHome, onLogoClick, onGallery, onShop, onInvestigation, onFamilyTree, onFavorites, onContests, onMural, investigationEnabled }: { 
  onHome: () => void, 
  onLogoClick: () => void, 
  onGallery: () => void,
  onShop: () => void,
  onInvestigation: () => void,
  onFamilyTree: () => void,
  onFavorites: () => void,
  onContests: () => void,
  onMural: () => void,
  investigationEnabled: boolean
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${isScrolled ? 'bg-sepia-950/90 backdrop-blur-md py-3 shadow-xl' : 'bg-transparent py-6'}`}>
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <div className="flex items-center gap-2 group cursor-pointer z-50">
            <button 
              onClick={(e) => { 
                e.stopPropagation();
                onLogoClick(); 
              }} 
              className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center group-hover:scale-110 transition-transform"
            >
              <img 
                src="https://image2url.com/r2/default/images/1774244334117-f0974987-8590-4271-a1af-4957fc21a8cc.png" 
                alt="Charlitron Logo" 
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </button>
            <button 
              onClick={() => { onHome(); setIsMenuOpen(false); }}
              className="flex flex-col items-start"
            >
              <span className="font-serif text-lg md:text-xl font-bold text-sepia-100 tracking-wider uppercase leading-none">
                Charlitron®
              </span>
              <span className="text-[8px] md:text-[10px] text-sepia-400 font-bold tracking-[0.2em] uppercase mt-0.5">
                El Viajero del Tiempo
              </span>
            </button>
          </div>
          
          <div className="flex items-center gap-4 md:gap-8">
            <div className="hidden lg:flex items-center gap-6 mr-4 border-r border-sepia-800 pr-6">
              <a href={FACEBOOK_LINK} target="_blank" rel="noreferrer" className="text-sepia-300 hover:text-sepia-100 transition-colors">
                <Facebook className="w-5 h-5" />
              </a>
              <a href={TIKTOK_LINK} target="_blank" rel="noreferrer" className="text-sepia-300 hover:text-sepia-100 transition-colors flex items-center gap-1">
                <span className="text-xs font-bold tracking-tighter">TikTok</span>
              </a>
            </div>
            
            <div className="hidden md:flex items-center gap-8">
              <button onClick={onHome} className="text-sepia-100 hover:text-sepia-400 transition-colors text-sm uppercase tracking-widest font-medium">Inicio</button>
              <button onClick={onGallery} className="text-sepia-100 hover:text-sepia-400 transition-colors text-sm uppercase tracking-widest font-medium">Galería</button>
              <button onClick={onShop} className="text-sepia-100 hover:text-sepia-400 transition-colors text-sm uppercase tracking-widest font-medium flex items-center gap-2">
                <ShoppingBag className="w-4 h-4" />
                Tienda
              </button>
              <button onClick={onFavorites} className="text-sepia-100 hover:text-sepia-400 transition-colors text-sm uppercase tracking-widest font-medium flex items-center gap-2">
                <Heart className="w-4 h-4" />
                Favoritos
              </button>
              <button onClick={onFamilyTree} className="text-sepia-100 hover:text-sepia-400 transition-colors text-sm uppercase tracking-widest font-medium flex items-center gap-2">
                <Users className="w-4 h-4" />
                Árbol Genealógico
              </button>
              {investigationEnabled && (
                <button onClick={onInvestigation} className="text-sepia-100 hover:text-sepia-400 transition-colors text-sm uppercase tracking-widest font-medium flex items-center gap-2">
                  <Scroll className="w-4 h-4" />
                  Investiga tu Historia
                </button>
              )}
              <button onClick={onContests} className="text-sepia-100 hover:text-sepia-400 transition-colors text-sm uppercase tracking-widest font-medium flex items-center gap-2">
                <Trophy className="w-4 h-4" />
                Concursos
              </button>
              <button onClick={onMural} className="text-sepia-100 hover:text-sepia-400 transition-colors text-sm uppercase tracking-widest font-medium flex items-center gap-2">
                <Frame className="w-4 h-4" />
                Mural
              </button>
              <a href="#historias" className="text-sepia-100 hover:text-sepia-400 transition-colors text-sm uppercase tracking-widest font-medium">Historias</a>
              <a href={WHATSAPP_LINK} target="_blank" rel="noreferrer" className="bg-sepia-500 hover:bg-sepia-400 text-sepia-950 px-6 py-2 rounded-full text-sm font-bold uppercase tracking-widest transition-all">Contacto</a>
            </div>

            <div className="flex items-center gap-4">
              <img 
                src="https://image2url.com/r2/default/images/1774244334117-f0974987-8590-4271-a1af-4957fc21a8cc.png" 
                alt="Logo Charlitron" 
                className="h-10 md:h-12 w-auto object-contain"
                referrerPolicy="no-referrer"
              />
              <button 
                onClick={toggleMenu}
                className="md:hidden text-sepia-100 p-2 z-50"
              >
                {isMenuOpen ? <X className="w-8 h-8" /> : <Menu className="w-8 h-8" />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-40 bg-sepia-950 flex flex-col items-center justify-center gap-8 p-6 md:hidden"
          >
            <button 
              onClick={() => { onHome(); setIsMenuOpen(false); }}
              className="text-sepia-100 text-2xl font-serif uppercase tracking-widest"
            >
              Inicio
            </button>
            <button 
              onClick={() => { onGallery(); setIsMenuOpen(false); }}
              className="text-sepia-100 text-2xl font-serif uppercase tracking-widest"
            >
              Galería
            </button>
            <button 
              onClick={() => { onShop(); setIsMenuOpen(false); }}
              className="text-sepia-100 text-2xl font-serif uppercase tracking-widest flex items-center gap-3"
            >
              <ShoppingBag className="w-6 h-6" />
              Tienda
            </button>
            <button 
              onClick={() => { onFavorites(); setIsMenuOpen(false); }}
              className="text-sepia-100 text-2xl font-serif uppercase tracking-widest flex items-center gap-3"
            >
              <Heart className="w-6 h-6" />
              Favoritos
            </button>
            <button 
              onClick={() => { onFamilyTree(); setIsMenuOpen(false); }}
              className="text-sepia-100 text-2xl font-serif uppercase tracking-widest flex items-center gap-3"
            >
              <Users className="w-6 h-6" />
              Árbol Genealógico
            </button>
            {investigationEnabled && (
              <button 
                onClick={() => { onInvestigation(); setIsMenuOpen(false); }}
                className="text-sepia-100 text-2xl font-serif uppercase tracking-widest flex items-center gap-3"
              >
                <Scroll className="w-6 h-6" />
                Investiga tu Historia
              </button>
            )}
            <button 
              onClick={() => { onContests(); setIsMenuOpen(false); }}
              className="text-sepia-100 text-2xl font-serif uppercase tracking-widest flex items-center gap-3"
            >
              <Trophy className="w-6 h-6" />
              Concursos
            </button>
            <button 
              onClick={() => { onMural(); setIsMenuOpen(false); }}
              className="text-sepia-100 text-2xl font-serif uppercase tracking-widest flex items-center gap-3"
            >
              <Frame className="w-6 h-6" />
              Mural
            </button>
            <a 
              href="#historias" 
              onClick={() => setIsMenuOpen(false)}
              className="text-sepia-100 text-2xl font-serif uppercase tracking-widest"
            >
              Historias
            </a>
            <a 
              href={WHATSAPP_LINK} 
              target="_blank" 
              rel="noreferrer"
              onClick={() => setIsMenuOpen(false)}
              className="bg-sepia-500 text-sepia-950 px-10 py-4 rounded-full text-lg font-bold uppercase tracking-widest"
            >
              Contacto
            </a>
            
            <div className="flex gap-8 mt-8">
              <a href={FACEBOOK_LINK} target="_blank" rel="noreferrer" className="text-sepia-300 hover:text-sepia-100">
                <Facebook className="w-8 h-8" />
              </a>
              <a href={TIKTOK_LINK} target="_blank" rel="noreferrer" className="text-sepia-300 hover:text-sepia-100 flex items-center gap-2">
                <span className="text-xl font-bold tracking-tighter">TikTok</span>
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

const Hero = ({ onSearch, onSeeAll, onGallery, onInvestigation, investigationEnabled, introVideoUrl, introVideoIsVertical, heroBgUrl }: { 
  onSearch: (term: string) => void, 
  onSeeAll: () => void, 
  onGallery: () => void,
  onInvestigation: () => void,
  investigationEnabled: boolean,
  introVideoUrl?: string,
  introVideoIsVertical?: boolean,
  heroBgUrl?: string
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showIntro, setShowIntro] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchTerm);
  };

  const defaultBg = "https://image2url.com/r2/default/images/1773069369956-6e7ee890-47a9-4492-ba3d-bdf66ac19a98.png";

  return (
    <section className="relative h-screen flex items-center justify-center overflow-hidden">
      {/* Background with blur effect */}
      <div className="absolute inset-0 z-0">
        <img 
          src={heroBgUrl || defaultBg} 
          alt="Charlitron® Portada" 
          className="w-full h-full object-cover object-center sepia-filter scale-110 blur-sm"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 cinematic-overlay"></div>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <img 
            src="https://image2url.com/r2/default/images/1774244334117-f0974987-8590-4271-a1af-4957fc21a8cc.png" 
            alt="Charlitron Logo" 
            className="w-24 h-24 md:w-32 md:h-32 mx-auto mb-8 object-contain drop-shadow-2xl"
            referrerPolicy="no-referrer"
          />
          <h2 className="text-sepia-400 uppercase tracking-[0.4em] text-sm md:text-base font-bold mb-4 block">
            Charlitron® Viajero del Tiempo
          </h2>
          <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-serif text-sepia-100 mb-6 leading-tight">
            Bienvenido al Baúl de los Recuerdos
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl text-sepia-200 font-light mb-12 italic">
            Las memorias no se guardan. Se vuelven legado.
          </p>

          <form onSubmit={handleSubmit} className="relative max-w-2xl mx-auto mb-4">
            <input 
              type="text" 
              placeholder="Busca una persona, un negocio, una familia o un lugar"
              className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-full py-4 md:py-5 px-6 md:px-8 pr-14 md:pr-16 text-sepia-100 placeholder:text-sepia-300 focus:outline-none focus:ring-2 focus:ring-sepia-500 transition-all text-base md:text-lg"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button type="submit" className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 bg-sepia-500 rounded-full flex items-center justify-center hover:bg-sepia-400 transition-colors">
              <Search className="text-sepia-950 w-5 h-5 md:w-6 md:h-6" />
            </button>
          </form>
          <p className="text-sepia-400 text-xs md:text-sm mb-8 tracking-wide">
            Explora historias que ya forman parte de la memoria viva de San Luis.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <button 
              onClick={onSeeAll}
              className="text-sepia-200 hover:text-sepia-100 underline underline-offset-8 decoration-sepia-500/50 hover:decoration-sepia-500 transition-all uppercase tracking-widest text-sm font-bold"
            >
              Ver todas las historias
            </button>

            <button 
              onClick={onGallery}
              className="flex items-center gap-3 border-2 border-sepia-500 text-sepia-500 hover:bg-sepia-500 hover:text-sepia-950 px-8 py-4 rounded-full font-bold uppercase tracking-widest text-sm transition-all"
            >
              <ImageIcon className="w-5 h-5" />
              Galería Restaurada
            </button>

            {investigationEnabled && (
              <button 
                onClick={onInvestigation}
                className="flex items-center gap-3 border-2 border-sepia-100 text-sepia-100 hover:bg-sepia-100 hover:text-sepia-950 px-8 py-4 rounded-full font-bold uppercase tracking-widest text-sm transition-all"
              >
                <Scroll className="w-5 h-5" />
                Investiga tu Apellido
              </button>
            )}

            {introVideoUrl && (
              <motion.button 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowIntro(true)}
                className="flex items-center gap-3 bg-sepia-500 hover:bg-sepia-400 text-sepia-950 px-8 py-4 rounded-full font-bold uppercase tracking-widest text-sm transition-all shadow-[0_0_30px_rgba(212,163,115,0.3)] group"
              >
                <div className="w-8 h-8 bg-sepia-950 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Play className="w-4 h-4 text-sepia-500 fill-current ml-1" />
                </div>
                Ver Video de Presentación
              </motion.button>
            )}
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {showIntro && introVideoUrl && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-sepia-950/95 backdrop-blur-md flex items-center justify-center p-6"
          >
            <button 
              onClick={() => setShowIntro(false)}
              className="absolute top-6 right-6 text-sepia-100 p-2 hover:bg-sepia-800 rounded-full transition-colors"
            >
              <X className="w-10 h-10" />
            </button>
            <div className={`w-full ${introVideoIsVertical ? 'max-w-[400px] aspect-[9/16]' : 'max-w-5xl aspect-video'} bg-black rounded-2xl overflow-hidden shadow-2xl border-4 border-sepia-800`}>
              {introVideoUrl.includes('youtube.com') || introVideoUrl.includes('youtu.be') ? (
                <iframe 
                  src={introVideoUrl.replace('watch?v=', 'embed/').replace('shorts/', 'embed/')}
                  className="w-full h-full"
                  allowFullScreen
                />
              ) : (
                <video 
                  src={introVideoUrl} 
                  controls 
                  autoPlay
                  className="w-full h-full"
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-sepia-400 rounded-full flex justify-center pt-2">
          <div className="w-1 h-2 bg-sepia-400 rounded-full"></div>
        </div>
      </div>
    </section>
  );
};

const About = () => (
  <section className="py-24 bg-sepia-100">
    <div className="max-w-4xl mx-auto px-6 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <img 
          src="https://image2url.com/r2/default/images/1774244334117-f0974987-8590-4271-a1af-4957fc21a8cc.png" 
          alt="Charlitron Logo" 
          className="w-16 h-16 mx-auto mb-6 object-contain opacity-80"
          referrerPolicy="no-referrer"
        />
        <span className="text-sepia-600 uppercase tracking-[0.3em] text-sm font-bold mb-4 block">Charlitron® Viajero del Tiempo</span>
        <h2 className="text-4xl md:text-5xl font-serif mb-8">Un archivo vivo de memoria</h2>
        <p className="text-xl text-sepia-800 leading-relaxed font-light">
          El Baúl de los Recuerdos del Viajero del Tiempo es el primer espacio creado para transformar historias de familias, negocios y lugares en recuerdos vivos que nunca dejen de respirarse.
        </p>
      </motion.div>
    </div>
  </section>
);

const Biography = () => (
  <section className="py-24 bg-sepia-950 text-sepia-100 overflow-hidden relative">
    {/* Background Texture */}
    <div className="absolute inset-0 opacity-5 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/paper.png')]"></div>
    
    <div className="max-w-7xl mx-auto px-6 relative z-10">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        {/* Image Column */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative"
        >
          <div className="relative z-10 rounded-2xl overflow-hidden border border-sepia-800 shadow-2xl">
            <img 
              src="https://image2url.com/r2/default/images/1774207717060-c5974088-18bf-4a0f-956b-67625c091acb.png" 
              alt="Adrián Álvarez Carlos - El Viajero del Tiempo" 
              className="w-full h-auto object-cover sepia-filter grayscale-[0.2] hover:scale-105 transition-transform duration-700"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-sepia-950/60 to-transparent"></div>
          </div>
          {/* Decorative elements */}
          <div className="absolute -top-6 -left-6 w-24 h-24 border-t-2 border-l-2 border-sepia-500/30"></div>
          <div className="absolute -bottom-6 -right-6 w-24 h-24 border-b-2 border-r-2 border-sepia-500/30"></div>
          
          <div className="absolute top-1/2 -right-8 w-16 h-16 bg-sepia-500 rounded-full flex items-center justify-center -translate-y-1/2 hidden lg:flex shadow-xl">
            <Shield className="text-sepia-950 w-8 h-8" />
          </div>
        </motion.div>

        {/* Text Column */}
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="space-y-8"
        >
          <div>
            <h2 className="text-2xl md:text-3xl font-serif text-sepia-100 mb-2">¿Quién es Charlitron el Viajero del Tiempo?</h2>
            <span className="text-sepia-500 uppercase tracking-[0.3em] text-[10px] md:text-xs font-bold mb-6 block border-b border-sepia-800 pb-4">Biografía del Fundador</span>
            <h3 className="text-4xl md:text-5xl lg:text-6xl font-serif mb-4 leading-tight">Adrián Álvarez Carlos</h3>
            <h4 className="text-xl md:text-2xl text-sepia-400 font-light italic">Fundador de Charlitron, creador del Sistema A&A&A y del Método Zerlat.</h4>
          </div>

          <div className="space-y-6 text-sepia-200 font-light leading-relaxed text-lg">
            <p className="font-medium text-sepia-100 text-xl italic border-l-4 border-sepia-500 pl-6 py-2">
              "Soy un viajero del tiempo. No de los que cambian la historia… sino de los que la recuerdan."
            </p>
            
            <p>
              Durante más de 20 años he trabajado en estrategia, ventas reales y publicidad en campo. De esa experiencia nació <strong>Charlitron</strong>, una visión que une tecnología, emoción y propósito para crear campañas que no solo se ven… se sienten.
            </p>

            <p>
              Entendí que las marcas, los negocios y las personas también tienen memoria. Así nació una nueva etapa: <strong>Charlitron Viajero del Tiempo</strong>.
            </p>

            <p>
              Un proyecto que rescata historias, revive momentos y reconstruye recuerdos a través de <strong>inteligencia artificial</strong>, investigación histórica y narrativa emocional. Aquí no solo recreamos imágenes… <strong>Devolvemos vida.</strong>
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6">
              <div className="text-center p-6 bg-sepia-900/40 rounded-xl border border-sepia-800/50 flex flex-col items-center justify-center">
                <div className="w-1 h-1 bg-sepia-500 rounded-full mb-4"></div>
                <p className="text-xs uppercase tracking-widest font-bold text-sepia-100">Recordar de dónde venimos</p>
              </div>
              <div className="text-center p-6 bg-sepia-900/40 rounded-xl border border-sepia-800/50 flex flex-col items-center justify-center">
                <div className="w-1 h-1 bg-sepia-500 rounded-full mb-4"></div>
                <p className="text-xs uppercase tracking-widest font-bold text-sepia-100">Reconectar con lo que somos</p>
              </div>
              <div className="text-center p-6 bg-sepia-900/40 rounded-xl border border-sepia-800/50 flex flex-col items-center justify-center">
                <div className="w-1 h-1 bg-sepia-500 rounded-full mb-4"></div>
                <p className="text-xs uppercase tracking-widest font-bold text-sepia-100">Valorar lo que aún tenemos</p>
              </div>
            </div>

            <p>
              Desde calles antiguas de <strong>San Luis Potosí</strong>, negocios que ya no existen, tradiciones olvidadas… hasta homenajes a personas que dejaron huella. Además, he desarrollado el <strong>Sistema A&A&A</strong>, donde la IA y la emoción trabajan juntas, y el <strong>Método Zerlat</strong>, una vía de reconstrucción personal para reconectar con la esencia.
            </p>

            <div className="pt-8 border-t border-sepia-800">
              <p className="text-sepia-400 text-sm uppercase tracking-[0.2em] mb-2">Misión Clara:</p>
              <p className="text-sepia-100 text-xl font-serif italic">
                Activar recuerdos, personas y proyectos con alma. Demostrar que el pasado… no está muerto.
              </p>
            </div>

            <p className="text-sepia-100 font-serif text-2xl italic pt-4 text-center lg:text-left">
              "No vinimos solo a avanzar… Vinimos a recordar."
            </p>

            {/* Books Section */}
            <div className="pt-10 border-t border-sepia-800">
              <p className="text-sepia-400 text-sm uppercase tracking-[0.2em] mb-2">Obras Publicadas:</p>
              <h4 className="text-sepia-100 text-xl font-serif mb-6">Adquiere los libros de Adrián Álvarez Carlos</h4>
              <div className="flex flex-wrap gap-6">
                {[
                  {
                    title: '¿A qué realmente vengo al mundo?: 12 claves para recordar lo que el sistema quiso que olvidaras',
                    cover: 'https://image2url.com/r2/default/images/1775196639063-785f29e7-3933-4b4f-b083-48efed064b4e.jpg',
                    url: 'https://www.amazon.com.mx/stores/author/B0FKY392PJ',
                  },
                  {
                    title: 'El Mapa del Éxito Real: 12 llaves invisibles para construir sin forzar y liderar desde el alma',
                    cover: 'https://image2url.com/r2/default/images/1775197036814-cd9d796f-b4c4-4036-be6f-db2de668141f.jpg',
                    url: 'https://www.amazon.com.mx/Mapa-del-%C3%89xito-Real-invisibles/dp/B0FQ32CKS5/ref=tmm_pap_swatch_0',
                  },
                ].map((book) => (
                  <motion.a
                    key={book.url}
                    href={book.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ scale: 1.04, y: -4 }}
                    className="group flex flex-col items-center w-36 md:w-44 flex-shrink-0"
                    title={book.title}
                  >
                    <div className="w-full aspect-[2/3] rounded-xl overflow-hidden border-2 border-sepia-700 shadow-xl group-hover:border-sepia-400 transition-all duration-300 relative">
                      <img
                        src={book.cover}
                        alt={book.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                        onContextMenu={(e) => e.preventDefault()}
                        onDragStart={(e) => e.preventDefault()}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-sepia-950/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4">
                        <span className="text-sepia-100 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
                          <ExternalLink className="w-3 h-3" /> Ver en Amazon
                        </span>
                      </div>
                    </div>
                    <p className="mt-3 text-sepia-300 text-xs font-medium text-center leading-snug line-clamp-3 group-hover:text-sepia-100 transition-colors">
                      {book.title}
                    </p>
                  </motion.a>
                ))}
              </div>
              <a
                href="https://www.amazon.com.mx/stores/author/B0FKY392PJ"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-6 text-sepia-400 hover:text-sepia-100 transition-colors text-xs uppercase tracking-widest font-bold border border-sepia-700 hover:border-sepia-400 px-5 py-2.5 rounded-full"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Ver todos mis libros en Amazon
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  </section>
);

const HowItWorks = () => {
  const steps = [
    {
      icon: <Search className="w-8 h-8" />,
      title: "Busca un nombre",
      text: "Escribe el nombre de una persona, un negocio o un lugar."
    },
    {
      icon: <Play className="w-8 h-8" />,
      title: "Entra en la historia",
      text: "Te llevamos a una página con la narrativa, el video y fotos del recuerdo."
    },
    {
      icon: <Share2 className="w-8 h-8" />,
      title: "Comparte con tu familia",
      text: "Comparte el enlace para que otros también viajen al pasado contigo."
    }
  ];

  return (
    <section className="py-24 bg-sepia-200">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-3 gap-12">
          {steps.map((step, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.2 }}
              className="text-center group"
            >
              <div className="w-20 h-20 bg-sepia-950 rounded-2xl flex items-center justify-center mx-auto mb-8 text-sepia-400 group-hover:bg-sepia-800 transition-colors shadow-lg rotate-3 group-hover:rotate-0">
                {step.icon}
              </div>
              <h3 className="text-2xl font-serif mb-4">{step.title}</h3>
              <p className="text-sepia-800 leading-relaxed">{step.text}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const getEmbedUrl = (url: string) => {
  if (!url) return '';
  
  // YouTube
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    // Handle shorts specifically
    if (url.includes('/shorts/')) {
      const match = url.match(/\/shorts\/([^?#&]+)/);
      if (match) return `https://www.youtube.com/embed/${match[1]}?autoplay=0&rel=0&modestbranding=1`;
    }
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}?autoplay=0&rel=0&modestbranding=1` : url;
  }
  
  // TikTok
  if (url.includes('tiktok.com')) {
    if (url.includes('/embed/')) return url;
    const match = url.match(/\/video\/(\d+)/);
    if (match) return `https://www.tiktok.com/embed/v2/${match[1]}`;
  }

  // Vimeo
  if (url.includes('vimeo.com')) {
    const match = url.match(/vimeo\.com\/(\d+)/);
    if (match) return `https://player.vimeo.com/video/${match[1]}`;
  }
  
  return url;
};

const StoryCard = ({ story, onClick }: { story: Story, onClick: () => void }) => (
  <motion.div 
    whileHover={{ y: -10 }}
    className="bg-sepia-50 rounded-2xl overflow-hidden shadow-lg border border-sepia-200 flex flex-col h-full group cursor-pointer"
    onClick={onClick}
  >
    <div className="relative h-64 overflow-hidden bg-sepia-200">
      {story.thumbnail ? (
        <img 
          src={story.thumbnail} 
          alt={story.title} 
          className="w-full h-full object-cover sepia-filter group-hover:scale-110 transition-transform duration-700"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center text-sepia-400">
          <ImageIcon className="w-12 h-12 mb-2" />
          <span className="text-xs font-serif italic">Sin imagen de portada</span>
        </div>
      )}
      <div className="absolute top-4 left-4 bg-sepia-950/80 text-sepia-300 px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase">
        {story.year}
      </div>
    </div>
    <div className="p-8 flex flex-col flex-grow">
      <h3 className="text-2xl font-serif mb-3 leading-tight group-hover:text-sepia-600 transition-colors">{story.title}</h3>
      <p className="text-sepia-700 mb-8 line-clamp-2 font-light">{story.description}</p>
      <button 
        className="mt-auto flex items-center gap-2 text-sepia-900 font-bold uppercase tracking-widest text-xs hover:text-sepia-600 transition-colors group/btn"
      >
        Ver historia 
        <div className="w-6 h-[1px] bg-sepia-900 group-hover/btn:w-10 transition-all"></div>
      </button>
    </div>
  </motion.div>
);

const FeaturedStories = ({ stories, onSelectStory, selectedCategory, onCategoryChange }: { stories: Story[], onSelectStory: (story: Story) => void, selectedCategory: string, onCategoryChange: (cat: string) => void }) => {
  const categories = ['Todos', 'Familia', 'Negocio', 'Lugar', 'Evento', 'Monumentos', 'Personajes'];
  
  const filteredStories = selectedCategory === 'Todos' 
    ? stories 
    : stories.filter(s => s.category === selectedCategory);

  return (
    <section id="historias" className="py-24 bg-sepia-100">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div>
            <span className="text-sepia-600 uppercase tracking-[0.3em] text-sm font-bold mb-4 block">Archivo Cinematográfico</span>
            <h2 className="text-4xl md:text-5xl font-serif">Historias destacadas</h2>
          </div>
          <div className="h-[1px] flex-grow bg-sepia-300 mx-8 hidden md:block mb-4"></div>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-3 mb-12">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => onCategoryChange(cat)}
              className={`px-6 py-2 rounded-full text-sm font-bold uppercase tracking-widest transition-all ${selectedCategory === cat ? 'bg-sepia-950 text-sepia-100 shadow-lg' : 'bg-sepia-200 text-sepia-700 hover:bg-sepia-300'}`}
            >
              {cat}
            </button>
          ))}
        </div>
        
        {filteredStories.length === 0 ? (
          <div className="text-center py-20 bg-sepia-50 rounded-3xl border-2 border-dashed border-sepia-200">
            <Clock className="w-12 h-12 text-sepia-300 mx-auto mb-4" />
            <p className="text-sepia-500 font-serif italic text-xl">No hay historias en esta categoría...</p>
            <p className="text-sepia-400 text-sm mt-2">Prueba con otra categoría o busca en el inicio.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredStories.map((story) => (
              <div key={story.id}>
                <StoryCard story={story} onClick={() => onSelectStory(story)} />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

const isSpotifyLink = (url: string) => url.includes('spotify.com');
const getSpotifyEmbedUrl = (url: string) => {
  try {
    const urlObj = new URL(url);
    let path = urlObj.pathname;
    // Remove internationalization prefix if present (e.g., /intl-es)
    path = path.replace(/^\/intl-[a-z]{2}/, '');
    return `https://open.spotify.com/embed${path}`;
  } catch (e) {
    return url;
  }
};

const StoryDetail = ({ story, onBack, onLike }: { story: Story, onBack: () => void, onLike: (id: string, newLikes: number) => void }) => {
  const [password, setPassword] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(!story.password);
  const [error, setError] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [likes, setLikes] = useState(story.likes || 0);
  const [hasLiked, setHasLiked] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState<number | null>(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [viewCount, setViewCount] = useState<number | null>(null);
  const [isFav, setIsFav] = useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    
    // Generar slug si no existe
    const slug = story.slug || generateSlug(story.title, story.id);
    
    // Actualizar meta tags con información de la historia
    updateMetaTags(
      story.title,
      story.description || story.fullNarrative.slice(0, 160),
      story.thumbnail,
      slug,
      story.category,
      story.year
    );
    
    // Check if user already liked this story in this session/localstorage
    const likedStories = JSON.parse(localStorage.getItem('charlitron_likes') || '[]');
    if (likedStories.includes(story.id)) {
      setHasLiked(true);
    }
    // Sync likes from story prop if it changed externally
    setLikes(story.likes || 0);
    
    // Cleanup: restaurar meta tags generales cuando se vuelve atrás
    return () => {
      resetMetaTags();
    };
  }, [story.id, story.likes, story.title, story.description, story.thumbnail, story.slug]);

  // Cargar conteo de vistas
  useEffect(() => {
    const loadViewCount = async () => {
      const count = await getPageViews(story.id);
      setViewCount(count);
    };
    loadViewCount();
  }, [story.id]);

  // Cargar si está favoriteado
  useEffect(() => {
    const checkFavorite = async () => {
      const fav = await isFavorited('story', story.id);
      setIsFav(fav);
    };
    checkFavorite();
  }, [story.id]);

  const handleLike = async () => {
    if (hasLiked) return;

    const newLikes = (story.likes || 0) + 1;
    try {
      const { error } = await supabase
        .from('stories')
        .update({ likes: newLikes })
        .eq('id', story.id);

      if (error) throw error;
      
      setLikes(newLikes);
      setHasLiked(true);
      onLike(story.id, newLikes);
      
      const likedStories = JSON.parse(localStorage.getItem('charlitron_likes') || '[]');
      localStorage.setItem('charlitron_likes', JSON.stringify([...likedStories, story.id]));
    } catch (err) {
      console.error('Error liking story:', err);
    }
  };

  const handleShare = () => {
    const slug = story.slug || generateSlug(story.title, story.id);
    const shareUrl = generateShareUrl(story.title, slug, story.description);
    window.open(shareUrl, '_blank');
  };

  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const toggleFavorite = async () => {
    try {
      if (isFav) {
        await removeFromFavorites('story', story.id);
        setIsFav(false);
      } else {
        await addToFavorites('story', story.id, story.title, story.thumbnail);
        setIsFav(true);
      }
    } catch (err) {
      console.error('Error toggling favorite:', err);
    }
  };

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === story.password) {
      setIsUnlocked(true);
      setError('');
    } else {
      setError('Contraseña incorrecta');
    }
  };

  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-sepia-50 pt-32 pb-24 px-6 flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white p-10 rounded-3xl shadow-2xl text-center border border-sepia-200"
        >
          <div className="w-16 h-16 bg-sepia-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="text-sepia-600 w-8 h-8" />
          </div>
          <h2 className="text-2xl font-serif mb-4 text-sepia-950">Historia Protegida</h2>
          <p className="text-sepia-600 mb-8 font-light">Esta historia es privada. Por favor, introduce la contraseña para ver el contenido.</p>
          
          <form onSubmit={handleUnlock} className="space-y-4">
            <input 
              autoFocus
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Contraseña"
              className="w-full bg-sepia-50 border border-sepia-200 rounded-xl p-4 text-center outline-none focus:border-sepia-500 transition-all text-sepia-950"
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button 
              type="submit"
              className="w-full bg-sepia-950 text-sepia-100 py-4 rounded-xl font-bold uppercase tracking-widest hover:bg-sepia-800 transition-all"
            >
              Desbloquear
            </button>
            <button 
              type="button"
              onClick={onBack}
              className="text-sepia-500 text-sm hover:text-sepia-800 transition-colors mt-4"
            >
              Volver al álbum
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sepia-50 pt-32 pb-24">
      <div className="max-w-5xl mx-auto px-6">
        <div className="flex justify-between items-center mb-12">
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-sepia-700 hover:text-sepia-950 transition-colors uppercase tracking-widest text-xs font-bold group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Volver al álbum
          </button>

          <div className="flex items-center gap-3">
            <button 
              onClick={handleShare}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 text-green-700 hover:bg-green-200 transition-all"
            >
              <MessageCircle className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-widest">Compartir</span>
            </button>

            {story.audioUrl && (
              <div className="flex items-center gap-4">
                {isSpotifyLink(story.audioUrl) ? (
                  <iframe 
                    src={getSpotifyEmbedUrl(story.audioUrl)} 
                    width="300" 
                    height="80" 
                    frameBorder="0" 
                    allow="encrypted-media"
                    className="rounded-xl shadow-sm"
                  ></iframe>
                ) : (
                  <>
                    <audio ref={audioRef} src={story.audioUrl} loop />
                    <button 
                      onClick={toggleAudio}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${isPlaying ? 'bg-sepia-500 text-sepia-950' : 'bg-sepia-200 text-sepia-700 hover:bg-sepia-300'}`}
                    >
                      <Volume2 className={`w-4 h-4 ${isPlaying ? 'animate-pulse' : ''}`} />
                      <span className="text-xs font-bold uppercase tracking-widest">{isPlaying ? 'Música On' : 'Música Off'}</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        <header className="mb-12 md:mb-16">
          <div className="flex flex-wrap items-center gap-3 md:gap-4 mb-6">
            <span className="bg-sepia-200 text-sepia-800 px-4 py-1 rounded-full text-xs md:sm font-medium">{story.category}</span>
            <span className="text-sepia-500 font-serif italic text-lg md:text-xl">Año {story.year}</span>
            {viewCount !== null && (
              <span className="bg-sepia-100 text-sepia-700 px-4 py-1 rounded-full text-xs md:sm font-medium flex items-center gap-2">
                <Camera className="w-3 h-3" />
                {formatViewCount(viewCount)} {viewCount === 1 ? 'vista' : 'vistas'}
              </span>
            )}
            {story.mapsUrl && (
              <a 
                href={story.mapsUrl} 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-1 rounded-full text-xs md:sm font-medium hover:bg-blue-200 transition-colors"
              >
                <MapPin className="w-3 h-3" />
                Ver Ubicación
              </a>
            )}
            <button 
              onClick={handleLike}
              disabled={hasLiked}
              className={`flex items-center gap-2 px-4 py-1 rounded-full text-xs md:sm font-bold transition-all ${hasLiked ? 'bg-red-100 text-red-500' : 'bg-sepia-200 text-sepia-700 hover:bg-sepia-300'}`}
            >
              <Heart className={`w-3 h-3 ${hasLiked ? 'fill-current' : ''}`} />
              {likes} {likes === 1 ? 'Me gusta' : 'Me gustas'}
            </button>
            <button 
              onClick={toggleFavorite}
              className={`flex items-center gap-2 px-4 py-1 rounded-full text-xs md:sm font-bold transition-all ${isFav ? 'bg-yellow-100 text-yellow-600' : 'bg-sepia-200 text-sepia-700 hover:bg-sepia-300'}`}
              title={isFav ? 'Quitar de favoritos' : 'Agregar a favoritos'}
            >
              <Heart className={`w-3 h-3 ${isFav ? 'fill-current' : ''}`} />
              {isFav ? 'Favorito' : 'Guardar'}
            </button>
          </div>
          <h1 className="text-4xl md:text-7xl font-serif mb-6 md:mb-8 leading-tight">{story.title}</h1>
          <p className="text-lg md:text-2xl text-sepia-800 font-light leading-relaxed max-w-3xl border-l-4 border-sepia-300 pl-6 md:pl-8 italic">
            {story.description}
          </p>
        </header>

        {story.videoUrl ? (
          <section className="mb-24 flex flex-col items-center">
            <button 
              onClick={() => setShowVideoModal(true)}
              className="group relative flex flex-col items-center"
            >
              <div className={`${story.isVideoVertical ? 'w-48 md:w-64 aspect-[9/16]' : 'w-80 md:w-[500px] aspect-video'} bg-sepia-950 rounded-3xl overflow-hidden shadow-2xl relative mb-6 transition-all duration-500 group-hover:scale-105 group-hover:shadow-sepia-500/20`}>
                <img 
                  src={story.thumbnail} 
                  alt={story.title} 
                  className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 md:w-24 md:h-24 bg-sepia-500 rounded-full flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform duration-500">
                    <Play className="text-sepia-950 w-6 h-6 md:w-10 md:h-10 fill-current ml-1" />
                  </div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-sepia-950/80 to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
              </div>
              <div className="flex flex-col items-center gap-2">
                <span className="text-sepia-800 font-serif text-2xl md:text-3xl uppercase tracking-[0.3em] group-hover:text-sepia-950 transition-colors duration-300">
                  Ver Video
                </span>
                <div className="h-[2px] w-12 bg-sepia-400 group-hover:w-24 transition-all duration-500" />
              </div>
            </button>
          </section>
        ) : story.thumbnail ? (
          <section className="mb-24 flex justify-center">
            <div className="w-full aspect-video bg-sepia-950 rounded-3xl overflow-hidden shadow-2xl relative group">
              <img 
                src={story.thumbnail} 
                alt={story.title} 
                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity pointer-events-none select-none"
                referrerPolicy="no-referrer"
                onContextMenu={(e) => e.preventDefault()}
                onDragStart={(e) => e.preventDefault()}
              />
              {/* Watermark Overlay */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-10 group-hover:opacity-20 transition-opacity">
                <div className="rotate-[-35deg] border-2 border-white/40 p-4 flex flex-col items-center no-select">
                  <span className="text-white text-2xl font-serif tracking-widest">Charlitron®</span>
                  <span className="text-white text-[8px] font-bold uppercase tracking-[0.2em] mt-1">Derechos de Restauración</span>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        <section className="mb-16 md:mb-24">
          <h3 className="text-2xl md:text-3xl font-serif mb-8 md:mb-12 flex items-center gap-4">
            Narrativa del Recuerdo
            <div className="h-[1px] flex-grow bg-sepia-200"></div>
          </h3>
          <div className="prose prose-sepia max-w-none">
            <p className="text-lg md:text-xl text-sepia-900 leading-loose font-light first-letter:text-5xl md:first-letter:text-6xl first-letter:font-serif first-letter:mr-3 first-letter:float-left first-letter:text-sepia-600">
              {story.fullNarrative}
            </p>
          </div>
        </section>

        <section className="mb-24">
          <h3 className="text-3xl font-serif mb-12 flex items-center gap-4">
            Álbum fotográfico
            <div className="h-[1px] flex-grow bg-sepia-200"></div>
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {story.gallery.map((img, idx) => (
              <motion.div 
                key={idx}
                whileHover={{ scale: 1.05 }}
                onClick={() => setActiveImageIndex(idx)}
                className="aspect-square rounded-2xl overflow-hidden shadow-md border-4 border-white cursor-zoom-in relative group"
              >
                <img 
                  src={img} 
                  alt={`Gallery ${idx}`} 
                  className="w-full h-full object-cover sepia-filter group-hover:sepia-0 transition-all duration-500 pointer-events-none select-none"
                  referrerPolicy="no-referrer"
                  onContextMenu={(e) => e.preventDefault()}
                  onDragStart={(e) => e.preventDefault()}
                />
                {/* Watermark Overlay */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-5 group-hover:opacity-10 transition-opacity">
                  <div className="rotate-[-35deg] border-2 border-white/40 p-2 flex flex-col items-center no-select">
                    <span className="text-white text-lg font-serif tracking-widest">Charlitron®</span>
                  </div>
                </div>
                <div className="absolute inset-0 bg-sepia-950/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Maximize2 className="text-white w-8 h-8" />
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Video Modal */}
        <AnimatePresence>
          {showVideoModal && story.videoUrl && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[300] bg-sepia-950/98 backdrop-blur-xl flex items-center justify-center p-4 md:p-10"
              onClick={() => setShowVideoModal(false)}
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className={`relative w-full ${story.isVideoVertical ? 'max-w-md aspect-[9/16]' : 'max-w-5xl aspect-video'} bg-black rounded-3xl overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)] border border-white/10`}
                onClick={(e) => e.stopPropagation()}
              >
                <button 
                  onClick={() => setShowVideoModal(false)}
                  className="absolute top-6 right-6 z-50 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full backdrop-blur-md transition-all group"
                >
                  <X className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
                </button>

                <iframe 
                  src={getEmbedUrl(story.videoUrl)} 
                  className="w-full h-full border-none"
                  title={story.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                ></iframe>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Lightbox */}
        <AnimatePresence>
          {activeImageIndex !== null && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] bg-sepia-950/95 backdrop-blur-sm flex items-center justify-center p-4 md:p-10"
              onClick={() => setActiveImageIndex(null)}
            >
              <button 
                className="absolute top-6 right-6 text-sepia-100 p-2 hover:bg-sepia-800 rounded-full transition-colors z-50"
                onClick={() => setActiveImageIndex(null)}
              >
                <X className="w-10 h-10" />
              </button>
              
              <div className="relative w-full max-w-5xl h-full flex items-center justify-center group/lightbox">
                <motion.img 
                  key={activeImageIndex}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  onDragEnd={(_, info) => {
                    if (info.offset.x > 100) {
                      setActiveImageIndex((prev) => (prev === 0 ? story.gallery.length - 1 : prev! - 1));
                    } else if (info.offset.x < -100) {
                      setActiveImageIndex((prev) => (prev === story.gallery.length - 1 ? 0 : prev! + 1));
                    }
                  }}
                  src={story.gallery[activeImageIndex]} 
                  className="max-w-full max-h-full object-contain rounded-xl shadow-2xl border-4 border-sepia-800 cursor-grab active:cursor-grabbing select-none"
                  referrerPolicy="no-referrer"
                  onClick={(e) => e.stopPropagation()}
                  onContextMenu={(e) => e.preventDefault()}
                  onDragStart={(e) => e.preventDefault()}
                />

                {/* Watermark Overlay */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-15">
                  <div className="rotate-[-25deg] border-4 border-white/40 p-8 flex flex-col items-center no-select">
                    <span className="text-white text-4xl md:text-7xl font-serif tracking-widest">Charlitron®</span>
                    <span className="text-white text-xs md:text-sm font-bold tracking-[0.4em] uppercase mt-2">Derechos de Restauración</span>
                    <span className="text-white text-xl md:text-2xl font-serif mt-6 opacity-60 italic">Propiedad Intelectual</span>
                  </div>
                </div>

                {story.gallery.length > 1 && (
                  <>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveImageIndex((prev) => (prev === 0 ? story.gallery.length - 1 : prev! - 1));
                      }}
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-sepia-500 text-white p-3 rounded-full transition-all md:opacity-0 group-hover/lightbox:opacity-100"
                    >
                      <ArrowLeft className="w-6 h-6" />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveImageIndex((prev) => (prev === story.gallery.length - 1 ? 0 : prev! + 1));
                      }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-sepia-500 text-white p-3 rounded-full transition-all md:opacity-0 group-hover/lightbox:opacity-100"
                    >
                      <ArrowLeft className="w-6 h-6 rotate-180" />
                    </button>

                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                      {story.gallery.map((_, idx) => (
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
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <Guestbook storyId={story.id} />

        <div className="bg-sepia-950 rounded-3xl p-8 md:p-12 text-center text-sepia-100 shadow-2xl mt-24">
          <h3 className="text-2xl md:text-3xl font-serif mb-6">¿Tienes una historia que contar?</h3>
          <p className="text-sepia-300 mb-8 md:mb-10 max-w-2xl mx-auto font-light text-sm md:text-base">
            Queremos que este álbum siga creciendo. Si tienes recuerdos, fotos o videos de tu familia o negocio, permítenos transformarlos en cine.
          </p>
          <a 
            href={WHATSAPP_LINK}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-3 bg-sepia-500 hover:bg-sepia-400 text-sepia-950 px-8 md:px-10 py-3 md:py-4 rounded-full font-bold uppercase tracking-widest transition-all shadow-lg hover:shadow-sepia-500/20 text-sm md:text-base"
          >
            <MessageCircle className="w-5 h-5 md:w-6 md:h-6" />
            Quiero que mi historia también esté aquí
          </a>
        </div>
      </div>
    </div>
  );
};

const TravelPhotosSection = ({ photos }: { photos: TravelPhoto[] }) => {
  console.log('TravelPhotosSection rendering with photos:', photos.length);
  if (photos.length === 0) return null;

  return (
    <section className="py-24 bg-sepia-950 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-sepia-500 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-sepia-700 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-sepia-900/50 border border-sepia-800 text-sepia-400 text-xs font-bold uppercase tracking-widest mb-6"
          >
            <Camera className="w-4 h-4" />
            Encuentros en el Tiempo
          </motion.div>
          <h2 className="text-5xl md:text-6xl font-serif text-sepia-100 mb-6">Fotos del Viajero</h2>
          <p className="text-sepia-400 max-w-2xl mx-auto italic">
            "En mis viajes por las eras, he tenido el privilegio de conocer a quienes forjaron nuestro mundo. Aquí guardo esos instantes capturados en el tiempo."
          </p>
          <p className="text-sepia-600 text-[10px] uppercase tracking-widest mt-4 font-bold">
            Charlitron® — Derechos Reservados de Restauración
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {photos.map((photo, index) => (
            <motion.div
              key={photo.id}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group relative"
            >
              <div className="aspect-[4/5] overflow-hidden rounded-3xl border border-sepia-800 bg-sepia-900 shadow-2xl transition-all duration-500 group-hover:scale-[1.02] group-hover:border-sepia-500/50 relative">
                <img 
                  src={photo.url} 
                  alt={photo.character_name}
                  className="w-full h-full object-cover sepia-[0.3] group-hover:sepia-0 transition-all duration-700 pointer-events-none select-none"
                  referrerPolicy="no-referrer"
                  onContextMenu={(e) => e.preventDefault()}
                  onDragStart={(e) => e.preventDefault()}
                />
                
                {/* Watermark Overlay */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-10 group-hover:opacity-20 transition-opacity">
                  <div className="rotate-[-35deg] border-2 border-white/40 p-4 flex flex-col items-center no-select">
                    <span className="text-white text-2xl font-serif tracking-widest">Charlitron®</span>
                    <span className="text-white text-[8px] font-bold uppercase tracking-[0.2em] mt-1">Derechos de Restauración</span>
                  </div>
                </div>

                {/* Subtle corner watermark */}
                <div className="absolute top-4 right-4 pointer-events-none opacity-40 no-select">
                  <span className="text-white text-[8px] font-bold uppercase tracking-widest watermark-text">© Charlitron</span>
                </div>
                
                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-sepia-950 via-sepia-950/40 to-transparent opacity-90 transition-opacity" />
                
                <div className="absolute bottom-0 left-0 w-full p-6 md:p-8 transform md:translate-y-4 md:group-hover:translate-y-0 transition-transform duration-500">
                  <div className="flex items-center gap-2 text-sepia-500 text-[10px] md:text-xs font-bold uppercase tracking-tighter mb-1 md:mb-2">
                    <Calendar className="w-3 h-3" />
                    {photo.year}
                  </div>
                  <h3 className="text-xl md:text-2xl font-serif text-sepia-100 mb-1 md:mb-2">{photo.character_name}</h3>
                  <p className="text-sepia-300 text-xs md:text-sm md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-500 italic leading-relaxed">
                    {photo.description}
                  </p>
                  
                  {photo.external_link && (
                    <a 
                      href={photo.external_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 mt-3 md:mt-4 text-sepia-500 hover:text-sepia-300 text-[10px] md:text-xs font-bold transition-colors"
                    >
                      Saber más <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const ContactCTA = () => (
  <section className="py-24 bg-sepia-950 relative overflow-hidden">
    <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-sepia-500 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-sepia-700 rounded-full blur-[120px]"></div>
    </div>
    
    <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
      >
        <h2 className="text-4xl md:text-6xl font-serif text-sepia-100 mb-8">Cada historia que no se rescata, se pierde.</h2>
        <p className="text-xl text-sepia-300 mb-12 font-light leading-relaxed">
          Guárdala hoy en el único álbum vivo de recuerdos. 
          Transformamos recuerdos en cine, preservando la esencia de lo que fuimos para los que vendrán.
        </p>
        <a 
          href={WHATSAPP_LINK}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-4 bg-sepia-500 hover:bg-sepia-400 text-sepia-950 px-12 py-5 rounded-full font-bold uppercase tracking-widest transition-all shadow-2xl hover:scale-105"
        >
          <Camera className="w-6 h-6" />
          Quiero guardar una historia
        </a>
      </motion.div>
    </div>
  </section>
);

const Footer = ({ onLegalClick }: { onLegalClick: (type: 'privacy' | 'terms') => void }) => (
  <footer className="py-16 bg-sepia-950 border-t border-sepia-900">
    <div className="max-w-7xl mx-auto px-6 text-center">
      <div className="flex flex-col items-center mb-8">
        <div className="flex items-center gap-3 mb-2">
          <img 
            src="https://image2url.com/r2/default/images/1774244334117-f0974987-8590-4271-a1af-4957fc21a8cc.png" 
            alt="Charlitron Logo" 
            className="w-12 h-12 object-contain"
            referrerPolicy="no-referrer"
          />
          <span className="font-serif text-2xl font-bold text-sepia-100 tracking-wider uppercase leading-none">Charlitron®</span>
        </div>
        <p className="text-sepia-500 text-[10px] md:text-xs font-bold tracking-[0.3em] uppercase">El Viajero del Tiempo</p>
      </div>
      
      <div className="flex justify-center gap-6 mb-12">
        <a href={FACEBOOK_LINK} target="_blank" rel="noreferrer" className="w-12 h-12 rounded-full border border-sepia-800 flex items-center justify-center text-sepia-400 hover:bg-sepia-500 hover:text-sepia-950 hover:border-sepia-500 transition-all">
          <Facebook className="w-6 h-6" />
        </a>
        <a href={TIKTOK_LINK} target="_blank" rel="noreferrer" className="w-12 h-12 rounded-full border border-sepia-800 flex items-center justify-center text-sepia-400 hover:bg-sepia-500 hover:text-sepia-950 hover:border-sepia-500 transition-all">
          <span className="font-bold text-sm tracking-tighter">TikTok</span>
        </a>
        <a href={WHATSAPP_LINK} target="_blank" rel="noreferrer" className="w-12 h-12 rounded-full border border-sepia-800 flex items-center justify-center text-sepia-400 hover:bg-sepia-500 hover:text-sepia-950 hover:border-sepia-500 transition-all">
          <MessageCircle className="w-6 h-6" />
        </a>
      </div>

      <p className="text-sepia-600 text-sm uppercase tracking-widest font-medium">
        Arte cinematográfico para recuerdos que no merecen el olvido.
      </p>
      <div className="mt-12 pt-12 border-t border-sepia-900/50 flex flex-col gap-6 items-center">
        <div className="flex gap-8">
          <button 
            onClick={() => onLegalClick('privacy')}
            className="text-sepia-400 hover:text-sepia-200 hover:bg-sepia-900/50 px-4 py-2 rounded transition-all text-xs uppercase tracking-widest font-medium"
          >
            📋 Privacidad
          </button>
          <button 
            onClick={() => onLegalClick('terms')}
            className="text-sepia-400 hover:text-sepia-200 hover:bg-sepia-900/50 px-4 py-2 rounded transition-all text-xs uppercase tracking-widest font-medium"
          >
            ⚖️ Términos
          </button>
        </div>
        <p className="text-sepia-700 text-xs">© {new Date().getFullYear()} Charlitron®. Todos los derechos reservados.</p>
      </div>
    </div>
  </footer>
);

// --- Main App ---

export default function App() {
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [showGallery, setShowGallery] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [showInvestigation, setShowInvestigation] = useState(false);
  const [showContests, setShowContests] = useState(false);
  const [showMural, setShowMural] = useState(false);
  const [showFamilyTree, setShowFamilyTree] = useState(false);
  const [legalView, setLegalView] = useState<'privacy' | 'terms' | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [stories, setStories] = useState<Story[]>(STORIES);
  const [historians, setHistorians] = useState<Historian[]>([]);
  const [travelPhotos, setTravelPhotos] = useState<TravelPhoto[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [restoredPhotos, setRestoredPhotos] = useState<RestoredPhoto[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [introVideoUrl, setIntroVideoUrl] = useState('');
  const [introVideoIsVertical, setIntroVideoIsVertical] = useState(false);
  const [heroBgUrl, setHeroBgUrl] = useState('');
  const [investigationEnabled, setInvestigationEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFavorites, setShowFavorites] = useState(false);
  
  const publicStories = stories.filter(s => {
    if (s.isPrivate) return false;
    if (s.expires_at) {
      const expiryDate = new Date(s.expires_at);
      return expiryDate > new Date();
    }
    return true;
  });

  // Admin logic
  const [logoClicks, setLogoClicks] = useState(0);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);

  const fetchIntroVideo = async () => {
    try {
      const { data: urlData } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'intro_video_url')
        .maybeSingle();
      if (urlData) setIntroVideoUrl(urlData.value);

      const { data: verticalData } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'intro_video_is_vertical')
        .maybeSingle();
      if (verticalData) setIntroVideoIsVertical(verticalData.value === 'true');

      const { data: heroData } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'hero_bg_url')
        .maybeSingle();
      if (heroData) setHeroBgUrl(heroData.value);

      const { data: investigationData } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'investigation_enabled')
        .maybeSingle();
      if (investigationData) setInvestigationEnabled(investigationData.value === 'true');
    } catch (err) {
      console.error('Error fetching intro video settings:', err);
    }
  };

  const fetchHistorians = async () => {
    try {
      const { data } = await supabase
        .from('historians')
        .select('*')
        .order('created_at', { ascending: false });
      if (data) setHistorians(data);
    } catch (err) {
      console.error('Error fetching historians:', err);
    }
  };

  const fetchTravelPhotos = async () => {
    try {
      const { data, error } = await supabase
        .from('travel_photos')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Supabase error fetching travel photos:', error);
        return;
      }
      
      if (data) {
        console.log('Fetched travel photos:', data.length);
        setTravelPhotos(data);
      }
    } catch (err) {
      console.error('Error fetching travel photos:', err);
    }
  };

  const fetchSponsors = async () => {
    try {
      const { data } = await supabase
        .from('sponsors')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (data) setSponsors(data);
    } catch (err) {
      console.error('Error fetching sponsors:', err);
    }
  };

  const fetchRestoredPhotos = async () => {
    try {
      const { data } = await supabase
        .from('restored_photos')
        .select('*')
        .order('created_at', { ascending: false });
      if (data) setRestoredPhotos(data);
    } catch (err) {
      console.error('Error fetching restored photos:', err);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });
      if (data) setProducts(data);
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  };

  useEffect(() => {
    const fetchStories = async () => {
      try {
        const { data, error } = await supabase
          .from('stories')
          .select('*');
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          setStories(data);
          
          // Check for story slug or section in URL hash
          const hash = window.location.hash.replace('#', '').trim();
          if (hash) {
            // Check for section URLs first
            if (hash === 'galeria') {
              setShowGallery(true);
            } else if (hash === 'tienda') {
              setShowShop(true);
            } else if (hash === 'investiga') {
              setShowInvestigation(true);
            } else if (hash === 'concursos') {
              setShowContests(true);
            } else if (hash === 'mural') {
              setShowMural(true);
            } else if (hash === 'arbol') {
              setShowFamilyTree(true);
            } else if (hash !== 'historias') {
              // Try to find by slug first (supports slugs like "historia-titulo-12345")
              const foundBySlug = data.find(s => s.slug && s.slug === hash);
              if (foundBySlug) {
                setSelectedStory(foundBySlug);
              } else {
                // Fallback to ID for backward compatibility
                const foundById = data.find(s => s.id === hash);
                if (foundById) setSelectedStory(foundById);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error fetching stories from Supabase:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStories();
    fetchIntroVideo();
    fetchHistorians();
    fetchTravelPhotos();
    fetchSponsors();
    fetchRestoredPhotos();
    fetchProducts();

    // Listen for hash changes
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '').trim();
      if (hash) {
        // Check for section URLs first
        if (hash === 'galeria') {
          setShowGallery(true);
          setShowShop(false);
          setShowInvestigation(false);
          setShowContests(false);
          setShowFamilyTree(false);
          setSelectedStory(null);
        } else if (hash === 'tienda') {
          setShowShop(true);
          setShowGallery(false);
          setShowInvestigation(false);
          setShowContests(false);
          setShowFamilyTree(false);
          setSelectedStory(null);
        } else if (hash === 'investiga') {
          setShowInvestigation(true);
          setShowGallery(false);
          setShowShop(false);
          setShowContests(false);
          setShowFamilyTree(false);
          setSelectedStory(null);
        } else if (hash === 'concursos') {
          setShowContests(true);
          setShowGallery(false);
          setShowShop(false);
          setShowInvestigation(false);
          setShowFamilyTree(false);
          setShowMural(false);
          setSelectedStory(null);
        } else if (hash === 'mural') {
          setShowMural(true);
          setShowGallery(false);
          setShowShop(false);
          setShowInvestigation(false);
          setShowContests(false);
          setShowFamilyTree(false);
          setSelectedStory(null);
        } else if (hash === 'arbol') {
          setShowFamilyTree(true);
          setShowGallery(false);
          setShowShop(false);
          setShowInvestigation(false);
          setShowContests(false);
          setShowMural(false);
          setSelectedStory(null);
        } else if (hash === 'historias') {
          setShowGallery(false);
          setShowShop(false);
          setShowInvestigation(false);
          setShowFamilyTree(false);
          setShowMural(false);
          setSelectedStory(null);
        } else {
          // Try to find by slug (story)
          const foundBySlug = stories.find(s => s.slug && s.slug === hash);
          if (foundBySlug) {
            setSelectedStory(foundBySlug);
            setShowGallery(false);
            setShowShop(false);
            setShowInvestigation(false);
            setShowFamilyTree(false);
            setShowMural(false);
          } else {
            // Fallback to ID for backward compatibility
            const foundById = stories.find(s => s.id === hash);
            if (foundById) {
              setSelectedStory(foundById);
              setShowGallery(false);
              setShowShop(false);
              setShowInvestigation(false);
              setShowFamilyTree(false);
              setShowMural(false);
            }
          }
        }
      } else {
        // Empty hash = home
        setShowGallery(false);
        setShowShop(false);
        setShowInvestigation(false);
        setShowFamilyTree(false);
        setShowMural(false);
        setSelectedStory(null);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []); // Run once on mount

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPresentationMode && publicStories.length > 0) {
      interval = setInterval(() => {
        setSelectedStory(current => {
          if (!current) return publicStories[0];
          const currentIndex = publicStories.findIndex(s => s.id === current.id);
          const nextIndex = (currentIndex + 1) % publicStories.length;
          return publicStories[nextIndex];
        });
      }, 15000); // Change story every 15 seconds
    }
    return () => clearInterval(interval);
  }, [isPresentationMode, stories, publicStories.length]);

  // Track page views for gallery
  useEffect(() => {
    if (showGallery) {
      trackPageView('gallery', undefined, 'Galería Restaurada');
    }
  }, [showGallery]);

  // Track page views for shop
  useEffect(() => {
    if (showShop) {
      trackPageView('shop', undefined, 'Tienda');
    }
  }, [showShop]);

  // Track page views for investigation
  useEffect(() => {
    if (showInvestigation) {
      trackPageView('investigation', undefined, 'Investiga tu Historia');
    }
  }, [showInvestigation]);

  // Track page views for family tree
  useEffect(() => {
    if (showFamilyTree) {
      trackPageView('family_tree', undefined, 'Árbol Genealógico');
    }
  }, [showFamilyTree]);

  // Track home page view
  useEffect(() => {
    if (!selectedStory && !showGallery && !showShop && !showInvestigation && !showFamilyTree && !legalView) {
      trackPageView('home', undefined, 'Inicio');
    }
  }, [selectedStory, showGallery, showShop, showInvestigation, showFamilyTree, legalView]);

  // Update URL hash when selected story changes
  useEffect(() => {
    if (selectedStory) {
      const slug = selectedStory.slug || generateSlug(selectedStory.title, selectedStory.id);
      window.location.hash = `#${slug}`;
    } else {
      // If no story selected, show section URL instead
      if (showGallery) {
        window.location.hash = '#galeria';
      } else if (showShop) {
        window.location.hash = '#tienda';
      } else if (showInvestigation) {
        window.location.hash = '#investiga';
      } else if (showFamilyTree) {
        window.location.hash = '#arbol';
      } else if (showMural) {
        window.location.hash = '#mural';
      } else {
        window.location.hash = '';
      }
    }
  }, [selectedStory?.id, showGallery, showShop, showInvestigation, showFamilyTree, showMural]);

  const togglePresentationMode = () => {
    const newMode = !isPresentationMode;
    setIsPresentationMode(newMode);
    if (newMode && publicStories.length > 0) {
      if (!selectedStory) {
        setSelectedStory(publicStories[0]);
      }
      // Scroll to top to see the story detail
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleLogoClick = () => {
    const newClicks = logoClicks + 1;
    setLogoClicks(newClicks);
    
    if (newClicks >= 5) {
      setShowAdminLogin(true);
      setLogoClicks(0);
    }

    // Reset clicks after 3 seconds of inactivity
    setTimeout(() => setLogoClicks(0), 3000);
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassword === '2003') {
      setIsAdminAuthenticated(true);
      setShowAdminLogin(false);
      setAdminPassword('');
    } else {
      alert('Contraseña incorrecta');
    }
  };

  const handleStoryLike = (id: string, newLikes: number) => {
    setStories(prev => prev.map(s => s.id === id ? { ...s, likes: newLikes } : s));
    if (selectedStory && selectedStory.id === id) {
      setSelectedStory({ ...selectedStory, likes: newLikes });
    }
  };

  const handleSearch = (term: string) => {
    if (!term.trim()) return;
    setSearchTerm(term);
    setShowSearchResults(true);
  };

  const handleSelectStory = (story: Story) => {
    setSelectedStory(story);
    // Registrar vista de historia
    trackPageView('story', story.id, story.title);
  };

  const handleSeeAll = () => {
    const element = document.getElementById('historias');
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen selection:bg-sepia-500 selection:text-sepia-950">
      <InstallPrompt />
      <Navbar 
        onHome={() => { setSelectedStory(null); setShowGallery(false); setShowShop(false); setShowInvestigation(false); setShowContests(false); setShowFamilyTree(false); setShowMural(false); setIsPresentationMode(false); }} 
        onLogoClick={handleLogoClick}
        onGallery={() => { setShowGallery(true); setShowShop(false); setShowInvestigation(false); setShowContests(false); setShowFamilyTree(false); setShowMural(false); setSelectedStory(null); setIsPresentationMode(false); }}
        onShop={() => { setShowShop(true); setShowGallery(false); setShowInvestigation(false); setShowContests(false); setShowFamilyTree(false); setShowMural(false); setSelectedStory(null); setIsPresentationMode(false); }}
        onInvestigation={() => { setShowInvestigation(true); setShowGallery(false); setShowShop(false); setShowContests(false); setShowFamilyTree(false); setShowMural(false); setSelectedStory(null); setIsPresentationMode(false); }}
        onFamilyTree={() => { setShowFamilyTree(true); setShowGallery(false); setShowShop(false); setShowInvestigation(false); setShowContests(false); setShowMural(false); setSelectedStory(null); setIsPresentationMode(false); }}
        onFavorites={() => setShowFavorites(true)}
        onContests={() => { setShowContests(true); setShowGallery(false); setShowShop(false); setShowInvestigation(false); setShowFamilyTree(false); setShowMural(false); setSelectedStory(null); setIsPresentationMode(false); }}
        onMural={() => { setShowMural(true); setShowGallery(false); setShowShop(false); setShowInvestigation(false); setShowContests(false); setShowFamilyTree(false); setSelectedStory(null); setIsPresentationMode(false); }}
        investigationEnabled={investigationEnabled}
      />
      
      <AnimatePresence mode="wait">
        {showAdminLogin && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-sepia-950/90 backdrop-blur-md flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="max-w-md w-full bg-sepia-900 p-10 rounded-3xl border border-sepia-800 shadow-2xl"
            >
              <h3 className="text-2xl font-serif text-sepia-100 mb-6 text-center">Acceso Administrativo</h3>
              <form onSubmit={handleAdminLogin} className="space-y-6">
                <input 
                  autoFocus
                  type="password"
                  value={adminPassword}
                  onChange={e => setAdminPassword(e.target.value)}
                  placeholder="Introduce la clave"
                  className="w-full bg-sepia-950 border border-sepia-800 rounded-xl p-4 text-sepia-100 text-center outline-none focus:border-sepia-500 transition-all"
                />
                <div className="flex gap-4">
                  <button 
                    type="button"
                    onClick={() => setShowAdminLogin(false)}
                    className="flex-grow py-4 rounded-xl border border-sepia-700 text-sepia-400 hover:bg-sepia-800 transition-all font-bold uppercase tracking-widest text-xs"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-grow py-4 rounded-xl bg-sepia-500 text-sepia-950 font-bold uppercase tracking-widest text-xs hover:bg-sepia-400 transition-all"
                  >
                    Entrar
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}

        {/* Floating WhatsApp Button */}
        <a 
          href="https://wa.me/5214444237092?text=Hola%20Charlitron,%20me%20gustaría%20información%20sobre%20tus%20servicios."
          target="_blank"
          rel="noreferrer"
          className="fixed bottom-8 right-8 z-[100] bg-[#25D366] text-white p-4 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all group"
          title="Contactar por WhatsApp"
        >
          <MessageCircle className="w-8 h-8" />
          <span className="absolute right-full mr-4 top-1/2 -translate-y-1/2 bg-white text-sepia-950 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl border border-sepia-100">
            ¿Necesitas ayuda?
          </span>
        </a>

        {isAdminAuthenticated && (
          <AdminPanel 
            initialStories={stories}
            initialTravelPhotos={travelPhotos}
            onStoriesUpdate={setStories}
            onTravelPhotosUpdate={setTravelPhotos}
            onSettingsUpdate={fetchIntroVideo}
            onClose={() => setIsAdminAuthenticated(false)}
          />
        )}

        {legalView ? (
          <motion.div
            key="legal"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.5 }}
          >
            <LegalPage 
              type={legalView} 
              onBack={() => setLegalView(null)} 
            />
          </motion.div>
        ) : showGallery ? (
          <motion.div
            key="gallery"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
          >
            <RestoredGallery onBack={() => setShowGallery(false)} />
          </motion.div>
        ) : showShop ? (
          <motion.div
            key="shop"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
          >
            <ShopSection onBack={() => setShowShop(false)} />
          </motion.div>
        ) : showInvestigation ? (
          <motion.div
            key="investigation"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
          >
            <InvestigationSection onBack={() => setShowInvestigation(false)} />
          </motion.div>
        ) : showContests ? (
          <motion.div
            key="contests"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
          >
            <ContestsSection />
          </motion.div>
        ) : showMural ? (
          <motion.div
            key="mural"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
          >
            <MuralSection onBack={() => setShowMural(false)} />
          </motion.div>
        ) : showFamilyTree ? (
          <motion.div
            key="familytree"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
          >
            <FamilyTreeManager onBack={() => setShowFamilyTree(false)} />
          </motion.div>
        ) : !selectedStory ? (
          <motion.main 
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Hero 
              onSearch={handleSearch} 
              onSeeAll={handleSeeAll} 
              onGallery={() => setShowGallery(true)}
              onInvestigation={() => setShowInvestigation(true)}
              investigationEnabled={investigationEnabled}
              introVideoUrl={introVideoUrl} 
              introVideoIsVertical={introVideoIsVertical}
              heroBgUrl={heroBgUrl}
            />
            <About />
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className="w-full overflow-hidden"
            >
              <img
                src="https://image2url.com/r2/default/images/1775456732330-72e615ee-61fa-4811-8409-a452b2ec805f.png"
                alt="Banner Charlitron® Viajero del Tiempo"
                className="w-full h-auto object-cover"
                referrerPolicy="no-referrer"
              />
            </motion.section>
            <Biography />
            <HistoriansSection historians={historians} />
            <TravelPhotosSection photos={travelPhotos} />
            <Timeline stories={publicStories} onSelectStory={handleSelectStory} />
            <HowItWorks />
            {isLoading ? (
              <div className="py-24 text-center">
                <div className="inline-block w-8 h-8 border-4 border-sepia-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-sepia-600 font-serif italic">Cargando historias del tiempo...</p>
              </div>
            ) : (
              <FeaturedStories 
                stories={publicStories} 
                onSelectStory={handleSelectStory} 
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
              />
            )}

            {sponsors.length > 0 && (
              <section className="py-24 bg-sepia-950/50 border-y border-sepia-900/50">
                <div className="max-w-7xl mx-auto px-6 text-center">
                  <h2 className="text-3xl font-serif text-sepia-100 mb-4">Empresas que viajan en el tiempo</h2>
                  <p className="text-sepia-400 italic mb-12">Patrocinadores oficiales de Charlitron el Viajero</p>
                  
                  <div className="flex flex-wrap justify-center items-center gap-12 md:gap-20">
                    {sponsors.map((sponsor) => (
                      <motion.a
                        key={sponsor.id}
                        href={sponsor.website_url || '#'}
                        target="_blank"
                        rel="noreferrer"
                        whileHover={{ scale: 1.1 }}
                        className="block group"
                      >
                        <div className="relative">
                          <img 
                            src={sponsor.logo_url} 
                            alt={sponsor.name}
                            className="h-16 md:h-24 w-auto object-contain sepia brightness-75 group-hover:sepia-0 group-hover:brightness-100 transition-all duration-500 grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <p className="mt-4 text-xs font-bold uppercase tracking-widest text-sepia-500 opacity-0 group-hover:opacity-100 transition-opacity">
                          {sponsor.name}
                        </p>
                      </motion.a>
                    ))}
                  </div>
                </div>
              </section>
            )}
            
            <div className="max-w-7xl mx-auto px-6 pb-24 text-center">
              <button 
                onClick={togglePresentationMode}
                className={`inline-flex items-center gap-3 px-10 py-5 rounded-full font-bold uppercase tracking-widest transition-all shadow-2xl ${isPresentationMode ? 'bg-sepia-100 text-sepia-950 scale-105' : 'bg-sepia-950 text-sepia-100 hover:bg-sepia-800'}`}
              >
                <Play className={`w-6 h-6 ${isPresentationMode ? 'animate-pulse' : ''}`} />
                {isPresentationMode ? 'Modo Presentación Activo' : 'Iniciar Modo Presentación'}
              </button>
            </div>

            <ContactCTA />
          </motion.main>
        ) : (
          <motion.div 
            key="detail"
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.8, ease: "circOut" }}
          >
            <StoryDetail 
              story={selectedStory} 
              onBack={() => { setSelectedStory(null); setIsPresentationMode(false); }} 
              onLike={handleStoryLike}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <SearchResults
        isOpen={showSearchResults}
        onClose={() => setShowSearchResults(false)}
        searchTerm={searchTerm}
        stories={publicStories}
        historians={historians}
        restoredPhotos={restoredPhotos}
        travelPhotos={travelPhotos}
        products={products}
        onSelectStory={(story) => {
          handleSelectStory(story);
          setShowSearchResults(false);
        }}
        onViewGallery={() => {
          setShowGallery(true);
          setShowSearchResults(false);
        }}
        onViewShop={() => {
          setShowShop(true);
          setShowSearchResults(false);
        }}
      />

      <FavoritesPanel
        isOpen={showFavorites}
        onClose={() => setShowFavorites(false)}
        onSelectStory={(storyId) => {
          const story = publicStories.find(s => s.id === storyId);
          if (story) handleSelectStory(story);
        }}
        onViewShop={() => setShowShop(true)}
        onViewGallery={() => setShowGallery(true)}
      />

      <Footer onLegalClick={setLegalView} />
    </div>
  );
}
