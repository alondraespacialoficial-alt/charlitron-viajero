import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { EXPERIENCE_PAGES, renderExperienceDocument } from '../src/experienceContent.js';

const template = `<!doctype html><html lang="es"><head>
<title>Original</title>
<meta name="description" content="Original" />
<link rel="canonical" href="https://charlitronviajerodeltiempo.com" />
<meta property="og:url" content="https://charlitronviajerodeltiempo.com" />
<meta property="og:title" content="Original" />
<meta property="og:description" content="Original" />
<meta name="twitter:url" content="https://charlitronviajerodeltiempo.com" />
<meta name="twitter:title" content="Original" />
<meta name="twitter:description" content="Original" />
</head><body><div id="root"></div></body></html>`;

test('las tres experiencias generan HTML inicial con canonical, metadatos y estructura editorial', () => {
  for (const page of Object.values(EXPERIENCE_PAGES)) {
    const html = renderExperienceDocument(template, page);
    assert.ok(html.includes(`<title>${page.title}</title>`));
    assert.ok(html.includes(`<link rel="canonical" href="https://charlitronviajerodeltiempo.com${page.path}" />`));
    assert.ok(html.includes(`<h1 id="experience-title" class="max-w-4xl font-serif text-4xl leading-tight sm:text-5xl">${page.h1}</h1>`));
    for (const heading of ['¿Qué es?', '¿Para quién es?', '¿Qué ofrece?', '¿Cómo funciona?']) {
      assert.ok(html.includes(heading));
    }
    assert.ok(html.includes('"@type":"WebPage"'));
  }
});

test('la página del Jardín no genera rutas ni campos de memorial individual', () => {
  const html = renderExperienceDocument(template, EXPERIENCE_PAGES.jardin);
  assert.ok(html.includes('Esta presentación no incluye información particular de las familias.'));
  assert.equal(html.includes('/jardin/'), false);
  assert.equal(html.includes('full_name'), false);
  assert.equal(html.includes('access_code'), false);
});

test('la aclaración de recreación interpretativa aparece en el HTML inicial de Avatares', () => {
  const html = renderExperienceDocument(template, EXPERIENCE_PAGES.avatares);
  assert.ok(html.includes('Los avatares son recreaciones interpretativas mediante inteligencia artificial.'));
  assert.ok(html.includes('No son las personas reales ni testimonios auténticos.'));
});

test('el sitemap incluye el Jardín general y excluye memoriales individuales', () => {
  const sitemap = readFileSync(new URL('../public/sitemap.xml', import.meta.url), 'utf8');
  assert.ok(sitemap.includes('https://charlitronviajerodeltiempo.com/jardin</loc>'));
  assert.equal(sitemap.includes('/jardin/'), false);
});

test('el noindex de memoriales individuales no alcanza la presentación /jardin', () => {
  const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
  const rule = config.headers.find(({ source }) => source === '/jardin/:slug');
  assert.ok(rule, 'debe existir una regla para la ruta con slug');
  assert.ok(rule.headers.some(({ key, value }) => key === 'X-Robots-Tag' && value === 'noindex, follow'));
  assert.equal(rule.source, '/jardin/:slug');
});