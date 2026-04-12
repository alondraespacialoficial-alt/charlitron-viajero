import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus, 
  Trash2, 
  Edit2, 
  Save, 
  X, 
  Image as ImageIcon, 
  Video, 
  Lock, 
  Eye, 
  EyeOff,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Share2,
  Volume2,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Settings,
  Upload,
  Book,
  User,
  Key,
  RefreshCw,
  Users,
  Scroll,
  ShoppingBag,
  Tag,
  DollarSign,
  Trophy,
  UserCheck
} from 'lucide-react';
import { Story, Historian, RestoredPhoto, TravelPhoto, Product, Sponsor, Contest, MuralPhoto } from '../types';
import { supabase } from '../supabase';
import { AnalyticsDashboard } from './AnalyticsDashboard';
import { ContestsAdmin } from './ContestsAdmin';
import { InstallPromptAdmin } from './InstallPromptAdmin';
import { CollaboratorsAdmin } from './CollaboratorsAdmin';

interface AdminPanelProps {
  onClose: () => void;
  onStoriesUpdate: (stories: Story[]) => void;
  onTravelPhotosUpdate?: (photos: TravelPhoto[]) => void;
  onSettingsUpdate?: () => void;
  initialStories: Story[];
  initialTravelPhotos?: TravelPhoto[];
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ 
  onClose, 
  onStoriesUpdate, 
  onTravelPhotosUpdate,
  onSettingsUpdate, 
  initialStories,
  initialTravelPhotos = []
}) => {
  const [stories, setStories] = useState<Story[]>(initialStories);
  const [historians, setHistorians] = useState<Historian[]>([]);
  const [restoredPhotos, setRestoredPhotos] = useState<RestoredPhoto[]>([]);
  const [travelPhotos, setTravelPhotos] = useState<TravelPhoto[]>(initialTravelPhotos);
  const [products, setProducts] = useState<Product[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [editingStory, setEditingStory] = useState<Partial<Story> | null>(null);
  const [editingHistorian, setEditingHistorian] = useState<Partial<Historian> | null>(null);
  const [editingRestoredPhoto, setEditingRestoredPhoto] = useState<Partial<RestoredPhoto> | null>(null);
  const [editingTravelPhoto, setEditingTravelPhoto] = useState<Partial<TravelPhoto> | null>(null);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [editingSponsor, setEditingSponsor] = useState<Partial<Sponsor> | null>(null);
  const [viewMode, setViewMode] = useState<'stories' | 'historians' | 'restored' | 'travels' | 'settings' | 'family_keys' | 'shop' | 'sponsors' | 'contests' | 'analytics' | 'install_prompt' | 'mural' | 'collaborators'>('stories');
  const [muralPhotos, setMuralPhotos] = useState<MuralPhoto[]>([]);
  const [editingMuralPhoto, setEditingMuralPhoto] = useState<Partial<MuralPhoto> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [introVideoUrl, setIntroVideoUrl] = useState('');
  const [introVideoIsVertical, setIntroVideoIsVertical] = useState(false);
  const [heroBgUrl, setHeroBgUrl] = useState('');
  const [investigationEnabled, setInvestigationEnabled] = useState(false);
  const [radioNarrativeEnabled, setRadioNarrativeEnabled] = useState(false);
  const [investigationCodes, setInvestigationCodes] = useState<{ id: string, code: string, is_used: boolean, created_at: string }[]>([]);
  const [familyKeys, setFamilyKeys] = useState<{ id: string, key_code: string, duration_days: number, is_used: boolean, created_at: string }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    setStories(initialStories);
    fetchSettings();
    fetchHistorians();
    fetchRestoredPhotos();
    fetchTravelPhotos();
    fetchFamilyKeys();
    fetchProducts();
    fetchSponsors();
    fetchMuralPhotos();
  }, [initialStories]);

  const fetchMuralPhotos = async () => {
    try {
      const { data, error } = await supabase
        .from('mural_photos')
        .select('*')
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false });
      if (!error && data) setMuralPhotos(data);
    } catch (err) {
      console.error('Error fetching mural photos:', err);
    }
  };

  const handleSaveMuralPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMuralPhoto) return;
    setIsSaving(true);
    try {
      const toSave = {
        ...editingMuralPhoto,
        id: editingMuralPhoto.id || crypto.randomUUID(),
        is_vertical: editingMuralPhoto.is_vertical || false,
        display_order: editingMuralPhoto.display_order || 0,
      };
      const { data, error } = await supabase.from('mural_photos').upsert(toSave).select();
      if (error) throw error;
      if (data) {
        const saved = data[0] as MuralPhoto;
        const updated = editingMuralPhoto.id
          ? muralPhotos.map(p => p.id === editingMuralPhoto.id ? saved : p)
          : [saved, ...muralPhotos];
        setMuralPhotos(updated);
        setEditingMuralPhoto(null);
        setMessage({ type: 'success', text: 'Foto del mural guardada' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: `Error al guardar: ${err.message || 'Desconocido'}` });
    } finally {
      setIsSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleDeleteMuralPhoto = async (id: string) => {
    if (!window.confirm('¿Eliminar esta foto del mural?')) return;
    setIsDeleting(id);
    try {
      const { error } = await supabase.from('mural_photos').delete().eq('id', id);
      if (error) throw error;
      setMuralPhotos(muralPhotos.filter(p => p.id !== id));
    } catch (err: any) {
      setMessage({ type: 'error', text: `Error al eliminar: ${err.message || 'Desconocido'}` });
    } finally {
      setIsDeleting(null);
    }
  };

  const fetchSponsors = async () => {
    try {
      const { data, error } = await supabase
        .from('sponsors')
        .select('*')
        .order('created_at', { ascending: false });
      if (data) setSponsors(data);
    } catch (err) {
      console.error('Error fetching sponsors:', err);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });
      if (data) setProducts(data);
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  };

  const fetchTravelPhotos = async () => {
    try {
      const { data, error } = await supabase
        .from('travel_photos')
        .select('*')
        .order('created_at', { ascending: false });
      if (data) setTravelPhotos(data);
    } catch (err) {
      console.error('Error fetching travel photos:', err);
    }
  };

  const handleSaveTravelPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTravelPhoto) return;

    setIsSaving(true);
    try {
      const photoToSave = {
        ...editingTravelPhoto,
        id: editingTravelPhoto.id || crypto.randomUUID(),
      };

      const { data, error } = await supabase
        .from('travel_photos')
        .upsert(photoToSave)
        .select();

      if (error) throw error;
      if (data) {
        const saved = data[0] as TravelPhoto;
        const updated = editingTravelPhoto.id 
          ? travelPhotos.map(p => p.id === editingTravelPhoto.id ? saved : p)
          : [saved, ...travelPhotos];
        setTravelPhotos(updated);
        if (onTravelPhotosUpdate) onTravelPhotosUpdate(updated);
        setEditingTravelPhoto(null);
        setMessage({ type: 'success', text: 'Foto del viajero guardada' });
      }
    } catch (err: any) {
      console.error('Error saving travel photo:', err);
      setMessage({ type: 'error', text: `Error al guardar: ${err.message || 'Desconocido'}` });
    } finally {
      setIsSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleDeleteTravelPhoto = async (id: string) => {
    if (!window.confirm('¿Eliminar esta foto del álbum del viajero?')) return;
    setIsDeleting(id);
    try {
      const { error } = await supabase.from('travel_photos').delete().eq('id', id);
      if (error) throw error;
      const updated = travelPhotos.filter(p => p.id !== id);
      setTravelPhotos(updated);
      if (onTravelPhotosUpdate) onTravelPhotosUpdate(updated);
    } catch (err: any) {
      console.error('Error deleting travel photo:', err);
      setMessage({ type: 'error', text: `Error al eliminar: ${err.message || 'Desconocido'}` });
    } finally {
      setIsDeleting(null);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    setIsSaving(true);
    try {
      const productToSave = {
        ...editingProduct,
        id: editingProduct.id || crypto.randomUUID(),
        is_sold_out: editingProduct.is_sold_out || false,
      };

      const { data, error } = await supabase
        .from('products')
        .upsert(productToSave)
        .select();

      if (error) throw error;
      if (data) {
        const saved = data[0] as Product;
        const updated = editingProduct.id 
          ? products.map(p => p.id === editingProduct.id ? saved : p)
          : [saved, ...products];
        setProducts(updated);
        setEditingProduct(null);
        setMessage({ type: 'success', text: 'Producto guardado correctamente' });
      }
    } catch (err: any) {
      console.error('Error saving product:', err);
      setMessage({ type: 'error', text: `Error al guardar: ${err.message || 'Desconocido'}` });
    } finally {
      setIsSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm('¿Eliminar este producto de la tienda?')) return;
    setIsDeleting(id);
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      setProducts(products.filter(p => p.id !== id));
      setMessage({ type: 'success', text: 'Producto eliminado' });
    } catch (err: any) {
      console.error('Error deleting product:', err);
      setMessage({ type: 'error', text: `Error al eliminar: ${err.message || 'Desconocido'}` });
    } finally {
      setIsDeleting(null);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleSaveSponsor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSponsor) return;

    setIsSaving(true);
    try {
      const sponsorToSave = {
        ...editingSponsor,
        id: editingSponsor.id || crypto.randomUUID(),
        is_active: editingSponsor.is_active ?? true,
      };

      const { data, error } = await supabase
        .from('sponsors')
        .upsert(sponsorToSave)
        .select();

      if (error) throw error;
      if (data) {
        const saved = data[0] as Sponsor;
        const updated = editingSponsor.id 
          ? sponsors.map(s => s.id === editingSponsor.id ? saved : s)
          : [saved, ...sponsors];
        setSponsors(updated);
        setEditingSponsor(null);
        setMessage({ type: 'success', text: 'Patrocinador guardado correctamente' });
      }
    } catch (err: any) {
      console.error('Error saving sponsor:', err);
      setMessage({ type: 'error', text: `Error al guardar: ${err.message || 'Desconocido'}` });
    } finally {
      setIsSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleDeleteSponsor = async (id: string) => {
    if (!window.confirm('¿Eliminar este patrocinador?')) return;
    setIsDeleting(id);
    try {
      const { error } = await supabase.from('sponsors').delete().eq('id', id);
      if (error) throw error;
      setSponsors(sponsors.filter(s => s.id !== id));
      setMessage({ type: 'success', text: 'Patrocinador eliminado' });
    } catch (err: any) {
      console.error('Error deleting sponsor:', err);
      setMessage({ type: 'error', text: `Error al eliminar: ${err.message || 'Desconocido'}` });
    } finally {
      setIsDeleting(null);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const fetchRestoredPhotos = async () => {
    try {
      const { data, error } = await supabase
        .from('restored_photos')
        .select('*')
        .order('created_at', { ascending: false });
      if (data) setRestoredPhotos(data);
    } catch (err: any) {
      console.error('Error fetching restored photos:', err);
    }
  };

  const fetchInvestigationCodes = async () => {
    try {
      const { data, error } = await supabase
        .from('investigation_codes')
        .select('*')
        .order('created_at', { ascending: false });
      if (data) setInvestigationCodes(data);
    } catch (err) {
      console.error('Error fetching investigation codes:', err);
    }
  };

  const generateCode = async () => {
    const newCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    try {
      const { data, error } = await supabase
        .from('investigation_codes')
        .insert([{ code: newCode }])
        .select();
      if (error) throw error;
      if (data) setInvestigationCodes([data[0], ...investigationCodes]);
    } catch (err) {
      console.error('Error generating code:', err);
    }
  };

  const deleteCode = async (id: string) => {
    try {
      const { error } = await supabase
        .from('investigation_codes')
        .delete()
        .eq('id', id);
      if (error) throw error;
      setInvestigationCodes(investigationCodes.filter(c => c.id !== id));
    } catch (err) {
      console.error('Error deleting code:', err);
    }
  };

  const fetchFamilyKeys = async () => {
    try {
      const { data, error } = await supabase
        .from('access_keys')
        .select('*')
        .order('created_at', { ascending: false });
      if (data) setFamilyKeys(data);
    } catch (err) {
      console.error('Error fetching family keys:', err);
    }
  };

  const generateFamilyKey = async (days: number) => {
    const newKey = Math.random().toString(36).substring(2, 12).toUpperCase();
    try {
      const { data, error } = await supabase
        .from('access_keys')
        .insert([{ key_code: newKey, duration_days: days }])
        .select();
      if (error) throw error;
      if (data) setFamilyKeys([data[0], ...familyKeys]);
      setMessage({ type: 'success', text: `Clave de ${days} días generada` });
    } catch (err) {
      console.error('Error generating family key:', err);
      setMessage({ type: 'error', text: 'Error al generar clave' });
    } finally {
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const deleteFamilyKey = async (id: string) => {
    if (!window.confirm('¿Eliminar esta clave de acceso?')) return;
    try {
      // Desvincular árboles que usen esta clave antes de borrarla
      await supabase
        .from('family_trees')
        .update({ access_key_id: null })
        .eq('access_key_id', id);

      const { error } = await supabase
        .from('access_keys')
        .delete()
        .eq('id', id);
      if (error) throw error;
      setFamilyKeys(familyKeys.filter(k => k.id !== id));
    } catch (err) {
      console.error('Error deleting family key:', err);
    }
  };

  const fetchHistorians = async () => {
    try {
      const { data, error } = await supabase
        .from('historians')
        .select('*')
        .order('created_at', { ascending: false });
      if (data) setHistorians(data);
    } catch (err) {
      console.error('Error fetching historians:', err);
    }
  };

  const handleSaveHistorian = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHistorian) return;

    setIsSaving(true);
    try {
      const historianToSave = {
        ...editingHistorian,
        id: editingHistorian.id || crypto.randomUUID(),
        books: editingHistorian.books || [],
      };

      const { data, error } = await supabase
        .from('historians')
        .upsert(historianToSave)
        .select();

      if (error) throw error;
      if (data) {
        const saved = data[0] as Historian;
        const updated = editingHistorian.id 
          ? historians.map(h => h.id === editingHistorian.id ? saved : h)
          : [saved, ...historians];
        setHistorians(updated);
        setEditingHistorian(null);
        setMessage({ type: 'success', text: 'Historiador guardado' });
      }
    } catch (err) {
      console.error('Error saving historian:', err);
      setMessage({ type: 'error', text: 'Error al guardar historiador' });
    } finally {
      setIsSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleDeleteHistorian = async (id: string) => {
    if (!window.confirm('¿Eliminar este historiador?')) return;
    setIsDeleting(id);
    try {
      const { error } = await supabase.from('historians').delete().eq('id', id);
      if (error) throw error;
      setHistorians(historians.filter(h => h.id !== id));
    } catch (err) {
      console.error('Error deleting historian:', err);
    } finally {
      setIsDeleting(null);
    }
  };

  const fetchStories = async () => {
    try {
      const { data, error } = await supabase
        .from('stories')
        .select('*')
        .order('year', { ascending: false });
      if (data) {
        setStories(data);
        onStoriesUpdate(data);
      }
    } catch (err) {
      console.error('Error fetching stories:', err);
    }
  };

  const handleSaveRestoredPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRestoredPhoto) return;

    setIsSaving(true);
    try {
      const photoToSave = {
        ...editingRestoredPhoto,
        id: editingRestoredPhoto.id || crypto.randomUUID(),
        images: editingRestoredPhoto.images || []
      };

      const { data, error } = await supabase
        .from('restored_photos')
        .upsert(photoToSave)
        .select();

      if (error) throw error;
      if (data) {
        const saved = data[0] as RestoredPhoto;
        const updated = editingRestoredPhoto.id 
          ? restoredPhotos.map(p => p.id === editingRestoredPhoto.id ? saved : p)
          : [saved, ...restoredPhotos];
        setRestoredPhotos(updated);
        setEditingRestoredPhoto(null);
        setMessage({ type: 'success', text: 'Foto guardada' });
      }
    } catch (err) {
      console.error('Error saving restored photo:', err);
      setMessage({ type: 'error', text: 'Error al guardar foto' });
    } finally {
      setIsSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleDeleteRestoredPhoto = async (id: string) => {
    if (!window.confirm('¿Eliminar esta foto de la galería?')) return;
    setIsDeleting(id);
    try {
      const { error } = await supabase.from('restored_photos').delete().eq('id', id);
      if (error) throw error;
      setRestoredPhotos(restoredPhotos.filter(p => p.id !== id));
    } catch (err) {
      console.error('Error deleting restored photo:', err);
    } finally {
      setIsDeleting(null);
    }
  };

  const fetchSettings = async () => {
    try {
      const { data: urlData } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'intro_video_url')
        .maybeSingle();
      
      if (urlData) {
        setIntroVideoUrl(urlData.value);
      }

      const { data: verticalData } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'intro_video_is_vertical')
        .maybeSingle();
      
      if (verticalData) {
        setIntroVideoIsVertical(verticalData.value === 'true');
      }

      const { data: heroData } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'hero_bg_url')
        .maybeSingle();
      
      if (heroData) {
        setHeroBgUrl(heroData.value);
      }

      const { data: investigationData } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'investigation_enabled')
        .maybeSingle();
      
      if (investigationData) {
        setInvestigationEnabled(investigationData.value === 'true');
      }
      
      const { data: radioData } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'radio_narrative_enabled')
        .maybeSingle();
      
      if (radioData) {
        setRadioNarrativeEnabled(radioData.value === 'true');
      }

      fetchInvestigationCodes();
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      const { error: urlError } = await supabase
        .from('site_settings')
        .upsert({ key: 'intro_video_url', value: introVideoUrl });
      
      if (urlError) throw urlError;

      const { error: verticalError } = await supabase
        .from('site_settings')
        .upsert({ key: 'intro_video_is_vertical', value: introVideoIsVertical.toString() });
      
      if (verticalError) throw verticalError;

      const { error: heroError } = await supabase
        .from('site_settings')
        .upsert({ key: 'hero_bg_url', value: heroBgUrl });
      
      if (heroError) throw heroError;

      const { error: investigationError } = await supabase
        .from('site_settings')
        .upsert({ key: 'investigation_enabled', value: investigationEnabled.toString() });
      
      if (investigationError) throw investigationError;

      const { error: radioError } = await supabase
        .from('site_settings')
        .upsert({ key: 'radio_narrative_enabled', value: radioNarrativeEnabled.toString() });
      
      if (radioError) throw radioError;
      
      if (onSettingsUpdate) onSettingsUpdate();
      setMessage({ type: 'success', text: 'Configuración guardada correctamente' });
    } catch (err) {
      console.error('Error saving settings:', err);
      setMessage({ type: 'error', text: 'Error al guardar configuración' });
    } finally {
      setIsSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `intro-video-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('video')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('video')
        .getPublicUrl(filePath);

      setIntroVideoUrl(publicUrl);
      
      // Auto-save to settings table
      await supabase
        .from('site_settings')
        .upsert({ key: 'intro_video_url', value: publicUrl });

      setMessage({ type: 'success', text: 'Video subido y guardado correctamente' });
    } catch (err) {
      console.error('Error uploading video:', err);
      setMessage({ type: 'error', text: 'Error al subir el video' });
    } finally {
      setIsUploading(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleImageUpload = async (file: File): Promise<string | null> => {
    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `image-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (err) {
      console.error('Error uploading image:', err);
      setMessage({ type: 'error', text: 'Error al subir la imagen' });
      return null;
    } finally {
      setIsUploading(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };
  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `audio-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('audio')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('audio')
        .getPublicUrl(filePath);

      if (editingStory) {
        setEditingStory({...editingStory, audioUrl: publicUrl});
      }
      
      setMessage({ type: 'success', text: 'Audio subido correctamente' });
    } catch (err: any) {
      console.error('Error uploading audio:', err);
      const errorMessage = err.message || 'Error desconocido';
      setMessage({ 
        type: 'error', 
        text: `Error al subir el audio: ${errorMessage}. Asegúrate de que el bucket "audio" exista en Supabase y sea público.` 
      });
    } finally {
      setIsUploading(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStory) return;

    setIsSaving(true);
    try {
      const storyToSave = {
        ...editingStory,
        id: editingStory.id || crypto.randomUUID(),
        gallery: editingStory.gallery || [],
      };

      const { data, error } = await supabase
        .from('stories')
        .upsert(storyToSave)
        .select();

      if (error) throw error;
      if (!data || data.length === 0) throw new Error('No se recibió respuesta de la base de datos');

      const savedStory = data[0] as Story;
      const updatedStories = editingStory.id 
        ? stories.map(s => s.id === editingStory.id ? savedStory : s)
        : [...stories, savedStory];
      
      setStories(updatedStories);
      onStoriesUpdate(updatedStories);
      setEditingStory(null);
      setMessage({ type: 'success', text: 'Historia guardada correctamente' });
    } catch (error) {
      console.error('Error saving story:', error);
      setMessage({ type: 'error', text: 'Error al guardar la historia' });
    } finally {
      setIsSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta historia?')) return;

    setIsDeleting(id);
    try {
      const { error } = await supabase
        .from('stories')
        .delete()
        .eq('id', id);

      if (error) throw error;

      const updatedStories = stories.filter(s => s.id !== id);
      setStories(updatedStories);
      onStoriesUpdate(updatedStories);
    } catch (error) {
      console.error('Error deleting story:', error);
      alert('Error al eliminar la historia');
    } finally {
      setIsDeleting(null);
    }
  };

  const getExpiryStatus = (expiryDateStr?: string) => {
    if (!expiryDateStr) return { label: 'Sin Vencimiento', color: 'text-sepia-400', icon: null };
    
    const expiryDate = new Date(expiryDateStr);
    const now = new Date();
    const diffDays = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { label: 'Vencido', color: 'text-red-500', icon: <AlertCircle className="w-3 h-3" /> };
    if (diffDays <= 7) return { label: `Vence en ${diffDays}d`, color: 'text-orange-500', icon: <AlertCircle className="w-3 h-3" /> };
    return { label: 'Activo', color: 'text-green-500', icon: <CheckCircle2 className="w-3 h-3" /> };
  };

  return (
    <div className="fixed inset-0 z-[100] bg-sepia-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-sepia-800 p-6 flex justify-between items-center bg-sepia-950/50 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 flex items-center justify-center">
            <img 
              src="https://image2url.com/r2/default/images/1774244334117-f0974987-8590-4271-a1af-4957fc21a8cc.png" 
              alt="Charlitron Logo" 
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
              onError={(e) => { (e.target as HTMLImageElement).src = '/images/charlitron-logo.svg'; }}
            />
          </div>
          <div>
            <h2 className="text-sepia-100 font-serif text-2xl">Panel de Administración</h2>
            <p className="text-sepia-400 text-xs uppercase tracking-widest">Gestión de Recuerdos</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => {
              fetchStories();
              fetchRestoredPhotos();
              fetchHistorians();
              fetchSettings();
              fetchInvestigationCodes();
            }}
            className="flex items-center gap-2 text-sepia-400 hover:text-sepia-100 px-4 py-2 rounded-xl border border-sepia-800 hover:border-sepia-500 transition-all font-bold uppercase tracking-widest text-xs"
          >
            <RefreshCw className="w-4 h-4" />
            Refrescar Datos
          </button>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-sepia-800 rounded-full text-sepia-400 hover:text-sepia-100 transition-colors"
          >
            <X className="w-8 h-8" />
          </button>
        </div>
      </header>

      <div className="flex-grow overflow-hidden flex flex-col md:flex-row">
        {/* Sidebar - List of Stories */}
        <aside className="w-full md:w-80 border-r border-sepia-800 overflow-y-auto bg-sepia-950/30 flex flex-col">
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-4 gap-1 p-1 bg-sepia-950 rounded-xl border border-sepia-800">
              <button 
                onClick={() => setViewMode('stories')}
                className={`py-2 rounded-lg text-[8px] font-bold uppercase tracking-widest transition-all ${viewMode === 'stories' ? 'bg-sepia-500 text-sepia-950' : 'text-sepia-400 hover:text-sepia-200'}`}
              >
                Historias
              </button>
              <button 
                onClick={() => setViewMode('historians')}
                className={`py-2 rounded-lg text-[8px] font-bold uppercase tracking-widest transition-all ${viewMode === 'historians' ? 'bg-sepia-500 text-sepia-950' : 'text-sepia-400 hover:text-sepia-200'}`}
              >
                Historiadores
              </button>
              <button 
                onClick={() => setViewMode('restored')}
                className={`py-2 rounded-lg text-[8px] font-bold uppercase tracking-widest transition-all ${viewMode === 'restored' ? 'bg-sepia-500 text-sepia-950' : 'text-sepia-400 hover:text-sepia-200'}`}
              >
                Galería
              </button>
              <button 
                onClick={() => setViewMode('travels')}
                className={`py-2 rounded-lg text-[8px] font-bold uppercase tracking-widest transition-all ${viewMode === 'travels' ? 'bg-sepia-500 text-sepia-950' : 'text-sepia-400 hover:text-sepia-200'}`}
              >
                Viajes
              </button>
              <button 
                onClick={() => setViewMode('family_keys')}
                className={`py-2 rounded-lg text-[8px] font-bold uppercase tracking-widest transition-all ${viewMode === 'family_keys' ? 'bg-sepia-500 text-sepia-950' : 'text-sepia-400 hover:text-sepia-200'}`}
              >
                Claves Árbol
              </button>
              <button 
                onClick={() => setViewMode('shop')}
                className={`py-2 rounded-lg text-[8px] font-bold uppercase tracking-widest transition-all ${viewMode === 'shop' ? 'bg-sepia-500 text-sepia-950' : 'text-sepia-400 hover:text-sepia-200'}`}
              >
                Tienda
              </button>
              <button 
                onClick={() => setViewMode('sponsors')}
                className={`py-2 rounded-lg text-[8px] font-bold uppercase tracking-widest transition-all ${viewMode === 'sponsors' ? 'bg-sepia-500 text-sepia-950' : 'text-sepia-400 hover:text-sepia-200'}`}
              >
                Sponsors
              </button>
              <button 
                onClick={() => setViewMode('contests')}
                className={`py-2 rounded-lg text-[8px] font-bold uppercase tracking-widest transition-all ${viewMode === 'contests' ? 'bg-sepia-500 text-sepia-950' : 'text-sepia-400 hover:text-sepia-200'}`}
              >
                Concursos
              </button>
              <button 
                onClick={() => setViewMode('analytics')}
                className={`py-2 rounded-lg text-[8px] font-bold uppercase tracking-widest transition-all ${viewMode === 'analytics' ? 'bg-sepia-500 text-sepia-950' : 'text-sepia-400 hover:text-sepia-200'}`}
              >
                Analíticas
              </button>
              <button 
                onClick={() => setViewMode('mural')}
                className={`py-2 rounded-lg text-[8px] font-bold uppercase tracking-widest transition-all ${viewMode === 'mural' ? 'bg-sepia-500 text-sepia-950' : 'text-sepia-400 hover:text-sepia-200'}`}
              >
                Mural
              </button>
              <button 
                onClick={() => setViewMode('install_prompt')}
                className={`py-2 rounded-lg text-[8px] font-bold uppercase tracking-widest transition-all ${viewMode === 'install_prompt' ? 'bg-sepia-500 text-sepia-950' : 'text-sepia-400 hover:text-sepia-200'}`}
              >
                📱 App
              </button>
              <button 
                onClick={() => setViewMode('collaborators')}
                className={`py-2 rounded-lg text-[8px] font-bold uppercase tracking-widest transition-all ${viewMode === 'collaborators' ? 'bg-sepia-500 text-sepia-950' : 'text-sepia-400 hover:text-sepia-200'}`}
              >
                👥 Colab.
              </button>
            </div>

            {viewMode === 'shop' ? (
              <button 
                onClick={() => {
                  setEditingProduct({ 
                    title: '', 
                    description: '', 
                    price: 0, 
                    image_url: '', 
                    is_sold_out: false,
                    category: 'Antigüedad'
                  });
                  setEditingStory(null);
                  setEditingHistorian(null);
                  setEditingRestoredPhoto(null);
                  setEditingTravelPhoto(null);
                }}
                className="w-full bg-sepia-500 hover:bg-sepia-400 text-sepia-950 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
              >
                <Plus className="w-5 h-5" />
                Nuevo Producto
              </button>
            ) : viewMode === 'travels' ? (
              <button 
                onClick={() => {
                  setEditingTravelPhoto({ 
                    character_name: '', 
                    url: '', 
                    year: '', 
                    description: '', 
                    external_link: '' 
                  });
                  setEditingStory(null);
                  setEditingHistorian(null);
                  setEditingRestoredPhoto(null);
                }}
                className="w-full bg-sepia-500 hover:bg-sepia-400 text-sepia-950 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
              >
                <Plus className="w-5 h-5" />
                Nueva Foto del Viajero
              </button>
            ) : viewMode === 'stories' ? (
              <button 
                onClick={() => {
                  setEditingStory({ 
                    title: '', 
                    description: '',
                    fullNarrative: '',
                    thumbnail: '',
                    videoUrl: '',
                    audioUrl: '',
                    category: 'Familia', 
                    year: new Date().getFullYear().toString(), 
                    gallery: [], 
                    isPrivate: false,
                    isVideoVertical: false,
                    likes: 0
                  });
                  setEditingHistorian(null);
                  setEditingRestoredPhoto(null);
                }}
                className="w-full bg-sepia-500 hover:bg-sepia-400 text-sepia-950 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
              >
                <Plus className="w-5 h-5" />
                Nueva Historia
              </button>
            ) : viewMode === 'historians' ? (
              <button 
                onClick={() => {
                  setEditingHistorian({ 
                    name: '', 
                    bio: '',
                    photo: '',
                    specialty: '',
                    books: [],
                    contact_link: ''
                  });
                  setEditingStory(null);
                  setEditingRestoredPhoto(null);
                }}
                className="w-full bg-sepia-500 hover:bg-sepia-400 text-sepia-950 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
              >
                <Plus className="w-5 h-5" />
                Nuevo Historiador
              </button>
            ) : viewMode === 'restored' ? (
              <button 
                onClick={() => {
                  setEditingRestoredPhoto({ 
                    title: '', 
                    url: '',
                    is_vertical: false,
                    place: '',
                    era: '',
                    intervention_type: 'Restaurada',
                    description: '',
                    category: 'Todos',
                    images: []
                  });
                  setEditingStory(null);
                  setEditingHistorian(null);
                }}
                className="w-full bg-sepia-500 hover:bg-sepia-400 text-sepia-950 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
              >
                <Plus className="w-5 h-5" />
                Nueva Foto Restaurada
              </button>
            ) : viewMode === 'sponsors' ? (
              <button 
                onClick={() => {
                  setEditingSponsor({ 
                    name: '', 
                    logo_url: '',
                    website_url: '',
                    is_active: true
                  });
                  setEditingStory(null);
                  setEditingHistorian(null);
                  setEditingRestoredPhoto(null);
                  setEditingTravelPhoto(null);
                  setEditingProduct(null);
                }}
                className="w-full bg-sepia-500 hover:bg-sepia-400 text-sepia-950 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
              >
                <Plus className="w-5 h-5" />
                Nuevo Patrocinador
              </button>
            ) : viewMode === 'mural' ? (
              <button
                onClick={() => {
                  setEditingMuralPhoto({ person_name: '', photo_url: '', encounter_text: '', is_vertical: false, display_order: 0 });
                  setEditingStory(null);
                  setEditingHistorian(null);
                  setEditingRestoredPhoto(null);
                  setEditingTravelPhoto(null);
                  setEditingProduct(null);
                  setEditingSponsor(null);
                }}
                className="w-full bg-sepia-500 hover:bg-sepia-400 text-sepia-950 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
              >
                <Plus className="w-5 h-5" />
                Nueva Foto Mural
              </button>
            ) : null}

            <div className="space-y-2">
              {viewMode === 'stories' ? (
                stories.map(story => (
                  <div key={story.id} className="group">
                    <div 
                      className={`p-4 rounded-xl transition-all cursor-pointer flex items-center justify-between ${editingStory?.id === story.id ? 'bg-sepia-800/50 border border-sepia-500/30' : 'hover:bg-sepia-900/50 border border-transparent'}`}
                      onClick={() => setEditingStory(story)}
                    >
                      <div className="overflow-hidden">
                        <h4 className="text-sepia-100 font-medium truncate">{story.title}</h4>
                        <div className="flex items-center gap-2">
                          <p className="text-sepia-500 text-xs uppercase tracking-tighter">{story.category} • {story.year}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDelete(story.id); }}
                          className="p-1.5 text-red-400 hover:bg-red-400/10 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : viewMode === 'historians' ? (
                historians.map(h => (
                  <div key={h.id} className="group">
                    <div 
                      className={`p-4 rounded-xl transition-all cursor-pointer flex items-center justify-between ${editingHistorian?.id === h.id ? 'bg-sepia-800/50 border border-sepia-500/30' : 'hover:bg-sepia-900/50 border border-transparent'}`}
                      onClick={() => setEditingHistorian(h)}
                    >
                      <div className="overflow-hidden">
                        <h4 className="text-sepia-100 font-medium truncate">{h.name}</h4>
                        <p className="text-sepia-500 text-[10px] uppercase tracking-widest">{h.specialty}</p>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteHistorian(h.id); }}
                        className="p-1.5 text-red-400 hover:bg-red-400/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              ) : viewMode === 'restored' ? (
                restoredPhotos.map(p => (
                  <div key={p.id} className="group">
                    <div 
                      className={`p-4 rounded-xl transition-all cursor-pointer flex items-center justify-between ${editingRestoredPhoto?.id === p.id ? 'bg-sepia-800/50 border border-sepia-500/30' : 'hover:bg-sepia-900/50 border border-transparent'}`}
                      onClick={() => setEditingRestoredPhoto(p)}
                    >
                      <div className="overflow-hidden">
                        <h4 className="text-sepia-100 font-medium truncate">{p.title}</h4>
                        <p className="text-sepia-500 text-[10px] uppercase tracking-widest">Foto Restaurada</p>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteRestoredPhoto(p.id); }}
                        className="p-1.5 text-red-400 hover:bg-red-400/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              ) : viewMode === 'travels' ? (
                travelPhotos.map(p => (
                  <div key={p.id} className="group">
                    <div 
                      className={`p-4 rounded-xl transition-all cursor-pointer flex items-center justify-between ${editingTravelPhoto?.id === p.id ? 'bg-sepia-800/50 border border-sepia-500/30' : 'hover:bg-sepia-900/50 border border-transparent'}`}
                      onClick={() => setEditingTravelPhoto(p)}
                    >
                      <div className="overflow-hidden">
                        <h4 className="text-sepia-100 font-medium truncate">{p.character_name}</h4>
                        <p className="text-sepia-500 text-[10px] uppercase tracking-widest">{p.year}</p>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteTravelPhoto(p.id); }}
                        className="p-1.5 text-red-400 hover:bg-red-400/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              ) : viewMode === 'shop' ? (
                products.map(p => (
                  <div key={p.id} className="group">
                    <div 
                      className={`p-4 rounded-xl transition-all cursor-pointer flex items-center justify-between ${editingProduct?.id === p.id ? 'bg-sepia-800/50 border border-sepia-500/30' : 'hover:bg-sepia-900/50 border border-transparent'}`}
                      onClick={() => setEditingProduct(p)}
                    >
                      <div className="overflow-hidden">
                        <h4 className="text-sepia-100 font-medium truncate">{p.title}</h4>
                        <div className="flex items-center gap-2">
                          <p className="text-sepia-500 text-[10px] uppercase tracking-widest">${p.price}</p>
                          {p.is_sold_out && (
                            <span className="text-[8px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded uppercase font-bold">Agotado</span>
                          )}
                        </div>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteProduct(p.id); }}
                        className="p-1.5 text-red-400 hover:bg-red-400/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              ) : viewMode === 'sponsors' ? (
                sponsors.map(s => (
                  <div key={s.id} className="group">
                    <div 
                      className={`p-4 rounded-xl transition-all cursor-pointer flex items-center justify-between ${editingSponsor?.id === s.id ? 'bg-sepia-800/50 border border-sepia-500/30' : 'hover:bg-sepia-900/50 border border-transparent'}`}
                      onClick={() => setEditingSponsor(s)}
                    >
                      <div className="overflow-hidden">
                        <h4 className="text-sepia-100 font-medium truncate">{s.name}</h4>
                        <div className="flex items-center gap-2">
                          <p className="text-sepia-500 text-[10px] uppercase tracking-widest">Patrocinador</p>
                          {!s.is_active && (
                            <span className="text-[8px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded uppercase font-bold">Inactivo</span>
                          )}
                        </div>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteSponsor(s.id); }}
                        className="p-1.5 text-red-400 hover:bg-red-400/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              ) : viewMode === 'mural' ? (
                muralPhotos.map(p => (
                  <div key={p.id} className="group">
                    <div
                      className={`p-4 rounded-xl transition-all cursor-pointer flex items-center justify-between ${editingMuralPhoto?.id === p.id ? 'bg-sepia-800/50 border border-sepia-500/30' : 'hover:bg-sepia-900/50 border border-transparent'}`}
                      onClick={() => setEditingMuralPhoto(p)}
                    >
                      <div className="overflow-hidden">
                        <h4 className="text-sepia-100 font-medium truncate">{p.person_name}</h4>
                        <p className="text-sepia-500 text-[10px] uppercase tracking-widest">{p.is_vertical ? 'Vertical' : 'Horizontal'}</p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteMuralPhoto(p.id); }}
                        className="p-1.5 text-red-400 hover:bg-red-400/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        disabled={isDeleting === p.id}
                      >
                        {isDeleting === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                ))
              ) : viewMode === 'family_keys' ? (
                familyKeys.map(k => (
                  <div key={k.id} className="group">
                    <div 
                      className={`p-4 rounded-xl transition-all flex items-center justify-between ${k.is_used ? 'bg-sepia-950/30 opacity-60' : 'bg-sepia-900/20 hover:bg-sepia-900/50 border border-transparent'}`}
                    >
                      <div className="overflow-hidden">
                        <h4 className="text-sepia-100 font-mono text-sm tracking-wider">{k.key_code}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${k.is_used ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                            {k.is_used ? 'USADA' : 'DISPONIBLE'}
                          </span>
                          <span className="text-sepia-500 text-[10px] uppercase tracking-widest">{k.duration_days} Días</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => deleteFamilyKey(k.id)}
                        className="p-1.5 text-red-400 hover:bg-red-400/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              ) : null}
            </div>
          </div>
          
          <div className="mt-auto p-4 border-t border-sepia-800 space-y-2">
            <button 
              onClick={() => {
                setViewMode('codes');
                setEditingStory(null);
                setEditingHistorian(null);
                setEditingRestoredPhoto(null);
              }}
              className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${viewMode === 'codes' ? 'bg-sepia-500 text-sepia-950' : 'text-sepia-400 hover:bg-sepia-900/50'}`}
            >
              <Key className="w-5 h-5" />
              Códigos
            </button>
            <button 
              onClick={() => {
                setViewMode('settings');
                setEditingStory(null);
                setEditingHistorian(null);
                setEditingRestoredPhoto(null);
              }}
              className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${viewMode === 'settings' ? 'bg-sepia-100 text-sepia-950' : 'text-sepia-400 hover:bg-sepia-900/50'}`}
            >
              <Settings className="w-5 h-5" />
              Configuración
            </button>
          </div>
        </aside>

        {/* Main Content - Editor */}
        <main className="flex-grow overflow-y-auto p-6 md:p-10 bg-sepia-900/20">
          <AnimatePresence mode="wait">
            {viewMode === 'settings' ? (
              <motion.div 
                key="settings"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-4xl mx-auto"
              >
                <div className="flex items-center justify-between mb-10">
                  <h2 className="text-3xl font-serif text-sepia-100">Configuración General</h2>
                  <button 
                    onClick={saveSettings}
                    disabled={isSaving}
                    className="bg-sepia-500 hover:bg-sepia-400 text-sepia-950 px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    Guardar Cambios
                  </button>
                </div>

                <div className="bg-sepia-950/50 border border-sepia-800 rounded-3xl p-8 space-y-8">
                  <div className="space-y-4">
                    <label className="text-sepia-100 font-serif text-xl block">Video de Introducción</label>
                    <p className="text-sepia-400 text-sm">Este video se mostrará en la portada principal del sitio.</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sepia-400 text-xs uppercase tracking-widest font-bold">Enlace del Video (YouTube/Directo)</label>
                        <input 
                          type="text"
                          value={introVideoUrl}
                          onChange={e => setIntroVideoUrl(e.target.value)}
                          className="w-full bg-sepia-950 border border-sepia-800 rounded-xl p-4 text-sepia-100 focus:border-sepia-500 outline-none transition-all"
                          placeholder="https://..."
                        />
                        <div className="flex items-center gap-3 mt-2">
                          <input 
                            type="checkbox"
                            id="introVideoIsVertical"
                            checked={introVideoIsVertical}
                            onChange={e => setIntroVideoIsVertical(e.target.checked)}
                            className="w-5 h-5 accent-sepia-500"
                          />
                          <label htmlFor="introVideoIsVertical" className="text-sepia-300 text-sm">¿Es video vertical? (Reel / TikTok / Shorts)</label>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sepia-400 text-xs uppercase tracking-widest font-bold">O subir desde PC</label>
                        <div className="relative">
                          <input 
                            type="file"
                            accept="video/*"
                            onChange={handleVideoUpload}
                            className="hidden"
                            id="intro-video-upload"
                            disabled={isUploading}
                          />
                          <label 
                            htmlFor="intro-video-upload"
                            className={`w-full bg-sepia-950 border border-sepia-800 border-dashed rounded-xl p-4 text-sepia-400 flex items-center justify-center gap-3 cursor-pointer hover:border-sepia-500 transition-all ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                            {isUploading ? 'Subiendo...' : 'Seleccionar Video'}
                          </label>
                        </div>
                      </div>
                    </div>

                    {introVideoUrl && (
                      <div className={`mt-6 ${introVideoIsVertical ? 'max-w-[300px] aspect-[9/16]' : 'aspect-video'} bg-sepia-950 rounded-2xl overflow-hidden border border-sepia-800 mx-auto`}>
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
                            className="w-full h-full"
                          />
                        )}
                      </div>
                    )}

                    <div className="space-y-4 pt-6 border-t border-sepia-800">
                      <label className="text-sepia-100 font-serif text-xl block">Imagen de Portada (Hero)</label>
                      <p className="text-sepia-400 text-sm">Esta imagen aparecerá de fondo en la página principal.</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-sepia-400 text-xs uppercase tracking-widest font-bold">URL de la Imagen</label>
                          <input 
                            type="text"
                            value={heroBgUrl}
                            onChange={e => setHeroBgUrl(e.target.value)}
                            className="w-full bg-sepia-950 border border-sepia-800 rounded-xl p-4 text-sepia-100 focus:border-sepia-500 outline-none transition-all"
                            placeholder="https://..."
                          />
                        </div>
                        {heroBgUrl && (
                          <div className="aspect-video rounded-xl overflow-hidden border-2 border-sepia-800">
                            <img src={heroBgUrl} alt="Hero Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4 pt-6 border-t border-sepia-800">
                      <label className="text-sepia-100 font-serif text-xl block">Efectos Creativos</label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex items-center justify-between p-4 bg-sepia-950 rounded-xl border border-sepia-800">
                          <div className="flex items-center gap-3">
                            <Scroll className="w-5 h-5 text-sepia-500" />
                            <span className="text-sepia-100 text-sm">Sección de Investigación</span>
                          </div>
                          <input 
                            type="checkbox"
                            checked={investigationEnabled}
                            onChange={e => setInvestigationEnabled(e.target.checked)}
                            className="w-6 h-6 accent-sepia-500"
                          />
                        </div>
                        <div className="flex items-center justify-between p-4 bg-sepia-950 rounded-xl border border-sepia-800">
                          <div className="flex items-center gap-3">
                            <Volume2 className="w-5 h-5 text-sepia-500" />
                            <span className="text-sepia-100 text-sm">Narrativa Radial</span>
                          </div>
                          <input 
                            type="checkbox"
                            checked={radioNarrativeEnabled}
                            onChange={e => setRadioNarrativeEnabled(e.target.checked)}
                            className="w-6 h-6 accent-sepia-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : viewMode === 'family_keys' ? (
              <motion.div 
                key="family_keys"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-4xl mx-auto"
              >
                <div className="flex items-center justify-between mb-10">
                  <h2 className="text-3xl font-serif text-sepia-100">Claves del Árbol Genealógico</h2>
                </div>

                <div className="bg-sepia-950/50 border border-sepia-800 rounded-3xl p-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    {[7, 15, 30].map(days => (
                      <button
                        key={days}
                        onClick={() => generateFamilyKey(days)}
                        className="flex flex-col items-center gap-4 p-8 bg-sepia-900/40 border border-sepia-800 rounded-2xl hover:border-sepia-500 hover:bg-sepia-800/60 transition-all group"
                      >
                        <div className="w-16 h-16 rounded-full bg-sepia-500/10 flex items-center justify-center group-hover:bg-sepia-500/20 transition-all">
                          <Key className="w-8 h-8 text-sepia-500" />
                        </div>
                        <div className="text-center">
                          <span className="block text-2xl font-serif text-sepia-100">{days} Días</span>
                          <span className="text-sepia-500 text-xs uppercase tracking-widest">Generar Clave</span>
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sepia-400 text-xs uppercase tracking-[0.2em] font-bold border-b border-sepia-800 pb-2">Claves Generadas Recientemente</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {familyKeys.map(k => (
                        <div key={k.id} className={`p-4 rounded-xl border flex items-center justify-between ${k.expires_at ? (new Date(k.expires_at) < new Date() ? 'bg-red-950/20 border-red-900/30 opacity-60' : 'bg-sepia-950/20 border-sepia-900 opacity-80') : 'bg-sepia-900/40 border-sepia-800'}`}>
                          <div>
                            <span className="block font-mono text-lg text-sepia-100 tracking-widest">{k.key_code}</span>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-sepia-500 text-[10px] uppercase tracking-widest">{k.duration_days} Días</span>
                              <span className={`text-[10px] font-bold ${!k.expires_at ? 'text-green-500' : (new Date(k.expires_at) < new Date() ? 'text-red-500' : 'text-orange-500')}`}>
                                {!k.expires_at ? 'DISPONIBLE' : (new Date(k.expires_at) < new Date() ? 'VENCIDA' : 'ACTIVA')}
                              </span>
                              {k.expires_at && (
                                <span className="text-sepia-500 text-[10px]">
                                  {new Date(k.expires_at) < new Date() ? 'Venció: ' : 'Expira: '}
                                  {new Date(k.expires_at).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => {
                                navigator.clipboard.writeText(k.key_code);
                                setMessage({ type: 'success', text: 'Copiado al portapapeles' });
                                setTimeout(() => setMessage(null), 2000);
                              }}
                              className="p-2 text-sepia-400 hover:text-sepia-100 hover:bg-sepia-800 rounded-lg transition-all"
                              title="Copiar Clave"
                            >
                              <Share2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => deleteFamilyKey(k.id)}
                              className="p-2 text-red-400 hover:text-red-100 hover:bg-red-900/20 rounded-lg transition-all"
                              title="Eliminar Clave"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : viewMode === 'codes' ? (
              <motion.div 
                key="codes"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-4xl mx-auto"
              >
                <div className="flex items-center justify-between mb-10">
                  <div>
                    <h2 className="text-3xl font-serif text-sepia-100">Códigos de Descarga</h2>
                    <p className="text-sepia-500 mt-2">Genera códigos para que tus clientes descarguen sus pergaminos.</p>
                  </div>
                  <button 
                    onClick={generateCode}
                    className="bg-sepia-500 hover:bg-sepia-400 text-sepia-950 px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all"
                  >
                    <Plus className="w-5 h-5" />
                    Generar Nuevo Código
                  </button>
                </div>

                <div className="bg-sepia-950/50 border border-sepia-800 rounded-3xl overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-sepia-900/50 border-b border-sepia-800">
                        <th className="p-6 text-sepia-400 text-xs uppercase tracking-widest font-bold">Código</th>
                        <th className="p-6 text-sepia-400 text-xs uppercase tracking-widest font-bold">Estado</th>
                        <th className="p-6 text-sepia-400 text-xs uppercase tracking-widest font-bold">Fecha</th>
                        <th className="p-6 text-sepia-400 text-xs uppercase tracking-widest font-bold text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-sepia-800">
                      {investigationCodes.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-20 text-center text-sepia-500 italic">
                            No hay códigos generados todavía.
                          </td>
                        </tr>
                      ) : (
                        investigationCodes.map(code => (
                          <tr key={code.id} className="hover:bg-sepia-900/30 transition-colors">
                            <td className="p-6">
                              <span className="font-mono text-xl text-sepia-100 tracking-wider">{code.code}</span>
                            </td>
                            <td className="p-6">
                              {code.is_used ? (
                                <span className="px-3 py-1 bg-red-500/10 text-red-500 rounded-full text-xs font-bold uppercase">Usado</span>
                              ) : (
                                <span className="px-3 py-1 bg-green-500/10 text-green-500 rounded-full text-xs font-bold uppercase">Disponible</span>
                              )}
                            </td>
                            <td className="p-6 text-sepia-500 text-sm">
                              {new Date(code.created_at).toLocaleDateString()}
                            </td>
                            <td className="p-6 text-right">
                              <button 
                                onClick={() => deleteCode(code.id)}
                                className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            ) : viewMode === 'sponsors' && editingSponsor ? (
              <motion.div 
                key="sponsor-editor"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="max-w-4xl mx-auto"
              >
                <form onSubmit={handleSaveSponsor} className="space-y-8">
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-3xl font-serif text-sepia-100">
                      {editingSponsor.id ? 'Editar Patrocinador' : 'Nuevo Patrocinador'}
                    </h2>
                    <div className="flex gap-4">
                      <button 
                        type="button"
                        onClick={() => setEditingSponsor(null)}
                        className="px-6 py-3 rounded-xl font-bold text-sepia-400 hover:bg-sepia-800 transition-all"
                      >
                        Cancelar
                      </button>
                      <button 
                        type="submit"
                        disabled={isSaving}
                        className="bg-sepia-500 hover:bg-sepia-400 text-sepia-950 px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all disabled:opacity-50"
                      >
                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        Guardar Patrocinador
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div className="bg-sepia-950/50 border border-sepia-800 rounded-3xl p-8 space-y-6">
                        <div>
                          <label className="block text-xs uppercase tracking-widest font-bold text-sepia-500 mb-2">Nombre de la Empresa</label>
                          <input 
                            type="text" 
                            value={editingSponsor.name}
                            onChange={e => setEditingSponsor({...editingSponsor, name: e.target.value})}
                            className="w-full bg-sepia-900 border border-sepia-800 rounded-xl p-4 text-sepia-100 outline-none focus:border-sepia-500 transition-all"
                            placeholder="Ej: Relojería El Tiempo"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-xs uppercase tracking-widest font-bold text-sepia-500 mb-2">URL del Logo</label>
                          <div className="flex gap-2">
                            <input 
                              type="text" 
                              value={editingSponsor.logo_url}
                              onChange={e => setEditingSponsor({...editingSponsor, logo_url: e.target.value})}
                              className="flex-grow bg-sepia-900 border border-sepia-800 rounded-xl p-4 text-sepia-100 outline-none focus:border-sepia-500 transition-all"
                              placeholder="https://..."
                              required
                            />
                            <div className="relative">
                              <input 
                                type="file" 
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    handleImageUpload(file).then(url => {
                                      if (url) setEditingSponsor({...editingSponsor, logo_url: url});
                                    });
                                  }
                                }}
                                className="hidden"
                                id="sponsor-logo-upload"
                              />
                              <label 
                                htmlFor="sponsor-logo-upload"
                                className="bg-sepia-800 hover:bg-sepia-700 text-sepia-100 p-4 rounded-xl cursor-pointer flex items-center justify-center transition-all"
                              >
                                <Upload className="w-5 h-5" />
                              </label>
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs uppercase tracking-widest font-bold text-sepia-500 mb-2">Enlace Web (Opcional)</label>
                          <input 
                            type="text" 
                            value={editingSponsor.website_url}
                            onChange={e => setEditingSponsor({...editingSponsor, website_url: e.target.value})}
                            className="w-full bg-sepia-900 border border-sepia-800 rounded-xl p-4 text-sepia-100 outline-none focus:border-sepia-500 transition-all"
                            placeholder="https://empresa.com"
                          />
                        </div>

                        <div className="flex items-center gap-3 p-4 bg-sepia-900/50 rounded-2xl border border-sepia-800">
                          <input 
                            type="checkbox"
                            id="sponsor_is_active"
                            checked={editingSponsor.is_active}
                            onChange={e => setEditingSponsor({...editingSponsor, is_active: e.target.checked})}
                            className="w-5 h-5 rounded border-sepia-700 bg-sepia-950 text-sepia-500 focus:ring-sepia-500"
                          />
                          <label htmlFor="sponsor_is_active" className="text-sm font-bold text-sepia-100 uppercase tracking-widest cursor-pointer">
                            Patrocinador Activo
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="bg-sepia-950/50 border border-sepia-800 rounded-3xl p-8">
                        <label className="block text-xs uppercase tracking-widest font-bold text-sepia-500 mb-4">Vista Previa del Logo</label>
                        <div className="aspect-square bg-sepia-900 rounded-2xl border border-sepia-800 flex items-center justify-center overflow-hidden">
                          {editingSponsor.logo_url ? (
                            <img 
                              src={editingSponsor.logo_url} 
                              alt="Preview" 
                              className="w-full h-full object-contain p-8 filter sepia brightness-75 contrast-125"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="text-center p-8">
                              <ImageIcon className="w-12 h-12 text-sepia-800 mx-auto mb-4" />
                              <p className="text-sepia-500 text-sm">Sube un logo para ver la vista previa con efecto sepia</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </form>
              </motion.div>
            ) : viewMode === 'shop' && editingProduct ? (
              <motion.div 
                key="product-editor"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="max-w-4xl mx-auto"
              >
                <form onSubmit={handleSaveProduct} className="space-y-8">
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-3xl font-serif text-sepia-100">
                      {editingProduct.id ? 'Editar Producto' : 'Nuevo Producto'}
                    </h2>
                    <div className="flex gap-4">
                      <button 
                        type="button"
                        onClick={() => setEditingProduct(null)}
                        className="px-6 py-3 rounded-xl font-bold text-sepia-400 hover:bg-sepia-800 transition-all"
                      >
                        Cancelar
                      </button>
                      <button 
                        type="submit"
                        disabled={isSaving}
                        className="bg-sepia-500 hover:bg-sepia-400 text-sepia-950 px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all disabled:opacity-50"
                      >
                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        Guardar Producto
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div className="bg-sepia-950/50 border border-sepia-800 rounded-3xl p-8 space-y-6">
                        <div>
                          <label className="block text-xs uppercase tracking-widest font-bold text-sepia-500 mb-2">Título del Producto</label>
                          <input 
                            type="text" 
                            value={editingProduct.title}
                            onChange={e => setEditingProduct({...editingProduct, title: e.target.value})}
                            className="w-full bg-sepia-900 border border-sepia-800 rounded-xl p-4 text-sepia-100 outline-none focus:border-sepia-500 transition-all"
                            placeholder="Ej: Reloj de Bolsillo del Siglo XIX"
                            required
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs uppercase tracking-widest font-bold text-sepia-500 mb-2">Precio ($)</label>
                            <div className="relative">
                              <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-sepia-500" />
                              <input 
                                type="number" 
                                value={editingProduct.price}
                                onChange={e => setEditingProduct({...editingProduct, price: parseFloat(e.target.value)})}
                                className="w-full bg-sepia-900 border border-sepia-800 rounded-xl p-4 pl-10 text-sepia-100 outline-none focus:border-sepia-500 transition-all"
                                placeholder="0.00"
                                step="0.01"
                                required
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs uppercase tracking-widest font-bold text-sepia-500 mb-2">Categoría</label>
                            <select 
                              value={editingProduct.category}
                              onChange={e => setEditingProduct({...editingProduct, category: e.target.value})}
                              className="w-full bg-sepia-900 border border-sepia-800 rounded-xl p-4 text-sepia-100 outline-none focus:border-sepia-500 transition-all"
                            >
                              <option value="Antigüedad">Antigüedad</option>
                              <option value="Souvenir">Souvenir</option>
                              <option value="Accesorio">Accesorio</option>
                              <option value="Otro">Otro</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs uppercase tracking-widest font-bold text-sepia-500 mb-2">URL de la Imagen</label>
                          <div className="flex gap-2">
                            <input 
                              type="text" 
                              value={editingProduct.image_url}
                              onChange={e => setEditingProduct({...editingProduct, image_url: e.target.value})}
                              className="flex-grow bg-sepia-900 border border-sepia-800 rounded-xl p-4 text-sepia-100 outline-none focus:border-sepia-500 transition-all"
                              placeholder="https://..."
                              required
                            />
                            <div className="relative">
                              <input 
                                type="file" 
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    handleImageUpload(file).then(url => {
                                      if (url) setEditingProduct({...editingProduct, image_url: url});
                                    });
                                  }
                                }}
                                className="hidden"
                                id="product-image-upload"
                              />
                              <label 
                                htmlFor="product-image-upload"
                                className="bg-sepia-800 hover:bg-sepia-700 text-sepia-100 p-4 rounded-xl cursor-pointer flex items-center justify-center transition-all"
                              >
                                <Upload className="w-5 h-5" />
                              </label>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 p-4 bg-sepia-900/50 rounded-2xl border border-sepia-800">
                          <input 
                            type="checkbox"
                            id="is_sold_out"
                            checked={editingProduct.is_sold_out}
                            onChange={e => setEditingProduct({...editingProduct, is_sold_out: e.target.checked})}
                            className="w-5 h-5 rounded border-sepia-700 bg-sepia-950 text-sepia-500 focus:ring-sepia-500"
                          />
                          <label htmlFor="is_sold_out" className="text-sm font-bold text-sepia-100 uppercase tracking-widest cursor-pointer">
                            Marcar como Agotado
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="bg-sepia-950/50 border border-sepia-800 rounded-3xl p-8 space-y-6">
                        <div>
                          <label className="block text-xs uppercase tracking-widest font-bold text-sepia-500 mb-2">Descripción</label>
                          <textarea 
                            value={editingProduct.description || ''}
                            onChange={e => setEditingProduct({...editingProduct, description: e.target.value})}
                            className="w-full bg-sepia-900 border border-sepia-800 rounded-xl p-4 text-sepia-100 outline-none focus:border-sepia-500 transition-all min-h-[150px] resize-none"
                            placeholder="Describe el producto, su historia o procedencia..."
                          />
                        </div>

                        {editingProduct.image_url && (
                          <div>
                            <label className="block text-xs uppercase tracking-widest font-bold text-sepia-500 mb-2">Vista Previa</label>
                            <div className="aspect-square rounded-2xl overflow-hidden border border-sepia-800 bg-sepia-900">
                              <img 
                                src={editingProduct.image_url} 
                                alt="Preview" 
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </form>
              </motion.div>
            ) : viewMode === 'travels' && editingTravelPhoto ? (
              <motion.div 
                key="travel-editor"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="max-w-4xl mx-auto"
              >
                <form onSubmit={handleSaveTravelPhoto} className="space-y-8">
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-3xl font-serif text-sepia-100">
                      {editingTravelPhoto.id ? 'Editar Foto del Viajero' : 'Nueva Foto del Viajero'}
                    </h2>
                    <div className="flex gap-4">
                      <button 
                        type="button"
                        onClick={() => setEditingTravelPhoto(null)}
                        className="px-6 py-3 rounded-xl font-bold text-sepia-400 hover:bg-sepia-800 transition-all"
                      >
                        Cancelar
                      </button>
                      <button 
                        type="submit"
                        disabled={isSaving}
                        className="bg-sepia-500 hover:bg-sepia-400 text-sepia-950 px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all disabled:opacity-50"
                      >
                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        Guardar Foto
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div className="bg-sepia-950/50 border border-sepia-800 rounded-3xl p-8 space-y-6">
                        <div>
                          <label className="block text-xs uppercase tracking-widest font-bold text-sepia-500 mb-2">Nombre del Personaje</label>
                          <input 
                            type="text" 
                            value={editingTravelPhoto.character_name}
                            onChange={e => setEditingTravelPhoto({...editingTravelPhoto, character_name: e.target.value})}
                            className="w-full bg-sepia-900 border border-sepia-800 rounded-xl p-4 text-sepia-100 outline-none focus:border-sepia-500 transition-all"
                            placeholder="Ej: Albert Einstein, Frida Kahlo..."
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-xs uppercase tracking-widest font-bold text-sepia-500 mb-2">Año del Encuentro</label>
                          <input 
                            type="text" 
                            value={editingTravelPhoto.year || ''}
                            onChange={e => setEditingTravelPhoto({...editingTravelPhoto, year: e.target.value})}
                            className="w-full bg-sepia-900 border border-sepia-800 rounded-xl p-4 text-sepia-100 outline-none focus:border-sepia-500 transition-all"
                            placeholder="Ej: 1945, Siglo XIX..."
                          />
                        </div>

                        <div>
                          <label className="block text-xs uppercase tracking-widest font-bold text-sepia-500 mb-2">URL de la Imagen</label>
                          <div className="flex gap-2">
                            <input 
                              type="text" 
                              value={editingTravelPhoto.url}
                              onChange={e => setEditingTravelPhoto({...editingTravelPhoto, url: e.target.value})}
                              className="flex-grow bg-sepia-900 border border-sepia-800 rounded-xl p-4 text-sepia-100 outline-none focus:border-sepia-500 transition-all"
                              placeholder="https://..."
                              required
                            />
                            <div className="relative">
                              <input 
                                type="file" 
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    handleImageUpload(file).then(url => {
                                      if (url) setEditingTravelPhoto({...editingTravelPhoto, url});
                                    });
                                  }
                                }}
                                className="hidden"
                                id="travel-photo-upload"
                              />
                              <label 
                                htmlFor="travel-photo-upload"
                                className="bg-sepia-800 hover:bg-sepia-700 text-sepia-100 p-4 rounded-xl cursor-pointer flex items-center justify-center transition-all"
                              >
                                <Upload className="w-5 h-5" />
                              </label>
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs uppercase tracking-widest font-bold text-sepia-500 mb-2">Enlace Externo (Opcional)</label>
                          <input 
                            type="text" 
                            value={editingTravelPhoto.external_link || ''}
                            onChange={e => setEditingTravelPhoto({...editingTravelPhoto, external_link: e.target.value})}
                            className="w-full bg-sepia-900 border border-sepia-800 rounded-xl p-4 text-sepia-100 outline-none focus:border-sepia-500 transition-all"
                            placeholder="https://wikipedia.org/..."
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="bg-sepia-950/50 border border-sepia-800 rounded-3xl p-8 space-y-6">
                        <div>
                          <label className="block text-xs uppercase tracking-widest font-bold text-sepia-500 mb-2">Anécdota del Viaje</label>
                          <textarea 
                            value={editingTravelPhoto.description || ''}
                            onChange={e => setEditingTravelPhoto({...editingTravelPhoto, description: e.target.value})}
                            className="w-full bg-sepia-900 border border-sepia-800 rounded-xl p-4 text-sepia-100 outline-none focus:border-sepia-500 transition-all min-h-[200px] resize-none"
                            placeholder="Cuéntanos cómo fue conocer a este personaje..."
                          />
                        </div>

                        {editingTravelPhoto.url && (
                          <div>
                            <label className="block text-xs uppercase tracking-widest font-bold text-sepia-500 mb-2">Vista Previa</label>
                            <div className="aspect-square rounded-2xl overflow-hidden border border-sepia-800 bg-sepia-900">
                              <img 
                                src={editingTravelPhoto.url} 
                                alt="Preview" 
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </form>
              </motion.div>
            ) : viewMode === 'restored' && editingRestoredPhoto ? (
              <motion.div 
                key="restored-editor"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="max-w-4xl mx-auto"
              >
                <form onSubmit={handleSaveRestoredPhoto} className="space-y-8">
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-3xl font-serif text-sepia-100">
                      {editingRestoredPhoto.id ? 'Editar Foto Restaurada' : 'Nueva Foto Restaurada'}
                    </h2>
                    <div className="flex gap-4">
                      <button 
                        type="button"
                        onClick={() => setEditingRestoredPhoto(null)}
                        className="px-6 py-3 rounded-xl font-bold text-sepia-400 hover:bg-sepia-800 transition-all"
                      >
                        Cancelar
                      </button>
                      <button 
                        type="submit"
                        disabled={isSaving}
                        className="bg-sepia-500 hover:bg-sepia-400 text-sepia-950 px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all disabled:opacity-50"
                      >
                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        Guardar Foto
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div className="bg-sepia-950/50 border border-sepia-800 rounded-3xl p-8 space-y-6">
                        <div>
                          <label className="block text-xs uppercase tracking-widest font-bold text-sepia-500 mb-2">Título de la Foto</label>
                          <input 
                            type="text" 
                            value={editingRestoredPhoto.title}
                            onChange={e => setEditingRestoredPhoto({...editingRestoredPhoto, title: e.target.value})}
                            className="w-full bg-sepia-900 border border-sepia-800 rounded-xl p-4 text-sepia-100 outline-none focus:border-sepia-500 transition-all"
                            placeholder="Ej: Calle Real 1920..."
                            required
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs uppercase tracking-widest font-bold text-sepia-500 mb-2">Lugar</label>
                            <input 
                              type="text" 
                              value={editingRestoredPhoto.place || ''}
                              onChange={e => setEditingRestoredPhoto({...editingRestoredPhoto, place: e.target.value})}
                              className="w-full bg-sepia-900 border border-sepia-800 rounded-xl p-4 text-sepia-100 outline-none focus:border-sepia-500 transition-all"
                              placeholder="Ej: San Luis Potosí"
                            />
                          </div>
                          <div>
                            <label className="block text-xs uppercase tracking-widest font-bold text-sepia-500 mb-2">Época</label>
                            <input 
                              type="text" 
                              value={editingRestoredPhoto.era || ''}
                              onChange={e => setEditingRestoredPhoto({...editingRestoredPhoto, era: e.target.value})}
                              className="w-full bg-sepia-900 border border-sepia-800 rounded-xl p-4 text-sepia-100 outline-none focus:border-sepia-500 transition-all"
                              placeholder="Ej: 1920s"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs uppercase tracking-widest font-bold text-sepia-500 mb-2">Tipo de Intervención</label>
                          <select 
                            value={editingRestoredPhoto.intervention_type || 'Restaurada'}
                            onChange={e => setEditingRestoredPhoto({...editingRestoredPhoto, intervention_type: e.target.value as any})}
                            className="w-full bg-sepia-900 border border-sepia-800 rounded-xl p-4 text-sepia-100 outline-none focus:border-sepia-500 transition-all"
                          >
                            <option value="Restaurada">Restaurada</option>
                            <option value="Colorizada">Colorizada</option>
                            <option value="Recreada">Recreada</option>
                            <option value="Antes / Después">Antes / Después</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs uppercase tracking-widest font-bold text-sepia-500 mb-2">Categoría</label>
                          <select 
                            value={editingRestoredPhoto.category || 'Todos'}
                            onChange={e => setEditingRestoredPhoto({...editingRestoredPhoto, category: e.target.value})}
                            className="w-full bg-sepia-900 border border-sepia-800 rounded-xl p-4 text-sepia-100 outline-none focus:border-sepia-500 transition-all"
                          >
                            <option value="Todos">Todos</option>
                            <option value="Negocios">Negocios</option>
                            <option value="Lugares">Lugares</option>
                            <option value="Familias">Familias</option>
                            <option value="Retratos">Retratos</option>
                            <option value="San Luis antiguo">San Luis antiguo</option>
                            <option value="Antes y después">Antes y después</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs uppercase tracking-widest font-bold text-sepia-500 mb-2">Descripción Emocional/Histórica</label>
                          <textarea 
                            value={editingRestoredPhoto.description || ''}
                            onChange={e => setEditingRestoredPhoto({...editingRestoredPhoto, description: e.target.value})}
                            className="w-full bg-sepia-900 border border-sepia-800 rounded-xl p-4 text-sepia-100 outline-none focus:border-sepia-500 transition-all h-32 resize-none"
                            placeholder="Escribe una breve historia o descripción..."
                          />
                        </div>

                        <div>
                          <label className="block text-xs uppercase tracking-widest font-bold text-sepia-500 mb-4 flex items-center gap-2">
                            <ImageIcon className="w-4 h-4" /> Imágenes de la Locación (Sin Límite)
                          </label>
                          <div className="space-y-4">
                            {(editingRestoredPhoto.images || []).map((img, idx) => (
                              <div key={idx} className="p-4 bg-sepia-900/50 rounded-xl border border-sepia-800 space-y-3">
                                <div className="flex justify-between items-center">
                                  <span className="text-sepia-400 text-[10px] uppercase font-bold">Imagen #{idx + 1}</span>
                                  <button 
                                    type="button"
                                    onClick={() => {
                                      setEditingRestoredPhoto(prev => {
                                        if (!prev) return prev;
                                        const newImages = (prev.images || []).filter((_, i) => i !== idx);
                                        return {
                                          ...prev,
                                          images: newImages,
                                          url: idx === 0 && newImages.length > 0 ? newImages[0].url : prev.url
                                        };
                                      });
                                    }}
                                    className="text-red-400 hover:text-red-300"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                                <div className="space-y-2">
                                  <input 
                                    type="text" 
                                    value={img.title}
                                    onChange={e => {
                                      const newTitle = e.target.value;
                                      setEditingRestoredPhoto(prev => {
                                        if (!prev) return prev;
                                        const newImages = [...(prev.images || [])];
                                        newImages[idx].title = newTitle;
                                        return { ...prev, images: newImages };
                                      });
                                    }}
                                    className="w-full bg-sepia-950 border border-sepia-800 rounded-lg p-2 text-xs text-sepia-100"
                                    placeholder="Título de esta restauración (Ej: Fachada Exterior)"
                                  />
                                  <input 
                                    type="text" 
                                    value={img.url}
                                    onChange={e => {
                                      const newUrl = e.target.value;
                                      setEditingRestoredPhoto(prev => {
                                        if (!prev) return prev;
                                        const newImages = [...(prev.images || [])];
                                        newImages[idx].url = newUrl;
                                        return {
                                          ...prev,
                                          images: newImages,
                                          url: idx === 0 ? newUrl : prev.url
                                        };
                                      });
                                    }}
                                    className="w-full bg-sepia-950 border border-sepia-800 rounded-lg p-2 text-xs text-sepia-100"
                                    placeholder="URL de la imagen (https://...)"
                                  />
                                  <div className="flex items-center gap-2 pt-1">
                                    <input 
                                      type="checkbox" 
                                      id={`photo-vertical-${idx}`}
                                      checked={img.is_vertical || false}
                                      onChange={e => {
                                        const newVertical = e.target.checked;
                                        setEditingRestoredPhoto(prev => {
                                          if (!prev) return prev;
                                          const newImages = [...(prev.images || [])];
                                          newImages[idx].is_vertical = newVertical;
                                          return {
                                            ...prev,
                                            images: newImages,
                                            is_vertical: idx === 0 ? newVertical : prev.is_vertical
                                          };
                                        });
                                      }}
                                      className="w-4 h-4 rounded border-sepia-800 bg-sepia-950 text-sepia-500 focus:ring-sepia-500"
                                    />
                                    <label htmlFor={`photo-vertical-${idx}`} className="text-sepia-400 text-[10px] font-medium uppercase tracking-widest">¿Es vertical?</label>
                                  </div>
                                </div>
                              </div>
                            ))}
                            <button 
                              type="button"
                              onClick={() => setEditingRestoredPhoto(prev => {
                                if (!prev) return prev;
                                return {
                                  ...prev,
                                  images: [...(prev.images || []), { title: '', url: '', is_vertical: false }]
                                };
                              })}
                              className="w-full py-3 border-2 border-dashed border-sepia-800 rounded-xl text-sepia-500 hover:border-sepia-500 hover:text-sepia-400 transition-all text-sm font-bold"
                            >
                              + Añadir Restauración
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 p-4 bg-sepia-900/50 rounded-2xl border border-sepia-800">
                          <input 
                            type="checkbox" 
                            id="photo-vertical"
                            checked={editingRestoredPhoto.is_vertical || false}
                            onChange={e => setEditingRestoredPhoto({...editingRestoredPhoto, is_vertical: e.target.checked})}
                            className="w-5 h-5 rounded border-sepia-800 bg-sepia-950 text-sepia-500 focus:ring-sepia-500"
                          />
                          <label htmlFor="photo-vertical" className="text-sepia-100 font-medium">¿La foto es vertical? (Retrato)</label>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="bg-sepia-950/50 border border-sepia-800 rounded-3xl p-8">
                        <label className="block text-xs uppercase tracking-widest font-bold text-sepia-500 mb-4">Vista Previa (Con Filtro)</label>
                        {editingRestoredPhoto.url ? (
                          <div className={`${editingRestoredPhoto.is_vertical ? 'aspect-[4/5] max-w-[300px]' : 'aspect-video'} mx-auto rounded-xl overflow-hidden border-4 border-white shadow-xl relative`}>
                            <img 
                              src={editingRestoredPhoto.url} 
                              alt="Preview" 
                              className="w-full h-full object-cover sepia-filter grayscale-[0.3]"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 opacity-20 pointer-events-none mix-blend-overlay bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')]"></div>
                          </div>
                        ) : (
                          <div className="aspect-[4/5] rounded-xl bg-sepia-900 border-2 border-dashed border-sepia-800 flex flex-col items-center justify-center text-sepia-600">
                            <ImageIcon className="w-12 h-12 mb-2" />
                            <p className="text-sm">Ingresa una URL para ver la previa</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </form>
              </motion.div>
            ) : editingHistorian ? (
              <motion.div 
                key="historian-editor"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="max-w-4xl mx-auto"
              >
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-3xl font-serif text-sepia-100">Editor de Historiador</h2>
                  <button 
                    onClick={handleSaveHistorian}
                    disabled={isSaving}
                    className="bg-sepia-500 hover:bg-sepia-400 text-sepia-950 px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all"
                  >
                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    Guardar Perfil
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="bg-sepia-950/50 p-6 rounded-2xl border border-sepia-800">
                      <label className="text-sepia-400 text-xs uppercase font-bold mb-2 block">Nombre Completo</label>
                      <input 
                        type="text"
                        value={editingHistorian.name}
                        onChange={e => setEditingHistorian({...editingHistorian, name: e.target.value})}
                        className="w-full bg-sepia-900 border border-sepia-800 rounded-xl p-3 text-sepia-100 outline-none focus:border-sepia-500"
                      />
                    </div>
                    <div className="bg-sepia-950/50 p-6 rounded-2xl border border-sepia-800">
                      <label className="text-sepia-400 text-xs uppercase font-bold mb-2 block">Especialidad</label>
                      <input 
                        type="text"
                        value={editingHistorian.specialty}
                        onChange={e => setEditingHistorian({...editingHistorian, specialty: e.target.value})}
                        className="w-full bg-sepia-900 border border-sepia-800 rounded-xl p-3 text-sepia-100 outline-none focus:border-sepia-500"
                        placeholder="Ej: Historiador Local, Genealogista"
                      />
                    </div>
                    <div className="bg-sepia-950/50 p-6 rounded-2xl border border-sepia-800">
                      <label className="text-sepia-400 text-xs uppercase font-bold mb-2 block">Biografía Corta</label>
                      <textarea 
                        rows={4}
                        value={editingHistorian.bio}
                        onChange={e => setEditingHistorian({...editingHistorian, bio: e.target.value})}
                        className="w-full bg-sepia-900 border border-sepia-800 rounded-xl p-3 text-sepia-100 outline-none focus:border-sepia-500 resize-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-sepia-950/50 p-6 rounded-2xl border border-sepia-800">
                      <label className="text-sepia-400 text-xs uppercase font-bold mb-2 block">Foto de Perfil (URL)</label>
                      <input 
                        type="text"
                        value={editingHistorian.photo}
                        onChange={e => setEditingHistorian({...editingHistorian, photo: e.target.value})}
                        className="w-full bg-sepia-900 border border-sepia-800 rounded-xl p-3 text-sepia-100 outline-none focus:border-sepia-500"
                        placeholder="https://..."
                      />
                    </div>
                    <div className="bg-sepia-950/50 p-6 rounded-2xl border border-sepia-800">
                      <label className="text-sepia-400 text-xs uppercase font-bold mb-2 block">Link de Red Social (Instagram/Facebook)</label>
                      <input 
                        type="text"
                        value={editingHistorian.social_link || ''}
                        onChange={e => setEditingHistorian({...editingHistorian, social_link: e.target.value})}
                        className="w-full bg-sepia-900 border border-sepia-800 rounded-xl p-3 text-sepia-100 outline-none focus:border-sepia-500"
                        placeholder="https://instagram.com/..."
                      />
                    </div>
                    <div className="bg-sepia-950/50 p-6 rounded-2xl border border-sepia-800">
                      <label className="text-sepia-400 text-xs uppercase font-bold mb-2 block">Link de Contacto (WhatsApp/Email)</label>
                      <input 
                        type="text"
                        value={editingHistorian.contact_link || ''}
                        onChange={e => setEditingHistorian({...editingHistorian, contact_link: e.target.value})}
                        className="w-full bg-sepia-900 border border-sepia-800 rounded-xl p-3 text-sepia-100 outline-none focus:border-sepia-500"
                        placeholder="https://wa.me/..."
                      />
                    </div>
                    <div className="bg-sepia-950/50 p-6 rounded-2xl border border-sepia-800">
                      <label className="text-sepia-400 text-xs uppercase font-bold mb-4 block">Libros y Publicaciones</label>
                      <div className="space-y-4">
                        {editingHistorian.books?.map((book, idx) => (
                          <div key={idx} className="p-4 bg-sepia-900/50 rounded-xl border border-sepia-800 space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-sepia-400 text-[10px] uppercase font-bold">Libro #{idx + 1}</span>
                              <button 
                                onClick={() => {
                                  const newBooks = editingHistorian.books?.filter((_, i) => i !== idx);
                                  setEditingHistorian({...editingHistorian, books: newBooks});
                                }}
                                className="text-red-400 hover:text-red-300"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            <input 
                              type="text"
                              value={book.title}
                              onChange={e => {
                                const newBooks = [...(editingHistorian.books || [])];
                                newBooks[idx].title = e.target.value;
                                setEditingHistorian({...editingHistorian, books: newBooks});
                              }}
                              className="w-full bg-sepia-900 border border-sepia-800 rounded-lg p-2 text-xs text-sepia-100"
                              placeholder="Título del libro"
                            />
                            <input 
                              type="text"
                              value={book.url}
                              onChange={e => {
                                const newBooks = [...(editingHistorian.books || [])];
                                newBooks[idx].url = e.target.value;
                                setEditingHistorian({...editingHistorian, books: newBooks});
                              }}
                              className="w-full bg-sepia-900 border border-sepia-800 rounded-lg p-2 text-xs text-sepia-100"
                              placeholder="Link de descarga o compra"
                            />
                            <input 
                              type="text"
                              value={book.cover || ''}
                              onChange={e => {
                                const newBooks = [...(editingHistorian.books || [])];
                                newBooks[idx].cover = e.target.value;
                                setEditingHistorian({...editingHistorian, books: newBooks});
                              }}
                              className="w-full bg-sepia-900 border border-sepia-800 rounded-lg p-2 text-xs text-sepia-100"
                              placeholder="URL de la Portada (Imagen)"
                            />
                          </div>
                        ))}
                        <button 
                          onClick={() => setEditingHistorian({...editingHistorian, books: [...(editingHistorian.books || []), { title: '', url: '', cover: '' }]})}
                          className="w-full py-2 border border-dashed border-sepia-700 rounded-lg text-sepia-400 text-xs hover:border-sepia-500 hover:text-sepia-200 transition-all"
                        >
                          + Agregar Libro
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : editingStory ? (
              <motion.form 
                key="editor"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                onSubmit={handleSave}
                className="max-w-4xl mx-auto space-y-8"
              >
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-3xl font-serif text-sepia-100">
                    {editingStory.id ? 'Editar Historia' : 'Crear Nueva Historia'}
                  </h3>
                  <div className="flex gap-4">
                    <button 
                      type="button"
                      onClick={() => setEditingStory(null)}
                      className="px-6 py-2 rounded-full border border-sepia-700 text-sepia-400 hover:bg-sepia-800 transition-all"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit"
                      disabled={isSaving}
                      className="px-8 py-2 rounded-full bg-sepia-500 text-sepia-950 font-bold hover:bg-sepia-400 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                      Guardar Cambios
                    </button>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  {/* Basic Info */}
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-sepia-400 text-xs uppercase tracking-widest font-bold">Título de la Historia</label>
                      <input 
                        required
                        type="text"
                        value={editingStory.title}
                        onChange={e => setEditingStory({...editingStory, title: e.target.value})}
                        className="w-full bg-sepia-950 border border-sepia-800 rounded-xl p-4 text-sepia-100 focus:border-sepia-500 outline-none transition-all"
                        placeholder="Ej: La Boda de mis Abuelos"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sepia-400 text-xs uppercase tracking-widest font-bold">Categoría</label>
                        <select 
                          value={editingStory.category}
                          onChange={e => setEditingStory({...editingStory, category: e.target.value})}
                          className="w-full bg-sepia-950 border border-sepia-800 rounded-xl p-4 text-sepia-100 focus:border-sepia-500 outline-none transition-all"
                        >
                          <option value="Familia">Familia</option>
                          <option value="Negocio">Negocio</option>
                          <option value="Lugar">Lugar</option>
                          <option value="Evento">Evento</option>
                          <option value="Monumentos">Monumentos</option>
                          <option value="Personajes">Personajes</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sepia-400 text-xs uppercase tracking-widest font-bold">Año</label>
                        <input 
                          type="text"
                          value={editingStory.year}
                          onChange={e => setEditingStory({...editingStory, year: e.target.value})}
                          className="w-full bg-sepia-950 border border-sepia-800 rounded-xl p-4 text-sepia-100 focus:border-sepia-500 outline-none transition-all"
                          placeholder="Ej: 1954"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sepia-400 text-xs uppercase tracking-widest font-bold">Descripción Corta</label>
                      <textarea 
                        value={editingStory.description}
                        onChange={e => setEditingStory({...editingStory, description: e.target.value})}
                        className="w-full bg-sepia-950 border border-sepia-800 rounded-xl p-4 text-sepia-100 focus:border-sepia-500 outline-none transition-all h-24 resize-none"
                        placeholder="Una breve introducción a la historia..."
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sepia-400 text-xs uppercase tracking-widest font-bold">Narrativa Completa</label>
                      <textarea 
                        value={editingStory.fullNarrative}
                        onChange={e => setEditingStory({...editingStory, fullNarrative: e.target.value})}
                        className="w-full bg-sepia-950 border border-sepia-800 rounded-xl p-4 text-sepia-100 focus:border-sepia-500 outline-none transition-all h-48 resize-none"
                        placeholder="Escribe toda la historia aquí..."
                      />
                    </div>
                  </div>

                  {/* Media & Privacy */}
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-sepia-400 text-xs uppercase tracking-widest font-bold flex items-center gap-2">
                        <ImageIcon className="w-4 h-4" /> Portada (URL)
                      </label>
                      <input 
                        type="text"
                        value={editingStory.thumbnail}
                        onChange={e => setEditingStory({...editingStory, thumbnail: e.target.value})}
                        className="w-full bg-sepia-950 border border-sepia-800 rounded-xl p-4 text-sepia-100 focus:border-sepia-500 outline-none transition-all"
                        placeholder="https://..."
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sepia-400 text-xs uppercase tracking-widest font-bold flex items-center gap-2">
                        <Video className="w-4 h-4" /> Video URL (YouTube/Vimeo)
                      </label>
                      <input 
                        type="text"
                        value={editingStory.videoUrl}
                        onChange={e => setEditingStory({...editingStory, videoUrl: e.target.value})}
                        className="w-full bg-sepia-950 border border-sepia-800 rounded-xl p-4 text-sepia-100 focus:border-sepia-500 outline-none transition-all"
                        placeholder="https://..."
                      />
                      <div className="flex items-center gap-3 mt-2">
                        <input 
                          type="checkbox"
                          id="isVideoVertical"
                          checked={editingStory.isVideoVertical}
                          onChange={e => setEditingStory({...editingStory, isVideoVertical: e.target.checked})}
                          className="w-5 h-5 accent-sepia-500"
                        />
                        <label htmlFor="isVideoVertical" className="text-sepia-300 text-sm">¿Es video vertical? (Reel / TikTok / Shorts)</label>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sepia-400 text-xs uppercase tracking-widest font-bold flex items-center gap-2">
                        <Volume2 className="w-4 h-4" /> Audio (MP3 Directo / Spotify)
                      </label>
                      <div className="flex gap-2">
                        <input 
                          type="text"
                          value={editingStory.audioUrl || ''}
                          onChange={e => setEditingStory({...editingStory, audioUrl: e.target.value})}
                          className="flex-grow bg-sepia-950 border border-sepia-800 rounded-xl p-4 text-sepia-100 focus:border-sepia-500 outline-none transition-all"
                          placeholder="https://... (MP3 o Spotify)"
                        />
                        <label className="cursor-pointer bg-sepia-800 hover:bg-sepia-700 text-sepia-100 px-4 rounded-xl flex items-center justify-center transition-all">
                          <input 
                            type="file" 
                            className="hidden" 
                            accept="audio/*" 
                            onChange={handleAudioUpload} 
                            disabled={isUploading}
                          />
                          {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                        </label>
                      </div>
                      <p className="text-[10px] text-sepia-500 italic">
                        * Usa un link directo a un .mp3, un link de Spotify, o sube tu propio archivo.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sepia-400 text-xs uppercase tracking-widest font-bold flex items-center gap-2">
                        <Share2 className="w-4 h-4" /> Google Maps URL (Ubicación)
                      </label>
                      <input 
                        type="text"
                        value={editingStory.mapsUrl || ''}
                        onChange={e => setEditingStory({...editingStory, mapsUrl: e.target.value})}
                        className="w-full bg-sepia-950 border border-sepia-800 rounded-xl p-4 text-sepia-100 focus:border-sepia-500 outline-none transition-all"
                        placeholder="https://goo.gl/maps/..."
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sepia-400 text-xs uppercase tracking-widest font-bold flex items-center gap-2">
                        <Calendar className="w-4 h-4" /> Fecha de Vencimiento (Billing)
                      </label>
                      <input 
                        type="date"
                        value={editingStory.expires_at ? new Date(editingStory.expires_at).toISOString().split('T')[0] : ''}
                        onChange={e => setEditingStory({...editingStory, expires_at: e.target.value ? new Date(e.target.value).toISOString() : undefined})}
                        className="w-full bg-sepia-950 border border-sepia-800 rounded-xl p-4 text-sepia-100 focus:border-sepia-500 outline-none transition-all"
                      />
                      <p className="text-[10px] text-sepia-500 italic">Si la fecha es pasada, la historia no aparecerá en el álbum público.</p>
                    </div>

                    <div className="space-y-4 p-6 bg-sepia-950/50 rounded-2xl border border-sepia-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {editingStory.isPrivate ? <EyeOff className="text-sepia-500 w-5 h-5" /> : <Eye className="text-sepia-500 w-5 h-5" />}
                          <div>
                            <p className="text-sepia-100 font-bold">Privacidad</p>
                            <p className="text-sepia-500 text-xs">Ocultar del álbum público</p>
                          </div>
                        </div>
                        <button 
                          type="button"
                          onClick={() => setEditingStory({...editingStory, isPrivate: !editingStory.isPrivate})}
                          className={`w-12 h-6 rounded-full transition-all relative ${editingStory.isPrivate ? 'bg-sepia-500' : 'bg-sepia-800'}`}
                        >
                          <div className={`absolute top-1 w-4 h-4 rounded-full bg-sepia-950 transition-all ${editingStory.isPrivate ? 'left-7' : 'left-1'}`} />
                        </button>
                      </div>

                      {editingStory.isPrivate && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="pt-4 space-y-2"
                        >
                          <label className="text-sepia-400 text-xs uppercase tracking-widest font-bold">Contraseña de acceso (Opcional)</label>
                          <input 
                            type="text"
                            value={editingStory.password || ''}
                            onChange={e => setEditingStory({...editingStory, password: e.target.value})}
                            className="w-full bg-sepia-950 border border-sepia-800 rounded-xl p-4 text-sepia-100 focus:border-sepia-500 outline-none transition-all"
                            placeholder="Dejar vacío para link directo sin clave"
                          />
                        </motion.div>
                      )}
                    </div>

                    <div className="space-y-4 p-6 bg-sepia-950/50 rounded-2xl border border-sepia-800">
                      <div className="flex items-start gap-3">
                        <input 
                          type="checkbox"
                          id="auth-check"
                          required
                          className="mt-1 w-4 h-4 rounded border-sepia-800 bg-sepia-950 text-sepia-500 focus:ring-sepia-500"
                        />
                        <label htmlFor="auth-check" className="text-xs text-sepia-400 leading-relaxed">
                          Confirmo que el cliente ha autorizado el uso de sus imágenes y recuerdos para este proyecto, aceptando el Aviso de Privacidad y los Términos de Charlitron®.
                        </label>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="text-sepia-400 text-xs uppercase tracking-widest font-bold flex items-center gap-2">
                        <ImageIcon className="w-4 h-4" /> Galería de Fotos (URLs)
                      </label>
                      <div className="space-y-2">
                        {editingStory.gallery?.map((url, idx) => (
                          <div key={idx} className="flex gap-2">
                            <input 
                              type="text"
                              value={url}
                              onChange={e => {
                                const newGallery = [...(editingStory.gallery || [])];
                                newGallery[idx] = e.target.value;
                                setEditingStory({...editingStory, gallery: newGallery});
                              }}
                              className="flex-grow bg-sepia-950 border border-sepia-800 rounded-xl p-3 text-sepia-100 text-sm outline-none"
                            />
                            <button 
                              type="button"
                              onClick={() => {
                                const newGallery = editingStory.gallery?.filter((_, i) => i !== idx);
                                setEditingStory({...editingStory, gallery: newGallery});
                              }}
                              className="p-3 text-red-400 hover:bg-red-400/10 rounded-xl"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                        <button 
                          type="button"
                          onClick={() => setEditingStory({...editingStory, gallery: [...(editingStory.gallery || []), '']})}
                          className="w-full py-3 border-2 border-dashed border-sepia-800 rounded-xl text-sepia-500 hover:border-sepia-500 hover:text-sepia-400 transition-all text-sm font-bold"
                        >
                          + Añadir Foto
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.form>
            ) : viewMode === 'mural' && editingMuralPhoto ? (
              <motion.div
                key="mural-editor"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="max-w-2xl mx-auto"
              >
                <form onSubmit={handleSaveMuralPhoto} className="space-y-8">
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-3xl font-serif text-sepia-100">
                      {editingMuralPhoto.id ? 'Editar Foto del Mural' : 'Nueva Foto del Mural'}
                    </h2>
                    <div className="flex gap-4">
                      <button
                        type="button"
                        onClick={() => setEditingMuralPhoto(null)}
                        className="px-6 py-3 rounded-xl font-bold text-sepia-400 hover:bg-sepia-800 transition-all"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={isSaving}
                        className="bg-sepia-500 hover:bg-sepia-400 text-sepia-950 px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all disabled:opacity-50"
                      >
                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        Guardar
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div className="bg-sepia-950/50 border border-sepia-800 rounded-3xl p-8 space-y-6">
                        <div>
                          <label className="block text-xs uppercase tracking-widest font-bold text-sepia-500 mb-2">Nombre de la Persona</label>
                          <input
                            type="text"
                            value={editingMuralPhoto.person_name || ''}
                            onChange={e => setEditingMuralPhoto({ ...editingMuralPhoto, person_name: e.target.value })}
                            className="w-full bg-sepia-900 border border-sepia-800 rounded-xl p-4 text-sepia-100 outline-none focus:border-sepia-500 transition-all"
                            placeholder="Ej: María González, Don Roberto..."
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs uppercase tracking-widest font-bold text-sepia-500 mb-2">Texto del Encuentro</label>
                          <textarea
                            rows={3}
                            value={editingMuralPhoto.encounter_text || ''}
                            onChange={e => setEditingMuralPhoto({ ...editingMuralPhoto, encounter_text: e.target.value })}
                            className="w-full bg-sepia-900 border border-sepia-800 rounded-xl p-4 text-sepia-100 outline-none focus:border-sepia-500 transition-all resize-none"
                            placeholder="Ej: Encontrados en el Mercado de San Luis, Enero 2026"
                          />
                        </div>
                        <div>
                          <label className="block text-xs uppercase tracking-widest font-bold text-sepia-500 mb-2">Orden de Aparición</label>
                          <input
                            type="number"
                            value={editingMuralPhoto.display_order ?? 0}
                            onChange={e => setEditingMuralPhoto({ ...editingMuralPhoto, display_order: parseInt(e.target.value) || 0 })}
                            className="w-full bg-sepia-900 border border-sepia-800 rounded-xl p-4 text-sepia-100 outline-none focus:border-sepia-500 transition-all"
                            min={0}
                          />
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setEditingMuralPhoto({ ...editingMuralPhoto, is_vertical: !editingMuralPhoto.is_vertical })}
                            className={`w-12 h-6 rounded-full transition-all relative ${editingMuralPhoto.is_vertical ? 'bg-sepia-500' : 'bg-sepia-800'}`}
                          >
                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${editingMuralPhoto.is_vertical ? 'left-7' : 'left-1'}`} />
                          </button>
                          <span className="text-sepia-300 text-sm">Foto vertical (retrato)</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="bg-sepia-950/50 border border-sepia-800 rounded-3xl p-8 space-y-6">
                        <div>
                          <label className="block text-xs uppercase tracking-widest font-bold text-sepia-500 mb-2">URL de la Foto</label>
                          <input
                            type="url"
                            value={editingMuralPhoto.photo_url || ''}
                            onChange={e => setEditingMuralPhoto({ ...editingMuralPhoto, photo_url: e.target.value })}
                            className="w-full bg-sepia-900 border border-sepia-800 rounded-xl p-4 text-sepia-100 outline-none focus:border-sepia-500 transition-all"
                            placeholder="https://..."
                            required
                          />
                        </div>
                        {editingMuralPhoto.photo_url && (
                          <div>
                            <label className="block text-xs uppercase tracking-widest font-bold text-sepia-500 mb-2">Vista Previa</label>
                            <div className={`overflow-hidden rounded-2xl border border-sepia-800 bg-sepia-900 ${editingMuralPhoto.is_vertical ? 'aspect-[3/4]' : 'aspect-[4/3]'}`}>
                              <img
                                src={editingMuralPhoto.photo_url}
                                alt="Preview"
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </form>
              </motion.div>
            ) : viewMode === 'mural' ? (
              <motion.div
                key="mural-empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full flex flex-col items-center justify-center text-center space-y-6"
              >
                <div className="w-24 h-24 bg-sepia-800/30 rounded-full flex items-center justify-center">
                  <Users className="text-sepia-700 w-10 h-10" />
                </div>
                <div>
                  <h3 className="text-2xl font-serif text-sepia-100">Mural de Encuentros</h3>
                  <p className="text-sepia-500 max-w-xs mx-auto mt-2">
                    Selecciona una foto o crea una nueva para agregarla al mural.
                  </p>
                </div>
              </motion.div>
            ) : viewMode === 'contests' ? (
              <motion.div 
                key="contests"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-6xl mx-auto"
              >
                <ContestsAdmin />
              </motion.div>
            ) : viewMode === 'analytics' ? (
              <motion.div 
                key="analytics"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-6xl mx-auto"
              >
                <AnalyticsDashboard />
              </motion.div>
            ) : viewMode === 'install_prompt' ? (
              <motion.div 
                key="install_prompt"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-6xl mx-auto"
              >
                <InstallPromptAdmin onClose={onClose} />
              </motion.div>
            ) : viewMode === 'collaborators' ? (
              <motion.div 
                key="collaborators"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-6xl mx-auto"
              >
                <CollaboratorsAdmin onStoriesUpdate={onStoriesUpdate} />
              </motion.div>
            ) : (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full flex flex-col items-center justify-center text-center space-y-6"
              >
                <div className="w-24 h-24 bg-sepia-800/30 rounded-full flex items-center justify-center">
                  <Edit2 className="text-sepia-700 w-10 h-10" />
                </div>
                <div>
                  <h3 className="text-2xl font-serif text-sepia-100">Selecciona una historia</h3>
                  <p className="text-sepia-500 max-w-xs mx-auto">
                    Elige una historia de la lista de la izquierda para editarla o crea una nueva.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};
