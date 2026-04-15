'use client';

import { useMemo, useState } from 'react';
import {
  CalculatorAsideCard,
  CalculatorShell
} from '@/components/calculators/calculator-shell';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { calculateDisconnectionTime } from '@/lib/calculators/secondary';

export default function DisconnectionTimePage() {
  const [nominalVoltageV, setNominalVoltageV] = useState('230');
  const [earthFaultCurrentA, setEarthFaultCurrentA] = useState('500');

  const result = useMemo(() => {
    return calculateDisconnectionTime({
      nominalVoltageV: Number(nominalVoltageV) || 0,
      earthFaultCurrentA: Number(earthFaultCurrentA) || 0
    });
  }, [earthFaultCurrentA, nominalVoltageV]);

  return (
    <CalculatorShell
      title="Disconnection time check"
      description="Use measured or estimated earth fault current to derive loop impedance and support a practical ADS assessment."
      aside={
        <CalculatorAsideCard
          title="What this shows"
          description="A quick screening tool to support disconnection time decisions."
        >
          <p>Loop impedance Zs ≈ Uo ÷ earth fault current</p>
          <p>
            Final compliance still depends on the protective device
            characteristic and required BS 7671 disconnection time.
          </p>
          <p>
            Compare the calculated or measured values with the actual device
            curve and circuit type.
          </p>
        </CalculatorAsideCard>
      }
    >
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="nominal-voltage">Nominal voltage to earth (V)</Label>
            <Input
              id="nominal-voltage"
              type="number"
              min="0"
              step="1"
              value={nominalVoltageV}
              onChange={(event) => setNominalVoltageV(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fault-current">Earth fault current (A)</Label>
            <Input
              id="fault-current"
              type="number"
              min="0"
              step="1"
              value={earthFaultCurrentA}
              onChange={(event) => setEarthFaultCurrentA(event.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="text-sm text-muted-foreground">
              Derived loop impedance
            </div>
            <div className="mt-2 text-2xl font-semibold">
              {result.loopImpedanceOhms.toFixed(3)} Ω
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="text-sm text-muted-foreground">
              Indicative touch voltage
            </div>
            <div className="mt-2 text-2xl font-semibold">
              {result.touchVoltageV.toFixed(1)} V
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="text-sm text-muted-foreground">Fault current</div>
            <div className="mt-2 text-2xl font-semibold">
              {Number(earthFaultCurrentA || 0).toFixed(0)} A
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 p-4">
          <h2 className="font-semibold text-gray-900">Practical assessment</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {result.practicalAssessment}
          </p>
          <div className="mt-4 space-y-2 text-sm text-muted-foreground">
            <p>
              Standard maximum disconnection times often used as a guide:
              0.4 s for many final circuits up to 32 A and 5 s for many
              distribution circuits in TN systems.
            </p>
            <p>
              Always confirm the exact requirement for the earthing arrangement,
              protective measure and circuit application.
            </p>
          </div>
        </div>
      </div>
    </CalculatorShell>
  );
}