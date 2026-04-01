-- ==========================================
-- SCHEMA COMPLETO CHARLITRON VIAJERO
-- ==========================================

-- ========== 1. ACCESO Y AUTENTICACIÓN ==========

CREATE TABLE IF NOT EXISTS access_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_code TEXT UNIQUE NOT NULL,
  duration_days INTEGER NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  is_used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS investigation_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  is_used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========== 2. CONFIGURACIÓN DEL SITIO ==========

CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

-- ========== 3. ÁRBOL GENEALÓGICO ==========

CREATE TABLE IF NOT EXISTS family_trees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  access_key_id UUID REFERENCES access_keys(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id UUID REFERENCES family_trees(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  relationship TEXT,
  photo_url TEXT,
  parent_id UUID REFERENCES family_members(id) ON DELETE SET NULL,
  birth_date TEXT,
  death_date TEXT,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========== 4. HISTORIADORES ==========

CREATE TABLE IF NOT EXISTS historians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  bio TEXT,
  photo TEXT,
  specialty TEXT,
  books JSONB, -- Array de {title, url, cover}
  contact_link TEXT,
  social_link TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========== 5. HISTORIAS Y COMENTARIOS ==========

CREATE TABLE IF NOT EXISTS stories (
  id TEXT PRIMARY KEY, -- Identificador único (puede ser slug o UUID)
  title TEXT NOT NULL,
  description TEXT,
  fullNarrative TEXT,
  year TEXT,
  category TEXT,
  thumbnail TEXT,
  videoUrl TEXT,
  audioUrl TEXT,
  mapsUrl TEXT,
  gallery TEXT[], -- Array de URLs
  isPrivate BOOLEAN DEFAULT FALSE,
  password TEXT,
  isVideoVertical BOOLEAN DEFAULT FALSE,
  likes INTEGER DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id TEXT NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========== 6. GALERÍA DE FOTOS RESTAURADAS ==========

CREATE TABLE IF NOT EXISTS restored_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  place TEXT,
  era TEXT,
  intervention_type TEXT,
  description TEXT,
  category TEXT,
  is_vertical BOOLEAN DEFAULT FALSE,
  images JSONB, -- Array de {url, title, is_vertical}
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========== 7. VIAJES Y FOTOS DE VIAJE ==========

CREATE TABLE IF NOT EXISTS travel_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL,
  character_name TEXT NOT NULL,
  year TEXT,
  description TEXT,
  external_link TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========== 8. TIENDA ==========

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL,
  image_url TEXT NOT NULL,
  is_sold_out BOOLEAN DEFAULT FALSE,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========== 9. PATROCINADORES ==========

CREATE TABLE IF NOT EXISTS sponsors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT NOT NULL,
  website_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========== 10. INVESTIGACIONES ==========

CREATE TABLE IF NOT EXISTS investigations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT,
  user_name TEXT,
  surname TEXT NOT NULL,
  maternal_surname TEXT,
  family_trade TEXT,
  ancestor_birthplace TEXT,
  report_content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================

-- Sponsors son públicos
ALTER TABLE sponsors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read sponsors" ON sponsors FOR SELECT USING (true);

-- Stories públicas pero privadas protegidas
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read public stories" ON stories FOR SELECT USING (NOT isPrivate);

-- Comments en stories públicas
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read comments on public stories" ON comments FOR SELECT
USING (EXISTS (SELECT 1 FROM stories WHERE stories.id = comments.story_id AND NOT stories.isPrivate));

-- Historiadores públicos
ALTER TABLE historians ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read historians" ON historians FOR SELECT USING (true);

-- Fotos restauradas públicas
ALTER TABLE restored_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read restored photos" ON restored_photos FOR SELECT USING (true);

-- Fotos de viaje públicas
ALTER TABLE travel_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read travel photos" ON travel_photos FOR SELECT USING (true);

-- ==========================================
-- MURAL DE ENCUENTROS
-- ==========================================
CREATE TABLE IF NOT EXISTS mural_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_name TEXT NOT NULL,
  encounter_text TEXT,
  photo_url TEXT NOT NULL,
  is_vertical BOOLEAN DEFAULT FALSE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE mural_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read mural photos" ON mural_photos FOR SELECT USING (true);
CREATE POLICY "Allow all inserts mural photos" ON mural_photos FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all updates mural photos" ON mural_photos FOR UPDATE USING (true);
CREATE POLICY "Allow all deletes mural photos" ON mural_photos FOR DELETE USING (true);
CREATE INDEX IF NOT EXISTS idx_mural_photos_order ON mural_photos (display_order ASC, created_at DESC);

-- Productos públicos
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read products" ON products FOR SELECT USING (true);

-- Investigaciones sin restricciones (anónimas)
ALTER TABLE investigations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow insert investigations" ON investigations FOR INSERT WITH CHECK (true);

-- ==========================================
-- STORAGE BUCKETS (ejecutar desde UI Supabase)
-- ==========================================
-- 1. Crea bucket: family-photos (public)
-- 2. Crea bucket: audio (public)
-- 3. Política de lectura pública en ambos
-- 4. Política de subida pública opcional según necesidad
