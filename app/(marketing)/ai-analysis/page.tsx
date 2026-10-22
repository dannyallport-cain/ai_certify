import Link from 'next/link';
import { ArrowRight, ImageUp, ScanText, Sparkles } from 'lucide-react';

import ImageAnalysisCapture from '@/components/ai/ImageAnalysisCapture';
import { PageHero } from '@/components/marketing/PageHero';
import { Reveal } from '@/components/marketing/Reveal';
import { Section } from '@/components/marketing/Section';

export const metadata = {
  title: 'AI image analysis demo | AI-Certificates',
  description:
    'Upload or capture a photo to extract OCR text, observations and structured report data with AI.',
};

const steps = [
  {
    icon: ImageUp,
    title: 'Add a photo',
    description: 'Upload a certificate image or take one with your camera.',
  },
  {
    icon: ScanText,
    title: 'AI reads it',
    description: 'Text, layout and visible observations are extracted from the image.',
  },
  {
    icon: Sparkles,
    title: 'Structured output',
    description: 'Results come back as report-ready data rather than a wall of text.',
  },
];

export default function AIAnalysisPage() {
  return (
    <>
      <PageHero
        size="compact"
        eyebrow="AI image analysis"
        title="Turn a photo into usable report data"
        description="Upload an image from your device or take a photo with your camera to let AI read the content, extract text, identify observations and return structured report-ready data in one place."
      >
        <Link
          href="/features#ai-detection"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/25 px-5 text-sm font-semibold text-white transition-colors hover:border-white/50 hover:bg-white/10"
        >
          How this fits templates
          <ArrowRight className="h-4 w-4" />
        </Link>
      </PageHero>

      <Section tone="white" padding="compact">
        <div className="grid gap-4 sm:grid-cols-3">
          {steps.map((step, index) => {
            const Icon = step.icon;

            return (
              <Reveal
                key={step.title}
                delay={index * 70}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900/60"
              >
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm dark:bg-slate-950 dark:text-blue-300">
                  <Icon className="h-4 w-4" />
                </span>
                <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">{step.title}</p>
                <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{step.description}</p>
              </Reveal>
            );
          })}
        </div>
      </Section>

      <Section tone="muted">
        <div className="mx-auto w-full max-w-3xl">
          <ImageAnalysisCapture />
        </div>
      </Section>
    </>
  );
}
