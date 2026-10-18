/**
 * Prerender build-time de historias públicas — PILOTO controlado (Fase 0/1).
 *
 * Genera HTML estático por historia en dist/historia/<slug>/index.html con
 * meta/OG/Twitter/canonical/JSON-LD propios, para que crawlers y previews
 * sociales no dependan de JS. Vercel sirve filesystem antes que los rewrites
 * del SPA, así que estas rutas quedan estáticas sin tocar vercel.json.
 *
 * Reglas del piloto:
 * - Solo las slugs de PILOT_SLUGS (+ slugs extra por argv para probar filtros).
 * - Anon key de solo lectura. NUNCA service_role. No toca RLS ni privacidad.
 * - Filtros defensivos: se salta historias privadas, con password, expiradas
 *   o sin slug (aunque estén en la lista piloto).
 * - Nunca rompe el deploy: ante cualquier error avisa y sale 0
 *   (export PRERENDER_STRICT=1 para que falle el build en vez de avisar).
 *
 * Uso:  node scripts/prerender-stories.mjs [slug-extra ...]
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE_URL = 'https://charlitronviajerodeltiempo.com';
// Mismo fallback de marca que index.html / seoUtils.resetMetaTags (logo).
const BRAND_IMAGE =
  'https://image2url.com/r2/default/images/1774764678756-4358cc7c-d0f5-41d9-8651-20f927c83bae.png';

// Historias seleccionadas del piloto (públicas, vigentes, con portada y description).
const PILOT_SLUGS = [
  'el-alma-y-corazon-del-festival-del-desierto', // variante web WebP (~1800px)
  'restaurante-galicia-una-historia-servida-de-generacion-en-generacion', // master legacy en supabase.co
  'hotel-del-comercio-al-hotel-imperial-17745', // portada legacy externa (image2url)
];

const STRICT = process.env.PRERENDER_STRICT === '1';

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
const extraSlugs = process.argv.slice(2);
const wantedSlugs = [...new Set([...PILOT_SLUGS, ...extraSlugs])];
const select =
  'id,slug,title,description,year,category,historian_name,created_at,expires_at,isPrivate,password,thumbnail,thumbnail_thumb_url,thumbnail_web_url';
const orFilter = `or=(${wantedSlugs.map((s) => `slug.eq.${s}`).join(',')})`;
const endpoint = `${SUPABASE_URL}/rest/v1/stories?select=${select}&${orFilter}`;

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

for (const story of rows ?? []) {
  const label = story.slug || story.id;

  // Filtros defensivos (privacidad y vigencia jamás se negocian).
  if (story.isPrivate) { console.warn(`⏭️  [prerender] ${label}: privada, se omite`); skipped++; continue; }
  if (story.password) { console.warn(`⏭️  [prerender] ${label}: protegida con password, se omite`); skipped++; continue; }
  if (story.expires_at && new Date(story.expires_at) <= now) { console.warn(`⏭️  [prerender] ${label}: expirada (${story.expires_at}), se omite`); skipped++; continue; }
  if (!story.slug) { console.warn(`⏭️  [prerender] ${story.id}: sin slug, se omite`); skipped++; continue; }

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
  generated++;
}

console.log(`[prerender] Listo: ${generated} generadas, ${skipped} omitidas de ${rows?.length ?? 0} encontradas.`);
