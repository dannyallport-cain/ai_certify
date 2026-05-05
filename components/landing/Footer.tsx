import Link from 'next/link';
import { Shield } from 'lucide-react';

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-slate-950 text-slate-400 py-12 border-t border-slate-800">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-12">
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-6 w-6 text-blue-500" />
              <span className="text-xl font-bold text-white">AI-Certificates</span>
            </div>
            <p className="max-w-sm">
              The leading platform for professional certification management.
              Operated by Cain Enabled Ltd.
            </p>
          </div>
        </div>
        
        <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm">© {year} AI-Certificates. All rights reserved.</p>
          <div className="flex flex-wrap gap-6 text-sm">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
            <Link href="/support" className="hover:text-white transition-colors">Support</Link>
            <Link href="/delete-account" className="hover:text-white transition-colors">Delete Account</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
