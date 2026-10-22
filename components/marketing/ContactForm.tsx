'use client';

import { useState, type FormEvent } from 'react';
import { CheckCircle2, Loader2, Send } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type FormStatus = 'idle' | 'submitting' | 'success';

const initialValues = {
  firstName: '',
  lastName: '',
  email: '',
  organisation: '',
  subject: '',
  message: '',
  website: '',
};

export function ContactForm() {
  const [values, setValues] = useState(initialValues);
  const [status, setStatus] = useState<FormStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const updateField = (field: keyof typeof initialValues) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setValues((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('submitting');
    setError(null);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      const result = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        setError(result.error ?? 'Something went wrong. Please try again.');
        setStatus('idle');
        return;
      }

      setValues(initialValues);
      setStatus('success');
    } catch {
      setError('We could not reach the server. Please check your connection and try again.');
      setStatus('idle');
    }
  };

  if (status === 'success') {
    return (
      <div className="flex h-full flex-col items-start justify-center rounded-2xl border border-emerald-200 bg-emerald-50 p-8 dark:border-emerald-900/60 dark:bg-emerald-950/30">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white">
          <CheckCircle2 className="h-6 w-6" />
        </span>
        <h2 className="mt-5 text-xl font-semibold text-slate-900 dark:text-white">Message sent</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-emerald-100/80">
          Thanks for getting in touch. We have your message and will reply to the email address you
          provided.
        </p>
        <button
          type="button"
          onClick={() => setStatus('idle')}
          className="mt-6 text-sm font-semibold text-emerald-700 underline underline-offset-4 dark:text-emerald-300"
        >
          Send another message
        </button>
      </div>
    );
  }

  const isSubmitting = status === 'submitting';

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-slate-800 dark:bg-slate-900"
    >
      <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Send us a message</h2>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
        Tell us what you need and we will point you to the right workflow.
      </p>

      <div className="mt-6 grid gap-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <Label htmlFor="firstName">First name</Label>
            <Input
              id="firstName"
              name="firstName"
              autoComplete="given-name"
              required
              value={values.firstName}
              onChange={updateField('firstName')}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="lastName">Last name</Label>
            <Input
              id="lastName"
              name="lastName"
              autoComplete="family-name"
              required
              value={values.lastName}
              onChange={updateField('lastName')}
              className="mt-1.5"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={values.email}
            onChange={updateField('email')}
            className="mt-1.5"
          />
        </div>

        <div>
          <Label htmlFor="organisation">Organisation (optional)</Label>
          <Input
            id="organisation"
            name="organisation"
            autoComplete="organization"
            value={values.organisation}
            onChange={updateField('organisation')}
            className="mt-1.5"
          />
        </div>

        <div>
          <Label htmlFor="subject">Subject</Label>
          <Input
            id="subject"
            name="subject"
            required
            value={values.subject}
            onChange={updateField('subject')}
            className="mt-1.5"
          />
        </div>

        <div>
          <Label htmlFor="message">Message</Label>
          <Textarea
            id="message"
            name="message"
            rows={5}
            required
            value={values.message}
            onChange={updateField('message')}
            className="mt-1.5"
          />
        </div>

        <div className="hidden" aria-hidden>
          <Label htmlFor="website">Website</Label>
          <Input
            id="website"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={values.website}
            onChange={updateField('website')}
          />
        </div>

        {error ? (
          <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </p>
        ) : null}

        <Button
          type="submit"
          disabled={isSubmitting}
          className="h-12 w-full rounded-full bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending…
            </>
          ) : (
            <>
              Send message
              <Send className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
