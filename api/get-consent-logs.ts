import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Variables de entorno requeridas en Vercel:
//   SUPABASE_URL (o VITE_SUPABASE_URL)
//   SUPABASE_SERVICE_ROLE_KEY

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verificar token de administrador
  const authHeader = req.headers['authorization'] ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  const adminPassword = process.env.ADMIN_PASSWORD ?? '';
  if (!adminPassword || token !== adminPassword) {
    return res.status(401).json({ error: 'No autorizado.' });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[get-consent-logs] Missing env vars.');
    return res.status(500).json({ error: 'Configuración del servidor incompleta.' });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data, error } = await adminClient
    .from('avatar_consent_logs')
    .select('id, client_name, consented_at, is_return_visit, notice_version')
    .order('consented_at', { ascending: false })
    .limit(200);

  if (error) {
    console.error('[get-consent-logs] query error:', error);
    return res.status(500).json({ error: 'Error al consultar los registros.' });
  }

  return res.status(200).json({ data });
}
