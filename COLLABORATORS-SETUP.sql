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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  historian_id UUID,
  historian_name TEXT,
  historian_photo TEXT
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_stories ENABLE ROW LEVEL SECURITY;

-- Políticas con DROP IF EXISTS para evitar el error de duplicado
DROP POLICY IF EXISTS "collaborators_public_read"   ON collaborators;
DROP POLICY IF EXISTS "collaborators_public_insert" ON collaborators;
DROP POLICY IF EXISTS "collaborators_public_update" ON collaborators;
DROP POLICY IF EXISTS "collaborators_public_delete" ON collaborators;
DROP POLICY IF EXISTS "pending_stories_public_read"   ON pending_stories;
DROP POLICY IF EXISTS "pending_stories_public_insert" ON pending_stories;
DROP POLICY IF EXISTS "pending_stories_public_update" ON pending_stories;
DROP POLICY IF EXISTS "pending_stories_public_delete" ON pending_stories;

CREATE POLICY "collaborators_public_read"   ON collaborators FOR SELECT USING (true);
CREATE POLICY "collaborators_public_insert" ON collaborators FOR INSERT WITH CHECK (true);
CREATE POLICY "collaborators_public_update" ON collaborators FOR UPDATE USING (true);
CREATE POLICY "collaborators_public_delete" ON collaborators FOR DELETE USING (true);

CREATE POLICY "pending_stories_public_read"   ON pending_stories FOR SELECT USING (true);
CREATE POLICY "pending_stories_public_insert" ON pending_stories FOR INSERT WITH CHECK (true);
CREATE POLICY "pending_stories_public_update" ON pending_stories FOR UPDATE USING (true);
CREATE POLICY "pending_stories_public_delete" ON pending_stories FOR DELETE USING (true);

-- ============================================================
-- ÍNDICES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_collaborators_code        ON collaborators(code);
CREATE INDEX IF NOT EXISTS idx_collaborators_is_active   ON collaborators(is_active);
CREATE INDEX IF NOT EXISTS idx_pending_stories_collaborator ON pending_stories(collaborator_id);
CREATE INDEX IF NOT EXISTS idx_pending_stories_status    ON pending_stories(status);
CREATE INDEX IF NOT EXISTS idx_pending_stories_created   ON pending_stories(created_at DESC);

-- ============================================================
-- MIGRACIÓN DE COLUMNAS (se agregan solo si no existen)
-- ============================================================
ALTER TABLE pending_stories ADD COLUMN IF NOT EXISTS historian_id    UUID;
ALTER TABLE pending_stories ADD COLUMN IF NOT EXISTS historian_name  TEXT;
ALTER TABLE pending_stories ADD COLUMN IF NOT EXISTS historian_photo TEXT;

