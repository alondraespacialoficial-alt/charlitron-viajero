/**
 * Test: el schema Article prerenderizado (enriquecido con entidades GEO)
 * no debe ser degradado por la hidratación de React.
 *
 * Reglas bajo prueba (src/seoUtils.ts):
 * 1. Si #json-ld-article tiene data-prerendered="true" y data-story-slug
 *    igual al slug actual → NO se sobrescribe.
 * 2. Si la marca corresponde a OTRA historia → se sobrescribe y se limpia
 *    la marca (comportamiento dinámico normal).
 * 3. Si no hay script previo → se crea el schema dinámico.
 */
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Stub mínimo de DOM para ejecutar seoUtils fuera del navegador.
const store = new Map();
const makeEl = () => ({
  id: '',
  type: '',
  innerHTML: '',
  dataset: {},
  setAttribute() {},
});

globalThis.document = {
  title: '',
  querySelector: () => null,
  getElementById: (id) => store.get(id) ?? null,
  createElement: () => makeEl(),
  head: { appendChild: (el) => { if (el.id) store.set(el.id, el); } },
};

const { updateMetaTags } = await import('../src/seoUtils.ts');

const STATIC_ENRICHED = JSON.stringify({
  '@type': 'Article',
  about: [{ '@type': 'Event', name: 'La Rueda del Infortunio: La Alameda' }],
  contentLocation: [{ '@type': 'Place', name: 'San Luis Potosí, México' }],
});

beforeEach(() => store.clear());

test('conserva el Article prerenderizado cuando es la MISMA historia', () => {
  const script = makeEl();
  script.id = 'json-ld-article';
  script.dataset.prerendered = 'true';
  script.dataset.storySlug = 'la-rueda-del-infortunio';
  script.innerHTML = STATIC_ENRICHED;
  store.set(script.id, script);

  updateMetaTags('La Rueda del Infortunio', 'desc', 'img', 'la-rueda-del-infortunio', 'Suceso', '2022', '2026-04-13T14:34:50+00:00');

  assert.equal(script.innerHTML, STATIC_ENRICHED); // enriquecido intacto
});

test('sobrescribe y limpia la marca cuando es OTRA historia', () => {
  const script = makeEl();
  script.id = 'json-ld-article';
  script.dataset.prerendered = 'true';
  script.dataset.storySlug = 'la-rueda-del-infortunio';
  script.innerHTML = STATIC_ENRICHED;
  store.set(script.id, script);

  updateMetaTags('Otra historia', 'desc', 'img', 'otra-historia', 'Familia', '1952', '2026-10-12T16:38:43+00:00');

  assert.notEqual(script.innerHTML, STATIC_ENRICHED);
  const parsed = JSON.parse(script.innerHTML);
  assert.equal(parsed['@type'], 'Article');
  assert.equal(parsed.datePublished, '2026-10-12T16:38:43+00:00');
  assert.equal(parsed.about, undefined); // la dinámica no inventa entidades
  assert.equal(script.dataset.prerendered, undefined);
  assert.equal(script.dataset.storySlug, undefined);
});

test('historia sin prerender genera su schema dinámico desde cero', () => {
  updateMetaTags('Historia nueva', 'desc', 'img', 'historia-nueva', undefined, undefined, '2026-01-01T00:00:00Z');

  const script = store.get('json-ld-article');
  assert.ok(script, 'debe crearse #json-ld-article');
  const parsed = JSON.parse(script.innerHTML);
  assert.equal(parsed['@type'], 'Article');
  assert.equal(parsed.datePublished, '2026-01-01T00:00:00Z');
  assert.equal(script.dataset.prerendered, undefined);
});
