import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Footer';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function PricingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-slate-950">
      <Header />
      
      <section className="py-20 bg-slate-950 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://placehold.co/1920x1080/0f172a/1e293b.png?text=')] opacity-20 bg-cover bg-center" />
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              {
                name: "Starter",
                price: "Free",
                description: "Perfect for individuals and small teams just getting started.",
                features: ["Up to 5 certificates/month", "Basic templates", "Email support", "1 User"],
                cta: "Start Free",
                highlight: false
              },
              {
                name: "Pro",
                price: "$29",
                period: "/month",
                description: "For growing businesses that need more power and flexibility.",
                features: ["Unlimited certificates", "Custom branding", "Priority support", "Up to 5 Users", "AI Verification"],
                cta: "Get Started",
                highlight: true
              },
              {
                name: "Enterprise",
                price: "Custom",
                description: "Tailored solutions for large organizations with specific needs.",
                features: ["Unlimited Users", "API Access", "Dedicated Account Manager", "SLA", "Custom Integration"],
                cta: "Contact Sales",
                highlight: false
              }
            ].map((plan, index) => (
              <div key={index} className={`relative p-8 rounded-2xl border ${
                plan.highlight 
                  ? 'border-blue-500 bg-slate-900 shadow-2xl shadow-blue-500/20 scale-105 z-10' 
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
              } flex flex-col`}>
                {plan.highlight && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                    Most Popular
                  </div>
                )}
                <h3 className={`text-2xl font-bold mb-2 ${plan.highlight ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                  {plan.name}
                </h3>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className={`text-4xl font-bold ${plan.highlight ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span className="text-slate-500">{plan.period}</span>
                  )}
                </div>
                <p className="text-slate-500 mb-8">{plan.description}</p>
                
                <ul className="space-y-4 mb-8 flex-grow">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <CheckCircle2 className={`h-5 w-5 ${plan.highlight ? 'text-blue-400' : 'text-green-500'}`} />
                      <span className={plan.highlight ? 'text-slate-300' : 'text-slate-600 dark:text-slate-400'}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <Link href={plan.name === "Enterprise" ? "/contact" : "/sign-up"} className="w-full">
                  <Button className={`w-full h-12 ${
                    plan.highlight 
                      ? 'bg-blue-600 hover:bg-blue-500 text-white' 
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white'
                  }`}>
                    {plan.cta}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
