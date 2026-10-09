import { timingSafeEqual } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  getBody,
  getMemorialClient,
  hasFamilyAccess,
  issueMemorialSession,
  PUBLIC_GUESTBOOK_COLUMNS,
  toPublicMemorial,
} from './_memorials.js';

const send = (res: VercelResponse, status: number, body: Record<string, unknown>) => res.status(status).json(body);
const text = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) : '';

function matchesSecret(input: unknown, expected: unknown): boolean {
  if (typeof input !== 'string' || typeof expected !== 'string' || !expected) return false;
  const left = Buffer.from(input.trim());
  const right = Buffer.from(expected.trim());
  return left.length === right.length && timingSafeEqual(left, right);
}

async function getFamilyMemorial(memorialId: string) {
  return getMemorialClient().from('memorials')
    .select('id,slug,full_name,family_label,photo_url,birth_date,death_date,epitaph,bio_short,visibility,story_id,family_member_id,linked_memorial_id,tribute_song_url,spotify_link,tribute_video_url,requires_approval,banner_message,banner_active,created_at,updated_at,editor_email,editor_password')
    .eq('id', memorialId)
    .maybeSingle();
}

export async function handleMemorialFamily(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return send(res, 405, { error: 'Método no permitido.' });
  }

  const body = getBody(req);
  const action = text(body.action, 30);
  try {
    const client = getMemorialClient();
    if (action === 'login') {
      const slug = text(body.slug, 160);
      const result = await client.from('memorials')
        .select('id,slug,editor_email,editor_password')
        .eq('slug', slug)
        .maybeSingle();
      if (result.error) throw result.error;
      const row = result.data;
      if (!row || !matchesSecret(body.email?.toString().toLowerCase(), row.editor_email?.toLowerCase()) || !matchesSecret(body.password, row.editor_password)) {
        return send(res, 401, { error: 'Correo o contraseña incorrectos.' });
      }
      const sessionToken = issueMemorialSession('family', row.id);
      const memorial = await getFamilyMemorial(row.id);
      if (memorial.error) throw memorial.error;
      if (!memorial.data) return send(res, 404, { error: 'Memorial no encontrado.' });
      return send(res, 200, { sessionToken, memorial: toPublicMemorial(memorial.data) });
    }

    const memorialId = text(body.memorialId, 80);
    if (!memorialId || !hasFamilyAccess(req, body, memorialId)) return send(res, 401, { error: 'Sesión familiar no válida.' });

    if (action === 'load') {
      const [memorial, guestbook] = await Promise.all([
        getFamilyMemorial(memorialId),
        client.from('memorial_guestbook').select(PUBLIC_GUESTBOOK_COLUMNS)
          .eq('memorial_id', memorialId).order('created_at', { ascending: false }).limit(500),
      ]);
      if (memorial.error) throw memorial.error;
      if (guestbook.error) throw guestbook.error;
      if (!memorial.data) return send(res, 404, { error: 'Memorial no encontrado.' });
      return send(res, 200, { memorial: toPublicMemorial(memorial.data), guestbook: guestbook.data || [] });
    }

    if (action === 'profile') {
      const patch = {
        full_name: text(body.full_name, 200),
        birth_date: text(body.birth_date, 100) || null,
        death_date: text(body.death_date, 100) || null,
        epitaph: text(body.epitaph, 500) || null,
        photo_url: text(body.photo_url, 2048) || null,
      };
      if (!patch.full_name) return send(res, 400, { error: 'El nombre es obligatorio.' });
      const result = await client.from('memorials').update(patch).eq('id', memorialId).select('id').maybeSingle();
      if (result.error) throw result.error;
      return send(res, 200, { data: patch });
    }

    if (action === 'banner') {
      const patch = {
        banner_message: text(body.banner_message, 1000) || null,
        banner_active: body.banner_active === true,
      };
      const result = await client.from('memorials').update(patch).eq('id', memorialId).select('id').maybeSingle();
      if (result.error) throw result.error;
      return send(res, 200, { data: patch });
    }

    if (action === 'moderate' || action === 'delete-entry') {
      const entryId = text(body.entryId, 80);
      const belongs = await client.from('memorial_guestbook').select('id')
        .eq('id', entryId).eq('memorial_id', memorialId).maybeSingle();
      if (belongs.error) throw belongs.error;
      if (!belongs.data) return send(res, 404, { error: 'Recuerdo no encontrado.' });
      if (action === 'moderate') {
        const status = body.status === 'approved' || body.status === 'rejected' ? body.status : null;
        if (!status) return send(res, 400, { error: 'Estado no válido.' });
        const result = await client.from('memorial_guestbook').update({ status }).eq('id', entryId).eq('memorial_id', memorialId);
        if (result.error) throw result.error;
        return send(res, 200, { success: true });
      }
      const result = await client.from('memorial_guestbook').delete().eq('id', entryId).eq('memorial_id', memorialId);
      if (result.error) throw result.error;
      return send(res, 200, { success: true });
    }

    return send(res, 400, { error: 'Acción no válida.' });
  } catch (error) {
    console.error('[memorial-family] request failed:', error);
    return send(res, 500, { error: 'No se pudo completar la operación.' });
  }
}
