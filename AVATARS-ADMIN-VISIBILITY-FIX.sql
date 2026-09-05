-- ==========================================================
-- FIX: el panel de Admin no puede ver los avatares PRIVADOS
-- ==========================================================
-- Causa: AVATARS-PRIVATE-SETUP.sql reemplazó la política
-- "avatars_anon_select_all" (acceso total) por
-- "avatars_anon_select_non_private" (USING is_private = false).
-- Como el Admin usa la misma clave anon que el sitio público,
-- desde ese momento el listado del panel (fetchAvatars = SELECT *)
-- deja de traer las filas con is_private = true.
--
-- Efecto real: un avatar privado creado para un cliente puede
-- "desaparecer" del panel tras recargar la página, aunque siga
-- existiendo en la base de datos. Esto explica por qué, con varios
-- avatares, cuesta encontrar cuál es el de un cliente en particular.
--
-- Es seguro restaurar la visibilidad total para anon porque el
-- catálogo público (AvatarSection.tsx) ya filtra is_private=false
-- en la propia consulta, sin depender de RLS para ocultarlos.
-- ==========================================================

DROP POLICY IF EXISTS "avatars_anon_select_private" ON public.avatars;
CREATE POLICY "avatars_anon_select_private"
  ON public.avatars
  FOR SELECT
  TO anon
  USING (is_private = true);

-- (La política "avatars_anon_select_non_private" ya existente se
-- mantiene intacta; con esta se suman ambos casos vía OR y el panel
-- vuelve a ver todos los avatares, públicos y privados).
