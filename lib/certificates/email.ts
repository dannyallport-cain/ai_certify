import { getCertificatePdfBytes, getCertificatePdfData } from '@/lib/certificates/pdf';
import {
  getBrevoApiKey,
  getBrevoSender,
  sendBrevoTransactionalEmail,
} from '@/lib/email/brevo';

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

  const brevoApiKey = getBrevoApiKey();
  const sender = getBrevoSender();

  if (brevoApiKey && !sender) {
    throw new Error('EMAIL_FROM is required when BREVO_API_KEY is configured');
  }

  if (!brevoApiKey || !sender) {
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

  await sendBrevoTransactionalEmail({
    sender,
    to: [{ email: recipientEmail }],
    subject,
    htmlContent: `
        <p>${message}</p>
        <p>Certificate number: <strong>${certificateData.certificateNumber}</strong></p>
        <p>Inspection date: <strong>${certificateData.inspectionDate || 'Not specified'}</strong></p>
        <p>The PDF certificate is attached to this email.</p>
      `,
    textContent: `${message}\n\nCertificate number: ${certificateData.certificateNumber}\nInspection date: ${certificateData.inspectionDate || 'Not specified'}\n\nThe PDF certificate is attached to this email.`,
    attachment: [
      {
        name: `certificate-${certificateData.certificateNumber}.pdf`,
        content: Buffer.from(pdfBytes).toString('base64'),
      },
    ],
  });

  return {
    delivered: true,
    previewOnly: false,
    recipientEmail,
    subject,
  };
}
