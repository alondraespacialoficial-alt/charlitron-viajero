-- ============================================================
-- CHARLITRON VIAJERO — JARDÍN DE LA MEMORIA (fase 1)
-- Ejecutar en Supabase SQL Editor (una sola vez)
-- ============================================================
-- Reutiliza lo que ya existe: stories (Historia vinculada),
-- family_members (Árbol de Linaje), bucket "images" (foto) y
-- bucket "audio" (canción homenaje) — no se duplica nada.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1) TABLA: memorials
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.memorials (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug              TEXT NOT NULL UNIQUE,
  full_name         TEXT NOT NULL,
  family_label      TEXT,                      -- apellido/familia, para el buscador
  photo_url         TEXT,
  birth_date        TEXT,
  death_date        TEXT,
  epitaph           TEXT,
  bio_short         TEXT,
  visibility        TEXT NOT NULL DEFAULT 'private'
                      CHECK (visibility IN ('public', 'shareable', 'private')),
  access_code       TEXT,                      -- requerido solo si visibility = 'private'
  story_id          TEXT REFERENCES public.stories(id) ON DELETE SET NULL,
  family_member_id  UUID REFERENCES public.family_members(id) ON DELETE SET NULL,
  tribute_song_url  TEXT,                      -- audio subido al bucket "audio" (mismo que Historias)
  spotify_link      TEXT,
  requires_approval BOOLEAN NOT NULL DEFAULT true,
  client_name       TEXT,
  client_contact    TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.update_memorials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_memorials_updated_at ON public.memorials;
CREATE TRIGGER trg_memorials_updated_at
  BEFORE UPDATE ON public.memorials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_memorials_updated_at();

-- ------------------------------------------------------------
-- 2) TABLA: memorial_gestures (flor / vela dejadas por visitantes)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.memorial_gestures (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memorial_id   UUID NOT NULL REFERENCES public.memorials(id) ON DELETE CASCADE,
  gesture_type  TEXT NOT NULL
                  CHECK (gesture_type IN ('flower_rose', 'flower_lily', 'flower_sunflower', 'flower_daisy', 'candle')),
  visitor_name  TEXT,                          -- NULL = "Alguien dejó una flor"
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 3) TABLA: memorial_guestbook (mensajes/recuerdos, con moderación)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.memorial_guestbook (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memorial_id   UUID NOT NULL REFERENCES public.memorials(id) ON DELETE CASCADE,
  visitor_name  TEXT NOT NULL,
  message       TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 4) ÍNDICES
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_memorials_slug          ON public.memorials (slug);
CREATE INDEX IF NOT EXISTS idx_memorials_visibility     ON public.memorials (visibility);
CREATE INDEX IF NOT EXISTS idx_memorials_full_name      ON public.memorials (lower(full_name));
CREATE INDEX IF NOT EXISTS idx_memorials_family_label   ON public.memorials (lower(family_label));
CREATE INDEX IF NOT EXISTS idx_memorial_gestures_memorial ON public.memorial_gestures (memorial_id);
CREATE INDEX IF NOT EXISTS idx_memorial_guestbook_memorial ON public.memorial_guestbook (memorial_id);
CREATE INDEX IF NOT EXISTS idx_memorial_guestbook_status ON public.memorial_guestbook (status);

-- ------------------------------------------------------------
-- 5) ROW LEVEL SECURITY
-- ------------------------------------------------------------
-- Mismo criterio que el resto del proyecto: el Admin no tiene un rol
-- especial en Supabase (usa la clave anon protegida por contraseña en
-- el cliente), así que las políticas son permisivas y la privacidad
-- (público/compartible/privado) se aplica en la app: el buscador del
-- Jardín solo consulta visibility='public', y los memoriales privados
-- exigen el access_code capturado en pantalla antes de mostrar el
-- contenido — igual que ya ocurre hoy con el password de Historias.

ALTER TABLE public.memorials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memorial_gestures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memorial_guestbook ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "memorials_select" ON public.memorials;
DROP POLICY IF EXISTS "memorials_insert" ON public.memorials;
DROP POLICY IF EXISTS "memorials_update" ON public.memorials;
DROP POLICY IF EXISTS "memorials_delete" ON public.memorials;
CREATE POLICY "memorials_select" ON public.memorials FOR SELECT USING (true);
CREATE POLICY "memorials_insert" ON public.memorials FOR INSERT WITH CHECK (true);
CREATE POLICY "memorials_update" ON public.memorials FOR UPDATE USING (true);
CREATE POLICY "memorials_delete" ON public.memorials FOR DELETE USING (true);

DROP POLICY IF EXISTS "memorial_gestures_select" ON public.memorial_gestures;
DROP POLICY IF EXISTS "memorial_gestures_insert" ON public.memorial_gestures;
DROP POLICY IF EXISTS "memorial_gestures_delete" ON public.memorial_gestures;
CREATE POLICY "memorial_gestures_select" ON public.memorial_gestures FOR SELECT USING (true);
CREATE POLICY "memorial_gestures_insert" ON public.memorial_gestures FOR INSERT WITH CHECK (true);
CREATE POLICY "memorial_gestures_delete" ON public.memorial_gestures FOR DELETE USING (true);

DROP POLICY IF EXISTS "memorial_guestbook_select" ON public.memorial_guestbook;
DROP POLICY IF EXISTS "memorial_guestbook_insert" ON public.memorial_guestbook;
DROP POLICY IF EXISTS "memorial_guestbook_update" ON public.memorial_guestbook;
DROP POLICY IF EXISTS "memorial_guestbook_delete" ON public.memorial_guestbook;
CREATE POLICY "memorial_guestbook_select" ON public.memorial_guestbook FOR SELECT USING (true);
CREATE POLICY "memorial_guestbook_insert" ON public.memorial_guestbook FOR INSERT WITH CHECK (true);
CREATE POLICY "memorial_guestbook_update" ON public.memorial_guestbook FOR UPDATE USING (true);
CREATE POLICY "memorial_guestbook_delete" ON public.memorial_guestbook FOR DELETE USING (true);

COMMIT;

-- ============================================================
-- MIGRACIÓN (fase 2): video homenaje — ejecutar una sola vez
-- ============================================================
-- Video subido al bucket "video" (ya existente), se muestra debajo
-- de la foto principal en la página pública del memorial.
ALTER TABLE public.memorials ADD COLUMN IF NOT EXISTS tribute_video_url TEXT;

-- ============================================================
-- EJEMPLOS DE USO (SQL Editor)
-- ============================================================
-- 1) Crear un memorial privado
-- INSERT INTO public.memorials (slug, full_name, family_label, epitaph, visibility, access_code, client_name)
-- VALUES ('juan-perez-1945-2020', 'Juan Pérez López', 'Familia Pérez', 'Siempre en nuestro corazón', 'private', 'PEREZ2026', 'Familia Pérez (cliente)');

-- 2) Vincular con una Historia y un miembro del Árbol ya existentes
-- UPDATE public.memorials SET story_id = 'ID_DE_LA_HISTORIA', family_member_id = 'UUID_DEL_FAMILIAR'
-- WHERE slug = 'juan-perez-1945-2020';
