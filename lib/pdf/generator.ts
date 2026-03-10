import { jsPDF } from 'jspdf';

export interface CertificateData {
  id: number;
  certificateNumber: string;
  certificateType: string;
  siteName?: string | null;
  siteAddress?: string | null;
  inspectionDate?: string | null;
  nextInspectionDate?: string | null;
  inspectorName?: string | null;
  status: string;
  formData?: Record<string, any>;
  customer: {
    name: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    postcode?: string | null;
    contactPerson?: string | null;
  };
  items?: Array<{
    id: number;
    itemType: string;
    location?: string | null;
    description?: string | null;
    status: string;
    defects?: string | null;
    recommendations?: string | null;
  }>;
}

export function generateCertificatePDF(certificate: CertificateData): Uint8Array {
  // Route EICR to a dedicated generator matching the BS 7671 form structure
  if (certificate.certificateType === 'EICR') {
    return generateEICRPDF(certificate);
  }

  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  let yPosition = margin;

  // Helper functions
  const safeString = (value: any): string => {
    if (value === null || value === undefined) return '';
    return String(value);
  };

  const addText = (text: string, x: number, y: number, options?: any) => {
    pdf.text(safeString(text), x, y, options);
  };

  const addMultiLineText = (text: string, x: number, y: number, maxWidth: number, fontSize = 10) => {
    pdf.setFontSize(fontSize);
    const lines = pdf.splitTextToSize(safeString(text), maxWidth);
    pdf.text(lines, x, y);
    return y + (lines.length * fontSize * 0.35);
  };

  const addLine = (x1: number, y1: number, x2: number, y2: number, lineWidth = 0.5) => {
    pdf.setLineWidth(lineWidth);
    pdf.line(x1, y1, x2, y2);
  };

  const addBox = (x: number, y: number, width: number, height: number, lineWidth = 0.5) => {
    pdf.setLineWidth(lineWidth);
    pdf.rect(x, y, width, height);
  };

  const addFilledBox = (x: number, y: number, width: number, height: number, color = [240, 240, 240]) => {
    pdf.setFillColor(color[0], color[1], color[2]);
    pdf.rect(x, y, width, height, 'F');
  };

  const addColoredSection = (x: number, y: number, width: number, height: number, headerColor = [52, 73, 124], contentColor = [248, 249, 250]) => {
    // Add content background
    pdf.setFillColor(contentColor[0], contentColor[1], contentColor[2]);
    pdf.rect(x, y, width, height, 'F');
    
    // Add border
    pdf.setDrawColor(52, 73, 124);
    pdf.setLineWidth(1);
    pdf.rect(x, y, width, height);
    
    // Reset draw color
    pdf.setDrawColor(0, 0, 0);
  };

  const checkNewPage = (requiredSpace: number) => {
    if (yPosition + requiredSpace > pageHeight - margin) {
      pdf.addPage();
      yPosition = margin;
      addHeader();
    }
  };

  const addHeader = () => {
    // Company header with gradient-like effect using colored boxes
    addColoredSection(margin, margin, pageWidth - 2 * margin, 30, [52, 73, 124], [240, 245, 255]);
    
    // Company name header bar
    pdf.setFillColor(52, 73, 124);
    pdf.rect(margin + 2, margin + 2, pageWidth - 2 * margin - 4, 12, 'F');
    
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(255, 255, 255);
    addText('FIRE SAFETY CERTIFICATIONS LTD', margin + 5, margin + 10);
    
    // Company details
    pdf.setTextColor(52, 73, 124);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    addText('Professional Fire Safety Inspection Services', margin + 5, margin + 20);
    addText('Email: info@firesafetycert.com | Phone: 0800 123 4567', margin + 5, margin + 26);
    
    // Reset text color
    pdf.setTextColor(0, 0, 0);
    
    yPosition = margin + 40;
  };

  // Initial header
  addHeader();

  // Main Title
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  const titleText = getCertificateTypeDisplayName(certificate.certificateType);
  addText(titleText, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 8;

  pdf.setFontSize(14);
  addText('INSPECTION AND SERVICING REPORT', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 15;

  // Reference standards
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'italic');
  const standardsText = getStandardsText(certificate.certificateType);
  yPosition = addMultiLineText(standardsText, pageWidth / 2, yPosition, pageWidth - 4 * margin, 9);
  pdf.text('', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 15;

  // Certificate Number Box with colored design
  addColoredSection(margin, yPosition, pageWidth - 2 * margin, 15, [52, 73, 124], [255, 245, 200]);
  
  // Certificate number header
  pdf.setFillColor(255, 193, 7); // Golden yellow for certificate number
  pdf.rect(margin + 2, yPosition + 2, pageWidth - 2 * margin - 4, 11, 'F');
  
  pdf.setFillColor(0, 0, 0); // Black border
  pdf.setLineWidth(1);
  pdf.rect(margin + 2, yPosition + 2, pageWidth - 2 * margin - 4, 11);
  
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0); // Black text on yellow background
  addText(`CERTIFICATE NUMBER: ${certificate.certificateNumber}`, margin + 5, yPosition + 9);
  
  // Reset colors
  pdf.setTextColor(0, 0, 0);
  pdf.setDrawColor(0, 0, 0);
  yPosition += 25;

  // Section 1: Site Details
  checkNewPage(80);
  addSectionHeader('1. SITE DETAILS', yPosition);
  yPosition += 12;

  const siteDetails = [
    ['Site Name:', certificate.siteName || 'Not specified'],
    ['Site Address:', certificate.siteAddress || 'Not specified'],
    ['Client/Customer:', certificate.customer.name],
    ['Contact Person:', certificate.customer.contactPerson || 'Not specified'],
    ['Contact Telephone:', certificate.customer.phone || 'Not specified'],
    ['Contact Email:', certificate.customer.email || 'Not specified']
  ];

  yPosition = addDetailTable(siteDetails, yPosition);
  yPosition += 15;

  // Section 2: System/Equipment Details
  checkNewPage(100);
  addSectionHeader('2. SYSTEM/EQUIPMENT DETAILS', yPosition);
  yPosition += 12;

  const systemDetails = getSystemDetails(certificate);
  yPosition = addDetailTable(systemDetails, yPosition);
  yPosition += 15;

  // Section 3: Inspection Details
  checkNewPage(80);
  addSectionHeader('3. INSPECTION DETAILS', yPosition);
  yPosition += 12;

  const inspectionDetails = [
    ['Inspection Date:', formatDate(certificate.inspectionDate)],
    ['Inspector Name:', certificate.inspectorName || 'Not specified'],
    ['Inspector Qualification:', certificate.formData?.inspectorQualification || 'Certified Fire Safety Engineer'],
    ['Inspection Type:', certificate.formData?.inspectionType || getDefaultInspectionType(certificate.certificateType)],
    ['Next Inspection Due:', formatDate(certificate.nextInspectionDate)],
    ['Certificate Status:', certificate.status.toUpperCase()]
  ];

  yPosition = addDetailTable(inspectionDetails, yPosition);
  yPosition += 15;

  // Section 4: Equipment/Items Tested
  checkNewPage(120);
  addSectionHeader('4. EQUIPMENT/ITEMS TESTED', yPosition);
  yPosition += 12;

  if (certificate.items && certificate.items.length > 0) {
    yPosition = addItemsTable(certificate.items, yPosition);
  } else {
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'italic');
    addText('No specific items recorded for this inspection.', margin + 5, yPosition);
    yPosition += 15;
  }

  yPosition += 15;

  // Section 5: Defects and Recommendations
  checkNewPage(80);
  addSectionHeader('5. DEFECTS AND RECOMMENDATIONS', yPosition);
  yPosition += 12;

  const defectItems = certificate.items?.filter(item => 
    item.defects || item.recommendations || item.status !== 'satisfactory'
  ) || [];

  if (defectItems.length > 0) {
    defectItems.forEach((item, index) => {
      checkNewPage(35);
      
      // Calculate height needed for this defect item
      let itemHeight = 20; // Base height
      if (item.defects) {
        const defectLines = pdf.splitTextToSize(safeString(item.defects), pageWidth - margin - 50);
        itemHeight += defectLines.length * 4 + 5;
      }
      if (item.recommendations) {
        const recLines = pdf.splitTextToSize(safeString(item.recommendations), pageWidth - margin - 50);
        itemHeight += recLines.length * 4 + 5;
      }
      
      // Add colored section for defect item
      addColoredSection(margin, yPosition, pageWidth - 2 * margin, itemHeight, [220, 53, 69], [255, 245, 245]);
      
      // Item header with red background for defects
      pdf.setFillColor(220, 53, 69); // Red for defects
      pdf.rect(margin + 2, yPosition + 2, pageWidth - 2 * margin - 4, 10, 'F');
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 255, 255);
      addText(`DEFECT ${index + 1}: ${item.location || item.itemType}`, margin + 5, yPosition + 9);
      
      // Reset text color
      pdf.setTextColor(0, 0, 0);
      yPosition += 15;
      
      if (item.defects) {
        pdf.setFont('helvetica', 'bold');
        addText('Defect Description:', margin + 5, yPosition);
        pdf.setFont('helvetica', 'normal');
        yPosition = addMultiLineText(item.defects, margin + 5, yPosition + 4, pageWidth - margin - 50, 9);
        yPosition += 3;
      }
      
      if (item.recommendations) {
        pdf.setFont('helvetica', 'bold');
        addText('Recommendation:', margin + 5, yPosition);
        pdf.setFont('helvetica', 'normal');
        yPosition = addMultiLineText(item.recommendations, margin + 5, yPosition + 4, pageWidth - margin - 50, 9);
        yPosition += 3;
      }
      
      yPosition += 10;
    });
  } else {
    // No defects - show in green colored section
    addColoredSection(margin, yPosition, pageWidth - 2 * margin, 20, [40, 167, 69], [240, 255, 240]);
    
    // Green header for "no defects"
    pdf.setFillColor(40, 167, 69); // Green
    pdf.rect(margin + 2, yPosition + 2, pageWidth - 2 * margin - 4, 10, 'F');
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(255, 255, 255);
    addText('STATUS: NO DEFECTS IDENTIFIED', margin + 5, yPosition + 9);
    
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'normal');
    addText('No defects or recommendations identified during this inspection.', margin + 5, yPosition + 16);
    yPosition += 25;
  }

  // Section 6: Certification Statement
  checkNewPage(60);
  addSectionHeader('6. CERTIFICATION STATEMENT', yPosition);
  yPosition += 12;

  const certificationText = getCertificationStatement(certificate.certificateType);
  
  // Calculate height needed for certification text
  pdf.setFontSize(10);
  const certLines = pdf.splitTextToSize(certificationText, pageWidth - 2 * margin - 20);
  const certHeight = certLines.length * 4 + 10;
  
  // Add colored section for certification statement
  addColoredSection(margin, yPosition, pageWidth - 2 * margin, certHeight, [52, 73, 124], [245, 250, 255]);
  
  pdf.setFont('helvetica', 'normal');
  yPosition = addMultiLineText(certificationText, margin + 5, yPosition + 5, pageWidth - 2 * margin - 10, 10);
  yPosition += 20;

  // Signature Section
  checkNewPage(40);
  addSignatureSection(yPosition);

  // Helper function for section headers
  function addSectionHeader(title: string, y: number) {
    // Add colored header background
    pdf.setFillColor(52, 73, 124); // Dark blue header
    pdf.rect(margin, y, pageWidth - 2 * margin, 12, 'F');
    
    // Add border
    pdf.setDrawColor(52, 73, 124);
    pdf.setLineWidth(1);
    pdf.rect(margin, y, pageWidth - 2 * margin, 12);
    
    // Add white text
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(255, 255, 255); // White text
    addText(title, margin + 5, y + 8);
    
    // Reset text color to black
    pdf.setTextColor(0, 0, 0);
    pdf.setDrawColor(0, 0, 0);
  }

  // Helper function for detail tables
  function addDetailTable(details: string[][], startY: number): number {
    let currentY = startY;
    
    // Calculate total height needed for the entire table
    let totalHeight = 0;
    details.forEach(([label, value]) => {
      const maxWidth = pageWidth - margin - 80;
      const textLines = pdf.splitTextToSize(safeString(value), maxWidth);
      const lineHeight = 4;
      totalHeight += Math.max(12, textLines.length * lineHeight + 4);
    });
    
    // Add colored section background
    addColoredSection(margin, currentY, pageWidth - 2 * margin, totalHeight);
    currentY += 2; // Small padding from top
    
    details.forEach(([label, value]) => {
      checkNewPage(15);
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      addText(label, margin + 5, currentY + 7);
      
      pdf.setFont('helvetica', 'normal');
      const maxWidth = pageWidth - margin - 80;
      const textLines = pdf.splitTextToSize(safeString(value), maxWidth);
      
      if (textLines.length === 1) {
        addText(safeString(value), margin + 70, currentY + 7);
        currentY += 12;
      } else {
        // Multi-line content
        const lineHeight = 4;
        const totalHeight = Math.max(12, textLines.length * lineHeight + 4);
        
        pdf.text(textLines, margin + 70, currentY + 5);
        currentY += totalHeight;
      }
    });
    
    return currentY + 2; // Small padding at bottom
  }

  // Helper function for items table
  function addItemsTable(items: any[], startY: number): number {
    let currentY = startY;
    
    // Calculate total table height
    const headerHeight = 10;
    const rowHeight = 10;
    const totalHeight = headerHeight + (items.length * rowHeight) + 4; // 4 for padding
    
    // Add colored section background
    addColoredSection(margin, currentY, pageWidth - 2 * margin, totalHeight);
    currentY += 2; // Small padding from top
    
    // Table headers
    const headers = ['Item', 'Location', 'Type/Description', 'Test Result', 'Status'];
    const columnWidths = [30, 60, 80, 50, 30];
    const columnPositions = [margin + 7]; // +2 more for padding within colored box
    
    for (let i = 1; i < columnWidths.length; i++) {
      columnPositions.push(columnPositions[i-1] + columnWidths[i-1]);
    }
    
    // Header row with dark blue background
    pdf.setFillColor(52, 73, 124);
    pdf.rect(margin + 2, currentY, pageWidth - 2 * margin - 4, headerHeight, 'F');
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(255, 255, 255); // White text for header
    headers.forEach((header, index) => {
      addText(header, columnPositions[index], currentY + 7);
    });
    
    // Reset text color
    pdf.setTextColor(0, 0, 0);
    currentY += headerHeight;
    
    // Data rows
    items.forEach((item, index) => {
      checkNewPage(10);
      
      // Alternate row colors
      if (index % 2 === 1) {
        pdf.setFillColor(235, 240, 245);
        pdf.rect(margin + 2, currentY, pageWidth - 2 * margin - 4, rowHeight, 'F');
      }
      
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      
      const rowData = [
        String(index + 1),
        safeString(item.location).substring(0, 25),
        safeString(item.description || item.itemType).substring(0, 35),
        item.status === 'satisfactory' ? 'PASS' : 'FAIL',
        item.status === 'satisfactory' ? '✓' : '✗'
      ];
      
      rowData.forEach((data, colIndex) => {
        addText(data, columnPositions[colIndex], currentY + 7);
      });
      
      currentY += rowHeight;
    });
    
    return currentY + 2; // Small padding at bottom
  }

  // Helper function for signature section
  function addSignatureSection(startY: number) {
    const signatureY = startY;
    const boxWidth = (pageWidth - 3 * margin) / 2;
    const boxHeight = 35;
    
    // Inspector signature with colored background
    addColoredSection(margin, signatureY, boxWidth, boxHeight);
    
    // Inspector header
    pdf.setFillColor(52, 73, 124);
    pdf.rect(margin + 2, signatureY + 2, boxWidth - 4, 10, 'F');
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(255, 255, 255);
    addText('INSPECTOR SIGNATURE:', margin + 5, signatureY + 9);
    
    // Inspector details
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'normal');
    addText('Name:', margin + 5, signatureY + 20);
    addText(safeString(certificate.inspectorName), margin + 30, signatureY + 20);
    addText('Date:', margin + 5, signatureY + 27);
    addText(formatDate(certificate.inspectionDate), margin + 30, signatureY + 27);
    
    // Client signature with colored background
    const clientX = margin + boxWidth + 10;
    addColoredSection(clientX, signatureY, boxWidth, boxHeight);
    
    // Client header
    pdf.setFillColor(52, 73, 124);
    pdf.rect(clientX + 2, signatureY + 2, boxWidth - 4, 10, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(255, 255, 255);
    addText('CLIENT SIGNATURE:', clientX + 5, signatureY + 9);
    
    // Client details
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'normal');
    addText('Name:', clientX + 5, signatureY + 20);
    addText('Date:', clientX + 5, signatureY + 27);
  }

  return pdf.output('arraybuffer') as Uint8Array;
}

// Helper functions
function getCertificateTypeDisplayName(type: string): string {
  const typeMap: Record<string, string> = {
    BS5839_1: 'BS5839-1 FIRE DETECTION AND ALARM SYSTEM',
    'BS5839-1': 'BS5839-1 FIRE DETECTION AND ALARM SYSTEM',
    BS5839_6: 'BS5839-6 FIRE DETECTION AND ALARM SYSTEM',
    'BS5839-6': 'BS5839-6 FIRE DETECTION AND ALARM SYSTEM',
    BS5266: 'BS5266 EMERGENCY LIGHTING SYSTEM',
    FIRE_EXTINGUISHER: 'PORTABLE FIRE EXTINGUISHER INSPECTION',
    DRY_RISER: 'DRY RISER SYSTEM TESTING',
    EICR: 'ELECTRICAL INSTALLATION CONDITION REPORT',
  };
  
  return typeMap[type] || type.toUpperCase();
}

function getStandardsText(type: string): string {
  const standardsMap: Record<string, string> = {
    BS5839_1: 'In accordance with BS 5839-1: Fire detection and fire alarm systems for buildings - Part 1: Code of practice for design, installation, commissioning and maintenance of systems in non-domestic premises',
    'BS5839-1': 'In accordance with BS 5839-1: Fire detection and fire alarm systems for buildings - Part 1: Code of practice for design, installation, commissioning and maintenance of systems in non-domestic premises',
    BS5839_6: 'In accordance with BS 5839-6: Fire detection and fire alarm systems for buildings - Part 6: Code of practice for the design, installation, commissioning and maintenance of fire detection and fire alarm systems in domestic premises',
    'BS5839-6': 'In accordance with BS 5839-6: Fire detection and fire alarm systems for buildings - Part 6: Code of practice for the design, installation, commissioning and maintenance of fire detection and fire alarm systems in domestic premises',
    BS5266: 'In accordance with BS 5266: Emergency lighting - Part 1: Code of practice for the emergency lighting of premises',
    FIRE_EXTINGUISHER: 'In accordance with BS 5306-3: Fire extinguishing installations and equipment on premises - Code of practice for selection, installation and maintenance of portable fire extinguishers',
    DRY_RISER: 'In accordance with BS 9990: Code of practice for non-automatic fire fighting systems in buildings',
    EICR: 'Requirements For Electrical Installations - BS 7671 IET Wiring Regulations',
  };
  
  return standardsMap[type] || 'In accordance with relevant British Standards and fire safety regulations';
}

function getSystemDetails(certificate: CertificateData): string[][] {
  const formData = certificate.formData || {};
  const type = certificate.certificateType;
  
  if (type === 'BS5839-1' || type === 'BS5839_1') {
    return [
      ['System Type:', safeString(formData.systemType) || 'L2'],
      ['System Category:', safeString(formData.systemCategory) || 'P1'],
      ['Control Panel Make/Model:', safeString(formData.panelMake) + ' ' + safeString(formData.panelModel)],
      ['Number of Detection Zones:', safeString(formData.numberOfZones) || 'Not specified'],
      ['Number of Devices:', safeString(formData.numberOfDevices) || 'Not specified'],
      ['Building Floors Covered:', safeString(formData.floors) || 'Not specified'],
      ['Total Floor Area:', safeString(formData.totalFloorArea) || 'Not specified']
    ];
  } else if (type === 'BS5839-6' || type === 'BS5839_6') {
    return [
      ['System Grade:', safeString(formData.gradeOfSystem) || 'Grade D'],
      ['Property Type:', safeString(formData.propertyType) || 'Residential'],
      ['Number of Smoke Detectors:', safeString(formData.numberOfSmokeSensors) || '0'],
      ['Number of Heat Detectors:', safeString(formData.numberOfHeatSensors) || '0'],
      ['Number of CO Detectors:', safeString(formData.numberOfCOSensors) || '0'],
      ['Interconnection Method:', safeString(formData.interconnectionMethod) || 'Hard-wired'],
      ['Power Supply Type:', safeString(formData.powerSupply) || 'Mains with battery backup']
    ];
  } else if (type === 'BS5266') {
    return [
      ['System Type:', safeString(formData.systemType) || 'Non-maintained'],
      ['Number of Luminaires:', safeString(formData.numberOfLuminaires) || 'Not specified'],
      ['Emergency Duration:', safeString(formData.emergencyDuration) || '3 hours'],
      ['Test Duration:', safeString(formData.testDuration) || '1 hour'],
      ['Battery Type:', safeString(formData.batteryType) || 'NiCd'],
      ['Central Battery System:', safeString(formData.centralBatterySystem) || 'No'],
      ['Building Type:', safeString(formData.buildingType) || 'Commercial']
    ];
  } else if (type === 'FIRE_EXTINGUISHER') {
    return [
      ['Total Extinguishers:', safeString(formData.totalExtinguishers) || 'Not specified'],
      ['Water Extinguishers:', safeString(formData.waterExtinguishers) || '0'],
      ['Foam Extinguishers:', safeString(formData.foamExtinguishers) || '0'],
      ['CO2 Extinguishers:', safeString(formData.co2Extinguishers) || '0'],
      ['Dry Powder Extinguishers:', safeString(formData.dryPowderExtinguishers) || '0'],
      ['Wet Chemical Extinguishers:', safeString(formData.wetChemicalExtinguishers) || '0'],
      ['Building Use Classification:', safeString(formData.buildingUse) || 'Commercial']
    ];
  } else if (type === 'DRY_RISER') {
    return [
      ['Number of Outlets:', safeString(formData.numberOfOutlets) || 'Not specified'],
      ['System Type:', safeString(formData.systemType) || 'Dry Riser'],
      ['Pipe Size:', safeString(formData.pipeSize) || '100mm'],
      ['Floors Covered:', safeString(formData.floorsCovered) || 'Not specified'],
      ['Inlet Location:', safeString(formData.inletLocation) || 'Ground floor'],
      ['Outlet Type:', safeString(formData.outletType) || 'Landing valve'],
      ['Test Pressure Result:', safeString(formData.pressureTestResult) || 'Not specified']
    ];
  } else if (type === 'EICR') {
    return [
      ['Earthing Arrangement:', safeString(formData.earthingArrangements) || 'TN-C-S'],
      ['Nominal Voltage (U/Uo):', `${safeString(formData.nominalVoltageU) || '400'} V / ${safeString(formData.nominalVoltageUo) || '230'} V`],
      ['Nominal Frequency:', safeString(formData.nominalFrequency) || '50 Hz'],
      ['Prospective Fault Current:', safeString(formData.prospectiveFaultCurrent) || 'Not specified'],
      ['External Earth Fault Loop Impedance (Ze):', safeString(formData.externalEarthFaultLoopImpedance) || 'Not specified'],
      ['Supply Protective Device:', `${safeString(formData.supplyProtectiveDeviceType) || ''} ${safeString(formData.supplyProtectiveDeviceRating) || ''}A`.trim()],
      ['Means of Earthing:', safeString(formData.meansOfEarthing) || "Distributor's facility"],
      ['Maximum Demand:', safeString(formData.maximumDemand) || 'Not specified'],
    ];
  }
  
  return [['System Type:', 'Not specified']];
}

function getCertificationStatement(type: string): string {
  const statements: Record<string, string> = {
    BS5839_1: 'I certify that the fire detection and alarm system detailed above has been inspected and tested in accordance with BS 5839-1. The system is functioning correctly and complies with the relevant standards, subject to any defects or recommendations noted above.',
    'BS5839-1': 'I certify that the fire detection and alarm system detailed above has been inspected and tested in accordance with BS 5839-1. The system is functioning correctly and complies with the relevant standards, subject to any defects or recommendations noted above.',
    BS5839_6: 'I certify that the domestic fire detection and alarm system detailed above has been inspected and tested in accordance with BS 5839-6. The system is functioning correctly and complies with the relevant standards, subject to any defects or recommendations noted above.',
    'BS5839-6': 'I certify that the domestic fire detection and alarm system detailed above has been inspected and tested in accordance with BS 5839-6. The system is functioning correctly and complies with the relevant standards, subject to any defects or recommendations noted above.',
    BS5266: 'I certify that the emergency lighting system detailed above has been inspected and tested in accordance with BS 5266. The system is functioning correctly and provides adequate emergency illumination, subject to any defects or recommendations noted above.',
    FIRE_EXTINGUISHER: 'I certify that the portable fire extinguishers detailed above have been inspected and tested in accordance with BS 5306-3. All extinguishers are in serviceable condition and positioned correctly, subject to any defects or recommendations noted above.',
    DRY_RISER: 'I certify that the dry riser system detailed above has been tested in accordance with BS 9990. The system has been tested to the required pressure and is in serviceable condition, subject to any defects or recommendations noted above.',
    EICR: 'I/We, being the person(s) responsible for the inspection and testing of the electrical installation (as indicated by my/our signatures below), having exercised reasonable skill and care when carrying out the inspection and testing, hereby declare that the information in this report, including the observations and the attached schedules, provides an accurate assessment of the condition of the electrical installation taking into account the stated extent and limitations.',
  };
  
  return statements[type] || 'I certify that the equipment/system detailed above has been inspected in accordance with relevant standards and is in serviceable condition, subject to any defects or recommendations noted above.';
}

function getDefaultInspectionType(type: string): string {
  const types: Record<string, string> = {
    BS5839_1: 'Routine Service',
    'BS5839-1': 'Routine Service',
    BS5839_6: 'Annual Inspection',
    'BS5839-6': 'Annual Inspection',
    BS5266: 'Annual Service',
    FIRE_EXTINGUISHER: 'Annual Service',
    DRY_RISER: 'Six Monthly Test',
    EICR: 'Condition Report',
  };
  
  return types[type] || 'Inspection';
}

function formatDate(dateString: string | null): string {
  if (!dateString) return 'Not specified';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB');
  } catch {
    return dateString;
  }
}

function safeString(value: any): string {
  if (value === null || value === undefined) return '';
  return String(value);
}

// ─── EICR (BS 7671) dedicated PDF generator ─────────────────────────────────

function generateEICRPDF(certificate: CertificateData): Uint8Array {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  let y = margin;

  const fd = (certificate.formData || {}) as Record<string, any>;
  const ss = safeString;

  // ── Colour palette (matches the Cain Enabled EICR style) ──
  const navy  = [26,  58, 92]  as [number, number, number];
  const light = [235, 242, 250] as [number, number, number];
  const gold  = [255, 193, 7]  as [number, number, number];
  const green = [40,  167, 69] as [number, number, number];
  const red   = [220, 53,  69] as [number, number, number];

  // ── Helpers ──────────────────────────────────────────────
  const W = pageWidth - 2 * margin;

  const text = (t: string, x: number, yy: number, opts?: any) =>
    pdf.text(ss(t), x, yy, opts);

  const checkPage = (space: number) => {
    if (y + space > pageHeight - margin) {
      pdf.addPage();
      y = margin;
      addPageHeader();
    }
  };

  const filledRect = (x: number, yy: number, w: number, h: number, rgb: [number,number,number]) => {
    pdf.setFillColor(rgb[0], rgb[1], rgb[2]);
    pdf.rect(x, yy, w, h, 'F');
  };

  const borderedRect = (x: number, yy: number, w: number, h: number, rgb: [number,number,number]) => {
    pdf.setDrawColor(rgb[0], rgb[1], rgb[2]);
    pdf.setLineWidth(0.5);
    pdf.rect(x, yy, w, h);
    pdf.setDrawColor(0, 0, 0);
  };

  // Section header bar (navy with white text)
  const sectionHeader = (num: string, title: string) => {
    checkPage(12);
    filledRect(margin, y, W, 10, navy);
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    text(`${num}  ${title.toUpperCase()}`, margin + 3, y + 7);
    pdf.setTextColor(0, 0, 0);
    y += 10;
  };

  // Two-column label: value row
  const row = (label: string, value: string, labelW = 65) => {
    const valueW = W - labelW;
    const lines = pdf.splitTextToSize(ss(value), valueW - 4);
    const h = Math.max(7, lines.length * 4 + 3);
    checkPage(h);
    filledRect(margin, y, W, h, light);
    borderedRect(margin, y, W, h, [200, 210, 225]);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    text(label, margin + 2, y + 5);
    pdf.setFont('helvetica', 'normal');
    pdf.text(lines, margin + labelW, y + 5);
    y += h;
  };

  // Checkbox-style tick row
  const checkRow = (label: string, checked: boolean) => {
    checkPage(6);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    const mark = checked ? '☑' : '☐';
    text(`${mark}  ${label}`, margin + 3, y + 4);
    y += 6;
  };

  // Page header (every page)
  const addPageHeader = () => {
    filledRect(margin, y, W, 14, navy);
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    text(ss(fd.tradingTitle) || 'Cain Enabled Engineering Ltd', margin + 4, y + 9);
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    const contact = [ss(fd.companyTelephone) || '', ss(fd.companyEmail) || ''].filter(Boolean).join('  |  ');
    if (contact) text(contact, pageWidth - margin - 4, y + 9, { align: 'right' });
    pdf.setTextColor(0, 0, 0);
    y += 14;
  };

  // ── PAGE 1 ───────────────────────────────────────────────

  // Company header
  addPageHeader();
  y += 2;

  // Report title block (gold bar)
  filledRect(margin, y, W, 20, navy);
  filledRect(margin + 2, y + 2, W - 4, 16, gold);
  pdf.setFontSize(13);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  text('ELECTRICAL INSTALLATION CONDITION REPORT', pageWidth / 2, y + 10, { align: 'center' });
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'italic');
  text('Requirements For Electrical Installations - BS 7671 IET Wiring Regulations', pageWidth / 2, y + 16, { align: 'center' });
  y += 24;

  // Report reference box
  filledRect(margin, y, W, 9, navy);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  text(`Report Reference:  ${ss(certificate.certificateNumber)}`, margin + 4, y + 6.5);
  pdf.setTextColor(0, 0, 0);
  y += 11;

  // Section 1 – Client / Person ordering the report
  sectionHeader('1', 'Details of the Person Ordering the Report');
  row('Client:', ss(certificate.customer.name));
  row('Address:', ss(certificate.customer.address || fd.clientAddress));
  y += 2;

  // Section 2 – Reason for report
  sectionHeader('2', 'Reason for Producing This Report');
  row('Reason:', ss(fd.reasonForReport) || 'Safety assessment requested by client. To assess compliance with BS 7671.');
  row('Date(s) of Inspection:', formatDate(certificate.inspectionDate));
  y += 2;

  // Section 3 – Installation details
  sectionHeader('3', 'Details of the Installation');
  row('Installation Address:', ss(fd.installationAddress) || ss(certificate.siteAddress) || 'Same as Client Address');
  row('Description of Premises:', ss(fd.premisesType) || 'Commercial');
  row('Estimated Age of Wiring (years):', ss(fd.estimatedAgeOfWiring));
  row('Evidence of Additions/Alterations:', ss(fd.evidenceOfAdditions) || 'No');
  if (ss(fd.evidenceOfAdditions).toLowerCase() === 'yes') {
    row('Estimated Age of Additions (years):', ss(fd.estimatedAgeOfAdditions));
  }
  row('Installation Records Available? (Reg 651.1):', ss(fd.installationRecordsAvailable) || 'No');
  row('Date of Last Inspection:', formatDate(ss(fd.dateOfLastInspection) || null));
  y += 2;

  // Section 4 – Extent and limitations
  sectionHeader('4', 'Extent and Limitations of Inspection and Testing');
  row('Extent of Installation Covered:', ss(fd.extentOfInspection) || '100% of the installation.');
  row('Agreed Limitations:', ss(fd.agreedLimitations) || 'N/A');
  row('Agreed With:', ss(fd.agreedLimitationsWith));
  row('Operational Limitations:', ss(fd.operationalLimitations) || 'N/A');
  y += 2;

  // Section 5 – Overall assessment
  checkPage(22);
  sectionHeader('5', 'Summary of the Condition of the Installation');
  const isSatisfactory = (ss(fd.overallAssessment) || 'SATISFACTORY').toUpperCase() === 'SATISFACTORY';
  const assessColour = isSatisfactory ? green : red;
  filledRect(margin, y, W, 14, assessColour);
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  const assessLabel = isSatisfactory ? 'SATISFACTORY' : 'UNSATISFACTORY';
  text(`Overall Assessment:  ${assessLabel}`, pageWidth / 2, y + 10, { align: 'center' });
  pdf.setTextColor(0, 0, 0);
  y += 16;

  // Section 6 – Recommendations
  sectionHeader('6', 'Recommendations');
  row('Next Inspection Due In:', ss(fd.nextInspectionPeriod) || '3 Years');
  row('Next Inspection Date:', formatDate(certificate.nextInspectionDate));
  y += 4;

  // ── PAGE 2 – Observations ──────────────────────────────
  pdf.addPage();
  y = margin;
  addPageHeader();
  y += 2;

  // Section 7 – Observations
  sectionHeader('7', 'Observations and Recommendations for Actions to Be Taken');

  const observations = certificate.items?.filter(i => i.description) || [];

  if (observations.length === 0) {
    checkPage(10);
    filledRect(margin, y, W, 8, green);
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    text('There are no items adversely affecting electrical safety', margin + 4, y + 5.5);
    pdf.setTextColor(0, 0, 0);
    y += 10;
  } else {
    // Observation table header
    filledRect(margin, y, W, 8, navy);
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    text('Item No', margin + 2, y + 5.5);
    text('Observation', margin + 20, y + 5.5);
    text('Code', margin + W - 18, y + 5.5);
    pdf.setTextColor(0, 0, 0);
    y += 8;

    observations.forEach((obs, idx) => {
      const code = ss(obs.defects) || 'C3';
      const codeClr: Record<string, [number,number,number]> = {
        C1: red, C2: [255, 140, 0], C3: navy, FI: [100, 55, 155]
      };
      const clr = codeClr[code] || navy;
      const descLines = pdf.splitTextToSize(ss(obs.description), W - 40);
      const h = Math.max(8, descLines.length * 4 + 4);
      checkPage(h);

      if (idx % 2 === 1) filledRect(margin, y, W, h, [245, 248, 252]);
      borderedRect(margin, y, W, h, [200, 210, 225]);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      text(String(idx + 1), margin + 6, y + 5.5);
      pdf.setFont('helvetica', 'normal');
      pdf.text(descLines, margin + 20, y + 5.5);
      filledRect(margin + W - 18, y, 16, h, clr);
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      text(code, margin + W - 12, y + 5.5, { align: 'center' });
      pdf.setTextColor(0, 0, 0);
      y += h;
    });
  }

  y += 4;

  // Classification key
  checkPage(28);
  sectionHeader('', 'Classification of Observation Codes');
  const codes = [
    { code: 'C1', label: 'Danger Present', detail: 'Risk of injury. Immediate remedial action required', clr: red },
    { code: 'C2', label: 'Potentially Dangerous', detail: 'Urgent remedial action required', clr: [255, 140, 0] as [number,number,number] },
    { code: 'C3', label: 'Improvement Recommended', detail: 'Should be given due consideration', clr: navy },
    { code: 'FI', label: 'Further Investigation Required', detail: 'Without delay', clr: [100, 55, 155] as [number,number,number] },
  ];
  const cW = W / 4;
  codes.forEach((c, i) => {
    const x = margin + i * cW;
    filledRect(x, y, cW - 1, 8, c.clr);
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    text(c.code, x + cW / 2, y + 6, { align: 'center' });
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'bold');
    text(c.label, x + 2, y + 14);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    const dl = pdf.splitTextToSize(c.detail, cW - 4);
    pdf.text(dl, x + 2, y + 19);
  });
  y += 30;

  // ── PAGE 3 – Declaration & Supply ─────────────────────
  pdf.addPage();
  y = margin;
  addPageHeader();
  y += 2;

  // Section 8 – General condition
  sectionHeader('8', 'General Condition of the Installation');
  row('General Condition:', ss(fd.generalCondition) || 'Adequate as per BS 7671');
  y += 2;

  // Section 9 – Declaration
  sectionHeader('9', 'Declaration');
  const declarationText =
    'I/We, being the person(s) responsible for the inspection and testing of the electrical installation (as indicated by my/our signatures below), having exercised reasonable skill and care when carrying out the inspection and testing, hereby declare that the information in this report, including the observations and the attached schedules, provides an accurate assessment of the condition of the electrical installation taking into account the stated extent and limitations in section 4 of this report.';
  checkPage(16);
  filledRect(margin, y, W, 14, light);
  borderedRect(margin, y, W, 14, [200, 210, 225]);
  pdf.setFontSize(7.5);
  pdf.setFont('helvetica', 'italic');
  const declLines = pdf.splitTextToSize(declarationText, W - 4);
  pdf.text(declLines, margin + 2, y + 5);
  y += 16;

  row('Trading Title:', ss(fd.tradingTitle) || '');
  row('Address:', ss(fd.companyAddress) || '');
  row('Registration Number:', ss(fd.registrationNumber) || '');
  row('Telephone:', ss(fd.companyTelephone) || '');
  row('For Inspection, Testing and Assessment:', '');
  row('Name:', ss(certificate.inspectorName));
  row('Position:', ss(fd.inspectorPosition) || 'Qualified Supervisor');
  row('Signature:', '');
  row('Date:', formatDate(certificate.inspectionDate));
  y += 4;

  // Section 10 – Supply characteristics
  sectionHeader('10', 'Supply Characteristics and Earthing Arrangements');
  row('Earthing Arrangement:', ss(fd.earthingArrangements) || 'TN-C-S');
  row('Nature of Supply:', ss(fd.natureOfSupply) || '1-phase (2 wire) ac');
  row('Nominal Voltage U / Uo:', `${ss(fd.nominalVoltageU) || '400'} V / ${ss(fd.nominalVoltageUo) || '230'} V`);
  row('Nominal Frequency:', ss(fd.nominalFrequency) || '50 Hz');
  row('Prospective Fault Current (Ipf):', ss(fd.prospectiveFaultCurrent) || 'Not measured');
  row('External Earth Fault Loop Impedance (Ze):', ss(fd.externalEarthFaultLoopImpedance) || 'Not measured');
  row('Supply Protective Device (BS EN / Type / Rating):', `${ss(fd.supplyProtectiveDeviceStandard) || ''} ${ss(fd.supplyProtectiveDeviceType) || ''} ${ss(fd.supplyProtectiveDeviceRating) || ''}A`.trim());
  row('Short-Circuit Capacity:', ss(fd.shortCircuitCapacity) || '');
  row('Number of Supplies:', ss(fd.numberOfSupplies) || '1');
  row('Confirmation of Supply Polarity:', ss(fd.supplyPolarityConfirmed) || 'Yes');
  y += 2;

  // Section 11 – Means of earthing
  sectionHeader('11', 'Means of Earthing / Particulars of Installation');
  row('Means of Earthing:', ss(fd.meansOfEarthing) || "Distributor's facility");
  row('Maximum Demand (Load):', ss(fd.maximumDemand) || 'Not specified');
  row('Protective Measures Against Electric Shock:', ss(fd.protectiveMeasures) || 'ADS');
  y += 4;

  // Signature boxes
  checkPage(38);
  const boxW = (W - 6) / 2;
  const boxH = 32;

  // Inspector box
  filledRect(margin, y, boxW, boxH, light);
  borderedRect(margin, y, boxW, boxH, [200, 210, 225]);
  filledRect(margin + 1, y + 1, boxW - 2, 9, navy);
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  text('INSPECTOR SIGNATURE:', margin + 3, y + 7);
  pdf.setTextColor(0, 0, 0);
  pdf.setFont('helvetica', 'normal');
  text('Name:', margin + 3, y + 16);
  text(ss(certificate.inspectorName), margin + 25, y + 16);
  text('Date:', margin + 3, y + 23);
  text(formatDate(certificate.inspectionDate), margin + 25, y + 23);

  // Client box
  const cx = margin + boxW + 6;
  filledRect(cx, y, boxW, boxH, light);
  borderedRect(cx, y, boxW, boxH, [200, 210, 225]);
  filledRect(cx + 1, y + 1, boxW - 2, 9, navy);
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  text('CLIENT SIGNATURE:', cx + 3, y + 7);
  pdf.setTextColor(0, 0, 0);
  pdf.setFont('helvetica', 'normal');
  text('Name:', cx + 3, y + 16);
  text('Date:', cx + 3, y + 23);
  y += boxH + 4;

  // Footer
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'italic');
  pdf.setTextColor(120, 120, 120);
  text('This form is based on the model shown in Appendix 6 of BS 7671:2018.', pageWidth / 2, pageHeight - 8, { align: 'center' });
  pdf.setTextColor(0, 0, 0);

  return pdf.output('arraybuffer') as Uint8Array;
}
