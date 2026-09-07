-- ==============================================================
-- JARDÍN DE LA MEMORIA: fotos y "me gusta" en los Recuerdos
-- ==============================================================
-- Agrega a memorial_guestbook la posibilidad de adjuntar una foto
-- (bucket público "family-photos") y un contador de corazones por
-- mensaje. Ejecutar en el SQL Editor de Supabase.

BEGIN;

ALTER TABLE public.memorial_guestbook
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS likes INTEGER NOT NULL DEFAULT 0;

COMMIT;
