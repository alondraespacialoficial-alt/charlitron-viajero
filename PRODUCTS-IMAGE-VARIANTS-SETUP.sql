-- Fase 4C: columnas opcionales para las variantes publicas de Productos.
-- No copia ni transforma archivos y no modifica image_url.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS image_thumbnail_url TEXT,
  ADD COLUMN IF NOT EXISTS image_web_url TEXT;

COMMENT ON COLUMN public.products.image_thumbnail_url IS
  'URL publica de la variante thumbnail. NULL indica usar image_url.';

COMMENT ON COLUMN public.products.image_web_url IS
  'URL publica de la variante web. NULL indica usar thumbnail o image_url.';

-- El master no se guarda como URL en la fila publica de products.
-- Cuando se implemente, vivira en Storage privado y se entregara como URL firmada.