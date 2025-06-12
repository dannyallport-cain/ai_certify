import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle2, Shield, Zap, BarChart3, Users, FileText, Lock, Globe, Clock } from 'lucide-react';

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Powerful Features for Modern Certification
          </h1>
          <p className="text-xl text-blue-100 max-w-3xl mx-auto">
            Discover how our platform can transform your certification process with AI-powered tools and seamless workflows
          </p>
        </div>
      </section>

      {/* Main Features */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          {mainFeatures.map((feature, index) => (
            <div key={index} className={`flex flex-col lg:flex-row items-center gap-12 mb-20 ${
              index % 2 === 1 ? 'lg:flex-row-reverse' : ''
            }`}>
              <div className="flex-1">
                <div className={`${feature.iconBg} p-3 rounded-lg w-fit mb-4`}>
                  <feature.icon className={`h-8 w-8 ${feature.iconColor}`} />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-4">{feature.title}</h2>
                <p className="text-xl text-gray-600 mb-6">{feature.description}</p>
                <ul className="space-y-4">
                  {feature.benefits.map((benefit, benefitIndex) => (
                    <li key={benefitIndex} className="flex items-start">
                      <CheckCircle2 className="h-6 w-6 text-green-500 mr-3 flex-shrink-0" />
                      <span className="text-gray-600">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex-1 relative">
                <div className="relative w-full h-[400px]">
                  <Image
                    src={feature.image}
                    alt={feature.title}
                    fill
                    className="object-contain"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Feature Comparison */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Compare Features Across Plans
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Choose the right plan for your needs with our transparent feature comparison
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {featureComparison.map((plan, index) => (
              <div key={index} className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">{plan.name}</h3>
                <ul className="space-y-4">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center text-gray-600">
                      <CheckCircle2 className="h-5 w-5 text-green-500 mr-2" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gray-900 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Join thousands of organizations already using our platform
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
              Start Free Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" className="text-white border-white hover:bg-white/10">
              Schedule Demo
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

const mainFeatures = [
  {
    title: 'AI-Powered Certificate Generation',
    description: 'Generate professional certificates instantly with our advanced AI technology',
    icon: Zap,
    iconColor: 'text-yellow-500',
    iconBg: 'bg-yellow-100',
    image: '/images/features/ai-generation.svg',
    benefits: [
      'Automated certificate creation with AI assistance',
      'Smart template suggestions based on content',
      'Real-time preview and editing',
      'Batch processing for multiple certificates',
      'Custom branding and styling options'
    ]
  },
  {
    title: 'Secure Verification System',
    description: 'Ensure certificate authenticity with our blockchain-based verification system',
    icon: Shield,
    iconColor: 'text-green-500',
    iconBg: 'bg-green-100',
    image: '/images/features/verification.svg',
    benefits: [
      'Blockchain-based certificate verification',
      'Unique QR codes for each certificate',
      'Public verification portal',
      'Fraud prevention measures',
      'Audit trail and history tracking'
    ]
  },
  {
    title: 'Advanced Analytics & Reporting',
    description: 'Gain valuable insights into your certification program',
    icon: BarChart3,
    iconColor: 'text-blue-500',
    iconBg: 'bg-blue-100',
    image: '/images/features/analytics.svg',
    benefits: [
      'Real-time dashboard with key metrics',
      'Custom report generation',
      'Export data in multiple formats',
      'Trend analysis and forecasting',
      'Usage statistics and insights'
    ]
  },
  {
    title: 'Team Collaboration',
    description: 'Work together seamlessly with role-based access and team management',
    icon: Users,
    iconColor: 'text-purple-500',
    iconBg: 'bg-purple-100',
    image: '/images/features/collaboration.svg',
    benefits: [
      'Role-based access control',
      'Team workspaces and sharing',
      'Real-time collaboration tools',
      'Comment and feedback system',
      'Activity tracking and notifications'
    ]
  }
];

const featureComparison = [
  {
    name: 'Starter',
    features: [
      'Basic certificate templates',
      'Up to 100 certificates/month',
      'Email support',
      'PDF export',
      'Basic analytics'
    ]
  },
  {
    name: 'Professional',
    features: [
      'Custom certificate templates',
      'Up to 1000 certificates/month',
      'Priority support',
      'Advanced analytics',
      'API access',
      'Team collaboration'
    ]
  },
  {
    name: 'Enterprise',
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