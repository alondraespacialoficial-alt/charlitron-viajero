-- ============================================================
-- HISTORIAS: VARIANTES DE IMAGEN DE PORTADA (reducción de egress)
-- ============================================================
-- Qué hace:
--   Agrega 2 columnas NULLABLE a `stories` para guardar variantes
--   físicas de la portada generadas en el navegador al subir:
--     - thumbnail_thumb_url: ~600px WebP  (cards, grids, búsqueda, favoritos)
--     - thumbnail_web_url:  ~1800px WebP  (portada del detalle, og:image)
--   La columna existente `thumbnail` se conserva como MASTER original
--   y como fallback para historias antiguas (no se toca ningún dato).
--
-- Riesgo: mínimo. ADD COLUMN IF NOT EXISTS, nullable, sin defaults,
-- sin backfill, sin tocar RLS ni otras tablas. Reversible con:
--   ALTER TABLE stories DROP COLUMN thumbnail_thumb_url, DROP COLUMN thumbnail_web_url;
--
-- IMPORTANTE: la app nueva hace SELECT de estas columnas; si no se
-- aplica esta migración, el listado de historias fallará. Aplicar
-- ANTES de validar el Preview.
-- ============================================================

ALTER TABLE stories
  ADD COLUMN IF NOT EXISTS thumbnail_thumb_url TEXT,
  ADD COLUMN IF NOT EXISTS thumbnail_web_url TEXT;

-- Verificación rápida:
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'stories' AND column_name LIKE 'thumbnail%';
