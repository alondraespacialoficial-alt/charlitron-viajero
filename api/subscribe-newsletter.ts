import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Variables de entorno requeridas en Vercel:
//   SUPABASE_URL (o VITE_SUPABASE_URL)
//   SUPABASE_SERVICE_ROLE_KEY

type Interest = 'conference' | 'course' | 'contest';
const VALID_INTERESTS: Interest[] = ['conference', 'course', 'contest'];

function sanitize(value: unknown, maxLen = 150): string {
  if (!value || typeof value !== 'string') return '';
  return value.trim().slice(0, maxLen);
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = (req.body ?? {}) as { email?: unknown; name?: unknown; interest?: unknown };
  const email = sanitize(body.email, 150).toLowerCase();
  const name = sanitize(body.name, 150) || null;
  const interest = sanitize(body.interest, 20) as Interest;

  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ error: 'Correo inválido.' });
  }
  if (!VALID_INTERESTS.includes(interest)) {
    return res.status(400).json({ error: 'Interés inválido.' });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[subscribe-newsletter] Missing env vars.');
    return res.status(500).json({ error: 'Configuración del servidor incompleta.' });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data: existing, error: fetchError } = await adminClient
    .from('newsletter_subscribers')
    .select('id, interests')
    .eq('email', email)
    .maybeSingle();

  if (fetchError) {
    console.error('[subscribe-newsletter] fetch error:', fetchError);
    return res.status(500).json({ error: 'Error al guardar la suscripción.' });
  }

  if (existing) {
    const mergedInterests = Array.from(new Set([...(existing.interests || []), interest]));
    const { error: updateError } = await adminClient
      .from('newsletter_subscribers')
      .update({ interests: mergedInterests, is_subscribed: true, name: name ?? undefined })
      .eq('id', existing.id);
    if (updateError) {
      console.error('[subscribe-newsletter] update error:', updateError);
      return res.status(500).json({ error: 'Error al guardar la suscripción.' });
    }
    return res.status(200).json({ ok: true });
  }

  const { error: insertError } = await adminClient
    .from('newsletter_subscribers')
    .insert([{ email, name, interests: [interest], source: interest }]);

  if (insertError) {
    console.error('[subscribe-newsletter] insert error:', insertError);
    return res.status(500).json({ error: 'Error al guardar la suscripción.' });
  }

  return res.status(200).json({ ok: true });
}
