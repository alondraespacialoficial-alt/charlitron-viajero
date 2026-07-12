-- ============================================================
-- URLs externas controlables desde el Panel de Administración
-- Ejecuta este SQL en Supabase → SQL Editor
-- Solo inserta si la clave NO existe ya (ON CONFLICT DO NOTHING)
-- ============================================================

INSERT INTO site_settings (key, value) VALUES
  ('logo_url',             'https://image2url.com/r2/default/images/1774244334117-f0974987-8590-4271-a1af-4957fc21a8cc.png'),
  ('biography_photo_url',  'https://image2url.com/r2/default/images/1774207717060-c5974088-18bf-4a0f-956b-67625c091acb.png'),
  ('platforms_banner_url', 'https://image2url.com/r2/default/images/1775456732330-72e615ee-61fa-4811-8409-a452b2ec805f.png'),
  ('book1_cover_url',      'https://image2url.com/r2/default/images/1775196639063-785f29e7-3933-4b4f-b083-48efed064b4e.jpg'),
  ('book1_url',            'https://www.amazon.com.mx/stores/author/B0FKY392PJ'),
  ('book2_cover_url',      'https://image2url.com/r2/default/images/1775197036814-cd9d796f-b4c4-4036-be6f-db2de668141f.jpg'),
  ('book2_url',            'https://www.amazon.com.mx/Mapa-del-%C3%89xito-Real-invisibles/dp/B0FQ32CKS5/ref=tmm_pap_swatch_0'),
  ('amazon_author_url',    'https://www.amazon.com.mx/stores/author/B0FKY392PJ')
ON CONFLICT (key) DO NOTHING;
