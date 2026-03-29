-- ============================================
-- TABLA: install_events
-- Descripción: Registra eventos de instalación PWA
-- ============================================

CREATE TABLE IF NOT EXISTS install_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  event_type TEXT NOT NULL, -- 'banner_shown', 'install_attempted', 'install_accepted', 'install_dismissed', 'instructions_viewed'
  device_type TEXT, -- 'mobile', 'tablet', 'desktop'
  user_agent TEXT,
  browser TEXT,
  operating_system TEXT,
  ip_address TEXT,
  outcome TEXT -- 'accepted', 'dismissed', 'error', 'viewed'
);

-- Índices para consultas rápidas
CREATE INDEX idx_install_events_created_at ON install_events(created_at DESC);
CREATE INDEX idx_install_events_event_type ON install_events(event_type);
CREATE INDEX idx_install_events_outcome ON install_events(outcome);

-- ============================================
-- TABLA: install_settings
-- Descripción: Configuración del banner de instalación
-- ============================================

CREATE TABLE IF NOT EXISTS install_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Datos iniciales
INSERT INTO install_settings (key, value) VALUES
  ('banner_enabled', 'true'),
  ('banner_title', 'Instala Charlitron®'),
  ('banner_subtitle', 'Acceso rápido desde tu pantalla principal'),
  ('install_button_text', 'Instalar'),
  ('dismiss_days', '7'),
  ('show_instructions_button', 'true'),
  ('instructions_title', '📱 Instala la App'),
  ('instructions_step1_title', 'Toca los 3 puntos'),
  ('instructions_step1_desc', 'En la esquina superior derecha del navegador'),
  ('instructions_step2_title', 'Busca "Agregar a pantalla principal"'),
  ('instructions_step2_desc', 'O "Instalar app" dependiendo del navegador'),
  ('instructions_step3_title', '¡Listo! Abre la app desde tu pantalla principal'),
  ('instructions_step3_desc', 'Funcionará incluso sin internet'),
  ('tracking_enabled', 'true');

-- ============================================
-- POLÍTICA RLS (Row Level Security)
-- ============================================

-- install_events: solo admin puede ver
ALTER TABLE install_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_read_install_events" ON install_events
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "anyone_insert_install_events" ON install_events
  FOR INSERT
  WITH CHECK (true);

-- install_settings: public read, admin write
ALTER TABLE install_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_install_settings" ON install_settings
  FOR SELECT
  USING (true);

CREATE POLICY "admin_update_install_settings" ON install_settings
  FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "admin_insert_install_settings" ON install_settings
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
