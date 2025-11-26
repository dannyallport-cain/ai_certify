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
  BarChart3, 
  Users, 
  FileCheck, 
  Lock, 
  Globe,
  Menu,
  X
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-slate-950">
      <Header />

      {/* Hero Section */}
      <section className="relative pt-20 pb-32 overflow-hidden bg-slate-950">
        <div className="absolute inset-0 bg-[url('https://placehold.co/1920x1080/0f172a/1e293b.png?text=')] opacity-20 bg-cover bg-center" />
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
                New: AI-Powered Verification
              </div>
              
              <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight tracking-tight">
                Certify with <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400">
                  Confidence & Speed
                </span>
              </h1>
              
              <p className="text-xl text-slate-400 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                The complete platform for managing fire safety certificates. 
                Automate generation, ensure compliance, and streamline your workflow with AI.
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
                    src="https://placehold.co/800x600/1e293b/ffffff?text=Dashboard+Preview"
                    alt="Platform Dashboard"
                    fill
                    className="object-cover"
                    priority
                  />
                  
                  {/* Floating Elements */}
                  <div className="absolute -right-4 top-10 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 animate-float" style={{ animationDelay: '1s' }}>
                    <div className="flex items-center gap-3">
                      <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-lg">
                        <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">Certificate Verified</p>
                        <p className="text-xs text-slate-500">Just now</p>
                      </div>
                    </div>
                  </div>

                  <div className="absolute -left-4 bottom-20 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 animate-float" style={{ animationDelay: '2s' }}>
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
                        <Zap className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">AI Analysis Complete</p>
                        <p className="text-xs text-slate-500">98% Accuracy</p>
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
              Everything you need to manage certificates
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              Powerful tools designed to streamline your workflow and ensure compliance at every step.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: FileCheck,
                title: "Smart Generation",
                desc: "Create compliant certificates in seconds with our intelligent templates.",
                color: "text-blue-500",
                bg: "bg-blue-50 dark:bg-blue-900/20"
              },
              {
                icon: Shield,
                title: "Compliance First",
                desc: "Stay up to date with BS5839-1, BS5839-6, and BS5266 standards automatically.",
                color: "text-indigo-500",
                bg: "bg-indigo-50 dark:bg-indigo-900/20"
              },
              {
                icon: Zap,
                title: "AI Automation",
                desc: "Let AI handle the repetitive tasks while you focus on inspections.",
                color: "text-amber-500",
                bg: "bg-amber-50 dark:bg-amber-900/20"
              },
              {
                icon: Lock,
                title: "Secure Storage",
                desc: "Bank-grade encryption for all your sensitive data and certificates.",
                color: "text-emerald-500",
                bg: "bg-emerald-50 dark:bg-emerald-900/20"
              },
              {
                icon: BarChart3,
                title: "Analytics Dashboard",
                desc: "Gain insights into your operations with real-time reporting tools.",
                color: "text-purple-500",
                bg: "bg-purple-50 dark:bg-purple-900/20"
              },
              {
                icon: Globe,
                title: "Access Anywhere",
                desc: "Cloud-based platform accessible from any device, anywhere in the world.",
                color: "text-cyan-500",
                bg: "bg-cyan-50 dark:bg-cyan-900/20"
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
              Three simple steps to streamline your certification process
            </p>
          </div>

          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-12">
            {/* Connecting Line */}
            <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-gradient-to-r from-blue-200 via-blue-400 to-blue-200 dark:from-blue-900 dark:via-blue-700 dark:to-blue-900" />

            {[
              {
                step: "01",
                title: "Input Data",
                desc: "Enter inspection details manually or import from your existing tools."
              },
              {
                step: "02",
                title: "AI Processing",
                desc: "Our AI validates data against regulations and generates the certificate."
              },
              {
                step: "03",
                title: "Issue & Track",
                desc: "Send to clients instantly and track status in your dashboard."
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
        <div className="absolute inset-0 bg-[url('https://placehold.co/1920x600/2563eb/1d4ed8.png?text=')] opacity-10 bg-cover bg-center" />
        <div className="container relative mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            Ready to transform your workflow?
          </h2>
          <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto">
            Join thousands of safety professionals who trust AI-Certificates for their certification needs.
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
