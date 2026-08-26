import type { VercelRequest, VercelResponse } from '@vercel/node';

// Variables de entorno requeridas en Vercel:
//   TELEGRAM_BOT_TOKEN — token del bot (dado por @BotFather)
//   TELEGRAM_CHAT_ID   — id del chat/canal/grupo donde llegan los avisos

interface RegistrationPayload {
  conference_title?: unknown;
  event_date?: unknown;
  folio?: unknown;
  attendee_name?: unknown;
  attendee_email?: unknown;
  attendee_phone?: unknown;
  collaborator_name?: unknown;
}

function sanitize(value: unknown, maxLen = 200): string {
  if (!value || typeof value !== 'string') return '';
  return value.trim().slice(0, maxLen);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!botToken || !chatId) {
    console.error('[notify-telegram-registration] Faltan TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID');
    return res.status(500).json({ error: 'Configuración del servidor incompleta.' });
  }

  const body = (req.body ?? {}) as RegistrationPayload;
  const conferenceTitle = sanitize(body.conference_title, 150) || 'Conferencia';
  const eventDate = sanitize(body.event_date, 50);
  const folio = sanitize(body.folio, 50) || 'N/D';
  const attendeeName = sanitize(body.attendee_name, 150);
  const attendeeEmail = sanitize(body.attendee_email, 150);
  const attendeePhone = sanitize(body.attendee_phone, 50);
  const collaboratorName = sanitize(body.collaborator_name, 150);

  if (!attendeeName) {
    return res.status(400).json({ error: 'Falta el nombre del asistente.' });
  }

  const lines = [
    '🎟️ Nuevo registro a conferencia',
    `Evento: ${conferenceTitle}`,
    eventDate ? `Fecha: ${eventDate}` : null,
    `Folio: ${folio}`,
    `Nombre: ${attendeeName}`,
    attendeeEmail ? `Correo: ${attendeeEmail}` : null,
    attendeePhone ? `Teléfono: ${attendeePhone}` : null,
    collaboratorName ? `Colaborador: ${collaboratorName}` : null,
  ].filter(Boolean);

  try {
    const telegramRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // Sin parse_mode: se envía como texto plano para evitar inyección de formato
      body: JSON.stringify({ chat_id: chatId, text: lines.join('\n') }),
    });

    if (!telegramRes.ok) {
      const errText = await telegramRes.text();
      console.error('[notify-telegram-registration] Telegram API error:', errText);
      return res.status(502).json({ error: 'No se pudo enviar la notificación.' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[notify-telegram-registration] Error de red:', err);
    return res.status(502).json({ error: 'No se pudo enviar la notificación.' });
  }
}
