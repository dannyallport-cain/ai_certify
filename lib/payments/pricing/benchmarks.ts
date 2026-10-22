/**
 * Competitor price anchors for the published pricing ladder.
 *
 * Every plan and add-on price in the catalogue is derived from the closest
 * published specialist price (`monthlyPriceGbp`) minus `TARGET_DISCOUNT`.
 * Sources are recorded so the marketing page can show its working instead of
 * asserting a discount nobody can check.
 */
export type CompetitorBenchmark = {
  id: string;
  vendor: string;
  offering: string;
  /** Published list price, normalised to GBP per month. */
  monthlyPriceGbp: number;
  sourceNote: string;
};

export const COMPETITOR_BENCHMARKS: Record<string, CompetitorBenchmark> = {
  icertifiElectrical: {
    id: 'icertifi-electrical',
    vendor: 'iCertifi',
    offering: 'Electrical certificates app (single trade, one user)',
    monthlyPriceGbp: 24.99,
    sourceNote: '£24.99/month per app, £190/year',
  },
  icertifiPat: {
    id: 'icertifi-pat',
    vendor: 'iCertifi',
    offering: 'PAT testing app',
    monthlyPriceGbp: 24.99,
    sourceNote: '£24.99/month per app',
  },
  icertifiGas: {
    id: 'icertifi-gas',
    vendor: 'iCertifi',
    offering: 'Gas certificates app',
    monthlyPriceGbp: 25.99,
    sourceNote: '£25.99/month per app',
  },
  icertifiAiCredits: {
    id: 'icertifi-ai-credits',
    vendor: 'iCertifi',
    offering: 'AI credits (1,000 pack)',
    monthlyPriceGbp: 25.4,
    sourceNote: '€29.99 per 1,000 AI credits (≈£25.40)',
  },
  easycertLicence: {
    id: 'easycert-licence',
    vendor: 'EasyCert',
    offering: 'Extra user licence',
    monthlyPriceGbp: 59.95,
    sourceNote: '£59.95 per additional user licence',
  },
  fire3dGrowing: {
    id: 'fire3d-growing',
    vendor: 'Fire3D',
    offering: 'Fire alarm design — Growing (5 floor plan uploads)',
    monthlyPriceGbp: 51,
    sourceNote: '$65/month (≈£51)',
  },
  fire3dUnlimited: {
    id: 'fire3d-unlimited',
    vendor: 'Fire3D',
    offering: 'Fire alarm design — Unlimited floor plans, multi-user',
    monthlyPriceGbp: 102,
    sourceNote: '$130/month (≈£102)',
  },
  servicem8Growing: {
    id: 'servicem8-growing',
    vendor: 'ServiceM8',
    offering: 'Job management — Growing (150 jobs)',
    monthlyPriceGbp: 59,
    sourceNote: '£59/month',
  },
  servicem8Premium: {
    id: 'servicem8-premium',
    vendor: 'ServiceM8',
    offering: 'Job management — Premium (500 jobs)',
    monthlyPriceGbp: 119,
    sourceNote: '£119/month',
  },
  zapierProfessional: {
    id: 'zapier-professional',
    vendor: 'Zapier',
    offering: 'Professional automation plan',
    monthlyPriceGbp: 23.7,
    sourceNote: '$29.99/month (≈£23.70)',
  },
};

/** Headline promise: every published price is at least 30% under its anchor. */
export const TARGET_DISCOUNT = 0.3;

/** Multi-user anchor used across the seat-based plan ladder. */
export const PER_USER_BENCHMARK_GBP = COMPETITOR_BENCHMARKS.icertifiElectrical.monthlyPriceGbp;

export function roundCurrency(value: number): number {
  const rounded = Math.round(value * 100) / 100;
  return Object.is(rounded, -0) ? 0 : rounded;
}

/** Price at `discount` below the anchor, rounded to whole pence. */
export function priceAtDiscount(
  benchmarkGbp: number,
  discount: number = TARGET_DISCOUNT
): number {
  return roundCurrency(benchmarkGbp * (1 - discount));
}

/** How much cheaper `ourPrice` is versus the anchor, as a percentage. */
export function discountPercent(ourPrice: number, benchmarkGbp: number): number {
  if (benchmarkGbp <= 0) {
    return 0;
  }

  return Math.round((1 - ourPrice / benchmarkGbp) * 1000) / 10;
}

export function formatGbp(value: number): string {
  const hasPence = Math.round(value * 100) % 100 !== 0;

  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: hasPence ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(value);
}

/** Worked examples shown in the "how we set prices" strip. */
export const PRICING_METHOD_EXAMPLES: Array<{
  benchmarkId: keyof typeof COMPETITOR_BENCHMARKS;
  label: string;
  benchmarkGbp: number;
  ourPriceGbp: number;
}> = [
  {
    benchmarkId: 'icertifiElectrical',
    label: 'Solo plan vs an iCertifi trade app',
    benchmarkGbp: COMPETITOR_BENCHMARKS.icertifiElectrical.monthlyPriceGbp,
    ourPriceGbp: priceAtDiscount(COMPETITOR_BENCHMARKS.icertifiElectrical.monthlyPriceGbp),
  },
  {
    benchmarkId: 'fire3dGrowing',
    label: 'Floor plan module vs Fire3D Growing',
    benchmarkGbp: COMPETITOR_BENCHMARKS.fire3dGrowing.monthlyPriceGbp,
    ourPriceGbp: priceAtDiscount(COMPETITOR_BENCHMARKS.fire3dGrowing.monthlyPriceGbp),
  },
  {
    benchmarkId: 'zapierProfessional',
    label: 'Integrations vs Zapier Professional',
    benchmarkGbp: COMPETITOR_BENCHMARKS.zapierProfessional.monthlyPriceGbp,
    ourPriceGbp: priceAtDiscount(COMPETITOR_BENCHMARKS.zapierProfessional.monthlyPriceGbp),
  },
  {
    benchmarkId: 'servicem8Premium',
    label: 'Integration API vs ServiceM8 Premium',
    benchmarkGbp: COMPETITOR_BENCHMARKS.servicem8Premium.monthlyPriceGbp,
    ourPriceGbp: priceAtDiscount(COMPETITOR_BENCHMARKS.servicem8Premium.monthlyPriceGbp),
  },
];
