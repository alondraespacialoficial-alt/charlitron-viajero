-- Fase 4C: columnas opcionales para las variantes publicas de Productos.
-- No copia ni transforma archivos y no modifica image_url.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS image_thumbnail_url TEXT,
  ADD COLUMN IF NOT EXISTS image_web_url TEXT;

COMMENT ON COLUMN public.products.image_thumbnail_url IS
  'URL publica de la variante thumbnail. NULL indica usar image_url.';

COMMENT ON COLUMN public.products.image_web_url IS
  'URL publica de la variante web. NULL indica usar thumbnail o image_url.';

-- Fase 4C.2 piloto: image_url conserva la URL publica del master original en `images`.
-- Master privado y URLs firmadas quedan para una fase posterior; no se cambian buckets ni politicas aqui.