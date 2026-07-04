-- ============================================================
-- CHARLITRON VIAJERO — REGISTRO DE CONSENTIMIENTOS PRIVADOS
-- Ejecutar en Supabase SQL Editor (después de AVATARS-PRIVATE-SETUP.sql)
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. TABLA: avatar_consent_logs
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.avatar_consent_logs (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name       TEXT        NOT NULL,
  consent_code      BOOLEAN     NOT NULL DEFAULT false,   -- "Recibí el código por WhatsApp y no lo compartiré"
  consent_terms     BOOLEAN     NOT NULL DEFAULT false,   -- "Esta experiencia corresponde al acuerdo previo"
  notice_version    TEXT        NOT NULL DEFAULT '1.0',   -- versión del aviso mostrado
  is_return_visit   BOOLEAN     NOT NULL DEFAULT false,   -- true = reingreso (formulario corto)
  user_agent        TEXT,                                 -- primeros 300 chars del user-agent
  consented_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT consent_logs_name_len   CHECK (char_length(trim(client_name)) BETWEEN 1 AND 200),
  CONSTRAINT consent_logs_must_agree CHECK (consent_code = true AND consent_terms = true)
);

CREATE INDEX IF NOT EXISTS idx_consent_logs_consented_at ON public.avatar_consent_logs(consented_at DESC);

COMMENT ON TABLE  public.avatar_consent_logs                  IS 'Registro de consentimientos de clientes de avatares privados';
COMMENT ON COLUMN public.avatar_consent_logs.client_name      IS 'Nombre que el cliente escribió al ingresar';
COMMENT ON COLUMN public.avatar_consent_logs.consent_code     IS 'Confirmó que el código le fue enviado y no lo compartirá';
COMMENT ON COLUMN public.avatar_consent_logs.consent_terms    IS 'Confirmó que la experiencia corresponde al acuerdo previo';
COMMENT ON COLUMN public.avatar_consent_logs.notice_version   IS 'Versión del aviso de privacidad mostrado al momento del consentimiento';
COMMENT ON COLUMN public.avatar_consent_logs.is_return_visit  IS 'TRUE si completó formulario corto de reingreso';
COMMENT ON COLUMN public.avatar_consent_logs.user_agent       IS 'User-agent del navegador (evidencia técnica, truncado a 300 chars)';

-- ------------------------------------------------------------
-- 2. RLS — Solo INSERT desde anon; ni leer ni modificar
-- ------------------------------------------------------------
ALTER TABLE public.avatar_consent_logs ENABLE ROW LEVEL SECURITY;

-- anon puede insertar únicamente si ambas casillas están en true
CREATE POLICY "consent_logs_anon_insert"
  ON public.avatar_consent_logs
  FOR INSERT
  TO anon
  WITH CHECK (
    char_length(trim(client_name)) > 0
    AND consent_code  = true
    AND consent_terms = true
  );

-- No SELECT, UPDATE ni DELETE para ningún rol desde cliente
REVOKE SELECT, UPDATE, DELETE ON TABLE public.avatar_consent_logs FROM anon, authenticated;

COMMIT;

-- ============================================================
-- NOTAS DE OPERACIÓN
-- ============================================================
-- • Esta tabla es append-only desde el cliente (solo INSERT).
-- • Para consultar los registros debes usar el panel de Supabase
--   o una conexión con service_role (nunca expongas service_role al frontend).
-- • notice_version = '1.0' corresponde al aviso actual en AvatarSection.tsx.
--   Si cambias los textos del aviso, actualiza esta constante en el frontend
--   y registra aquí el cambio.
-- • Para exportar consentimientos (LGPD / auditoría):
--   SELECT * FROM public.avatar_consent_logs ORDER BY consented_at DESC;
