import type { ImageVariants, ImageVariantRole, Story } from './types';

const normalizeUrl = (url?: string | null): string | undefined => {
  const normalized = url?.trim();
  return normalized || undefined;
};

export const resolveImageVariant = (
  legacyUrl: string | null | undefined,
  variants: ImageVariants | null | undefined,
  role: ImageVariantRole
): string | undefined => {
  const legacy = normalizeUrl(legacyUrl);
  const thumbnail = normalizeUrl(variants?.thumbnail);

  switch (role) {
    case 'thumbnail':
      return thumbnail || legacy;
    case 'web':
      return normalizeUrl(variants?.web) || thumbnail || legacy;
    case 'master':
      return normalizeUrl(variants?.masterSignedUrl);
  }
};

/**
 * Resuelve la portada de una historia según el rol, con fallback al
 * master legacy (`story.thumbnail`) para historias sin variantes.
 * - thumbnail: cards, grids, búsqueda, favoritos (~600px)
 * - web: portada del detalle, og:image (~1800px)
 * - master: solo cuando se necesita el original
 */
export const resolveStoryCover = (
  story: Pick<Story, 'thumbnail' | 'thumbnail_thumb_url' | 'thumbnail_web_url'>,
  role: ImageVariantRole
): string | undefined =>
  resolveImageVariant(story.thumbnail, {
    thumbnail: story.thumbnail_thumb_url,
    web: story.thumbnail_web_url,
  }, role);
