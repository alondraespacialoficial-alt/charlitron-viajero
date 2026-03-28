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
-- 1. Ve a "Storage" en tu panel de Supabase.
-- 2. Crea un nuevo Bucket llamado: family-photos
-- 3. Crea un nuevo Bucket llamado: audio
-- 4. Activa la opción "Public bucket" en ambos.
-- 5. En "Policies", crea una política para que cualquiera pueda SUBIR archivos (INSERT).
--    O mejor, usa esta política SQL si prefieres:
--    CREATE POLICY "Permitir subida pública" ON storage.objects FOR INSERT WITH CHECK (bucket_id IN ('family-photos', 'audio'));
--    CREATE POLICY "Permitir lectura pública" ON storage.objects FOR SELECT USING (bucket_id IN ('family-photos', 'audio'));
