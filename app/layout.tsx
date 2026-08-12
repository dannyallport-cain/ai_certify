import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Manrope } from 'next/font/google';
import { SWRConfig } from 'swr';

export const metadata: Metadata = {
  title: 'AI-Certificates - Certification Management',
  description: 'Comprehensive certification management system for BS5839-1, BS5839-6, BS5266, fire extinguisher, dry riser, gas safety, and electrical inspections.',
  icons: {
    icon: '/favicon.svg',
    apple: '/apple-touch-icon.svg'
  }
};

export const viewport: Viewport = {
  maximumScale: 1
};

const manrope = Manrope({ subsets: ['latin'] });

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`bg-white dark:bg-gray-950 text-black dark:text-white ${manrope.className}`}
      suppressHydrationWarning
    >
      <body className="min-h-[100dvh] bg-gray-50" suppressHydrationWarning>
        <SWRConfig value={{}}>
          {children}
        </SWRConfig>
      </body>
    </html>
  );
}
