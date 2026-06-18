-- ============================================================
-- CHARLITRON VIAJERO — MÓDULO DE CONFERENCIAS Y BOLETOS
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- ----------------------------------------------------------------
-- 1. TABLA: conferences (eventos/conferencias)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.conferences (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  description   TEXT,
  banner_url    TEXT,               -- imagen del banner (bucket: images)
  event_date    TIMESTAMPTZ,        -- fecha y hora del evento
  location      TEXT,               -- lugar del evento
  price         NUMERIC(10, 2) DEFAULT 0,
  capacity      INTEGER DEFAULT 100, -- cupo máximo
  is_active     BOOLEAN DEFAULT true,
  notes         TEXT,               -- notas internas del admin
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- 2. TABLA: conference_tickets (boletos con folio)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.conference_tickets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conference_id   UUID NOT NULL REFERENCES public.conferences(id) ON DELETE CASCADE,
  folio           TEXT NOT NULL UNIQUE,   -- ej: CHARLI-2026-0001
  attendee_name   TEXT NOT NULL,
  attendee_email  TEXT NOT NULL,
  attendee_phone  TEXT,
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'paid', 'cancelled')),
  payment_notes   TEXT,             -- notas del admin al marcar pagado
  paid_at         TIMESTAMPTZ,      -- fecha en que se marcó pagado
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- 3. SECUENCIA PARA FOLIOS (contador por año)
-- ----------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.ticket_folio_seq START 1;

-- ----------------------------------------------------------------
-- 4. FUNCIÓN: genera folio único automático
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_ticket_folio()
RETURNS TRIGGER AS $$
DECLARE
  year_str TEXT;
  seq_num  TEXT;
BEGIN
  year_str := TO_CHAR(NOW(), 'YYYY');
  seq_num  := LPAD(nextval('public.ticket_folio_seq')::TEXT, 4, '0');
  NEW.folio := 'CHARLI-' || year_str || '-' || seq_num;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------
-- 5. TRIGGER: asigna folio antes de insertar
-- ----------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_set_ticket_folio ON public.conference_tickets;
CREATE TRIGGER trg_set_ticket_folio
  BEFORE INSERT ON public.conference_tickets
  FOR EACH ROW
  WHEN (NEW.folio IS NULL OR NEW.folio = '')
  EXECUTE FUNCTION public.generate_ticket_folio();

-- ----------------------------------------------------------------
-- 6. FUNCIÓN: actualiza updated_at en conferences
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_conferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_conferences_updated_at ON public.conferences;
CREATE TRIGGER trg_conferences_updated_at
  BEFORE UPDATE ON public.conferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_conferences_updated_at();

-- ----------------------------------------------------------------
-- 7. HABILITAR RLS (Row Level Security)
-- ----------------------------------------------------------------
ALTER TABLE public.conferences         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conference_tickets  ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------
-- 8. POLÍTICAS — conferences
-- ----------------------------------------------------------------

-- Cualquier usuario puede VER conferencias activas (público)
CREATE POLICY "conferences_public_select"
  ON public.conferences
  FOR SELECT
  USING (is_active = true);

-- anon puede VER TODAS (para el admin que usa la clave anon)
CREATE POLICY "conferences_anon_select_all"
  ON public.conferences
  FOR SELECT
  TO anon
  USING (true);

-- anon puede INSERTAR (el admin usa la clave anon)
CREATE POLICY "conferences_anon_insert"
  ON public.conferences
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- anon puede ACTUALIZAR
CREATE POLICY "conferences_anon_update"
  ON public.conferences
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- anon puede ELIMINAR
CREATE POLICY "conferences_anon_delete"
  ON public.conferences
  FOR DELETE
  TO anon
  USING (true);

-- ----------------------------------------------------------------
-- 9. POLÍTICAS — conference_tickets
-- ----------------------------------------------------------------

-- anon puede INSERTAR boletos (visitantes registran desde la app)
CREATE POLICY "tickets_anon_insert"
  ON public.conference_tickets
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- anon puede LEER todos los boletos (el admin los necesita ver)
CREATE POLICY "tickets_anon_select"
  ON public.conference_tickets
  FOR SELECT
  TO anon
  USING (true);

-- anon puede ACTUALIZAR (el admin marca pagado/cancelado)
CREATE POLICY "tickets_anon_update"
  ON public.conference_tickets
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- anon puede ELIMINAR
CREATE POLICY "tickets_anon_delete"
  ON public.conference_tickets
  FOR DELETE
  TO anon
  USING (true);

-- ----------------------------------------------------------------
-- 10. ÍNDICES para búsquedas frecuentes
-- ----------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_tickets_conference_id ON public.conference_tickets(conference_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status        ON public.conference_tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_folio         ON public.conference_tickets(folio);
CREATE INDEX IF NOT EXISTS idx_conferences_active    ON public.conferences(is_active);

-- ----------------------------------------------------------------
-- NOTA sobre el bucket "images":
-- Los banners se suben al bucket existente "images" en la ruta:
--   conferences/<timestamp>-<nombre_archivo>
-- El bucket ya es PUBLIC, no se requiere configuración adicional.
-- ----------------------------------------------------------------
