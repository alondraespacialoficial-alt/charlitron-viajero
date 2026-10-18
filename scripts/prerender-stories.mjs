/**
 * Prerender build-time de TODAS las historias públicas (Fase 1 + sitemap).
 *
 * Genera HTML estático por historia en dist/historia/<slug>/index.html con
 * meta/OG/Twitter/canonical/JSON-LD propios, para que crawlers y previews
 * sociales no dependan de JS. También genera dist/sitemap.xml dinámico
 * (secciones estáticas + una URL por historia). Vercel sirve filesystem antes
 * que los rewrites del SPA, así que nada de esto requiere tocar vercel.json.
 *
 * Reglas:
 * - Anon key de solo lectura. NUNCA service_role. No toca RLS ni privacidad.
 * - Filtros defensivos (en query Y en código): se omiten historias privadas,
 *   con password, expiradas, sin slug o con slug no válido para URL.
 * - Nunca rompe el deploy: ante cualquier error avisa y sale 0
 *   (export PRERENDER_STRICT=1 para que falle el build en vez de avisar).
 *
 * Uso:  node scripts/prerender-stories.mjs            → todo el catálogo
 *       node scripts/prerender-stories.mjs <slug>...  → modo prueba (solo esas)
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE_URL = 'https://charlitronviajerodeltiempo.com';
// Mismo fallback de marca que index.html / seoUtils.resetMetaTags (logo).
const BRAND_IMAGE =
  'https://image2url.com/r2/default/images/1774764678756-4358cc7c-d0f5-41d9-8651-20f927c83bae.png';

const STRICT = process.env.PRERENDER_STRICT === '1';

// Slug URL-safe: ASCII minúsculas/dígitos/guiones, empieza con alfanumérico.
const VALID_SLUG = /^[a-z0-9][a-z0-9-]*$/;

const fail = (msg) => {
  console.error(`❌ [prerender] ${msg}`);
  if (STRICT) process.exit(1);
};

// ---------- env ----------
const loadEnvFile = (file) => {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m) continue;
    const key = m[1];
    let val = m[2].replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = val;
  }
};
loadEnvFile(join(ROOT, '.env.local'));
loadEnvFile(join(ROOT, '.env'));

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  fail('Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Se omite el prerender.');
  process.exit(0);
}

// ---------- helpers ----------
const escapeHtml = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const truncate = (s, max) => (s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s);

/** Equivalente a resolveStoryCover(story, 'web') de src/imageVariants.ts:
 *  web (~1800px) → thumb (~600px) → thumbnail legacy (master). */
const resolveCoverWeb = (story) =>
  story.thumbnail_web_url?.trim() ||
  story.thumbnail_thumb_url?.trim() ||
  story.thumbnail?.trim() ||
  undefined;

const imageMime = (url) => {
  const clean = url.split('?')[0].toLowerCase();
  if (clean.endsWith('.webp')) return 'image/webp';
  if (clean.endsWith('.png')) return 'image/png';
  if (clean.endsWith('.jpg') || clean.endsWith('.jpeg')) return 'image/jpeg';
  return 'image/png';
};

const jsonLd = (obj) => JSON.stringify(obj, null, 2).replace(/<\//g, '<\\/');

/** Reemplaza un tag por regex; avisa si el anchor no existe (template drift). */
const replaceTag = (html, re, replacement, label) => {
  if (!re.test(html)) {
    fail(`Anchor no encontrado en la plantilla: ${label}`);
    return null;
  }
  return html.replace(re, replacement);
};

// ---------- fetch (anon, solo lectura) ----------
// Sin argv: TODAS las historias con isPrivate=false (los demás filtros
// defensivos se aplican igualmente en código). Con argv: modo prueba.
const testSlugs = process.argv.slice(2);
const select =
  'id,slug,title,description,year,category,historian_name,created_at,expires_at,isPrivate,password,thumbnail,thumbnail_thumb_url,thumbnail_web_url';
const filter = testSlugs.length
  ? `or=(${testSlugs.map((s) => `slug.eq.${s}`).join(',')})`
  : 'isPrivate=eq.false&limit=1000';
const endpoint = `${SUPABASE_URL}/rest/v1/stories?select=${select}&${filter}`;

let rows;
try {
  const res = await fetch(endpoint, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  rows = await res.json();
} catch (err) {
  fail(`No se pudieron obtener las historias: ${err.message}. Se omite el prerender.`);
  process.exit(0);
}

// ---------- entidades GEO (traveler_map_points vinculados por story_id) ----------
// Solo puntos publicados y solo los campos almacenados: nunca se inventan
// entidades ni se infieren direcciones.
let pointsByStory = new Map();
const storyIds = (rows ?? []).map((r) => r.id).filter(Boolean);
if (storyIds.length) {
  try {
    const pEndpoint = `${SUPABASE_URL}/rest/v1/traveler_map_points?select=name,category,address,neighborhood,latitude,longitude,story_id,published&published=eq.true&story_id=in.(${storyIds.join(',')})`;
    const pRes = await fetch(pEndpoint, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    });
    if (!pRes.ok) throw new Error(`HTTP ${pRes.status}`);
    const points = await pRes.json();
    for (const p of points ?? []) {
      if (!pointsByStory.has(p.story_id)) pointsByStory.set(p.story_id, []);
      pointsByStory.get(p.story_id).push(p);
    }
  } catch (err) {
    console.warn(`⚠️  [prerender] traveler_map_points no disponible (${err.message}); los schemas salen sin entidades.`);
  }
}

// Ubicación general de la ciudad SOLO cuando no hay un punto más específico.
const SLP_DEFAULT_LOCATION = { '@type': 'Place', name: 'San Luis Potosí, México' };
// Mapeo conservador a schema.org (sin asumir que un comercio histórico sigue operando).
const CATEGORY_TYPE = { Lugar: 'Place', Barrio: 'Place', Comercio: 'Place', Personaje: 'Person', Suceso: 'Event', Recuerdo: 'Thing' };

const pointToEntity = (p) => {
  const entity = { '@type': CATEGORY_TYPE[p.category] || 'Thing', name: String(p.name).trim() };
  const hasAddr = !!p.address?.trim();
  const hasGeo = p.latitude != null && p.longitude != null;
  const hasBarrio = !!p.neighborhood?.trim();
  if (entity['@type'] === 'Event') {
    if (hasAddr || hasGeo || hasBarrio) {
      entity.location = { '@type': 'Place' };
      if (hasBarrio) entity.location.name = p.neighborhood.trim();
      if (hasAddr) entity.location.address = { '@type': 'PostalAddress', streetAddress: p.address.trim() };
      if (hasGeo) entity.location.geo = { '@type': 'GeoCoordinates', latitude: p.latitude, longitude: p.longitude };
    }
  } else if (entity['@type'] === 'Place') {
    if (hasAddr) entity.address = { '@type': 'PostalAddress', streetAddress: p.address.trim() };
    if (hasGeo) entity.geo = { '@type': 'GeoCoordinates', latitude: p.latitude, longitude: p.longitude };
    if (hasBarrio) entity.containedInPlace = { '@type': 'Place', name: p.neighborhood.trim() };
  }
  return entity;
};

/** contentLocation / about / mentions del Article, solo con datos reales y sin duplicados. */
const buildArticleEntities = (storyId) => {
  const points = pointsByStory.get(storyId) || [];
  const places = [];
  const about = [];
  const mentions = [];
  const seen = new Set();
  for (const p of points) {
    const entity = pointToEntity(p);
    const key = `${entity['@type']}:${entity.name.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (p.category === 'Lugar') places.push(entity);
    else if (p.category === 'Recuerdo') mentions.push(entity);
    else about.push(entity);
  }
  return {
    contentLocation: places.length ? places : [SLP_DEFAULT_LOCATION],
    ...(about.length ? { about } : {}),
    ...(mentions.length ? { mentions } : {}),
  };
};

// ---------- plantilla ----------
const templatePath = join(ROOT, 'dist', 'index.html');
if (!existsSync(templatePath)) {
  fail('No existe dist/index.html (¿corrió vite build?). Se omite el prerender.');
  process.exit(0);
}
const template = readFileSync(templatePath, 'utf8');

// ---------- generación ----------
const now = new Date();
let generated = 0;
let skipped = 0;
const generatedStories = [];

for (const story of rows ?? []) {
  const label = story.slug || story.id;

  // Filtros defensivos (privacidad y vigencia jamás se negocian).
  if (story.isPrivate) { console.warn(`⏭️  [prerender] ${label}: privada, se omite`); skipped++; continue; }
  if (story.password) { console.warn(`⏭️  [prerender] ${label}: protegida con password, se omite`); skipped++; continue; }
  if (story.expires_at && new Date(story.expires_at) <= now) { console.warn(`⏭️  [prerender] ${label}: expirada (${story.expires_at}), se omite`); skipped++; continue; }
  if (!story.slug) { console.warn(`⏭️  [prerender] ${story.id}: sin slug, se omite`); skipped++; continue; }
  if (!VALID_SLUG.test(story.slug)) { console.warn(`⏭️  [prerender] "${story.slug}": slug no válido para URL, se omite (corregir en DB)`); skipped++; continue; }

  const url = `${BASE_URL}/historia/${story.slug}`;
  const title = story.title?.trim() || 'Historia';
  const description = truncate(
    (story.description || '').trim() ||
      'Rescatamos historias, revitalizamos recuerdos y reconstruimos legados con inteligencia artificial.',
    300
  );
  const cover = resolveCoverWeb(story) || BRAND_IMAGE; // fallback de marca solo si no hay portada
  const pageTitle = `${title} | Charlitron®`;

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    image: [cover],
    datePublished: story.created_at,
    author: story.historian_name
      ? { '@type': 'Person', name: story.historian_name }
      : { '@type': 'Organization', name: 'Charlitron® Viajero del Tiempo' },
    publisher: {
      '@type': 'Organization',
      name: 'Charlitron®',
      logo: { '@type': 'ImageObject', url: BRAND_IMAGE },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    ...(story.category ? { articleSection: story.category } : {}),
    ...buildArticleEntities(story.id),
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Historias', item: `${BASE_URL}/#historias` },
      { '@type': 'ListItem', position: 3, name: title, item: url },
    ],
  };

  let html = template;
  const steps = [
    [/<title>[^<]*<\/title>/, `<title>${escapeHtml(pageTitle)}</title>`, 'title'],
    [/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${escapeHtml(description)}" />`, 'description'],
    [/<link rel="canonical" href="[^"]*" \/>/, `<link rel="canonical" href="${url}" />`, 'canonical'],
    [/<meta property="og:type" content="[^"]*" \/>/, '<meta property="og:type" content="article" />', 'og:type'],
    [/<meta property="og:url" content="[^"]*" \/>/, `<meta property="og:url" content="${url}" />`, 'og:url'],
    [/<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${escapeHtml(pageTitle)}" />`, 'og:title'],
    [/<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${escapeHtml(description)}" />`, 'og:description'],
    [/<meta property="og:image" content="[^"]*" \/>/, `<meta property="og:image" content="${cover}" />`, 'og:image'],
    [/<meta property="og:image:type" content="[^"]*" \/>/, `<meta property="og:image:type" content="${imageMime(cover)}" />`, 'og:image:type'],
    [/<meta property="og:image:alt" content="[^"]*" \/>/, `<meta property="og:image:alt" content="${escapeHtml(title)}" />`, 'og:image:alt'],
    [/<meta name="twitter:url" content="[^"]*" \/>/, `<meta name="twitter:url" content="${url}" />`, 'twitter:url'],
    [/<meta name="twitter:title" content="[^"]*" \/>/, `<meta name="twitter:title" content="${escapeHtml(pageTitle)}" />`, 'twitter:title'],
    [/<meta name="twitter:description" content="[^"]*" \/>/, `<meta name="twitter:description" content="${escapeHtml(description)}" />`, 'twitter:description'],
    [/<meta name="twitter:image" content="[^"]*" \/>/, `<meta name="twitter:image" content="${cover}" />`, 'twitter:image'],
    [/<meta name="twitter:image:alt" content="[^"]*" \/>/, `<meta name="twitter:image:alt" content="${escapeHtml(title)}" />`, 'twitter:image:alt'],
  ];

  let ok = true;
  for (const [re, replacement, stepLabel] of steps) {
    const next = replaceTag(html, re, replacement, `${story.slug} :: ${stepLabel}`);
    if (next === null) { ok = false; break; }
    html = next;
  }
  if (!ok) { skipped++; continue; }

  const injection = `
    <!-- prerendered: /historia/${escapeHtml(story.slug)} -->
    <script type="application/ld+json" id="json-ld-article">
${jsonLd(articleSchema)}
    </script>
    <script type="application/ld+json" id="json-ld-breadcrumb">
${jsonLd(breadcrumbSchema)}
    </script>
  </head>`;
  html = html.replace('</head>', injection);

  const outDir = join(ROOT, 'dist', 'historia', story.slug);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'index.html'), html);
  console.log(`✅ [prerender] /historia/${story.slug}  (og:image: ${cover === BRAND_IMAGE ? 'fallback marca' : 'portada propia'})`);
  generatedStories.push({ slug: story.slug, title, created_at: story.created_at, cover, hasOwnCover: cover !== BRAND_IMAGE });
  generated++;
}

// ---------- sitemap dinámico ----------
// Se escribe en dist/ (NO modifica public/sitemap.xml): conserva las entradas
// estáticas de secciones y agrega una <url> por historia prerenderizada, con
// lastmod=created_at e <image:image> solo cuando hay portada propia.
// En modo prueba (argv) no se toca el sitemap.
if (!testSlugs.length) try {
  const staticSitemap = readFileSync(join(ROOT, 'public', 'sitemap.xml'), 'utf8');
  const staticUrls = [...staticSitemap.matchAll(/<url>[\s\S]*?<\/url>/g)].map((m) => m[0]);
  const storyUrls = generatedStories.map(({ slug, title, created_at, cover, hasOwnCover }) => {
    const lastmod = new Date(created_at).toISOString().slice(0, 10);
    const img = hasOwnCover
      ? `\n    <image:image>\n      <image:loc>${escapeHtml(cover)}</image:loc>\n      <image:title>${escapeHtml(title)}</image:title>\n    </image:image>`
      : '';
    return `  <url>\n    <loc>${BASE_URL}/historia/${slug}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>${img}\n  </url>`;
  });
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"\n        xmlns:mobile="http://www.google.com/schemas/sitemap-mobile/1.0">\n\n${staticUrls.join('\n\n')}\n\n  <!-- Historias públicas (generado en build) -->\n${storyUrls.join('\n\n')}\n</urlset>\n`;
  writeFileSync(join(ROOT, 'dist', 'sitemap.xml'), sitemap);
  console.log(`🗺️  [prerender] sitemap.xml: ${staticUrls.length} secciones + ${storyUrls.length} historias`);
} catch (err) {
  fail(`No se pudo generar el sitemap: ${err.message}`);
}

console.log(`[prerender] Listo: ${generated} generadas, ${skipped} omitidas de ${rows?.length ?? 0} encontradas.`);
