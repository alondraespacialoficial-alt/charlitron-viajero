-- ============================================================
-- SISTEMA DE COLABORADORES - Charlitron el Viajero
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Tabla de colaboradores (admin crea y gestiona)
CREATE TABLE IF NOT EXISTS collaborators (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabla de historias pendientes (enviadas por colaboradores)
CREATE TABLE IF NOT EXISTS pending_stories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  collaborator_id UUID REFERENCES collaborators(id) ON DELETE SET NULL,
  collaborator_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  -- Campos de historia (igual que stories)
  title TEXT NOT NULL,
  description TEXT,
  full_narrative TEXT,
  year TEXT,
  category TEXT,
  thumbnail TEXT,
  video_url TEXT,
  audio_url TEXT,
  maps_url TEXT,
  gallery JSONB DEFAULT '[]'::jsonb,
  is_private BOOLEAN DEFAULT false,
  is_video_vertical BOOLEAN DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE,
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_stories ENABLE ROW LEVEL SECURITY;

-- Collaborators: solo lectura pública (para verificar código de acceso)
-- El admin gestiona todo mediante service_role o anon con políticas abiertas.
-- NOTA: Ajusta según tu setup (si usas service_role key en el admin, 
-- puedes hacer las policies más restrictivas).

-- Política: cualquiera puede leer (para validar código en el portal)
CREATE POLICY "collaborators_public_read"
  ON collaborators FOR SELECT
  USING (true);

-- Política: solo inserción/actualización/eliminación sin restricción
-- (el panel admin usa la misma anon key con estas policies abiertas)
CREATE POLICY "collaborators_public_insert"
  ON collaborators FOR INSERT
  WITH CHECK (true);

CREATE POLICY "collaborators_public_update"
  ON collaborators FOR UPDATE
  USING (true);

CREATE POLICY "collaborators_public_delete"
  ON collaborators FOR DELETE
  USING (true);

-- Pending stories: lectura y escritura abierta
-- (el colaborador necesita leer sus propias historias y el admin todas)
CREATE POLICY "pending_stories_public_read"
  ON pending_stories FOR SELECT
  USING (true);

CREATE POLICY "pending_stories_public_insert"
  ON pending_stories FOR INSERT
  WITH CHECK (true);

CREATE POLICY "pending_stories_public_update"
  ON pending_stories FOR UPDATE
  USING (true);

CREATE POLICY "pending_stories_public_delete"
  ON pending_stories FOR DELETE
  USING (true);

-- ============================================================
-- ÍNDICES para rendimiento
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_collaborators_code ON collaborators(code);
CREATE INDEX IF NOT EXISTS idx_collaborators_is_active ON collaborators(is_active);
CREATE INDEX IF NOT EXISTS idx_pending_stories_collaborator ON pending_stories(collaborator_id);
CREATE INDEX IF NOT EXISTS idx_pending_stories_status ON pending_stories(status);
CREATE INDEX IF NOT EXISTS idx_pending_stories_created ON pending_stories(created_at DESC);
