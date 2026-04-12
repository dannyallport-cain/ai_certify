import Image from 'next/image';
import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Footer';
import { CheckCircle2, Zap, BarChart3, Lock, Layers, Edit3, Shield } from 'lucide-react';

export default function FeaturesPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-slate-950">
      <Header />
      
      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden bg-slate-950">
        <div className="absolute inset-0 opacity-20">
          <Image
            src="https://images.unsplash.com/photo-1579548122080-c35fd6820ecb?auto=format&fit=crop&q=80&w=2070"
            alt="Background"
            fill
            className="object-cover"
            priority
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/50 via-slate-950/80 to-slate-950" />
        
        <div className="container relative mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
            Powerful Features for <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
              smarter PDF report automation
            </span>
          </h1>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto">
            Upload the report templates you already use, turn them into reusable digital workflows, and generate polished outputs with AI-assisted setup, dynamic data merge, and secure cloud storage.
          </p>
        </div>
      </section>

      {/* Main Features */}
      <section className="py-20 bg-white dark:bg-slate-950">
        <div className="container mx-auto px-4">
          {[
            {
              title: 'AI-Powered Template Setup',
              description: 'Bring your existing PDF reports into AI-Certificates and accelerate setup with AI blank-field detection. The platform identifies likely fillable areas automatically, helping your team convert static documents into smart templates without starting from zero.',
              benefits: ['Upload existing PDF certificate and report templates', 'AI detects likely blank input areas automatically', 'Reduce repetitive setup and manual template preparation'],
              icon: Zap,
              color: 'text-amber-500',
              bg: 'bg-amber-50 dark:bg-amber-900/20',
              image: 'https://images.unsplash.com/photo-1677442135703-1787eea5ce01?auto=format&fit=crop&q=80&w=2070'
            },
            {
              title: 'Visual Report Template Builder',
              description: 'Use a visual builder to place fields exactly where they belong. Click to add, drag to draw, then resize and reposition with precision. It gives your team full control over every mapped area, whether AI finds it first or you place it manually.',
              benefits: ['Manual field placement for total control', 'Resize and reposition fields directly on the PDF', 'Fast point-and-click editing with no specialist tools required'],
              icon: Layers,
              color: 'text-blue-500',
              bg: 'bg-blue-50 dark:bg-blue-900/20',
              image: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&q=80&w=2070'
            },
            {
              title: 'Text & Branding Editor',
              description: 'Update customer-facing templates without leaving the platform. White-out and replace logos, headers, footers, and text blocks so every generated report reflects your own branding, formatting, and wording.',
              benefits: [
                'Replace logos, headers, footers, and text directly in the PDF',
                'White-out unwanted supplier or legacy branding cleanly',
                'Control typography, placement, and presentation for polished output'
              ],
              icon: Edit3,
              color: 'text-purple-500',
              bg: 'bg-purple-50 dark:bg-purple-900/20',
              image: 'https://images.unsplash.com/photo-1542744095-291d1f67b221?auto=format&fit=crop&q=80&w=2070'
            },
            {
              title: 'Dynamic Auto-Fill Tokens',
              description: 'Insert dynamic {{handlebars}} tokens anywhere you need live data to appear. Merge job, client, and company details into your reports automatically so every document is accurate, consistent, and ready to send.',
              benefits: ['Use dynamic tokens such as {{job.address}} and {{client.name}}', 'Auto-fill company details, contact information, and job data', 'Generate consistent reports without copy-and-paste errors'],
              icon: Shield,
              color: 'text-indigo-500',
              bg: 'bg-indigo-50 dark:bg-indigo-900/20',
              image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=2070'
            },
            {
              title: 'ServiceM8 Data Mapping',
              description: 'Connect your report templates to live ServiceM8 information so mapped fields pull through the right job, client, and company values at generation time. This keeps your workflows aligned with the data your team already relies on operationally.',
              benefits: ['Map template fields to ServiceM8 job, client, and company data', 'Keep generated reports aligned with live operational records', 'Streamline report production across office and field workflows'],
              icon: BarChart3,
              color: 'text-cyan-500',
              bg: 'bg-cyan-50 dark:bg-cyan-900/20',
              image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=2070'
            },
            {
              title: 'Secure Cloud Storage',
              description: 'Store templates, generated reports, and supporting business data securely in the cloud. Your team gets reliable access to the latest files while keeping sensitive customer and compliance information protected.',
              benefits: ['Secure cloud storage for templates and generated documents', 'Reliable access to files from anywhere your team works', 'Built for safe handling of business and customer report data'],
              icon: Lock,
              color: 'text-emerald-500',
              bg: 'bg-emerald-50 dark:bg-emerald-900/20',
              image: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&q=80&w=2070'
            }
          ].map((feature, index) => (
            <div key={index} className={`flex flex-col lg:flex-row items-center gap-16 mb-32 ${
              index % 2 === 1 ? 'lg:flex-row-reverse' : ''
            }`}>
              <div className="flex-1 space-y-6">
                <div className={`inline-flex p-3 rounded-xl ${feature.bg}`}>
                  <feature.icon className={`h-8 w-8 ${feature.color}`} />
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white">
                  {feature.title}
                </h2>
                <p className="text-xl text-slate-600 dark:text-slate-400 leading-relaxed">
                  {feature.description}
                </p>
                <ul className="space-y-4 pt-4">
                  {feature.benefits.map((benefit, benefitIndex) => (
                    <li key={benefitIndex} className="flex items-center gap-3">
                      <CheckCircle2 className="h-6 w-6 text-green-500 flex-shrink-0" />
                      <span className="text-lg text-slate-700 dark:text-slate-300">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex-1 relative w-full">
                <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800">
                  <Image
                    src={feature.image}
                    alt={feature.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
}