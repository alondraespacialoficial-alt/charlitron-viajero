import type { VercelRequest, VercelResponse } from '@vercel/node';
import { isAuthorizedAdmin } from './_auth.js';
import {
  getBody,
  getMemorialClient,
  PUBLIC_GESTURE_COLUMNS,
  PUBLIC_GUESTBOOK_COLUMNS,
  PUBLIC_MEMORIAL_COLUMNS,
  toAdminMemorial,
} from './_memorials.js';

const ADMIN_COLUMNS = `${PUBLIC_MEMORIAL_COLUMNS},access_code,client_name,client_contact,editor_email,editor_password`;
const send = (res: VercelResponse, status: number, body: Record<string, unknown>) => res.status(status).json(body);
const text = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const nullable = (value: unknown, max: number) => text(value, max) || null;

function memorialPayload(input: Record<string, any>) {
  const visibility = input.visibility === 'public' || input.visibility === 'shareable' ? input.visibility : 'private';
  return {
    slug: text(input.slug, 160).toLowerCase().replace(/\s+/g, '-'),
    full_name: text(input.full_name, 200),
    family_label: nullable(input.family_label, 200),
    photo_url: nullable(input.photo_url, 2048),
    birth_date: nullable(input.birth_date, 100),
    death_date: nullable(input.death_date, 100),
    epitaph: nullable(input.epitaph, 500),
    bio_short: nullable(input.bio_short, 4000),
    visibility,
    access_code: visibility === 'public' ? null : (text(input.access_code, 100).toUpperCase() || null),
    story_id: nullable(input.story_id, 100),
    family_member_id: nullable(input.family_member_id, 100),
    linked_memorial_id: nullable(input.linked_memorial_id, 100),
    tribute_song_url: nullable(input.tribute_song_url, 2048),
    spotify_link: nullable(input.spotify_link, 2048),
    tribute_video_url: nullable(input.tribute_video_url, 2048),
    requires_approval: input.requires_approval !== false,
    client_name: nullable(input.client_name, 200),
    client_contact: nullable(input.client_contact, 300),
    editor_email: nullable(input.editor_email, 320),
    editor_password: nullable(input.editor_password, 200),
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return send(res, 405, { error: 'Método no permitido.' });
  }
  if (!isAuthorizedAdmin(req)) return send(res, 401, { error: 'No autorizado.' });

  const body = getBody(req);
  const action = text(body.action, 40);
  const client = getMemorialClient();
  try {
    if (action === 'list') {
      const result = await client.from('memorials').select(ADMIN_COLUMNS).order('created_at', { ascending: false }).limit(1000);
      if (result.error) throw result.error;
      return send(res, 200, { data: (result.data || []).map(row => toAdminMemorial(row)) });
    }

    if (action === 'get') {
      const result = await client.from('memorials').select(ADMIN_COLUMNS).eq('id', text(body.id, 80)).maybeSingle();
      if (result.error) throw result.error;
      return result.data ? send(res, 200, { data: toAdminMemorial(result.data) }) : send(res, 404, { error: 'Memorial no encontrado.' });
    }

    if (action === 'search-linked') {
      const query = text(body.query, 100).replace(/[^\p{L}\p{N}\s-]/gu, ' ');
      const result = await client.from('memorials').select('id,full_name')
        .ilike('full_name', `%${query}%`).neq('id', text(body.excludeId, 80)).limit(15);
      if (result.error) throw result.error;
      return send(res, 200, { data: result.data || [] });
    }

    if (action === 'linked-name') {
      const result = await client.from('memorials').select('full_name').eq('id', text(body.id, 80)).maybeSingle();
      if (result.error) throw result.error;
      return send(res, 200, { data: result.data });
    }

    if (action === 'guestbook') {
      const result = await client.from('memorial_guestbook').select(PUBLIC_GUESTBOOK_COLUMNS)
        .eq('memorial_id', text(body.memorialId, 80)).order('created_at', { ascending: false }).limit(1000);
      if (result.error) throw result.error;
      return send(res, 200, { data: result.data || [] });
    }

    if (action === 'gestures') {
      const result = await client.from('memorial_gestures').select(PUBLIC_GESTURE_COLUMNS)
        .eq('memorial_id', text(body.memorialId, 80)).order('created_at', { ascending: false }).limit(50);
      if (result.error) throw result.error;
      return send(res, 200, { data: result.data || [] });
    }

    if (action === 'create' || action === 'update') {
      const payload = memorialPayload(body.memorial || {});
      if (!payload.full_name || !payload.slug) return send(res, 400, { error: 'Nombre y slug son obligatorios.' });
      if (payload.visibility === 'private' && !payload.access_code) return send(res, 400, { error: 'Falta el código de acceso.' });
      const result = action === 'create'
        ? await client.from('memorials').insert(payload).select(ADMIN_COLUMNS).single()
        : await client.from('memorials').update(payload).eq('id', text(body.id, 80)).select(ADMIN_COLUMNS).single();
      if (result.error) throw result.error;
      return send(res, 200, { data: toAdminMemorial(result.data) });
    }

    if (action === 'delete') {
      const result = await client.from('memorials').delete().eq('id', text(body.id, 80));
      if (result.error) throw result.error;
      return send(res, 200, { success: true });
    }

    if (action === 'moderate') {
      const status = body.status === 'approved' || body.status === 'rejected' ? body.status : null;
      if (!status) return send(res, 400, { error: 'Estado no válido.' });
      const result = await client.from('memorial_guestbook').update({ status }).eq('id', text(body.entryId, 80));
      if (result.error) throw result.error;
      return send(res, 200, { success: true });
    }

    if (action === 'delete-entry') {
      const result = await client.from('memorial_guestbook').delete().eq('id', text(body.entryId, 80));
      if (result.error) throw result.error;
      return send(res, 200, { success: true });
    }

    if (action === 'delete-gesture') {
      const result = await client.from('memorial_gestures').delete().eq('id', text(body.gestureId, 80));
      if (result.error) throw result.error;
      return send(res, 200, { success: true });
    }

    return send(res, 400, { error: 'Acción no válida.' });
  } catch (error) {
    console.error('[memorial-admin] request failed:', error);
    return send(res, 500, { error: 'No se pudo completar la operación.' });
  }
}
