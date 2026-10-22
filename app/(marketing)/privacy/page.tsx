import Link from 'next/link';

import { LegalPage, type LegalSection } from '@/components/marketing/LegalPage';

export const metadata = {
  title: 'Privacy Policy | AI-Certificates',
  description:
    'How Cain Enabled Engineering Ltd. collects, uses, stores and protects information across AI-Certificates and AI Certify Field.',
};

const lastUpdated = '2 May 2026';

const sections: LegalSection[] = [
  {
    id: 'scope',
    title: '1. Scope',
    body: (
      <p>
        This policy applies to AI-Certificates, AI Certify Field, and related services operated by Cain
        Enabled Engineering Ltd. It covers our website, admin tools, mobile applications, and any support
        channels that link to this policy.
      </p>
    ),
  },
  {
    id: 'information-we-collect',
    title: '2. Information we collect',
    body: (
      <>
        <p>
          Depending on how you use the service, we may collect the following categories of information:
        </p>
        <ul>
          <li>
            <strong>Account information</strong> such as your name, email address, organisation name, login
            credentials, and profile settings.
          </li>
          <li>
            <strong>Business and inspection content</strong> such as certificates, reports, forms, notes,
            observations, measurements, and uploaded files.
          </li>
          <li>
            <strong>Media</strong> such as photos or videos you capture or upload for inspections, evidence,
            or support requests.
          </li>
          <li>
            <strong>Device and usage data</strong> such as device type, operating system, browser type, app
            interactions, crash reports, and diagnostic logs.
          </li>
          <li>
            <strong>Location data</strong> when you grant permission for field work, site context, or other
            app features that require it.
          </li>
          <li>
            <strong>Billing and transaction data</strong> if you purchase a subscription or paid service
            through us or a payment processor.
          </li>
          <li>
            <strong>Communications</strong> such as support requests, feedback, and messages sent through our
            forms or email channels.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'how-we-use-information',
    title: '3. How we use information',
    body: (
      <>
        <p>We use information to run and improve the platform, including to:</p>
        <ul>
          <li>Create and manage user accounts and organisation workspaces.</li>
          <li>Store and display inspection records, certificates, and generated documents.</li>
          <li>Power AI-assisted workflows, OCR, template detection, and field mapping.</li>
          <li>Process subscriptions, payments, invoices, and refunds where applicable.</li>
          <li>Provide customer support, troubleshoot bugs, and maintain service security.</li>
          <li>Send service notifications, important updates, and account-related communications.</li>
          <li>Meet legal, tax, compliance, and audit obligations.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'legal-bases-and-sharing',
    title: '4. Legal bases and sharing',
    body: (
      <>
        <p>
          Where applicable, we rely on contract performance, legitimate interests, consent, and legal
          obligations to process personal data. We do not sell personal information.
        </p>
        <p>
          We may share information with service providers that help us host, secure, analyse, process
          payments, send communications, or run AI and document-processing features. We may also share data
          with organisation administrators when the account is managed by a business customer, or if we are
          required to do so by law.
        </p>
      </>
    ),
  },
  {
    id: 'retention-and-deletion',
    title: '5. Data retention and deletion',
    body: (
      <>
        <p>
          We keep personal information only for as long as necessary to provide the service, meet legal and
          accounting obligations, resolve disputes, and enforce agreements. Some inspection records or audit
          data may need to be retained longer if they form part of a customer&rsquo;s compliance history or if
          law requires it.
        </p>
        <p>
          To request deletion of your account or personal data, visit our{' '}
          <Link href="/delete-account">account deletion page</Link> or use our{' '}
          <Link href="/contact">contact page</Link>.
        </p>
      </>
    ),
  },
  {
    id: 'cookies-and-permissions',
    title: '6. Cookies, permissions, and device access',
    body: (
      <p>
        Our web app may use cookies or similar technologies for authentication, preferences, and session
        management. On mobile devices, the app may request access to the camera, photos, microphone,
        location, or notifications when those features are used. You can manage many permissions in your
        device settings.
      </p>
    ),
  },
  {
    id: 'security',
    title: '7. Security',
    body: (
      <p>
        We use reasonable technical and organisational safeguards to protect information, including access
        controls, secure hosting, and monitoring for suspicious activity. No system is completely secure, so
        we cannot guarantee absolute security.
      </p>
    ),
  },
  {
    id: 'international-transfers',
    title: '8. International transfers',
    body: (
      <p>
        If data is transferred outside your country, we take steps intended to protect it appropriately,
        including using trusted service providers and contractual safeguards where required.
      </p>
    ),
  },
  {
    id: 'childrens-privacy',
    title: "9. Children's privacy",
    body: (
      <p>
        Our services are not directed to children under 13, and we do not knowingly collect personal
        information from children under 13.
      </p>
    ),
  },
  {
    id: 'changes',
    title: '10. Changes to this policy',
    body: (
      <p>
        We may update this policy from time to time. When we do, we will revise the date at the top of this
        page and, where appropriate, notify users through the service or by email.
      </p>
    ),
  },
  {
    id: 'contact',
    title: '11. Contact us',
    body: (
      <p>
        If you have questions about this policy, privacy rights, or data deletion, please use our{' '}
        <Link href="/support">support page</Link> or <Link href="/contact">contact page</Link>.
      </p>
    ),
  },
];

const highlights = [
  {
    title: 'What we collect',
    description:
      'Account details, inspection data, photos, device information, billing data, and support messages.',
  },
  {
    title: 'Why we use it',
    description:
      'To provide templates, generate reports, support AI features, process payments, and keep the service secure.',
  },
  {
    title: 'Your choices',
    description:
      'You can contact us for access, correction, deletion, or to withdraw permissions such as camera and location access.',
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Privacy Policy"
      title="Privacy Policy for AI-Certificates and AI Certify Field"
      description="This policy explains how Cain Enabled Engineering Ltd. collects, uses, stores, and protects information when you use our website, dashboard, and mobile app."
      lastUpdated={lastUpdated}
      highlights={highlights}
      sections={sections}
    />
  );
}
