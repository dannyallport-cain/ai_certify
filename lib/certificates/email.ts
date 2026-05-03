import { getCertificatePdfBytes, getCertificatePdfData } from '@/lib/certificates/pdf';

export type SendCertificateEmailInput = {
  certificateId: number;
  teamId?: number;
  recipientEmail?: string | null;
  subject?: string;
  message?: string;
};

export type SendCertificateEmailResult = {
  delivered: boolean;
  previewOnly: boolean;
  recipientEmail: string;
  subject: string;
};

function getEmailFromAddress() {
  return process.env.EMAIL_FROM || process.env.NEXT_PUBLIC_APP_EMAIL_FROM || '';
}

function getResendApiKey() {
  return process.env.RESEND_API_KEY || '';
}

export async function sendCertificateEmail(
  input: SendCertificateEmailInput
): Promise<SendCertificateEmailResult> {
  const certificateData = await getCertificatePdfData(input.certificateId, input.teamId);

  if (!certificateData) {
    throw new Error('Certificate not found');
  }

  const recipientEmail = (input.recipientEmail || certificateData.customer.email || '').trim();

  if (!recipientEmail) {
    throw new Error('Recipient email is required');
  }

  const subject =
    input.subject?.trim() ||
    `Certificate ${certificateData.certificateNumber} - ${certificateData.certificateType}`;

  const message = input.message?.trim() || 'Your certificate copy is attached to this email.';
  const pdfBytes = await getCertificatePdfBytes(input.certificateId, input.teamId);

  if (!pdfBytes) {
    throw new Error('Failed to generate PDF');
  }

  const resendApiKey = getResendApiKey();
  const emailFrom = getEmailFromAddress();

  if (!resendApiKey || !emailFrom) {
    console.log(
      `[certificate-email] Preview only for ${recipientEmail}: ${subject}\n${message}\nCertificate: ${certificateData.certificateNumber}`
    );

    return {
      delivered: false,
      previewOnly: true,
      recipientEmail,
      subject,
    };
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: emailFrom,
      to: [recipientEmail],
      subject,
      html: `
        <p>${message}</p>
        <p>Certificate number: <strong>${certificateData.certificateNumber}</strong></p>
        <p>Inspection date: <strong>${certificateData.inspectionDate || 'Not specified'}</strong></p>
        <p>The PDF certificate is attached to this email.</p>
      `,
      text: `${message}\n\nCertificate number: ${certificateData.certificateNumber}\nInspection date: ${certificateData.inspectionDate || 'Not specified'}\n\nThe PDF certificate is attached to this email.`,
      attachments: [
        {
          filename: `certificate-${certificateData.certificateNumber}.pdf`,
          content: Buffer.from(pdfBytes).toString('base64'),
        },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to send certificate email: ${body}`);
  }

  return {
    delivered: true,
    previewOnly: false,
    recipientEmail,
    subject,
  };
}
