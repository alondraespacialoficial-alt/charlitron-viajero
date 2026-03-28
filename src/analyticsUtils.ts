import { supabase } from './supabase';

export interface PageView {
  id: string;
  page_type: string;
  page_id?: string;
  page_title?: string;
  view_count: number;
  last_viewed_at: string;
  created_at: string;
  updated_at: string;
}

/**
 * Registra una vista de página/sección
 * @param pageType - Tipo de página ('story', 'gallery', 'shop', 'historians', etc)
 * @param pageId - ID único de la página (story id, etc)
 * @param pageTitle - Título legible (nombre historia, sección, etc)
 */
export const trackPageView = async (
  pageType: string,
  pageId?: string,
  pageTitle?: string
): Promise<void> => {
  try {
    // Buscar si ya existe un registro para esta página
    const { data: existing, error: fetchError } = await supabase
      .from('page_analytics')
      .select('id, view_count')
      .eq('page_type', pageType)
      .eq('page_id', pageId || '')
      .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 = no rows returned (is expected)
      console.error('Error fetching analytics:', fetchError);
      return;
    }

    if (existing) {
      // Actualizar contador existente
      const { error: updateError } = await supabase
        .from('page_analytics')
        .update({
          view_count: existing.view_count + 1,
          last_viewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (updateError) {
        console.error('Error updating analytics:', updateError);
      }
    } else {
      // Insertar nuevo registro
      const { error: insertError } = await supabase
        .from('page_analytics')
        .insert([
          {
            page_type: pageType,
            page_id: pageId || null,
            page_title: pageTitle || null,
            view_count: 1,
            last_viewed_at: new Date().toISOString(),
          },
        ]);

      if (insertError) {
        console.error('Error inserting analytics:', insertError);
      }
    }
  } catch (err) {
    console.error('Analytics tracking error:', err);
  }
};

/**
 * Obtiene todas las analíticas
 */
export const fetchAnalytics = async (): Promise<PageView[] | null> => {
  try {
    const { data, error } = await supabase
      .from('page_analytics')
      .select('*')
      .order('view_count', { ascending: false });

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error fetching analytics:', err);
    return null;
  }
};

/**
 * Obtiene analíticas por tipo
 */
export const fetchAnalyticsByType = async (pageType: string): Promise<PageView[] | null> => {
  try {
    const { data, error } = await supabase
      .from('page_analytics')
      .select('*')
      .eq('page_type', pageType)
      .order('view_count', { ascending: false });

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error fetching analytics by type:', err);
    return null;
  }
};

/**
 * Obtiene vistas para una página específica
 */
export const getPageViews = async (pageId: string): Promise<number | null> => {
  try {
    const { data, error } = await supabase
      .from('page_analytics')
      .select('view_count')
      .eq('page_id', pageId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching page views:', error);
      return null;
    }

    return data?.view_count || 0;
  } catch (err) {
    console.error('Error getting page views:', err);
    return null;
  }
};

/**
 * Formatea número de vistas (1234 -> "1.2K")
 */
export const formatViewCount = (count: number): string => {
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (count >= 1000) {
    return (count / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return count.toString();
};
