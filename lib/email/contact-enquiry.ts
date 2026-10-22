export type ContactEnquiry = {
  firstName: string;
  lastName: string;
  email: string;
  organisation?: string;
  subject: string;
  message: string;
};

/**
 * Enquiries are delivered as plain text on purpose: the message body is
 * free-form customer input, so it never has to be embedded in markup.
 */
export function buildContactEnquiryText(enquiry: ContactEnquiry) {
  const fullName = `${enquiry.firstName} ${enquiry.lastName}`.trim();

  return [
    'New website enquiry',
    '',
    `Name: ${fullName}`,
    `Email: ${enquiry.email}`,
    enquiry.organisation ? `Organisation: ${enquiry.organisation}` : null,
    `Subject: ${enquiry.subject}`,
    '',
    enquiry.message,
  ]
    .filter((line): line is string => line !== null)
    .join('\n');
}
