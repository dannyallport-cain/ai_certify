import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Footer';

export default function PrivacyPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-slate-950">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-20">
        <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-8 capitalize">privacy</h1>
        <div className="prose dark:prose-invert max-w-none">
          <p className="text-lg text-slate-600 dark:text-slate-400">
            Content for the privacy page is coming soon.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
