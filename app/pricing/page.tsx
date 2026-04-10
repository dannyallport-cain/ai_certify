import { Footer } from '@/components/landing/Footer';
import { Header } from '@/components/landing/Header';
import { Button } from '@/components/ui/button';
import { getAdminStripeSubscriptionPlans } from '@/lib/payments/stripe';
import { CheckCircle2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default async function PricingPage() {
  const plans = (await getAdminStripeSubscriptionPlans()).filter((plan) => plan.active);
  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-slate-950">
      <Header />
      
      <section className="py-20 bg-slate-950 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <Image
            src="https://images.unsplash.com/photo-1579548122080-c35fd6820ecb?auto=format&fit=crop&q=80&w=2070"
            alt="Background"
            fill
            className="object-cover"
            priority
          />
        </div>
        <div className="container relative mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Choose the plan that best fits your needs. No hidden fees.
          </p>
        </div>
      </section>

      <section className="py-20 bg-white dark:bg-slate-950">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3 max-w-6xl mx-auto">
            {plans.map((plan) => {
              const highlight = (plan.allowances.badge || '').toLowerCase().includes('popular');
              const price = new Intl.NumberFormat('en-GB', {
                style: 'currency',
                currency: plan.currency.toUpperCase(),
                maximumFractionDigits: 0,
              }).format(plan.monthlyPrice);

              return (
                <div
                  key={plan.priceId}
                  className={`relative flex flex-col rounded-2xl border p-8 ${
                    highlight
                      ? 'z-10 scale-105 border-blue-500 bg-slate-900 shadow-2xl shadow-blue-500/20'
                      : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
                  }`}
                >
                  {plan.allowances.badge ? (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-blue-500 px-4 py-1 text-sm font-medium text-white">
                      {plan.allowances.badge}
                    </div>
                  ) : null}
                  <h3
                    className={`mb-2 text-2xl font-bold ${
                      highlight ? 'text-white' : 'text-slate-900 dark:text-white'
                    }`}
                  >
                    {plan.name}
                  </h3>
                  <div className="mb-4 flex items-baseline gap-1">
                    <span
                      className={`text-4xl font-bold ${
                        highlight ? 'text-white' : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {price}
                    </span>
                    <span className="text-slate-500">/month</span>
                  </div>
                  <p className="mb-3 text-slate-500">{plan.description}</p>
                  <div
                    className={`mb-6 space-y-1 text-sm ${
                      highlight ? 'text-slate-300' : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <p>Best for: {plan.allowances.targetUser || 'Electrical contractors'}</p>
                    <p>Usage: {plan.allowances.certificates}</p>
                    <p>Seats: {plan.allowances.teamSeats}</p>
                    {plan.trialPeriodDays ? <p>Trial: {plan.trialPeriodDays} days</p> : null}
                    {plan.annualPrice ? <p>Annual: £{plan.annualPrice}/year</p> : null}
                  </div>

                  <ul className="mb-8 flex-grow space-y-4">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-3">
                        <CheckCircle2
                          className={`h-5 w-5 ${highlight ? 'text-blue-400' : 'text-green-500'}`}
                        />
                        <span
                          className={
                            highlight ? 'text-slate-300' : 'text-slate-600 dark:text-slate-400'
                          }
                        >
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <Link href={plan.name === 'Enterprise' ? '/contact' : '/sign-up'} className="w-full">
                    <Button
                      className={`h-12 w-full ${
                        highlight
                          ? 'bg-blue-600 text-white hover:bg-blue-500'
                          : 'bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700'
                      }`}
                    >
                      {plan.name === 'Enterprise' ? 'Contact Sales' : 'Get Started'}
                    </Button>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
