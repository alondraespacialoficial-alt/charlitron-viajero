const WHATSAPP_BASE = 'https://wa.me/524444237092?text=';

export const EXPERIENCE_PAGES = {
  historia: {
    title: 'Historias de San Luis Potosí y memoria familiar | Charlitron®',
    description: 'Investigación histórica y relatos familiares se convierten en historias digitales sobre San Luis Potosí, sus familias, lugares y comercios, para conservar y compartir su memoria.',
    path: '',
    h1: 'Cada historia merece seguir siendo contada',
    intro: 'Charlitron es un proyecto cultural nacido en San Luis Potosí. Une investigación histórica, memoria familiar y narrativa humana para conservar y compartir historias.',
    sections: [
      {
        heading: '¿Qué es?',
        text: 'Un archivo digital que documenta historias de personas, familias, lugares y negocios desde San Luis Potosí.',
      },
      {
        heading: '¿Para quién es?',
        text: 'Para quienes quieren conocer el pasado local o compartir la memoria de su familia, negocio o comunidad.',
      },
      {
        heading: '¿Qué ofrece?',
        text: 'Según cada historia, puede integrar investigación, testimonios, fotografías, producción audiovisual y recreaciones históricas identificadas cuando corresponda.',
      },
      {
        heading: '¿Cómo funciona?',
        text: 'Cada relato se documenta y presenta en una historia digital. Explora las publicadas o contacta al equipo para proponer una.',
      },
    ],
    note: 'Cuando se utiliza inteligencia artificial en un recurso visual o audiovisual, se identifica su intervención. La IA no sustituye las fuentes, los testimonios ni el criterio histórico.',
    primaryCta: { label: 'Explorar historias', href: '#historias' },
    secondaryCta: {
      label: 'Proponer una historia',
      href: `${WHATSAPP_BASE}${encodeURIComponent('Hola Charlitron, me gustaría proponer una historia para el Viajero del Tiempo.')}`,
    },
  },
  jardin: {
    title: 'Jardín de la Memoria: homenajes digitales | Charlitron®',
    description: 'Un espacio digital para recordar y rendir homenaje, con recuerdos y recursos elegidos por cada familia. Conoce el Jardín de la Memoria de Charlitron.',
    path: '/jardin',
    h1: 'Una vida merece más que una fecha',
    intro: 'Un memorial digital es un espacio de homenaje donde una familia reúne recuerdos de una persona querida.',
    sections: [
      {
        heading: '¿Qué es?',
        text: 'Una página conmemorativa preparada con la familia para preservar y compartir recuerdos de una vida.',
      },
      {
        heading: '¿Para quién es?',
        text: 'Para familias que desean honrar a un ser querido y conservar su memoria de una manera significativa.',
      },
      {
        heading: '¿Qué ofrece?',
        text: 'Según lo que decida la familia, puede reunir fotografías, semblanza, música o video, mensajes y gestos de homenaje.',
      },
      {
        heading: '¿Cómo funciona?',
        text: 'La familia solicita información y acuerda el contenido y la visibilidad: pública, compartible por enlace o privada con código.',
      },
    ],
    note: 'Esta presentación no incluye información particular de las familias. Cada memorial conserva su propio contenido y la configuración de visibilidad elegida.',
    primaryCta: { label: 'Explorar el Jardín', href: '#jardin-busqueda' },
    secondaryCta: {
      label: 'Solicitar información',
      href: `${WHATSAPP_BASE}${encodeURIComponent('Hola Charlitron, quisiera solicitar información sobre un memorial en el Jardín de la Memoria.')}`,
    },
  },
  avatares: {
    title: 'Galería de Avatares Históricos e IA | Charlitron®',
    description: 'Explora experiencias interpretativas con personajes históricos y figuras culturales mediante inteligencia artificial. Una propuesta educativa, con transparencia sobre sus recreaciones.',
    path: '/avatares',
    h1: '¿Y si pudieras hacerle una pregunta a la historia?',
    intro: 'Una experiencia interactiva para explorar personajes históricos y figuras simbólicas a través de conversaciones interpretativas.',
    notice: 'Los avatares son recreaciones interpretativas mediante inteligencia artificial. No son las personas reales ni testimonios auténticos.',
    sections: [
      {
        heading: '¿Qué es?',
        text: 'Una experiencia educativa que acerca la historia mediante personajes representados con inteligencia artificial.',
      },
      {
        heading: '¿Para quién es?',
        text: 'Para quienes sienten curiosidad por la historia y quieren explorar personajes, épocas y contextos de otra manera.',
      },
      {
        heading: '¿Qué ofrece?',
        text: 'Permite explorar los avatares activos, buscarlos por nombre o periodo y conversar con los que estén disponibles.',
      },
      {
        heading: '¿Cómo funciona?',
        text: 'Elige un avatar disponible y sigue el mecanismo de acceso vigente; algunas experiencias requieren un código.',
      },
    ],
    note: 'Las respuestas son interpretaciones generadas con IA; no representan declaraciones literales ni contacto real con personas fallecidas. Consulta los avisos de privacidad y uso antes de participar.',
    legalLinks: [
      { label: 'Privacidad', href: '/privacidad' },
      { label: 'Aviso de Avatares IA', href: '/avatares-legal' },
    ],
    primaryCta: { label: 'Explorar la galería', href: '#avatar-periodos' },
    secondaryCta: {
      label: 'Consultar opciones de acceso',
      href: `${WHATSAPP_BASE}${encodeURIComponent('Hola Charlitron, me interesa conocer las opciones de acceso a la Galería de Avatares Históricos.')}`,
    },
  },
};

const escapeHtml = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

export function renderExperienceOverviewHtml(page) {
  const sections = page.sections.map((section, index) => `
      <article class="rounded-xl border border-sepia-800 bg-sepia-900/40 p-5 sm:p-6">
        <p class="mb-2 text-xs font-bold uppercase tracking-widest text-sepia-500">0${index + 1}</p>
        <h2 class="mb-2 font-serif text-xl text-sepia-100">${escapeHtml(section.heading)}</h2>
        <p class="text-sm leading-relaxed text-sepia-300">${escapeHtml(section.text)}</p>
      </article>`).join('');
  const notice = page.notice
    ? `<p role="note" class="mt-6 rounded-lg border border-amber-800/70 bg-amber-950/40 px-4 py-3 text-sm leading-relaxed text-amber-200">${escapeHtml(page.notice)}</p>`
    : '';

  return `
    <main class="min-h-screen bg-sepia-950 px-5 py-20 text-sepia-100 sm:px-8">
      <section class="mx-auto max-w-5xl" aria-labelledby="experience-title">
        <p class="mb-3 text-xs font-bold uppercase tracking-widest text-sepia-500">Charlitron® Viajero del Tiempo · San Luis Potosí</p>
        <h1 id="experience-title" class="max-w-4xl font-serif text-4xl leading-tight sm:text-5xl">${escapeHtml(page.h1)}</h1>
        <p class="mt-5 max-w-3xl text-base leading-relaxed text-sepia-300 sm:text-lg">${escapeHtml(page.intro)}</p>
        ${notice}
        <div class="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">${sections}
        </div>
        <p class="mt-6 max-w-4xl text-sm leading-relaxed text-sepia-400">${escapeHtml(page.note)}</p>
        ${page.legalLinks?.length ? `<nav class="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm text-sepia-300" aria-label="Avisos y privacidad">${page.legalLinks.map((link) => `<a class="underline underline-offset-4 hover:text-sepia-100" href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a>`).join('')}</nav>` : ''}
        <div class="mt-7 flex flex-col gap-3 sm:flex-row">
          <a class="inline-flex min-h-11 items-center justify-center rounded-full bg-sepia-500 px-6 py-3 text-center text-sm font-bold text-sepia-950" href="${escapeHtml(page.primaryCta.href)}">${escapeHtml(page.primaryCta.label)}</a>
          <a class="inline-flex min-h-11 items-center justify-center rounded-full border border-sepia-500 px-6 py-3 text-center text-sm font-bold text-sepia-200" href="${escapeHtml(page.secondaryCta.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(page.secondaryCta.label)}</a>
        </div>
      </section>
    </main>`;
}

export function renderExperienceDocument(template, page) {
  const canonical = `https://charlitronviajerodeltiempo.com${page.path}`;
  const webpageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: page.title,
    description: page.description,
    url: canonical,
    inLanguage: 'es-MX',
    isPartOf: { '@type': 'WebSite', name: 'Charlitron® Viajero del Tiempo', url: 'https://charlitronviajerodeltiempo.com' },
  };
  let html = template
    .replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(page.title)}</title>`)
    .replace(/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${escapeHtml(page.description)}" />`)
    .replace(/<link rel="canonical" href="[^"]*" \/>/, `<link rel="canonical" href="${canonical}" />`)
    .replace(/<meta property="og:url" content="[^"]*" \/>/, `<meta property="og:url" content="${canonical}" />`)
    .replace(/<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${escapeHtml(page.title)}" />`)
    .replace(/<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${escapeHtml(page.description)}" />`)
    .replace(/<meta name="twitter:url" content="[^"]*" \/>/, `<meta name="twitter:url" content="${canonical}" />`)
    .replace(/<meta name="twitter:title" content="[^"]*" \/>/, `<meta name="twitter:title" content="${escapeHtml(page.title)}" />`)
    .replace(/<meta name="twitter:description" content="[^"]*" \/>/, `<meta name="twitter:description" content="${escapeHtml(page.description)}" />`);

  html = html.replace('</head>', `    <script type="application/ld+json" id="json-ld-experience">${JSON.stringify(webpageSchema).replace(/<\//g, '<\\/')}</script>\n  </head>`);
  return html.replace('<div id="root"></div>', `<div id="root">${renderExperienceOverviewHtml(page)}</div>`);
}