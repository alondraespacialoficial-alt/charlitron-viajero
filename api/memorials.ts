import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  getBody,
  getMemorialClient,
  hasPrivateAccess,
  issueMemorialSession,
  loadMemorialForPublic,
  PUBLIC_GESTURE_COLUMNS,
  PUBLIC_GUESTBOOK_COLUMNS,
  PUBLIC_MEMORIAL_COLUMNS,
  PUBLIC_MEMORIAL_VIEW_COLUMNS,
  toPublicMemorial,
  verifyMemorialSession,
} from './_memorials.js';
import { timingSafeEqual } from 'node:crypto';

const send = (res: VercelResponse, status: number, body: Record<string, unknown>) => res.status(status).json(body);
const cleanText = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const validGestureTypes = new Set(['flower_rose', 'flower_lily', 'flower_sunflower', 'flower_daisy', 'candle']);

async function getPrivateRow(slug: string): Promise<{ data: Record<string, any> | null; error: any }> {
  const result = await getMemorialClient().from('memorials')
    .select(`${PUBLIC_MEMORIAL_COLUMNS},access_code,editor_email,editor_password` as any)
    .eq('slug', slug)
    .maybeSingle();
  return result as unknown as { data: Record<string, any> | null; error: any };
}

async function getMemorialRowById(id: string) {
  return getMemorialClient().from('memorials')
    .select('id,slug,visibility,requires_approval')
    .eq('id', id)
    .maybeSingle();
}

async function getMemorialBundle(slug: string, sessionToken?: unknown) {
  const loaded = await loadMemorialForPublic(slug);
  if (loaded.error) throw loaded.error;
  let row = loaded.data as Record<string, any> | null;
  let isPrivate = false;

  if (!row) {
    const hidden = await loaded.client.from('memorials').select('id,visibility').eq('slug', slug).maybeSingle();
    if (hidden.error) throw hidden.error;
    if (!hidden.data || hidden.data.visibility !== 'private') return { notFound: true as const };
    isPrivate = true;
    if (!sessionToken || !((await import('./_memorials.js')).verifyMemorialSession(sessionToken, 'visitor', hidden.data.id))) {
      return { requiresCode: true as const };
    }
    const privateResult = await getPrivateRow(slug);
    if (privateResult.error) throw privateResult.error;
    row = privateResult.data;
    if (!row || row.visibility !== 'private') return { notFound: true as const };
  }

  const memorial = toPublicMemorial(row);
  const client = loaded.client;
  let [guestbookResult, gestureResult]: [any, any] = await Promise.all([
    isPrivate
      ? client.from('memorial_guestbook').select(PUBLIC_GUESTBOOK_COLUMNS).eq('memorial_id', memorial.id).eq('status', 'approved').order('created_at', { ascending: false }).limit(30)
      : client.from('memorial_guestbook_public').select(PUBLIC_GUESTBOOK_COLUMNS).eq('memorial_id', memorial.id).order('created_at', { ascending: false }).limit(30),
    isPrivate
      ? client.from('memorial_gestures').select(PUBLIC_GESTURE_COLUMNS).eq('memorial_id', memorial.id).order('created_at', { ascending: false }).limit(500)
      : client.from('memorial_gestures_public').select(PUBLIC_GESTURE_COLUMNS).eq('memorial_id', memorial.id).order('created_at', { ascending: false }).limit(500),
  ]);
  if (!isPrivate && (guestbookResult.error || !guestbookResult.data?.length)) {
    guestbookResult = await client.from('memorial_guestbook').select(PUBLIC_GUESTBOOK_COLUMNS)
      .eq('memorial_id', memorial.id).eq('status', 'approved').order('created_at', { ascending: false }).limit(30);
  }
  if (!isPrivate && (gestureResult.error || !gestureResult.data?.length)) {
    gestureResult = await client.from('memorial_gestures').select(PUBLIC_GESTURE_COLUMNS)
      .eq('memorial_id', memorial.id).order('created_at', { ascending: false }).limit(500);
  }
  if (guestbookResult.error) throw guestbookResult.error;
  if (gestureResult.error) throw gestureResult.error;

  let linkedFamilyMember = null;
  if (memorial.family_member_id) {
    const result = await client.from('family_members')
      .select('name, relationship, photo_url, birth_date, death_date, bio')
      .eq('id', memorial.family_member_id)
      .maybeSingle();
    linkedFamilyMember = result.data;
  }

  let linkedMemorial = null;
  const reverseLink = await client.from('memorial_public')
    .select('slug,full_name,photo_url')
    .eq('linked_memorial_id', memorial.id)
    .neq('id', memorial.id)
    .maybeSingle();
  if (!reverseLink.error) linkedMemorial = reverseLink.data;
  if (reverseLink.error || !linkedMemorial) {
    const fallback = await client.from('memorials').select('slug,full_name,photo_url')
      .eq('linked_memorial_id', memorial.id).neq('id', memorial.id)
      .in('visibility', ['public', 'shareable']).maybeSingle();
    linkedMemorial = fallback.data;
  }
  if (!linkedMemorial && memorial.linked_memorial_id) {
    const linked = await client.from('memorial_public')
      .select('slug,full_name,photo_url')
      .eq('id', memorial.linked_memorial_id)
      .maybeSingle();
    linkedMemorial = linked.data;
    if (linked.error || !linkedMemorial) {
      const fallback = await client.from('memorials').select('slug,full_name,photo_url')
        .eq('id', memorial.linked_memorial_id).in('visibility', ['public', 'shareable']).maybeSingle();
      linkedMemorial = fallback.data;
    }
  }

  return {
    memorial,
    guestbook: guestbookResult.data || [],
    gestures: gestureResult.data || [],
    linkedFamilyMember,
    linkedMemorial,
  };
}

function codeMatches(input: unknown, expected: unknown): boolean {
  if (typeof input !== 'string' || typeof expected !== 'string' || !expected) return false;
  const left = Buffer.from(input.trim().toUpperCase());
  const right = Buffer.from(expected.trim().toUpperCase());
  return left.length === right.length && timingSafeEqual(left, right);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return send(res, 405, { error: 'Método no permitido.' });
  }

  const body = getBody(req);
  const action = cleanText(body.action, 30);
  try {
    if (action === 'search') {
      const client = getMemorialClient();
      const query = cleanText(body.query, 100).replace(/[^\p{L}\p{N}\s-]/gu, ' ');
      let request = client.from('memorial_public').select(PUBLIC_MEMORIAL_VIEW_COLUMNS as any).eq('visibility', 'public');
      if (query) request = request.or(`full_name.ilike.%${query}%,family_label.ilike.%${query}%`);
      let result: any = await request.order('full_name').limit(30);
      if (result.error) {
        let fallback = client.from('memorials')
          .select(`${PUBLIC_MEMORIAL_COLUMNS},editor_email,editor_password` as any)
          .eq('visibility', 'public');
        if (query) fallback = fallback.or(`full_name.ilike.%${query}%,family_label.ilike.%${query}%`);
        result = await fallback.order('full_name').limit(30);
      }
      if (result.error) throw result.error;
      return send(res, 200, { data: (result.data || []).map((row: Record<string, any>) => toPublicMemorial(row)) });
    }

    if (action === 'detail') {
      const slug = cleanText(body.slug, 160);
      if (!slug) return send(res, 400, { error: 'Falta el slug.' });
      const result = await getMemorialBundle(slug, body.sessionToken);
      return send(res, 200, result);
    }

    if (action === 'unlock') {
      const slug = cleanText(body.slug, 160);
      const result = await getPrivateRow(slug);
      if (result.error) throw result.error;
      const row = result.data;
      if (!row || row.visibility !== 'private' || !codeMatches(body.code, row.access_code)) {
        return send(res, 401, { error: 'Código incorrecto o memorial no disponible.' });
      }
      const sessionToken = issueMemorialSession('visitor', row.id);
      const bundle = await getMemorialBundle(slug, sessionToken);
      return send(res, 200, { ...bundle, sessionToken });
    }

    if (action === 'gesture') {
      const memorialId = cleanText(body.memorialId, 80);
      const gestureType = cleanText(body.gestureType, 40);
      if (!memorialId || !validGestureTypes.has(gestureType)) return send(res, 400, { error: 'Homenaje no válido.' });
      const client = getMemorialClient();
      const found = await getMemorialRowById(memorialId);
      if (found.error) throw found.error;
      if (!found.data || (found.data.visibility === 'private' && !hasPrivateAccess(req, body, memorialId))) {
        return send(res, 403, { error: 'No autorizado.' });
      }
      const result = await client.from('memorial_gestures').insert({
        memorial_id: memorialId,
        gesture_type: gestureType,
        visitor_name: cleanText(body.visitorName, 100) || null,
      }).select(PUBLIC_GESTURE_COLUMNS).single();
      if (result.error) throw result.error;
      return send(res, 200, { data: result.data });
    }

    if (action === 'guestbook') {
      const memorialId = cleanText(body.memorialId, 80);
      const visitorName = cleanText(body.visitorName, 120);
      const message = cleanText(body.message, 4000);
      if (!memorialId || !visitorName || !message) return send(res, 400, { error: 'Completa nombre y recuerdo.' });
      const client = getMemorialClient();
      const found = await client.from('memorials')
        .select('id,visibility,requires_approval')
        .eq('id', memorialId)
        .maybeSingle();
      if (found.error) throw found.error;
      if (!found.data || (found.data.visibility === 'private' && !hasPrivateAccess(req, body, memorialId))) {
        return send(res, 403, { error: 'No autorizado.' });
      }
      const status = found.data.requires_approval ? 'pending' : 'approved';
      const photoUrl = typeof body.photoUrl === 'string' && body.photoUrl.length < 2048 ? body.photoUrl : null;
      const result = await client.from('memorial_guestbook').insert({
        memorial_id: memorialId,
        visitor_name: visitorName,
        message,
        photo_url: photoUrl,
        status,
      }).select(PUBLIC_GUESTBOOK_COLUMNS).single();
      if (result.error) throw result.error;
      return send(res, 200, { data: status === 'approved' ? result.data : null, pending: status === 'pending' });
    }

    if (action === 'like') {
      const entryId = cleanText(body.entryId, 80);
      const client = getMemorialClient();
      const entry = await client.from('memorial_guestbook')
        .select('id,memorial_id,likes,status')
        .eq('id', entryId)
        .maybeSingle();
      if (entry.error) throw entry.error;
      if (!entry.data || entry.data.status !== 'approved') return send(res, 404, { error: 'Recuerdo no encontrado.' });
      const memorial = await getMemorialRowById(entry.data.memorial_id);
      if (memorial.error) throw memorial.error;
      if (!memorial.data || (memorial.data.visibility === 'private' && !hasPrivateAccess(req, body, memorial.data.id))) {
        return send(res, 403, { error: 'No autorizado.' });
      }
      const likes = (entry.data.likes || 0) + 1;
      const result = await client.from('memorial_guestbook').update({ likes }).eq('id', entryId).select('id,likes').single();
      if (result.error) throw result.error;
      return send(res, 200, { data: result.data });
    }

    return send(res, 400, { error: 'Acción no válida.' });
  } catch (error) {
    console.error('[memorials] request failed:', error);
    return send(res, 500, { error: 'No se pudo completar la operación.' });
  }
}
