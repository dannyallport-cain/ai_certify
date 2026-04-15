import Link from 'next/link';
import { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';

type CalculatorShellProps = {
  title: string;
  description: string;
  children: ReactNode;
  aside?: ReactNode;
};

export function CalculatorShell({
  title,
  description,
  children,
  aside
}: CalculatorShellProps) {
  return (
    <main className="flex-1 space-y-6 p-4 pt-6 md:p-8">
      <div className="space-y-3">
        <Link
          href="/calculators"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to calculators
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            {title}
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground md:text-base">
            {description}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <Card>
          <CardContent className="pt-6">{children}</CardContent>
        </Card>

        <div className="space-y-6">
          {aside}
          <Card>
            <CardHeader>
              <CardTitle>Guidance</CardTitle>
              <CardDescription>
                Use these results as a quick design and verification aid.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                Confirm final compliance against BS 7671, manufacturer data,
                installation method, grouping, ambient temperature and any
                project-specific design constraints.
              </p>
              <p>
                Where measured values are used, always record actual test
                conditions and compare them with the relevant schedule or
                certification requirements.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}

export function CalculatorAsideCard({
  title,
  description,
  children
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="space-y-3 text-sm">{children}</CardContent>
    </Card>
  );
}