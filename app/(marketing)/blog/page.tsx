import Link from 'next/link';
import { Clock, Rss } from 'lucide-react';

import { CallToAction } from '@/components/marketing/CallToAction';
import { PageHero } from '@/components/marketing/PageHero';
import { Reveal } from '@/components/marketing/Reveal';
import { Section } from '@/components/marketing/Section';

export const metadata = {
  title: 'Field notes | AI-Certificates',
  description:
    'Short, practical notes on certification workflows, template automation, mobile capture and housing compliance reporting.',
};

type Note = {
  id: string;
  title: string;
  date: string;
  readingTime: string;
  topic: string;
  intro: string;
  paragraphs: string[];
  bullets?: { heading: string; items: string[] }[];
};

const notes: Note[] = [
  {
    id: 'blank-field-detection',
    title: 'AI field detection still needs a human in the loop',
    date: '12 September 2026',
    readingTime: '4 min read',
    topic: 'Templates & AI',
    intro:
      'Automatically spotting blank fields on a scanned certificate feels like magic the first time you see it. It is not magic, and treating it as magic is how teams end up with a template that quietly writes into the wrong box.',
    paragraphs: [
      'Layout detection works on visual evidence: whitespace, ruling lines, label wording, alignment. On a clean digital PDF it is usually right. On a photographed certificate with a shadow across the bottom third, or a form that was designed with two columns of uneven height, it can be confidently wrong.',
      'The failure mode matters more than the error rate. A missed field is obvious — your report has a gap where a reading should be. A misplaced field is worse: the value lands a few millimetres off, prints over a label, or ends up in the adjacent row. Nobody notices until the customer does.',
      'So the workflow we build for is detection followed by deliberate confirmation. AI proposes the boxes, you accept, resize or delete them, and you see the result rendered with real data before the template goes live.',
    ],
    bullets: [
      {
        heading: 'A practical review routine',
        items: [
          'Render one real certificate from the template before you share it with the team.',
          'Check the fields nearest page edges, logos and stamps — that is where detection drifts.',
          'Scan the same template with a long value (a full site address) to catch overflow early.',
          'Repeat the check whenever the source PDF is replaced with a new supplier version.',
        ],
      },
    ],
  },
  {
    id: 'void-inspection-evidence',
    title: 'What a void inspection actually needs to capture',
    date: '28 August 2026',
    readingTime: '5 min read',
    topic: 'Housing',
    intro:
      'Void inspections fail for a predictable reason: the report records what the inspector remembers, not what they saw. By the time the works order is raised, the evidence is a week old and the contractor disputes it.',
    paragraphs: [
      'A useful void report is room-by-room and evidence-first. Photograph the defect, record where it is, note the action. Anything that costs money later needs a picture taken at the time, from an angle that shows both the item and its location.',
      'The second requirement is the boring one: meter readings, keys handed over, and the condition at handover date. These are the fields that get skipped on a clipboard and then block an invoice.',
      'Capture on the device you already carry, then generate the PDF from the same record. Re-keying the notes into a desktop template is exactly where the discrepancies creep in.',
    ],
    bullets: [
      {
        heading: 'Minimum evidence per room',
        items: [
          'One wide shot showing the room and its condition.',
          'Close shots of each defect, with the location written next to it.',
          'Readings on the day (gas, electric, water) where the property has them.',
          'Key handover notes and any items left behind.',
        ],
      },
    ],
  },
  {
    id: 'cost-of-retyping',
    title: 'The real cost of retyping certificates',
    date: '5 August 2026',
    readingTime: '3 min read',
    topic: 'Workflow',
    intro:
      'Nobody bills for the hour spent rebuilding a PDF. It just sits at the end of the day, unpaid, and it is the first thing that gets rushed when the diary is full.',
    paragraphs: [
      'Retyping has three costs. The obvious one is time: copying readings, addresses and customer details from notes into a document. The second is accuracy — every handoff is a chance to transpose a digit in a certificate number or miss a classification code.',
      'The third is the one that hurts most in an audit: the trail. When a report is assembled by hand, there is no clean link between the inspection record and the document that was issued. If a customer queries a result six months later, answering them means finding the paper file.',
      'A template that merges live data solves all three at once. The data is entered once, the document is generated from the record, and the issued certificate stays attached to the job it came from.',
    ],
  },
];

export default function BlogPage() {
  return (
    <>
      <PageHero
        eyebrow="Field notes"
        title="Notes on certification, templates and the work around them"
        description="Short, practical writing for the people who inspect buildings and issue the paperwork afterwards. No trend pieces, no thought leadership — just things that came up with real teams."
      >
        <p className="inline-flex items-center gap-2 text-sm text-slate-400">
          <Clock className="h-4 w-4" />
          New notes roughly every month
        </p>
      </PageHero>

      <Section tone="white">
        <div className="grid gap-12 lg:grid-cols-[14rem_1fr] lg:gap-16">
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                In this issue
              </p>
              <nav aria-label="Notes" className="mt-4 space-y-1 border-l border-slate-200 dark:border-slate-800">
                {notes.map((note) => (
                  <a
                    key={note.id}
                    href={`#${note.id}`}
                    className="-ml-px block border-l border-transparent py-1.5 pl-4 text-sm leading-6 text-slate-500 transition-colors hover:border-blue-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  >
                    {note.title}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          <div className="min-w-0 space-y-16">
            {notes.map((note) => (
              <Reveal
                as="article"
                key={note.id}
                id={note.id}
                className="scroll-mt-24 border-t border-slate-200 pt-10 first:border-t-0 first:pt-0 dark:border-slate-800"
              >
                <div className="flex flex-wrap items-center gap-3 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                    {note.topic}
                  </span>
                  <span>{note.date}</span>
                  <span aria-hidden>·</span>
                  <span>{note.readingTime}</span>
                </div>

                <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
                  {note.title}
                </h2>

                <p className="mt-4 text-base leading-8 text-slate-700 dark:text-slate-200">{note.intro}</p>

                <div className="mt-4 space-y-4 text-sm leading-7 text-slate-600 dark:text-slate-300">
                  {note.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>

                {note.bullets?.map((group) => (
                  <div
                    key={group.heading}
                    className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900/60"
                  >
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{group.heading}</p>
                    <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                      {group.items.map((item) => (
                        <li key={item} className="flex gap-3">
                          <span aria-hidden className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-blue-500" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </Reveal>
            ))}

            <Reveal className="rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900/60">
              <div className="flex gap-3">
                <Rss className="mt-0.5 h-5 w-5 flex-none text-blue-600 dark:text-blue-400" />
                <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">
                  Want these by email as they are published?{' '}
                  <Link href="/contact" className="font-medium text-blue-600 underline underline-offset-4 dark:text-blue-400">
                    Ask us to add you to the list
                  </Link>{' '}
                  and mention which certificate types you work with.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </Section>

      <CallToAction
        tone="muted"
        title="Have a workflow worth writing about?"
        description="If your team has solved something awkward in the field, we would like to hear how. The best notes here started as customer conversations."
        primaryHref="/contact"
        primaryLabel="Share your workflow"
        secondaryHref="/roadmap"
        secondaryLabel="See what we are building"
      />
    </>
  );
}
