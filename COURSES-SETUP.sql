-- ============================================================
-- CHARLITRON VIAJERO — MÓDULO DE CURSOS
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- ----------------------------------------------------------------
-- 1. TABLA: courses
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.courses (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT NOT NULL,
  description  TEXT,
  banner_url   TEXT,
  price        NUMERIC(10,2) DEFAULT 0,
  is_active    BOOLEAN DEFAULT true,
  order_index  INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- 2. TABLA: course_lessons
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.course_lessons (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id      UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  description    TEXT,
  video_url      TEXT,          -- URL de YouTube o video directo
  audio_url      TEXT,          -- URL de audio (mp3, etc.)
  pdf_url        TEXT,          -- URL de PDF
  images         JSONB DEFAULT '[]'::JSONB,  -- array de URLs de imágenes
  text_content   TEXT,          -- texto/notas de la lección
  order_index    INTEGER DEFAULT 0,
  is_free_preview BOOLEAN DEFAULT false,     -- visible sin código
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- 3. TABLA: course_enrollments
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.course_enrollments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id      UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  student_name   TEXT NOT NULL,
  student_email  TEXT NOT NULL,
  student_phone  TEXT,
  status         TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','paid','cancelled')),
  access_code    TEXT UNIQUE,   -- generado al marcar como pagado
  payment_notes  TEXT,
  paid_at        TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- 4. TABLA: course_questions
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.course_questions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id      UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  lesson_id      UUID REFERENCES public.course_lessons(id) ON DELETE SET NULL,
  enrollment_id  UUID REFERENCES public.course_enrollments(id) ON DELETE SET NULL,
  student_name   TEXT NOT NULL,
  question_text  TEXT NOT NULL,
  answer_text    TEXT,
  answered_by    TEXT,          -- nombre del colaborador o admin
  answered_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- 5. TRIGGER: genera access_code al marcar enrollment como 'paid'
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_course_access_code()
RETURNS TRIGGER AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code  TEXT;
  done  BOOLEAN := FALSE;
  i     INT;
BEGIN
  IF NEW.status = 'paid'
     AND (OLD.status IS DISTINCT FROM 'paid')
     AND NEW.access_code IS NULL
  THEN
    WHILE NOT done LOOP
      code := '';
      FOR i IN 1..8 LOOP
        code := code || substr(chars, floor(random() * length(chars) + 1)::INT, 1);
      END LOOP;
      IF NOT EXISTS (SELECT 1 FROM public.course_enrollments WHERE access_code = code) THEN
        done := TRUE;
      END IF;
    END LOOP;
    NEW.access_code := code;
    NEW.paid_at     := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_course_access_code ON public.course_enrollments;
CREATE TRIGGER trg_course_access_code
  BEFORE UPDATE ON public.course_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.generate_course_access_code();

-- ----------------------------------------------------------------
-- 6. RLS (acceso público de lectura, escritura anon permitida)
-- ----------------------------------------------------------------
ALTER TABLE public.courses            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_lessons     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_questions   ENABLE ROW LEVEL SECURITY;

-- Cursos activos: lectura pública
CREATE POLICY "courses_public_read" ON public.courses
  FOR SELECT USING (true);
CREATE POLICY "courses_anon_write" ON public.courses
  FOR ALL USING (true) WITH CHECK (true);

-- Lecciones: lectura pública
CREATE POLICY "lessons_public_read" ON public.course_lessons
  FOR SELECT USING (true);
CREATE POLICY "lessons_anon_write" ON public.course_lessons
  FOR ALL USING (true) WITH CHECK (true);

-- Inscripciones: escritura anon (registro), lectura anon
CREATE POLICY "enrollments_public" ON public.course_enrollments
  FOR ALL USING (true) WITH CHECK (true);

-- Preguntas: lectura y escritura pública
CREATE POLICY "questions_public" ON public.course_questions
  FOR ALL USING (true) WITH CHECK (true);
