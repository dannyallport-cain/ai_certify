'use client';

import { useMemo, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

function maskSecret(value?: string) {
  if (!value) return '';

  if (value.length <= 8) {
    return '•'.repeat(value.length);
  }

  return `${value.slice(0, 7)}${'•'.repeat(Math.max(4, value.length - 11))}${value.slice(-4)}`;
}

interface StripeSecretFieldProps {
  label: string;
  value: string;
  placeholder: string;
  helperText: string;
}

export default function StripeSecretField({
  label,
  value,
  placeholder,
  helperText,
}: StripeSecretFieldProps) {
  const [isVisible, setIsVisible] = useState(false);

  const displayValue = useMemo(() => {
    if (!value) return '';
    return isVisible ? value : maskSecret(value);
  }, [isVisible, value]);

  return (
    <div>
      <label className="mb-1 block font-medium">{label}</label>
      <div className="relative">
        <Input
          type="text"
          value={displayValue}
          readOnly
          placeholder={placeholder}
          className="pr-12"
        />
        {value ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
            onClick={() => setIsVisible((current) => !current)}
            aria-label={isVisible ? `Hide ${label}` : `Show ${label}`}
            title={isVisible ? `Hide ${label}` : `Show ${label}`}
          >
            {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        ) : null}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{helperText}</p>
    </div>
  );
}
