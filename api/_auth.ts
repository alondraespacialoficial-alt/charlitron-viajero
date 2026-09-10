import { timingSafeEqual } from 'crypto';
import type { VercelRequest } from '@vercel/node';

/** Verifica el Bearer token contra ADMIN_PASSWORD con comparación de tiempo constante. */
export function isAuthorizedAdmin(req: VercelRequest): boolean {
  const authHeader = req.headers['authorization'] ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  const adminPassword = process.env.ADMIN_PASSWORD ?? '';

  if (!adminPassword || !token) return false;

  const tokenBuf = Buffer.from(token);
  const passBuf = Buffer.from(adminPassword);
  if (tokenBuf.length !== passBuf.length) return false;

  return timingSafeEqual(tokenBuf, passBuf);
}
