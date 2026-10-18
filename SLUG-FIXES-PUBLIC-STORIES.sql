-- ============================================================
-- FIX DE SLUGS — historias públicas (aprobado 2026-10-18)
-- Actualiza EXCLUSIVAMENTE la columna `slug` por `id`.
-- No toca títulos, contenido, privacidad ni expiración.
-- Ejecutar en: Supabase Dashboard → SQL Editor (rol postgres).
-- ============================================================

BEGIN;

UPDATE stories SET slug = 'mercado-colon'
  WHERE id = 'a29a5047-dcf2-4086-9479-eef8e75e276a';

UPDATE stories SET slug = 'el-dia-en-que-el-ferrocarril-entro-a-san-luis-potosi'
  WHERE id = '0aa3c220-b055-4b5e-818c-43efc8475aae';

UPDATE stories SET slug = 'ahi-vienen-los-villistas-la-huida-del-cabus-amarillo-hacia-san-luis'
  WHERE id = '5cc02ba0-c3b9-4db2-8fde-ad0779a1d931';

UPDATE stories SET slug = 'la-rueda-del-infortunio-la-noche-que-la-alameda-se-quedo-en-silencio'
  WHERE id = 'ea227c11-c12b-4b4c-8f1f-e89a542dd804';

UPDATE stories SET slug = 'perpetuo-socorro-el-templo-que-levanto-una-nueva-cara-de-tequis'
  WHERE id = '5ecb5d8b-7336-4d4c-840f-3d74077c8db9';

UPDATE stories SET slug = '1975-el-dia-que-san-luis-no-exploto-gracias-a-un-hombre-que-no-huyo'
  WHERE id = 'cf6dbcdd-aa66-4268-a1a5-1eed67c1bacf';

UPDATE stories SET slug = 'antonio-nava-y-maria-del-carmen-lo-que-no-se-ve-tambien-sostiene-una-historia'
  WHERE id = '039d716c-2101-432e-820a-fa64d80f15c5';

-- Verificación: deben aparecer exactamente estas 7 filas con los slugs nuevos.
-- Si algo no cuadra: ROLLBACK en vez de COMMIT.
SELECT id, title, slug FROM stories WHERE id IN (
  'a29a5047-dcf2-4086-9479-eef8e75e276a',
  '0aa3c220-b055-4b5e-818c-43efc8475aae',
  '5cc02ba0-c3b9-4db2-8fde-ad0779a1d931',
  'ea227c11-c12b-4b4c-8f1f-e89a542dd804',
  '5ecb5d8b-7336-4d4c-840f-3d74077c8db9',
  'cf6dbcdd-aa66-4268-a1a5-1eed67c1bacf',
  '039d716c-2101-432e-820a-fa64d80f15c5'
);

COMMIT;
