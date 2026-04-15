export type ConduitCableInput = {
  count: number;
  outsideDiameterMm: number;
};

export type ConduitFillInputs = {
  conduitInternalDiameterMm: number;
  cables: ConduitCableInput[];
  maxFillPercent?: number;
};

export type ConduitFillResult = {
  conduitAreaMm2: number;
  cableAreasMm2: number[];
  totalCableAreaMm2: number;
  fillPercent: number;
  remainingAreaMm2: number;
  maxPermittedAreaMm2: number;
  compliant: boolean;
};

export function calculateConduitFill({
  conduitInternalDiameterMm,
  cables,
  maxFillPercent = 45
}: ConduitFillInputs): ConduitFillResult {
  const conduitAreaMm2 = Math.PI * Math.pow(conduitInternalDiameterMm / 2, 2);
  const cableAreasMm2 = cables.map((cable) => {
    const area = Math.PI * Math.pow(cable.outsideDiameterMm / 2, 2);
    return area * cable.count;
  });
  const totalCableAreaMm2 = cableAreasMm2.reduce((sum, area) => sum + area, 0);
  const fillPercent =
    conduitAreaMm2 > 0 ? (totalCableAreaMm2 / conduitAreaMm2) * 100 : 0;
  const maxPermittedAreaMm2 = conduitAreaMm2 * (maxFillPercent / 100);

  return {
    conduitAreaMm2,
    cableAreasMm2,
    totalCableAreaMm2,
    fillPercent,
    remainingAreaMm2: conduitAreaMm2 - totalCableAreaMm2,
    maxPermittedAreaMm2,
    compliant: totalCableAreaMm2 <= maxPermittedAreaMm2
  };
}

export type TrunkingFillInputs = {
  trunkingWidthMm: number;
  trunkingHeightMm: number;
  cables: ConduitCableInput[];
  maxFillPercent?: number;
};

export type TrunkingFillResult = {
  trunkingAreaMm2: number;
  cableAreasMm2: number[];
  totalCableAreaMm2: number;
  fillPercent: number;
  remainingAreaMm2: number;
  maxPermittedAreaMm2: number;
  compliant: boolean;
};

export function calculateTrunkingFill({
  trunkingWidthMm,
  trunkingHeightMm,
  cables,
  maxFillPercent = 45
}: TrunkingFillInputs): TrunkingFillResult {
  const trunkingAreaMm2 = trunkingWidthMm * trunkingHeightMm;
  const cableAreasMm2 = cables.map((cable) => {
    const area = Math.PI * Math.pow(cable.outsideDiameterMm / 2, 2);
    return area * cable.count;
  });
  const totalCableAreaMm2 = cableAreasMm2.reduce((sum, area) => sum + area, 0);
  const fillPercent =
    trunkingAreaMm2 > 0 ? (totalCableAreaMm2 / trunkingAreaMm2) * 100 : 0;
  const maxPermittedAreaMm2 = trunkingAreaMm2 * (maxFillPercent / 100);

  return {
    trunkingAreaMm2,
    cableAreasMm2,
    totalCableAreaMm2,
    fillPercent,
    remainingAreaMm2: trunkingAreaMm2 - totalCableAreaMm2,
    maxPermittedAreaMm2,
    compliant: totalCableAreaMm2 <= maxPermittedAreaMm2
  };
}

export type DiversityCircuit = {
  label: string;
  connectedLoadAmps: number;
  diversityPercent: number;
};

export type DiversityResult = {
  diversifiedCircuits: Array<
    DiversityCircuit & {
      diversifiedLoadAmps: number;
    }
  >;
  totalConnectedLoadAmps: number;
  totalDiversifiedLoadAmps: number;
  diversityFactorPercent: number;
};

export function calculateDiversity(
  circuits: DiversityCircuit[]
): DiversityResult {
  const diversifiedCircuits = circuits.map((circuit) => ({
    ...circuit,
    diversifiedLoadAmps:
      circuit.connectedLoadAmps * (circuit.diversityPercent / 100)
  }));

  const totalConnectedLoadAmps = diversifiedCircuits.reduce(
    (sum, circuit) => sum + circuit.connectedLoadAmps,
    0
  );
  const totalDiversifiedLoadAmps = diversifiedCircuits.reduce(
    (sum, circuit) => sum + circuit.diversifiedLoadAmps,
    0
  );

  return {
    diversifiedCircuits,
    totalConnectedLoadAmps,
    totalDiversifiedLoadAmps,
    diversityFactorPercent:
      totalConnectedLoadAmps > 0
        ? (totalDiversifiedLoadAmps / totalConnectedLoadAmps) * 100
        : 0
  };
}

export type MaximumDemandAppliance = {
  label: string;
  quantity: number;
  currentPerItemAmps: number;
  demandFactorPercent: number;
};

export type MaximumDemandResult = {
  diversifiedAppliances: Array<
    MaximumDemandAppliance & {
      connectedLoadAmps: number;
      diversifiedLoadAmps: number;
    }
  >;
  totalConnectedLoadAmps: number;
  totalDiversifiedLoadAmps: number;
  estimatedLoadKva: number;
};

export function calculateMaximumDemand(
  appliances: MaximumDemandAppliance[],
  voltage = 230
): MaximumDemandResult {
  const diversifiedAppliances = appliances.map((appliance) => {
    const connectedLoadAmps =
      appliance.quantity * appliance.currentPerItemAmps;
    const diversifiedLoadAmps =
      connectedLoadAmps * (appliance.demandFactorPercent / 100);

    return {
      ...appliance,
      connectedLoadAmps,
      diversifiedLoadAmps
    };
  });

  const totalConnectedLoadAmps = diversifiedAppliances.reduce(
    (sum, appliance) => sum + appliance.connectedLoadAmps,
    0
  );
  const totalDiversifiedLoadAmps = diversifiedAppliances.reduce(
    (sum, appliance) => sum + appliance.diversifiedLoadAmps,
    0
  );

  return {
    diversifiedAppliances,
    totalConnectedLoadAmps,
    totalDiversifiedLoadAmps,
    estimatedLoadKva: (totalDiversifiedLoadAmps * voltage) / 1000
  };
}

export type PowerFactorInputs = {
  realPowerKw: number;
  apparentPowerKva?: number;
  lineVoltageV?: number;
  lineCurrentA?: number;
  phase?: 'single' | 'three';
};

export type PowerFactorResult = {
  apparentPowerKva: number;
  powerFactor: number;
  reactivePowerKvar: number;
  phaseAngleDegrees: number;
};

export function calculatePowerFactor({
  realPowerKw,
  apparentPowerKva,
  lineVoltageV,
  lineCurrentA,
  phase = 'single'
}: PowerFactorInputs): PowerFactorResult {
  const derivedApparentPowerKva =
    apparentPowerKva ??
    (lineVoltageV && lineCurrentA
      ? phase === 'three'
        ? (Math.sqrt(3) * lineVoltageV * lineCurrentA) / 1000
        : (lineVoltageV * lineCurrentA) / 1000
      : 0);

  const safeApparentPower = derivedApparentPowerKva > 0 ? derivedApparentPowerKva : 0;
  const rawPowerFactor =
    safeApparentPower > 0 ? realPowerKw / safeApparentPower : 0;
  const powerFactor = Math.min(Math.max(rawPowerFactor, 0), 1);
  const reactivePowerKvar = Math.sqrt(
    Math.max(Math.pow(safeApparentPower, 2) - Math.pow(realPowerKw, 2), 0)
  );
  const phaseAngleDegrees = powerFactor > 0 ? Math.acos(powerFactor) * (180 / Math.PI) : 90;

  return {
    apparentPowerKva: safeApparentPower,
    powerFactor,
    reactivePowerKvar,
    phaseAngleDegrees
  };
}

export type DisconnectionTimeInputs = {
  nominalVoltageV: number;
  earthFaultCurrentA: number;
};

export type DisconnectionTimeResult = {
  loopImpedanceOhms: number;
  touchVoltageV: number;
  practicalAssessment: string;
};

export function calculateDisconnectionTime({
  nominalVoltageV,
  earthFaultCurrentA
}: DisconnectionTimeInputs): DisconnectionTimeResult {
  const loopImpedanceOhms =
    earthFaultCurrentA > 0 ? nominalVoltageV / earthFaultCurrentA : 0;
  const touchVoltageV = earthFaultCurrentA * 0.2;

  let practicalAssessment = 'Insufficient data for assessment.';
  if (earthFaultCurrentA >= 500) {
    practicalAssessment =
      'High fault current suggests fast automatic disconnection is likely with standard protective devices.';
  } else if (earthFaultCurrentA >= 100) {
    practicalAssessment =
      'Moderate fault current may satisfy final circuit disconnection times depending on protective device characteristics.';
  } else if (earthFaultCurrentA > 0) {
    practicalAssessment =
      'Low fault current may risk delayed disconnection. Check measured Zs against device time-current curves.';
  }

  return {
    loopImpedanceOhms,
    touchVoltageV,
    practicalAssessment
  };
}

export type InsulationResistanceResult = {
  leakageCurrentMa: number;
  compliant: boolean;
  guidance: string;
};

export function calculateInsulationResistance(
  insulationResistanceMohm: number,
  testVoltageV: number,
  minimumMohm = 1
): InsulationResistanceResult {
  const resistanceOhms = insulationResistanceMohm * 1_000_000;
  const leakageCurrentMa =
    resistanceOhms > 0 ? (testVoltageV / resistanceOhms) * 1000 : 0;
  const compliant = insulationResistanceMohm >= minimumMohm;

  return {
    leakageCurrentMa,
    compliant,
    guidance: compliant
      ? 'Measured insulation resistance is above the practical minimum threshold.'
      : 'Measured insulation resistance is below the selected minimum threshold and requires investigation.'
  };
}