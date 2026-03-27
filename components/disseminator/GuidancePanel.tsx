'use client';

import { useState } from 'react';
import { AlertCircle, CheckCircle2, Info, Lightbulb, Loader2, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import type { GuidanceItem, GuidanceSeverity } from '@/lib/report-disseminator/advisor';

type GuidancePanelProps = {
  items: GuidanceItem[];
  templateName: string;
  wizardStep: number;
  fields: Array<{ label: string; fieldType: string; required: boolean; hasBoundingBox: boolean }>;
  isAdmin: boolean;
};

const SEVERITY_CONFIG: Record<GuidanceSeverity, { icon: typeof Info; border: string; bg: string; text: string }> = {
  info: {
    icon: Info,
    border: 'border-blue-200 dark:border-blue-800',
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    text: 'text-blue-700 dark:text-blue-300',
  },
  tip: {
    icon: Lightbulb,
    border: 'border-amber-200 dark:border-amber-800',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    text: 'text-amber-700 dark:text-amber-300',
  },
  warning: {
    icon: AlertCircle,
    border: 'border-orange-200 dark:border-orange-800',
    bg: 'bg-orange-50 dark:bg-orange-950/30',
    text: 'text-orange-700 dark:text-orange-300',
  },
  error: {
    icon: AlertCircle,
    border: 'border-red-200 dark:border-red-800',
    bg: 'bg-red-50 dark:bg-red-950/30',
    text: 'text-red-700 dark:text-red-300',
  },
};

export function GuidancePanel({ items, templateName, wizardStep, fields, isAdmin }: GuidancePanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const fetchAiAdvice = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch('/api/admin/report-disseminator/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: wizardStep, templateName, fields }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error || `Status ${res.status}`);
      }
      const data = await res.json();
      setAiAdvice(data.advice || 'No advice returned.');
      if (isAdmin) {
        toast.error('AI call: Advisor analysis — est. ~£0.05', { duration: 4000 });
      }
    } catch (err: any) {
      setAiError(err.message || 'Failed to fetch AI advice');
    } finally {
      setAiLoading(false);
    }
  };

  const hasWarnings = items.some((i) => i.severity === 'warning' || i.severity === 'error');

  return (
    <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
      <button
        type="button"
        className="flex w-full items-center justify-between text-sm font-medium"
        onClick={() => setCollapsed(!collapsed)}
      >
        <span className="flex items-center gap-2">
          <CheckCircle2 className={`h-4 w-4 ${hasWarnings ? 'text-orange-500' : 'text-green-500'}`} />
          Guidance
          {items.length > 0 && (
            <span className="text-xs text-muted-foreground">
              ({items.length} item{items.length !== 1 ? 's' : ''})
            </span>
          )}
        </span>
        {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
      </button>

      {!collapsed && (
        <div className="space-y-2">
          {items.map((item) => {
            const cfg = SEVERITY_CONFIG[item.severity];
            const Icon = cfg.icon;
            return (
              <div key={item.id} className={`flex gap-2 rounded-md border px-3 py-2 ${cfg.border} ${cfg.bg}`}>
                <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${cfg.text}`} />
                <div className="min-w-0">
                  <p className={`text-xs font-medium ${cfg.text}`}>{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.detail}</p>
                </div>
              </div>
            );
          })}

          <div className="pt-1 border-t border-border/40">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full text-xs"
              disabled={aiLoading}
              onClick={fetchAiAdvice}
            >
              {aiLoading ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Analysing…
                </>
              ) : (
                <>
                  <Sparkles className="h-3 w-3 mr-1" />
                  Ask AI for advice (~$0.05)
                </>
              )}
            </Button>

            {aiError && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">{aiError}</p>
            )}

            {aiAdvice && (
              <div className="mt-2 rounded-md border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/30 px-3 py-2">
                <p className="text-xs font-medium text-purple-700 dark:text-purple-300 mb-1 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> AI Advice
                </p>
                <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-sans">{aiAdvice}</pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
