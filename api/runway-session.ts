import type { VercelRequest, VercelResponse } from '@vercel/node';

// Mapa de slugs a nombres de variable de entorno
// Para agregar un nuevo avatar: añade la variable en Vercel y registrala aquí
const AVATAR_ENV_MAP: Record<string, string> = {
  jose: 'RUNWAY_AVATAR_JOSE',
  charlitron: 'RUNWAY_AVATAR_CHARLITRON',
  guia: 'RUNWAY_AVATAR_GUIA',
};

const RUNWAY_API_BASE = 'https://api.runwayml.com/v1';
// Ajustar si Runway cambia la versión de la API
const RUNWAY_API_VERSION = '2024-11-06';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Solo aceptamos POST
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Validar slug
  const { slug } = (req.body ?? {}) as { slug?: unknown };
  if (!slug || typeof slug !== 'string' || !/^[a-z0-9_-]+$/.test(slug)) {
    return res.status(400).json({ error: 'Missing or invalid slug' });
  }

  const envKey = AVATAR_ENV_MAP[slug.toLowerCase()];
  if (!envKey) {
    return res.status(404).json({ error: `Avatar "${slug}" not found` });
  }

  // Leer el character ID desde la variable de entorno correspondiente
  const characterId = process.env[envKey];
  if (!characterId) {
    console.error(`Environment variable ${envKey} is not set`);
    return res.status(500).json({ error: 'Avatar not configured on this environment' });
  }

  // Leer la API key — nunca se expone al cliente
  const apiKey = process.env.RUNWAYML_API_SECRET;
  if (!apiKey) {
    console.error('RUNWAYML_API_SECRET is not set');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    // Crear sesión de Character en Runway
    // Documentación: https://docs.runwayml.com
    const runwayRes = await fetch(`${RUNWAY_API_BASE}/characters/sessions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'X-Runway-Version': RUNWAY_API_VERSION,
      },
      body: JSON.stringify({ characterId }),
    });

    // Intentar parsear como JSON aunque sea error
    let data: unknown;
    const contentType = runwayRes.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      data = await runwayRes.json();
    } else {
      const text = await runwayRes.text();
      data = { raw: text };
    }

    if (!runwayRes.ok) {
      const errData = data as Record<string, unknown>;
      const message =
        (errData?.message as string) ??
        (errData?.error as string) ??
        (errData?.raw as string) ??
        `Runway respondió con HTTP ${runwayRes.status}`;
      console.error('Runway API error:', runwayRes.status, message);
      // Devolvemos el status real de Runway para diagnóstico
      return res.status(runwayRes.status).json({ error: message, runwayStatus: runwayRes.status });
    }

    // Devolver la respuesta de Runway al cliente (sessionUrl, token, etc.)
    return res.status(200).json(data);
  } catch (err) {
    console.error('Runway session creation failed:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
