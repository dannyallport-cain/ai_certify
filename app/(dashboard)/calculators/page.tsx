import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  Cable,
  Calculator,
  Gauge,
  ShieldCheck,
  Target,
  TimerReset,
  Zap
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type CalculatorLink = {
  title: string;
  description: string;
  href: string;
};

type CalculatorCategory = {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  badge: string;
  calculators: CalculatorLink[];
};

const calculatorCategories: CalculatorCategory[] = [
  {
    title: 'Fault protection & verification',
    description:
      'Core checks for earth fault loop impedance, fault current and disconnection performance.',
    icon: ShieldCheck,
    badge: 'Protective measures',
    calculators: [
      {
        title: 'Zs Calculator',
        description: 'Estimate measured or maximum permitted earth fault loop impedance values.',
        href: '/calculators/zs'
      },
      {
        title: 'Fault Current Calculator',
        description: 'Work out prospective fault current from voltage and loop impedance inputs.',
        href: '/calculators/fault-current'
      },
      {
        title: 'Disconnection Time Calculator',
        description: 'Review whether a protective device can meet target automatic disconnection times.',
        href: '/calculators/disconnection-time'
      },
      {
        title: 'RCD Testing Calculator',
        description: 'Check trip-time results against common testing expectations.',
        href: '/calculators/rcd-testing'
      }
    ]
  },
  {
    title: 'Cable design & containment',
    description:
      'Sizing support for voltage drop, cable capacity and practical containment selection.',
    icon: Cable,
    badge: 'Design',
    calculators: [
      {
        title: 'Cable Volt Drop Calculator',
        description: 'Calculate expected voltage drop using current, route length and conductor data.',
        href: '/calculators/cable-volt-drop'
      },
      {
        title: 'Cable Sizing Calculator',
        description: 'Compare design current, correction factors and candidate conductor sizes.',
        href: '/calculators/cable-sizing'
      },
      {
        title: 'Conduit Fill Calculator',
        description: 'Assess conduit occupancy using conductor count and conduit dimensions.',
        href: '/calculators/conduit-fill'
      },
      {
        title: 'Trunking Fill Calculator',
        description: 'Review containment fill percentage for trunking layouts.',
        href: '/calculators/trunking-fill'
      }
    ]
  },
  {
    title: 'Inspection, testing & continuity',
    description:
      'Useful field tools for continuity checks, insulation testing and ring verification.',
    icon: Activity,
    badge: 'Testing',
    calculators: [
      {
        title: 'Ring Final Continuity Calculator',
        description: 'Support ring continuity checks and expected end-to-end resistance comparisons.',
        href: '/calculators/ring-final-continuity'
      },
      {
        title: 'Insulation Resistance Calculator',
        description: 'Assess insulation resistance readings against typical pass criteria.',
        href: '/calculators/insulation-resistance'
      }
    ]
  },
  {
    title: 'Load assessment & efficiency',
    description:
      'Estimate demand, diversity and power quality for domestic and commercial installations.',
    icon: Gauge,
    badge: 'Load calculations',
    calculators: [
      {
        title: 'Maximum Demand Domestic',
        description: 'Apply practical domestic assumptions to estimate connected and diversified load.',
        href: '/calculators/maximum-demand-domestic'
      },
      {
        title: 'Maximum Demand Commercial',
        description: 'Build a commercial demand estimate from multiple load groups.',
        href: '/calculators/maximum-demand-commercial'
      },
      {
        title: 'Diversity Calculator',
        description: 'Apply diversity allowances to connected load and compare resulting current demand.',
        href: '/calculators/diversity'
      },
      {
        title: 'Power Factor Calculator',
        description: 'Convert between real, reactive and apparent power with power factor guidance.',
        href: '/calculators/power-factor'
      }
    ]
  }
];

const featuredCalculators: CalculatorLink[] = [
  {
    title: 'Zs Calculator',
    description: 'Quick access to one of the most frequently used electrical verification checks.',
    href: '/calculators/zs'
  },
  {
    title: 'Cable Sizing Calculator',
    description: 'Start cable design work with current, installation method and correction factors.',
    href: '/calculators/cable-sizing'
  },
  {
    title: 'Maximum Demand Domestic',
    description: 'Useful early-stage estimate for domestic board and intake planning.',
    href: '/calculators/maximum-demand-domestic'
  }
];

export default function CalculatorsPage() {
  const totalCalculators = calculatorCategories.reduce(
    (total, category) => total + category.calculators.length,
    0
  );

  return (
    <main className="flex-1 space-y-8 p-4 pt-6 md:p-8">
      <section className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 via-white to-cyan-50 shadow-sm">
          <CardHeader className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                Electrical tools
              </Badge>
              <Badge variant="outline">{totalCalculators} calculators planned</Badge>
            </div>
            <div className="space-y-2">
              <CardTitle className="text-3xl tracking-tight">Electrical Calculator Suite</CardTitle>
              <CardDescription className="max-w-2xl text-base text-slate-600">
                A central workspace for practical electrical design, inspection and testing calculators.
                Use these tools to move quickly from rough checks to documented site calculations.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <Button asChild>
              <Link href="/calculators/zs">
                Open first calculator
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard">Back to dashboard</Link>
            </Button>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
          <Card>
            <CardHeader className="gap-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Calculator className="h-4 w-4" />
                Coverage
              </div>
              <CardTitle className="text-2xl">{totalCalculators}</CardTitle>
              <CardDescription>Named calculator routes available from this hub.</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="gap-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Zap className="h-4 w-4" />
                Focus
              </div>
              <CardTitle className="text-2xl">BS 7671 workflow</CardTitle>
              <CardDescription>Built around design, verification and inspection tasks.</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="gap-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Target className="h-4 w-4" />
                Purpose
              </div>
              <CardTitle className="text-2xl">Fast field references</CardTitle>
              <CardDescription>Clear outputs with concise guidance for practical decision-making.</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Featured calculators</h2>
          <p className="text-sm text-muted-foreground">
            Start with the most commonly used calculations for inspection, testing and design.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {featuredCalculators.map((calculator) => (
            <Card key={calculator.href} className="transition-shadow hover:shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-lg">
                  <span>{calculator.title}</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </CardTitle>
                <CardDescription>{calculator.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="w-full justify-between">
                  <Link href={calculator.href}>
                    Open calculator
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Browse by category</h2>
          <p className="text-sm text-muted-foreground">
            The suite is organised around real electrical workflows so related tools stay together.
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          {calculatorCategories.map((category) => {
            const Icon = category.icon;

            return (
              <Card key={category.title} className="h-full">
                <CardHeader className="space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-slate-100 p-2 text-slate-700">
                          <Icon className="h-5 w-5" />
                        </div>
                        <CardTitle className="text-xl">{category.title}</CardTitle>
                      </div>
                      <CardDescription className="max-w-2xl">{category.description}</CardDescription>
                    </div>
                    <Badge variant="outline" className="shrink-0">
                      {category.badge}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {category.calculators.map((calculator) => (
                    <Link
                      key={calculator.href}
                      href={calculator.href}
                      className="group flex items-start justify-between gap-4 rounded-lg border border-slate-200 p-4 transition-colors hover:border-slate-300 hover:bg-slate-50"
                    >
                      <div className="space-y-1">
                        <div className="font-medium text-slate-900">{calculator.title}</div>
                        <p className="text-sm text-muted-foreground">{calculator.description}</p>
                      </div>
                      <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TimerReset className="h-5 w-5" />
              Planned calculator routes
            </CardTitle>
            <CardDescription>
              Exact route structure prepared for the wider calculator suite rollout.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
              {calculatorCategories.flatMap((category) => category.calculators).map((calculator) => (
                <code
                  key={calculator.href}
                  className="rounded-md border bg-slate-50 px-3 py-2 text-xs text-slate-700"
                >
                  {calculator.href}
                </code>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How to use this area</CardTitle>
            <CardDescription>
              Keep this section as the central dashboard entry point for all electrical calculation tools.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Use the category layout to separate verification, design and demand-based calculations.
            </p>
            <p>
              Individual calculator pages can add standards notes, formulas and worked outputs while keeping
              navigation consistent with this hub.
            </p>
            <Button asChild variant="outline" className="w-full justify-between">
              <Link href="/certificates/new/eicr">
                Open EICR certificate workflow
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}