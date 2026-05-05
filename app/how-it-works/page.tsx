import Link from 'next/link';
import Image from 'next/image';
import type { ReactNode } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  FileText,
  Layers,
  MousePointer2,
  Smartphone,
  Sparkles,
  Stamp,
  Wand2,
} from 'lucide-react';
import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Footer';
import { Button } from '@/components/ui/button';

const steps = [
  {
    step: '01',
    title: 'Scan or photograph a paper certificate',
    description:
      'Start with the certificate, report, or floorplan your team already uses. Upload the file, take a photo, or scan a paper copy so the platform can read the layout and turn it into a digital template.',
    badge: 'Paper certificate capture',
    icon: FileText,
    accent: 'from-blue-500 to-cyan-400',
    card: 'bg-blue-50 dark:bg-blue-950/40',
  },
  {
    step: '02',
    title: 'Place, move, and resize fields visually',
    description:
      'Use a visual editor to move logos, reposition labels, and reshape the layout until every element sits exactly where it should.',
    badge: 'Drag, resize, align',
    icon: Layers,
    accent: 'from-cyan-500 to-teal-400',
    card: 'bg-cyan-50 dark:bg-cyan-950/40',
  },
  {
    step: '03',
    title: 'Capture real data on mobile',
    description:
      'Send work to the field, scan with a mobile device, and collect real observations, photos, and measurements directly on site.',
    badge: 'Field evidence capture',
    icon: Smartphone,
    accent: 'from-purple-500 to-fuchsia-400',
    card: 'bg-purple-50 dark:bg-purple-950/40',
  },
  {
    step: '04',
    title: 'Generate certified results',
    description:
      'Merge job, customer, company, and inspection data into your template to create polished reports and certification outputs instantly.',
    badge: 'Branded output',
    icon: Wand2,
    accent: 'from-emerald-500 to-green-400',
    card: 'bg-emerald-50 dark:bg-emerald-950/40',
  },
];

const workflowStages = [
  {
    label: 'Capture',
    detail: 'Scan or photograph a paper certificate',
  },
  {
    label: 'Map',
    detail: 'Convert the source into editable fields',
  },
  {
    label: 'Check',
    detail: 'Review field data on mobile',
  },
  {
    label: 'Export',
    detail: 'Generate certified results',
  },
];

function WorkflowPanel({
  title,
  subtitle,
  children,
  className = '',
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 ${className}`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white via-transparent to-slate-100 dark:from-slate-900 dark:via-transparent dark:to-slate-950" />
      <div className="relative p-6 md:p-8">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            {subtitle}
          </p>
          <h3 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white md:text-3xl">
            {title}
          </h3>
        </div>
        {children}
      </div>
    </div>
  );
}

function WorkflowTimeline() {
  return (
    <div className="mt-12 rounded-3xl border border-white/10 bg-white/5 p-4 shadow-2xl backdrop-blur">
      <div className="grid gap-4 md:grid-cols-4">
        {workflowStages.map((stage, index) => (
          <div
            key={stage.label}
            className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-left shadow-lg"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  index === 0 ? 'bg-cyan-400 animate-pulse-slow shadow-[0_0_0_6px_rgba(34,211,238,0.12)]' : 'bg-slate-700'
                }`}
              />
            </div>
            <p className="mt-3 text-base font-semibold text-white">{stage.label}</p>
            <p className="mt-1 text-sm leading-relaxed text-slate-300">{stage.detail}</p>
            <div className="mt-4 h-1 rounded-full bg-slate-800">
              <div
                className={`h-full rounded-full ${
                  index === 0
                    ? 'w-1/2 bg-gradient-to-r from-blue-400 to-cyan-400'
                    : 'w-full bg-slate-700/70'
                }`}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TemplateOperationShowcase() {
  return (
    <div className="grid gap-3 xl:grid-cols-3">
      <div className="rounded-[1.25rem] border border-blue-200 bg-blue-50 p-3 dark:border-blue-500/20 dark:bg-blue-500/10">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-blue-700 dark:text-blue-200">
            Move logo to header
          </span>
          <span className="rounded-full bg-white/80 px-2 py-1 text-[11px] font-semibold text-blue-700">
            header
          </span>
        </div>
        <div className="relative mt-3 min-h-[92px] overflow-hidden rounded-2xl bg-slate-950 p-3">
          <div className="absolute left-3 top-3 h-8 w-8 rounded-xl bg-blue-600 shadow-lg animate-logo-rise" />
          <div className="absolute left-14 top-4 h-3 w-28 rounded-full bg-slate-700" />
          <div className="absolute right-3 top-3 flex items-center gap-2 rounded-full bg-slate-900 px-2 py-1 text-[11px] text-cyan-200">
            <MousePointer2 className="h-3.5 w-3.5" />
            drag
          </div>
        </div>
      </div>

      <div className="rounded-[1.25rem] border border-cyan-200 bg-cyan-50 p-3 dark:border-cyan-500/20 dark:bg-cyan-500/10">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-cyan-700 dark:text-cyan-200">
            Resize signature area
          </span>
          <span className="rounded-full bg-white/80 px-2 py-1 text-[11px] font-semibold text-cyan-700">
            resize
          </span>
        </div>
        <div className="relative mt-3 min-h-[92px] overflow-hidden rounded-2xl bg-slate-950 p-3">
          <div className="absolute left-4 top-4 h-8 w-16 rounded-xl bg-white/10 ring-1 ring-white/10" />
          <div className="absolute left-4 top-20 h-4 w-40 rounded-full bg-slate-700/70" />
          <div className="absolute left-4 right-4 bottom-4 flex items-center justify-between">
            <div className="h-2 w-20 rounded-full bg-slate-700/80" />
            <div className="h-2 w-10 rounded-full bg-slate-700/80" />
          </div>
          <div className="absolute left-4 right-4 top-10 h-3 rounded-full bg-cyan-400/70 shadow-[0_0_25px_rgba(34,211,238,0.35)] animate-signature-expand" />
        </div>
      </div>

      <div className="rounded-[1.25rem] border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-500/20 dark:bg-emerald-500/10">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-200">
            Align fields to the grid
          </span>
          <span className="rounded-full bg-white/80 px-2 py-1 text-[11px] font-semibold text-emerald-700">
            grid snap
          </span>
        </div>
        <div className="relative mt-3 min-h-[92px] overflow-hidden rounded-2xl bg-slate-950 p-3">
          <div className="absolute inset-3 rounded-xl border border-dashed border-slate-700 bg-[linear-gradient(to_right,rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.06)_1px,transparent_1px)] bg-[size:14px_14px]" />
          <div className="absolute left-4 top-4 h-10 w-24 rounded-2xl border border-dashed border-cyan-300 bg-slate-900 px-2 py-1 shadow-sm animate-grid-snap dark:border-cyan-500/30">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-300">
              field
            </p>
            <p className="mt-1 text-[11px] font-medium text-white">Job ref</p>
          </div>
          <div
            className="absolute left-[52%] top-[46%] h-10 w-28 rounded-2xl border border-dashed border-emerald-300 bg-slate-900 px-2 py-1 shadow-sm animate-grid-snap dark:border-emerald-500/30"
            style={{ animationDelay: '420ms' }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-300">
              field
            </p>
            <p className="mt-1 text-[11px] font-medium text-white">Customer</p>
          </div>
          <div className="absolute bottom-3 right-3 h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_0_6px_rgba(34,211,238,0.12)] animate-pulse-slow" />
        </div>
      </div>
    </div>
  );
}

function HeroWorkflowPreview() {
  return (
    <div className="mx-auto mt-10 max-w-5xl rounded-[2rem] border border-white/10 bg-white/5 p-4 shadow-2xl backdrop-blur">
      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[1.5rem] border border-slate-700 bg-slate-950/90 p-4 text-left">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Template editor
              </p>
              <h4 className="mt-2 text-lg font-semibold text-white">Drag fields into place</h4>
            </div>
            <div className="rounded-full bg-cyan-500/20 px-3 py-1 text-xs font-semibold text-cyan-200">
              live
            </div>
          </div>

          <div className="relative mt-4 min-h-[240px] overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950 p-4">
            <div className="absolute left-4 top-4 h-10 w-10 rounded-xl bg-blue-600 shadow-lg" />
            <div className="absolute left-16 top-5 h-3 w-28 rounded-full bg-slate-700" />

            <div className="absolute left-8 top-24 h-12 w-28 rounded-2xl border border-dashed border-cyan-300 bg-slate-900 px-3 py-2 shadow-sm animate-field-drag dark:border-cyan-500/30">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-300">
                Field
              </p>
              <p className="mt-1 text-xs font-medium text-white">Job reference</p>
            </div>

            <div
              className="absolute left-[52%] top-[48%] h-12 w-36 rounded-2xl border border-dashed border-emerald-300 bg-slate-900 px-3 py-2 shadow-sm animate-field-drag dark:border-emerald-500/30"
              style={{ animationDelay: '420ms' }}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-300">
                Field
              </p>
              <p className="mt-1 text-xs font-medium text-white">Customer name</p>
            </div>

            <div
              className="absolute left-[68%] top-[22%] flex items-center gap-2 rounded-full bg-slate-900 px-3 py-2 text-white shadow-xl animate-field-drag"
              style={{ animationDelay: '180ms' }}
            >
              <MousePointer2 className="h-4 w-4 text-cyan-300" />
              <span className="text-xs font-semibold">Dragging field</span>
            </div>

            <div
              className="absolute bottom-20 left-6 h-12 w-40 rounded-2xl border border-dashed border-blue-300 bg-slate-900 px-3 py-2 shadow-sm animate-field-drag dark:border-blue-500/30"
              style={{ animationDelay: '760ms' }}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-300">
                Field
              </p>
              <p className="mt-1 text-xs font-medium text-white">Inspection date</p>
            </div>

            <div className="absolute bottom-4 left-4 right-4 rounded-2xl bg-slate-950 px-4 py-3 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  Rearranging template
                </span>
                <span className="text-xs font-semibold text-cyan-300">snap to grid</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-emerald-400 animate-travel-bar" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4">
          <TemplateOperationShowcase />

          <div className="rounded-[1.5rem] bg-slate-950 p-4 text-white shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Template progress
              </span>
              <span className="rounded-full bg-cyan-500/20 px-2.5 py-1 text-xs font-semibold text-cyan-200">
                50%
              </span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-cyan-400 to-teal-400" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CaptureCertificateMockup() {
  return (
    <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
      <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-50 p-4 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <div className="absolute inset-0 bg-gradient-to-br from-white via-slate-50 to-slate-200 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900" />
        <div className="relative flex h-full min-h-[420px] flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-sm font-bold text-white shadow-lg">
                AC
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Source document</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  Paper certificate
                </p>
              </div>
            </div>
            <div className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
              scanned
            </div>
          </div>

          <div className="relative flex-1 overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-4 shadow-inner dark:border-slate-800 dark:bg-slate-950">
            <div className="absolute inset-0 bg-gradient-to-b from-white via-white to-slate-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950" />
        <div className="relative flex h-full flex-col gap-4">
          <div className="absolute left-4 right-4 top-28 h-1 rounded-full bg-cyan-400/80 shadow-[0_0_35px_rgba(34,211,238,0.45)] animate-scan-line" />
          <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  certificate mock-up
                </div>
                <div className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700 dark:border-cyan-500/20 dark:bg-cyan-500/10 dark:text-cyan-300">
                  layout detected
                </div>
              </div>

              <div className="rounded-[1.6rem] border border-slate-200 bg-white p-4 shadow-lg dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="h-4 w-28 rounded-full bg-slate-200 dark:bg-slate-700" />
                    <div className="h-8 w-52 rounded-2xl bg-blue-600/10 dark:bg-blue-400/10" />
                  </div>
                  <div className="h-12 w-12 rounded-2xl bg-blue-600/15 ring-1 ring-blue-400/25" />
                </div>

                <div className="mt-5 grid gap-3">
                  <div className="rounded-2xl border border-dashed border-blue-300 bg-blue-50/80 px-4 py-3 dark:border-blue-500/30 dark:bg-blue-500/10">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                        Company logo
                      </span>
                      <span className="rounded-full bg-blue-600/10 px-2.5 py-1 text-[11px] font-semibold text-blue-700 dark:text-blue-300">
                        mapped
                      </span>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-dashed border-cyan-300 bg-cyan-50/80 px-4 py-3 dark:border-cyan-500/30 dark:bg-cyan-500/10">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-cyan-700 dark:text-cyan-300">
                        Inspection date
                      </span>
                      <span className="rounded-full bg-cyan-600/10 px-2.5 py-1 text-[11px] font-semibold text-cyan-700 dark:text-cyan-300">
                        mapped
                      </span>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-dashed border-emerald-300 bg-emerald-50/80 px-4 py-3 dark:border-emerald-500/30 dark:bg-emerald-500/10">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                        Result summary
                      </span>
                      <span className="rounded-full bg-emerald-600/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                        ready
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-3">
                  <div className="h-3 w-3/4 rounded-full bg-slate-200 dark:bg-slate-700" />
                  <div className="h-3 w-2/3 rounded-full bg-slate-200 dark:bg-slate-700" />
                  <div className="h-3 w-5/6 rounded-full bg-slate-200 dark:bg-slate-700" />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-950 px-4 py-3 text-white shadow-xl">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Capture operations
              </span>
              <span className="text-xs font-semibold text-cyan-300">reading layout</span>
            </div>
            <div className="mt-3 grid gap-3">
              {[
                'Read source certificate',
                'Detect logo and headings',
                'Extract key fields',
                'Prepare editable template',
              ].map((item, index) => (
                <div
                  key={item}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium ${
                    index === 0 ? 'bg-blue-500/15 text-white' : 'bg-white/5 text-slate-300'
                  }`}
                >
                  <CheckCircle2
                    className={`h-4 w-4 ${index === 0 ? 'text-cyan-300 animate-pulse-slow' : 'text-slate-500'}`}
                  />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <p className="text-sm font-semibold text-slate-500">What the system is doing</p>
          <div className="mt-3 space-y-3">
            {[
              'Reading the page structure',
              'Finding brand elements',
              'Locating certificate fields',
              'Turning the paper copy into a template',
            ].map((item, itemIndex) => (
              <div
                key={item}
                className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-3 dark:bg-slate-900"
              >
                <div
                  className={`h-3 w-3 rounded-full ${
                    itemIndex === 0 ? 'bg-cyan-500' : 'bg-slate-300 dark:bg-slate-600'
                  }`}
                />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {item}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-950 p-4 text-white shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-[0.2em] text-slate-400">
              Capture progress
            </span>
            <span className="rounded-full bg-cyan-500/20 px-2.5 py-1 text-xs font-semibold text-cyan-200">
              25%
            </span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-1/4 rounded-full bg-gradient-to-r from-blue-400 to-cyan-400" />
          </div>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/40">
          <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">
            Operation-focused capture
          </p>
          <p className="mt-2 text-sm text-blue-700/80 dark:text-blue-200/80">
            The page now shows reading, detecting, and structuring the source certificate.
          </p>
        </div>
      </div>
    </div>
  );
}

function TemplateEditorMockup() {
  return (
    <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
      <div className="rounded-[2rem] border border-slate-200 bg-slate-950 p-4 shadow-2xl dark:border-slate-800">
        <div className="relative overflow-hidden rounded-[2rem] bg-white p-4 shadow-xl dark:bg-slate-900">
          <div className="absolute inset-0 bg-gradient-to-br from-white via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900" />
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Layout editor</p>
              <h4 className="text-lg font-semibold text-slate-900 dark:text-white">
                Before and after template
              </h4>
            </div>
            <div className="rounded-full bg-cyan-500/20 px-3 py-1 text-xs font-semibold text-cyan-200">
              mapped
            </div>
          </div>

          <div className="relative mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-[1.6rem] border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Before</p>
              <div className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                <div className="flex items-center justify-between">
                  <div className="h-10 w-10 rounded-xl bg-slate-200 dark:bg-slate-700" />
                  <div className="h-3 w-20 rounded-full bg-slate-200 dark:bg-slate-700" />
                </div>
                <div className="mt-4 space-y-2">
                  <div className="h-3 w-3/4 rounded-full bg-slate-200 dark:bg-slate-700" />
                  <div className="h-3 w-1/2 rounded-full bg-slate-200 dark:bg-slate-700" />
                  <div className="h-16 rounded-2xl bg-slate-100 dark:bg-slate-800" />
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-[1.6rem] border border-cyan-200 bg-cyan-50 p-4 dark:border-cyan-500/20 dark:bg-cyan-500/10">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-50 via-white/20 to-transparent dark:from-cyan-500/10 dark:via-transparent dark:to-transparent" />
              <div className="relative z-10">
                <p className="text-xs uppercase tracking-[0.2em] text-cyan-700 dark:text-cyan-300">
                  After
                </p>
                <div className="mt-3 rounded-2xl border border-cyan-200 bg-white p-3 shadow-sm dark:border-cyan-500/20 dark:bg-slate-900">
                  <div className="relative min-h-[220px] overflow-hidden rounded-xl border border-cyan-100 bg-gradient-to-b from-white to-cyan-50/60 dark:border-cyan-500/10 dark:from-slate-900 dark:to-slate-950">
                    <div className="absolute left-4 top-4 h-10 w-10 rounded-xl bg-blue-600 text-white shadow-lg" />
                    <div className="absolute left-16 top-5 h-3 w-24 rounded-full bg-cyan-200 dark:bg-cyan-400/30" />

                    <div className="absolute left-5 top-20 h-12 w-28 rounded-2xl border border-dashed border-cyan-300 bg-white px-3 py-2 shadow-sm animate-field-drag dark:border-cyan-500/30 dark:bg-slate-900">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-300">
                        Field
                      </p>
                      <p className="mt-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                        Job reference
                      </p>
                    </div>

                    <div
                      className="absolute left-[52%] top-[46%] h-12 w-36 rounded-2xl border border-dashed border-emerald-300 bg-white px-3 py-2 shadow-sm animate-field-drag dark:border-emerald-500/30 dark:bg-slate-900"
                      style={{ animationDelay: '420ms' }}
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
                        Field
                      </p>
                      <p className="mt-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                        Customer name
                      </p>
                    </div>

                    <div
                      className="absolute left-[68%] top-[22%] flex items-center gap-2 rounded-full bg-slate-950 px-3 py-2 text-white shadow-xl animate-field-drag"
                      style={{ animationDelay: '180ms' }}
                    >
                      <MousePointer2 className="h-4 w-4 text-cyan-300" />
                      <span className="text-xs font-semibold">Dragging field</span>
                    </div>

                    <div
                      className="absolute bottom-20 left-6 h-12 w-40 rounded-2xl border border-dashed border-blue-300 bg-white px-3 py-2 shadow-sm animate-field-drag dark:border-blue-500/30 dark:bg-slate-900"
                      style={{ animationDelay: '760ms' }}
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-700 dark:text-blue-300">
                        Field
                      </p>
                      <p className="mt-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                        Inspection date
                      </p>
                    </div>

                    <div className="absolute bottom-4 left-4 right-4 rounded-2xl bg-slate-950 px-4 py-3 text-white shadow-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-xs uppercase tracking-[0.2em] text-slate-400">
                          Rearranging template
                        </span>
                        <span className="text-xs font-semibold text-cyan-300">snap to grid</span>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-emerald-400 animate-travel-bar" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-800">
            <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-emerald-400 animate-travel-bar" />
          </div>

          <div className="mt-4 rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 dark:border-slate-800 dark:from-slate-950 dark:to-slate-900">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              <span>layout operations</span>
              <span>align + apply branding</span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-3">
              {['Move logo to header', 'Resize signature area', 'Align fields to grid'].map(
                (item, itemIndex) => (
                  <div
                    key={item}
                    className={`rounded-2xl border px-3 py-3 text-sm font-medium ${
                      itemIndex === 0
                        ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300'
                        : 'border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                    }`}
                  >
                    {item}
                  </div>
                ),
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <p className="text-sm font-semibold text-slate-500">Editing workflow</p>
          <div className="mt-3 space-y-3">
            {['Open template', 'Place fields', 'Apply logo', 'Validate spacing'].map(
              (item, itemIndex) => (
                <div
                  key={item}
                  className={`flex items-center gap-3 rounded-xl px-3 py-3 ${
                    itemIndex === 0
                      ? 'bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-200'
                      : 'bg-slate-50 text-slate-700 dark:bg-slate-900 dark:text-slate-300'
                  }`}
                >
                  <div
                    className={`h-3 w-3 rounded-full ${
                      itemIndex === 0 ? 'bg-cyan-500' : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                  />
                  <span className="text-sm font-medium">{item}</span>
                </div>
              ),
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-950 p-4 text-white shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-[0.2em] text-slate-400">Template progress</span>
            <span className="rounded-full bg-cyan-500/20 px-2.5 py-1 text-xs font-semibold text-cyan-200">
              50%
            </span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-cyan-400 to-teal-400" />
          </div>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/40">
          <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">Template behaviour</p>
          <p className="mt-2 text-sm text-blue-700/80 dark:text-blue-200/80">
            The view shows configuration work: mapping, aligning, and branding the certificate.
          </p>
        </div>
      </div>
    </div>
  );
}

function MobileCaptureMockup() {
  return (
    <div className="grid gap-4 md:grid-cols-[1fr_0.95fr]">
      <div className="relative overflow-hidden rounded-[2rem] bg-slate-950 p-4 shadow-2xl">
        <div className="mx-auto flex h-[360px] max-w-[220px] flex-col rounded-[2rem] border border-slate-700 bg-slate-900 p-3 shadow-xl">
          <div className="mb-3 h-4 w-20 self-center rounded-full bg-slate-700" />
          <div className="relative flex-1 overflow-hidden rounded-[1.5rem] bg-gradient-to-b from-blue-600 via-slate-900 to-slate-950 p-4">
            <div className="rounded-2xl bg-white/10 p-3 text-white backdrop-blur">
              <p className="text-xs uppercase tracking-[0.2em] text-blue-100">Mobile operations</p>
              <p className="mt-1 text-sm font-medium">Collect site evidence</p>
            </div>

            <div className="mt-5 rounded-2xl bg-white p-3 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="h-14 w-14 rounded-2xl bg-slate-200" />
                <div className="space-y-2">
                  <div className="h-3 w-20 rounded-full bg-slate-200" />
                  <div className="h-3 w-16 rounded-full bg-slate-200" />
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs font-semibold text-slate-500">
                <span>Photo</span>
                <span>Notes</span>
                <span>Result</span>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {['Open job', 'Capture photo', 'Add note', 'Submit reading'].map((item, index) => (
                <div
                  key={item}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium ${
                    index === 0 ? 'bg-blue-500/15 text-white' : 'bg-white/5 text-slate-300'
                  }`}
                >
                  <div
                    className={`h-2.5 w-2.5 rounded-full ${
                      index === 0 ? 'bg-emerald-400' : 'bg-white/40'
                    }`}
                  />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="absolute inset-0 rounded-3xl ring-1 ring-cyan-400/15" />
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <p className="text-sm font-semibold text-slate-500">Field checklist</p>
          <div className="mt-3 space-y-3">
            {['Photo evidence', 'Inspection notes', 'Measurement values', 'Pass / fail result'].map(
              (item, itemIndex) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-3 dark:bg-slate-900"
                >
                  <CheckCircle2
                    className={`h-4 w-4 ${
                      itemIndex === 0 ? 'text-cyan-500' : 'text-emerald-500'
                    }`}
                  />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {item}
                  </span>
                </div>
              ),
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-950 p-4 text-white shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-[0.2em] text-slate-400">Sync status</span>
            <span className="rounded-full bg-cyan-500/20 px-2.5 py-1 text-xs font-semibold text-cyan-200">
              live
            </span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-[84%] rounded-full bg-gradient-to-r from-purple-400 via-cyan-400 to-emerald-400" />
          </div>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/40">
          <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">Mobile workflow</p>
          <p className="mt-2 text-sm text-blue-700/80 dark:text-blue-200/80">
            The interface shows the sequence of field operations, not moving pieces.
          </p>
        </div>
      </div>
    </div>
  );
}

function OutputCertificateMockup() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-50 p-4 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <div className="absolute inset-0 bg-gradient-to-br from-white via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900" />
        <div className="relative rounded-[1.6rem] border border-slate-200 bg-white p-4 shadow-lg dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-sm font-bold text-white">
                AC
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Final output</p>
                <p className="text-base font-semibold text-slate-900 dark:text-white">
                  Branded certificate PDF
                </p>
              </div>
            </div>
            <div className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
              ready
            </div>
          </div>

          <div className="mt-5 h-px bg-slate-200 dark:bg-slate-800" />

          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between rounded-2xl border border-dashed border-blue-300 bg-blue-50 px-4 py-3 dark:border-blue-500/30 dark:bg-blue-500/10">
              <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                Logo and title locked in
              </span>
              <BadgeCheck className="h-4 w-4 text-blue-500" />
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-dashed border-cyan-300 bg-cyan-50 px-4 py-3 dark:border-cyan-500/30 dark:bg-cyan-500/10">
              <span className="text-sm font-semibold text-cyan-700 dark:text-cyan-300">
                Fields merged from the job
              </span>
              <span className="rounded-full bg-cyan-600/15 px-3 py-1 text-xs font-semibold text-cyan-700 dark:text-cyan-300">
                synced
              </span>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-dashed border-emerald-300 bg-emerald-50 px-4 py-3 dark:border-emerald-500/30 dark:bg-emerald-500/10">
              <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                Final certification stamp
              </span>
              <Stamp className="h-4 w-4 text-emerald-500 animate-stamp-pop" />
            </div>
          </div>

          <div className="mt-5 rounded-3xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-4 dark:border-slate-800 dark:from-slate-950 dark:to-slate-900">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              <span>pdf export</span>
              <span>brand applied</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
              <div className="h-full w-[78%] rounded-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500" />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <p className="text-sm font-semibold text-slate-500">Export operations</p>
          <div className="mt-3 space-y-3">
            {['Merge field data', 'Apply branding', 'Validate layout', 'Generate PDF'].map(
              (item, itemIndex) => (
                <div
                  key={item}
                  className={`flex items-center gap-3 rounded-xl px-3 py-3 ${
                    itemIndex === 3
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200'
                      : 'bg-slate-50 text-slate-700 dark:bg-slate-900 dark:text-slate-300'
                  }`}
                >
                  <div
                    className={`h-3 w-3 rounded-full ${
                      itemIndex === 3 ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                  />
                  <span className="text-sm font-medium">{item}</span>
                </div>
              ),
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-950 p-4 text-white shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-[0.2em] text-slate-400">Delivery status</span>
            <span className="rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs font-semibold text-emerald-200">
              100%
            </span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-full rounded-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500" />
          </div>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/40">
          <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">
            Certificate output
          </p>
          <p className="mt-2 text-sm text-blue-700/80 dark:text-blue-200/80">
            The final state focuses on export operations, brand application, and delivery readiness.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function HowItWorksPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-slate-950">
      <Header />

      <main>
        <section className="relative overflow-hidden bg-slate-950 py-20 md:py-28">
          <div className="absolute inset-0 opacity-20">
            <Image
              src="https://images.unsplash.com/photo-1579548122080-c35fd6820ecb?auto=format&fit=crop&q=80&w=2070"
              alt="Abstract background"
              fill
              sizes="100vw"
              className="object-cover"
              priority
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/50 via-slate-950/80 to-slate-950" />
          <div className="absolute -top-10 left-10 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="absolute bottom-0 right-8 h-96 w-96 rounded-full bg-cyan-500/20 blur-3xl" />

          <div className="container relative mx-auto px-4 text-center">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-blue-800 bg-blue-900/30 px-4 py-2 text-sm font-medium text-blue-300">
              <Sparkles className="h-4 w-4" />
              Workflow matched to operations
            </div>

            <h1 className="mt-8 text-4xl font-bold tracking-tight text-white md:text-6xl">
              See how the workflow turns
              <span className="block bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent">
                PDFs into real-world results
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-3xl text-lg text-slate-300 md:text-xl">
              The page below shows the real sequence: capture the source document, map fields,
              check site data, and generate certification outputs.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/sign-up">
                <Button className="h-12 rounded-full bg-white px-6 text-blue-600 hover:bg-blue-50">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/">
                <Button
                  variant="outline"
                  className="h-12 rounded-full border-slate-700 px-6 text-slate-200 hover:bg-slate-800 hover:text-white"
                >
                  Back to home
                </Button>
              </Link>
            </div>

            <HeroWorkflowPreview />
            <WorkflowTimeline />
          </div>
        </section>

        <section className="border-y border-slate-200 bg-slate-50 py-20 dark:border-slate-800 dark:bg-slate-900/40">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-600 dark:text-blue-400">
                Parallel workflow for existing systems
              </p>
              <h2 className="mt-4 text-3xl font-bold text-slate-900 dark:text-white md:text-4xl">
                Scan a paper form, then turn it into a fully customisable digital template
              </h2>
              <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
                If your team already has a paper process or an existing system, you can capture the
                form by photo or scan, convert it into a digital template, and customise every
                field, label, and brand element before it becomes a reusable workflow.
              </p>
            </div>

            <div className="mt-16 grid gap-8 lg:grid-cols-2">
              <WorkflowPanel
                title="Capture the paper document"
                subtitle="Existing system input"
                className="min-h-[380px]"
              >
                <CaptureCertificateMockup />
              </WorkflowPanel>

              <WorkflowPanel
                title="Make it fully customisable"
                subtitle="Digital template creation"
                className="min-h-[380px]"
              >
                <TemplateEditorMockup />
              </WorkflowPanel>
            </div>
          </div>
        </section>

        <section className="py-20 md:py-24">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-600 dark:text-blue-400">
                Step-by-step overview
              </p>
              <h2 className="mt-4 text-3xl font-bold text-slate-900 dark:text-white md:text-4xl">
                A visual path from static PDFs to automated workflows
              </h2>
              <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
                Each section below mirrors how teams move from document setup to field capture and
                finished outputs.
              </p>
            </div>

            <div className="mt-16 grid gap-8 lg:gap-10">
              {steps.map((item, index) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.step}
                    className={`grid gap-8 lg:grid-cols-2 lg:items-center ${
                      index % 2 === 1 ? 'lg:[&>*:first-child]:order-2' : ''
                    }`}
                  >
                    <div className="space-y-5">
                      <div className={`inline-flex items-center gap-3 rounded-full px-4 py-2 ${item.card}`}>
                        <div className={`rounded-full bg-gradient-to-r ${item.accent} p-2 text-white shadow-lg`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                          {item.badge}
                        </span>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-xl font-bold text-white dark:bg-white dark:text-slate-950">
                          {item.step}
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white md:text-3xl">
                          {item.title}
                        </h3>
                      </div>

                      <p className="max-w-xl text-lg leading-relaxed text-slate-600 dark:text-slate-400">
                        {item.description}
                      </p>

                      <div className="flex items-center gap-3 text-sm font-medium text-slate-500 dark:text-slate-400">
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                        Designed for certification, reporting, and field workflows
                      </div>
                    </div>

                    <WorkflowPanel
                      title={item.title}
                      subtitle={`Demonstration ${item.step}`}
                      className="min-h-[360px]"
                    >
                      {index === 0 ? <CaptureCertificateMockup /> : null}
                      {index === 1 ? <TemplateEditorMockup /> : null}
                      {index === 2 ? <MobileCaptureMockup /> : null}
                      {index === 3 ? <OutputCertificateMockup /> : null}
                    </WorkflowPanel>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="border-t border-slate-200 bg-slate-50 py-20 dark:border-slate-800 dark:bg-slate-900/40">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-800 dark:bg-slate-950 md:p-12">
              <div className="grid gap-8 md:grid-cols-[1.4fr_0.6fr] md:items-center">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-600 dark:text-blue-400">
                    Next step
                  </p>
                  <h2 className="mt-3 text-3xl font-bold text-slate-900 dark:text-white md:text-4xl">
                    Ready to build your first workflow?
                  </h2>
                  <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
                    Create a template, map it visually, capture real site data, and generate
                    results that look polished from the first run.
                  </p>
                </div>
                <div className="flex flex-col gap-3">
                  <Link href="/sign-up">
                    <Button className="h-12 w-full rounded-full bg-blue-600 text-white hover:bg-blue-500">
                      Get Started Now
                    </Button>
                  </Link>
                  <Link href="/features">
                    <Button
                      variant="outline"
                      className="h-12 w-full rounded-full border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      View Features
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
