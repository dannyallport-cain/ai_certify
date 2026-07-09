import { generateCertificatePDF } from '../lib/pdf/generator';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { calculateMaxZs } from '../lib/utils/calculate-zs';

const sampleCertificate: Record<string, unknown> = {
  id: 1,
  certificateNumber: 'CE202695',
  certificateType: 'EICR',
  siteName: 'Highfield Hall Community Centre',
  siteAddress: 'Marsh Lane, Farnworth, Bolton, BL4 0AW',
  inspectionDate: '2024-03-15',
  nextInspectionDate: '2027-03-15',
  inspectorName: 'Daniel Allport',
  status: 'completed',
    formData: {
    // Company / Declaration (Section 9)
    tradingTitle: 'Cain Enabled Engineering Ltd',
    companyAddress: 'Piccadilly Business Centre, 8 Piccadilly, Manchester, M12 6AE',
    registrationNumber: '611716000',
    companyTelephone: '01246 387 450',
    companyEmail: 'info@cain-enabled.co.uk',
    inspectorPosition: 'Qualified Supervisor',

    // Section 1 – client
    clientAddress: 'Marsh Lane, Farnworth, Bolton, BL4 0AW',

    // Section 2 – reason
    reasonForReport: 'Safety assessment requested by client. To assess compliance with BS 7671 (2018) Amendment 2 (2022) and the Electricity at Work Regulations 1989.',
    inspectionDate: '2024-03-15',

    // Section 3 – installation details
    installationAddress: 'Marsh Lane, Farnworth, Bolton, BL4 0AW',
    premisesType: 'Commercial',
    estimatedAgeOfWiring: '15',
    evidenceOfAdditions: 'Yes',
    estimatedAgeOfAdditions: '5',
    installationRecordsAvailable: 'No',
    dateOfLastInspection: '2019-04-10',

    // Section 4 – extent & limitations
    extentOfInspection: '50% of the installation in accordance with item 3.8.4 of Guidance Note 3. Circuits in the main hall and offices were tested in full; storage and utility areas were visually inspected only.',
    agreedLimitations: 'No testing of HVAC control cables. No lifting of floor boards or inspection of buried conduit. Areas inaccessible due to ongoing building use were excluded from destructive testing.',
    agreedLimitationsWith: 'Mr. J. Hargreaves (Centre Manager)',
    operationalLimitations: 'Building in use during inspection. Some circuits could not be de-energised for testing.',

    // Section 5 – overall assessment
    overallAssessment: 'SATISFACTORY',

    // Section 6 – recommendations
    nextInspectionPeriod: '3 Years',

    // Section 8 – general condition
    generalCondition: 'The installation was found to be in a generally good condition, adequate for continued use. A number of C3 observations were made that should be attended to at the earliest opportunity to ensure continued safety.',

    // Section 10 – supply characteristics — DEMO AUTO-Zs
    earthingArrangements: 'TN-C-S',
    natureOfSupply: '3-phase (4 wire) ac',
    nominalVoltageU: '400',
    nominalVoltageUo: '230',
    nominalFrequency: '50',
    prospectiveFaultCurrent: '1.8',
    externalEarthFaultLoopImpedance: '0.13',
    numberOfSupplies: '1',
    supplyProtectiveDeviceType: 'BS 1361 Fuse HBC',
    supplyProtectiveDeviceRating: '100',
    supplyProtectiveDeviceStandard: 'BS 1361',
    shortCircuitCapacity: '33',
    supplyPolarityConfirmed: 'Yes',

    // Section 11 – earthing
    meansOfEarthing: "Distributor's facility",
    maximumDemand: '100 Amps',
    protectiveMeasures: 'ADS (Automatic Disconnection of Supply)',

    // NEW: Section 16 Circuit Schedule (3 demo rows w/ auto-calculated maxZs)
    circuits: [
      // MCB B32A: maxZs=1.44Ω ✓ PASS 1.15Ω
      {
        circuitNumber: 'DB1-01',
        designation: 'Main Lighting Radial',
        wiringType: 'A',
        refMethod: 'C',
        liveCsa: '1.5',
        cpcCsa: '1.5',
        maxDiscTime: '0.4',
        bsen: '60898',
        deviceType: 'MCB Type B',
        rating: '32',
        maxZs: calculateMaxZs('MCB Type B', '32'),  // "1.44Ω"
        measuredZs: '1.15',
        r1r2: '0.28',
        r2: '0.15',
      },
      // RCBO C16A: maxZs=1.92Ω ✓ PASS 1.75Ω
      {
        circuitNumber: 'DB1-02', 
        designation: 'Kitchen Ring Socket',
        wiringType: 'A',
        refMethod: 'C',
        liveCsa: '2.5',
        cpcCsa: '2.5',
        maxDiscTime: '0.4',
        bsen: '61009',
        deviceType: 'RCBO Type C',
        rating: '16',
        rcdRating: '30mA',
        maxZs: calculateMaxZs('RCBO Type C', '16'),  // "1.92Ω"
        measuredZs: '1.75',
        r1r2: '0.32',
        r2: '0.18',
      },
      // BS88 20A: maxZs=2.30Ω ✗ FAIL 2.65Ω
      {
        circuitNumber: 'DB1-03',
        designation: 'Utility Radial Socket', 
        wiringType: 'A',
        refMethod: 'C',
        liveCsa: '2.5',
        cpcCsa: '1.0',
        maxDiscTime: '0.4',
        bsen: '60269',
        deviceType: 'BS88 Fuse',
        rating: '20',
        maxZs: calculateMaxZs('BS88 Fuse', '20'),  // "2.30Ω"
        measuredZs: '2.65',  // FAIL — triggers validation warning
        r1r2: '0.45',
        r2: '0.22',
      },
    ],
  },
  customer: {
    name: 'Highfield Hall Community Centre',
    email: 'admin@highfieldhall.org.uk',
    phone: '01204 571 849',
    address: 'Marsh Lane, Farnworth, Bolton',
    postcode: 'BL4 0AW',
    contactPerson: 'Mr. J. Hargreaves',
  },
  items: [
    {
      id: 1,
      itemType: 'observation',
      location: 'Main Distribution Board',
      description: 'Inspection Schedule Item 1.1: The means of isolation (main switch) does not have provision for securing in the off position. Regulation 537.3.2 refers.',
      status: 'unsatisfactory',
      defects: 'C2',
      recommendations: 'Provide a facility to padlock the main switch in the open (off) position.',
    },
    {
      id: 2,
      itemType: 'observation',
      location: 'Office Circuit A2',
      description: 'Inspection Schedule Item 3.4: Conductor insulation is discoloured and shows signs of thermal damage at the connection to luminaire fitting in office 3. Regulation 512.1.1 refers.',
      status: 'unsatisfactory',
      defects: 'C2',
      recommendations: 'Replace damaged wiring and investigate cause of overheating. Verify correct rating of over-current protective device.',
    },
    {
      id: 3,
      itemType: 'observation',
      location: 'Kitchen / Wet Areas',
      description: 'Inspection Schedule Item 6.2: IP rating of luminaires is not appropriate for Zone 1 in the kitchen area. IP2X or IPXXB minimum is required. Regulation 701.512.2 refers.',
      status: 'unsatisfactory',
      defects: 'C3',
      recommendations: 'Replace luminaires in the kitchen with fittings of appropriate IP rating for the zone of installation.',
    },
    {
      id: 4,
      itemType: 'observation',
      location: 'External Consumer Unit',
      description: 'Inspection Schedule Item 8.1: The external consumer unit cover does not close securely, allowing access to live parts. Regulation 416.1 refers.',
      status: 'unsatisfactory',
      defects: 'C2',
      recommendations: 'Repair or replace consumer unit cover to prevent unauthorised or accidental access to live conductors.',
    },
    {
      id: 5,
      itemType: 'observation',
      location: 'Storage Room',
      description: 'Inspection Schedule Item 4.3: Single-phase socket outlets installed without additional protection by RCD (≤30mA) in a location where use of portable equipment outdoors is reasonably foreseeable. Regulation 411.3.3 refers.',
      status: 'satisfactory',
      defects: 'C3',
      recommendations: 'Provide RCD protection (≤30mA) to socket outlets in the storage room to reduce risk of electric shock.',
    },
    {
      id: 6,
      itemType: 'observation',
      location: 'Main Hall – Ceiling Void',
      description: 'Inspection Schedule Item 5.9: Cables in the ceiling void are not adequately supported and are resting on suspended ceiling tiles. Risk of mechanical damage and overheating. Regulation 522.8.5 refers.',
      status: 'satisfactory',
      defects: 'C3',
      recommendations: 'Provide adequate cable supports at intervals not exceeding those recommended by manufacturer; cables should not bear on ceiling tiles.',
    },
    {
      id: 7,
      itemType: 'observation',
      location: 'Distribution Board – Circuit 14',
      description: 'Inspection Schedule Item 2.7: Earth fault loop impedance for circuit 14 (HVAC) measured at 1.92Ω exceeds the maximum value of 1.84Ω permitted for the installed 16A Type B MCB. Further investigation required to determine cause.',
      status: 'not_tested',
      defects: 'FI',
      recommendations: 'Investigate cause of elevated earth fault loop impedance. Check conductor continuity and connections. Re-test after remedial work.',
    },
  ],
};

async function main() {
  console.log('Generating sample EICR PDF...');
  const pdfBytes = await generateCertificatePDF(sampleCertificate);

  const outputPath = join(process.cwd(), 'test-results', 'sample-eicr-CE202695.pdf');
  writeFileSync(outputPath, Buffer.from(pdfBytes));
  console.log(`✅ PDF written to: ${outputPath}`);
}

void main();
