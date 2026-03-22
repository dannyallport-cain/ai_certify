import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

// UK Bank Holidays for 2024
const BANK_HOLIDAYS_2024 = [
  '2024-01-01', // New Year's Day
  '2024-03-29', // Good Friday
  '2024-04-01', // Easter Monday
  '2024-05-06', // Early May Bank Holiday
  '2024-05-27', // Spring Bank Holiday
  '2024-08-26', // Summer Bank Holiday
  '2024-12-25', // Christmas Day
  '2024-12-26', // Boxing Day
];

// UK Bank Holidays for 2025
const BANK_HOLIDAYS_2025 = [
  '2025-01-01', // New Year's Day
  '2025-04-18', // Good Friday
  '2025-04-21', // Easter Monday
  '2025-05-05', // Early May Bank Holiday
  '2025-05-26', // Spring Bank Holiday
  '2025-08-25', // Summer Bank Holiday
  '2025-12-25', // Christmas Day
  '2025-12-26', // Boxing Day
];

const BANK_HOLIDAYS = [...BANK_HOLIDAYS_2024, ...BANK_HOLIDAYS_2025];

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // 0 is Sunday, 6 is Saturday
}

function isBankHoliday(date: Date): boolean {
  const dateStr = date.toISOString().split('T')[0];
  return BANK_HOLIDAYS.includes(dateStr);
}

function getPreviousWorkingDay(date: Date): Date {
  const newDate = new Date(date);
  while (isWeekend(newDate) || isBankHoliday(newDate)) {
    newDate.setDate(newDate.getDate() - 1);
  }
  return newDate;
}

interface NextVisitFieldProps {
  visitDate: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  label?: string;
}

export function NextVisitField({
  visitDate,
  value,
  onChange,
  required = true,
  label = 'Next Visit Due'
}: NextVisitFieldProps) {
  const [date, setDate] = useState<Date | undefined>(value ? new Date(value) : undefined);
  const [isAutoPopulated, setIsAutoPopulated] = useState(false);

  useEffect(() => {
    setDate(value ? new Date(value) : undefined);
  }, [value]);

  const setNextVisitDate = (monthsToAdd: number) => {
    if (!visitDate) return;
    
    const newDate = new Date(visitDate);
    newDate.setMonth(newDate.getMonth() + monthsToAdd);
    
    // Adjust for weekends and bank holidays
    const adjustedDate = getPreviousWorkingDay(newDate);
    setDate(adjustedDate);
    onChange(adjustedDate.toISOString().split('T')[0]);
    setIsAutoPopulated(true);
  };

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (!selectedDate) return;
    
    // Adjust for weekends and bank holidays
    const adjustedDate = getPreviousWorkingDay(selectedDate);
    setDate(adjustedDate);
    onChange(adjustedDate.toISOString().split('T')[0]);
    setIsAutoPopulated(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor="nextVisitDate">{label} {required && '*'}</Label>
        <Select
          onValueChange={(value) => setNextVisitDate(Number(value))}
          disabled={!visitDate}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3">3 months</SelectItem>
            <SelectItem value="6">6 months</SelectItem>
            <SelectItem value="12">12 months</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !date && "text-muted-foreground",
              isAutoPopulated && "border-amber-300 bg-amber-50"
            )}
            title={isAutoPopulated ? 'Auto-populated from the visit date and selected period. You can still pick a custom date.' : undefined}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, "PPP") : <span>Pick a date</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleDateSelect}
            disabled={(date) => {
              // Disable dates before the visit date
              if (visitDate) {
                const visitDateObj = new Date(visitDate);
                return date < visitDateObj;
              }
              return false;
            }}
            modifiers={{
              weekend: (date) => isWeekend(date),
              bankHoliday: (date) => isBankHoliday(date),
            }}
            modifiersClassNames={{
              weekend: "text-muted-foreground bg-muted/30",
              bankHoliday: "text-destructive font-bold underline bg-destructive/5"
            }}
            classNames={{
              day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-muted/50",
              day_selected: "bg-muted text-foreground hover:bg-muted hover:text-foreground focus:bg-muted focus:text-foreground",
              day_today: "bg-muted/50 text-foreground",
              day_outside: "text-muted-foreground opacity-50",
              day_disabled: "text-muted-foreground opacity-50",
              day_range_middle: "aria-selected:bg-muted/50 aria-selected:text-foreground",
              day_hidden: "invisible",
              nav_button: "hover:bg-muted/50",
              nav_button_previous: "hover:bg-muted/50",
              nav_button_next: "hover:bg-muted/50",
              head_cell: "text-muted-foreground",
              cell: "hover:bg-muted/50",
            }}
          />
        </PopoverContent>
      </Popover>
        {isAutoPopulated && (
          <p
            className="text-xs text-amber-700"
            title="This date is automatically calculated from the visit date, period, and UK working-day adjustment."
          >
            Auto-populated from visit date + period. Hover the date field for details.
          </p>
        )}
    </div>
  );
} 