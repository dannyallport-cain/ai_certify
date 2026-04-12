import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Footer';
import {
  ArrowRight,
  CheckCircle2,
  Shield,
  Zap,
  FileCheck,
  Lock,
  Layers,
  Edit3
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-slate-950">
      <Header />

      {/* Hero Section */}
      <section className="relative pt-20 pb-32 overflow-hidden bg-slate-950">
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

        {/* Animated background blobs */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/30 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse-slow delay-1000" />

        <div className="container relative mx-auto px-4">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="flex-1 text-center lg:text-left space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-900/30 border border-blue-800 text-blue-300 text-sm font-medium">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
                New: AI-powered PDF template builder
              </div>

              <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight tracking-tight">
                Turn any PDF report into a<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400">
                  smart, auto-filled workflow
                </span>
              </h1>

              <p className="text-xl text-slate-400 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                Upload your existing certificate or report template, detect blank fields with AI,
                place fields visually, replace logos and text, and generate polished documents with
                live ServiceM8 job, client, and company data.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                <Link href="/sign-up" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full h-14 px-8 text-lg bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-600/20 rounded-full transition-all hover:scale-105">
                    Start Free Trial
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/contact" className="w-full sm:w-auto">
                  <Button size="lg" variant="outline" className="w-full h-14 px-8 text-lg border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white rounded-full">
                    Book Demo
                  </Button>
                </Link>
              </div>

              <div className="pt-8 flex items-center justify-center lg:justify-start gap-8 text-slate-500 text-sm font-medium">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span>No credit card required</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span>14-day free trial</span>
                </div>
              </div>
            </div>

            <div className="flex-1 relative w-full max-w-xl lg:max-w-none">
              <div className="relative w-full aspect-square lg:aspect-[4/3] animate-float">
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-600 to-cyan-400 rounded-2xl blur-2xl opacity-30 transform rotate-6 scale-95" />
                <div className="relative h-full w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
                  <Image
                    src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=2070"
                    alt="Platform Dashboard"
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 50vw"
                    priority
                  />

                  {/* Floating Elements */}
                  <div className="absolute -right-4 top-10 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 animate-float" style={{ animationDelay: '1s' }}>
                    <div className="flex items-center gap-3">
                      <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-lg">
                        <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">Template mapped & ready</p>
                        <p className="text-xs text-slate-500">Live ServiceM8 fields connected</p>
                      </div>
                    </div>
                  </div>

                  <div className="absolute -left-4 bottom-20 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 animate-float" style={{ animationDelay: '2s' }}>
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
                        <Zap className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">AI fields detected</p>
                        <p className="text-xs text-slate-500">Blank inputs found automatically</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trusted By */}
      <section className="py-10 border-y border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
        <div className="container mx-auto px-4">
          <p className="text-center text-sm font-semibold text-slate-500 uppercase tracking-wider mb-8">
            Trusted by industry leaders
          </p>
          <div className="flex flex-wrap justify-center items-center gap-12 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
            {['Acme Corp', 'GlobalSafety', 'FireTech', 'SecureBuild', 'UrbanGuard'].map((brand) => (
              <span key={brand} className="text-xl font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-default">
                {brand}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-white dark:bg-slate-950">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              Everything you need to turn static PDFs into reusable report templates
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              From upload to generation, every step is built to help your team personalise reports faster,
              stay on-brand, and merge the right data into every document.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: FileCheck,
                title: 'Upload Existing PDF Templates',
                desc: 'Start with the reports you already use. Upload existing PDF certificates, forms, and inspection templates instead of rebuilding documents from scratch.',
                color: 'text-blue-500',
                bg: 'bg-blue-50 dark:bg-blue-900/20'
              },
              {
                icon: Zap,
                title: 'AI Blank-Field Detection',
                desc: 'Let AI scan your PDF and identify likely fillable areas automatically, so your team can map templates faster with less repetitive setup.',
                color: 'text-amber-500',
                bg: 'bg-amber-50 dark:bg-amber-900/20'
              },
              {
                icon: Layers,
                title: 'Visual Field Placement',
                desc: 'Fine-tune every template with click-to-place, drag-to-draw, resize, and reposition controls for total layout accuracy where AI needs a hand.',
                color: 'text-cyan-500',
                bg: 'bg-cyan-50 dark:bg-cyan-900/20'
              },
              {
                icon: Edit3,
                title: 'Text & Branding Editor',
                desc: 'White-out and replace logos, headers, footers, and text so every output matches your brand and your customer-facing report style.',
                color: 'text-purple-500',
                bg: 'bg-purple-50 dark:bg-purple-900/20'
              },
              {
                icon: Shield,
                title: 'Dynamic Data Mapping',
                desc: 'Insert {{handlebars}} tokens and map fields to live job, client, and company data from ServiceM8 for consistent, error-free document generation.',
                color: 'text-indigo-500',
                bg: 'bg-indigo-50 dark:bg-indigo-900/20'
              },
              {
                icon: Lock,
                title: 'Secure Cloud Storage',
                desc: 'Keep templates, generated reports, and business data protected in secure cloud storage with controlled access and reliable availability.',
                color: 'text-emerald-500',
                bg: 'bg-emerald-50 dark:bg-emerald-900/20'
              }
            ].map((feature, i) => (
              <div key={i} className="group p-8 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 dark:hover:border-blue-500/50 bg-white dark:bg-slate-900 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300">
                <div className={`w-12 h-12 rounded-xl ${feature.bg} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className={`h-6 w-6 ${feature.color}`} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                  {feature.title}
                </h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-24 bg-slate-50 dark:bg-slate-900">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              How it works
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              Go from static PDF to live, branded report workflow in three simple steps
            </p>
          </div>

          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-12">
            {/* Connecting Line */}
            <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-gradient-to-r from-blue-200 via-blue-400 to-blue-200 dark:from-blue-900 dark:via-blue-700 dark:to-blue-900" />

            {[
              {
                step: '01',
                title: 'Upload & Analyse Your PDF',
                desc: 'Import an existing report template and let AI detect blank fields and likely entry areas so setup starts with the structure already on the page.'
              },
              {
                step: '02',
                title: 'Map, Edit & Brand',
                desc: 'Place or adjust fields manually, resize and reposition elements, replace logos or text, and add {{handlebars}} tokens tied to ServiceM8 data.'
              },
              {
                step: '03',
                title: 'Generate, Store & Reuse',
                desc: 'Create finished reports with live job, client, and company data merged in automatically, then store templates and outputs securely in the cloud.'
              }
            ].map((item, i) => (
              <div key={i} className="relative flex flex-col items-center text-center">
                <div className="w-24 h-24 rounded-full bg-white dark:bg-slate-800 border-4 border-blue-100 dark:border-blue-900 flex items-center justify-center mb-6 shadow-lg z-10">
                  <span className="text-3xl font-bold text-blue-600 dark:text-blue-400">{item.step}</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{item.title}</h3>
                <p className="text-slate-600 dark:text-slate-400 max-w-xs">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-blue-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-800 opacity-10" />
        <div className="container relative mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            Ready to modernise your PDF reporting workflow?
          </h2>
          <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto">
            Build reusable templates, merge live ServiceM8 data, and deliver polished branded reports without manual rework.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/sign-up">
              <Button size="lg" className="h-14 px-8 text-lg bg-white text-blue-600 hover:bg-blue-50 shadow-xl">
                Get Started Now
              </Button>
            </Link>
            <Link href="/contact">
              <Button size="lg" variant="outline" className="h-14 px-8 text-lg border-blue-400 text-white hover:bg-blue-700">
                Contact Sales
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}