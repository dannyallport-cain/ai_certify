import {
  COMPETITOR_BENCHMARKS,
  PER_USER_BENCHMARK_GBP,
  discountPercent,
  formatGbp,
  roundCurrency,
} from './benchmarks';

export type PlanKey = 'solo' | 'business' | 'enterprise';

/**
 * Seat ladder. Each rate is set independently of volume so the per-seat price
 * steps down as a business commits to more people, while every rate stays at
 * least 30% under the £24.99 per-user market rate.
 */
export const SEAT_LADDER: ReadonlyArray<{ seats: number; seatRateGbp: number }> = [
  { seats: 1, seatRateGbp: 17.49 },
  { seats: 5, seatRateGbp: 16.49 },
  { seats: 15, seatRateGbp: 14.99 },
];

/** Paying annually bills ten months for twelve. */
export const ANNUAL_MONTHS_CHARGED = 10;

export type PlanCatalogEntry = {
  key: PlanKey;
  name: string;
  badge: string | null;
  tagline: string;
  description: string;
  targetUser: string;
  certificates: string;
  seatsIncluded: number;
  seatRateGbp: number;
  extraSeatPriceGbp: number;
  monthlyPrice: number;
  annualPrice: number;
  currency: 'gbp';
  trialPeriodDays: number;
  benchmark: {
    vendor: string;
    offering: string;
    seatsCompared: number;
    monthlyPriceGbp: number;
  };
  savingsPercent: number;
  competitorAnchor: string;
  savingsNote: string;
  features: string[];
  addonIds: string[];
  aliases: string[];
};

function buildPlan(config: {
  key: PlanKey;
  name: string;
  badge: string | null;
  tagline: string;
  description: string;
  targetUser: string;
  certificates: string;
  seatsIncluded: number;
  seatRateGbp: number;
  aliases: string[];
  features: string[];
  addonIds: string[];
  savingsNote: string;
}): PlanCatalogEntry {
  const monthlyPrice = roundCurrency(config.seatRateGbp * config.seatsIncluded);
  const benchmarkMonthly = roundCurrency(PER_USER_BENCHMARK_GBP * config.seatsIncluded);
  const savingsPercent = discountPercent(monthlyPrice, benchmarkMonthly);

  return {
    key: config.key,
    name: config.name,
    badge: config.badge,
    tagline: config.tagline,
    description: config.description,
    targetUser: config.targetUser,
    certificates: config.certificates,
    seatsIncluded: config.seatsIncluded,
    seatRateGbp: config.seatRateGbp,
    extraSeatPriceGbp: config.seatRateGbp,
    monthlyPrice,
    annualPrice: roundCurrency(monthlyPrice * ANNUAL_MONTHS_CHARGED),
    currency: 'gbp',
    trialPeriodDays: 14,
    benchmark: {
      vendor: COMPETITOR_BENCHMARKS.icertifiElectrical.vendor,
      offering: COMPETITOR_BENCHMARKS.icertifiElectrical.offering,
      seatsCompared: config.seatsIncluded,
      monthlyPriceGbp: benchmarkMonthly,
    },
    savingsPercent,
    competitorAnchor: `${config.seatsIncluded} user${config.seatsIncluded === 1 ? '' : 's'} on ${COMPETITOR_BENCHMARKS.icertifiElectrical.vendor} costs ${formatGbp(benchmarkMonthly)}/month across its trade apps. ${config.name} is ${formatGbp(monthlyPrice)} — ${savingsPercent}% less, with every certificate type in one workspace.`,
    savingsNote: config.savingsNote,
    features: config.features,
    addonIds: config.addonIds,
    aliases: config.aliases,
  };
}

export const PLAN_CATALOG: PlanCatalogEntry[] = [
  buildPlan({
    key: 'solo',
    name: 'Solo',
    badge: 'Entry plan',
    tagline: 'One engineer, one tidy monthly bill.',
    description:
      'Everything a sole trader needs to issue compliant certificates from site, without paying per certificate or per app.',
    targetUser: 'Sole traders and newly self-employed engineers',
    certificates: 'Up to 40 certificates / month',
    seatsIncluded: SEAT_LADDER[0].seats,
    seatRateGbp: SEAT_LADDER[0].seatRateGbp,
    aliases: ['starter', 'solo', 'basic', 'base', 'individual'],
    features: [
      'Electrical, fire and emergency lighting certificates',
      'Branded PDF exports and customer records',
      'Mobile capture and photo evidence',
      'Reusable templates from your own PDFs',
      'Email support',
    ],
    addonIds: ['ai-usage', 'fire-alarm-floor-plans'],
    savingsNote: '30% below the £24.99 single-trade app rate, with no per-certificate fees.',
  }),
  buildPlan({
    key: 'business',
    name: 'Business',
    badge: 'Most popular',
    tagline: 'The whole crew, unlimited certificates.',
    description:
      'Built for growing contractors who need unlimited certificate volume, shared records and AI-assisted admin across the team.',
    targetUser: 'Growing contractors with office and field teams',
    certificates: 'Unlimited certificates',
    seatsIncluded: SEAT_LADDER[1].seats,
    seatRateGbp: SEAT_LADDER[1].seatRateGbp,
    aliases: ['business', 'professional', 'small business', 'pro', 'plus', 'growing'],
    features: [
      'Unlimited certificate generation',
      '5 team members included',
      'AI extraction, autofill and report drafting',
      'Shared customer, site and installation records',
      'Priority PDF generation and audit history',
      'Housing and void inspection template packs',
      'Priority support',
    ],
    addonIds: ['fire-alarm-floor-plans', 'ai-usage', 'team-seats', 'integrations'],
    savingsNote: '34% below five iCertifi trade licences, with unlimited certificate volume.',
  }),
  buildPlan({
    key: 'enterprise',
    name: 'Enterprise',
    badge: 'For larger teams',
    tagline: 'Fifteen seats, integrations and oversight.',
    description:
      'For compliance-led organisations rolling certification out across engineers, offices and contractors who need integrations and an audit trail.',
    targetUser: 'Larger contractors, housing providers and compliance teams',
    certificates: 'Unlimited certificates',
    seatsIncluded: SEAT_LADDER[2].seats,
    seatRateGbp: SEAT_LADDER[2].seatRateGbp,
    aliases: ['enterprise', 'team', 'firm', 'scale'],
    features: [
      'Everything in Business',
      '15 team members included',
      'Tiered add-on modules at account level',
      'Third party integration and API access',
      'Enhanced admin oversight and audit export',
      'Onboarding for office and field teams',
      'Priority operational support',
    ],
    addonIds: ['fire-alarm-floor-plans', 'ai-usage', 'team-seats', 'integrations'],
    savingsNote: '40% below fifteen per-user app licences, priced per workspace.',
  }),
];

export function getPlanByKey(key: string): PlanCatalogEntry | null {
  return PLAN_CATALOG.find((plan) => plan.key === key) ?? null;
}

/**
 * Resolves a Stripe product name (or its stored planId metadata) to a catalogue
 * plan. Existing products are named Starter / Small Business / Enterprise, so
 * aliases keep them mapped without renaming anything in Stripe.
 */
export function getPlanForProductName(name: string | null | undefined): PlanCatalogEntry | null {
  if (!name) {
    return null;
  }

  const normalised = name.trim().toLowerCase();

  if (!normalised) {
    return null;
  }

  return (
    PLAN_CATALOG.find((plan) =>
      plan.aliases.some((alias) => normalised === alias || normalised.includes(alias))
    ) ?? null
  );
}

export function formatSeatPrice(plan: PlanCatalogEntry): string {
  return `${formatGbp(plan.extraSeatPriceGbp)}/month each`;
}
