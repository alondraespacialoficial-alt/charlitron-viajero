-- ==============================================================
-- JARDÍN DE LA MEMORIA: vínculo entre dos memoriales (ej. pareja)
-- ==============================================================
-- Agrega a memorials un campo opcional que apunta a otro memorial.
-- Solo hace falta configurarlo en uno de los dos lados: la app busca
-- el vínculo en ambas direcciones al mostrarlo. Ejecutar en el SQL
-- Editor de Supabase.

BEGIN;

ALTER TABLE public.memorials
  ADD COLUMN IF NOT EXISTS linked_memorial_id UUID REFERENCES public.memorials(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_memorials_linked_memorial ON public.memorials (linked_memorial_id);

COMMIT;
