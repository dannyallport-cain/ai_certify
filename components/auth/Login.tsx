'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Footer } from '@/components/landing/Footer';
import {
  resendVerificationEmail,
  signIn,
  signUp
} from '@/app/(login)/actions';
import { ActionState } from '@/lib/auth/middleware';

export function Login({ mode = 'signin' }: { mode?: 'signin' | 'signup' }) {
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect');
  const priceId = searchParams.get('priceId');
  const inviteId = searchParams.get('inviteId');
  const emailFromQuery = searchParams.get('email');
  const verified = searchParams.get('verified');
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    mode === 'signin' ? signIn : signUp,
    { error: '' }
  );
  const [resendState, resendAction, resendPending] = useActionState<
    ActionState,
    FormData
  >(resendVerificationEmail, { error: '' });
  const alternateModeParams = new URLSearchParams();

  if (redirect) {
    alternateModeParams.set('redirect', redirect);
  }

  if (priceId) {
    alternateModeParams.set('priceId', priceId);
  }

  if (inviteId) {
    alternateModeParams.set('inviteId', inviteId);
  }

  const alternateModeHref = `${
    mode === 'signin' ? '/sign-up' : '/sign-in'
  }${alternateModeParams.toString() ? `?${alternateModeParams.toString()}` : ''}`;

  return (
    <div className="flex min-h-[100dvh] flex-col bg-gradient-to-b from-slate-50 via-white to-slate-100">
      <main className="flex-1">
        <div className="mx-auto flex w-full max-w-6xl flex-col px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
          <div className="mb-10 flex items-center justify-center gap-3 rounded-full border border-slate-200 bg-white/80 px-4 py-2 shadow-sm backdrop-blur sm:self-center">
            <Shield className="h-5 w-5 text-cyan-500" />
            <span className="text-sm font-semibold tracking-wide text-slate-700">
              AI-Certificates · Secure sign in
            </span>
          </div>

          <div className="grid flex-1 items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
            <section className="space-y-6 text-center lg:text-left">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-950 shadow-lg shadow-slate-900/10 lg:mx-0">
                <Shield className="h-8 w-8 text-cyan-400" />
              </div>

              <div className="space-y-4">
                <p className="text-sm font-semibold uppercase tracking-[0.35em] text-cyan-700">
                  Branded certification management
                </p>
                <h1 className="text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
                  AI-Certificates
                </h1>
                <p className="mx-auto max-w-2xl text-base leading-7 text-slate-600 lg:mx-0">
                  Sign in to manage certificates, approvals, and customer
                  workflows in one secure workspace with your company branding
                  throughout.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm">
                  <p className="text-sm font-semibold text-slate-950">
                    Secure access
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Keep accounts protected with verified email sign-in.
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm">
                  <p className="text-sm font-semibold text-slate-950">
                    Branded outputs
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Deliver documents and certificates with consistent branding.
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm">
                  <p className="text-sm font-semibold text-slate-950">
                    Team workflows
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Move faster with shared access across your organisation.
                  </p>
                </div>
              </div>
            </section>

            <section className="mx-auto w-full max-w-md">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-8">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950">
                    <Shield className="h-6 w-6 text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-700">
                      Welcome back
                    </p>
                    <h2 className="text-xl font-semibold text-slate-950">
                      {mode === 'signin'
                        ? 'Sign in to your account'
                        : 'Create your account'}
                    </h2>
                  </div>
                </div>

                <form className="space-y-5" action={formAction}>
                  <input type="hidden" name="redirect" value={redirect || ''} />
                  <input type="hidden" name="priceId" value={priceId || ''} />
                  <input type="hidden" name="inviteId" value={inviteId || ''} />

                  {mode === 'signup' && (
                    <>
                      <div className="space-y-2">
                        <Label
                          htmlFor="name"
                          className="text-sm font-medium text-slate-700"
                        >
                          Name
                        </Label>
                        <Input
                          id="name"
                          name="name"
                          type="text"
                          autoComplete="name"
                          required
                          maxLength={100}
                          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 shadow-sm placeholder:text-slate-400 focus:border-cyan-500 focus:ring-cyan-500"
                          placeholder="Your full name"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="company"
                          className="text-sm font-medium text-slate-700"
                        >
                          Company <span className="text-slate-400">(optional)</span>
                        </Label>
                        <Input
                          id="company"
                          name="company"
                          type="text"
                          autoComplete="organization"
                          maxLength={255}
                          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 shadow-sm placeholder:text-slate-400 focus:border-cyan-500 focus:ring-cyan-500"
                          placeholder="Your company name"
                        />
                      </div>

                      <div className="grid gap-5 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label
                            htmlFor="addressLine1"
                            className="text-sm font-medium text-slate-700"
                          >
                            Address line 1
                          </Label>
                          <Input
                            id="addressLine1"
                            name="addressLine1"
                            type="text"
                            autoComplete="address-line1"
                            required
                            maxLength={255}
                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 shadow-sm placeholder:text-slate-400 focus:border-cyan-500 focus:ring-cyan-500"
                            placeholder="Street address"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label
                            htmlFor="addressLine2"
                            className="text-sm font-medium text-slate-700"
                          >
                            Address line 2
                          </Label>
                          <Input
                            id="addressLine2"
                            name="addressLine2"
                            type="text"
                            autoComplete="address-line2"
                            maxLength={255}
                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 shadow-sm placeholder:text-slate-400 focus:border-cyan-500 focus:ring-cyan-500"
                            placeholder="Town, city, or area"
                          />
                        </div>
                      </div>

                      <div className="grid gap-5 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label
                            htmlFor="postcode"
                            className="text-sm font-medium text-slate-700"
                          >
                            Postcode
                          </Label>
                          <Input
                            id="postcode"
                            name="postcode"
                            type="text"
                            autoComplete="postal-code"
                            required
                            maxLength={20}
                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 shadow-sm placeholder:text-slate-400 focus:border-cyan-500 focus:ring-cyan-500"
                            placeholder="Postal code"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label
                            htmlFor="mobileNumber"
                            className="text-sm font-medium text-slate-700"
                          >
                            Contact mobile number
                          </Label>
                          <Input
                            id="mobileNumber"
                            name="mobileNumber"
                            type="tel"
                            autoComplete="tel-mobile"
                            required
                            maxLength={50}
                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 shadow-sm placeholder:text-slate-400 focus:border-cyan-500 focus:ring-cyan-500"
                            placeholder="Mobile number"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <div className="space-y-2">
                    <Label
                      htmlFor="email"
                      className="text-sm font-medium text-slate-700"
                    >
                      Email
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      defaultValue={state.email || emailFromQuery || ''}
                      required
                      maxLength={255}
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 shadow-sm placeholder:text-slate-400 focus:border-cyan-500 focus:ring-cyan-500"
                      placeholder="Enter your email"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="password"
                      className="text-sm font-medium text-slate-700"
                    >
                      Password
                    </Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete={
                        mode === 'signin' ? 'current-password' : 'new-password'
                      }
                      defaultValue={state.password || ''}
                      required
                      minLength={8}
                      maxLength={100}
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 shadow-sm placeholder:text-slate-400 focus:border-cyan-500 focus:ring-cyan-500"
                      placeholder="Enter your password"
                    />
                  </div>

                  {state?.error && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {state.error}
                    </div>
                  )}

                  {state?.success && (
                    <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                      {state.success}
                      {mode === 'signup' && state.email ? (
                        <div className="mt-2 break-all font-medium">
                          {state.email}
                        </div>
                      ) : null}
                    </div>
                  )}

                  {mode === 'signin' && verified === '1' && (
                    <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                      Email verified. You can sign in now.
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="flex w-full items-center justify-center rounded-full bg-cyan-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
                    disabled={pending}
                  >
                    {pending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : mode === 'signin' ? (
                      'Sign in'
                    ) : (
                      'Sign up'
                    )}
                  </Button>
                </form>

                {mode === 'signin' && (state?.unverified || resendState?.success) && (
                  <form className="mt-4 space-y-3" action={resendAction}>
                    <input
                      type="hidden"
                      name="email"
                      value={state.email || resendState.email || ''}
                    />
                    <input type="hidden" name="redirect" value={redirect || ''} />
                    <input type="hidden" name="priceId" value={priceId || ''} />

                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                      {resendState?.success ||
                        'Need a new verification email? We can send another one.'}
                    </div>

                    {resendState?.error && (
                      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {resendState.error}
                      </div>
                    )}

                    <Button
                      type="submit"
                      variant="outline"
                      className="w-full rounded-full border-slate-300 text-slate-700 hover:bg-slate-50"
                      disabled={resendPending}
                    >
                      {resendPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        'Resend verification email'
                      )}
                    </Button>
                  </form>
                )}

                <div className="mt-6">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-200" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="bg-white px-3 text-slate-500">
                        {mode === 'signin'
                          ? 'New to our platform?'
                          : 'Already have an account?'}
                      </span>
                    </div>
                  </div>

                  <div className="mt-6">
                    <Link
                      href={alternateModeHref}
                      className="inline-flex w-full items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
                    >
                      {mode === 'signin'
                        ? 'Create an account'
                        : 'Sign in to existing account'}
                    </Link>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
