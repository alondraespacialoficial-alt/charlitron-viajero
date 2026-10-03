import { supabase } from './supabase';

export interface UserFavorite {
  id: string;
  favorite_type: 'story' | 'product' | 'photo' | 'traveler_map';
  favorite_id: string;
  favorite_title?: string;
  favorite_image?: string;
  session_id?: string;
  created_at: string;
}

const TRAVELER_MAP_FAVORITES_KEY = 'charlitron_traveler_map_favorites';

export const getTravelerMapFavoriteIds = (): string[] => {
  try {
    const value = JSON.parse(localStorage.getItem(TRAVELER_MAP_FAVORITES_KEY) || '[]');
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
};

export const saveTravelerMapFavoriteIds = (favoriteIds: string[]): void => {
  localStorage.setItem(TRAVELER_MAP_FAVORITES_KEY, JSON.stringify(favoriteIds));
};

// Generar ID de sesión único para usuario anónimo
const getSessionId = (): string => {
  let sessionId = localStorage.getItem('charlitron_session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('charlitron_session_id', sessionId);
  }
  return sessionId;
};

/**
 * Agregar a favoritos
 */
export const addToFavorites = async (
  favoriteType: 'story' | 'product' | 'photo',
  favoriteId: string,
  title?: string,
  image?: string
): Promise<boolean> => {
  try {
    const sessionId = getSessionId();

    // Verificar si ya existe
    const { data: existing } = await supabase
      .from('user_favorites')
      .select('id')
      .eq('favorite_type', favoriteType)
      .eq('favorite_id', favoriteId)
      .eq('session_id', sessionId)
      .maybeSingle();

    if (existing) {
      console.log('Ya está en favoritos');
      return false;
    }

    // Agregar nuevo
    const { error } = await supabase.from('user_favorites').insert([
      {
        favorite_type: favoriteType,
        favorite_id: favoriteId,
        favorite_title: title,
        favorite_image: image,
        session_id: sessionId,
      },
    ]);

    if (error) {
      console.error('Error adding to favorites:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error in addToFavorites:', err);
    return false;
  }
};

/**
 * Quitar de favoritos
 */
export const removeFromFavorites = async (
  favoriteType: 'story' | 'product' | 'photo' | 'traveler_map',
  favoriteId: string
): Promise<boolean> => {
  try {
    if (favoriteType === 'traveler_map') {
      saveTravelerMapFavoriteIds(getTravelerMapFavoriteIds().filter(id => id !== favoriteId));
      return true;
    }

    const sessionId = getSessionId();

    const { error } = await supabase
      .from('user_favorites')
      .delete()
      .eq('favorite_type', favoriteType)
      .eq('favorite_id', favoriteId)
      .eq('session_id', sessionId);

    if (error) {
      console.error('Error removing from favorites:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error in removeFromFavorites:', err);
    return false;
  }
};

/**
 * Verificar si está en favoritos
 */
export const isFavorited = async (
  favoriteType: 'story' | 'product' | 'photo',
  favoriteId: string
): Promise<boolean> => {
  try {
    const sessionId = getSessionId();

    const { data, error } = await supabase
      .from('user_favorites')
      .select('id')
      .eq('favorite_type', favoriteType)
      .eq('favorite_id', favoriteId)
      .eq('session_id', sessionId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking favorite:', error);
      return false;
    }

    return !!data;
  } catch (err) {
    console.error('Error in isFavorited:', err);
    return false;
  }
};

export const getFavoriteIdsByType = async (
  favoriteType: 'story' | 'product' | 'photo'
): Promise<string[]> => {
  try {
    const sessionId = getSessionId();
    const { data, error } = await supabase
      .from('user_favorites')
      .select('favorite_id')
      .eq('favorite_type', favoriteType)
      .eq('session_id', sessionId);

    if (error) {
      console.error('Error fetching favorite IDs:', error);
      return [];
    }

    return data?.map(favorite => favorite.favorite_id) || [];
  } catch (err) {
    console.error('Error fetching favorite IDs:', err);
    return [];
  }
};

/**
 * Obtener todos los favoritos de un tipo
 */
export const getFavoritesByType = async (
  favoriteType: 'story' | 'product' | 'photo'
): Promise<UserFavorite[]> => {
  try {
    const sessionId = getSessionId();

    const { data, error } = await supabase
      .from('user_favorites')
      .select('*')
      .eq('favorite_type', favoriteType)
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching favorites:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Error in getFavoritesByType:', err);
    return [];
  }
};

/**
 * Obtener todos los favoritos
 */
export const getAllFavorites = async (): Promise<UserFavorite[]> => {
  let favorites: UserFavorite[] = [];
  try {
    const sessionId = getSessionId();

    const { data, error } = await supabase
      .from('user_favorites')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });

    if (error) console.error('Error fetching all favorites:', error);
    else favorites = data || [];
  } catch (err) {
    console.error('Error in getAllFavorites:', err);
  }

  const favoriteIds = getTravelerMapFavoriteIds();
  if (favoriteIds.length === 0) return favorites;

  try {
    const { data, error } = await supabase
      .from('traveler_map_points')
      .select('id, name, image_url')
      .in('id', favoriteIds);
    if (error) {
      console.error('Error fetching traveler map favorites:', error);
      return favorites;
    }

    const mapFavorites: UserFavorite[] = (data || []).map(point => ({
      id: `traveler_map_${point.id}`,
      favorite_type: 'traveler_map',
      favorite_id: point.id,
      favorite_title: point.name,
      favorite_image: point.image_url || undefined,
      created_at: new Date().toISOString(),
    }));
    return [...favorites, ...mapFavorites];
  } catch (err) {
    console.error('Error loading traveler map favorites:', err);
    return favorites;
  }
};

/**
 * Contar favoritos por tipo
 */
export const countFavorites = async (): Promise<{ stories: number; products: number }> => {
  try {
    const sessionId = getSessionId();

    const { data, error } = await supabase
      .from('user_favorites')
      .select('favorite_type')
      .eq('session_id', sessionId);

    if (error) {
      console.error('Error counting favorites:', error);
      return { stories: 0, products: 0 };
    }

    const stories = (data || []).filter((f) => f.favorite_type === 'story').length;
    const products = (data || []).filter((f) => f.favorite_type === 'product').length;

    return { stories, products };
  } catch (err) {
    console.error('Error in countFavorites:', err);
    return { stories: 0, products: 0 };
  }
};
