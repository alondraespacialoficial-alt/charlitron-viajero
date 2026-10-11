import { createHmac, timingSafeEqual } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import type { VercelRequest } from '@vercel/node';

export const PUBLIC_MEMORIAL_COLUMNS = [
  'id', 'slug', 'full_name', 'family_label', 'photo_url', 'birth_date', 'death_date',
  'epitaph', 'bio_short', 'visibility', 'story_id', 'family_member_id', 'linked_memorial_id',
  'tribute_song_url', 'spotify_link', 'tribute_video_url', 'requires_approval',
  'banner_message', 'banner_active', 'created_at', 'updated_at',
].join(',');
export const PUBLIC_MEMORIAL_VIEW_COLUMNS = `${PUBLIC_MEMORIAL_COLUMNS},has_family_editor`;

export const PUBLIC_GUESTBOOK_COLUMNS = 'id, memorial_id, visitor_name, message, photo_url, likes, status, created_at';
export const PUBLIC_GESTURE_COLUMNS = 'id, memorial_id, gesture_type, visitor_name, created_at';

export interface PublicMemorialDTO {
  id: string;
  slug: string;
  full_name: string;
  family_label?: string | null;
  photo_url?: string | null;
  birth_date?: string | null;
  death_date?: string | null;
  epitaph?: string | null;
  bio_short?: string | null;
  visibility: 'public' | 'shareable' | 'private';
  story_id?: string | null;
  family_member_id?: string | null;
  linked_memorial_id?: string | null;
  tribute_song_url?: string | null;
  spotify_link?: string | null;
  tribute_video_url?: string | null;
  requires_approval: boolean;
  banner_message?: string | null;
  banner_active?: boolean;
  created_at?: string;
  updated_at?: string;
  has_family_editor?: boolean;
}

export interface PrivateMemorialDTO extends PublicMemorialDTO {
  visibility: 'private';
}

export interface AdminMemorialDTO extends PublicMemorialDTO {
  access_code?: string | null;
  client_name?: string | null;
  client_contact?: string | null;
  editor_email?: string | null;
  editor_password?: string | null;
}

export type MemorialSessionRole = 'visitor' | 'family';

export function getMemorialClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Falta la configuración de Supabase para memoriales.');
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

export function getSessionSecret(): string {
  const secret = process.env.MEMORIAL_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error('Falta la clave de firma de sesiones de memorial.');
  return secret;
}

export function toPublicMemorial(row: Record<string, any>): PublicMemorialDTO {
  const dto: PublicMemorialDTO = {
    id: row.id,
    slug: row.slug,
    full_name: row.full_name,
    visibility: row.visibility,
    requires_approval: !!row.requires_approval,
    has_family_editor: row.has_family_editor ?? !!(row.editor_email && row.editor_password),
  };
  const optionalFields = [
    'family_label', 'photo_url', 'birth_date', 'death_date', 'epitaph', 'bio_short',
    'story_id', 'family_member_id', 'linked_memorial_id', 'tribute_song_url', 'spotify_link',
    'tribute_video_url', 'banner_message', 'banner_active', 'created_at', 'updated_at',
  ] as const;
  for (const field of optionalFields) {
    if (field in row) Object.assign(dto, { [field]: row[field] });
  }
  return dto;
}

export function toAdminMemorial(row: Record<string, any>): AdminMemorialDTO {
  return {
    ...toPublicMemorial(row),
    access_code: row.access_code ?? null,
    client_name: row.client_name ?? null,
    client_contact: row.client_contact ?? null,
    editor_email: row.editor_email ?? null,
    editor_password: row.editor_password ?? null,
  };
}

export function getBody(req: VercelRequest): Record<string, any> {
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body) as Record<string, any>; } catch { return {}; }
  }
  return (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, any>;
}

function sign(payload: string): string {
  return createHmac('sha256', getSessionSecret()).update(payload).digest('base64url');
}

export function issueMemorialSession(role: MemorialSessionRole, memorialId: string): string {
  const payload = Buffer.from(JSON.stringify({ role, memorialId, expiresAt: Date.now() + 8 * 60 * 60 * 1000 })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

export function verifyMemorialSession(
  token: unknown,
  role: MemorialSessionRole,
  memorialId: string
): boolean {
  if (typeof token !== 'string') return false;
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra) return false;
  const expected = Buffer.from(sign(payload));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return false;
  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      role?: string;
      memorialId?: string;
      expiresAt?: number;
    };
    return decoded.role === role && decoded.memorialId === memorialId && Number(decoded.expiresAt) > Date.now();
  } catch {
    return false;
  }
}

export async function loadMemorialForPublic(slug: string) {
  const client = getMemorialClient();
  const fromView = await client.from('memorial_public').select(PUBLIC_MEMORIAL_VIEW_COLUMNS as any).eq('slug', slug).maybeSingle();
  if (!fromView.error && fromView.data) return { client, data: fromView.data, error: null };

  // The server-only fallback also resolves shareable links, which are not enumerable in the public view.
  const fallback = await client.from('memorials')
    .select(`${PUBLIC_MEMORIAL_COLUMNS},editor_email,editor_password`)
    .eq('slug', slug)
    .in('visibility', ['public', 'shareable'])
    .maybeSingle();
  return { client, data: fallback.data, error: fallback.error };
}

export function hasPrivateAccess(req: VercelRequest, body: Record<string, any>, memorialId: string): boolean {
  const header = req.headers.authorization || '';
  const bearer = header.startsWith('Bearer ') ? header.slice(7) : '';
  return verifyMemorialSession(body.sessionToken || bearer, 'visitor', memorialId);
}

export function hasFamilyAccess(req: VercelRequest, body: Record<string, any>, memorialId: string): boolean {
  const header = req.headers.authorization || '';
  const bearer = header.startsWith('Bearer ') ? header.slice(7) : '';
  return verifyMemorialSession(body.sessionToken || bearer, 'family', memorialId);
}
