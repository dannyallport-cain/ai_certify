import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Footer';
import { ArrowRight, CheckCircle2, Shield, Zap, BarChart3, Users, FileText, Lock, Globe, Clock, Layers, Edit3 } from 'lucide-react';

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
              image: "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?auto=format&fit=crop&q=80&w=2070"
            },
            {
              title: "Visual Report Template Builder",
              description: "Transform any existing PDF into a living, reusable template. Upload your report, mark field areas by clicking or drawing boxes, and let our AI automatically detect blank input regions using intelligent boundary analysis. Every field can be mapped to a specific data source — no coding, no PDF editing tools required.",
              benefits: ["AI auto-detects blank fields in any PDF", "Point-and-click field placement with resizable handles", "Guided wizard maps each field to job or client data"],
              icon: Layers,
              color: "text-blue-500",
              bg: "bg-blue-50 dark:bg-blue-900/20",
              image: "https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&q=80&w=2070"
            },
            {
              title: "Dynamic Text & Branding Editor",
              description: "Take full control of every piece of text in your PDF templates. Select any word, heading, footer, or logo and choose to white it out, replace it with custom text, or insert dynamic handlebars tokens that automatically fill in the right details at generation time — from job addresses to engineer names and company contact info.",
              benefits: [
                "White-out or replace any text, footer, logo, or graphic",
                "Insert \u007b\u007bjob.address\u007d\u007d, \u007b\u007bclient.name\u007d\u007d, \u007b\u007bcompany.phone\u007d\u007d and 14+ more tokens",
                "Full control: font, size, colour, weight, style & alignment"
              ],
              icon: Edit3,
              color: "text-purple-500",
              bg: "bg-purple-50 dark:bg-purple-900/20",
              image: "https://images.unsplash.com/photo-1542744095-291d1f67b221?auto=format&fit=crop&q=80&w=2070"
            },
            {
              title: "Secure Cloud Storage",
              description: "Keep your certificates safe and accessible anywhere. Our bank-grade encryption ensures your sensitive data remains protected.",
              benefits: ["AES-256 encryption", "Automatic backups", "Role-based access control"],
              icon: Lock,
              color: "text-emerald-500",
              bg: "bg-emerald-50 dark:bg-emerald-900/20",
              image: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&q=80&w=2070"
            },
            {
              title: "Real-time Analytics",
              description: "Gain valuable insights into your certification operations. Track issuance rates, expiry dates, and team performance.",
              benefits: ["Customisable dashboards", "Exportable reports", "Trend analysis"],
              icon: BarChart3,
              color: "text-indigo-500",
              bg: "bg-indigo-50 dark:bg-indigo-900/20",
              image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=2070"
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
