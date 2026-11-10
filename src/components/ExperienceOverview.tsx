import React from 'react';

interface ExperienceOverviewProps {
  page: {
    h1: string;
    path: string;
    intro: string;
    sections: { heading: string; text: string }[];
    notice?: string;
    note: string;
    legalLinks?: { label: string; href: string }[];
    primaryCta: { label: string; href: string };
    secondaryCta: { label: string; href: string };
  };
}

export const ExperienceOverview: React.FC<ExperienceOverviewProps> = ({ page }) => (
  <section className="bg-sepia-950/60 px-5 py-16 text-sepia-100 backdrop-blur-sm sm:px-8 md:py-20" aria-labelledby="experience-title">
    <div className="mx-auto max-w-5xl">
      <p className="mb-3 text-xs font-bold uppercase tracking-widest text-sepia-500">Charlitron® Viajero del Tiempo · San Luis Potosí</p>
      {page.path === ''
        ? <h2 id="experience-title" className="max-w-4xl font-serif text-4xl leading-tight sm:text-5xl">{page.h1}</h2>
        : <h1 id="experience-title" className="max-w-4xl font-serif text-4xl leading-tight sm:text-5xl">{page.h1}</h1>}
      <p className="mt-5 max-w-3xl text-base leading-relaxed text-sepia-300 sm:text-lg">{page.intro}</p>
      {page.notice && (
        <p role="note" className="mt-6 rounded-lg border border-amber-800/70 bg-amber-950/40 px-4 py-3 text-sm leading-relaxed text-amber-200">
          {page.notice}
        </p>
      )}
      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        {page.sections.map((section, index) => (
          <article key={section.heading} className="rounded-xl border border-sepia-800 bg-sepia-900/40 p-5 sm:p-6">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-sepia-500">0{index + 1}</p>
            <h2 className="mb-2 font-serif text-xl text-sepia-100">{section.heading}</h2>
            <p className="text-sm leading-relaxed text-sepia-300">{section.text}</p>
          </article>
        ))}
      </div>
      <p className="mt-6 max-w-4xl text-sm leading-relaxed text-sepia-400">{page.note}</p>
      {page.legalLinks?.length ? (
        <nav className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm text-sepia-300" aria-label="Avisos y privacidad">
          {page.legalLinks.map(link => (
            <a key={link.href} className="underline underline-offset-4 hover:text-sepia-100" href={link.href}>{link.label}</a>
          ))}
        </nav>
      ) : null}
      <div className="mt-7 flex flex-col gap-3 sm:flex-row">
        <a className="inline-flex min-h-11 items-center justify-center rounded-full bg-sepia-500 px-6 py-3 text-center text-sm font-bold text-sepia-950" href={page.primaryCta.href}>
          {page.primaryCta.label}
        </a>
        <a className="inline-flex min-h-11 items-center justify-center rounded-full border border-sepia-500 px-6 py-3 text-center text-sm font-bold text-sepia-200" href={page.secondaryCta.href} target="_blank" rel="noopener noreferrer">
          {page.secondaryCta.label}
        </a>
      </div>
    </div>
  </section>
);
