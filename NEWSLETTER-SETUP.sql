-- ============================================================
-- CHARLITRON VIAJERO — MÓDULO DE EMAIL MARKETING (NEWSLETTER)
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- ----------------------------------------------------------------
-- 1. TABLA: newsletter_subscribers
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email             TEXT NOT NULL UNIQUE,
  name              TEXT,
  interests         TEXT[] NOT NULL DEFAULT '{}',  -- 'conference' | 'course' | 'contest'
  source            TEXT,                          -- de dónde vino el opt-in
  is_subscribed     BOOLEAN NOT NULL DEFAULT true,
  unsubscribe_token UUID NOT NULL DEFAULT gen_random_uuid(),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  unsubscribed_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_interests
  ON public.newsletter_subscribers USING GIN (interests);

-- ----------------------------------------------------------------
-- 2. RLS: solo el backend (service role) puede leer/enviar campañas.
--    El público solo puede insertar su propio opt-in (vía API con
--    validación) — no lectura ni actualización directa desde el cliente.
-- ----------------------------------------------------------------
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_insert_subscription" ON public.newsletter_subscribers;
CREATE POLICY "public_insert_subscription"
  ON public.newsletter_subscribers
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Sin políticas de SELECT/UPDATE/DELETE para anon: todo eso pasa
-- por endpoints protegidos que usan la service role key.
