
import { generateCertificatePDF, CertificateData } from '../../../lib/pdf/generator';
import * as fs from 'fs';

// ─── Accurate representation of:
//     146 Fitzwarren Street_Vincente Dos Santos_CE202706_SATISFACTORY.pdf
//
// All values taken directly from the source document (7 working pages + guidance page).
// ────────────────────────────────────────────────────────────────────────────────────

const testCert: CertificateData = {
  id: 1,

  // ── Cover / Header ─────────────────────────────────────────────────────
  certificateNumber: 'CE202706',
  certificateType: 'EICR',
  siteName: 'Vincente Dos Santos',                          // Section 1 client name
  siteAddress: '146 Fitzwarren Street, Salford, M6 5RS',
  inspectionDate: '2025-02-13',
  nextInspectionDate: '2030-02-13',
  inspectorName: 'Daniel Allport',
  status: 'satisfactory',

  templateConfig: {
    colors: {
      primary:    '#C8102E',   // NICEIC red — drives all heading bar fills
      secondary:  '#C8102E',   // NICEIC red — drives table header bg + border grey
      accent:     '#ffc107',
      background: '#ffffff',
      text:       '#1a202c',
    },
  },

  formData: {
    // ── Section 9 — Company / Declaration ───────────────────────────────
    tradingTitle:       'Cain Enabled Engineering Ltd',
    companyAddress:     'Piccadilly Business Centre, Aldow Enterprise Park, Manchester, M12 6AE',
    companyEmail:       'office@cain-enabled.co.uk',
    companyTelephone:   '01246 387 450',
    registrationNumber: '611716000',
    inspectorPosition:  'Qualified Supervisor',
    // inspectorSignatureDate resolved from inspectionDate by generator

    // ── Test instruments (Page 3) ────────────────────────────────────────
    // Multi-functional instrument serial used for all tests
    instrumentMultiFunction:        '511666155',
    instrumentInsulationResistance: 'N/A',   // combined into multi-function instrument
    instrumentContinuity:           'N/A',
    instrumentEarthElectrode:       'N/A',
    instrumentEarthLoop:            'N/A',
    instrumentRCD:                  'N/A',

    // ── Section 1 — Person Ordering the Report ───────────────────────────
    // (customer.name / customer.address fields below supply these)

    // ── Section 2 — Reason for Report ────────────────────────────────────
    reasonForReport: 'Landlords safety report.',

    // ── Section 3 — Details of the Installation ──────────────────────────
    installationAddress:          'Vincente Dos Santos, 146 Fitzwarren Street, Salford, M6 5RS',
    premisesType:                 'Domestic',
    estimatedAgeOfWiring:         '20',
    evidenceOfAdditions:          'No',
    evidenceOfAdditionsAge:       'N/A',
    installationRecordsAvailable: 'No',
    dateOfLastInspection:         'N/A',

    // ── Section 4 — Extent and Limitations ───────────────────────────────
    extentOfInspection: '100% of the installation.',
    agreedLimitations:
      'No Lifting of floor boards or inspection of loft space. ' +
      'Characteristics of primary supply overcurrent device. ' +
      'No testing of HVAC control cables. ' +
      'No testing of unverified circuits.',
    agreedLimitationsWith:   'Client',
    operationalLimitations:  'N/A',

    // ── Section 5 — Overall Assessment ───────────────────────────────────
    overallAssessment: 'SATISFACTORY',

    // ── Section 6 — Recommendations ──────────────────────────────────────
    nextInspectionPeriod: '5 Years or change of tenant/owner',

    // ── Page 3 — General Condition ────────────────────────────────────────
    generalCondition: 'Adequate.',

    // ── Supply Characteristics and Earthing Arrangements ─────────────────
    earthingArrangements:              'TN-C-S',
    natureOfSupply:                    '1-phase (2 wire)',
    supplyPolarityConfirmed:           'Yes',
    nominalVoltageU:                   '240',   // V line-to-line
    nominalVoltageUo:                  '230',   // V line-to-earth
    nominalFrequency:                  '50',    // Hz
    prospectiveFaultCurrent:           '1.1',   // kA at supply
    externalEarthFaultLoopImpedance:   '0.28',  // Ω
    supplyProtectiveDeviceStandard:    '1361 Fuse HBC',
    supplyProtectiveDeviceRating:      '100',   // A
    shortCircuitCapacity:              '33',    // kA

    // ── Means of Earthing / Installation Particulars ─────────────────────
    meansOfEarthing:   "Distributor's facility",
    maximumDemand:     '100 Amps',
    protectiveMeasures: 'ADS',

    // ── Main Switch ───────────────────────────────────────────────────────
    mainSwitchType:          '60947-3 Isolator',
    mainSwitchPoles:         '2',
    mainSwitchCurrentRating: '100',  // A
    mainSwitchFuseRating:    '100',  // A
    mainSwitchVoltageRating: '240',  // V

    // ── Supply Conductors ─────────────────────────────────────────────────
    supplyConductorMaterial: 'Copper',
    supplyConductorCSA:      '25',   // mm²

    // ── Earthing Conductor ────────────────────────────────────────────────
    earthingConductorMaterial: 'Copper',
    earthingConductorCSA:      '16',  // mm²

    // ── Main Protective Bonding Conductors ────────────────────────────────
    mainBondingMaterial: 'Copper',
    mainBondingCSA:      '10',  // mm²

    // ── Bonding of Extraneous-Conductive Parts ────────────────────────────
    bondingWater:     '✓',
    bondingGas:       '✓',
    bondingOil:       'N/A',
    bondingLightning: 'N/A',
    bondingSteel:     'N/A',

    // ── Consumer Unit (Schedule of circuit details — Page 7) ─────────────
    consumerUnitDesignation: 'D.B.1',
    consumerUnitLocation:    'Meter Cupboard',
    consumerUnitPfc:         '1.2',   // kA at DB (measured at board)

    // ── Circuit Test Results ──────────────────────────────────────────────
    // Columns: circuitNumber | designation | wiringType | refMethod |
    //   liveCsa | cpcCsa | maxDiscTime | bsen | deviceType | rating | capacity |
    //   rcdRating | maxZs | r1r2 | r2 | insResLL | insResLE | testVoltage |
    //   polarity | measuredZs | discTime (ms) | rcdTestButton
    circuits: [
      // ── MCB 1 group — Lighting circuits (1.5/1.0 mm², 6A B-type) ───────
      {
        circuitNumber: '1',
        designation:   'Lights Down',
        wiringType:    'A',   // Thermoplastic insulated/sheathed
        refMethod:     '101',
        liveCsa:       '1.5', cpcCsa: '1.0',
        maxDiscTime:   '0.4',
        bsen: '60898', deviceType: 'B', rating: '6', capacity: '6',
        rcdRating: '30',
        maxZs: '7.28',
        r1r2: '0.92', r2: '',
        insResLL: '> 200', insResLE: '> 200', testVoltage: '500',
        polarity: '✓',
        measuredZs: '1.08', discTime: '0.36', rcdTestButton: '✓',
      },
      {
        circuitNumber: '1',
        designation:   'Lights Up',
        wiringType:    'A', refMethod: '101',
        liveCsa:       '1.5', cpcCsa: '1.0',
        maxDiscTime:   '0.4',
        bsen: '60898', deviceType: 'B', rating: '6', capacity: '6',
        rcdRating: '30',
        maxZs: '7.28',
        r1r2: '0.71', r2: '',
        insResLL: '> 200', insResLE: '> 200', testVoltage: '500',
        polarity: '✓',
        measuredZs: '0.97', discTime: '0.36', rcdTestButton: '✓',
      },
      {
        circuitNumber: '1',
        designation:   'Smoke Detectors',
        wiringType:    'A', refMethod: '101',
        liveCsa:       '1.5', cpcCsa: '1.0',
        maxDiscTime:   '0.4',
        bsen: '60898', deviceType: 'B', rating: '6', capacity: '6',
        rcdRating: '30',
        maxZs: '7.28',
        r1r2: '0.71', r2: '',
        insResLL: '> 200', insResLE: '> 200', testVoltage: '500',
        polarity: '✓',
        measuredZs: '0.97', discTime: '0.36', rcdTestButton: '✓',
      },
      // ── Dedicated appliance circuit — Boiler (2.5/1.5 mm², 16A B-type) ─
      {
        circuitNumber: '',
        designation:   'Boiler',
        wiringType:    'A', refMethod: '101',
        liveCsa:       '2.5', cpcCsa: '1.5',
        maxDiscTime:   '0.4',
        bsen: '60898', deviceType: 'B', rating: '16', capacity: '6',
        rcdRating: '30',
        maxZs: '2.73',
        r1r2: '0.61', r2: '',
        insResLL: '> 200', insResLE: '> 200', testVoltage: '500',
        polarity: '✓',
        measuredZs: '0.76', discTime: '0.36', rcdTestButton: '✓',
      },
      // ── MCB 2 group — Ring Final & dedicated circuits (2.5/1.5 mm², 32A B) ─
      {
        circuitNumber: '2',
        designation:   'Ring Circuit Down',
        wiringType:    'A', refMethod: '101',
        liveCsa:       '2.5', cpcCsa: '1.5',
        maxDiscTime:   '0.4',
        bsen: '60898', deviceType: 'B', rating: '32', capacity: '6',
        rcdRating: '30',
        maxZs: '1.37',
        r1r2: '0.16', r2: '',
        insResLL: '> 200', insResLE: '> 200', testVoltage: '500',
        polarity: '✓',
        measuredZs: '0.48', discTime: '0.36', rcdTestButton: '✓',
      },
      {
        circuitNumber: '2',
        designation:   'Ring Circuit Up',
        wiringType:    'A', refMethod: '101',
        liveCsa:       '2.5', cpcCsa: '1.5',
        maxDiscTime:   '0.4',
        bsen: '60898', deviceType: 'B', rating: '32', capacity: '6',
        rcdRating: '30',
        maxZs: '1.37',
        r1r2: '0.20', r2: '',
        insResLL: '> 200', insResLE: '> 200', testVoltage: '500',
        polarity: '✓',
        measuredZs: '0.52', discTime: '0.36', rcdTestButton: '✓',
      },
      {
        circuitNumber: '2',
        designation:   'Ring Circuit Kitchen',
        wiringType:    'A', refMethod: '101',
        liveCsa:       '2.5', cpcCsa: '1.5',
        maxDiscTime:   '0.4',
        bsen: '60898', deviceType: 'B', rating: '32', capacity: '6',
        rcdRating: '30',
        maxZs: '1.37',
        r1r2: '0.16', r2: '',
        insResLL: '> 200', insResLE: '> 200', testVoltage: '500',
        polarity: '✓',
        measuredZs: '0.46', discTime: '0.36', rcdTestButton: '✓',
      },
      {
        circuitNumber: '2',
        designation:   'Ring Circuit Down',   // second ring on position 2 (e.g. bedroom extension)
        wiringType:    'A', refMethod: '101',
        liveCsa:       '2.5', cpcCsa: '1.5',
        maxDiscTime:   '0.4',
        bsen: '60898', deviceType: 'B', rating: '32', capacity: '6',
        rcdRating: '30',
        maxZs: '1.37',
        r1r2: '0.18', r2: '',
        insResLL: '> 200', insResLE: '> 200', testVoltage: '500',
        polarity: '✓',
        measuredZs: '0.48', discTime: '0.36', rcdTestButton: '✓',
      },
      // ── Dedicated appliance circuits (6/2.5 mm², 32A B-type) ────────────
      {
        circuitNumber: '2',
        designation:   'Cooker',
        wiringType:    'A', refMethod: '101',
        liveCsa:       '6', cpcCsa: '2.5',
        maxDiscTime:   '0.4',
        bsen: '60898', deviceType: 'B', rating: '32', capacity: '6',
        rcdRating: '30',
        maxZs: '1.37',
        r1r2: '0.35', r2: '',
        insResLL: '> 200', insResLE: '> 200', testVoltage: '500',
        polarity: '✓',
        measuredZs: '0.43', discTime: '0.36', rcdTestButton: '✓',
      },
      {
        circuitNumber: '2',
        designation:   'Shower',
        wiringType:    'A', refMethod: '101',
        liveCsa:       '6', cpcCsa: '2.5',
        maxDiscTime:   '0.4',
        bsen: '60898', deviceType: 'B', rating: '32', capacity: '6',
        rcdRating: '30',
        maxZs: '1.37',
        r1r2: '0.24', r2: '',
        insResLL: '> 200', insResLE: '> 200', testVoltage: '500',
        polarity: '✓',
        measuredZs: '0.51', discTime: '0.36', rcdTestButton: '✓',
      },
    ],
  },

  customer: {
    name:          'Vincente Dos Santos',
    email:         null,
    phone:         null,
    address:       '146 Fitzwarren Street, Salford, M6 5RS',
    postcode:      'M6 5RS',
    contactPerson: null,
  },

  // No observations — SATISFACTORY with no adverse items (Page 2: N/A for all codes)
  items: [],
};

(async () => {
  try {
    const pdfBytes = await generateCertificatePDF(testCert);
    const buf = Buffer.from(pdfBytes);
    fs.writeFileSync('test-results/eicr-test-output.pdf', buf);
    console.log('EICR test PDF written to test-results/eicr-test-output.pdf');
    console.log('File size:', buf.length, 'bytes');
    console.log('SUCCESS');
  } catch (e) {
    console.error('ERROR:', e);
  }
})();
