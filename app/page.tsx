import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle2, Shield, Zap, BarChart3, Users } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-blue-600 to-purple-600 text-white py-20">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
            <div className="flex-1 space-y-8">
              <h1 className="text-4xl md:text-6xl font-bold leading-tight">
                AI-Powered Certificate Management
              </h1>
              <p className="text-xl text-blue-100">
                Streamline your certification process with our intelligent platform. 
                Generate, manage, and verify certificates effortlessly.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/signup">
                  <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50">
                    Get Started Free
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/contact">
                  <Button size="lg" variant="outline" className="text-white border-white hover:bg-white/10">
                    Contact Sales
                  </Button>
                </Link>
                <Link href="/login">
                  <Button size="lg" variant="outline" className="text-white border-white hover:bg-white/10">
                    Login
                  </Button>
                </Link>
              </div>
            </div>
            <div className="flex-1 relative">
              <div className="relative w-full h-[400px]">
                <Image
                  src="/images/hero-illustration.svg"
                  alt="AI Certificate Platform"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Powerful Features for Modern Certification
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Everything you need to manage certificates efficiently and securely
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                <div className={`${feature.iconBg} p-3 rounded-lg w-fit mb-4`}>
                  <feature.icon className={`h-6 w-6 ${feature.iconColor}`} />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Choose the plan that best fits your needs
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <div key={index} className={`bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow ${
                plan.featured ? 'ring-2 ring-blue-600' : ''
              }`}>
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{plan.name}</h3>
                  <div className="mb-4">
                    <span className="text-4xl font-bold text-gray-900">${plan.price}</span>
                    <span className="text-gray-600">/month</span>
                  </div>
                  <p className="text-gray-600 mb-6">{plan.description}</p>
                  <Link href={`/signup?plan=${plan.id}`}>
                    <Button 
                      className={`w-full ${
                        plan.featured 
                          ? 'bg-blue-600 hover:bg-blue-700' 
                          : 'bg-gray-900 hover:bg-gray-800'
                      }`}
                    >
                      Get Started
                    </Button>
                  </Link>
                </div>
                <div className="p-6 bg-gray-50 rounded-b-xl">
                  <ul className="space-y-3">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center text-gray-600">
                        <CheckCircle2 className="h-5 w-5 text-green-500 mr-2" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gray-900 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Transform Your Certification Process?
          </h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Join thousands of organizations already using our platform
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button size="lg" variant="outline" className="text-white border-white hover:bg-white/10">
                Schedule Demo
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

const features = [
  {
    title: 'AI-Powered Generation',
    description: 'Generate professional certificates instantly using our advanced AI technology',
    icon: Zap,
    iconColor: 'text-yellow-500',
    iconBg: 'bg-yellow-100'
  },
  {
    title: 'Secure Verification',
    description: 'Verify certificate authenticity with our blockchain-based verification system',
    icon: Shield,
    iconColor: 'text-green-500',
    iconBg: 'bg-green-100'
  },
  {
    title: 'Advanced Analytics',
    description: 'Track and analyze certificate usage with detailed insights and reports',
    icon: BarChart3,
    iconColor: 'text-blue-500',
    iconBg: 'bg-blue-100'
  },
  {
    title: 'Team Collaboration',
    description: 'Work together seamlessly with role-based access and team management',
    icon: Users,
    iconColor: 'text-purple-500',
    iconBg: 'bg-purple-100'
  }
];

const pricingPlans = [
  {
    id: 'starter',
    name: 'Starter',
    price: 29,
    description: 'Perfect for small teams getting started',
    featured: false,
    features: [
      'Up to 100 certificates/month',
      'Basic templates',
      'Email support',
      'PDF export',
      'Basic analytics'
    ]
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 99,
    description: 'Ideal for growing organizations',
    featured: true,
    features: [
      'Up to 1000 certificates/month',
      'Custom templates',
      'Priority support',
      'Advanced analytics',
      'API access',
      'Team collaboration'
    ]
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 299,
    description: 'For large organizations with advanced needs',
    featured: false,
    features: [
      'Unlimited certificates',
      'Custom branding',
      '24/7 support',
      'Advanced security',
      'Custom integrations',
      'Dedicated account manager'
    ]
  }
];