import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Variables de entorno requeridas en Vercel:
//   SUPABASE_URL           — URL del proyecto (ej. https://xxx.supabase.co)
//   SUPABASE_SERVICE_ROLE_KEY — clave service_role (nunca exponer al cliente)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Validar input
  const { code } = (req.body ?? {}) as { code?: unknown };
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Falta el código.' });
  }
  const normalizedCode = code.trim().toUpperCase();
  if (!normalizedCode) {
    return res.status(400).json({ error: 'Código vacío.' });
  }

  // Configuración del servidor
  // SUPABASE_URL puede venir como VITE_SUPABASE_URL (Vercel lo expone también a funciones)
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[redeem-avatar-code] Missing env vars. Need: VITE_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY');
    return res.status(500).json({ error: 'Configuración del servidor incompleta.' });
  }

  // Cliente con service_role: omite RLS completamente
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  // 1. Buscar el código válido junto con su avatar
  const { data: codeRow, error: fetchError } = await adminClient
    .from('avatar_private_codes')
    .select(`
      id, uses_count, max_uses, is_active, expires_at,
      avatars!avatar_id (
        id, slug, label, description, emoji, image_url, pub_key,
        is_active, is_private
      )
    `)
    .eq('code', normalizedCode)
    .eq('is_active', true)
    .maybeSingle();

  if (fetchError) {
    console.error('[redeem-avatar-code] fetch error:', fetchError);
    return res.status(500).json({ error: 'Error de base de datos.' });
  }

  if (!codeRow) {
    return res.status(404).json({ error: 'Código inválido, ya utilizado o vencido.' });
  }

  // 2. Verificar expiración
  if (codeRow.expires_at && new Date(codeRow.expires_at) <= new Date()) {
    return res.status(404).json({ error: 'Código inválido, ya utilizado o vencido.' });
  }

  // 3. Verificar avatar disponible
  const av = (codeRow.avatars as unknown) as {
    id: string; slug: string; label: string; description: string;
    emoji: string; image_url: string; pub_key: string;
    is_active: boolean; is_private: boolean;
  } | null;

  if (!av || !av.is_private || !av.is_active || !av.pub_key) {
    return res.status(404).json({ error: 'Avatar no disponible.' });
  }

  // 4. Consumir el código (bloqueo optimista: solo actualiza si uses_count no cambió)
  const newUsesCount = codeRow.uses_count + 1;
  const { data: updated, error: updateError } = await adminClient
    .from('avatar_private_codes')
    .update({
      uses_count: newUsesCount,
      is_active: newUsesCount < codeRow.max_uses,
      last_used_at: new Date().toISOString(),
    })
    .eq('id', codeRow.id)
    .eq('uses_count', codeRow.uses_count)  // bloqueo optimista anti-concurrencia
    .eq('is_active', true)
    .select('id');

  if (updateError) {
    console.error('[redeem-avatar-code] update error:', updateError);
    return res.status(500).json({ error: 'Error al procesar el código.' });
  }

  if (!updated || updated.length === 0) {
    // Otro request lo consumió antes (race condition)
    return res.status(404).json({ error: 'Código inválido, ya utilizado o vencido.' });
  }

  // 5. Devolver datos del avatar al cliente
  return res.status(200).json({
    avatar_id: av.id,
    slug: av.slug,
    label: av.label,
    description: av.description,
    emoji: av.emoji ?? '🎭',
    image_url: av.image_url,
    pub_key: av.pub_key,
  });
}
