import { type ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type Tone = 'slate' | 'blue' | 'purple' | 'green' | 'amber' | 'red';

const toneStyles: Record<
  Tone,
  {
    shell: string;
    badge: string;
    iconWrap: string;
    title: string;
    description: string;
    muted: string;
    panel: string;
  }
> = {
  slate: {
    shell: 'border-slate-200 bg-slate-50/80',
    badge: 'border-slate-200 bg-white text-slate-700',
    iconWrap: 'bg-slate-100 text-slate-700',
    title: 'text-slate-950',
    description: 'text-slate-600',
    muted: 'text-slate-500',
    panel: 'border-slate-200/80 bg-white/90',
  },
  blue: {
    shell: 'border-blue-200 bg-blue-50/80',
    badge: 'border-blue-200 bg-white text-blue-700',
    iconWrap: 'bg-blue-100 text-blue-700',
    title: 'text-blue-950',
    description: 'text-blue-800/80',
    muted: 'text-blue-700/70',
    panel: 'border-blue-200/80 bg-white/90',
  },
  purple: {
    shell: 'border-purple-200 bg-purple-50/80',
    badge: 'border-purple-200 bg-white text-purple-700',
    iconWrap: 'bg-purple-100 text-purple-700',
    title: 'text-purple-950',
    description: 'text-purple-800/80',
    muted: 'text-purple-700/70',
    panel: 'border-purple-200/80 bg-white/90',
  },
  green: {
    shell: 'border-emerald-200 bg-emerald-50/80',
    badge: 'border-emerald-200 bg-white text-emerald-700',
    iconWrap: 'bg-emerald-100 text-emerald-700',
    title: 'text-emerald-950',
    description: 'text-emerald-800/80',
    muted: 'text-emerald-700/70',
    panel: 'border-emerald-200/80 bg-white/90',
  },
  amber: {
    shell: 'border-amber-200 bg-amber-50/80',
    badge: 'border-amber-200 bg-white text-amber-700',
    iconWrap: 'bg-amber-100 text-amber-700',
    title: 'text-amber-950',
    description: 'text-amber-800/80',
    muted: 'text-amber-700/70',
    panel: 'border-amber-200/80 bg-white/90',
  },
  red: {
    shell: 'border-rose-200 bg-rose-50/80',
    badge: 'border-rose-200 bg-white text-rose-700',
    iconWrap: 'bg-rose-100 text-rose-700',
    title: 'text-rose-950',
    description: 'text-rose-800/80',
    muted: 'text-rose-700/70',
    panel: 'border-rose-200/80 bg-white/90',
  },
};

interface AdminPageHeroProps {
  eyebrow?: string;
  title: string;
  description: string;
  icon?: ReactNode;
  tone?: Tone;
  actions?: ReactNode;
}

export function AdminPageHero({
  eyebrow,
  title,
  description,
  icon,
  tone = 'slate',
  actions,
}: AdminPageHeroProps) {
  const styles = toneStyles[tone];

  return (
    <section className={cn('rounded-3xl border p-6 shadow-sm md:p-8', styles.shell)}>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-4">
          {eyebrow ? (
            <Badge variant="outline" className={cn('w-fit', styles.badge)}>
              {eyebrow}
            </Badge>
          ) : null}
          <div className="space-y-2">
            <h1 className={cn('text-3xl font-semibold tracking-tight md:text-4xl', styles.title)}>
              {title}
            </h1>
            <p className={cn('max-w-3xl text-sm md:text-base', styles.description)}>
              {description}
            </p>
          </div>
          {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
        </div>

        {icon ? (
          <div
            className={cn(
              'flex h-14 w-14 items-center justify-center rounded-2xl shadow-sm md:h-16 md:w-16',
              styles.iconWrap
            )}
          >
            {icon}
          </div>
        ) : null}
      </div>
    </section>
  );
}

interface AdminSectionProps {
  eyebrow?: string;
  title: string;
  description?: string;
  icon?: ReactNode;
  tone?: Tone;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function AdminSection({
  eyebrow,
  title,
  description,
  icon,
  tone = 'slate',
  actions,
  children,
  className,
}: AdminSectionProps) {
  const styles = toneStyles[tone];

  return (
    <Card className={cn('rounded-3xl border shadow-sm', styles.shell, className)}>
      <CardContent className="space-y-6 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            {eyebrow ? (
              <Badge variant="outline" className={cn('w-fit', styles.badge)}>
                {eyebrow}
              </Badge>
            ) : null}

            <div className="flex items-start gap-3">
              {icon ? (
                <div className={cn('rounded-2xl p-2.5', styles.iconWrap)}>
                  {icon}
                </div>
              ) : null}
              <div className="space-y-1">
                <h2 className={cn('text-xl font-semibold tracking-tight', styles.title)}>{title}</h2>
                {description ? (
                  <p className={cn('max-w-3xl text-sm', styles.description)}>{description}</p>
                ) : null}
              </div>
            </div>
          </div>

          {actions ? <div className="flex shrink-0 flex-wrap gap-3">{actions}</div> : null}
        </div>

        <div className={cn('space-y-6 rounded-2xl border p-4 md:p-5', styles.panel)}>{children}</div>
      </CardContent>
    </Card>
  );
}

export function AdminMutedNote({
  children,
  tone = 'slate',
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  const styles = toneStyles[tone];

  return (
    <div className={cn('rounded-2xl border border-dashed p-4 text-sm', styles.panel, styles.muted, className)}>
      {children}
    </div>
  );
}
