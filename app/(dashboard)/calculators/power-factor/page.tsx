'use client';

import { useMemo, useState } from 'react';
import {
  CalculatorAsideCard,
  CalculatorShell
} from '@/components/calculators/calculator-shell';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { calculatePowerFactor } from '@/lib/calculators/secondary';

export default function PowerFactorPage() {
  const [realPowerKw, setRealPowerKw] = useState('12');
  const [apparentPowerKva, setApparentPowerKva] = useState('15');
  const [lineVoltageV, setLineVoltageV] = useState('400');
  const [lineCurrentA, setLineCurrentA] = useState('22');
  const [phase, setPhase] = useState<'single' | 'three'>('three');

  const result = useMemo(() => {
    return calculatePowerFactor({
      realPowerKw: Number(realPowerKw) || 0,
      apparentPowerKva: apparentPowerKva ? Number(apparentPowerKva) || 0 : undefined,
      lineVoltageV: lineVoltageV ? Number(lineVoltageV) || 0 : undefined,
      lineCurrentA: lineCurrentA ? Number(lineCurrentA) || 0 : undefined,
      phase
    });
  }, [apparentPowerKva, lineCurrentA, lineVoltageV, phase, realPowerKw]);

  return (
    <CalculatorShell
      title="Power factor calculator"
      description="Calculate apparent power, reactive power and phase angle from real power and either kVA directly or supply voltage and current."
      aside={
        <CalculatorAsideCard
          title="Formula set"
          description="This page supports both direct apparent power input and derived apparent power from voltage and current."
        >
          <p>Power factor = kW ÷ kVA</p>
          <p>Single-phase kVA = V × A ÷ 1000</p>
          <p>Three-phase kVA = √3 × V × A ÷ 1000</p>
        </CalculatorAsideCard>
      }
    >
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="real-power">Real power (kW)</Label>
            <Input
              id="real-power"
              type="number"
              min="0"
              step="0.1"
              value={realPowerKw}
              onChange={(event) => setRealPowerKw(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>System type</Label>
            <Select value={phase} onValueChange={(value) => setPhase(value as 'single' | 'three')}>
              <SelectTrigger>
                <SelectValue placeholder="Select system type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">Single-phase</SelectItem>
                <SelectItem value="three">Three-phase</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 p-4">
          <h2 className="text-lg font-semibold">Apparent power input options</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter kVA directly, or leave it in place while also checking the value derived from voltage and current.
          </p>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="apparent-power">Apparent power (kVA)</Label>
              <Input
                id="apparent-power"
                type="number"
                min="0"
                step="0.1"
                value={apparentPowerKva}
                onChange={(event) => setApparentPowerKva(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="line-voltage">Line voltage (V)</Label>
              <Input
                id="line-voltage"
                type="number"
                min="0"
                step="1"
                value={lineVoltageV}
                onChange={(event) => setLineVoltageV(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="line-current">Line current (A)</Label>
              <Input
                id="line-current"
                type="number"
                min="0"
                step="0.1"
                value={lineCurrentA}
                onChange={(event) => setLineCurrentA(event.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="text-sm text-muted-foreground">Apparent power used</div>
            <div className="mt-2 text-2xl font-semibold">{result.apparentPowerKva.toFixed(2)} kVA</div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="text-sm text-muted-foreground">Power factor</div>
            <div className="mt-2 text-2xl font-semibold">{result.powerFactor.toFixed(3)}</div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="text-sm text-muted-foreground">Reactive power</div>
            <div className="mt-2 text-2xl font-semibold">{result.reactivePowerKvar.toFixed(2)} kVAr</div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="text-sm text-muted-foreground">Phase angle</div>
            <div className="mt-2 text-2xl font-semibold">{result.phaseAngleDegrees.toFixed(1)}°</div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 p-4 text-sm text-muted-foreground">
          <p>
            Poor power factor increases current for the same real power demand. Where correction equipment is proposed,
            check harmonic content, switching steps and capacitor bank design.
          </p>
        </div>
      </div>
    </CalculatorShell>
  );
}