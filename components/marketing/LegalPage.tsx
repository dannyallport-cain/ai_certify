import type { ReactNode } from 'react';

import { Reveal } from './Reveal';
import { PageHero } from './PageHero';
import { Section } from './Section';

export type LegalSection = {
  id: string;
  title: string;
  body: ReactNode;
};

export type LegalHighlight = {
  title: string;
  description: string;
};

type LegalPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  lastUpdated: string;
  highlights?: LegalHighlight[];
  sections: LegalSection[];
};

const bodyStyles =
  'space-y-4 text-sm leading-7 text-slate-600 dark:text-slate-300 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-6 [&_a]:font-medium [&_a]:text-blue-600 [&_a]:underline [&_a]:underline-offset-4 dark:[&_a]:text-blue-400 [&_strong]:font-semibold [&_strong]:text-slate-900 dark:[&_strong]:text-white';

/**
 * Shared document layout for the legal pages: same hero, same reading
 * rhythm, and a contents rail so long policies stay navigable.
 */
export function LegalPage({
  eyebrow,
  title,
  description,
  lastUpdated,
  highlights,
  sections,
}: LegalPageProps) {
  return (
    <>
      <PageHero
        size="compact"
        eyebrow={eyebrow}
        title={title}
        description={description}
      >
        <p className="text-sm text-slate-400">Last updated: {lastUpdated}</p>
      </PageHero>

      <Section tone="white">
        <div className="grid gap-12 lg:grid-cols-[15rem_1fr] lg:gap-16">
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                On this page
              </p>
              <nav aria-label="Contents" className="mt-4 space-y-1 border-l border-slate-200 dark:border-slate-800">
                {sections.map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className="-ml-px block border-l border-transparent py-1.5 pl-4 text-sm text-slate-500 transition-colors hover:border-blue-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  >
                    {section.title}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          <div className="min-w-0 space-y-10">
            {highlights?.length ? (
              <Reveal className="grid gap-4 sm:grid-cols-3">
                {highlights.map((highlight) => (
                  <div
                    key={highlight.title}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900/60"
                  >
                    <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                      {highlight.title}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                      {highlight.description}
                    </p>
                  </div>
                ))}
              </Reveal>
            ) : null}

            {sections.map((section) => (
              <Reveal
                as="section"
                key={section.id}
                id={section.id}
                className="scroll-mt-24 border-t border-slate-200 pt-8 first:border-t-0 first:pt-0 dark:border-slate-800"
              >
                <h2 className="text-xl font-bold text-slate-900 sm:text-2xl dark:text-white">
                  {section.title}
                </h2>
                <div className={`mt-4 ${bodyStyles}`}>{section.body}</div>
              </Reveal>
            ))}
          </div>
        </div>
      </Section>
    </>
  );
}
