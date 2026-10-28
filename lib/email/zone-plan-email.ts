import { getBrevoSender, sendBrevoTransactionalEmail } from './brevo';

export interface ZonePlanEmailInput {
  recipientEmail: string;
  viewerUrl: string;
  planTitle: string;
  siteName: string;
  jobReference: string;
  zoneCount: number;
  deviceCount: number;
  senderName: string;
  companyName: string;
  /** True when the recipient can add and rename zones in the hosted viewer. */
  canEdit: boolean;
}

export interface ZonePlanEmailResult {
  sent: boolean;
  messageId: string | null;
  error: string | null;
}

function buildSubject(input: ZonePlanEmailInput): string {
  const title = input.planTitle || 'Fire alarm zone plan';

  return input.siteName ? `${title} — ${input.siteName}` : title;
}

/**
 * The body is plain text on purpose, matching the rest of the transactional email in this project:
 * the plan title, site name and company name are free-form user input, so nothing is ever embedded
 * in markup where it would need escaping.
 */
export function buildZonePlanEmailText(input: ZonePlanEmailInput): string {
  const lines = [
    `${input.senderName || input.companyName || 'Your fire safety provider'} has shared a fire alarm zone plan.`,
    '',
    `Plan: ${input.planTitle || 'Fire alarm zone plan'}`,
  ];

  if (input.jobReference) {
    lines.push(`Job reference: ${input.jobReference}`);
  }

  if (input.siteName) {
    lines.push(`Site: ${input.siteName}`);
  }

  lines.push(
    `Zones: ${input.zoneCount}`,
    `Devices: ${input.deviceCount}`,
    '',
    'Open the plan:',
    input.viewerUrl,
    '',
  );

  lines.push(
    input.canEdit
      ? 'The plan opens in plan view. You can draw and adjust colour coded zones and edit the legend, including your company details, then save your changes.'
      : 'The plan opens in plan view with the colour coded zones and the legend. This link is view only.',
    '',
    'If the link does not open, copy the whole address above into your browser.',
  );

  return lines.join('\n');
}

/**
 * Sends the hosted viewer link. A missing sender or API key is reported rather than thrown, so the
 * publishing endpoint can still hand the link back for the user to copy.
 */
export async function sendZonePlanEmail(input: ZonePlanEmailInput): Promise<ZonePlanEmailResult> {
  const sender = getBrevoSender();

  if (!sender) {
    return {
      sent: false,
      messageId: null,
      error: 'Email sender is not configured (EMAIL_FROM)',
    };
  }

  try {
    const response = await sendBrevoTransactionalEmail({
      sender,
      to: [{ email: input.recipientEmail }],
      subject: buildSubject(input),
      textContent: buildZonePlanEmailText(input),
    });

    return {
      sent: true,
      messageId: response.messageId ?? response.messageIds?.[0] ?? null,
      error: null,
    };
  } catch (error) {
    return {
      sent: false,
      messageId: null,
      error: error instanceof Error ? error.message : 'Failed to send the zone plan email',
    };
  }
}
