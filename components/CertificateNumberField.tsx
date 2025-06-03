import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RefreshCw } from 'lucide-react';

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

interface CertificateNumberFieldProps {
  value: string;
  onChange: (value: string) => void;
  certificateType: string;
  customerName?: string;
  siteName?: string;
  required?: boolean;
}

interface NextInspectionFieldProps {
  inspectionDate: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}

function NextInspectionField({ inspectionDate, value, onChange, required = true }: NextInspectionFieldProps) {
  const setNextInspectionDate = (months: number) => {
    if (!inspectionDate) return;
    
    const date = new Date(inspectionDate);
    date.setMonth(date.getMonth() + months);
    
    // Adjust for weekends and bank holidays
    const adjustedDate = getPreviousWorkingDay(date);
    onChange(adjustedDate.toISOString().split('T')[0]);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor="nextInspectionDate">Next Inspection Due {required && '*'}</Label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setNextInspectionDate(6)}
            disabled={!inspectionDate}
          >
            6 months
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setNextInspectionDate(12)}
            disabled={!inspectionDate}
          >
            12 months
          </Button>
        </div>
      </div>
      <Input
        id="nextInspectionDate"
        name="nextInspectionDate"
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
      />
    </div>
  );
}

export function CertificateNumberField({
  value,
  onChange,
  certificateType,
  customerName = '',
  siteName = '',
  required = true
}: CertificateNumberFieldProps) {
  const generateCertificateNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const yearShort = String(year).slice(-2);
    const yearFirst = yearShort.charAt(0);
    const yearLast = yearShort.charAt(1);
    
    // Calculate day of year (1-366)
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    
    // Get certificate type letter and number
    const certTypeLetter = certificateType.charAt(0).toUpperCase();
    const certTypeNumber = Math.floor(Math.random() * 9) + 1; // 1-9
    
    // Generate random numbers
    const twoRand = String(Math.floor(Math.random() * 100)).padStart(2, '0'); // 00-99
    const randNum = String(Math.floor(Math.random() * 1000)).padStart(3, '0'); // 000-999
    
    // Format: [CERT_TYPE_LETTER][NUMBER][DDD][Y1][2_RAND][Y2][RAND]
    // Example: B1123245123
    return `${certTypeLetter}${certTypeNumber}${String(dayOfYear).padStart(3, '0')}${yearFirst}${twoRand}${yearLast}${randNum}`;
  };

  const handleGenerate = () => {
    onChange(generateCertificateNumber());
  };

  // Auto-generate on mount if no value
  useEffect(() => {
    if (!value) {
      handleGenerate();
    }
  }, []);

  return (
    <div className="space-y-2">
      <Label htmlFor="certificateNumber">Certificate Number {required && '*'}</Label>
      <div className="flex gap-2">
        <Input
          id="certificateNumber"
          name="certificateNumber"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g., B1123245123"
          required={required}
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleGenerate}
          title="Generate new certificate number"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export { NextInspectionField }; 