import { checkoutAction } from '@/lib/payments/actions';
import { Check } from 'lucide-react';
import { getStripePrices, getStripeProducts } from '@/lib/payments/stripe';
import { SubmitButton } from './submit-button';

// Prices are fresh for one hour max
export const revalidate = 3600;

export default async function PricingPage() {
  const [prices, products] = await Promise.all([
    getStripePrices(),
    getStripeProducts(),
  ]);

  const verificationPriceId = process.env.STRIPE_VERIFICATION_PRICE_ID;
  const verificationPrice = verificationPriceId
    ? prices.find((price) => price.id === verificationPriceId)
    : undefined;
  const verificationProduct = verificationPrice
    ? products.find((product) => product.id === verificationPrice.productId)
    : undefined;
  const basePlan = products.find((product) => product.name === 'Base');
  const plusPlan = products.find((product) => product.name === 'Plus');

  const basePrice = prices.find((price) => price.productId === basePlan?.id);
  const plusPrice = prices.find((price) => price.productId === plusPlan?.id);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {verificationPrice && (
          <PricingCard
            name={verificationProduct?.name || 'Verification'}
            price={verificationPrice.unitAmount || 10}
            currency={verificationPrice.currency || 'gbp'}
            interval={verificationPrice.interval || 'month'}
            trialDays={0}
            badge="Manual Verification"
            description="Low-cost Stripe test checkout for end-to-end signup verification."
            features={[
              'Uses the real Stripe hosted checkout',
              'No free trial on this verification plan',
              'Designed for callback and billing flow validation',
            ]}
            priceId={verificationPrice.id}
          />
        )}
        <PricingCard
          name={basePlan?.name || 'Base'}
          price={basePrice?.unitAmount || 800}
          currency={basePrice?.currency || 'usd'}
          interval={basePrice?.interval || 'month'}
          trialDays={basePrice?.trialPeriodDays || 7}
          description="Base subscription plan"
          features={[
            'Unlimited Usage',
            'Unlimited Workspace Members',
            'Email Support',
          ]}
          priceId={basePrice?.id}
        />
        <PricingCard
          name={plusPlan?.name || 'Plus'}
          price={plusPrice?.unitAmount || 1200}
          currency={plusPrice?.currency || 'usd'}
          interval={plusPrice?.interval || 'month'}
          trialDays={plusPrice?.trialPeriodDays || 7}
          description="Plus subscription plan"
          features={[
            'Everything in Base, and:',
            'Early Access to New Features',
            '24/7 Support + Slack Access',
          ]}
          priceId={plusPrice?.id}
        />
      </div>
    </main>
  );
}

function PricingCard({
  name,
  price,
  currency,
  interval,
  trialDays,
  badge,
  description,
  features,
  priceId,
}: {
  name: string;
  price: number;
  currency: string;
  interval: string;
  trialDays: number;
  badge?: string;
  description?: string;
  features: string[];
  priceId?: string;
}) {
  const formattedPrice = new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(price / 100);

  return (
    <div className="pt-6 rounded-2xl border border-gray-200 p-6 bg-white">
      {badge ? (
        <p className="mb-3 inline-flex rounded-full bg-orange-100 px-3 py-1 text-xs font-medium text-orange-700">
          {badge}
        </p>
      ) : null}
      <h2 className="text-2xl font-medium text-gray-900 mb-2">{name}</h2>
      {description ? <p className="text-sm text-gray-600 mb-2">{description}</p> : null}
      <p className="text-sm text-gray-600 mb-4">
        {trialDays > 0 ? `with ${trialDays} day free trial` : 'charged immediately after checkout'}
      </p>
      <p className="text-4xl font-medium text-gray-900 mb-6">
        {formattedPrice}{' '}
        <span className="text-xl font-normal text-gray-600">
          per user / {interval}
        </span>
      </p>
      <ul className="space-y-4 mb-8">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start">
            <Check className="h-5 w-5 text-orange-500 mr-2 mt-0.5 flex-shrink-0" />
            <span className="text-gray-700">{feature}</span>
          </li>
        ))}
      </ul>
      <form action={checkoutAction}>
        <input type="hidden" name="priceId" value={priceId} />
        <SubmitButton />
      </form>
    </div>
  );
}
