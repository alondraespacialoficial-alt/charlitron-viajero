-- Mapa del Viajero: puntos geográficos enlazados a historias existentes.
CREATE TABLE IF NOT EXISTS traveler_map_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL DEFAULT 'Lugar',
  description TEXT,
  era TEXT,
  address TEXT,
  neighborhood TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  image_url TEXT,
  story_id TEXT REFERENCES stories(id) ON DELETE SET NULL,
  external_url TEXT,
  tags TEXT[] DEFAULT '{}',
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS traveler_map_points_published_idx
  ON traveler_map_points (published, category);

CREATE INDEX IF NOT EXISTS traveler_map_points_story_idx
  ON traveler_map_points (story_id);

ALTER TABLE traveler_map_points ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "traveler_map_public_read" ON traveler_map_points;
CREATE POLICY "traveler_map_public_read"
  ON traveler_map_points FOR SELECT TO anon, authenticated
  USING (published = TRUE);

-- El panel administrativo actual autentica en la aplicación y usa la clave anon,
-- por lo que mantiene la misma convención de CRUD que los módulos existentes.
DROP POLICY IF EXISTS "traveler_map_app_crud" ON traveler_map_points;
CREATE POLICY "traveler_map_app_crud"
  ON traveler_map_points FOR ALL TO anon, authenticated
  USING (TRUE) WITH CHECK (TRUE);

CREATE TABLE IF NOT EXISTS traveler_map_settings (
  id TEXT PRIMARY KEY DEFAULT 'default' CHECK (id = 'default'),
  marker_icon_url TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO traveler_map_settings (id)
VALUES ('default')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE traveler_map_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "traveler_map_settings_public_read" ON traveler_map_settings;
CREATE POLICY "traveler_map_settings_public_read"
  ON traveler_map_settings FOR SELECT TO anon, authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "traveler_map_settings_app_crud" ON traveler_map_settings;
CREATE POLICY "traveler_map_settings_app_crud"
  ON traveler_map_settings FOR ALL TO anon, authenticated
  USING (TRUE) WITH CHECK (TRUE);

CREATE TABLE IF NOT EXISTS traveler_map_point_likes (
  point_id UUID NOT NULL REFERENCES traveler_map_points(id) ON DELETE CASCADE,
  visitor_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (point_id, visitor_id)
);

ALTER TABLE traveler_map_point_likes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE traveler_map_point_likes FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_traveler_map_engagement(
  p_point_ids UUID[],
  p_visitor_id UUID
)
RETURNS TABLE (point_id UUID, likes BIGINT, is_liked BOOLEAN)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    map_point.id,
    COUNT(point_like.visitor_id)::BIGINT,
    COALESCE(BOOL_OR(point_like.visitor_id = p_visitor_id), FALSE)
  FROM public.traveler_map_points AS map_point
  LEFT JOIN public.traveler_map_point_likes AS point_like
    ON point_like.point_id = map_point.id
  WHERE map_point.id = ANY(p_point_ids)
    AND map_point.published = TRUE
  GROUP BY map_point.id;
$$;

CREATE OR REPLACE FUNCTION public.set_traveler_map_point_like(
  p_point_id UUID,
  p_visitor_id UUID,
  p_is_liked BOOLEAN
)
RETURNS TABLE (likes BIGINT, is_liked BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_visitor_id IS NULL THEN
    RAISE EXCEPTION 'Visitor id is required';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.traveler_map_points AS map_point
    WHERE map_point.id = p_point_id
      AND map_point.published = TRUE
  ) THEN
    RAISE EXCEPTION 'Published map point not found';
  END IF;

  IF p_is_liked THEN
    INSERT INTO public.traveler_map_point_likes (point_id, visitor_id)
    VALUES (p_point_id, p_visitor_id)
    ON CONFLICT (point_id, visitor_id) DO NOTHING;
  ELSE
    DELETE FROM public.traveler_map_point_likes AS point_like
    WHERE point_like.point_id = p_point_id
      AND point_like.visitor_id = p_visitor_id;
  END IF;

  RETURN QUERY
  SELECT
    COUNT(point_like.visitor_id)::BIGINT,
    COALESCE(BOOL_OR(point_like.visitor_id = p_visitor_id), FALSE)
  FROM public.traveler_map_point_likes AS point_like
  WHERE point_like.point_id = p_point_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_traveler_map_engagement(UUID[], UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_traveler_map_engagement(UUID[], UUID) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.set_traveler_map_point_like(UUID, UUID, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_traveler_map_point_like(UUID, UUID, BOOLEAN) TO anon, authenticated;