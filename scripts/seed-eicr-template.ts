import { db } from '../lib/db/drizzle';
import { certificateTemplates } from '../lib/db/schema';

const eicrTemplate = {
  sections: [
    {
      id: 'header',
      type: 'header',
      label: 'Company Header',
      visible: true,
      order: 1,
      config: { showLogo: true, showAddress: true, showContact: true },
    },
    {
      id: 'report-title',
      type: 'title',
      label: 'Report Title',
      visible: true,
      order: 2,
      config: {
        title: 'ELECTRICAL INSTALLATION CONDITION REPORT',
        subtitle: 'Requirements For Electrical Installations – BS 7671 IET Wiring Regulations',
      },
    },
    {
      id: 'cert-number',
      type: 'certificate-number',
      label: 'Certificate Number',
      visible: true,
      order: 3,
    },
    {
      id: 'section-1-client',
      type: 'data-table',
      label: '1. Details of the Person Ordering the Report',
      visible: true,
      order: 4,
      config: {
        title: '1. Details of the Person Ordering the Report',
        fields: [
          { key: 'siteName', label: 'Client / Organisation' },
          { key: 'clientAddress', label: 'Client Address' },
        ],
      },
    },
    {
      id: 'section-2-reason',
      type: 'data-table',
      label: '2. Reason for Producing This Report',
      visible: true,
      order: 5,
      config: {
        title: '2. Reason for Producing This Report',
        fields: [
          { key: 'reasonForReport', label: 'Reason for Report' },
          { key: 'inspectionDate', label: 'Date(s) of Inspection' },
        ],
      },
    },
    {
      id: 'section-3-installation',
      type: 'data-table',
      label: '3. Details of the Installation',
      visible: true,
      order: 6,
      config: {
        title: '3. Details of the Installation',
        fields: [
          { key: 'installationAddress', label: 'Installation Address' },
          { key: 'premisesType', label: 'Description of Premises' },
          { key: 'estimatedAgeOfWiring', label: 'Estimated Age of Wiring System (years)' },
          { key: 'evidenceOfAdditions', label: 'Evidence of Additions/Alterations' },
          { key: 'estimatedAgeOfAdditions', label: 'Estimated Age of Additions (years)' },
          { key: 'installationRecordsAvailable', label: 'Installation Records Available (Reg 651.1)' },
          { key: 'dateOfLastInspection', label: 'Date of Last Inspection' },
        ],
      },
    },
    {
      id: 'section-4-extent',
      type: 'data-table',
      label: '4. Extent and Limitations',
      visible: true,
      order: 7,
      config: {
        title: '4. Extent and Limitations of Inspection and Testing',
        fields: [
          { key: 'extentOfInspection', label: 'Extent of Electrical Installation Covered' },
          { key: 'agreedLimitations', label: 'Agreed Limitations (including reasons)' },
          { key: 'agreedLimitationsWith', label: 'Agreed With' },
          { key: 'operationalLimitations', label: 'Operational Limitations' },
        ],
      },
    },
    {
      id: 'section-5-assessment',
      type: 'data-table',
      label: '5. Overall Assessment',
      visible: true,
      order: 8,
      config: {
        title: '5. Overall Assessment of the Installation',
        fields: [
          { key: 'overallAssessment', label: 'Overall Condition of the Installation' },
        ],
      },
    },
    {
      id: 'section-6-recommendations',
      type: 'data-table',
      label: '6. Recommendations',
      visible: true,
      order: 9,
      config: {
        title: '6. Recommendations',
        fields: [
          { key: 'nextInspectionPeriod', label: 'Recommended Reinspection Period' },
          { key: 'nextInspectionDate', label: 'Recommended Next Inspection Date' },
        ],
      },
    },
    {
      id: 'section-7-observations',
      type: 'defects',
      label: '7. Observations and Recommendations',
      visible: true,
      order: 10,
      config: {
        title: '7. Observations and Recommendations for Actions to be Taken (in order of priority)',
        subtitle: 'Classification of Observation Codes: C1 – Danger Present | C2 – Potentially Dangerous | C3 – Improvement Recommended | FI – Further Investigation Required',
        columns: ['Item No.', 'Observation', 'Code'],
        codeField: 'defects',
      },
    },
    {
      id: 'section-8-general',
      type: 'data-table',
      label: '8. General Condition',
      visible: true,
      order: 11,
      config: {
        title: '8. General Condition of the Electrical Installation',
        fields: [
          { key: 'generalCondition', label: 'General Condition' },
        ],
      },
    },
    {
      id: 'section-9-declaration',
      type: 'certification',
      label: '9. Declaration',
      visible: true,
      order: 12,
      config: {
        title: '9. Declaration',
        statement: 'I/We, being the person(s) responsible for the inspection and testing of the electrical installation (as indicated by my/our signatures below), particulars of which are described above, having exercised reasonable skill and care when carrying out the inspection and testing, hereby declare that the information in this report, insofar as it can be ascertained at the time of the inspection and testing, is correct and accurately represents the condition of the electrical installation described above.',
        fields: [
          { key: 'tradingTitle', label: 'Trading Title' },
          { key: 'companyAddress', label: 'Company Address' },
          { key: 'registrationNumber', label: 'Registration Number' },
          { key: 'companyTelephone', label: 'Telephone Number' },
          { key: 'inspectorName', label: 'Inspector Name' },
          { key: 'inspectorPosition', label: 'Position' },
          { key: 'inspectionDate', label: 'Date' },
        ],
      },
    },
    {
      id: 'section-10-supply',
      type: 'data-table',
      label: '10. Supply Characteristics and Earthing Arrangements',
      visible: true,
      order: 13,
      config: {
        title: '10. Supply Characteristics and Earthing Arrangements',
        fields: [
          { key: 'earthingArrangements', label: 'Earthing Arrangement' },
          { key: 'natureOfSupply', label: 'Nature of Supply' },
          { key: 'nominalVoltageU', label: 'Nominal Voltage U (V)' },
          { key: 'nominalVoltageUo', label: 'Nominal Voltage Uo (V)' },
          { key: 'nominalFrequency', label: 'Nominal Frequency (Hz)' },
          { key: 'prospectiveFaultCurrent', label: 'Prospective Fault Current, Ipf (kA)' },
          { key: 'externalEarthFaultLoopImpedance', label: 'External Earth Fault Loop Impedance, Ze (Ω)' },
          { key: 'numberOfSupplies', label: 'Number of Supplies' },
          { key: 'supplyProtectiveDeviceType', label: 'Supply Protective Device Type' },
          { key: 'supplyProtectiveDeviceRating', label: 'Supply Protective Device Rating (A)' },
          { key: 'shortCircuitCapacity', label: 'Short-Circuit Capacity (kA)' },
        ],
      },
    },
    {
      id: 'section-11-earthing',
      type: 'data-table',
      label: '11. Means of Earthing / Particulars',
      visible: true,
      order: 14,
      config: {
        title: '11. Means of Earthing and Particulars of Installation',
        fields: [
          { key: 'meansOfEarthing', label: 'Means of Earthing' },
          { key: 'maximumDemand', label: 'Maximum Demand (Load)' },
          { key: 'protectiveMeasures', label: 'Protective Measure(s) Against Electric Shock' },
        ],
      },
    },
    {
      id: 'signatures',
      type: 'signatures',
      label: 'Signatures',
      visible: true,
      order: 15,
      config: {
        fields: [
          { key: 'inspectorSignature', label: 'Inspector Signature' },
          { key: 'clientSignature', label: 'Client Signature' },
        ],
      },
    },
  ],
  colors: {
    primary: '#1a3a5c',
    secondary: '#2c5282',
    accent: '#ffc107',
    background: '#ffffff',
    text: '#1a202c',
  },
  fonts: {
    heading: 'helvetica',
    body: 'helvetica',
    size: { small: 8, medium: 10, large: 14 },
  },
  layout: {
    margins: { top: 15, right: 15, bottom: 20, left: 15 },
    spacing: 6,
  },
};

async function seedEICRTemplate() {
  console.log('Seeding EICR template...');
  try {
    const result = await db.insert(certificateTemplates).values({
      teamId: 1,
      name: 'EICR BS 7671 Standard Template',
      certificateType: 'EICR',
      isDefault: true,
      isActive: true,
      template: eicrTemplate as any,
      description: 'Electrical Installation Condition Report conforming to BS 7671 IET Wiring Regulations',
      version: 1,
      createdBy: 129,
    }).returning();
    console.log('✅ EICR template seeded successfully:', result[0]?.id);
  } catch (err: any) {
    if (err?.code === '23505') {
      console.log('ℹ️  EICR template already exists, skipping.');
    } else {
      console.error('❌ Failed to seed EICR template:', err);
      process.exit(1);
    }
  }
  process.exit(0);
}

seedEICRTemplate();
