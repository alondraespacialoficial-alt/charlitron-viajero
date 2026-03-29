-- ==========================================
-- SQL PARA CONCURSOS - SUPABASE
-- ==========================================

-- 1. Tabla Principal de Concursos
CREATE TABLE IF NOT EXISTS contests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  question TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  winner_name TEXT, -- Nombre del ganador mostrado públicamente
  winner_code_id UUID, -- Referencia al código ganador
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabla de Opciones de Respuesta
CREATE TABLE IF NOT EXISTS contest_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id UUID NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
  answer_text TEXT NOT NULL,
  is_correct BOOLEAN DEFAULT FALSE,
  answer_order INTEGER NOT NULL, -- Para ordenar las respuestas (1, 2, 3)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabla de Participaciones
CREATE TABLE IF NOT EXISTS contest_participations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id UUID NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
  user_session_id TEXT NOT NULL, -- ID de sesión del usuario
  selected_answer_id UUID NOT NULL REFERENCES contest_answers(id) ON DELETE CASCADE,
  is_correct BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(contest_id, user_session_id) -- Un usuario solo puede participar una vez por concurso
);

-- 4. Tabla de Códigos Generados (Single-Use)
CREATE TABLE IF NOT EXISTS contest_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id UUID NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
  code TEXT UNIQUE NOT NULL, -- Código único (ej: VIAJERO-ABC123)
  is_used BOOLEAN DEFAULT FALSE,
  used_by_session TEXT, -- Quién usó el código
  used_at TIMESTAMP WITH TIME ZONE, -- Cuándo se usó
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Tabla de Ganadores
CREATE TABLE IF NOT EXISTS contest_winners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id UUID NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
  user_session_id TEXT NOT NULL,
  code_id UUID NOT NULL REFERENCES contest_codes(id) ON DELETE CASCADE,
  user_name TEXT, -- Nombre del ganador (opcional para mostrar)
  shared_on_social BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- ENABLE RLS (Row Level Security)
-- ==========================================
ALTER TABLE contests ENABLE ROW LEVEL SECURITY;
ALTER TABLE contest_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE contest_participations ENABLE ROW LEVEL SECURITY;
ALTER TABLE contest_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE contest_winners ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- POLÍTICAS RLS
-- ==========================================

-- CONTESTS: Lectura pública, solo admin puede modificar
CREATE POLICY "Lectura pública de concursos" 
ON contests FOR SELECT 
USING (true);

CREATE POLICY "Solo admin gestiona concursos" 
ON contests FOR ALL 
USING (true);

-- CONTEST_ANSWERS: Lectura pública
CREATE POLICY "Lectura pública de respuestas" 
ON contest_answers FOR SELECT 
USING (true);

CREATE POLICY "Solo admin gestiona respuestas" 
ON contest_answers FOR ALL 
USING (true);

-- CONTEST_PARTICIPATIONS: Lectura pública, todos pueden insertar
CREATE POLICY "Todos pueden participar" 
ON contest_participations FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Lectura pública de participaciones" 
ON contest_participations FOR SELECT 
USING (true);

-- CONTEST_CODES: Solo el usuario puede ver su código una vez generado
CREATE POLICY "Lectura de códigos generados" 
ON contest_codes FOR SELECT 
USING (true);

CREATE POLICY "Generar códigos automáticamente" 
ON contest_codes FOR INSERT 
WITH CHECK (true);

-- CONTEST_WINNERS: Lectura pública
CREATE POLICY "Lectura pública de ganadores" 
ON contest_winners FOR SELECT 
USING (true);

CREATE POLICY "Registrar ganadores automáticamente" 
ON contest_winners FOR INSERT 
WITH CHECK (true);

-- ==========================================
-- FUN INDICES (Optimización)
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_contests_is_active ON contests(is_active);
CREATE INDEX IF NOT EXISTS idx_contest_answers_contest_id ON contest_answers(contest_id);
CREATE INDEX IF NOT EXISTS idx_contest_participations_contest_id ON contest_participations(contest_id);
CREATE INDEX IF NOT EXISTS idx_contest_participations_session ON contest_participations(user_session_id);
CREATE INDEX IF NOT EXISTS idx_contest_codes_is_used ON contest_codes(is_used);
CREATE INDEX IF NOT EXISTS idx_contest_winners_contest_id ON contest_winners(contest_id);

-- ==========================================
-- EJEMPLO DE INSERCIÓN (Para probar)
-- ==========================================
-- INSERT INTO contests (title, description, image_url, question, is_active)
-- VALUES (
--   'Foto más antigua',
--   'Sube la foto más antigua de tu familia',
--   'https://tu-url-imagen.jpg',
--   '¿En qué década fue tomada esta foto?',
--   true
-- );

-- INSERT INTO contest_answers (contest_id, answer_text, is_correct, answer_order)
-- VALUES 
--   ((SELECT id FROM contests LIMIT 1), '1950s', false, 1),
--   ((SELECT id FROM contests LIMIT 1), '1920s', true, 2),
--   ((SELECT id FROM contests LIMIT 1), '1890s', false, 3);
