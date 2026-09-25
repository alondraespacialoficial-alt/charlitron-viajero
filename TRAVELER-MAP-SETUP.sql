-- Mapa del Viajero: puntos geográficos enlazados a historias existentes.
CREATE TABLE IF NOT EXISTS traveler_map_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL DEFAULT 'Lugar',
  description TEXT,
  era TEXT,
  address TEXT,
  neighborhood TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  image_url TEXT,
  story_id TEXT REFERENCES stories(id) ON DELETE SET NULL,
  external_url TEXT,
  tags TEXT[] DEFAULT '{}',
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS traveler_map_points_published_idx
  ON traveler_map_points (published, category);

CREATE INDEX IF NOT EXISTS traveler_map_points_story_idx
  ON traveler_map_points (story_id);

ALTER TABLE traveler_map_points ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "traveler_map_public_read" ON traveler_map_points;
CREATE POLICY "traveler_map_public_read"
  ON traveler_map_points FOR SELECT TO anon, authenticated
  USING (published = TRUE);

-- El panel administrativo actual autentica en la aplicación y usa la clave anon,
-- por lo que mantiene la misma convención de CRUD que los módulos existentes.
DROP POLICY IF EXISTS "traveler_map_app_crud" ON traveler_map_points;
CREATE POLICY "traveler_map_app_crud"
  ON traveler_map_points FOR ALL TO anon, authenticated
  USING (TRUE) WITH CHECK (TRUE);