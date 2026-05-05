export type BrevoSender = {
  email: string;
  name?: string;
};

export type BrevoRecipient = {
  email: string;
  name?: string;
};

export type BrevoAttachment = {
  name: string;
  content?: string;
  url?: string;
};

export type BrevoTransactionalEmailInput = {
  sender: BrevoSender;
  to: BrevoRecipient[];
  subject: string;
  htmlContent: string;
  textContent?: string;
  attachment?: BrevoAttachment[];
};

type BrevoSendResponse = {
  messageId?: string;
  messageIds?: string[];
};

const EMAIL_FROM_PATTERN = /^(.+?)\s*<([^>]+)>$/;

function getEmailFromAddress() {
  return process.env.EMAIL_FROM || process.env.NEXT_PUBLIC_APP_EMAIL_FROM || '';
}

export function getBrevoApiKey() {
  return process.env.BREVO_API_KEY || '';
}

export function parseEmailFromAddress(rawAddress: string): BrevoSender | null {
  const value = rawAddress.trim();

  if (!value) {
    return null;
  }

  const match = value.match(EMAIL_FROM_PATTERN);
  if (match) {
    const name = match[1].trim().replace(/^"|"$/g, '');
    const email = match[2].trim();

    if (!email) {
      return null;
    }

    return name ? { email, name } : { email };
  }

  return { email: value };
}

export function getBrevoSender() {
  return parseEmailFromAddress(getEmailFromAddress());
}

export async function sendBrevoTransactionalEmail(
  input: BrevoTransactionalEmailInput
): Promise<BrevoSendResponse> {
  const apiKey = getBrevoApiKey();

  if (!apiKey) {
    throw new Error('BREVO_API_KEY is required');
  }

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sender: input.sender,
      to: input.to,
      subject: input.subject,
      htmlContent: input.htmlContent,
      textContent: input.textContent,
      attachment: input.attachment,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to send Brevo email: ${body}`);
  }

  return (await response.json()) as BrevoSendResponse;
}
