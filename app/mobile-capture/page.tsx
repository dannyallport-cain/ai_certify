import MobileCaptureClient from '@/components/settings/MobileCaptureClient';
import { verifyMobileCaptureToken } from '@/lib/auth/mobile-capture';

export const dynamic = 'force-dynamic';

type MobileCapturePageProps = {
  searchParams: Promise<{
    token?: string;
  }>;
};

function InvalidCapturePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-6">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200">
        <h1 className="text-xl font-semibold text-slate-900">This secure capture link is no longer valid</h1>
        <p className="mt-3 text-sm text-slate-600">
          This mobile capture page is opened from a secure link or QR code. Please ask the user to return to
          Settings and generate a fresh mobile capture link before trying again.
        </p>
      </div>
    </main>
  );
}

export default async function MobileCapturePage({ searchParams }: MobileCapturePageProps) {
  const { token } = await searchParams;

  if (!token) {
    return <InvalidCapturePage />;
  }

  try {
    const { kind } = await verifyMobileCaptureToken(token);

    return <MobileCaptureClient token={token} kind={kind} />;
  } catch {
    return <InvalidCapturePage />;
  }
}