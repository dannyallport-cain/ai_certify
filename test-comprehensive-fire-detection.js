const fs = require('fs');

// Test the comprehensive Fire Detection PDF generation
async function testComprehensiveFireDetectionPDF() {
  try {
    // Import the generator dynamically
    const { generateFireDetectionInspectionReport } = await import('./lib/pdf/generator.ts');
    
    // Sample comprehensive certificate data matching the new form fields
    const sampleCertificateData = {
      id: 1,
      certificateNumber: 'FD-2025-001',
      certificateType: 'BS5839-1',
      siteName: 'Test Commercial Building',
      siteAddress: '123 Business Street, London, SW1A 1AA',
      inspectionDate: '2025-06-06',
      nextInspectionDate: '2025-12-06',
      inspectorName: 'John Smith',
      status: 'valid',
      customer: {
        name: 'ABC Corporation Ltd',
        email: 'contact@abc-corp.com',
        phone: '020 7123 4567',
        address: '456 Corporate Avenue, London, SW1B 2BB',
        postcode: 'SW1B 2BB',
        contactPerson: 'Jane Doe'
      },
      formData: {
        // Certificate Details
        clientAddress: '456 Corporate Avenue\nLondon, SW1B 2BB\nUnited Kingdom',
        
        // Installation Details
        installationAddress: '123 Business Street\nLondon, SW1A 1AA\nUnited Kingdom',
        systemDetails: 'Conventional fire detection and alarm system with 8 zones covering office spaces, meeting rooms, and common areas',
        systemExtent: 'Complete building coverage including all floors, escape routes, and high-risk areas',
        operationalLimitations: 'System inspection limited to accessible areas only. Roof space detectors not accessible due to ongoing construction work. Agreed with building manager on 06/06/2025.',
        
        // Electrical Contractor Details
        contractorTradingTitle: 'Fire Safety Solutions Ltd',
        contractorAddress: '789 Industrial Estate\nBirmingham, B12 3CD\nUnited Kingdom',
        contractorPostcode: 'B12 3CD',
        contractorTelephone: '0121 456 7890',
        contractorRegistration: 'NICEIC 12345',
        
        // Inspection Details
        inspectionType: 'Periodic inspection and test',
        variationsFromBS5839: 'None - full compliance with BS 5839-1:2017 recommendations',
        inspectorName: 'John Smith',
        inspectorPosition: 'Senior Fire Safety Engineer',
        
        // System Information
        systemType: 'L2',
        controlPanelMake: 'Kentec',
        controlPanelModel: 'Syncro AS',
        numberOfZones: '8',
        numberOfDevices: '45',
        totalDetectors: '32',
        totalCallPoints: '8',
        totalSounders: '5',
        serviceInterval: '6 Months',
        installationDate: '2020-03-15',
        lastServiceDate: '2024-12-06',
        
        // Summary
        overallAssessment: 'satisfactory',
        generalCondition: 'The fire detection and alarm system is in good working order with all components functioning correctly. Regular maintenance has been carried out and the system complies with current standards.',
        outstandingDefects: 'None identified during this inspection',
        logBookEntries: 'on',
        falseAlarmsCount: '2',
        falseAlarmsPer100Detectors: '6.25',
        
        // Observations and Recommendations
        systemStatus: 'no-items',
        observationsAndRecommendations: 'No significant issues identified. All systems tested satisfactorily.',
        immediateActionItems: '',
        urgentActionItems: '',
        improvementItems: '',
        investigationItems: '',
        
        // Related Documents
        relatedDocuments: 'Installation Certificate FD-2020-001, Previous Service Report FD-2024-002',
        
        // Quarterly Battery Inspection
        batteriesChecked: 'on',
        batteryConnectionsChecked: 'on',
        electrolyteLevelsChecked: 'on',
        
        // Schedule of Items Inspected - Premises
        callPointsSuitable: 'on',
        callPointsUnobstructed: 'on',
        callPointsConspicuous: 'on',
        exitsHaveCallPoints: 'on',
        detectorsSuitable: 'on',
        detectorsSited: 'on',
        alarmDevicesSited: 'on',
        noPartitions500mm: 'on',
        noStorage300mm: 'on',
        clearSpace500mm: 'on',
        detectorAbilityNotImpeded: 'on',
        detectorsNotUnsuitable: 'on',
        additionalEquipmentProvided: 'on',
        
        // Documentation
        logBookExamined: 'on',
        faultsAttended: 'on',
        
        // False Alarms
        falseAlarmsRecordChecked: 'on',
        falseAlarmRateRecorded: 'on',
        falseAlarmActionComplies: 'on',
        
        // Schedule of Items Tested
        fireAlarmFunctionsChecked: 'on',
        alarmDevicesOperation: 'on',
        controlsIndicatorsChecked: 'on',
        ancillaryFunctionsTested: 'on',
        manufacturerChecksPerformed: 'on',
        faultIndicatorsChecked: 'on',
        automaticAlarmTransmission: 'on',
        automaticFaultTransmission: 'on',
        radioSystemsServiced: 'on',
        otherEquipmentChecks: 'on',
        printersCheckedOperation: 'on',
        printersCheckedLegibility: 'on',
        printConsumablesAvailable: 'on',
        standbyBatteryDisconnected: 'on',
        specificGravityChecked: 'on',
        mainsDisconnectedTested: 'on'
      },
      items: [
        {
          id: 1,
          itemType: 'Smoke Detector',
          location: 'Reception Area',
          description: 'Optical smoke detector - Zone 1',
          status: 'satisfactory',
          defects: null,
          recommendations: null
        },
        {
          id: 2,
          itemType: 'Manual Call Point',
          location: 'Main Exit',
          description: 'Break glass call point',
          status: 'satisfactory',
          defects: null,
          recommendations: null
        },
        {
          id: 3,
          itemType: 'Sounder',
          location: 'Corridor',
          description: 'Electronic sounder/beacon',
          status: 'satisfactory',
          defects: null,
          recommendations: null
        }
      ]
    };

    console.log('Generating comprehensive Fire Detection PDF...');
    const pdfBytes = generateFireDetectionInspectionReport(sampleCertificateData);
    
    // Save the PDF
    const outputPath = './test-comprehensive-fire-detection-report.pdf';
    fs.writeFileSync(outputPath, Buffer.from(pdfBytes));
    
    console.log(`✅ Comprehensive Fire Detection PDF generated successfully: ${outputPath}`);
    console.log(`📄 PDF size: ${Math.round(pdfBytes.byteLength / 1024)}KB`);
    console.log(`📋 Certificate Number: ${sampleCertificateData.certificateNumber}`);
    console.log(`🏢 Site: ${sampleCertificateData.siteName}`);
    console.log(`👤 Inspector: ${sampleCertificateData.inspectorName}`);
    console.log(`📅 Inspection Date: ${sampleCertificateData.inspectionDate}`);
    console.log(`🔍 System Type: ${sampleCertificateData.formData.systemType}`);
    console.log(`⚡ Total Devices: ${sampleCertificateData.formData.numberOfDevices}`);
    console.log(`✅ Overall Assessment: ${sampleCertificateData.formData.overallAssessment}`);
    
  } catch (error) {
    console.error('❌ Error generating comprehensive Fire Detection PDF:', error);
    process.exit(1);
  }
}

testComprehensiveFireDetectionPDF();
