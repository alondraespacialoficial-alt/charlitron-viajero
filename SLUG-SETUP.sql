-- ==========================================
-- SQL SCRIPT - AGREGAR SOPORTE PARA SLUGS
-- ==========================================
-- EJECUTA ESTO PASO A PASO EN SUPABASE SQL EDITOR

-- ========== PASO 1: Agregar columna slug ==========
ALTER TABLE stories 
ADD COLUMN slug TEXT UNIQUE DEFAULT NULL;

-- ========== PASO 2: Generar slugs (RECOMENDADO - Simple y confiable) ==========
-- Este es el más seguro, reemplaza espacios por guiones:
UPDATE stories 
SET slug = LOWER(
  REPLACE(
    REPLACE(
      REPLACE(
        REPLACE(title, ' ', '-'),
        '''', '-'
      ),
      'á', 'a'
    ),
    'é', 'e'
  )
) || '-' || SUBSTRING(CAST(CAST(EXTRACT(EPOCH FROM created_at) AS INTEGER) AS TEXT), 1, 5)
WHERE slug IS NULL;

-- ========== PASO 3: Crear índice para búsquedas rápidas ==========
CREATE INDEX IF NOT EXISTS idx_stories_slug ON stories(slug);

-- ========== PASO 4: Hacer un backup y verificar ==========
-- Verifica que los slugs fueron creados:
SELECT id, title, slug FROM stories LIMIT 10;

-- Verifica que no hay duplicados:
SELECT slug, COUNT(*) as cantidad FROM stories WHERE slug IS NOT NULL GROUP BY slug HAVING COUNT(*) > 1;

-- Verifica el índice:
SELECT * FROM pg_stat_user_indexes WHERE relname LIKE '%stories_slug%';
