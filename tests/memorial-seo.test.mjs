import assert from 'node:assert/strict';
import { test } from 'node:test';

const metas = new Map();
const canonical = {
  href: '',
  setAttribute(name, value) { this[name] = value; },
};

globalThis.document = {
  title: '',
  querySelector(selector) {
    if (selector === 'link[rel="canonical"]') return canonical;
    return metas.get(selector) || null;
  },
  createElement(tagName) {
    return {
      tagName,
      attributes: {},
      dataset: {},
      setAttribute(name, value) { this.attributes[name] = value; },
    };
  },
  head: {
    appendChild(element) {
      const attributes = element.attributes;
      const key = attributes.property ? 'property' : 'name';
      metas.set(`meta[${key}="${attributes[key]}"]`, element);
    },
  },
};
globalThis.window = { location: { pathname: '/jardin/memorial-privado' } };

const { setSectionMetaTags } = await import('../src/seoUtils.ts');

test('la ruta de memorial usa metadatos generales noindex y /jardin vuelve a indexarse', () => {
  setSectionMetaTags('jardin');
  assert.equal(document.title, 'Jardín de la Memoria: homenajes digitales | Charlitron®');
  assert.equal(metas.get('meta[name="robots"]').attributes.content, 'noindex, follow');
  assert.equal(canonical.href, 'https://charlitronviajerodeltiempo.com/jardin');
  assert.equal(metas.get('meta[property="og:description"]').attributes.content.includes('memorial-privado'), false);

  window.location.pathname = '/jardin';
  setSectionMetaTags('jardin');
  assert.equal(metas.get('meta[name="robots"]').attributes.content, 'index, follow');
});
