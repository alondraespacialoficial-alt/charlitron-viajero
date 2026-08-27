import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';

// Variables de entorno requeridas en Vercel:
//   RESEND_API_KEY    — clave de API de Resend
//   RESEND_FROM_EMAIL — remitente verificado (opcional; usa el default de abajo)

interface WelcomePayload {
  email?: unknown;
  name?: unknown;
  context?: unknown; // 'conference' | 'course'
}

function sanitize(value: unknown, maxLen = 200): string {
  if (!value || typeof value !== 'string') return '';
  return value.trim().slice(0, maxLen);
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function buildHtml(name: string, context: 'conference' | 'course'): string {
  const intro = context === 'course'
    ? 'Ya quedó registrada tu inscripción al curso. En cuanto se confirme tu pago, tu acceso quedará habilitado.'
    : 'Ya quedó registrado tu boleto para la conferencia. Guarda tu folio, lo vas a necesitar para confirmar tu pago.';

  return `
    <div style="font-family: Georgia, serif; background:#fdf6e9; padding:24px; color:#3b2f2f;">
      <h1 style="color:#8b5e34; margin-bottom:8px;">¡Hola, ${name}! 🕰️</h1>
      <p style="font-size:16px; line-height:1.5;">
        Bienvenido a <strong>Charlitron® Viajero del Tiempo</strong>.
      </p>
      <p style="font-size:16px; line-height:1.5;">${intro}</p>
      <p style="font-size:16px; line-height:1.5;">
        Si tienes dudas, escríbenos por WhatsApp y con gusto te apoyamos.
      </p>
      <p style="margin-top:24px; font-size:14px; color:#7a6a58;">
        — El equipo de Charlitron Viajero del Tiempo
      </p>
      <p style="margin-top:16px; font-size:12px; color:#a08d78; border-top:1px solid #e6d7bd; padding-top:12px;">
        Este es un correo automático, por favor no respondas a este mensaje. Si necesitas ayuda, contáctanos por WhatsApp.
      </p>
    </div>
  `;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('[send-welcome-email] Falta RESEND_API_KEY');
    return res.status(500).json({ error: 'Configuración del servidor incompleta.' });
  }

  const body = (req.body ?? {}) as WelcomePayload;
  const email = sanitize(body.email, 150).toLowerCase();
  const name = sanitize(body.name, 150) || 'viajero';
  const context: 'conference' | 'course' = sanitize(body.context, 20) === 'course' ? 'course' : 'conference';

  if (!email || !isValidEmail(email) || email === 'sin-correo@reserva.local') {
    return res.status(400).json({ error: 'Correo inválido.' });
  }

  const resend = new Resend(apiKey);
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'hola@charlitronviajerodeltiempo.com';
  // Si la variable trae solo la dirección (sin "Nombre <correo>"), le agregamos el nombre de marca
  const from = fromEmail.includes('<') ? fromEmail : `Charlitron Viajero <${fromEmail}>`;
  const subject = context === 'course' ? '¡Tu inscripción al curso está lista! 📚' : '¡Tu boleto está confirmado! 🎟️';

  try {
    const { error } = await resend.emails.send({
      from,
      to: email,
      subject,
      html: buildHtml(name, context),
    });

    if (error) {
      console.error('[send-welcome-email] Resend error:', error);
      return res.status(502).json({ error: 'No se pudo enviar el correo.' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[send-welcome-email] Error de red:', err);
    return res.status(502).json({ error: 'No se pudo enviar el correo.' });
  }
}
