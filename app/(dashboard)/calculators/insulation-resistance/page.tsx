'use client';

import { useMemo, useState } from 'react';
import {
  CalculatorAsideCard,
  CalculatorShell
} from '@/components/calculators/calculator-shell';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { calculateInsulationResistance } from '@/lib/calculators/secondary';

export default function InsulationResistancePage() {
  const [insulationResistanceMohm, setInsulationResistanceMohm] = useState('200');
  const [testVoltageV, setTestVoltageV] = useState('500');
  const [minimumMohm, setMinimumMohm] = useState('1');

  const result = useMemo(() => {
    return calculateInsulationResistance(
      Number(insulationResistanceMohm) || 0,
      Number(testVoltageV) || 0,
      Number(minimumMohm) || 1
    );
  }, [insulationResistanceMohm, minimumMohm, testVoltageV]);

  return (
    <CalculatorShell
      title="Insulation resistance calculator"
      description="Convert insulation resistance readings into indicative leakage current and compare the result against a selected minimum threshold."
      aside={
        <CalculatorAsideCard
          title="Formula used"
          description="This tool applies Ohm's law to the selected test voltage and measured resistance."
        >
          <p>Leakage current = test voltage ÷ insulation resistance</p>
          <p>1 MΩ = 1,000,000 Ω</p>
          <p>Use the actual test sequence and disconnection procedure required for the installation.</p>
        </CalculatorAsideCard>
      }
    >
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="ir-value">Measured insulation resistance (MΩ)</Label>
            <Input
              id="ir-value"
              type="number"
              min="0"
              step="0.1"
              value={insulationResistanceMohm}
              onChange={(event) => setInsulationResistanceMohm(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="test-voltage">Test voltage (V)</Label>
            <Input
              id="test-voltage"
              type="number"
              min="0"
              step="1"
              value={testVoltageV}
              onChange={(event) => setTestVoltageV(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="minimum-threshold">Minimum acceptable value (MΩ)</Label>
            <Input
              id="minimum-threshold"
              type="number"
              min="0"
              step="0.1"
              value={minimumMohm}
              onChange={(event) => setMinimumMohm(event.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="text-sm text-muted-foreground">Leakage current</div>
            <div className="mt-2 text-2xl font-semibold">{result.leakageCurrentMa.toFixed(4)} mA</div>
          </div>
          <div className={`rounded-lg border p-4 ${result.compliant ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
            <div className="text-sm text-muted-foreground">Assessment</div>
            <div className="mt-2 text-2xl font-semibold">{result.compliant ? 'Pass' : 'Below threshold'}</div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="text-sm text-muted-foreground">Selected minimum</div>
            <div className="mt-2 text-2xl font-semibold">{Number(minimumMohm || 0).toFixed(1)} MΩ</div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 p-4">
          <h2 className="font-semibold text-gray-900">Interpretation</h2>
          <p className="mt-2 text-sm text-muted-foreground">{result.guidance}</p>
          <div className="mt-4 space-y-2 text-sm text-muted-foreground">
            <p>
              Low readings can be influenced by connected equipment, surge protection devices, moisture ingress or damaged insulation.
            </p>
            <p>
              Verify the correct test voltage for the circuit and disconnect sensitive equipment before testing.
            </p>
          </div>
        </div>
      </div>
    </CalculatorShell>
  );
}