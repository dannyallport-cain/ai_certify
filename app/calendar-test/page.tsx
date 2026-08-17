"use client";

import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

// Matches NextVisitField modifiers
const BANK_HOLIDAYS = [
  "2026-01-01",
  "2026-04-03",
  "2026-04-06",
  "2026-05-04",
  "2026-05-25",
  "2026-08-31",
  "2026-12-25",
  "2026-12-28",
];

function isBankHoliday(date: Date): boolean {
  const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return BANK_HOLIDAYS.includes(iso);
}

export default function CalendarTestPage() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [inPopover, setInPopover] = useState<Date | undefined>(undefined);

  return (
    <main className="mx-auto max-w-4xl space-y-10 p-8">
      <section className="space-y-3">
        <h1 className="text-lg font-semibold">Inline calendar (selected = today)</h1>
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          modifiers={{
            weekend: (d) => isWeekend(d),
            bankHoliday: (d) => isBankHoliday(d),
          }}
          modifiersClassNames={{
            weekend: "text-muted-foreground bg-muted/30",
            bankHoliday: "text-destructive font-bold underline bg-destructive/5",
          }}
        />
        <p>Selected: {date ? format(date, "PPP") : "none"}</p>
      </section>

      <section className="space-y-3">
        <h1 className="text-lg font-semibold">Popover calendar (DateDropdownField pattern)</h1>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">
              {inPopover ? format(inPopover, "PPP") : "Pick a date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={inPopover}
              onSelect={setInPopover}
              autoFocus
            />
          </PopoverContent>
        </Popover>
      </section>
    </main>
  );
}
