import type { VercelRequest, VercelResponse } from '@vercel/node';

const parseCoordinate = (value: string | string[] | undefined): number | null => {
  const rawValue = Array.isArray(value) ? value[0] : value;
  if (!rawValue || !/^\d+$/.test(rawValue)) return null;
  const coordinate = Number(rawValue);
  return Number.isSafeInteger(coordinate) ? coordinate : null;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const zoom = parseCoordinate(req.query.z);
  const x = parseCoordinate(req.query.x);
  const y = parseCoordinate(req.query.y);
  if (zoom === null || x === null || y === null || zoom > 20 || x >= 2 ** zoom || y >= 2 ** zoom) {
    return res.status(400).json({ error: 'Invalid tile coordinates' });
  }

  const apiKey = process.env.CARTO_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'Map tiles are not configured' });
  }

  const tileUrl = new URL(`https://basemaps.cartocdn.com/rastertiles/voyager/${zoom}/${x}/${y}.png`);
  tileUrl.searchParams.set('key', apiKey);

  try {
    const tileResponse = await fetch(tileUrl);
    const contentType = tileResponse.headers.get('content-type') || '';
    if (!tileResponse.ok || !contentType.startsWith('image/')) {
      console.error('CARTO tile request failed:', tileResponse.status);
      return res.status(tileResponse.status >= 400 ? tileResponse.status : 502).json({ error: 'Map provider unavailable' });
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.status(200).send(Buffer.from(await tileResponse.arrayBuffer()));
  } catch (error) {
    console.error('CARTO tile proxy failed:', error);
    return res.status(502).json({ error: 'Map provider unavailable' });
  }
}