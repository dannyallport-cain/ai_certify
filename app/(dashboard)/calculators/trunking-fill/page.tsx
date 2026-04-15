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
import { calculateTrunkingFill } from '@/lib/calculators/secondary';

type CableRow = {
  id: number;
  count: string;
  outsideDiameterMm: string;
};

const initialRows: CableRow[] = [
  { id: 1, count: '4', outsideDiameterMm: '7.2' },
  { id: 2, count: '2', outsideDiameterMm: '10.8' }
];

export default function TrunkingFillPage() {
  const [trunkingWidthMm, setTrunkingWidthMm] = useState('50');
  const [trunkingHeightMm, setTrunkingHeightMm] = useState('50');
  const [maxFillPercent, setMaxFillPercent] = useState('45');
  const [rows, setRows] = useState<CableRow[]>(initialRows);

  const result = useMemo(() => {
    return calculateTrunkingFill({
      trunkingWidthMm: Number(trunkingWidthMm) || 0,
      trunkingHeightMm: Number(trunkingHeightMm) || 0,
      maxFillPercent: Number(maxFillPercent) || 45,
      cables: rows.map((row) => ({
        count: Number(row.count) || 0,
        outsideDiameterMm: Number(row.outsideDiameterMm) || 0
      }))
    });
  }, [maxFillPercent, rows, trunkingHeightMm, trunkingWidthMm]);

  function updateRow(
    id: number,
    field: keyof Omit<CableRow, 'id'>,
    value: string
  ) {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  }

  function addRow() {
    setRows((current) => [
      ...current,
      { id: Date.now(), count: '1', outsideDiameterMm: '8' }
    ]);
  }

  function removeRow(id: number) {
    setRows((current) =>
      current.length > 1 ? current.filter((row) => row.id !== id) : current
    );
  }

  return (
    <CalculatorShell
      title="Trunking fill calculator"
      description="Estimate cable occupancy inside rectangular trunking and compare it with a practical design fill limit."
      aside={
        <CalculatorAsideCard
          title="Method used"
          description="Rectangular trunking area is compared against the total circular cable areas."
        >
          <p>Trunking area = width × height</p>
          <p>
            Total cable area = Σ [quantity × π × (outside diameter ÷ 2)²]
          </p>
          <p>
            Where cable bunching, heat and ease of installation matter, a
            conservative fill target helps.
          </p>
        </CalculatorAsideCard>
      }
    >
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="trunking-width">Trunking width (mm)</Label>
            <Input
              id="trunking-width"
              type="number"
              min="0"
              step="1"
              value={trunkingWidthMm}
              onChange={(event) => setTrunkingWidthMm(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="trunking-height">Trunking height (mm)</Label>
            <Input
              id="trunking-height"
              type="number"
              min="0"
              step="1"
              value={trunkingHeightMm}
              onChange={(event) => setTrunkingHeightMm(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="trunking-max-fill">Target maximum fill (%)</Label>
            <Input
              id="trunking-max-fill"
              type="number"
              min="1"
              max="100"
              step="1"
              value={maxFillPercent}
              onChange={(event) => setMaxFillPercent(event.target.value)}
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Cable schedule</h2>
            <Button type="button" variant="outline" onClick={addRow}>
              <Plus className="mr-2 h-4 w-4" />
              Add cable
            </Button>
          </div>

          <div className="space-y-3">
            {rows.map((row) => (
              <div
                key={row.id}
                className="grid gap-3 rounded-lg border border-gray-200 p-4 md:grid-cols-[1fr_1fr_auto]"
              >
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={row.count}
                    onChange={(event) =>
                      updateRow(row.id, 'count', event.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Outside diameter (mm)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.1"
                    value={row.outsideDiameterMm}
                    onChange={(event) =>
                      updateRow(row.id, 'outsideDiameterMm', event.target.value)
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

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="text-sm text-muted-foreground">Trunking area</div>
            <div className="mt-2 text-2xl font-semibold">
              {result.trunkingAreaMm2.toFixed(1)} mm²
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="text-sm text-muted-foreground">Cable area used</div>
            <div className="mt-2 text-2xl font-semibold">
              {result.totalCableAreaMm2.toFixed(1)} mm²
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="text-sm text-muted-foreground">
              Fill percentage
            </div>
            <div className="mt-2 text-2xl font-semibold">
              {result.fillPercent.toFixed(1)}%
            </div>
          </div>
          <div
            className={`rounded-lg border p-4 ${
              result.compliant
                ? 'border-green-200 bg-green-50'
                : 'border-red-200 bg-red-50'
            }`}
          >
            <div className="text-sm text-muted-foreground">Assessment</div>
            <div className="mt-2 text-2xl font-semibold">
              {result.compliant ? 'Within limit' : 'Overfilled'}
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900">Intermediate values</h3>
          <div className="mt-3 space-y-2 text-sm text-muted-foreground">
            <p>
              Maximum permitted cable area:{' '}
              {result.maxPermittedAreaMm2.toFixed(1)} mm²
            </p>
            <p>
              Remaining area in trunking:{' '}
              {result.remainingAreaMm2.toFixed(1)} mm²
            </p>
            <p>
              Allow for bends, segregation and accessories where applicable.
            </p>
          </div>
        </div>
      </div>
    </CalculatorShell>
  );
}