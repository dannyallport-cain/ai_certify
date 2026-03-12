import { jsPDF } from 'jspdf';

export interface TemplateConfig {
  colors: {
    primary: string;   // hex e.g. '#1a3a5c'
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  fonts?: {
    heading: string;
    body: string;
    size: { small: number; medium: number; large: number };
  };
  layout?: {
    margins: { top: number; right: number; bottom: number; left: number };
    spacing: number;
  };
}

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
  templateConfig?: TemplateConfig;
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

/** Convert hex colour string to [r, g, b] tuple */
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace(/^#/, '');
  const num = parseInt(h, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

/** Lighten an RGB colour towards white by a given factor (0 = original, 1 = white) */
function lighten(rgb: [number, number, number], factor: number): [number, number, number] {
  return [
    Math.round(rgb[0] + (255 - rgb[0]) * factor),
    Math.round(rgb[1] + (255 - rgb[1]) * factor),
    Math.round(rgb[2] + (255 - rgb[2]) * factor),
  ];
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
// Generates a full 8-page report matching BS 7671:2018 Appendix 6 model form

function generateEICRPDF(certificate: CertificateData): Uint8Array {
  const totalPages = 8;
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 12;
  let y = margin;
  let currentPage = 1;

  const fd = (certificate.formData || {}) as Record<string, any>;
  const ss = safeString;

  // ── Colour palette (driven by template when available) ──
  const tc = certificate.templateConfig?.colors;
  const navy   = tc?.primary    ? hexToRgb(tc.primary)   : [26,  58, 92]  as [number, number, number];
  const light  = tc?.primary    ? lighten(hexToRgb(tc.primary), 0.88) : [235, 242, 250] as [number, number, number];
  const gold   = tc?.accent     ? hexToRgb(tc.accent)    : [255, 193, 7]  as [number, number, number];
  const green  = [40,  167, 69] as [number, number, number];  // outcome – always green
  const red    = [220, 53,  69] as [number, number, number];  // outcome – always red
  const orange = [255, 140, 0]  as [number, number, number];  // outcome – always orange
  const purple = [100, 55, 155] as [number, number, number];  // outcome – always purple
  const white  = tc?.background ? hexToRgb(tc.background) : [255, 255, 255] as [number, number, number];
  const borderGrey = tc?.secondary ? lighten(hexToRgb(tc.secondary), 0.45) : [180, 190, 200] as [number, number, number];
  const tableHeaderBg = tc?.secondary ? lighten(hexToRgb(tc.secondary), 0.75) : [230, 235, 240] as [number, number, number];

  const W = pageWidth - 2 * margin;
  const companyName = ss(fd.tradingTitle) || 'Cain Enabled Engineering Ltd';
  const companyEmail = ss(fd.companyEmail) || 'office@cain-enabled.co.uk';

  // ── Helpers ──────────────────────────────────────────────
  const text = (t: string, x: number, yy: number, opts?: any) =>
    pdf.text(ss(t), x, yy, opts);

  const filledRect = (x: number, yy: number, w: number, h: number, rgb: [number,number,number]) => {
    pdf.setFillColor(rgb[0], rgb[1], rgb[2]);
    pdf.rect(x, yy, w, h, 'F');
  };

  const borderedRect = (x: number, yy: number, w: number, h: number, rgb: [number,number,number] = borderGrey) => {
    pdf.setDrawColor(rgb[0], rgb[1], rgb[2]);
    pdf.setLineWidth(0.3);
    pdf.rect(x, yy, w, h);
    pdf.setDrawColor(0, 0, 0);
  };

  const hLine = (x: number, yy: number, w: number) => {
    pdf.setDrawColor(borderGrey[0], borderGrey[1], borderGrey[2]);
    pdf.setLineWidth(0.3);
    pdf.line(x, yy, x + w, yy);
    pdf.setDrawColor(0, 0, 0);
  };

  const vLine = (x: number, yy: number, h: number) => {
    pdf.setDrawColor(borderGrey[0], borderGrey[1], borderGrey[2]);
    pdf.setLineWidth(0.3);
    pdf.line(x, yy, x, yy + h);
    pdf.setDrawColor(0, 0, 0);
  };

  // Page footer with reference, page number, company info
  const addPageFooter = () => {
    const footerY = pageHeight - 10;
    pdf.setFontSize(6.5);
    pdf.setFont('helvetica', 'italic');
    pdf.setTextColor(100, 100, 100);
    text('This form is based on the model shown in Appendix 6 of BS 7671:2018.', margin, footerY);
    pdf.setFont('helvetica', 'normal');
    text(`Ref: ${ss(certificate.certificateNumber)}`, margin, footerY + 4);
    text(`Page: ${currentPage} of ${totalPages}`, pageWidth / 2, footerY + 4, { align: 'center' });
    // Company name & email aligned right in footer area
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(navy[0], navy[1], navy[2]);
    text(companyName, pageWidth - margin, footerY, { align: 'right' });
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(6);
    text(companyEmail, pageWidth - margin, footerY + 4, { align: 'right' });
    pdf.setTextColor(0, 0, 0);
  };

  const maxContentY = pageHeight - 16; // leave room for footer

  const checkPage = (space: number) => {
    if (y + space > maxContentY) {
      addPageFooter();
      pdf.addPage();
      currentPage++;
      y = margin;
    }
  };

  const newPage = () => {
    if (y > margin) {
      addPageFooter();
      pdf.addPage();
      currentPage++;
      y = margin;
    }
  };

  // Section header bar (navy with white text)
  const sectionHeader = (num: string, title: string) => {
    checkPage(9);
    filledRect(margin, y, W, 8, navy);
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    const label = num ? `${num}  ${title.toUpperCase()}` : title.toUpperCase();
    text(label, margin + 2, y + 5.5);
    pdf.setTextColor(0, 0, 0);
    y += 8;
  };

  // Section sub-header (lighter)
  const subHeader = (title: string) => {
    checkPage(7);
    filledRect(margin, y, W, 7, [200, 215, 230]);
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    text(title, margin + 2, y + 5);
    y += 7;
  };

  // Two-column label: value row
  const row = (label: string, value: string, labelW = 70, rowH?: number) => {
    const valueW = W - labelW;
    
    // Set font to measure text accurately
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    const valLines = pdf.splitTextToSize(ss(value), valueW - 4);
    
    pdf.setFont('helvetica', 'bold');
    const labLines = pdf.splitTextToSize(label, labelW - 4);
    
    const maxLines = Math.max(valLines.length, labLines.length);
    const h = rowH || Math.max(6, maxLines * 3.2 + 2.5);
    
    checkPage(h);
    borderedRect(margin, y, W, h);
    
    // label background
    filledRect(margin + 0.15, y + 0.15, labelW - 0.3, h - 0.3, light);
    
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'bold');
    const labY = y + h / 2 + 1.5 - (labLines.length > 1 ? (labLines.length - 1) * 1.6 : 0);
    pdf.text(labLines, margin + 2, labY);
    
    pdf.setFont('helvetica', 'normal');
    const valY = y + h / 2 + 1.5 - (valLines.length > 1 ? (valLines.length - 1) * 1.6 : 0);
    pdf.text(valLines, margin + labelW + 2, valY);
    
    y += h;
  };

  // Multi-line text block (for long paragraphs inside a bordered box)
  const textBlock = (content: string, fontSize = 6.5) => {
    pdf.setFontSize(fontSize);
    pdf.setFont('helvetica', 'normal');
    const lines = pdf.splitTextToSize(content, W - 6);
    const h = lines.length * (fontSize * 0.4) + 4;
    checkPage(h);
    filledRect(margin, y, W, h, light);
    borderedRect(margin, y, W, h);
    pdf.text(lines, margin + 3, y + 3);
    y += h;
  };

  // Italic text block (for explanatory notes)
  const italicNote = (content: string, fontSize = 6) => {
    pdf.setFontSize(fontSize);
    pdf.setFont('helvetica', 'italic');
    const lines = pdf.splitTextToSize(content, W - 6);
    const h = lines.length * (fontSize * 0.4) + 3;
    checkPage(h);
    pdf.setTextColor(60, 60, 60);
    pdf.text(lines, margin + 2, y + 2.5);
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'normal');
    y += h;
  };

  // ════════════════════════════════════════════════════════════
  // PAGE 1 – Cover page (sections 1-6)
  // ════════════════════════════════════════════════════════════

  // Report title block
  filledRect(margin, y, W, 16, navy);
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  text('DOMESTIC ELECTRICAL INSTALLATION', pageWidth / 2, y + 6, { align: 'center' });
  text('CONDITION REPORT', pageWidth / 2, y + 11, { align: 'center' });
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'italic');
  text('Requirements For Electrical Installations - BS 7671 IET Wiring Regulations', pageWidth / 2, y + 15, { align: 'center' });
  pdf.setTextColor(0, 0, 0);
  y += 18;

  // Report reference
  row('Report Reference:', ss(certificate.certificateNumber));
  y += 1;

  // Section 1 – Details of the Person Ordering the Report
  sectionHeader('1', 'Details of the Person Ordering the Report');
  row('Client:', ss(certificate.customer.name));
  row('Address:', ss(certificate.customer.address || fd.clientAddress));
  y += 1;

  // Section 2 – Reason for Producing This Report
  sectionHeader('2', 'Reason for Producing This Report');
  row('Reason for producing this report:', ss(fd.reasonForReport) || 'Landlords safety report.');
  row('Date(s) on which inspection and testing was carried out:', formatDate(certificate.inspectionDate));
  y += 1;

  // Section 3 – Details of the Installation
  sectionHeader('3', 'Details of the Installation Which Is the Subject of This Report');
  row('Installation Address:', ss(fd.installationAddress) || ss(certificate.siteAddress) || ss(certificate.customer.address));
  const wiringAge = ss(fd.estimatedAgeOfWiring);
  row('Estimated age of wiring system:', wiringAge ? `${wiringAge} years` : 'N/A');
  const hasAdditions = ss(fd.evidenceOfAdditions) || 'No';
  row('Evidence of additions/alterations:', hasAdditions);
  if (hasAdditions.toLowerCase() === 'yes') {
    row('If yes, estimated age:', `${ss(fd.estimatedAgeOfAdditions)} years`);
  } else {
    row('If yes, estimated age:', 'N/A');
  }
  row('Installation records available? (Regulation 651.1)', ss(fd.installationRecordsAvailable) || 'No');
  row('Date of last inspection:', formatDate(ss(fd.dateOfLastInspection) || null));
  y += 1;

  // Section 4 – Extent and Limitations
  sectionHeader('4', 'Extent and Limitations of Inspection and Testing');
  row('Extent of the electrical installation covered by this report:', ss(fd.extentOfInspection) || '100% of the installation.');
  row('Agreed limitations including the reasons (see Regulation 653.2):', ss(fd.agreedLimitations) || 'No Lifting of floor boards or inspection of loft space. Characteristics of primary supply overcurrent device. No testing of HVAC control cables. No testing of unverified circuits.');
  row('Agreed with:', ss(fd.agreedLimitationsWith) || 'Client');
  row('Operational limitations including the reasons:', ss(fd.operationalLimitations) || 'N/A');
  y += 1;

  // Explanatory paragraph about concealed cables
  italicNote('The inspection and testing detailed in this report and accompanying schedules have been carried out in accordance with BS 7671:2018 (IET Wiring Regulations) as amended to 2020. It should be noted that cables concealed within trunking and conduits, under floors, in roof spaces, and generally within the fabric of the building or underground, have not been inspected unless specifically agreed between the client and inspector prior to the inspection. An inspection should be made within an accessible roof space housing other electrical equipment.');
  y += 1;

  // Section 5 – Summary of the Condition
  sectionHeader('5', 'Summary of the Condition of the Installation');
  italicNote('See page 3 for a summary of the general condition of the installation in terms of electrical safety.');

  const isSatisfactory = (ss(fd.overallAssessment) || 'SATISFACTORY').toUpperCase() === 'SATISFACTORY';
  const assessLabel = isSatisfactory ? 'SATISFACTORY' : 'UNSATISFACTORY';
  const assessColour = isSatisfactory ? green : red;

  // Overall assessment row
  checkPage(10);
  borderedRect(margin, y, W, 9);
  filledRect(margin + 0.15, y + 0.15, W * 0.55, 8.7, light);
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  text('Overall assessment of the installation in terms of its suitability for continued use*:', margin + 2, y + 5.5);
  // Assessment result
  filledRect(margin + W * 0.55, y + 0.15, W * 0.45 - 0.15, 8.7, assessColour);
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(11);
  text(assessLabel, margin + W * 0.55 + (W * 0.45) / 2, y + 6.5, { align: 'center' });
  pdf.setTextColor(0, 0, 0);
  y += 9;

  italicNote('* An unsatisfactory assessment indicates that dangerous (Code C1) and/or potentially dangerous (Code C2) conditions have been identified.');
  y += 1;

  // Section 6 – Recommendations
  sectionHeader('6', 'Recommendations');
  italicNote("Where the overall assessment of the suitability of the installation for continued use on page 1 is stated as 'UNSATISFACTORY', I/We recommend that any observations classified as 'Code 1 - Danger Present' or 'Code 2 - Potentially dangerous' are acted upon as a matter of urgency. Investigation without delay is recommended for observations identified as 'FI - Further Investigation Required'. Observations classified as 'Code 3 - Improvement recommended' should be given due consideration.");

  row('Subject to the necessary remedial action being taken, I/we recommend that the installation is further inspected and tested by:', ss(fd.nextInspectionPeriod) || '5 Years or change of tenant/owner', 100);
  y += 1;
  italicNote('Note: The proposed date for the next inspection should take into consideration the frequency and quality of maintenance that the installation can reasonably be expected to receive during its intended life. The period should be agreed between relevant parties.');

  // Page 1 footer
  // ════════════════════════════════════════════════════════════
  // PAGE 2 – Observations (section 7)
  // ════════════════════════════════════════════════════════════
  newPage();

  sectionHeader('7', 'Observations and Recommendations for Actions to Be Taken');

  // Introductory text
  italicNote("Referring to the attached schedules of inspection and test results, and subject to the limitations specified on page 1 of this report under 'Extent of the Installation and Limitations of Inspection and Testing':");
  y += 1;

  const observations = certificate.items?.filter(i => i.description) || [];

  if (observations.length === 0) {
    checkPage(8);
    filledRect(margin, y, W, 7, green);
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    text('There are no items adversely affecting electrical safety', margin + 3, y + 5);
    pdf.setTextColor(0, 0, 0);
    y += 9;
  } else {
    // Observation table header
    const obsColWidths = { num: 18, desc: W - 36, code: 18 };
    checkPage(7);
    filledRect(margin, y, W, 7, tableHeaderBg);
    borderedRect(margin, y, W, 7);
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'bold');
    text('Item No', margin + 2, y + 5);
    text('Observations', margin + obsColWidths.num + 2, y + 5);
    text('Classification\nCode', margin + W - obsColWidths.code + 1, y + 3);
    pdf.setTextColor(0, 0, 0);
    y += 7;

    observations.forEach((obs, idx) => {
      const code = ss(obs.defects) || 'C3';
      const codeClr: Record<string, [number,number,number]> = {
        C1: red, C2: orange, C3: navy, FI: purple
      };
      const clr = codeClr[code] || navy;
      const descLines = pdf.splitTextToSize(ss(obs.description), obsColWidths.desc - 4);
      const h = Math.max(7, descLines.length * 3.2 + 3);
      checkPage(h);

      if (idx % 2 === 1) filledRect(margin, y, W, h, [245, 248, 252]);
      borderedRect(margin, y, W, h);
      vLine(margin + obsColWidths.num, y, h);
      vLine(margin + W - obsColWidths.code, y, h);
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'bold');
      text(String(idx + 1), margin + obsColWidths.num / 2, y + h / 2 + 1.5, { align: 'center' });
      pdf.setFont('helvetica', 'normal');
      pdf.text(descLines, margin + obsColWidths.num + 2, y + 4);
      // Code badge
      filledRect(margin + W - obsColWidths.code + 0.15, y + 0.15, obsColWidths.code - 0.3, h - 0.3, clr);
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      text(code, margin + W - obsColWidths.code / 2, y + h / 2 + 1.5, { align: 'center' });
      pdf.setTextColor(0, 0, 0);
      y += h;
    });
  }

  y += 2;
  italicNote('or');
  italicNote('The following observations and recommendations are made');
  y += 1;

  // Classification key
  italicNote('One of the following codes, as appropriate, has been allocated to each of the observations made above to indicate to the person(s) responsible for the installation the degree of urgency for remedial action.');
  y += 1;

  checkPage(22);
  const cW = W / 4;
  const codeItems = [
    { code: 'C1', label: 'Danger Present', detail: 'Risk of injury. Immediate\nremedial action required', clr: red },
    { code: 'C2', label: 'Potentially dangerous', detail: 'Urgent remedial action\nrequired', clr: orange },
    { code: 'C3', label: 'Improvement\nrecommended', detail: '', clr: navy },
    { code: 'FI', label: '', detail: 'Further investigation\nrequired without delay', clr: purple },
  ];
  const codeBoxY = y;
  codeItems.forEach((c, i) => {
    const x = margin + i * cW;
    filledRect(x, codeBoxY, cW - 1, 7, c.clr);
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    text(c.code, x + (cW - 1) / 2, codeBoxY + 5, { align: 'center' });
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(6.5);
    pdf.setFont('helvetica', 'bold');
    if (c.label) pdf.text(pdf.splitTextToSize(c.label, cW - 4), x + 2, codeBoxY + 12);
    pdf.setFont('helvetica', 'normal');
    if (c.detail) pdf.text(pdf.splitTextToSize(c.detail, cW - 4), x + 2, codeBoxY + (c.label ? 18 : 12));
  });
  y = codeBoxY + 26;

  // Summary remedial actions
  const c1Items = observations.filter(o => ss(o.defects) === 'C1').map((_, i) => String(i + 1)).join(', ') || 'N/A';
  const c2Items = observations.filter(o => ss(o.defects) === 'C2').map((_, i) => String(i + 1)).join(', ') || 'N/A';
  const c3Items = observations.filter(o => ss(o.defects) === 'C3').map((_, i) => String(i + 1)).join(', ') || 'N/A';
  const fiItems = observations.filter(o => ss(o.defects) === 'FI').map((_, i) => String(i + 1)).join(', ') || 'N/A';

  row('Immediate remedial action required for items:', c1Items);
  row('Urgent remedial action required for items:', c2Items);
  row('Improvement recommended for items:', c3Items);
  row('Further investigation required for items:', fiItems);

  // Page 2 footer
  // ════════════════════════════════════════════════════════════
  // PAGE 3 – General condition, Declaration, Test Instruments, Supply (sections 8-12)
  // ════════════════════════════════════════════════════════════
  newPage();

  // Section 8 – General condition
  sectionHeader('8', 'General Condition of the Installation');
  row('General condition of the installation (in terms of electrical safety):', ss(fd.generalCondition) || 'Adequate.');
  y += 1;

  // Section 9 – Declaration
  sectionHeader('9', 'Declaration');
  const declarationText =
    'I/We, being the person(s) responsible for the inspection and testing of the electrical installation (as indicated by my/our signatures below), particulars of which are described above, having exercised reasonable skill and care when carrying out the inspection and testing, hereby declare that the information in this report, including the observations and the attached schedules, provides an accurate assessment of the condition of the electrical installation taking into account the stated extent and limitations in section 4 of this report.';
  textBlock(declarationText);
  y += 1;

  row('Trading Title:', ss(fd.tradingTitle) || companyName);
  row('Address:', ss(fd.companyAddress) || '');
  row('Registration Number (if applicable):', ss(fd.registrationNumber) || '');
  row('Telephone Number:', ss(fd.companyTelephone) || '');
  y += 1;
  subHeader('For the INSPECTION, TESTING AND ASSESSMENT of the report:');
  row('Name:', ss(certificate.inspectorName));
  row('Position:', ss(fd.inspectorPosition) || 'Qualified Supervisor');
  row('Signature:', '');
  row('Date:', formatDate(certificate.inspectionDate));
  y += 1;

  // Test Instruments (Section 10)
  sectionHeader('10', 'Test Instruments');
  italicNote('Details of Test Instruments used (state serial and/or asset numbers):');
  {
    // Two-column instrument grid matching the original report layout
    const halfW = W / 2;
    const labelW = 42;
    const valW = halfW - labelW;
    const rh = 6;

    const instrumentPairs = [
      [{ lbl: 'Multi-functional:', val: ss(fd.instrumentMultiFunction) || ss(fd.multiFunction) || '' }, { lbl: 'Earth electrode resistance:', val: ss(fd.instrumentEarthElectrode) || 'N/A' }],
      [{ lbl: 'Insulation resistance:', val: ss(fd.instrumentInsulationResistance) || 'N/A' }, { lbl: 'Earth fault loop impedance:', val: ss(fd.instrumentEarthLoop) || 'N/A' }],
      [{ lbl: 'Continuity:', val: ss(fd.instrumentContinuity) || 'N/A' }, { lbl: 'RCD:', val: ss(fd.instrumentRCD) || 'N/A' }],
    ];

    instrumentPairs.forEach((pair) => {
      checkPage(rh);
      pair.forEach((cell, ci) => {
        const x0 = margin + ci * halfW;
        borderedRect(x0, y, halfW, rh);
        filledRect(x0 + 0.15, y + 0.15, labelW - 0.3, rh - 0.3, light);
        pdf.setFontSize(6.5);
        pdf.setFont('helvetica', 'bold');
        text(cell.lbl, x0 + 2, y + rh / 2 + 1.5);
        pdf.setFont('helvetica', 'normal');
        text(cell.val, x0 + labelW + 2, y + rh / 2 + 1.5);
      });
      y += rh;
    });
  }
  y += 1;

  // Section 11 – Supply Characteristics and Earthing Arrangements
  sectionHeader('11', 'Supply Characteristics and Earthing Arrangements');

  // ── Three-panel side-by-side layout matching original report ──
  {
    const panelH = 55; // total height of the 3-panel block
    checkPage(panelH);

    const col1W = W * 0.34; // Earthing arrangements + Live conductors
    const col2W = W * 0.33; // Nature of Supply Parameters
    const col3W = W * 0.33; // Supply Protective Device
    const col1x = margin;
    const col2x = margin + col1W;
    const col3x = margin + col1W + col2W;
    const panelY = y;

    // Draw outer borders for the three panels
    borderedRect(col1x, panelY, col1W, panelH);
    borderedRect(col2x, panelY, col2W, panelH);
    borderedRect(col3x, panelY, col3W, panelH);

    // ── PANEL 1: Earthing Arrangements + Live Conductors ──
    filledRect(col1x + 0.15, panelY + 0.15, col1W - 0.3, 5.7, light);
    pdf.setFontSize(6);
    pdf.setFont('helvetica', 'bold');
    text('Earthing Arrangements', col1x + 2, panelY + 4);
    hLine(col1x, panelY + 6, col1W);

    const earthing = ss(fd.earthingArrangements) || 'TN-C-S';
    const earthTypes = ['TN-S', 'TN-C-S', 'TT'];
    let ey = panelY + 8;
    pdf.setFontSize(5.5);
    pdf.setFont('helvetica', 'normal');
    earthTypes.forEach((et) => {
      const checked = earthing.toUpperCase().replace(/-/g, '').includes(et.replace(/-/g, '').toUpperCase()) || earthing === et;
      text(checked ? '[X]' : '[  ]', col1x + 4, ey + 2.5);
      text(et, col1x + 12, ey + 2.5);
      ey += 4;
    });
    text('Other:', col1x + 4, ey + 2.5);
    text(earthTypes.some(et => earthing.includes(et)) ? '' : earthing, col1x + 16, ey + 2.5);
    ey += 5;

    hLine(col1x, ey, col1W);
    ey += 1;
    filledRect(col1x + 0.15, ey, col1W - 0.3, 5, light);
    pdf.setFont('helvetica', 'bold');
    text('Number and Type of Live Conductors', col1x + 2, ey + 3.5);
    ey += 6;

    const supply = ss(fd.natureOfSupply) || '1-phase (2 wire)';
    const supplyOpts = ['1-phase (2 wire)', '3-phase (3 wire)', '1-phase (3 wire)', '3-phase (4 wire)'];
    pdf.setFont('helvetica', 'normal');
    supplyOpts.forEach((st) => {
      const checked = supply.includes(st);
      text(checked ? '[X]' : '[  ]', col1x + 4, ey + 2.5);
      text(st + ':', col1x + 12, ey + 2.5);
      ey += 4;
    });

    // Confirmation of supply polarity at bottom of panel 1
    hLine(col1x, panelY + panelH - 6, col1W);
    pdf.setFontSize(5.5);
    pdf.setFont('helvetica', 'bold');
    text('Confirmation of supply polarity:', col1x + 2, panelY + panelH - 2);
    pdf.setFont('helvetica', 'normal');
    text(ss(fd.supplyPolarityConfirmed) || 'Yes', col1x + col1W - 15, panelY + panelH - 2);

    // ── PANEL 2: Nature of Supply Parameters ──
    filledRect(col2x + 0.15, panelY + 0.15, col2W - 0.3, 5.7, light);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(6);
    text('Nature of Supply Parameters', col2x + 2, panelY + 4);
    hLine(col2x, panelY + 6, col2W);

    const supplyParams = [
      { lbl: 'Nominal voltage(s): U:', val: `${ss(fd.nominalVoltageU) || '240'} V` },
      { lbl: 'Nominal voltage(s): Uo:', val: `${ss(fd.nominalVoltageUo) || '230'} V` },
      { lbl: 'Nominal frequency, f:', val: `${ss(fd.nominalFrequency) || '50'} Hz` },
      { lbl: 'Prospective fault current, Ipf:', val: ss(fd.prospectiveFaultCurrent) ? `${ss(fd.prospectiveFaultCurrent)} kA` : 'N/A' },
      { lbl: 'External earth fault loop impedance, Ze:', val: ss(fd.externalEarthFaultLoopImpedance) ? `${ss(fd.externalEarthFaultLoopImpedance)} \u03A9` : 'N/A' },
    ];

    let py = panelY + 8;
    pdf.setFontSize(5.5);
    supplyParams.forEach((sp) => {
      const lblW = col2W * 0.64;
      hLine(col2x, py + 4.5, col2W);
      pdf.setFont('helvetica', 'bold');
      text(sp.lbl, col2x + 2, py + 3.5);
      pdf.setFont('helvetica', 'normal');
      text(sp.val, col2x + lblW + 2, py + 3.5);
      py += 5;
    });

    // ── PANEL 3: Supply Protective Device ──
    filledRect(col3x + 0.15, panelY + 0.15, col3W - 0.3, 5.7, light);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(6);
    text('Supply Protective Device', col3x + 2, panelY + 4);
    hLine(col3x, panelY + 6, col3W);

    const deviceParams = [
      { lbl: 'BS(EN):', val: ss(fd.supplyProtectiveDeviceStandard) || '1361 Fuse HBC' },
      { lbl: 'Type:', val: ss(fd.supplyProtectiveDeviceType) || '' },
      { lbl: 'Rated current:', val: ss(fd.supplyProtectiveDeviceRating) ? `${ss(fd.supplyProtectiveDeviceRating)} A` : '' },
      { lbl: 'Short-circuit capacity:', val: ss(fd.shortCircuitCapacity) ? `${ss(fd.shortCircuitCapacity)} kA` : '' },
    ];

    let dy = panelY + 8;
    pdf.setFontSize(5.5);
    deviceParams.forEach((dp) => {
      const lblW = col3W * 0.5;
      hLine(col3x, dy + 4.5, col3W);
      pdf.setFont('helvetica', 'bold');
      text(dp.lbl, col3x + 2, dy + 3.5);
      pdf.setFont('helvetica', 'normal');
      text(dp.val, col3x + lblW + 2, dy + 3.5);
      dy += 5;
    });

    y = panelY + panelH + 1;
  }

  // ════════════════════════════════════════════════════════════
  // PAGE 3 continued / PAGE 4 start – Particulars of Installation (section 12)
  // then Inspection Schedule
  // ════════════════════════════════════════════════════════════
  newPage();

  // Section 12 – Particulars of Installation Referred to in the Report
  sectionHeader('12', 'Particulars of Installation Referred to in the Report');

  // ── Row 1: Means of Earthing (full width) + electrode details ──
  {
    const meansDistributor = (ss(fd.meansOfEarthing) || '').toLowerCase().includes('distributor');
    const meansElectrode = (ss(fd.meansOfEarthing) || '').toLowerCase().includes('electrode');
    checkPage(8);
    borderedRect(margin, y, W, 7);
    filledRect(margin + 0.15, y + 0.15, W * 0.25, 6.7, light);
    pdf.setFontSize(6);
    pdf.setFont('helvetica', 'bold');
    text('Means of Earthing', margin + 2, y + 4.5);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(5.5);
    text(meansDistributor ? '[X]' : '[  ]', margin + W * 0.26, y + 4.5);
    text("Distributor's facility", margin + W * 0.30, y + 4.5);
    text(meansElectrode ? '[X]' : '[  ]', margin + W * 0.55, y + 4.5);
    text('Installation earth electrode', margin + W * 0.59, y + 4.5);
    y += 7;
  }

  // ── Row 2: Two-panel — Earth Electrode Details | Maximum Demand / Protective Measures ──
  {
    const halfW = W / 2;
    const panelH = 22;
    checkPage(panelH);
    const py = y;

    // Left panel: Earth Electrode Details
    borderedRect(margin, py, halfW, panelH);
    filledRect(margin + 0.15, py + 0.15, halfW - 0.3, 5.7, light);
    pdf.setFontSize(5.5);
    pdf.setFont('helvetica', 'bold');
    text('Details of Earth Electrode (where applicable)', margin + 2, py + 4);
    hLine(margin, py + 6, halfW);

    const electrodeRows = [
      { lbl: 'Type:', val: ss(fd.earthElectrodeType) || 'N/A' },
      { lbl: 'Resistance to Earth:', val: ss(fd.earthElectrodeResistance) ? `${ss(fd.earthElectrodeResistance)} \u03A9` : 'N/A' },
      { lbl: 'Location:', val: ss(fd.earthElectrodeLocation) || 'N/A' },
    ];
    let ey = py + 7;
    electrodeRows.forEach((r) => {
      pdf.setFont('helvetica', 'bold');
      text(r.lbl, margin + 2, ey + 3);
      pdf.setFont('helvetica', 'normal');
      text(r.val, margin + halfW * 0.45, ey + 3);
      hLine(margin, ey + 4.5, halfW);
      ey += 5;
    });

    // Right panel: Max Demand + Protective Measures
    const rx = margin + halfW;
    borderedRect(rx, py, halfW, panelH);
    filledRect(rx + 0.15, py + 0.15, halfW - 0.3, 5.7, light);
    pdf.setFont('helvetica', 'bold');
    text('Demand & Protective Measures', rx + 2, py + 4);
    hLine(rx, py + 6, halfW);

    const demandRows = [
      { lbl: 'Maximum Demand (Load):', val: ss(fd.maximumDemand) || '100 Amps' },
      { lbl: 'Protective measure(s):', val: ss(fd.protectiveMeasures) || 'ADS' },
      { lbl: 'Method of measurement:', val: ss(fd.earthElectrodeMeasurementMethod) || 'N/A' },
    ];
    let dy = py + 7;
    demandRows.forEach((r) => {
      pdf.setFont('helvetica', 'bold');
      text(r.lbl, rx + 2, dy + 3);
      pdf.setFont('helvetica', 'normal');
      text(r.val, rx + halfW * 0.55, dy + 3);
      hLine(rx, dy + 4.5, halfW);
      dy += 5;
    });

    y = py + panelH + 1;
  }

  // ── Row 3: Two-panel — Main Switch Details | RCD / Supply Conductors ──
  {
    const halfW = W / 2;
    const panelH = 40;
    checkPage(panelH);
    const py = y;

    // Left panel: Main Switch
    borderedRect(margin, py, halfW, panelH);
    filledRect(margin + 0.15, py + 0.15, halfW - 0.3, 5.7, light);
    pdf.setFontSize(5.5);
    pdf.setFont('helvetica', 'bold');
    text('Main Switch / Switch-Fuse / Circuit-Breaker / RCD', margin + 2, py + 4);
    hLine(margin, py + 6, halfW);

    const switchRows = [
      { lbl: 'Type BS(EN):', val: ss(fd.mainSwitchType) || ss(fd.mainSwitchBSEN) || '60947-3 Isolator' },
      { lbl: 'Number of poles:', val: ss(fd.mainSwitchPoles) || '2' },
      { lbl: 'Current rating:', val: ss(fd.mainSwitchCurrentRating) ? `${ss(fd.mainSwitchCurrentRating)} A` : '100 A' },
      { lbl: 'Fuse/device rating:', val: ss(fd.mainSwitchFuseRating) ? `${ss(fd.mainSwitchFuseRating)} A` : '100 A' },
      { lbl: 'Voltage rating:', val: ss(fd.mainSwitchVoltageRating) ? `${ss(fd.mainSwitchVoltageRating)} V` : '240 V' },
      { lbl: 'Supply conductors:', val: ss(fd.supplyConductorMaterial) || 'Copper' },
      { lbl: 'Supply conductors csa:', val: ss(fd.supplyConductorCSA) ? `${ss(fd.supplyConductorCSA)} mm\u00B2` : '25 mm\u00B2' },
    ];
    let sy = py + 7;
    switchRows.forEach((r) => {
      pdf.setFont('helvetica', 'bold');
      text(r.lbl, margin + 2, sy + 3);
      pdf.setFont('helvetica', 'normal');
      text(r.val, margin + halfW * 0.45, sy + 3);
      hLine(margin, sy + 4.5, halfW);
      sy += 4.5;
    });

    // Right panel: RCD details + If RCD main switch
    const rx = margin + halfW;
    borderedRect(rx, py, halfW, panelH);
    filledRect(rx + 0.15, py + 0.15, halfW - 0.3, 5.7, light);
    pdf.setFont('helvetica', 'bold');
    text('If RCD Main Switch', rx + 2, py + 4);
    hLine(rx, py + 6, halfW);

    const rcdRows = [
      { lbl: 'Rated residual current (I\u0394n):', val: ss(fd.rcdRatedResidualCurrent) ? `${ss(fd.rcdRatedResidualCurrent)} mA` : 'N/A' },
      { lbl: 'Rated time delay:', val: ss(fd.rcdRatedTimeDelay) ? `${ss(fd.rcdRatedTimeDelay)} ms` : 'N/A' },
      { lbl: 'Measured operating time:', val: ss(fd.rcdMeasuredTime) ? `${ss(fd.rcdMeasuredTime)} ms` : 'N/A' },
    ];
    let ry = py + 7;
    rcdRows.forEach((r) => {
      pdf.setFont('helvetica', 'bold');
      text(r.lbl, rx + 2, ry + 3);
      pdf.setFont('helvetica', 'normal');
      text(r.val, rx + halfW * 0.6, ry + 3);
      hLine(rx, ry + 4.5, halfW);
      ry += 5;
    });

    // Sub-panel: Earthing conductor
    ry += 1;
    hLine(rx, ry, halfW);
    filledRect(rx + 0.15, ry + 0.15, halfW - 0.3, 5, light);
    pdf.setFont('helvetica', 'bold');
    text('Earthing Conductor', rx + 2, ry + 3.5);
    ry += 5.5;

    const ecRows = [
      { lbl: 'Material:', val: ss(fd.earthingConductorMaterial) || 'Copper' },
      { lbl: 'CSA:', val: ss(fd.earthingConductorCSA) ? `${ss(fd.earthingConductorCSA)} mm\u00B2` : '16 mm\u00B2' },
      { lbl: 'Verified:', val: ss(fd.earthingConductorVerified) || 'Yes' },
    ];
    ecRows.forEach((r) => {
      pdf.setFont('helvetica', 'bold');
      text(r.lbl, rx + 2, ry + 3);
      pdf.setFont('helvetica', 'normal');
      text(r.val, rx + halfW * 0.35, ry + 3);
      hLine(rx, ry + 4.5, halfW);
      ry += 4.5;
    });

    y = py + panelH + 1;
  }

  // ── Row 4: Two-panel — Main Bonding Conductor | Bonding of Extraneous Parts ──
  {
    const halfW = W / 2;
    const panelH = 30;
    checkPage(panelH);
    const py = y;

    // Left panel: Main Bonding Conductor
    borderedRect(margin, py, halfW, panelH);
    filledRect(margin + 0.15, py + 0.15, halfW - 0.3, 5.7, light);
    pdf.setFontSize(5.5);
    pdf.setFont('helvetica', 'bold');
    text('Main Protective Bonding Conductor', margin + 2, py + 4);
    hLine(margin, py + 6, halfW);

    const bondRows = [
      { lbl: 'Material:', val: ss(fd.mainBondingMaterial) || 'Copper' },
      { lbl: 'CSA:', val: ss(fd.mainBondingCSA) ? `${ss(fd.mainBondingCSA)} mm\u00B2` : '10 mm\u00B2' },
      { lbl: 'Verified:', val: ss(fd.mainBondingVerified) || 'Yes' },
    ];
    let by = py + 7;
    bondRows.forEach((r) => {
      pdf.setFont('helvetica', 'bold');
      text(r.lbl, margin + 2, by + 3);
      pdf.setFont('helvetica', 'normal');
      text(r.val, margin + halfW * 0.35, by + 3);
      hLine(margin, by + 4.5, halfW);
      by += 5;
    });

    // Right panel: Bonding of extraneous-conductive parts
    const rx = margin + halfW;
    borderedRect(rx, py, halfW, panelH);
    filledRect(rx + 0.15, py + 0.15, halfW - 0.3, 5.7, light);
    pdf.setFont('helvetica', 'bold');
    text('Bonding of Extraneous-Conductive Parts', rx + 2, py + 4);
    hLine(rx, py + 6, halfW);

    const bondParts = [
      { lbl: 'Water installation pipes:', val: ss(fd.bondingWater) || 'Yes' },
      { lbl: 'Gas installation pipes:', val: ss(fd.bondingGas) || 'Yes' },
      { lbl: 'Oil installation pipes:', val: ss(fd.bondingOil) || 'N/A' },
      { lbl: 'Lightning protection:', val: ss(fd.bondingLightning) || 'N/A' },
      { lbl: 'Structural steel:', val: ss(fd.bondingSteel) || 'N/A' },
    ];
    let bpy = py + 7;
    bondParts.forEach((r) => {
      pdf.setFont('helvetica', 'bold');
      text(r.lbl, rx + 2, bpy + 3);
      pdf.setFont('helvetica', 'normal');
      text(r.val, rx + halfW * 0.55, bpy + 3);
      hLine(rx, bpy + 4.5, halfW);
      bpy += 4.5;
    });

    y = py + panelH + 1;
  }

  addPageFooter();

  // ════════════════════════════════════════════════════════════
  // PAGES 5-7 – Inspection Schedule (section 13-15)
  // ════════════════════════════════════════════════════════════

  const inspectionSchedule: Array<{
    section: string;
    title: string;
    items: Array<{ ref: string; desc: string; comment?: string; outcome?: string }>;
  }> = [
    {
      section: '1.0',
      title: 'EXTERNAL CONDITION OF INTAKE EQUIPMENT (VISUAL INSPECTION ONLY)',
      items: [
        { ref: '1.1', desc: 'Service cable' },
        { ref: '1.2', desc: 'Service head' },
        { ref: '1.3', desc: 'Earthing arrangement' },
        { ref: '1.4', desc: 'Meter tails' },
        { ref: '1.5', desc: 'Metering equipment' },
        { ref: '1.6', desc: 'Isolator (where present)' },
      ],
    },
    {
      section: '2.0',
      title: 'PRESENCE OF ADEQUATE ARRANGEMENTS FOR OTHER SOURCES SUCH AS MICROGENERATORS (551.6; 551.7)',
      items: [],
    },
    {
      section: '3.0',
      title: 'EARTHING / BONDING ARRANGEMENTS (411.3; Chap 54)',
      items: [
        { ref: '3.1', desc: 'Presence and condition of distributor\'s earthing arrangement (542.1.2.1; 542.1.2.2)' },
        { ref: '3.2', desc: 'Presence and condition of earth electrode connection where applicable (542.1.2.3)' },
        { ref: '3.3', desc: 'Provision of earthing/bonding labels at all appropriate locations (514.13.1)' },
        { ref: '3.4', desc: 'Confirmation of earthing conductor size (542.3; 543.1.1)' },
        { ref: '3.5', desc: 'Accessibility and condition of earthing conductor at MET (543.3.2)' },
        { ref: '3.6', desc: 'Confirmation of main protective bonding conductor sizes (544.1)' },
        { ref: '3.7', desc: 'Condition and accessibility of main protective bonding conductor connections (543.3.2; 544.1.2)' },
        { ref: '3.8', desc: 'Accessibility and condition of other protective bonding connections (543.3.1; 543.3.2)' },
      ],
    },
    {
      section: '4.0',
      title: 'CONSUMER UNIT(S) / DISTRIBUTION BOARD(S)',
      items: [
        { ref: '4.1', desc: 'Adequacy of working space/accessibility to consumer unit/distribution board (132.12; 513.1)' },
        { ref: '4.2', desc: 'Security of fixing (134.1.1)' },
        { ref: '4.3', desc: 'Condition of enclosure(s) in terms of IP rating etc (416.2)' },
        { ref: '4.4', desc: 'Condition of enclosure(s) in terms of fire rating etc (421.1.201; 526.5)' },
        { ref: '4.5', desc: 'Enclosure not damaged/deteriorated so as to impair safety (651.2)' },
        { ref: '4.6', desc: 'Presence of main linked switch (as required by 462.1.201)' },
        { ref: '4.7', desc: 'Operation of main switch (functional check) (643.10)' },
        { ref: '4.8', desc: 'Manual operation of circuit-breakers and RCDs to prove disconnection (643.10)' },
        { ref: '4.9', desc: 'Correct identification of circuit details and protective devices (514.8.1; 514.9.1)' },
        { ref: '4.10', desc: 'Presence of RCD six-monthly test notice at or near consumer unit/distribution board (514.12.2)' },
        { ref: '4.11', desc: 'Presence of non-standard (mixed) cable colour warning notice at or near consumer unit/distribution board (514.14)' },
        { ref: '4.12', desc: 'Presence of alternative supply warning notice at or near consumer unit/distribution board (514.15)' },
        { ref: '4.13', desc: 'Presence of other required labelling (please specify) (Section 514)' },
        { ref: '4.14', desc: 'Compatibility of protective devices, bases and other components; correct type and rating (No signs of unacceptable thermal damage, arcing or overheating) (411.3.2; 411.4; 411.5; 411.6; Sections 432, 433)' },
        { ref: '4.15', desc: 'Single-pole switching or protective devices in line conductor only (132.14.1; 530.3.3)' },
        { ref: '4.16', desc: 'Protection against mechanical damage where cables enter consumer unit/distribution board (132.14.1; 522.8.1; 522.8.5; 522.8.11)' },
        { ref: '4.17', desc: 'Protection against electromagnetic effects where cables enter consumer unit/distribution board/enclosures (521.5.1)' },
        { ref: '4.18', desc: 'RCD(s) provided for fault protection - includes RCBOs (411.4.204; 411.5.2; 531.2)' },
        { ref: '4.19', desc: 'RCD(s) provided for additional protection/requirements - includes RCBOs (411.3.3; 415.1)' },
        { ref: '4.20', desc: 'Confirmation of indication that SPD is functional (651.4)' },
        { ref: '4.21', desc: 'Confirmation that ALL conductor connections, including connections to busbars, are correctly located in terminals and are tight and secure (526.1)' },
        { ref: '4.22', desc: 'Adequate arrangements where a generating set operates as a switched alternative to the public supply (551.6)' },
        { ref: '4.23', desc: 'Adequate arrangements where a generating set operates in parallel with the public supply (551.7)' },
      ],
    },
    {
      section: '5.0',
      title: 'FINAL CIRCUITS',
      items: [
        { ref: '5.1', desc: 'Identification of conductors (514.3.1)' },
        { ref: '5.2', desc: 'Cables correctly supported throughout their run (521.10.202; 522.8.5)' },
        { ref: '5.3', desc: 'Condition of insulation of live parts (416.1)' },
        { ref: '5.4', desc: 'Non-sheathed cables protected by enclosure in conduit, ducting or trunking (521.10.1)' },
        { ref: '5.4.1', desc: 'To include the integrity of conduit and trunking systems (metallic and plastic)' },
        { ref: '5.5', desc: 'Adequacy of cables for current-carrying capacity with regard for the type and nature of installation (Section 523)' },
        { ref: '5.6', desc: 'Coordination between conductors and overload protective devices (433.1; 533.2.1)' },
        { ref: '5.7', desc: 'Adequacy of protective devices: type and rated current for fault protection (411.3)' },
        { ref: '5.8', desc: 'Presence and adequacy of circuit protective conductors (411.3.1; Section 543)' },
        { ref: '5.9', desc: 'Wiring system(s) appropriate for the type and nature of the installation and external influences (Section 522)' },
        { ref: '5.10', desc: 'Concealed cables installed in prescribed zones (see Section 4. Extent and Limitations) (522.6.202)' },
        { ref: '5.11', desc: 'Cables concealed under floors, above ceilings or in walls/partitions, adequately protected against damage (see Section 4. Extent and Limitations) (522.6.204)' },
        { ref: '5.12', desc: 'Provision of additional requirements for protection by RCD not exceeding 30mA:' },
        { ref: '5.12.1', desc: 'For all socket-outlets of rating 32A or less, unless an exception is permitted (411.3.3)' },
        { ref: '5.12.2', desc: 'For the supply of mobile equipment not exceeding 32A rating for use outdoors (411.3.3)' },
        { ref: '5.12.3', desc: 'For cables concealed in walls at a depth of less than 50mm (522.6.202; 522.6.203)' },
        { ref: '5.12.4', desc: 'For cables concealed in walls/partitions containing metal parts regardless of depth (522.6.203)' },
        { ref: '5.12.5', desc: 'Final circuits supplying luminaires within domestic (household) premises (411.3.4)' },
        { ref: '5.13', desc: 'Provision of fire barriers, sealing arrangements and protection against thermal effects (Section 527)' },
        { ref: '5.14', desc: 'Band II cables segregated/separated from Band I cables (528.1)' },
        { ref: '5.15', desc: 'Cables segregated/separated from communications cabling (528.2)' },
        { ref: '5.16', desc: 'Cables segregated/separated from non-electrical services (528.3)' },
        { ref: '5.17', desc: 'Termination of cables at enclosures - indicate extent of sampling in Section 4 of the report (Section 526)' },
        { ref: '5.17.1', desc: 'Connections soundly made and under no undue strain (526.6)' },
        { ref: '5.17.2', desc: 'No basic insulation of a conductor visible outside enclosure (526.8)' },
        { ref: '5.17.3', desc: 'Connections of live conductors adequately enclosed (526.5)' },
        { ref: '5.17.4', desc: 'Adequately connected at point of entry to enclosure (glands, bushes etc.) (522.8.5)' },
        { ref: '5.18', desc: 'Condition of accessories including socket-outlets, switches and joint boxes (651.2(v))' },
        { ref: '5.19', desc: 'Suitability of accessories for external influences (512.2)' },
        { ref: '5.20', desc: 'Adequacy of working space/accessibility to equipment (132.12; 513.1)' },
        { ref: '5.21', desc: 'Single-pole switching or protective devices in line conductors only (132.14.1, 530.3.3)' },
      ],
    },
    {
      section: '6.0',
      title: 'LOCATION(S) CONTAINING A BATH OR SHOWER',
      items: [
        { ref: '6.1', desc: 'Additional protection for all low voltage (LV) circuits by RCD not exceeding 30mA (701.411.3.3)' },
        { ref: '6.2', desc: 'Where used as a protective measure, requirements for SELV or PELV met (701.414.4.5)' },
        { ref: '6.3', desc: 'Shaver sockets comply with BS EN 61558-2-5 formerly BS 3535 (701.512.3)' },
        { ref: '6.4', desc: 'Presence of supplementary bonding conductors, unless not required by BS 7671:2018 (701.415.2)' },
        { ref: '6.5', desc: 'Low voltage (e.g. 230 volt) socket-outlets sited at least 3m from zone 1 (701.512.3)' },
        { ref: '6.6', desc: 'Suitability of equipment for external influences for installed location in terms of IP rating (701.512.2)' },
        { ref: '6.7', desc: 'Suitability of accessories and controlgear etc. for a particular zone (701.512.3)' },
        { ref: '6.8', desc: 'Suitability of current-using equipment for particular position within the location (701.55)' },
      ],
    },
    {
      section: '7.0',
      title: 'OTHER PART 7 SPECIAL INSTALLATIONS OR LOCATIONS',
      items: [
        { ref: '7.1', desc: '' }, { ref: '7.2', desc: '' }, { ref: '7.3', desc: '' },
        { ref: '7.4', desc: '' }, { ref: '7.5', desc: '' }, { ref: '7.6', desc: '' },
        { ref: '7.7', desc: '' }, { ref: '7.8', desc: '' }, { ref: '7.9', desc: '' },
        { ref: '7.10', desc: '' },
      ],
    },
  ];

  // Get inspection data from formData
  const inspData = (fd.inspectionSchedule || {}) as Record<string, { comment?: string; outcome?: string }>;

  // Render inspection schedule across pages
  const renderInspectionSchedule = () => {
    newPage();

    const scheduleTitle = 'INSPECTION SCHEDULE FOR DOMESTIC & SIMILAR PREMISES WITH UP TO 100A SUPPLY';

    // Section number for inspection
    sectionHeader('13', scheduleTitle);

    // Column widths for inspection table
    const refW = 12;
    const descW = W - refW - 25 - 18; // remaining for description
    const commentW = 25;
    const outcomeW = 18;

    // Table header
    const drawTableHeader = () => {
      checkPage(8);
      filledRect(margin, y, W, 7, tableHeaderBg);
      borderedRect(margin, y, W, 7);
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(6.5);
      pdf.setFont('helvetica', 'bold');
      text('Item', margin + 2, y + 5);
      text('Description', margin + refW + 2, y + 5);
      text('Comments', margin + refW + descW + 2, y + 5);
      text('Outcome', margin + W - outcomeW + 2, y + 5);
      pdf.setTextColor(0, 0, 0);
      y += 7;
    };

    drawTableHeader();

    inspectionSchedule.forEach((section) => {
      // Section row
      checkPage(7);
      filledRect(margin, y, W, 6, [220, 230, 240]);
      borderedRect(margin, y, W, 6);
      pdf.setFontSize(6);
      pdf.setFont('helvetica', 'bold');
      const sectionLabel = section.items.length === 0
        ? `${section.section}  ${section.title}`
        : `${section.section}`;
      text(sectionLabel, margin + 2, y + 4);
      if (section.items.length > 0) {
        const titleLines = pdf.splitTextToSize(section.title, descW - 2);
        pdf.text(titleLines, margin + refW + 2, y + 4);
      }
      // section outcome if no items
      if (section.items.length === 0) {
        const secData = inspData[section.section];
        pdf.setFont('helvetica', 'normal');
        text(secData?.outcome || 'N/A', margin + W - outcomeW + 2, y + 4);
      }
      y += 6;

      section.items.forEach((item) => {
        const itemData = inspData[item.ref] || {};
        const comment = itemData.comment || item.comment || 'N/A';
        const outcome = itemData.outcome || item.outcome || (item.desc ? '\u2713' : 'N/A');

        pdf.setFontSize(6);
        pdf.setFont('helvetica', 'normal');
        const descLines = pdf.splitTextToSize(item.desc || 'N/A', descW - 4);
        const rowH = Math.max(5.5, descLines.length * 2.5 + 2);

        // Check if we need a new page
        if (y + rowH > maxContentY) {
          // Add outcomes legend before page break
          addOutcomesLegend();
          newPage();
          sectionHeader('', scheduleTitle);
          drawTableHeader();
        }

        borderedRect(margin, y, W, rowH);
        vLine(margin + refW, y, rowH);
        vLine(margin + refW + descW, y, rowH);
        vLine(margin + W - outcomeW, y, rowH);

        pdf.setFontSize(6);
        text(item.ref, margin + 2, y + rowH / 2 + 1);
        pdf.text(descLines, margin + refW + 2, y + 3);
        text(comment, margin + refW + descW + 2, y + rowH / 2 + 1);

        // Outcome - use tick mark for acceptable
        pdf.setFont('helvetica', 'bold');
        const outcomeDisplay = outcome === '\u2713' ? '\u2713' : outcome;
        text(outcomeDisplay, margin + W - outcomeW + 5, y + rowH / 2 + 1);
        pdf.setFont('helvetica', 'normal');

        y += rowH;
      });
    });

    // Outcomes legend
    addOutcomesLegend();
  };

  const addOutcomesLegend = () => {
    checkPage(12);
    y += 2;
    filledRect(margin, y, W, 8, [240, 245, 250]);
    borderedRect(margin, y, W, 8);
    pdf.setFontSize(5.5);
    pdf.setFont('helvetica', 'bold');
    text('OUTCOMES', margin + 2, y + 3);
    pdf.setFont('helvetica', 'normal');

    const legendItems = [
      { symbol: '\u2713', label: 'Acceptable\ncondition' },
      { label: 'Unacceptable\ncondition\nC1 or C2' },
      { label: 'Improvement\nrecommended\nC3' },
      { label: 'Further\ninvestigation\nFI' },
      { label: 'Not\nverified\nN/V' },
      { label: 'Limitation\nLIM' },
      { label: 'Not\napplicable\nN/A' },
    ];
    const lW = (W - 28) / legendItems.length;
    legendItems.forEach((item, i) => {
      const lx = margin + 26 + i * lW;
      pdf.setFontSize(5);
      const lines = pdf.splitTextToSize(item.label, lW - 2);
      pdf.text(lines, lx, y + 3);
    });
    y += 8;
  };

  renderInspectionSchedule();
  addPageFooter();

  // ════════════════════════════════════════════════════════════
  // LANDSCAPE PAGE – Schedule of Circuit Details and Test Results (section 16)
  // ════════════════════════════════════════════════════════════
  pdf.addPage('a4', 'l'); // landscape A4: 297 × 210 mm
  currentPage++;
  const lsPageW = pdf.internal.pageSize.getWidth();   // 297
  const lsPageH = pdf.internal.pageSize.getHeight();   // 210
  const lsW = lsPageW - 2 * margin;                    // ~273
  const lsMaxY = lsPageH - 16;
  y = margin;

  // Landscape footer helper
  const addLandscapeFooter = () => {
    const footerY = lsPageH - 10;
    pdf.setFontSize(6.5);
    pdf.setFont('helvetica', 'italic');
    pdf.setTextColor(100, 100, 100);
    text('This form is based on the model shown in Appendix 6 of BS 7671:2018.', margin, footerY);
    pdf.setFont('helvetica', 'normal');
    text(`Ref: ${ss(certificate.certificateNumber)}`, margin, footerY + 4);
    text(`Page: ${currentPage} of ${totalPages}`, lsPageW / 2, footerY + 4, { align: 'center' });
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(navy[0], navy[1], navy[2]);
    text(companyName, lsPageW - margin, footerY, { align: 'right' });
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(6);
    text(companyEmail, lsPageW - margin, footerY + 4, { align: 'right' });
    pdf.setTextColor(0, 0, 0);
  };

  // ── Section title bar ──
  filledRect(margin, y, lsW, 8, navy);
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  text('16  SCHEDULE OF CIRCUIT DETAILS AND TEST RESULTS', margin + 2, y + 5.5);
  pdf.setTextColor(0, 0, 0);
  y += 8;

  // ── Consumer unit info row ──
  const dbDesignation = ss(fd.consumerUnitDesignation) || 'D.B.1';
  const dbLocation = ss(fd.consumerUnitLocation) || 'Meter Cupboard';
  const dbPfc = ss(fd.consumerUnitPfc) || ss(fd.prospectiveFaultCurrent) || '';

  borderedRect(margin, y, lsW, 7);
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  text('Designation:', margin + 2, y + 5);
  pdf.setFont('helvetica', 'normal');
  text(dbDesignation, margin + 30, y + 5);
  vLine(margin + 60, y, 7);
  pdf.setFont('helvetica', 'bold');
  text('Location:', margin + 62, y + 5);
  pdf.setFont('helvetica', 'normal');
  text(dbLocation, margin + 82, y + 5);
  vLine(margin + lsW * 0.6, y, 7);
  pdf.setFont('helvetica', 'bold');
  text('Prospective fault current (Ipf):', margin + lsW * 0.6 + 2, y + 5);
  pdf.setFont('helvetica', 'normal');
  text(dbPfc ? `${dbPfc} kA` : '', margin + lsW * 0.6 + 58, y + 5);
  y += 8;

  // ── Circuit test results table ──
  const circuits = (fd.circuits || []) as Array<Record<string, any>>;

  // Column definitions matching BS 7671 Appendix 6 model form
  // Each column: { label, w (proportional weight), group, rotate (boolean) }
  const cols = [
    { label: 'Circuit\nnumber',       w: 8,  group: '' },
    { label: 'Circuit\ndesignation',  w: 24, group: '' },
    { label: 'Type of\nwiring',       w: 8,  group: '' },
    { label: 'Ref.\nmethod',          w: 7,  group: '' },
    { label: 'No. of\npoints',        w: 7,  group: '' },
    { label: 'Live (mm²)',            w: 7,  group: 'Circuit conductors: csa', rotate: true },
    { label: 'cpc (mm²)',             w: 7,  group: 'Circuit conductors: csa', rotate: true },
    { label: 'Max disc. time (s)',    w: 7,  group: '', rotate: true },
    { label: 'BS(EN)',                w: 10, group: 'Overcurrent protective devices', rotate: true },
    { label: 'Type',                  w: 7,  group: 'Overcurrent protective devices', rotate: true },
    { label: 'Rating (A)',            w: 7,  group: 'Overcurrent protective devices', rotate: true },
    { label: 'Cap. (kA)',             w: 7,  group: 'Overcurrent protective devices', rotate: true },
    { label: 'RCD IΔn (mA)',          w: 7,  group: 'RCD', rotate: true },
    { label: 'Max Zs (Ω)',            w: 8,  group: 'Circuit impedances', rotate: true },
    { label: 'R1+R2 (Ω)',             w: 9,  group: 'Circuit impedances', rotate: true },
    { label: 'R2 (Ω)',                w: 8,  group: 'Circuit impedances', rotate: true },
    { label: 'Live-Live (MΩ)',        w: 10, group: 'Insulation resistance', rotate: true },
    { label: 'Live-Earth (MΩ)',       w: 10, group: 'Insulation resistance', rotate: true },
    { label: 'Test voltage (V)',      w: 7,  group: 'Insulation resistance', rotate: true },
    { label: 'Pol.',                  w: 6,  group: '' },
    { label: 'Max Zs measured (Ω)',   w: 9,  group: '', rotate: true },
    { label: 'RCD op. time (ms)',     w: 8,  group: 'RCD', rotate: true },
    { label: 'RCD test btn',          w: 7,  group: 'RCD', rotate: true },
  ];

  // Scale columns to fill landscape width
  const totalColW = cols.reduce((s, c) => s + c.w, 0);
  const cScale = lsW / totalColW;

  // Pre-compute column x positions and scaled widths
  const colPositions: Array<{ x: number; w: number }> = [];
  {
    let cx = margin;
    cols.forEach((c) => {
      const sw = c.w * cScale;
      colPositions.push({ x: cx, w: sw });
      cx += sw;
    });
  }

  // ── Identify column groups for the merged header row ──
  const groups: Array<{ label: string; startIdx: number; endIdx: number }> = [];
  {
    let prevGroup = '';
    cols.forEach((c, i) => {
      if (c.group && c.group === prevGroup) {
        groups[groups.length - 1].endIdx = i;
      } else if (c.group) {
        groups.push({ label: c.group, startIdx: i, endIdx: i });
      }
      prevGroup = c.group;
    });
  }

  // ── Draw the multi-tier table header ──
  const drawTableHeader = (atY: number) => {
    const groupRowH = 7;   // Top tier: group labels
    const subRowH = 34;    // Bottom tier: individual column labels (longer for rotated text)
    const totalHeaderH = groupRowH + subRowH;

    // Background fill for entire header
    filledRect(margin, atY, lsW, totalHeaderH, tableHeaderBg);
    pdf.setDrawColor(borderGrey[0], borderGrey[1], borderGrey[2]);
    pdf.rect(margin, atY, lsW, totalHeaderH);

    // ── Tier 1: Group labels ──
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(5);
    pdf.setFont('helvetica', 'bold');

    groups.forEach((g) => {
      const startX = colPositions[g.startIdx].x;
      const endX = colPositions[g.endIdx].x + colPositions[g.endIdx].w;
      const spanW = endX - startX;

      // Group label centered
      const labelLines = pdf.splitTextToSize(g.label, spanW - 2);
      const labelH = labelLines.length * 2.5;
      pdf.text(labelLines, startX + spanW / 2, atY + (groupRowH - labelH) / 2 + 2.5, { align: 'center' });

      // Bottom border of group row
      pdf.setDrawColor(borderGrey[0], borderGrey[1], borderGrey[2]);
      pdf.setLineWidth(0.3);
      pdf.line(startX, atY + groupRowH, endX, atY + groupRowH);
    });

    // ── Tier 2: Individual column labels ──
    pdf.setFontSize(4.5);
    cols.forEach((c, i) => {
      const cp = colPositions[i];

      // Vertical divider (light color on navy bg)
      if (i > 0) {
        pdf.setDrawColor(borderGrey[0], borderGrey[1], borderGrey[2]);
        pdf.setLineWidth(0.3);
        pdf.line(cp.x, atY, cp.x, atY + totalHeaderH);
      }

      // Column label text – in the sub-row area
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      
      if (c.rotate) {
        // Render 90 degree rotated text (vertical orientation going upwards)
        let currentY = atY + totalHeaderH - 1.5;
        // Shift right slightly to horizontally center the rotated text in the column
        const currentX = cp.x + cp.w / 2 + 1.2;
        
        const parts = c.label.split(/([ΔΩ])/);
        parts.forEach((part) => {
          if (part === 'Δ') {
            pdf.setFont('symbol', 'normal');
            pdf.text('D', currentX, currentY, { angle: 90 });
            currentY -= pdf.getTextWidth('D');
          } else if (part === 'Ω') {
            pdf.setFont('symbol', 'normal');
            pdf.text('W', currentX, currentY, { angle: 90 });
            currentY -= pdf.getTextWidth('W');
          } else if (part.length > 0) {
            pdf.setFont('helvetica', 'bold');
            pdf.text(part, currentX, currentY, { angle: 90 });
            currentY -= pdf.getTextWidth(part);
          }
        });
        pdf.setFont('helvetica', 'normal'); // restore
      } else {
        // Render standard horizontal text
        const lines = pdf.splitTextToSize(c.label, cp.w - 1.5);
        pdf.text(lines, cp.x + cp.w / 2, atY + groupRowH + 2.5, { align: 'center' });
      }
    });

    // Outer border of header
    pdf.setDrawColor(borderGrey[0], borderGrey[1], borderGrey[2]);
    pdf.setLineWidth(0.4);
    pdf.rect(margin, atY, lsW, totalHeaderH);
    pdf.setDrawColor(0, 0, 0);
    pdf.setTextColor(0, 0, 0);

    return totalHeaderH;
  };

  const headerH = drawTableHeader(y);
  y += headerH;

  // ── Draw one data row as a fully-gridded table row ──
  const drawCircuitRow = (rowY: number, rowH: number, values: string[], isAlt: boolean) => {
    // Alternating row background
    if (isAlt) {
      filledRect(margin, rowY, lsW, rowH, [245, 248, 252]);
    }

    // Outer row border
    pdf.setDrawColor(borderGrey[0], borderGrey[1], borderGrey[2]);
    pdf.setLineWidth(0.3);
    pdf.rect(margin, rowY, lsW, rowH);

    // Cell text and vertical dividers
    pdf.setFontSize(5);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(0, 0, 0);

    values.forEach((val, ci) => {
      const cp = colPositions[ci];

      // Vertical cell border
      if (ci > 0) {
        pdf.setDrawColor(borderGrey[0], borderGrey[1], borderGrey[2]);
        pdf.setLineWidth(0.2);
        pdf.line(cp.x, rowY, cp.x, rowY + rowH);
      }

      // Cell text - center-align numeric values, left-align text
      const isText = ci === 1; // designation column
      if (isText) {
        // Left-align designation (may be long)
        const truncated = val.length > 18 ? val.substring(0, 17) + '\u2026' : val;
        text(truncated, cp.x + 1.5, rowY + rowH / 2 + 1.2);
      } else {
        // Center-align all other values
        pdf.text(ss(val), cp.x + cp.w / 2, rowY + rowH / 2 + 1.2, { align: 'center' });
      }
    });

    pdf.setDrawColor(0, 0, 0);
  };

  // ── Render data rows ──
  const dataRowH = 6;
  const minRows = 15; // Show at least 15 rows (empty ones if no data) like the original

  const circuitValues = (circuit: Record<string, any>, idx: number): string[] => [
    ss(circuit.circuitNumber) || String(idx + 1),
    ss(circuit.designation) || '',
    ss(circuit.wiringType) || '',
    ss(circuit.refMethod) || '',
    ss(circuit.numPoints) || '',
    ss(circuit.liveCsa) || '',
    ss(circuit.cpcCsa) || '',
    ss(circuit.maxDiscTime) || '',
    ss(circuit.bsen) || '',
    ss(circuit.deviceType) || '',
    ss(circuit.rating) || '',
    ss(circuit.capacity) || '',
    ss(circuit.rcdRating) || '',
    ss(circuit.maxZs) || '',
    ss(circuit.r1r2) || '',
    ss(circuit.r2) || '',
    ss(circuit.insResLL) || '',
    ss(circuit.insResLE) || '',
    ss(circuit.testVoltage) || '',
    ss(circuit.polarity) || '',
    ss(circuit.measuredZs) || '',
    ss(circuit.discTime) || '',
    ss(circuit.rcdTestButton) || '',
  ];

  const totalRows = Math.max(circuits.length, minRows);
  for (let i = 0; i < totalRows; i++) {
    // Check page overflow
    if (y + dataRowH > lsMaxY) {
      addLandscapeFooter();
      pdf.addPage('a4', 'l');
      currentPage++;
      y = margin;
      const hh = drawTableHeader(y);
      y += hh;
    }

    if (i < circuits.length) {
      const vals = circuitValues(circuits[i], i);
      drawCircuitRow(y, dataRowH, vals, i % 2 === 1);
    } else {
      // Empty row with grid
      const emptyVals = Array(cols.length).fill('');
      emptyVals[0] = String(i + 1); // row number
      drawCircuitRow(y, dataRowH, emptyVals, i % 2 === 1);
    }
    y += dataRowH;
  }

  y += 2;

  // ── Wiring type codes legend ──
  if (y + 20 < lsMaxY) {
    filledRect(margin, y, lsW, 6, [220, 230, 240]);
    borderedRect(margin, y, lsW, 6);
    pdf.setFontSize(6);
    pdf.setFont('helvetica', 'bold');
    text('CODES FOR TYPE OF WIRING', margin + 2, y + 4);
    y += 7;

    const wiringCodes = [
      { code: 'A', desc: 'Thermoplastic insulated/sheathed cables' },
      { code: 'B', desc: 'Thermoplastic cables in metallic conduit' },
      { code: 'C', desc: 'Thermoplastic cables in nonmetallic conduit' },
      { code: 'D', desc: 'Thermoplastic cables in metallic trunking' },
      { code: 'E', desc: 'Thermoplastic cables in nonmetallic trunking' },
      { code: 'F', desc: 'Thermoplastic/SWA cables' },
      { code: 'G', desc: 'Thermosetting/SWA cables' },
      { code: 'H', desc: 'Mineral insulated cables' },
      { code: 'O', desc: 'Other' },
    ];
    const wcW = lsW / 3;
    wiringCodes.forEach((wc, i) => {
      const col = i % 3;
      if (i > 0 && col === 0) y += 4.5;
      const wx = margin + col * wcW;
      pdf.setFontSize(5.5);
      pdf.setFont('helvetica', 'bold');
      text(wc.code, wx + 2, y + 3.5);
      pdf.setFont('helvetica', 'normal');
      text(wc.desc, wx + 8, y + 3.5);
    });
    y += 6;
  }

  addLandscapeFooter();

  // ════════════════════════════════════════════════════════════
  // PAGE 8 – Guidance for Recipients (back to portrait)
  // ════════════════════════════════════════════════════════════
  pdf.addPage('a4', 'p'); // explicit portrait after landscape page
  currentPage++;
  y = margin;

  // Title
  filledRect(margin, y, W, 10, navy);
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  text('DOMESTIC ELECTRICAL INSTALLATION CONDITION REPORT', pageWidth / 2, y + 7, { align: 'center' });
  pdf.setTextColor(0, 0, 0);
  y += 12;

  filledRect(margin, y, W, 8, [220, 230, 240]);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  text('GUIDANCE FOR RECIPIENTS', margin + 3, y + 5.5);
  y += 10;

  italicNote('(to be appended to the Report)');
  y += 2;

  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  text('This Report is an important and valuable document which should be retained for future reference.', margin + 2, y + 3);
  y += 7;

  const guidanceItems = [
    '1. The purpose of this Report is to confirm, so far as reasonably practicable, whether or not the electrical installation is in a satisfactory condition for continued service (see Section 5). The Report should identify any damage, deterioration, defects and/or conditions which may give rise to danger.',
    "2. The person ordering the Report should have received the 'original' Report and the inspector should have retained a duplicate.",
    "3. The 'original' Report should be retained in a safe place and be made available to any person inspecting or undertaking work on the electrical installation in the future. If the property is vacated, this Report will provide the new owner/occupier with details of the condition of the electrical installation at the time the Report was issued.",
    '4. Where the installation incorporates a residual current device (RCD) there should be a notice at or near the device stating that it should be tested six-monthly. For safety reasons it is important that this instruction is followed.',
    '5. Section 4 (Extent and Limitations) should identify fully the extent of the installation covered by this Report and any limitations on the inspection and testing. The inspector should have agreed these aspects with the person ordering the Report and with other interested parties (licensing authority, insurance company, mortgage provider and the like) before the inspection was carried out.',
    '6. Some operational limitations such as inability to gain access to parts of the installation or an item of equipment may have been encountered during the inspection. The inspector should have noted these in Section 4.',
    "7. For items classified in Section 7 as C1 ('Danger present'), the safety of those using the installation is at risk, and it is recommended that a skilled person or persons competent in electrical installation work undertakes the necessary remedial work immediately.",
    "8. For items classified in Section 7 as C2 ('Potentially dangerous'), the safety of those using the installation may be at risk and it is recommended that a skilled person or persons competent in electrical installation work undertakes the necessary remedial work as a matter of urgency.",
    '9. Where it has been stated in Section 7 that an observation requires further investigation (code FI) the inspection has revealed an apparent deficiency which may result in a code C1 or C2, and could not, due to the extent or limitations of the inspection, be fully identified. Such observations should be investigated without delay. A further examination of the installation will be necessary, to determine the nature and extent of the apparent deficiency (see Section 6).',
    '10. For safety reasons, the electrical installation should be re-inspected at appropriate intervals by a skilled person or persons, competent in such work. The recommended date by which the next inspection is due is stated in Section 6 of the Report under \'Recommendations\' and on a label at or near to the consumer unit/distribution board.',
  ];

  guidanceItems.forEach((item) => {
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    const lines = pdf.splitTextToSize(item, W - 6);
    const h = lines.length * 3 + 3;
    checkPage(h);
    pdf.text(lines, margin + 2, y + 3);
    y += h;
  });

  addPageFooter();

  return pdf.output('arraybuffer') as Uint8Array;
}
