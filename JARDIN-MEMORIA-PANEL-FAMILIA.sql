-- ==============================================================
-- JARDÍN DE LA MEMORIA: Panel de familia (acceso limitado por memorial)
-- ==============================================================
-- Permite que cada memorial tenga un correo + contraseña propios
-- (generados desde el Súper Admin) para que la familia edite lo
-- esencial (foto, nombre, fechas, epitafio) y modere sus recuerdos,
-- además de un aviso destacado (banner) que se muestra en rojo.
-- Ejecutar en el SQL Editor de Supabase.

BEGIN;

ALTER TABLE public.memorials
  ADD COLUMN IF NOT EXISTS editor_email TEXT,
  ADD COLUMN IF NOT EXISTS editor_password TEXT,
  ADD COLUMN IF NOT EXISTS banner_message TEXT,
  ADD COLUMN IF NOT EXISTS banner_active BOOLEAN NOT NULL DEFAULT false;

COMMIT;
