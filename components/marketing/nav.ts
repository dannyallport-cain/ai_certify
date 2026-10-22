import type { LucideIcon } from 'lucide-react';
import {
  BookOpen,
  Briefcase,
  FileStack,
  LifeBuoy,
  Mail,
  Map,
  ScanLine,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Users,
} from 'lucide-react';

export type NavLink = {
  label: string;
  href: string;
  description?: string;
  icon?: LucideIcon;
  tag?: string;
};

export type NavGroup = {
  id: string;
  label: string;
  href?: string;
  description?: string;
  links: NavLink[];
};

export const primaryNav: NavGroup[] = [
  {
    id: 'product',
    label: 'Product',
    description: 'How the platform turns your existing documents into finished outputs.',
    links: [
      {
        label: 'Features',
        href: '/features',
        description: 'Templates, AI field detection, branding, mobile capture and output.',
        icon: Sparkles,
      },
      {
        label: 'How it works',
        href: '/how-it-works',
        description: 'Four steps from a paper certificate to a certified result.',
        icon: FileStack,
      },
      {
        label: 'AI image analysis',
        href: '/ai-analysis',
        description: 'Try live OCR and photo analysis on a real certificate.',
        icon: ScanLine,
        tag: 'Live demo',
      },
    ],
  },
  {
    id: 'pricing',
    label: 'Pricing',
    href: '/pricing',
    links: [],
  },
  {
    id: 'housing',
    label: 'Housing',
    href: '/housing-associations',
    links: [],
  },
  {
    id: 'resources',
    label: 'Resources',
    description: 'Understand the platform, the roadmap, and how we handle your data.',
    links: [
      {
        label: 'Blog',
        href: '/blog',
        description: 'Field notes on certification, reporting and compliance.',
        icon: BookOpen,
      },
      {
        label: 'Roadmap',
        href: '/roadmap',
        description: "What's shipped, what's in progress and what's next.",
        icon: Map,
      },
      {
        label: 'Security',
        href: '/security',
        description: 'How certificates, customer data and documents are protected.',
        icon: ShieldCheck,
      },
      {
        label: 'Support',
        href: '/support',
        description: 'Help with the web platform, mobile app and billing.',
        icon: LifeBuoy,
      },
    ],
  },
  {
    id: 'company',
    label: 'Company',
    description: 'Who builds AI-Certificates and how to reach us.',
    links: [
      {
        label: 'About',
        href: '/about',
        description: 'Why we build certification tooling for the field.',
        icon: Users,
      },
      {
        label: 'Careers',
        href: '/careers',
        description: 'Open roles and how we work.',
        icon: Briefcase,
      },
      {
        label: 'Contact',
        href: '/contact',
        description: 'Book a demo or ask us anything.',
        icon: Mail,
      },
    ],
  },
];

export type FooterColumn = {
  heading: string;
  links: NavLink[];
};

export const footerColumns: FooterColumn[] = [
  {
    heading: 'Product',
    links: [
      { label: 'Features', href: '/features' },
      { label: 'How it works', href: '/how-it-works' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'AI image analysis', href: '/ai-analysis' },
    ],
  },
  {
    heading: 'Solutions',
    links: [
      { label: 'Housing associations', href: '/housing-associations' },
      { label: 'Mobile capture', href: '/features#mobile-capture', icon: Smartphone },
      { label: 'Security & data', href: '/security' },
      { label: 'Book a demo', href: '/contact' },
    ],
  },
  {
    heading: 'Resources',
    links: [
      { label: 'Blog', href: '/blog' },
      { label: 'Roadmap', href: '/roadmap' },
      { label: 'Support', href: '/support' },
      { label: 'Contact', href: '/contact' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Careers', href: '/careers' },
      { label: 'Housing teams', href: '/housing-associations' },
      { label: 'Roadmap', href: '/roadmap' },
    ],
  },
];

export const legalLinks: NavLink[] = [
  { label: 'Privacy', href: '/privacy' },
  { label: 'Terms', href: '/terms' },
  { label: 'Delete account', href: '/delete-account' },
  { label: 'Support', href: '/support' },
];
