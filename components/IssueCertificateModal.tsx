'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, PencilLine, Save, X } from 'lucide-react';

type IssueCertificateModalProps = {
  open: boolean;
  certificateId: number;
  certificateNumber: string;
  certificateType: string;
  defaultRecipientEmail?: string | null;
  onClose: () => void;
};

type IssueCertificateResponse = {
  certificateId: number;
  certificateNumber: string;
  certificateType: string;
  inspectionDate: string;
  detailPath: string;
  editPath: string | null;
  isEditable: boolean;
  changesNeeded: boolean;
};

type EmailResponse = {
  delivered: boolean;
  previewOnly: boolean;
  recipientEmail: string;
  subject: string;
};

const getTodayValue = () => new Date().toISOString().split('T')[0];

function getFriendlyDate(dateValue: string) {
  try {
    return new Date(dateValue).toLocaleDateString();
  } catch {
    return dateValue;
  }
}

export default function IssueCertificateModal({
  open,
  certificateId,
  certificateNumber,
  certificateType,
  defaultRecipientEmail,
  onClose,
}: IssueCertificateModalProps) {
  const router = useRouter();
  const [inspectionDate, setInspectionDate] = useState(getTodayValue());
  const [changesNeeded, setChangesNeeded] = useState(false);
  const [stage, setStage] = useState<'form' | 'created' | 'email'>('form');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdResult, setCreatedResult] = useState<IssueCertificateResponse | null>(null);
  const [recipientEmail, setRecipientEmail] = useState(defaultRecipientEmail || '');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('Your certificate copy is attached to this email.');
  const [emailStatus, setEmailStatus] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setInspectionDate(getTodayValue());
    setChangesNeeded(false);
    setStage('form');
    setError('');
    setIsSubmitting(false);
    setCreatedResult(null);
    setRecipientEmail(defaultRecipientEmail || '');
    setSubject('');
    setMessage('Your certificate copy is attached to this email.');
    setEmailStatus('');
    setIsSending(false);
  }, [defaultRecipientEmail, open]);

  const title = useMemo(() => {
    if (stage === 'created') {
      return 'Certificate issued';
    }

    if (stage === 'email') {
      return 'Email certificate';
    }

    return 'Issue new certificate';
  }, [stage]);

  const closeModal = () => {
    onClose();
  };

  const reloadList = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch(`/api/certificates/${certificateId}/issue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inspectionDate,
          changesNeeded,
        }),
      });

      const payload = (await response.json().catch(() => null)) as IssueCertificateResponse & {
        error?: string;
      } | null;

      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to create certificate copy');
      }

      if (payload?.changesNeeded) {
        const targetPath = payload.editPath || payload.detailPath;
        if (!targetPath) {
          throw new Error('The certificate was created, but no edit path is available.');
        }

        closeModal();
        router.push(targetPath);
        return;
      }

      setCreatedResult(payload as IssueCertificateResponse);
      setStage('created');
      setRecipientEmail(defaultRecipientEmail || '');
      setSubject(`Certificate ${payload?.certificateNumber || certificateNumber} - ${certificateType}`);
      setMessage('Your certificate copy is attached to this email.');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to create certificate copy');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleView = () => {
    if (!createdResult?.detailPath) {
      return;
    }

    closeModal();
    router.push(createdResult.detailPath);
  };

  const handleOpenEmail = () => {
    setEmailStatus('');
    setStage('email');
  };

  const handleSendEmail = async () => {
    if (!createdResult) {
      return;
    }

    setIsSending(true);
    setEmailStatus('');
    setError('');

    try {
      const response = await fetch(`/api/certificates/${createdResult.certificateId}/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipientEmail,
          subject,
          message,
        }),
      });

      const payload = (await response.json().catch(() => null)) as EmailResponse & { error?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to send certificate email');
      }

      setEmailStatus(
        payload?.previewOnly
          ? `Preview mode only — email not sent. Recipient: ${payload.recipientEmail}`
          : `Email sent to ${payload?.recipientEmail || recipientEmail}`
      );
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Failed to send certificate email');
    } finally {
      setIsSending(false);
    }
  };

  const handleSaveOnly = () => {
    closeModal();
    reloadList();
  };

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{title}</h2>
            <p className="mt-1 text-sm text-slate-600">
              {stage === 'form'
                ? `Create a new issue for certificate ${certificateNumber}.`
                : stage === 'created'
                  ? 'The new copy has been created. Choose what you want to do next.'
                  : 'Send the issued certificate by email as a PDF attachment.'}
            </p>
          </div>
          <button
            onClick={closeModal}
            className="rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close issue certificate modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[calc(90vh-5rem)] overflow-y-auto px-6 py-5">
          {stage === 'form' ? (
            <div className="space-y-5">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-900">Selected certificate</p>
                <p className="mt-1 text-sm text-slate-600">
                  {certificateNumber} · {certificateType}
                </p>
              </div>

              {error ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              ) : null}

              <div className="space-y-3">
                <Label htmlFor="inspectionDate">Date of new inspection</Label>
                <Input
                  id="inspectionDate"
                  type="date"
                  value={inspectionDate}
                  onChange={(event) => setInspectionDate(event.target.value)}
                />
                <p className="text-xs text-slate-500">
                  The new copy will use this as the updated inspection date.
                </p>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium text-slate-900">Are any changes needed on the certificate?</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${changesNeeded ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                    <input
                      type="radio"
                      name="changesNeeded"
                      checked={changesNeeded}
                      onChange={() => setChangesNeeded(true)}
                      className="h-4 w-4"
                    />
                    <span className="text-sm font-medium text-slate-900">Yes, open it for editing</span>
                  </label>
                  <label className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${!changesNeeded ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                    <input
                      type="radio"
                      name="changesNeeded"
                      checked={!changesNeeded}
                      onChange={() => setChangesNeeded(false)}
                      className="h-4 w-4"
                    />
                    <span className="text-sm font-medium text-slate-900">No, keep it as-is</span>
                  </label>
                </div>
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
                <Button variant="outline" onClick={closeModal} type="button">
                  Cancel
                </Button>
                <Button type="button" onClick={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting ? 'Creating copy…' : 'Create new issue'}
                </Button>
              </div>
            </div>
          ) : null}

          {stage === 'created' && createdResult ? (
            <div className="space-y-5">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                <p className="font-semibold">Certificate copy created</p>
                <p className="mt-1">
                  {createdResult.certificateNumber} · Inspection date {getFriendlyDate(createdResult.inspectionDate)}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <Button type="button" variant="outline" onClick={handleView}>
                  <PencilLine className="h-4 w-4" />
                  View
                </Button>
                <Button type="button" variant="outline" onClick={handleOpenEmail}>
                  <Mail className="h-4 w-4" />
                  Email
                </Button>
                <Button type="button" onClick={handleSaveOnly}>
                  <Save className="h-4 w-4" />
                  Save only
                </Button>
              </div>

              <div className="flex justify-end">
                <Button type="button" variant="ghost" onClick={closeModal}>
                  Close
                </Button>
              </div>
            </div>
          ) : null}

          {stage === 'email' && createdResult ? (
            <div className="space-y-5">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <p className="font-medium text-slate-900">Emailing certificate {createdResult.certificateNumber}</p>
                <p className="mt-1">The PDF will be attached to the outgoing email.</p>
              </div>

              {error ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              ) : null}

              {emailStatus ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                  {emailStatus}
                </div>
              ) : null}

              <div className="space-y-3">
                <Label htmlFor="recipientEmail">Recipient email</Label>
                <Input
                  id="recipientEmail"
                  type="email"
                  value={recipientEmail}
                  onChange={(event) => setRecipientEmail(event.target.value)}
                  placeholder="customer@example.com"
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="emailSubject">Subject</Label>
                <Input
                  id="emailSubject"
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  placeholder="Certificate subject"
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="emailMessage">Message</Label>
                <textarea
                  id="emailMessage"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  rows={5}
                  className="min-h-[7rem] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                />
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={() => setStage('created')}>
                  Back
                </Button>
                <Button type="button" onClick={handleSendEmail} disabled={isSending}>
                  {isSending ? 'Sending…' : 'Send email'}
                </Button>
                <Button type="button" variant="ghost" onClick={() => {
                  closeModal();
                  reloadList();
                }}>
                  Close
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
