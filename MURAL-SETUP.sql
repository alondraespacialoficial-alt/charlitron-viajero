-- ==========================================
-- SQL PARA MURAL DE ENCUENTROS - SUPABASE
-- ==========================================
-- Ejecuta este SQL en el SQL Editor de Supabase

-- Tabla: mural_photos
CREATE TABLE IF NOT EXISTS mural_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_name TEXT NOT NULL,
  encounter_text TEXT,
  photo_url TEXT NOT NULL,
  is_vertical BOOLEAN DEFAULT FALSE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar Row Level Security
ALTER TABLE mural_photos ENABLE ROW LEVEL SECURITY;

-- Política: lectura pública (cualquiera puede ver el mural)
CREATE POLICY "Allow public read mural photos"
  ON mural_photos
  FOR SELECT
  USING (true);

-- Política: insertar / actualizar / eliminar sin restricción de auth
-- (el admin se autentica via contraseña en la app, no vía Supabase Auth)
CREATE POLICY "Allow all inserts mural photos"
  ON mural_photos
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow all updates mural photos"
  ON mural_photos
  FOR UPDATE
  USING (true);

CREATE POLICY "Allow all deletes mural photos"
  ON mural_photos
  FOR DELETE
  USING (true);

-- Índice para ordenar rápido
CREATE INDEX IF NOT EXISTS idx_mural_photos_order
  ON mural_photos (display_order ASC, created_at DESC);
