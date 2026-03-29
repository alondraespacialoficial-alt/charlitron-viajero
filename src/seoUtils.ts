/**
 * Utilidades para SEO y URLs amigables
 */

/**
 * Genera un slug válido a partir de un título
 * @example "La Bodega El Pasado - 1920" → "la-bodega-el-pasado-1920"
 */
export const generateSlug = (text: string, id?: string): string => {
  if (!text) return id || 'historia';
  
  return text
    .toLowerCase()
    .trim()
    .replace(/[áàäâ]/g, 'a')
    .replace(/[éèëê]/g, 'e')
    .replace(/[íìïî]/g, 'i')
    .replace(/[óòöô]/g, 'o')
    .replace(/[úùüû]/g, 'u')
    .replace(/[ñ]/g, 'n')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100);
};

/**
 * Actualiza los meta tags dinámicamente (Open Graph, Twitter, etc)
 */
export const updateMetaTags = (
  title: string,
  description: string,
  image: string,
  slug: string,
  category?: string,
  year?: string
) => {
  const baseUrl = 'https://charlitronviajerdeltiempo.com';
  const url = `${baseUrl}/historia/${slug}`;
  
  // Actualizar título de la página
  document.title = `${title} | Charlitron®`;
  
  // Meta tags generales
  updateOrCreateMetaTag('description', description);
  updateOrCreateMetaTag('og:title', title);
  updateOrCreateMetaTag('og:description', description);
  updateOrCreateMetaTag('og:image', image);
  updateOrCreateMetaTag('og:image:width', '1200');
  updateOrCreateMetaTag('og:image:height', '630');
  updateOrCreateMetaTag('og:url', url);
  updateOrCreateMetaTag('og:type', 'article');
  
  // Twitter Card
  updateOrCreateMetaTag('twitter:title', title);
  updateOrCreateMetaTag('twitter:description', description);
  updateOrCreateMetaTag('twitter:image', image);
  
  // Canonical URL
  const canonical = document.querySelector('link[rel="canonical"]');
  if (canonical) {
    canonical.setAttribute('href', url);
  } else {
    const link = document.createElement('link');
    link.rel = 'canonical';
    link.href = url;
    document.head.appendChild(link);
  }
  
  // Breadcrumb Schema (JSON-LD)
  updateBreadcrumbSchema(title, slug, category);
  
  // Article Schema (JSON-LD)
  updateArticleSchema(title, description, image, slug, category, year);
};

/**
 * Crea o actualiza un meta tag
 */
const updateOrCreateMetaTag = (
  property: string,
  content: string,
  isProperty = true
) => {
  const attr = isProperty ? 'property' : 'name';
  let tag = document.querySelector(`meta[${attr}="${property}"]`) as HTMLMetaElement;
  
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attr, property);
    document.head.appendChild(tag);
  }
  
  tag.setAttribute('content', content);
};

/**
 * Actualiza Breadcrumb Schema para navegación en Google
 */
const updateBreadcrumbSchema = (title: string, slug: string, category?: string) => {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Inicio",
        "item": "https://charlitronviajerdeltiempo.com"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Historias",
        "item": "https://charlitronviajerdeltiempo.com#historias"
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": category || "Categoría",
        "item": `https://charlitronviajerdeltiempo.com#historias?cat=${category}`
      },
      {
        "@type": "ListItem",
        "position": 4,
        "name": title,
        "item": `https://charlitronviajerdeltiempo.com/historia/${slug}`
      }
    ]
  };
  
  updateJsonLdSchema('breadcrumb', schema);
};

/**
 * Actualiza Article Schema para mejor indexación
 */
const updateArticleSchema = (
  title: string,
  description: string,
  image: string,
  slug: string,
  category?: string,
  year?: string
) => {
  const schema = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "headline": title,
    "description": description,
    "image": {
      "@type": "ImageObject",
      "url": image,
      "width": 1200,
      "height": 630
    },
    "datePublished": new Date().toISOString(),
    "author": {
      "@type": "Organization",
      "name": "Charlitron® Viajero del Tiempo"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Charlitron®",
      "logo": {
        "@type": "ImageObject",
        "url": "https://image2url.com/r2/default/images/1774764678756-4358cc7c-d0f5-41d9-8651-20f927c83bae.png"
      }
    },
    "articleSection": category,
    "keywords": [title, "Charlitron", "recuerdos", "historia", category].filter(Boolean)
  };
  
  if (year) {
    (schema as any)["dateCreated"] = `${year}-01-01`;
  }
  
  updateJsonLdSchema('article', schema);
};

/**
 * Actualiza o crea un script JSON-LD
 */
const updateJsonLdSchema = (id: string, schema: object) => {
  let script = document.getElementById(`json-ld-${id}`) as HTMLScriptElement;
  
  if (!script) {
    script = document.createElement('script');
    script.id = `json-ld-${id}`;
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }
  
  script.innerHTML = JSON.stringify(schema);
};

/**
 * Genera URL compartible para WhatsApp con preview
 */
export const generateShareUrl = (
  title: string,
  slug: string,
  description?: string
): string => {
  const url = `https://charlitronviajerdeltiempo.com/historia/${slug}`;
  const text = encodeURIComponent(
    `📚 *${title}*\n\n${description || 'Mira esta historia en Charlitron®'}\n\n${url}`
  );
  return `https://wa.me/?text=${text}`;
};

/**
 * Restaura los meta tags a los valores generales
 */
export const resetMetaTags = () => {
  document.title = 'Charlitron® Viajero del Tiempo - El Baúl de los Recuerdos';
  updateOrCreateMetaTag(
    'description',
    'Charlitron® Viajero del Tiempo: Rescatamos historias, revitalizamos recuerdos y reconstruimos legados con inteligencia artificial y narrativa emocional.'
  );
  
  const baseUrl = 'https://charlitronviajerdeltiempo.com';
  updateOrCreateMetaTag('og:title', 'Charlitron® Viajero del Tiempo - El Baúl de los Recuerdos');
  updateOrCreateMetaTag(
    'og:description',
    'Rescatamos historias, revitalizamos recuerdos y reconstruimos legados con inteligencia artificial.'
  );
  updateOrCreateMetaTag('og:image', 'https://image2url.com/r2/default/images/1774764678756-4358cc7c-d0f5-41d9-8651-20f927c83bae.png');
  updateOrCreateMetaTag('og:url', baseUrl);
  updateOrCreateMetaTag('og:type', 'website');
};
