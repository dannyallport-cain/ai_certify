'use client';

import { useMemo } from 'react';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface DateDropdownFieldProps {
  id: string;
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  isAutoPopulated?: boolean;
  autoTitle?: string;
  autoHelpText?: string;
}

export function DateDropdownField({
  id,
  name,
  label,
  value,
  onChange,
  required = false,
  isAutoPopulated = false,
  autoTitle,
  autoHelpText,
}: DateDropdownFieldProps) {
  const selectedDate = useMemo(() => {
    if (!value) {
      return undefined;
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }, [value]);

  const handleSelect = (date: Date | undefined) => {
    if (!date) {
      return;
    }
    onChange(format(date, 'yyyy-MM-dd'));
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label} {required && '*'}
      </Label>

      <input id={id} name={name} type="hidden" value={value} required={required} />

      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn(
              'w-full justify-start text-left font-normal',
              !selectedDate && 'text-muted-foreground',
              isAutoPopulated && 'border-amber-300 bg-amber-50 focus-visible:ring-amber-200'
            )}
            title={isAutoPopulated ? autoTitle : undefined}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {selectedDate ? format(selectedDate, 'PPP') : 'Pick a date'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={selectedDate} onSelect={handleSelect} />
        </PopoverContent>
      </Popover>

      {isAutoPopulated && autoHelpText && (
        <p className="text-xs text-amber-700" title={autoTitle}>
          {autoHelpText}
        </p>
      )}
    </div>
  );
}
