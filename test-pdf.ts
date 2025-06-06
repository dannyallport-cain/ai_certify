// Test script to verify PDF generation functionality
import { generateCertificatePDF } from './lib/pdf/generator.js';
import { writeFileSync } from 'fs';

// Sample certificate data for testing
const sampleCertificateData = {
  id: 1,
  certificateNumber: 'FS-2025-001',
  certificateType: 'BS5839-1' as const,
  siteName: 'Office Tower One',
  siteAddress: '123 Business Street, London',
  inspectionDate: '2025-06-01',
  nextInspectionDate: '2025-12-01',
  inspectorName: 'Mike Inspector',
  status: 'completed' as const,
  formData: {
    numberOfZones: 8,
    numberOfDevices: 45,
    systemType: 'L2',
    maintenanceContract: 'Annual'
  },
  customer: {
    name: 'Office Tower One',
    email: 'contact@officetower.com',
    phone: '+44 20 1234 5678',
    address: '123 Business Street',
    postcode: 'W1A 0AA',
    contactPerson: 'John Smith'
  },
  items: [
    {
      id: 1,
      itemType: 'detector',
      location: 'Ground Floor Reception',
      description: 'Optical Smoke Detector',
      status: 'satisfactory' as const,
      defects: null,
      recommendations: null
    },
    {
      id: 2,
      itemType: 'panel',
      location: 'Security Room',
      description: 'Main Fire Alarm Control Panel',
      status: 'satisfactory' as const,
      defects: null,
      recommendations: null
    },
    {
      id: 3,
      itemType: 'call_point',
      location: 'Emergency Exit',
      description: 'Manual Call Point',
      status: 'unsatisfactory' as const,
      defects: 'Glass broken',
      recommendations: 'Replace glass element'
    }
  ]
};

console.log('Testing PDF generation...');

try {
  const pdfBytes = generateCertificatePDF(sampleCertificateData);
  console.log('PDF generated successfully!');
  console.log('PDF size:', pdfBytes.length, 'bytes');
  
  // Save the PDF to test file
  writeFileSync('./test-certificate.pdf', Buffer.from(pdfBytes));
  console.log('Test PDF saved as test-certificate.pdf');
  
} catch (error) {
  console.error('PDF generation failed:', error);
}
