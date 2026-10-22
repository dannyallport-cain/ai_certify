import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getBrevoSender, sendBrevoTransactionalEmail } from '@/lib/email/brevo';
import { buildContactEnquiryText } from '@/lib/email/contact-enquiry';

const contactSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(80),
  lastName: z.string().trim().min(1, 'Last name is required').max(80),
  email: z.string().trim().email('Enter a valid email address').max(200),
  organisation: z.string().trim().max(160).optional(),
  subject: z.string().trim().min(2, 'Add a short subject').max(160),
  message: z.string().trim().min(10, 'Please add a little more detail').max(4000),
  // Hidden field: bots fill it in, people never see it.
  website: z.string().optional(),
});

function resolveInboxAddress() {
  const explicitInbox = process.env.CONTACT_INBOX_EMAIL?.trim();

  if (explicitInbox) {
    return explicitInbox;
  }

  return getBrevoSender()?.email ?? '';
}

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (
    typeof payload === 'object' &&
    payload !== null &&
    typeof (payload as Record<string, unknown>).website === 'string' &&
    ((payload as Record<string, unknown>).website as string).length > 0
  ) {
    // Honeypot tripped: accept quietly so bots do not learn anything.
    return NextResponse.json({ ok: true });
  }

  const parsed = contactSchema.safeParse(payload);

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return NextResponse.json(
      { error: firstIssue?.message ?? 'Please check the form and try again' },
      { status: 400 },
    );
  }

  const inboxAddress = resolveInboxAddress();
  const sender = getBrevoSender();

  if (!inboxAddress || !sender) {
    console.error('[contact] email is not configured (EMAIL_FROM / CONTACT_INBOX_EMAIL)');
    return NextResponse.json(
      { error: 'Messaging is temporarily unavailable. Please email us directly instead.' },
      { status: 503 },
    );
  }

  const enquiry = {
    firstName: parsed.data.firstName,
    lastName: parsed.data.lastName,
    email: parsed.data.email,
    organisation: parsed.data.organisation,
    subject: parsed.data.subject,
    message: parsed.data.message,
  };

  try {
    await sendBrevoTransactionalEmail({
      sender,
      to: [{ email: inboxAddress }],
      subject: `Website enquiry: ${enquiry.subject}`,
      textContent: buildContactEnquiryText(enquiry),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[contact] failed to send enquiry:', error);
    return NextResponse.json(
      { error: 'We could not send your message. Please try again shortly.' },
      { status: 502 },
    );
  }
}
