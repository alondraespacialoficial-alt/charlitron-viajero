import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Variables de entorno requeridas en Vercel:
//   SUPABASE_URL (o VITE_SUPABASE_URL)
//   SUPABASE_SERVICE_ROLE_KEY

function htmlPage(message: string): string {
  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><title>Charlitron Viajero del Tiempo</title></head>
<body style="font-family: Georgia, serif; background:#fdf6e9; color:#3b2f2f; display:flex; align-items:center; justify-content:center; min-height:100vh; margin:0;">
  <div style="max-width:420px; text-align:center; padding:24px;">
    <h1 style="color:#8b5e34;">Charlitron® Viajero del Tiempo</h1>
    <p style="font-size:16px; line-height:1.5;">${message}</p>
  </div>
</body></html>`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).send(htmlPage('Método no permitido.'));
  }

  const token = typeof req.query.token === 'string' ? req.query.token : '';
  if (!token) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(400).send(htmlPage('Falta el token de baja.'));
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[unsubscribe-newsletter] Missing env vars.');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(500).send(htmlPage('Configuración del servidor incompleta.'));
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { error } = await adminClient
    .from('newsletter_subscribers')
    .update({ is_subscribed: false, unsubscribed_at: new Date().toISOString() })
    .eq('unsubscribe_token', token);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  if (error) {
    console.error('[unsubscribe-newsletter] update error:', error);
    return res.status(500).send(htmlPage('No se pudo procesar tu baja. Intenta de nuevo más tarde.'));
  }

  return res.status(200).send(htmlPage('Listo, ya no recibirás más correos de promociones. ¡Gracias por habernos acompañado! 🕰️'));
}
