import {
  COMPETITOR_BENCHMARKS,
  discountPercent,
  formatGbp,
  priceAtDiscount,
  roundCurrency,
} from './benchmarks';
import { SEAT_LADDER, type PlanKey } from './plan-catalog';

export type AddonModuleId = 'fire-alarm-floor-plans' | 'ai-usage' | 'team-seats' | 'integrations';

export type AddonIconKey = 'flame' | 'sparkles' | 'users' | 'plug';

export type AddonTier = {
  id: string;
  name: string;
  summary: string;
  monthlyPrice: number;
  benchmarkMonthlyGbp: number;
  benchmarkLabel: string;
  savingsPercent: number;
  includes: string[];
  bestFor: string;
  highlight: boolean;
};

export type AddonModule = {
  id: AddonModuleId;
  name: string;
  shortName: string;
  icon: AddonIconKey;
  description: string;
  replaces: string;
  billingNote: string;
  availableOn: PlanKey[];
  tiers: AddonTier[];
};

type TierConfig = {
  id: string;
  name: string;
  summary: string;
  benchmarkGbp: number;
  benchmarkLabel: string;
  includes: string[];
  bestFor: string;
  highlight?: boolean;
  /** Overrides the derived price when a bundle discounts deeper than 30%. */
  monthlyPrice?: number;
};

function buildTier(config: TierConfig): AddonTier {
  const monthlyPrice = config.monthlyPrice ?? priceAtDiscount(config.benchmarkGbp);

  return {
    id: config.id,
    name: config.name,
    summary: config.summary,
    monthlyPrice,
    benchmarkMonthlyGbp: roundCurrency(config.benchmarkGbp),
    benchmarkLabel: config.benchmarkLabel,
    savingsPercent: discountPercent(monthlyPrice, config.benchmarkGbp),
    includes: config.includes,
    bestFor: config.bestFor,
    highlight: config.highlight ?? false,
  };
}

const AI_CREDITS = COMPETITOR_BENCHMARKS.icertifiAiCredits.monthlyPriceGbp;

function aiBenchmarkFor(actions: number): number {
  return roundCurrency((AI_CREDITS / 1000) * actions);
}

const [, FIVE_SEATS, FIFTEEN_SEATS] = SEAT_LADDER;

export const ADDON_MODULES: AddonModule[] = [
  {
    id: 'fire-alarm-floor-plans',
    name: 'Fire alarm floor plans',
    shortName: 'Floor plans',
    icon: 'flame',
    description:
      'Draw BS 5839-1 floor plans, check detector and sounder coverage, and issue zone plans and as-fitted drawings from the same record as the certificate.',
    replaces: 'Standalone fire alarm design software, or outsourced design work.',
    billingNote: 'Billed monthly per workspace. Cancel when a project finishes.',
    availableOn: ['solo', 'business', 'enterprise'],
    tiers: [
      buildTier({
        id: 'floorplan-starter',
        name: 'Starter',
        summary: 'Single site, five active plans.',
        benchmarkGbp: COMPETITOR_BENCHMARKS.fire3dGrowing.monthlyPriceGbp,
        benchmarkLabel: 'Fire3D Growing',
        includes: [
          'Up to 5 active floor plans',
          'One building at a time',
          'Detector and sounder coverage checks',
          'Zone plan PDF attached to the certificate',
        ],
        bestFor: 'Occasional BS 5839 jobs and small premises',
      }),
      buildTier({
        id: 'floorplan-pro',
        name: 'Pro',
        summary: 'Unlimited plans, cause and effect.',
        benchmarkGbp: COMPETITOR_BENCHMARKS.fire3dUnlimited.monthlyPriceGbp,
        benchmarkLabel: 'Fire3D Unlimited',
        highlight: true,
        includes: [
          'Unlimited floor plans and buildings',
          'Up to 5 contributing users',
          'As-fitted drawings and zone charts',
          'Cause and effect matrix per system',
          'BS 5839 category checks (L1–L5, P1, P2, M)',
        ],
        bestFor: 'Fire and security firms designing every week',
      }),
      buildTier({
        id: 'floorplan-portfolio',
        name: 'Portfolio',
        summary: 'Multi-site estates and audit history.',
        benchmarkGbp: roundCurrency(COMPETITOR_BENCHMARKS.fire3dUnlimited.monthlyPriceGbp * 2),
        benchmarkLabel: '2 × Fire3D Unlimited',
        includes: [
          'Everything in Pro',
          'Unlimited users',
          'Multi-site estate register with site plans',
          'Revision history for golden-thread evidence',
          'Audit export per building',
        ],
        bestFor: 'Housing providers and facilities teams',
      }),
    ],
  },
  {
    id: 'ai-usage',
    name: 'Additional AI usage',
    shortName: 'AI usage',
    icon: 'sparkles',
    description:
      'Top up the AI actions that read PDFs, scan site photos, autofill certificates and draft report commentary. Actions only expire at the end of the month you buy them in.',
    replaces: 'Per-credit AI top-ups priced at €29.99 per 1,000 credits.',
    billingNote: 'Recurring monthly top-up. Unused actions roll over for 30 days.',
    availableOn: ['solo', 'business', 'enterprise'],
    tiers: [
      buildTier({
        id: 'ai-boost',
        name: 'Boost',
        summary: '500 extra AI actions a month.',
        benchmarkGbp: aiBenchmarkFor(500),
        benchmarkLabel: '500 iCertifi-style credits',
        monthlyPrice: priceAtDiscount(aiBenchmarkFor(500)),
        includes: [
          '500 AI actions per month',
          'PDF field extraction',
          'Photo scan to observations',
          'Certificate autofill',
        ],
        bestFor: 'Solo engineers using AI on most certificates',
      }),
      buildTier({
        id: 'ai-pro',
        name: 'Pro',
        summary: '2,000 extra AI actions a month.',
        benchmarkGbp: aiBenchmarkFor(2000),
        benchmarkLabel: '2,000 iCertifi-style credits',
        highlight: true,
        includes: [
          '2,000 AI actions per month',
          'Everything in Boost',
          'Report commentary drafting',
          'Batch import of historic PDFs',
          'Priority AI queue',
        ],
        bestFor: 'Teams processing certificates daily',
      }),
      buildTier({
        id: 'ai-scale',
        name: 'Scale',
        summary: '5,000 extra AI actions a month.',
        benchmarkGbp: aiBenchmarkFor(5000),
        benchmarkLabel: '5,000 iCertifi-style credits',
        includes: [
          '5,000 AI actions per month',
          'Everything in Pro',
          'Shared pool across the whole workspace',
          'Usage reporting per user',
          'Invoice billing available',
        ],
        bestFor: 'Housing packs and high-volume rollouts',
      }),
    ],
  },
  {
    id: 'team-seats',
    name: 'More team members',
    shortName: 'Team seats',
    icon: 'users',
    description:
      'Add engineers, surveyors or office admin without renegotiating your plan. Seats work across certificates, floor plans and housing packs.',
    replaces: 'Per-user app licences and £59.95 desktop user licences.',
    billingNote: 'Monthly per seat pack. Seats are prorated when added mid-cycle.',
    availableOn: ['solo', 'business', 'enterprise'],
    tiers: [
      buildTier({
        id: 'seats-one',
        name: '+1 seat',
        summary: 'Bring one more person in.',
        benchmarkGbp: COMPETITOR_BENCHMARKS.icertifiElectrical.monthlyPriceGbp,
        benchmarkLabel: 'One iCertifi trade licence',
        monthlyPrice: SEAT_LADDER[0].seatRateGbp,
        includes: [
          '1 additional user seat',
          'Full certificate and template access',
          'Field app and web access',
          'Add or remove monthly',
        ],
        bestFor: 'Sole traders taking on an apprentice',
      }),
      buildTier({
        id: 'seats-five',
        name: '+5 seats',
        summary: 'Scale a crew quickly.',
        benchmarkGbp: roundCurrency(COMPETITOR_BENCHMARKS.icertifiElectrical.monthlyPriceGbp * 5),
        benchmarkLabel: '5 × iCertifi trade licences',
        highlight: true,
        monthlyPrice: roundCurrency(FIVE_SEATS.seatRateGbp * 5),
        includes: [
          '5 additional user seats',
          `${formatGbp(FIVE_SEATS.seatRateGbp)} per seat per month`,
          'Role-based permissions',
          'Shared customer and site records',
        ],
        bestFor: 'Growing contractors adding a second crew',
      }),
      buildTier({
        id: 'seats-ten',
        name: '+10 seats',
        summary: 'Best per-seat rate.',
        benchmarkGbp: roundCurrency(COMPETITOR_BENCHMARKS.icertifiElectrical.monthlyPriceGbp * 10),
        benchmarkLabel: '10 × iCertifi trade licences',
        monthlyPrice: roundCurrency(FIFTEEN_SEATS.seatRateGbp * 10),
        includes: [
          '10 additional user seats',
          `${formatGbp(FIFTEEN_SEATS.seatRateGbp)} per seat per month`,
          'Everything in +5 seats',
          'Bulk user import',
          'Seat usage reporting',
        ],
        bestFor: 'Firms standardising on one platform',
      }),
    ],
  },
  {
    id: 'integrations',
    name: '3rd party integrations',
    shortName: 'Integrations',
    icon: 'plug',
    description:
      'Push certificates and reports into the job management, accounting and automation tools your office already runs, without rekeying anything.',
    replaces: 'Separate automation subscriptions and custom API projects.',
    billingNote: 'Monthly per workspace. Connections are configured during onboarding.',
    availableOn: ['solo', 'business', 'enterprise'],
    tiers: [
      buildTier({
        id: 'integrations-connect',
        name: 'Connect',
        summary: 'Job management and accounting.',
        benchmarkGbp: COMPETITOR_BENCHMARKS.zapierProfessional.monthlyPriceGbp,
        benchmarkLabel: 'Zapier Professional',
        includes: [
          'ServiceM8 job and client sync',
          'Xero and QuickBooks invoice sync',
          'Issued PDFs written back to the job',
          '2 active connections',
        ],
        bestFor: 'Small teams joining up admin and certificates',
      }),
      buildTier({
        id: 'integrations-automate',
        name: 'Automate',
        summary: 'Webhooks and unlimited syncs.',
        benchmarkGbp: COMPETITOR_BENCHMARKS.servicem8Growing.monthlyPriceGbp,
        benchmarkLabel: 'ServiceM8 Growing',
        highlight: true,
        includes: [
          'Everything in Connect',
          'Zapier and Make webhooks',
          'Unlimited two-way syncs',
          '10 active connections',
          'ServiceM8 forms converted into certificate drafts',
        ],
        bestFor: 'Contractors automating quotes to certificates',
      }),
      buildTier({
        id: 'integrations-api',
        name: 'Enterprise API',
        summary: 'API keys, SSO and audit export.',
        benchmarkGbp: COMPETITOR_BENCHMARKS.servicem8Premium.monthlyPriceGbp,
        benchmarkLabel: 'ServiceM8 Premium',
        includes: [
          'Everything in Automate',
          'REST API with scoped keys',
          'SSO / SAML sign-in',
          'Scheduled audit log export',
          'Priority integration support SLA',
        ],
        bestFor: 'Compliance teams and in-house IT',
      }),
    ],
  },
];

export function getAddonModule(id: string): AddonModule | null {
  return ADDON_MODULES.find((module) => module.id === id) ?? null;
}

export function getAddonsForPlan(planKey: PlanKey): AddonModule[] {
  return ADDON_MODULES.filter((module) => module.availableOn.includes(planKey));
}

export function getAddonEntryPrice(module: AddonModule): number {
  return Math.min(...module.tiers.map((tier) => tier.monthlyPrice));
}

export function getAddonBenchmarkEntryPrice(module: AddonModule): number {
  return Math.min(...module.tiers.map((tier) => tier.benchmarkMonthlyGbp));
}

export type { PlanKey };
