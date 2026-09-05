-- ==========================================
-- ÁRBOL GENEALÓGICO: identificar cliente dueño de cada clave
-- ==========================================
-- Problema: con varias claves activas/vencidas no se sabía a qué cliente
-- pertenecía cada una al momento de renovar o vender un paquete nuevo.
-- Solución: agregar nombre (y contacto opcional) del cliente a la clave.

ALTER TABLE access_keys
  ADD COLUMN IF NOT EXISTS client_name TEXT,
  ADD COLUMN IF NOT EXISTS client_contact TEXT;

-- Índice para buscar rápido por nombre de cliente desde el admin
CREATE INDEX IF NOT EXISTS idx_access_keys_client_name ON access_keys (client_name);
