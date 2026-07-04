-- ============================================================
-- CHARLITRON VIAJERO — AVATARES PRIVADOS (MIGRACION)
-- Ejecutar en Supabase SQL Editor
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 0) EXTENSIONES
-- ------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ------------------------------------------------------------
-- 1) AVATARS: CAMPOS PARA PRIVADOS
-- ------------------------------------------------------------
ALTER TABLE public.avatars
  ADD COLUMN IF NOT EXISTS is_private BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS private_client_label TEXT;

COMMENT ON COLUMN public.avatars.is_private IS 'TRUE = avatar privado, no visible en catalogo publico';
COMMENT ON COLUMN public.avatars.private_client_label IS 'Etiqueta interna del cliente privado (opcional)';

-- ------------------------------------------------------------
-- 2) AJUSTE DE POLITICAS DE LECTURA EN AVATARS
--    Publico: solo avatares activos y NO privados
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "avatars_public_select" ON public.avatars;
CREATE POLICY "avatars_public_select"
  ON public.avatars
  FOR SELECT
  USING (is_active = true AND is_private = false);

-- Si existe una politica amplia para anon, la acotamos para no filtrar privados.
DROP POLICY IF EXISTS "avatars_anon_select_all" ON public.avatars;
CREATE POLICY "avatars_anon_select_non_private"
  ON public.avatars
  FOR SELECT
  TO anon
  USING (is_private = false);

-- ------------------------------------------------------------
-- 3) TABLA DE CODIGOS PRIVADOS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.avatar_private_codes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  avatar_id     UUID NOT NULL REFERENCES public.avatars(id) ON DELETE CASCADE,
  code          TEXT NOT NULL UNIQUE,
  max_uses      INTEGER NOT NULL DEFAULT 1 CHECK (max_uses > 0),
  uses_count    INTEGER NOT NULL DEFAULT 0 CHECK (uses_count >= 0),
  is_active     BOOLEAN NOT NULL DEFAULT true,
  assigned_to   TEXT,
  expires_at    TIMESTAMPTZ,
  last_used_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT avatar_private_codes_code_len CHECK (char_length(trim(code)) BETWEEN 4 AND 64),
  CONSTRAINT avatar_private_codes_uses_limit CHECK (uses_count <= max_uses)
);

CREATE INDEX IF NOT EXISTS idx_avatar_private_codes_avatar_id ON public.avatar_private_codes(avatar_id);
CREATE INDEX IF NOT EXISTS idx_avatar_private_codes_code ON public.avatar_private_codes(code);
CREATE INDEX IF NOT EXISTS idx_avatar_private_codes_active ON public.avatar_private_codes(is_active, expires_at);

-- Normaliza codigo a mayusculas y sin espacios extremos
CREATE OR REPLACE FUNCTION public.normalize_avatar_private_code()
RETURNS TRIGGER AS $$
BEGIN
  NEW.code := upper(trim(NEW.code));
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_avatar_private_codes_normalize ON public.avatar_private_codes;
CREATE TRIGGER trg_avatar_private_codes_normalize
  BEFORE INSERT OR UPDATE ON public.avatar_private_codes
  FOR EACH ROW
  EXECUTE FUNCTION public.normalize_avatar_private_code();

ALTER TABLE public.avatar_private_codes ENABLE ROW LEVEL SECURITY;

-- Sin politicas de SELECT/INSERT/UPDATE/DELETE para anon/authenticated.
-- Con RLS habilitado y sin politicas, el acceso directo desde cliente queda denegado.

-- Refuerzo de privilegios directos de tabla
REVOKE ALL ON TABLE public.avatar_private_codes FROM anon, authenticated;

-- ------------------------------------------------------------
-- 4) FUNCION SEGURA: CANJEAR CODIGO PRIVADO (ATOMICA)
--    - Valida codigo
--    - Consume uso
--    - Devuelve SOLO el avatar privado asociado
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.redeem_private_avatar_code(p_code TEXT)
RETURNS TABLE (
  avatar_id   UUID,
  slug        TEXT,
  label       TEXT,
  description TEXT,
  emoji       TEXT,
  image_url   TEXT,
  pub_key     TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
BEGIN
  v_code := upper(trim(coalesce(p_code, '')));

  IF v_code = '' THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH consumed AS (
    UPDATE public.avatar_private_codes c
       SET uses_count   = c.uses_count + 1,
           is_active    = CASE WHEN (c.uses_count + 1) >= c.max_uses THEN false ELSE true END,
           last_used_at = NOW(),
           updated_at   = NOW()
      FROM public.avatars a
     WHERE c.avatar_id = a.id
       AND c.code = v_code
       AND c.is_active = true
       AND (c.expires_at IS NULL OR c.expires_at > NOW())
       AND a.is_private = true
       AND a.is_active = true
       AND coalesce(a.pub_key, '') <> ''
    RETURNING a.id, a.slug, a.label, a.description, a.emoji, a.image_url, a.pub_key
  )
  SELECT id, slug, label, description, emoji, image_url, pub_key
  FROM consumed
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_private_avatar_code(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_private_avatar_code(TEXT) TO anon, authenticated;

-- ------------------------------------------------------------
-- 5) FUNCION OPCIONAL (ADMIN SQL): GENERAR CODIGO PRIVADO
--    Uso recomendado desde SQL Editor (service role)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_private_avatar_code(
  p_avatar_id UUID,
  p_code TEXT DEFAULT NULL,
  p_max_uses INTEGER DEFAULT 1,
  p_expires_at TIMESTAMPTZ DEFAULT NULL,
  p_assigned_to TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  avatar_id UUID,
  code TEXT,
  max_uses INTEGER,
  uses_count INTEGER,
  is_active BOOLEAN,
  assigned_to TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
BEGIN
  IF p_max_uses IS NULL OR p_max_uses < 1 THEN
    RAISE EXCEPTION 'p_max_uses debe ser >= 1';
  END IF;

  IF p_code IS NULL OR trim(p_code) = '' THEN
    v_code := upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 10));
  ELSE
    v_code := upper(trim(p_code));
  END IF;

  RETURN QUERY
  INSERT INTO public.avatar_private_codes (
    avatar_id, code, max_uses, assigned_to, expires_at
  )
  VALUES (
    p_avatar_id, v_code, p_max_uses, nullif(trim(coalesce(p_assigned_to, '')), ''), p_expires_at
  )
  RETURNING
    avatar_private_codes.id,
    avatar_private_codes.avatar_id,
    avatar_private_codes.code,
    avatar_private_codes.max_uses,
    avatar_private_codes.uses_count,
    avatar_private_codes.is_active,
    avatar_private_codes.assigned_to,
    avatar_private_codes.expires_at,
    avatar_private_codes.created_at;
END;
$$;

REVOKE ALL ON FUNCTION public.create_private_avatar_code(UUID, TEXT, INTEGER, TIMESTAMPTZ, TEXT) FROM PUBLIC;
-- NOTA: no se otorga EXECUTE a anon/authenticated por seguridad.

COMMIT;

-- ============================================================
-- EJEMPLOS DE USO (SQL Editor)
-- ============================================================
-- 1) Marcar avatar como privado
-- UPDATE public.avatars
-- SET is_private = true,
--     private_client_label = 'Familia Perez'
-- WHERE slug = 'avatar-papa-perez';

-- 2) Crear codigo privado (1 uso)
-- SELECT * FROM public.create_private_avatar_code(
--   p_avatar_id := 'UUID_DEL_AVATAR',
--   p_code := 'PAPA2026',
--   p_max_uses := 1,
--   p_expires_at := NOW() + INTERVAL '30 days',
--   p_assigned_to := 'Cliente Perez'
-- );

-- 3) Probar canje (desde SQL)
-- SELECT * FROM public.redeem_private_avatar_code('PAPA2026');
-- (2da vez debe regresar 0 filas si era de 1 uso)
