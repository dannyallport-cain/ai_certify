import Link from 'next/link';

import { LegalPage, type LegalSection } from '@/components/marketing/LegalPage';

export const metadata = {
  title: 'Terms of Service | AI-Certificates',
  description:
    'The terms that govern use of AI-Certificates, AI Certify Field, and related services from Cain Enabled Engineering Ltd.',
};

const lastUpdated = '2 May 2026';

const sections: LegalSection[] = [
  {
    id: 'acceptance',
    title: '1. Acceptance of terms',
    body: (
      <p>
        By accessing or using AI-Certificates, AI Certify Field, or related services, you agree to these
        terms and any additional policies referenced here, including our{' '}
        <Link href="/privacy">privacy policy</Link>.
      </p>
    ),
  },
  {
    id: 'the-service',
    title: '2. The service',
    body: (
      <p>
        Our platform helps businesses create, store, and manage certificates, inspection records, reports,
        templates, and related data. Some features may depend on a subscription, external integrations, or
        device permissions such as camera and location access.
      </p>
    ),
  },
  {
    id: 'account-registration',
    title: '3. Account registration',
    body: (
      <p>
        You may need to create an account to use certain features. You must provide accurate information,
        keep your credentials confidential, and notify us promptly if you believe your account has been
        compromised.
      </p>
    ),
  },
  {
    id: 'user-content',
    title: '4. User content',
    body: (
      <p>
        You retain ownership of the content you upload or create in the service. You grant us a limited
        licence to host, process, transmit, display, and back up that content solely to operate and improve
        the service, provide support, and fulfil our contractual obligations.
      </p>
    ),
  },
  {
    id: 'ai-features',
    title: '5. AI and automation features',
    body: (
      <p>
        AI-assisted suggestions, OCR, and template-detection tools are provided to help streamline your
        workflow. These features may produce incomplete or inaccurate output. You are responsible for
        reviewing and approving all generated content before using it in production, compliance, or customer
        communications.
      </p>
    ),
  },
  {
    id: 'subscriptions',
    title: '6. Subscriptions and payments',
    body: (
      <p>
        If you purchase a subscription or other paid service, you agree to the pricing, billing cycle,
        renewal, cancellation, and refund terms shown at the point of purchase. We may use third-party
        payment processors to handle transactions securely.
      </p>
    ),
  },
  {
    id: 'acceptable-use',
    title: '7. Acceptable use',
    body: (
      <p>
        You must not misuse the service, including by attempting unauthorised access, interfering with
        system integrity, uploading malicious code, scraping without permission, or using the platform in
        violation of applicable law or regulation.
      </p>
    ),
  },
  {
    id: 'availability',
    title: '8. Service changes and availability',
    body: (
      <p>
        We may update, suspend, or discontinue features from time to time. We do not guarantee uninterrupted
        availability, and maintenance or outages may temporarily affect access to the service.
      </p>
    ),
  },
  {
    id: 'termination',
    title: '9. Suspension and termination',
    body: (
      <p>
        We may suspend or terminate access if we reasonably believe you have breached these terms, created a
        security risk, or used the service in a way that may harm us, other users, or third parties.
      </p>
    ),
  },
  {
    id: 'intellectual-property',
    title: '10. Intellectual property',
    body: (
      <p>
        The service, including its software, branding, and content provided by us, remains the property of
        Cain Enabled Engineering Ltd. and its licensors. You may not copy, modify, distribute, or create
        derivative works except as permitted by law or with our written consent.
      </p>
    ),
  },
  {
    id: 'liability',
    title: '11. Disclaimer and liability',
    body: (
      <p>
        The service is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis to the extent
        permitted by law. To the maximum extent permitted by law, we are not liable for indirect, incidental,
        consequential, or special damages, or for losses arising from inaccurate user input, third-party
        services, or use of generated content without review.
      </p>
    ),
  },
  {
    id: 'governing-law',
    title: '12. Governing law and changes',
    body: (
      <p>
        These terms are governed by the laws applicable in the United Kingdom unless local mandatory law
        requires otherwise. We may update these terms from time to time, and the revised version will be
        posted on this page with a new effective date.
      </p>
    ),
  },
  {
    id: 'contact',
    title: '13. Contact',
    body: (
      <p>
        If you have questions about these terms, please use our <Link href="/support">support page</Link> or{' '}
        <Link href="/contact">contact page</Link>.
      </p>
    ),
  },
];

const highlights = [
  {
    title: 'Use the service lawfully',
    description: 'Use the platform only for lawful business purposes and in accordance with these terms.',
  },
  {
    title: 'Keep your account secure',
    description: 'You are responsible for the activity on your account and for keeping credentials safe.',
  },
  {
    title: 'Know the limits',
    description: 'AI features assist with workflows, but you remain responsible for the final output and use.',
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Terms and Conditions"
      title="Terms of Service for AI-Certificates and AI Certify Field"
      description="These terms govern your use of our website, dashboard, and mobile application provided by Cain Enabled Engineering Ltd."
      lastUpdated={lastUpdated}
      highlights={highlights}
      sections={sections}
    />
  );
}
