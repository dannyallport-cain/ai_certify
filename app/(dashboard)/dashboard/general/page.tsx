'use client';

import { useActionState, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { updateAccount } from '@/app/(login)/actions';
import { User, type EicrProfileDefaults } from '@/lib/db/schema';
import ProfileMediaSettings from '@/components/settings/ProfileMediaSettings';
import TeamBrandingSettings from '@/components/settings/TeamBrandingSettings';
import IntegrationTestCard from '@/components/integrations/IntegrationTestCard';
import useSWR from 'swr';
import { Suspense } from 'react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type TeamProfile = {
  name?: string;
  logoDataUri: string | null;
};

const SCHEME_OPTIONS = [
  'Gas Safe',
  'NICEIC',
  'NAPIT',
  'ELECSA',
  'Stroma',
  'SELECT',
  'BAFE'
] as const;

type ActionState = {
  name?: string;
  error?: string;
  success?: string;
};

type AccountFormProps = {
  state: ActionState;
  nameValue?: string;
  emailValue?: string;
  profileDefaults?: EicrProfileDefaults | null;
};

function AccountForm({
  state,
  nameValue = '',
  emailValue = '',
  profileDefaults = null
}: AccountFormProps) {
  const [selectedSchemes, setSelectedSchemes] = useState<string[]>(
    profileDefaults?.approvalSchemes ?? []
  );

  useEffect(() => {
    setSelectedSchemes(profileDefaults?.approvalSchemes ?? []);
  }, [profileDefaults]);

  const mergedProfileDefaults = {
    ...(profileDefaults ?? {}),
    approvalSchemes: selectedSchemes
  };

  return (
    <>
      <div>
        <Label htmlFor="name" className="mb-2">
          Name
        </Label>
        <Input
          id="name"
          name="name"
          placeholder="Enter your name"
          defaultValue={state.name || nameValue}
          required
        />
      </div>
      <div>
        <Label htmlFor="email" className="mb-2">
          Email
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="Enter your email"
          defaultValue={emailValue}
          required
        />
      </div>

      <div className="space-y-3">
        <Label className="mb-2">Approval Schemes</Label>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {SCHEME_OPTIONS.map((scheme) => (
            <label
              key={scheme}
              className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
            >
              <input
                type="checkbox"
                checked={selectedSchemes.includes(scheme)}
                onChange={() =>
                  setSelectedSchemes((current) =>
                    current.includes(scheme)
                      ? current.filter((item) => item !== scheme)
                      : [...current, scheme]
                  )
                }
                className="h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
              />
              <span>{scheme}</span>
            </label>
          ))}
        </div>
      </div>

      <input
        type="hidden"
        name="eicrProfileDefaults"
        value={JSON.stringify(mergedProfileDefaults)}
      />
    </>
  );
}

function AccountFormWithData({ state }: { state: ActionState }) {
  const { data: user } = useSWR<User>('/api/user', fetcher);
  return (
    <AccountForm
      state={state}
      nameValue={user?.name ?? ''}
      emailValue={user?.email ?? ''}
      profileDefaults={user?.eicrProfileDefaults ?? null}
    />
  );
}

export default function GeneralPage() {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    updateAccount,
    {}
  );
  const { data: team } = useSWR<TeamProfile>('/api/team', fetcher);

  return (
    <section className="flex-1 space-y-6 p-4 lg:p-8">
      <h1 className="text-lg lg:text-2xl font-medium text-gray-900 mb-6">
        General Settings
      </h1>

      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" action={formAction}>
            <Suspense fallback={<AccountForm state={state} />}>
              <AccountFormWithData state={state} />
            </Suspense>
            {state.error && (
              <p className="text-red-500 text-sm">{state.error}</p>
            )}
            {state.success && (
              <p className="text-green-500 text-sm">{state.success}</p>
            )}
            <Button
              type="submit"
              className="bg-orange-500 hover:bg-orange-600 text-white"
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Company Logo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            This logo is shared across the profile page and generated documents so users see the same branding everywhere.
          </p>
          {team === undefined ? (
            <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600">
              Loading company logo...
            </div>
          ) : team?.logoDataUri ? (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <img
                  src={team.logoDataUri}
                  alt={`${team.name || 'Team'} logo`}
                  className="h-16 w-auto max-w-[240px] object-contain"
                />
                <div className="space-y-1">
                  <p className="font-medium text-gray-900">{team.name || 'Team'} logo</p>
                  <p className="text-sm text-gray-600">
                    The current logo stored for your team. Update it in Company Branding if needed.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600">
              No company logo has been uploaded yet.
            </div>
          )}
        </CardContent>
      </Card>

      <TeamBrandingSettings />
      <ProfileMediaSettings />

      <Card>
        <CardHeader>
          <CardTitle>Integration diagnostics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            Run live connectivity checks against the services that support billing, storage, and AI-assisted workflows.
          </p>

          <div className="grid gap-4 xl:grid-cols-2">
            <IntegrationTestCard
              title="R2 communication test"
              description="Upload, verify, and delete a tiny object in Cloudflare R2 to confirm the storage bucket and credentials are working."
              serviceLabel="R2"
              endpointPath="/api/admin/r2/test"
              tone="green"
              buttonLabel="Test R2 connection"
              successLabel="R2 round-trip verified successfully."
              hint="This performs a real upload → head → delete cycle using the configured R2 credentials."
            />

            <IntegrationTestCard
              title="Database communication test"
              description="Execute a lightweight live query against the database to confirm the admin connection can read from the primary tables."
              serviceLabel="Database"
              endpointPath="/api/admin/database/test"
              tone="slate"
              buttonLabel="Test database connection"
              successLabel="Database connectivity verified successfully."
              hint="This performs a direct read against the users table to confirm the database is reachable."
            />

            <IntegrationTestCard
              title="AI worker communication test"
              description="Send a tiny test image to the protected AI workflow endpoint to confirm the worker can process requests end to end."
              serviceLabel="AI Worker"
              endpointPath="/api/admin/llm-test"
              tone="purple"
              buttonLabel="Test AI worker"
              successLabel="AI worker connection verified successfully."
              requestBody={{
                imageBase64:
                  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO5pD0QAAAAASUVORK5CYII=',
                reportType: 'integration-test',
                inspectionType: 'connectivity-check',
                requestedSections: ['summary', 'observations', 'reportSections'],
                metadata: {
                  source: 'dashboard-settings',
                  testType: 'ai-worker',
                },
              }}
              hint="This sends a small inline PNG through the admin AI endpoint so OCR, routing, and worker handling can be verified together."
            />
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
