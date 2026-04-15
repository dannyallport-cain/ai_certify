'use client';

import { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import {
  CalculatorAsideCard,
  CalculatorShell
} from '@/components/calculators/calculator-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { calculateMaximumDemand } from '@/lib/calculators/secondary';

type ApplianceRow = {
  id: number;
  label: string;
  quantity: string;
  currentPerItemAmps: string;
  demandFactorPercent: string;
};

const initialRows: ApplianceRow[] = [
  {
    id: 1,
    label: 'Lighting circuits',
    quantity: '1',
    currentPerItemAmps: '6',
    demandFactorPercent: '66'
  },
  {
    id: 2,
    label: 'Socket circuits',
    quantity: '2',
    currentPerItemAmps: '32',
    demandFactorPercent: '40'
  },
  {
    id: 3,
    label: 'Cooker circuit',
    quantity: '1',
    currentPerItemAmps: '32',
    demandFactorPercent: '40'
  },
  {
    id: 4,
    label: 'Shower',
    quantity: '1',
    currentPerItemAmps: '40',
    demandFactorPercent: '100'
  }
];

export default function MaximumDemandDomesticPage() {
  const [voltage, setVoltage] = useState('230');
  const [rows, setRows] = useState<ApplianceRow[]>(initialRows);

  const result = useMemo(() => {
    return calculateMaximumDemand(
      rows.map((row) => ({
        label: row.label || 'Unnamed load',
        quantity: Number(row.quantity) || 0,
        currentPerItemAmps: Number(row.currentPerItemAmps) || 0,
        demandFactorPercent: Number(row.demandFactorPercent) || 0
      })),
      Number(voltage) || 230
    );
  }, [rows, voltage]);

  function updateRow(id: number, field: keyof ApplianceRow, value: string) {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  }

  function addRow() {
    setRows((current) => [
      ...current,
      {
        id: Date.now(),
        label: 'Additional circuit',
        quantity: '1',
        currentPerItemAmps: '6',
        demandFactorPercent: '100'
      }
    ]);
  }

  function removeRow(id: number) {
    setRows((current) =>
      current.length > 1 ? current.filter((row) => row.id !== id) : current
    );
  }

  return (
    <CalculatorShell
      title="Maximum demand domestic"
      description="Build a simple domestic installation schedule and apply practical demand factors to estimate diversified current."
      aside={
        <CalculatorAsideCard
          title="Typical use"
          description="Useful at early design stage for service size checks and consumer unit planning."
        >
          <p>Connected load = quantity × current per item</p>
          <p>Diversified load = connected load × demand factor</p>
          <p>
            Review cooking appliances, EV charging and storage heating
            separately where relevant.
          </p>
        </CalculatorAsideCard>
      }
    >
      <div className="space-y-6">
        <div className="max-w-xs space-y-2">
          <Label htmlFor="domestic-voltage">Nominal voltage (V)</Label>
          <Input
            id="domestic-voltage"
            type="number"
            min="1"
            step="1"
            value={voltage}
            onChange={(event) => setVoltage(event.target.value)}
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Appliance and circuit schedule
            </h2>
            <Button type="button" variant="outline" onClick={addRow}>
              <Plus className="mr-2 h-4 w-4" />
              Add load
            </Button>
          </div>

          <div className="space-y-3">
            {rows.map((row) => (
              <div
                key={row.id}
                className="grid gap-3 rounded-lg border border-gray-200 p-4 md:grid-cols-2 xl:grid-cols-[1.4fr_0.8fr_1fr_1fr_auto]"
              >
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    value={row.label}
                    onChange={(event) =>
                      updateRow(row.id, 'label', event.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={row.quantity}
                    onChange={(event) =>
                      updateRow(row.id, 'quantity', event.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Current per item (A)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.1"
                    value={row.currentPerItemAmps}
                    onChange={(event) =>
                      updateRow(
                        row.id,
                        'currentPerItemAmps',
                        event.target.value
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Demand factor (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={row.demandFactorPercent}
                    onChange={(event) =>
                      updateRow(
                        row.id,
                        'demandFactorPercent',
                        event.target.value
                      )
                    }
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => removeRow(row.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="text-sm text-muted-foreground">Connected load</div>
            <div className="mt-2 text-2xl font-semibold">
              {result.totalConnectedLoadAmps.toFixed(1)} A
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="text-sm text-muted-foreground">
              Diversified load
            </div>
            <div className="mt-2 text-2xl font-semibold">
              {result.totalDiversifiedLoadAmps.toFixed(1)} A
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="text-sm text-muted-foreground">
              Estimated apparent load
            </div>
            <div className="mt-2 text-2xl font-semibold">
              {result.estimatedLoadKva.toFixed(2)} kVA
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900">Load breakdown</h3>
          <div className="mt-3 space-y-2 text-sm text-muted-foreground">
            {result.diversifiedAppliances.map((appliance) => (
              <div
                key={`${appliance.label}-${appliance.quantity}-${appliance.currentPerItemAmps}`}
                className="flex flex-col justify-between gap-1 border-b border-dashed border-gray-200 pb-2 last:border-0 last:pb-0 md:flex-row md:items-center"
              >
                <span>{appliance.label}</span>
                <span>
                  {appliance.connectedLoadAmps.toFixed(1)} A connected →{' '}
                  {appliance.diversifiedLoadAmps.toFixed(1)} A diversified
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </CalculatorShell>
  );
}