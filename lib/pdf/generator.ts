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
    DRY_RISER: 'DRY RISER SYSTEM TESTING'
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
    DRY_RISER: 'In accordance with BS 9990: Code of practice for non-automatic fire fighting systems in buildings'
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
    DRY_RISER: 'I certify that the dry riser system detailed above has been tested in accordance with BS 9990. The system has been tested to the required pressure and is in serviceable condition, subject to any defects or recommendations noted above.'
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
    DRY_RISER: 'Six Monthly Test'
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
