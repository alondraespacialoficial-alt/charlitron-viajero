import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

// Endpoint protegido (solo admin) para enviar campañas de email marketing
// a los suscriptores del newsletter, segmentados por interés.
//
// Variables de entorno requeridas en Vercel:
//   SUPABASE_URL (o VITE_SUPABASE_URL)
//   SUPABASE_SERVICE_ROLE_KEY
//   RESEND_API_KEY
//   RESEND_FROM_EMAIL (opcional)
//   SITE_URL (opcional; usada para armar el link de baja)

const BATCH_SIZE = 100; // límite de Resend para batch.send
type Segment = 'all' | 'conference' | 'course' | 'contest';
const VALID_SEGMENTS: Segment[] = ['all', 'conference', 'course', 'contest'];

function chunk<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) result.push(items.slice(i, i + size));
  return result;
}

function buildHtml(bodyHtml: string, unsubscribeUrl: string): string {
  return `
    <div style="font-family: Georgia, serif; background:#fdf6e9; padding:24px; color:#3b2f2f;">
      ${bodyHtml}
      <p style="margin-top:24px; font-size:12px; color:#a08d78; border-top:1px solid #e6d7bd; padding-top:12px;">
        Recibiste este correo porque te suscribiste a novedades de Charlitron® Viajero del Tiempo.
        <a href="${unsubscribeUrl}" style="color:#8b5e34;">Darme de baja</a>
      </p>
    </div>
  `;
}

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

  const body = (req.body ?? {}) as { subject?: unknown; html?: unknown; segment?: unknown };
  const subject = typeof body.subject === 'string' ? body.subject.trim().slice(0, 200) : '';
  const bodyHtml = typeof body.html === 'string' ? body.html.trim() : '';
  const segment = (typeof body.segment === 'string' ? body.segment : 'all') as Segment;

  if (!subject || !bodyHtml) {
    return res.status(400).json({ error: 'Faltan el asunto o el contenido del correo.' });
  }
  if (!VALID_SEGMENTS.includes(segment)) {
    return res.status(400).json({ error: 'Segmento inválido.' });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!supabaseUrl || !serviceRoleKey || !resendApiKey) {
    console.error('[send-marketing-email] Missing env vars.');
    return res.status(500).json({ error: 'Configuración del servidor incompleta.' });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  let query = adminClient
    .from('newsletter_subscribers')
    .select('email, unsubscribe_token')
    .eq('is_subscribed', true);
  if (segment !== 'all') query = query.contains('interests', [segment]);

  const { data: subscribers, error: fetchError } = await query;
  if (fetchError) {
    console.error('[send-marketing-email] fetch error:', fetchError);
    return res.status(500).json({ error: 'Error al consultar suscriptores.' });
  }
  if (!subscribers || subscribers.length === 0) {
    return res.status(200).json({ ok: true, sent: 0 });
  }

  const resend = new Resend(resendApiKey);
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'hola@charlitronviajerodeltiempo.com';
  const from = fromEmail.includes('<') ? fromEmail : `Charlitron Viajero <${fromEmail}>`;
  const siteUrl = process.env.SITE_URL || 'https://charlitronviajerodeltiempo.com';

  const batches = chunk(subscribers, BATCH_SIZE);
  let sent = 0;
  let failed = 0;

  for (const batch of batches) {
    const payload = batch.map((sub) => ({
      from,
      to: sub.email,
      subject,
      html: buildHtml(bodyHtml, `${siteUrl}/api/unsubscribe-newsletter?token=${sub.unsubscribe_token}`),
    }));

    try {
      const { error } = await resend.batch.send(payload);
      if (error) {
        console.error('[send-marketing-email] Resend batch error:', error);
        failed += batch.length;
      } else {
        sent += batch.length;
      }
    } catch (err) {
      console.error('[send-marketing-email] Error de red en batch:', err);
      failed += batch.length;
    }
  }

  return res.status(200).json({ ok: true, sent, failed });
}
