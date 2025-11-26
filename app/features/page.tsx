import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Footer';
import { ArrowRight, CheckCircle2, Shield, Zap, BarChart3, Users, FileText, Lock, Globe, Clock } from 'lucide-react';

export default function FeaturesPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-slate-950">
      <Header />
      
      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden bg-slate-950">
        <div className="absolute inset-0 bg-[url('https://placehold.co/1920x1080/0f172a/1e293b.png?text=')] opacity-20 bg-cover bg-center" />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/50 via-slate-950/80 to-slate-950" />
        
        <div className="container relative mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
            Powerful Features for <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
              Modern Certification
            </span>
          </h1>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto">
            Discover how AI-Certificates can transform your certification process with AI-powered tools and seamless workflows.
          </p>
        </div>
      </section>

      {/* Main Features */}
      <section className="py-20 bg-white dark:bg-slate-950">
        <div className="container mx-auto px-4">
          {[
            {
              title: "AI-Powered Generation",
              description: "Generate compliant certificates instantly using our advanced AI models. Simply input the data and let us handle the formatting and validation.",
              benefits: ["99% faster than manual creation", "Automatic regulation compliance checks", "Smart error detection"],
              icon: Zap,
              color: "text-amber-500",
              bg: "bg-amber-50 dark:bg-amber-900/20",
              image: "https://placehold.co/800x600/1e293b/ffffff?text=AI+Generation"
            },
            {
              title: "Secure Cloud Storage",
              description: "Keep your certificates safe and accessible anywhere. Our bank-grade encryption ensures your sensitive data remains protected.",
              benefits: ["AES-256 encryption", "Automatic backups", "Role-based access control"],
              icon: Lock,
              color: "text-emerald-500",
              bg: "bg-emerald-50 dark:bg-emerald-900/20",
              image: "https://placehold.co/800x600/1e293b/ffffff?text=Secure+Storage"
            },
            {
              title: "Real-time Analytics",
              description: "Gain valuable insights into your certification operations. Track issuance rates, expiry dates, and team performance.",
              benefits: ["Customizable dashboards", "Exportable reports", "Trend analysis"],
              icon: BarChart3,
              color: "text-purple-500",
              bg: "bg-purple-50 dark:bg-purple-900/20",
              image: "https://placehold.co/800x600/1e293b/ffffff?text=Analytics"
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
