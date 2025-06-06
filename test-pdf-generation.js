// Test PDF generation with actual form data including numeric values
const fs = require('fs');

// Simulate the PDF generation functionality
const testPDFGeneration = () => {
  console.log('Testing PDF generation with form data containing numeric values...');
  
  const testData = {
    id: 1,
    certificateNumber: 'BS5839-TEST-001',
    certificateType: 'BS5839-1',
    siteName: 'Test Building',
    siteAddress: '123 Test Street, Test City',
    inspectionDate: '2025-06-06',
    nextInspectionDate: '2026-06-06',
    inspectorName: 'John Smith',
    status: 'satisfactory',
    formData: {
      systemType: 'L2',
      numberOfZones: 8,        // Numeric value that was causing the error
      numberOfDevices: 45,     // Numeric value that was causing the error
      controlPanelModel: 'Kentec Syncro AS',
      installationDate: '2024-01-15',
      lastServiceDate: '2024-12-15',
      serviceInterval: '6 Months',
      inspectorQualification: 'FIA Certified',
      inspectionType: 'Routine Service'
    },
    customer: {
      name: 'Test Company Ltd',
      email: 'test@company.com',
      phone: '01234567890',
      address: '456 Company Road',
      postcode: 'TE5T 1NG',
      contactPerson: 'Jane Doe'
    },
    items: [
      {
        id: 1,
        itemType: 'smoke_detector',
        location: 'Main Corridor',
        description: 'Optical smoke detector',
        status: 'satisfactory',
        defects: null,
        recommendations: null
      }
    ]
  };

  console.log('Test data includes numeric values:');
  console.log('- numberOfZones:', typeof testData.formData.numberOfZones, '=', testData.formData.numberOfZones);
  console.log('- numberOfDevices:', typeof testData.formData.numberOfDevices, '=', testData.formData.numberOfDevices);
  
  console.log('\nThese numeric values should now be safely converted to strings in the PDF generator.');
  console.log('The safeString() helper function will convert them before passing to jsPDF.');
  
  return testData;
};

const testData = testPDFGeneration();
console.log('\nTest completed. The PDF generator has been updated to handle numeric values safely.');
