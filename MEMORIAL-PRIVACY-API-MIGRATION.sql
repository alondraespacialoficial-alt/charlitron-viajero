-- Memorial privacy/API migration. Prepared for manual review; do not run before
-- deploying the matching API/client version and reviewing storage URL exposure.
BEGIN;

-- Bring forward columns from the optional memorial feature migrations so this
-- security migration can be applied consistently to older installations.
ALTER TABLE public.memorials
  ADD COLUMN IF NOT EXISTS linked_memorial_id UUID REFERENCES public.memorials(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS editor_email TEXT,
  ADD COLUMN IF NOT EXISTS editor_password TEXT,
  ADD COLUMN IF NOT EXISTS banner_message TEXT,
  ADD COLUMN IF NOT EXISTS banner_active BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.memorial_guestbook
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS likes INTEGER NOT NULL DEFAULT 0;

-- Public memorials are deliberately exposed through a fixed projection only.
CREATE OR REPLACE VIEW public.memorial_public WITH (security_barrier = true) AS
SELECT
  id,
  slug,
  full_name,
  family_label,
  photo_url,
  birth_date,
  death_date,
  epitaph,
  bio_short,
  visibility,
  story_id,
  family_member_id,
  linked_memorial_id,
  tribute_song_url,
  spotify_link,
  tribute_video_url,
  requires_approval,
  banner_message,
  banner_active,
  created_at,
  updated_at,
  (editor_email IS NOT NULL AND editor_password IS NOT NULL) AS has_family_editor
FROM public.memorials
WHERE visibility = 'public';

CREATE OR REPLACE VIEW public.memorial_guestbook_public WITH (security_barrier = true) AS
SELECT g.id, g.memorial_id, g.visitor_name, g.message, g.photo_url, g.likes, g.status, g.created_at
FROM public.memorial_guestbook AS g
JOIN public.memorials AS m ON m.id = g.memorial_id
WHERE g.status = 'approved'
  AND m.visibility = 'public';

CREATE OR REPLACE VIEW public.memorial_gestures_public WITH (security_barrier = true) AS
SELECT g.id, g.memorial_id, g.gesture_type, g.visitor_name, g.created_at
FROM public.memorial_gestures AS g
JOIN public.memorials AS m ON m.id = g.memorial_id
WHERE m.visibility = 'public';

-- Direct REST access to base tables is removed. The Vercel API uses the
-- service-role key, which is never sent to the browser.
REVOKE ALL ON TABLE public.memorials FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.memorial_guestbook FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.memorial_gestures FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.memorials, public.memorial_guestbook, public.memorial_gestures TO service_role;
GRANT SELECT ON public.memorial_public TO anon, authenticated;
GRANT SELECT ON public.memorial_guestbook_public TO anon, authenticated;
GRANT SELECT ON public.memorial_gestures_public TO anon, authenticated;
GRANT SELECT ON public.memorial_public TO service_role;
GRANT SELECT ON public.memorial_guestbook_public TO service_role;
GRANT SELECT ON public.memorial_gestures_public TO service_role;

-- Keep row-level policies restrictive as defense in depth if table grants are
-- deliberately restored in a future migration.
DROP POLICY IF EXISTS "memorials_select" ON public.memorials;
DROP POLICY IF EXISTS "memorials_public_select" ON public.memorials;
CREATE POLICY "memorials_public_select" ON public.memorials
  FOR SELECT TO anon, authenticated
  USING (visibility = 'public');

DROP POLICY IF EXISTS "memorial_guestbook_select" ON public.memorial_guestbook;
DROP POLICY IF EXISTS "memorial_guestbook_public_select" ON public.memorial_guestbook;
CREATE POLICY "memorial_guestbook_public_select" ON public.memorial_guestbook
  FOR SELECT TO anon, authenticated
  USING (
    status = 'approved'
    AND EXISTS (
      SELECT 1 FROM public.memorials AS m
      WHERE m.id = memorial_guestbook.memorial_id
        AND m.visibility = 'public'
    )
  );

DROP POLICY IF EXISTS "memorial_gestures_select" ON public.memorial_gestures;
DROP POLICY IF EXISTS "memorial_gestures_public_select" ON public.memorial_gestures;
CREATE POLICY "memorial_gestures_public_select" ON public.memorial_gestures
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.memorials AS m
      WHERE m.id = memorial_gestures.memorial_id
        AND m.visibility = 'public'
    )
  );

COMMIT;
