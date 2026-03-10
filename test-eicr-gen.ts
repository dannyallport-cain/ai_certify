
import { generateCertificatePDF, CertificateData } from './lib/pdf/generator';
import * as fs from 'fs';

const testCert: CertificateData = {
  id: 1,
  certificateNumber: 'CE202706',
  certificateType: 'EICR',
  siteName: 'Test Site',
  siteAddress: '146 Fitzwarren Street, Salford, M6 5RS',
  inspectionDate: '2025-02-13',
  nextInspectionDate: '2030-02-13',
  inspectorName: 'Daniel Allport',
  status: 'satisfactory',
  // Template colours that should flow through to the PDF output
  templateConfig: {
    colors: {
      primary: '#1a3a5c',
      secondary: '#2c5282',
      accent: '#ffc107',
      background: '#ffffff',
      text: '#1a202c',
    },
  },
  formData: {
    tradingTitle: 'Cain Enabled Engineering Ltd',
    companyAddress: 'Piccadilly Business Centre, Aldow Enterprise Park, Manchester, M12 6AE',
    companyEmail: 'office@cain-enabled.co.uk', 
    companyTelephone: '01246 387 450',
    registrationNumber: '611716000',
    inspectorPosition: 'Qualified Supervisor',
    reasonForReport: 'Landlords safety report.',
    installationAddress: 'Vincente Dos Santos, 146 Fitzwarren Street, Salford, M6 5RS',
    premisesType: 'Domestic',
    estimatedAgeOfWiring: '20',
    evidenceOfAdditions: 'No',
    installationRecordsAvailable: 'No',
    extentOfInspection: '100% of the installation.',
    agreedLimitations: 'No Lifting of floor boards or inspection of loft space.',
    agreedLimitationsWith: 'Client',
    operationalLimitations: 'N/A',
    overallAssessment: 'SATISFACTORY',
    nextInspectionPeriod: '5 Years or change of tenant/owner',
    generalCondition: 'Adequate.',
    earthingArrangements: 'TN-C-S',
    natureOfSupply: '1-phase (2 wire)',
    nominalVoltageU: '240',
    nominalVoltageUo: '230',
    nominalFrequency: '50',
    prospectiveFaultCurrent: '1.1',
    externalEarthFaultLoopImpedance: '0.28',
    supplyProtectiveDeviceStandard: '1361 Fuse HBC',
    supplyProtectiveDeviceRating: '100',
    shortCircuitCapacity: '33',
    meansOfEarthing: "Distributor's facility",
    maximumDemand: '100 Amps',
    protectiveMeasures: 'ADS',
    mainSwitchType: '60947-3 Isolator',
    mainSwitchPoles: '2',
    mainSwitchCurrentRating: '100',
    mainSwitchFuseRating: '100',
    mainSwitchVoltageRating: '240',
    supplyConductorMaterial: 'Copper',
    supplyConductorCSA: '25',
    earthingConductorMaterial: 'Copper',
    earthingConductorCSA: '16',
    mainBondingMaterial: 'Copper',
    mainBondingCSA: '10',
    instrumentMultiFunction: '511666155',
    supplyPolarityConfirmed: 'Yes',
    circuits: [
      { circuitNumber: '1', designation: 'Lights Down', wiringType: 'A', refMethod: '101', liveCsa: '1.5', cpcCsa: '1.0', maxDiscTime: '0.4', bsen: '60898', deviceType: 'B', rating: '6', capacity: '6', rcdRating: '30', maxZs: '7.28', r1r2: '0.92', insResLL: '> 200', insResLE: '> 200', testVoltage: '500', polarity: '✓', measuredZs: '1.08', discTime: '0.36' },
      { circuitNumber: '1', designation: 'Lights Up', wiringType: 'A', refMethod: '101', liveCsa: '1.5', cpcCsa: '1.0', maxDiscTime: '0.4', bsen: '60898', deviceType: 'B', rating: '6', capacity: '6', rcdRating: '30', maxZs: '7.28', r1r2: '0.71', insResLL: '> 200', insResLE: '> 200', testVoltage: '500', polarity: '✓', measuredZs: '0.97', discTime: '0.36' },
    ]
  },
  customer: {
    name: 'Vincente Dos Santos',
    email: null,
    phone: null,
    address: '146 Fitzwarren Street, Salford, M6 5RS',
    postcode: 'M6 5RS',
    contactPerson: null,
  },
  items: [],
};

try {
  const pdfBytes = generateCertificatePDF(testCert);
  const buf = Buffer.from(pdfBytes);
  fs.writeFileSync('test-results/eicr-test-output.pdf', buf);
  console.log('EICR test PDF written to test-results/eicr-test-output.pdf');
  console.log('File size:', buf.length, 'bytes');
  console.log('SUCCESS');
} catch(e) {
  console.error('ERROR:', e);
}
