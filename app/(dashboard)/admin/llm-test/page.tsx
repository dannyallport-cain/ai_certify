import { Badge } from '@/components/ui/badge';
import { AdminLlmTestClient } from '@/components/admin/AdminLlmTestClient';
import { AdminMutedNote, AdminPageHero, AdminSection } from '@/components/admin/AdminPageSection';
import { requireAdmin } from '@/lib/auth/admin';
import { Shield, Sparkles, Upload, Wand2 } from 'lucide-react';

export default async function AdminLlmTestPage() {
  await requireAdmin();

  return (
    <div className="space-y-8">
      <AdminPageHero
        eyebrow="Admin AI tools"
        title="LLM image test workspace"
        description="Upload an inspection image, send it to the internal AI worker, and review the structured response in an admin-only environment before exposing any workflow more broadly."
        tone="purple"
        icon={<Sparkles className="h-8 w-8" />}
        actions={
          <>
            <Badge variant="outline" className="border-white/40 bg-white/60 text-slate-700">
              Admin only
            </Badge>
            <Badge variant="outline" className="border-white/40 bg-white/60 text-slate-700">
              Railway worker
            </Badge>
          </>
        }
      />

      <AdminSection
        eyebrow="Testing flow"
        title="Capture, prompt, and inspect responses"
        description="Use this page to validate image uploads, optional context notes, and downstream parsing output while keeping the experience aligned with the rest of the admin workspace."
        icon={<Wand2 className="h-5 w-5" />}
        tone="blue"
      >
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              title: 'Upload an image',
              description: 'Attach a photo from disk or camera input to simulate real inspection captures.',
              icon: Upload,
              tone: 'border-blue-200 bg-blue-50/70',
              iconWrap: 'bg-blue-100 text-blue-700',
            },
            {
              title: 'Add test context',
              description: 'Include optional notes to steer extraction and compare prompt behaviour across samples.',
              icon: Sparkles,
              tone: 'border-purple-200 bg-purple-50/70',
              iconWrap: 'bg-purple-100 text-purple-700',
            },
            {
              title: 'Review structured output',
              description: 'Inspect summaries, extracted fields, report sections, and raw JSON in one place.',
              icon: Shield,
              tone: 'border-emerald-200 bg-emerald-50/70',
              iconWrap: 'bg-emerald-100 text-emerald-700',
            },
          ].map((item) => {
            const Icon = item.icon;

            return (
              <div key={item.title} className={`rounded-2xl border p-5 shadow-none ${item.tone}`}>
                <div className="space-y-4">
                  <div className={`w-fit rounded-2xl p-3 ${item.iconWrap}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-semibold text-slate-900">{item.title}</h3>
                    <p className="text-sm text-slate-600">{item.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <AdminMutedNote tone="blue">
          This route is intended for internal validation only. Use it to compare prompt variations and worker behaviour without re-enabling the public image analysis endpoint.
        </AdminMutedNote>
      </AdminSection>

      <AdminLlmTestClient />
    </div>
  );
}