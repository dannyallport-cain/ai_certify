const { generateFireDetectionInspectionReport } = require('./lib/pdf/generator.ts');
const fs = require('fs');

// Sample certificate data that matches what would come from our enhanced BS5839-1 form
const sampleCertificateData = {
  id: 1,
  certificateNumber: 'BS5839-1-20250606-001',
  certificateType: 'BS5839-1',
  siteName: 'Test Office Building',
  siteAddress: '123 Business Street, London, EC1A 1BB',
  inspectionDate: '2025-06-06',
  nextInspectionDate: '2025-12-06',
  inspectorName: 'John Inspector',
  status: 'completed',
  formData: {
    systemType: 'L2',
    numberOfZones: 8,
    numberOfDevices: 45,
    controlPanelMake: 'Kentec',
    controlPanelModel: 'Syncro AS',
    totalDetectors: 35,
    totalCallPoints: 8,
    totalSounders: 12,
    installationDate: '2020-01-15',
    lastServiceDate: '2024-12-06',
    serviceInterval: '6 Months',
    inspectorQualification: 'FIA Certified',
    inspectionType: 'Routine Service',
    overallCondition: 'satisfactory'
  },
  customer: {
    name: 'Test Company Ltd',
    email: 'contact@testcompany.com',
    phone: '+44 20 1234 5678',
    address: '456 Corporate Road, London',
    postcode: 'EC2A 2BB',
    contactPerson: 'Jane Manager'
  },
  items: [
    {
      id: 1,
      itemType: 'smoke_detector',
      location: 'Reception Area',
      description: 'Optical Smoke Detector',
      status: 'satisfactory',
      defects: null,
      recommendations: null
    },
    {
      id: 2,
      itemType: 'call_point',
      location: 'Main Exit',
      description: 'Manual Call Point',
      status: 'satisfactory',
      defects: null,
      recommendations: null
    },
    {
      id: 3,
      itemType: 'control_panel',
      location: 'Security Room',
      description: 'Main Fire Alarm Control Panel',
      status: 'unsatisfactory',
      defects: 'Backup battery low voltage warning',
      recommendations: 'Replace backup batteries within 30 days'
    }
  ]
};

try {
  console.log('Generating Fire Detection Inspection Report PDF...');
  const pdfBytes = generateFireDetectionInspectionReport(sampleCertificateData);
  
  // Save to file
  fs.writeFileSync('./test-fire-detection-report.pdf', Buffer.from(pdfBytes));
  console.log('PDF generated successfully: test-fire-detection-report.pdf');
  console.log(`PDF size: ${pdfBytes.length} bytes`);
} catch (error) {
  console.error('Error generating PDF:', error);
}
