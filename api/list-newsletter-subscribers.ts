import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Endpoint protegido (solo admin) para listar suscriptores del newsletter
// y ver conteos por segmento de interés.
//
// Variables de entorno requeridas en Vercel:
//   SUPABASE_URL (o VITE_SUPABASE_URL)
//   SUPABASE_SERVICE_ROLE_KEY

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers['authorization'] ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  const adminPassword = process.env.ADMIN_PASSWORD ?? '';
  if (!adminPassword || token !== adminPassword) {
    return res.status(401).json({ error: 'No autorizado.' });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[list-newsletter-subscribers] Missing env vars.');
    return res.status(500).json({ error: 'Configuración del servidor incompleta.' });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data, error } = await adminClient
    .from('newsletter_subscribers')
    .select('id, email, name, interests, is_subscribed, created_at')
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) {
    console.error('[list-newsletter-subscribers] query error:', error);
    return res.status(500).json({ error: 'Error al consultar suscriptores.' });
  }

  const subscribed = (data || []).filter((s) => s.is_subscribed);
  const counts = {
    all: subscribed.length,
    conference: subscribed.filter((s) => s.interests?.includes('conference')).length,
    course: subscribed.filter((s) => s.interests?.includes('course')).length,
    contest: subscribed.filter((s) => s.interests?.includes('contest')).length,
  };

  return res.status(200).json({ data, counts });
}
