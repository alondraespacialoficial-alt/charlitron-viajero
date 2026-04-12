-- ==========================================
-- SQL PARA SUPABASE - ÁRBOL GENEALÓGICO
-- ==========================================

-- 1. Tabla para las Claves de Acceso
CREATE TABLE IF NOT EXISTS access_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_code TEXT UNIQUE NOT NULL,
  duration_days INTEGER NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabla para los Árboles (Metadatos)
CREATE TABLE IF NOT EXISTS family_trees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  access_key_id UUID REFERENCES access_keys(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabla para los Miembros de la Familia
CREATE TABLE IF NOT EXISTS family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id UUID REFERENCES family_trees(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  relationship TEXT, -- Ej: Padre, Madre, Abuelo, etc.
  photo_url TEXT,
  parent_id UUID REFERENCES family_members(id) ON DELETE SET NULL,
  birth_date TEXT,
  death_date TEXT,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabla para la Tienda (Productos)
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  image_url TEXT,
  is_sold_out BOOLEAN DEFAULT FALSE,
  category TEXT, -- Ej: Antigüedad, Souvenir, Libro
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Tabla para Patrocinadores (Sponsors)
CREATE TABLE IF NOT EXISTS sponsors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT NOT NULL,
  website_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS para sponsors
ALTER TABLE sponsors ENABLE ROW LEVEL SECURITY;

-- Políticas para sponsors
CREATE POLICY "Permitir lectura pública de sponsors" 
ON sponsors FOR SELECT 
USING (true);

CREATE POLICY "Permitir gestión total de sponsors" 
ON sponsors FOR ALL 
USING (true);

-- ==========================================
-- INSTRUCCIONES PARA STORAGE (FOTOS)
-- ==========================================
-- Ejecuta este SQL en el SQL Editor de Supabase:

INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('images', 'images', true),
  ('video',  'video',  true),
  ('audio',  'audio',  true),
  ('family-photos', 'family-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de acceso público para storage
DO $$
BEGIN
  -- images: insert
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='images_insert_public') THEN
    CREATE POLICY images_insert_public ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'images');
  END IF;
  -- images: select
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='images_select_public') THEN
    CREATE POLICY images_select_public ON storage.objects FOR SELECT USING (bucket_id = 'images');
  END IF;
  -- video: insert
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='video_insert_public') THEN
    CREATE POLICY video_insert_public ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'video');
  END IF;
  -- video: select
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='video_select_public') THEN
    CREATE POLICY video_select_public ON storage.objects FOR SELECT USING (bucket_id = 'video');
  END IF;
  -- audio: insert
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='audio_insert_public') THEN
    CREATE POLICY audio_insert_public ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'audio');
  END IF;
  -- audio: select
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='audio_select_public') THEN
    CREATE POLICY audio_select_public ON storage.objects FOR SELECT USING (bucket_id = 'audio');
  END IF;
  -- family-photos: insert
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='familyphotos_insert_public') THEN
    CREATE POLICY familyphotos_insert_public ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'family-photos');
  END IF;
  -- family-photos: select
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='familyphotos_select_public') THEN
    CREATE POLICY familyphotos_select_public ON storage.objects FOR SELECT USING (bucket_id = 'family-photos');
  END IF;
END $$;
