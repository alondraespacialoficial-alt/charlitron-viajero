-- ============================================================
-- CHARLITRON VIAJERO — MÓDULO DE AVATARES INTERACTIVOS
-- Ejecutar en Supabase SQL Editor (una sola vez)
-- ============================================================

-- ----------------------------------------------------------------
-- 1. TABLA: avatars
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.avatars (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT    NOT NULL UNIQUE,
  label       TEXT    NOT NULL,
  description TEXT,
  emoji       TEXT    NOT NULL DEFAULT '🎭',
  image_url   TEXT,                              -- foto/ilustración del personaje (bucket: images)
  pub_key     TEXT    NOT NULL DEFAULT '',
  is_active   BOOLEAN NOT NULL DEFAULT true,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- 2. FUNCIÓN: actualiza updated_at automáticamente
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_avatars_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_avatars_updated_at ON public.avatars;
CREATE TRIGGER trg_avatars_updated_at
  BEFORE UPDATE ON public.avatars
  FOR EACH ROW
  EXECUTE FUNCTION public.update_avatars_updated_at();

-- ----------------------------------------------------------------
-- 3. HABILITAR RLS
-- ----------------------------------------------------------------
ALTER TABLE public.avatars ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------
-- 4. POLÍTICAS
-- ----------------------------------------------------------------

-- Visitantes pueden VER avatares activos (sección pública)
CREATE POLICY "avatars_public_select"
  ON public.avatars
  FOR SELECT
  USING (is_active = true);

-- anon puede VER TODOS (el admin usa la clave anon)
CREATE POLICY "avatars_anon_select_all"
  ON public.avatars
  FOR SELECT
  TO anon
  USING (true);

-- anon puede INSERTAR (crear nuevos avatares desde el panel)
CREATE POLICY "avatars_anon_insert"
  ON public.avatars
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- anon puede ACTUALIZAR (editar nombre, pub_key, etc.)
CREATE POLICY "avatars_anon_update"
  ON public.avatars
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- anon puede ELIMINAR
CREATE POLICY "avatars_anon_delete"
  ON public.avatars
  FOR DELETE
  TO anon
  USING (true);

-- ----------------------------------------------------------------
-- 5. ÍNDICES
-- ----------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_avatars_active ON public.avatars(is_active);
CREATE INDEX IF NOT EXISTS idx_avatars_order  ON public.avatars(order_index);

-- ----------------------------------------------------------------
-- 6. DATOS INICIALES (los 3 avatares que ya existían en el código)
--    Puedes editar el pub_key de cada uno desde el panel admin
--    o directamente aquí antes de ejecutar.
-- ----------------------------------------------------------------
INSERT INTO public.avatars (slug, label, description, emoji, pub_key, is_active, order_index)
VALUES
  ('jose',       'José',       'Narrador histórico',  '🎩', 'pub_779bcf5b400af4ed97fa96ba92d89369ff9d1c3d1e82194fe84919d160f6ab21', true,  0),
  ('charlitron', 'Charlitron', 'Guía viajero',        '🤖', '',  false, 1),
  ('guia',       'Guía',       'Asistente cultural',  '🗺️', '',  false, 2)
ON CONFLICT (slug) DO NOTHING;

-- ----------------------------------------------------------------
-- NOTAS:
--   • pub_key → cópialo del tab "Embed" en dev.runwayml.com
--     (Embed Snippet → data-pub-key)
--   • Avatares con pub_key vacío quedan is_active = false
--     hasta que pegues el ID desde el panel admin.
--   • En "Allowed Origins" de Runway agrega:
--     https://charlitronviajerodeltiempo.com
-- ----------------------------------------------------------------
