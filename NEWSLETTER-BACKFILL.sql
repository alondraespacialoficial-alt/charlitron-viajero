-- ============================================================
-- CHARLITRON VIAJERO — BACKFILL DE SUSCRIPTORES (clientes existentes)
-- Ejecutar en Supabase SQL Editor DESPUÉS de NEWSLETTER-SETUP.sql
--
-- Importa a newsletter_subscribers los correos válidos de clientes
-- que YA se habían registrado antes de que existiera el checkbox
-- de opt-in (conference_tickets y course_enrollments).
--
-- Nota legal: estas personas no marcaron explícitamente "quiero
-- promociones", solo dieron su correo para el trámite (boleto/curso).
-- Se importan como suscritos por buena relación comercial, pero cada
-- correo que les mandemos siempre trae el link de "darme de baja"
-- (ya incluido en send-marketing-email.ts). Si prefieres ser más
-- estrictos, no corras este script y deja que la lista crezca solo
-- con opt-ins nuevos.
-- ============================================================

-- ----------------------------------------------------------------
-- Vista previa (opcional, ejecuta esto primero para ver cuántos entrarían)
-- ----------------------------------------------------------------
-- SELECT lower(attendee_email) AS email, count(*)
-- FROM public.conference_tickets
-- WHERE attendee_email IS NOT NULL
--   AND attendee_email <> 'sin-correo@reserva.local'
--   AND attendee_email ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$'
-- GROUP BY 1;

-- ----------------------------------------------------------------
-- 1. Importar asistentes de conferencias (conference_tickets)
-- ----------------------------------------------------------------
INSERT INTO public.newsletter_subscribers (email, name, interests, source)
SELECT DISTINCT ON (lower(attendee_email))
  lower(attendee_email)   AS email,
  attendee_name           AS name,
  ARRAY['conference']     AS interests,
  'backfill_conference'   AS source
FROM public.conference_tickets
WHERE attendee_email IS NOT NULL
  AND attendee_email <> ''
  AND lower(attendee_email) <> 'sin-correo@reserva.local'
  AND attendee_email ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$'
ORDER BY lower(attendee_email), created_at DESC
ON CONFLICT (email) DO UPDATE
  SET interests = (
        SELECT array_agg(DISTINCT x) FROM unnest(newsletter_subscribers.interests || EXCLUDED.interests) AS x
      ),
      name = COALESCE(newsletter_subscribers.name, EXCLUDED.name);

-- ----------------------------------------------------------------
-- 2. Importar inscritos a cursos (course_enrollments)
-- ----------------------------------------------------------------
INSERT INTO public.newsletter_subscribers (email, name, interests, source)
SELECT DISTINCT ON (lower(student_email))
  lower(student_email)  AS email,
  student_name          AS name,
  ARRAY['course']       AS interests,
  'backfill_course'     AS source
FROM public.course_enrollments
WHERE student_email IS NOT NULL
  AND student_email <> ''
  AND student_email ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$'
ORDER BY lower(student_email), created_at DESC
ON CONFLICT (email) DO UPDATE
  SET interests = (
        SELECT array_agg(DISTINCT x) FROM unnest(newsletter_subscribers.interests || EXCLUDED.interests) AS x
      ),
      name = COALESCE(newsletter_subscribers.name, EXCLUDED.name);
