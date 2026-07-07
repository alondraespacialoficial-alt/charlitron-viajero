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
  const baseUrl = 'https://charlitronviajerodeltiempo.com';
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
        "item": "https://charlitronviajerodeltiempo.com"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Historias",
        "item": "https://charlitronviajerodeltiempo.com#historias"
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": category || "Categoría",
        "item": `https://charlitronviajerodeltiempo.com#historias?cat=${category}`
      },
      {
        "@type": "ListItem",
        "position": 4,
        "name": title,
        "item": `https://charlitronviajerodeltiempo.com/historia/${slug}`
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
  const url = `https://charlitronviajerodeltiempo.com/historia/${slug}`;
  const text = encodeURIComponent(
    `📚 *${title}*\n\n${description || 'Mira esta historia en Charlitron®'}\n\n${url}`
  );
  return `https://wa.me/?text=${text}`;
};

/**
 * Actualiza meta tags al navegar a una sección de la app
 */
const SECTION_META: Record<string, { title: string; description: string; path: string }> = {
  galeria: {
    title: 'Galería de Fotos Restauradas | Charlitron®',
    description: 'Explora fotografías históricas de San Luis Potosí restauradas con inteligencia artificial. Imágenes del pasado recuperadas con detalle y color.',
    path: 'galeria',
  },
  tienda: {
    title: 'Tienda | Charlitron® Viajero del Tiempo',
    description: 'Productos únicos inspirados en la historia y memoria de San Luis Potosí. Recuerdos, artículos de colección y más de Charlitron®.',
    path: 'tienda',
  },
  avatares: {
    title: 'Museo de Avatares Interactivos | Charlitron®',
    description: 'Conversa con personajes históricos recreados con inteligencia artificial. Experiencias educativas e inmersivas para explorar la historia de México.',
    path: 'avatares',
  },
  cursos: {
    title: 'Cursos de Historia y Genealogía | Charlitron®',
    description: 'Aprende sobre historia, genealogía y memoria familiar con los cursos especializados de Charlitron® Viajero del Tiempo.',
    path: 'cursos',
  },
  concursos: {
    title: 'Concursos de Historia y Memoria | Charlitron®',
    description: 'Participa en concursos de historia, memoria y fotografía. Comparte tu historia y conecta con la comunidad de Charlitron®.',
    path: 'concursos',
  },
  conferencias: {
    title: 'Conferencias de Historia | Charlitron®',
    description: 'Conferencias sobre historia, patrimonio y memoria de San Luis Potosí. Reserva tu lugar y amplía tu conocimiento histórico.',
    path: 'conferencias',
  },
  mural: {
    title: 'Mural Comunitario | Charlitron®',
    description: 'El mural de la memoria comunitaria de Charlitron® Viajero del Tiempo. Historias visuales del patrimonio de San Luis Potosí.',
    path: 'mural',
  },
  colaboradores: {
    title: 'Colaboradores | Charlitron®',
    description: 'Conoce a los colaboradores, historiadores y aliados del proyecto Charlitron® Viajero del Tiempo.',
    path: 'colaboradores',
  },
  arbol: {
    title: 'Árbol Genealógico | Charlitron®',
    description: 'Explora y construye tu árbol genealógico. Descubre tus raíces familiares con la ayuda de Charlitron® Viajero del Tiempo.',
    path: 'arbol-genealogico',
  },
  investiga: {
    title: 'Investiga tu Historia | Charlitron®',
    description: 'Servicio de investigación genealógica y rescate de historia familiar. Descubre tus raíces con Charlitron® Viajero del Tiempo.',
    path: 'investiga',
  },
};

export const setSectionMetaTags = (section: string) => {
  const meta = SECTION_META[section];
  if (!meta) return;
  const url = `https://charlitronviajerodeltiempo.com/${meta.path}`;
  document.title = meta.title;
  updateOrCreateMetaTag('description', meta.description);
  updateOrCreateMetaTag('og:title', meta.title);
  updateOrCreateMetaTag('og:description', meta.description);
  updateOrCreateMetaTag('og:url', url);
  updateOrCreateMetaTag('og:type', 'website');
  const canonical = document.querySelector('link[rel="canonical"]');
  if (canonical) canonical.setAttribute('href', url);
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
  
  const baseUrl = 'https://charlitronviajerodeltiempo.com';
  updateOrCreateMetaTag('og:title', 'Charlitron® Viajero del Tiempo - El Baúl de los Recuerdos');
  updateOrCreateMetaTag(
    'og:description',
    'Rescatamos historias, revitalizamos recuerdos y reconstruimos legados con inteligencia artificial.'
  );
  updateOrCreateMetaTag('og:image', 'https://image2url.com/r2/default/images/1774764678756-4358cc7c-d0f5-41d9-8651-20f927c83bae.png');
  updateOrCreateMetaTag('og:url', baseUrl);
  updateOrCreateMetaTag('og:type', 'website');
};
