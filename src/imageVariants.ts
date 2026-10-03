import type { ImageVariants, ImageVariantRole } from './types';

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
