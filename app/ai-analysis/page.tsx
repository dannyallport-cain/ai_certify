import ImageAnalysisCapture from '@/components/ai/ImageAnalysisCapture';

export const metadata = {
  title: 'AI Image Analysis',
  description: 'Upload or capture a photo for live OCR analysis.',
};

export default function AIAnalysisPage() {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-900">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="space-y-2">
            <div className="inline-flex items-center rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white">
              Live OCR analysis
            </div>
            <h1 className="text-2xl font-semibold">Analyze an image with AI</h1>
            <p className="text-sm text-slate-600">
              Upload an image from your device or take a photo with your camera to run live OCR analysis.
              Review the extracted text, observations, and structured report details directly on this page.
            </p>
          </div>
        </section>

        <ImageAnalysisCapture />
      </div>
    </main>
  );
}