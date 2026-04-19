import { jsPDF } from 'jspdf';
import { calculateMaxZs } from '../utils/calculate-zs';

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
  teamLogo?: string | null;
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

const CP12_GAS_SAFE_LOGO_DATA_URI =
  'data:image/webp;base64,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' +
  'WseZ6P9RP1c9zl5Y61iAAAA';

export function generateCertificatePDF(certificate: CertificateData): Uint8Array {
  // Route EICR to a dedicated generator matching the BS 7671 form structure
  if (certificate.certificateType === 'EICR') {
    return generateEICRPDF(certificate);
  }

  if (certificate.certificateType === 'CP12') {
    return generateCP12PDF(certificate);
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
    addText('AI-CERTIFICATES', margin + 5, margin + 10);
    
    // Company details
    pdf.setTextColor(52, 73, 124);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    addText('Professional certification management services', margin + 5, margin + 20);
    addText('Operated by Cain Enabled Engineering Ltd', margin + 5, margin + 26);
    
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
  const signatureSectionHeight = getSignatureSectionHeight();
  checkNewPage(signatureSectionHeight);
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

  function getSignatureFieldLines(value: string, maxWidth: number) {
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');

    const lines = pdf.splitTextToSize(safeString(value) || ' ', maxWidth);
    return lines.length > 0 ? lines : [' '];
  }

  function getSignatureFieldHeight(lines: string[]) {
    return Math.max(4, lines.length * 3.6);
  }

  function getSignatureSectionHeight() {
    const boxWidth = (pageWidth - 3 * margin) / 2;
    const valueX = 31;
    const valueWidth = boxWidth - valueX - 5;
    const inspectorNameLines = getSignatureFieldLines(safeString(certificate.inspectorName), valueWidth);
    const inspectorDateLines = getSignatureFieldLines(formatDate(certificate.inspectionDate), valueWidth);
    const inspectorContentHeight =
      getSignatureFieldHeight(inspectorNameLines) +
      3 +
      getSignatureFieldHeight(inspectorDateLines);

    return Math.max(35, 18 + inspectorContentHeight + 5);
  }

  // Helper function for signature section
  function addSignatureSection(startY: number) {
    const signatureY = startY;
    const boxWidth = (pageWidth - 3 * margin) / 2;
    const boxHeight = getSignatureSectionHeight();
    const contentTop = signatureY + 18;
    const labelX = 5;
    const valueX = 31;
    const valueWidth = boxWidth - valueX - 5;
    const rowGap = 3;

    const drawSignaturePanel = (
      x: number,
      title: string,
      nameValue: string,
      dateValue: string
    ) => {
      const nameLines = getSignatureFieldLines(nameValue, valueWidth);
      const dateLines = getSignatureFieldLines(dateValue, valueWidth);
      const nameHeight = getSignatureFieldHeight(nameLines);

      addColoredSection(x, signatureY, boxWidth, boxHeight);

      pdf.setFillColor(52, 73, 124);
      pdf.rect(x + 2, signatureY + 2, boxWidth - 4, 10, 'F');
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 255, 255);
      addText(title, x + 5, signatureY + 9);

      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      addText('Name:', x + labelX, contentTop);
      addText('Date:', x + labelX, contentTop + nameHeight + rowGap);

      pdf.setFont('helvetica', 'normal');
      pdf.text(nameLines, x + valueX, contentTop);
      pdf.text(dateLines, x + valueX, contentTop + nameHeight + rowGap);
    };

    drawSignaturePanel(
      margin,
      'INSPECTOR SIGNATURE:',
      safeString(certificate.inspectorName),
      formatDate(certificate.inspectionDate)
    );

    drawSignaturePanel(
      margin + boxWidth + 10,
      'CLIENT SIGNATURE:',
      '',
      ''
    );
  }

  return new Uint8Array(pdf.output('arraybuffer'));
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
    CP12: 'CP12 LANDLORD GAS SAFETY RECORD',
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
    CP12: 'In accordance with the Gas Safety (Installation and Use) Regulations 1998 for landlord gas safety records',
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
  } else if (type === 'CP12') {
    return [
      ['Engineer Gas Safe No.:', safeString(formData.gasSafeNumber) || 'Not specified'],
      ['Appliance Type:', safeString(formData.applianceType) || 'Not specified'],
      ['Appliance Location:', safeString(formData.applianceLocation) || 'Not specified'],
      ['Appliance Make/Model:', safeString(formData.applianceMakeModel) || 'Not specified'],
      ['Flue Type:', safeString(formData.flueType) || 'Not specified'],
      ['Operating Pressure:', safeString(formData.operatingPressure) || 'Not specified'],
      ['Flue Performance:', safeString(formData.fluePerformanceSatisfactory) || 'Not specified']
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
    CP12: 'I certify that the gas appliances and flues detailed above have been checked in accordance with the Gas Safety (Installation and Use) Regulations 1998 and, subject to any defects or remedial works noted above, are safe for continued use at the time of inspection.',
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
    CP12: 'Annual Gas Safety Check',
    EICR: 'Condition Report',
  };
  
  return types[type] || 'Inspection';
}

function formatDate(dateString: string | null | undefined): string {
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

function parseJsonLike<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined || value === '') return fallback;

  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }

  return value as T;
}

function parseCircuitResistance(value: unknown): number | null {
  const numeric = Number(String(value).replace(/[^0-9.+-]/g, ''));
  return Number.isFinite(numeric) ? numeric : null;
}

function isRingFinalCircuit(designation: unknown, ringFinal: unknown): boolean {
  const hasTick = safeString(ringFinal).trim() === '✓';
  const mentionsRing = /\bring\b|\bring final\b/i.test(safeString(designation));
  return hasTick || mentionsRing;
}

function inferCircuitValidationMode(row: Record<string, any>): 'ring' | 'radial' | 'equal-r1-r2' | null {
  const designation = safeString(row.designation).trim().toLowerCase();
  const isRingFinal = isRingFinalCircuit(designation, row.ringFinal);
  const r1 = parseCircuitResistance(row.r1Line);
  const rn = parseCircuitResistance(row.rnNeutral);
  const r2 = parseCircuitResistance(row.r2Cpc);
  const r1r2 = parseCircuitResistance(row.r1r2);

  const hasAllRingValues = r1 !== null && rn !== null && r2 !== null;
  const mentionsRadial = /\bradial\b/i.test(designation);
  const mentionsRing = /\bring\b|\bring final\b/i.test(designation);

  if (mentionsRadial && !isRingFinal) {
    return 'radial';
  }

  if (hasAllRingValues) {
    const ringLikeLineNeutral = rn !== null && r1 !== null && Math.abs(r1 - rn) / Math.max(Math.abs(r1), Math.abs(rn), 1) * 100 <= 10;
    const equalR1R2 = r1 !== null && r2 !== null && Math.abs(r1 - r2) / Math.max(Math.abs(r1), Math.abs(r2), 1) * 100 <= 10;
    const ringLikeR1R2 =
      r1r2 !== null && r1 !== null && r2 !== null &&
      (Math.abs(r1r2 - (r1 + r2) / 4) / Math.max(Math.abs(r1r2), Math.abs((r1 + r2) / 4), 1) * 100 <= 15 ||
       (rn !== null && Math.abs(r1r2 - (rn + r2) / 4) / Math.max(Math.abs(r1r2), Math.abs((rn + r2) / 4), 1) * 100 <= 15));

    if (equalR1R2 && (isRingFinal || mentionsRing || ringLikeLineNeutral || ringLikeR1R2)) {
      return 'equal-r1-r2';
    }

    if (isRingFinal || mentionsRing || ringLikeLineNeutral || ringLikeR1R2) {
      return 'ring';
    }
  }

  if (isRingFinal || mentionsRing) {
    if (r1 !== null && r2 !== null && Math.abs(r1 - r2) / Math.max(Math.abs(r1), Math.abs(r2), 1) * 100 <= 10) {
      return 'equal-r1-r2';
    }
    return 'ring';
  }

  return 'radial';
}

function formatValidationPercent(percent: number): string {
  return `${percent.toFixed(1)}%`;
}

function extractAiAnalysisNotes(fd: Record<string, any>): string[] {
  const candidateKeys = [
    'aiValidationIssues',
    'visualAnalysisIssues',
    'imageAnalysisIssues',
    'imageAnalysisSummary',
    'visionAnalysisNotes',
    'analysisIssues',
    'aiObservations',
    'aiRemarks',
    'analysisNotes',
    'visionNotes',
  ];

  const notes: string[] = [];
  candidateKeys.forEach((key) => {
    const value = fd[key];
    if (typeof value === 'string' && value.trim()) {
      notes.push(value.trim());
    } else if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item !== null && item !== undefined) {
          notes.push(String(item));
        }
      });
    } else if (typeof value === 'object' && value !== null) {
      const stringified = JSON.stringify(value);
      if (stringified && stringified !== '{}') {
        notes.push(stringified);
      }
    }
  });

  return notes;
}

function buildEicrCircuitValidationIssues(
  circuitRows: Array<Record<string, any>>,
  externalEarthFaultLoopImpedance: string,
): string[] {
  const issues: string[] = [];
  const ze = parseCircuitResistance(externalEarthFaultLoopImpedance);

  circuitRows.forEach((row, index) => {
    const circuitName = safeString(row.designation) || `Circuit ${index + 1}`;
    const r1 = parseCircuitResistance(row.r1Line);
    const rn = parseCircuitResistance(row.rnNeutral);
    const r2 = parseCircuitResistance(row.r2Cpc);
    const r1r2 = parseCircuitResistance(row.r1r2);
    const measuredZs = parseCircuitResistance(row.measuredZs);
    const mode = inferCircuitValidationMode(row);

    const isRing = mode === 'ring' || mode === 'equal-r1-r2';
    const expectedCircuitResistance = isRing && r1 !== null && r2 !== null ? (r1 + r2) / 4 : r1r2;
    const toleranceZs = mode === 'radial' ? 15 : 25;
    const toleranceR1R2 = isRing ? 25 : 15;

    if (isRing && r1 !== null && rn !== null) {
      const rnMismatch = Math.abs(r1 - rn) / Math.max(Math.abs(r1), Math.abs(rn), 1) * 100;
      if (rnMismatch > 10) {
        issues.push(
          `${circuitName}: neutral continuity is not sufficiently consistent with r1 on this ring final circuit (${rnMismatch.toFixed(1)}% difference).`,
        );
      }
    }

    if (measuredZs !== null && ze !== null && expectedCircuitResistance !== null) {
      const corrected = expectedCircuitResistance * 1.2;
      const expectedZs = ze + corrected;
      const delta = Math.abs(measuredZs - expectedZs);
      const percent = expectedZs === 0 ? 0 : (delta / expectedZs) * 100;
      if (percent > toleranceZs) {
        issues.push(
          `${circuitName}: measured Zs ${measuredZs.toFixed(2)}Ω is outside ${toleranceZs}% of expected ${expectedZs.toFixed(2)}Ω (${formatValidationPercent(percent)} off).`,
        );
      }
    }

    if (r1r2 !== null && expectedCircuitResistance !== null && expectedCircuitResistance > 0) {
      const delta = Math.abs(r1r2 - expectedCircuitResistance);
      const percent = (delta / expectedCircuitResistance) * 100;
      if (percent > toleranceR1R2) {
        issues.push(
          `${circuitName}: reported R1+R2 ${r1r2.toFixed(2)}Ω differs from expected ${expectedCircuitResistance.toFixed(2)}Ω by ${formatValidationPercent(percent)}.`,
        );
      }
    }

    if (mode === 'radial' && row.wiringType && r1 !== null && r2 !== null) {
      const expectedR2 = r1 * 1.75;
      const delta = Math.abs(r2 - expectedR2);
      const percent = expectedR2 === 0 ? 0 : (delta / expectedR2) * 100;
      if (percent > 10) {
        issues.push(
          `${circuitName}: radial twin-and-earth conductor R2 ${r2.toFixed(2)}Ω is outside 10% of 1.75×R1 (${expectedR2.toFixed(2)}Ω).`,
        );
      }
    }
  });

  return issues;
}

function buildEicrValidationSummary(
  fd: Record<string, any>,
  circuitRows: Array<Record<string, any>>,
): string[] {
  const extraLines = extractAiAnalysisNotes(fd);
  const circuitIssues = buildEicrCircuitValidationIssues(circuitRows, safeString(fd.externalEarthFaultLoopImpedance));

  if (circuitIssues.length === 0 && extraLines.length === 0) {
    return ['No AI validation issues were identified.'];
  }

  const summary: string[] = [
    'This AI validation check cross-verifies the reported measurements, circuit logic, and any available visual/analysis observations.',
  ];

  if (circuitIssues.length > 0) {
    summary.push('', 'Circuit verification issues:');
    circuitIssues.forEach((issue) => summary.push(`- ${issue}`));
  }

  if (extraLines.length > 0) {
    summary.push('', 'Visual / AI-derived analysis notes:');
    extraLines.forEach((note) => summary.push(`- ${note}`));
  }

  return summary;
}

function normalizeObservationCode(value: unknown): 'C1' | 'C2' | 'C3' | 'FI' | '' {
  const normalized = safeString(value).trim().toUpperCase();
  if (normalized === 'C1' || normalized === 'C2' || normalized === 'C3' || normalized === 'FI') {
    return normalized;
  }

  if (normalized.includes('DANGER PRESENT')) return 'C1';
  if (normalized.includes('POTENTIALLY DANGEROUS')) return 'C2';
  if (normalized.includes('IMPROVEMENT')) return 'C3';
  if (normalized.includes('FURTHER INVESTIGATION')) return 'FI';

  return '';
}

function normalizeObservationRows(items: CertificateData['items']): Array<{
  itemNumber: string;
  description: string;
  code: 'C1' | 'C2' | 'C3' | 'FI';
}> {
  return (items || [])
    .map((item, index) => {
      const defectCode = normalizeObservationCode(item?.defects);
      const recommendationCode = normalizeObservationCode(item?.recommendations);
      const statusCode =
        safeString(item?.status).toLowerCase() === 'unsatisfactory' ? 'C2' : '';
      const code = defectCode || recommendationCode || statusCode || 'C3';

      const descriptionParts = [
        safeString(item?.location).trim() ? `Location: ${safeString(item?.location).trim()}` : '',
        safeString(item?.description).trim(),
        defectCode ? '' : safeString(item?.defects).trim(),
        recommendationCode ? '' : safeString(item?.recommendations).trim(),
      ].filter(Boolean);

      return {
        itemNumber: safeString(item?.id) || String(index + 1),
        description: descriptionParts.join(' — ').trim(),
        code,
      };
    })
    .filter((item) => item.description);
}

function deriveEicrAssessment(fd: Record<string, any>, observations: Array<{ code: 'C1' | 'C2' | 'C3' | 'FI' }>): 'SATISFACTORY' | 'UNSATISFACTORY' {
  const explicit = safeString(fd.overallAssessment).trim().toUpperCase();
  if (explicit === 'SATISFACTORY' || explicit === 'UNSATISFACTORY') {
    return explicit;
  }

  return observations.some((obs) => obs.code === 'C1' || obs.code === 'C2')
    ? 'UNSATISFACTORY'
    : 'SATISFACTORY';
}

function generateCP12PDF(certificate: CertificateData): Uint8Array {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;
  const fd = (certificate.formData || {}) as Record<string, any>;

  const brand = [28, 63, 99] as [number, number, number];
  const cp12Yellow = [246, 198, 0] as [number, number, number];
  const border = [164, 174, 188] as [number, number, number];
  const soft = [245, 247, 250] as [number, number, number];
  const softBlue = [236, 243, 250] as [number, number, number];
  const green = [46, 125, 50] as [number, number, number];
  const amber = [245, 158, 11] as [number, number, number];
  const red = [185, 28, 28] as [number, number, number];
  const sectionGap = 4;
  const footerText =
    'This record should be retained by the landlord and provided to tenants in accordance with current UK gas safety requirements.';
  const footerFontSize = 7.5;
  const footerBottomMargin = 8;
  let y = margin;

  const ss = safeString;
  const propertyName = certificate.siteName || fd.propertyName || 'Not specified';
  const propertyAddress = certificate.siteAddress || fd.propertyAddress || 'Not specified';
  const landlordName = ss(fd.landlordName) || certificate.customer.name || 'Not specified';
  const tenantName = ss(fd.tenantName) || 'Not specified';
  const gasSafeNumber = ss(fd.gasSafeNumber) || 'Not specified';
  const applianceStatus = ss(fd.applianceSafeToUse) || 'Not specified';

  const boolLabel = (value: any) => {
    const normalized = ss(value).trim().toLowerCase();
    if (!normalized) return 'Not specified';
    if (normalized === 'yes') return 'Yes';
    if (normalized === 'no') return 'No';
    if (normalized === 'n/a') return 'N/A';
    return ss(value);
  };

  const getLineHeight = (fontSize: number) => (fontSize * 1.15) / pdf.internal.scaleFactor;

  const drawBox = (
    x: number,
    top: number,
    width: number,
    height: number,
    title: string,
    fill: [number, number, number] = soft,
  ) => {
    pdf.setDrawColor(border[0], border[1], border[2]);
    pdf.setFillColor(fill[0], fill[1], fill[2]);
    pdf.rect(x, top, width, height, 'FD');

    pdf.setFillColor(cp12Yellow[0], cp12Yellow[1], cp12Yellow[2]);
    pdf.rect(x, top, width, 8, 'F');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(20, 20, 20);
    pdf.text(title, x + 3, top + 5.5);

    pdf.setTextColor(0, 0, 0);
  };

  const drawField = (
    label: string,
    value: string,
    x: number,
    top: number,
    width: number,
    fontSize = 9,
  ) => {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(fontSize);
    pdf.text(label, x, top);
    pdf.setFont('helvetica', 'normal');
    const lines = pdf.splitTextToSize(value || 'Not specified', width);
    const lineHeight = getLineHeight(fontSize);
    pdf.text(lines, x, top + 4.8);
    return top + 4.8 + Math.max(lines.length, 1) * lineHeight;
  };

  const measureFieldBottomOffset = (
    value: string,
    width: number,
    fontSize = 9,
  ) => {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(fontSize);
    const lines = pdf.splitTextToSize(value || 'Not specified', width);
    return 4.8 + Math.max(lines.length, 1) * getLineHeight(fontSize);
  };

  const statusColor = (() => {
    const normalized = applianceStatus.toLowerCase();
    if (normalized === 'yes') return green;
    if (normalized === 'at risk') return amber;
    if (normalized === 'immediately dangerous' || normalized === 'no') return red;
    return brand;
  })();

  const drawGasSafeBadgeFallback = (x: number, top: number, width: number, height: number) => {
    pdf.setDrawColor(border[0], border[1], border[2]);
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(x, top, width, height, 2, 2, 'FD');

    pdf.setFillColor(cp12Yellow[0], cp12Yellow[1], cp12Yellow[2]);
    pdf.roundedRect(x + 2, top + 2, width - 4, height - 4, 1.5, 1.5, 'F');

    pdf.setFillColor(brand[0], brand[1], brand[2]);
    pdf.rect(x + 4, top + 4, 9, height - 8, 'F');

    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.text('G', x + 8.5, top + height / 2 + 2, { align: 'center' });

    pdf.setTextColor(20, 20, 20);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.text('GAS SAFE', x + 16, top + 9);
    pdf.setFontSize(7);
    pdf.text('REGISTER', x + 16, top + 14);
  };

  const drawGasSafeBadge = (x: number, top: number, width: number, height: number) => {
    try {
      pdf.addImage(CP12_GAS_SAFE_LOGO_DATA_URI, 'WEBP', x, top, width, height);
    } catch {
      drawGasSafeBadgeFallback(x, top, width, height);
    }
  };

  const addContinuationHeader = () => {
    pdf.addPage();
    y = margin;

    pdf.setDrawColor(border[0], border[1], border[2]);
    pdf.setFillColor(255, 255, 255);
    pdf.rect(margin, y, contentWidth, 16, 'FD');
    pdf.setFillColor(cp12Yellow[0], cp12Yellow[1], cp12Yellow[2]);
    pdf.rect(margin, y, contentWidth, 4, 'F');
    pdf.setTextColor(20, 20, 20);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.text('CP12 Gas Safety Record (continued)', margin + 4, y + 9.5);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.5);
    pdf.text(`Certificate No. ${ss(certificate.certificateNumber) || 'Not specified'}`, margin + 4, y + 13.8);
    drawGasSafeBadge(margin + contentWidth - 17, y + 1, 14, 14);
    pdf.setTextColor(0, 0, 0);
    y += 20;
  };

  pdf.setDrawColor(border[0], border[1], border[2]);
  pdf.setFillColor(255, 255, 255);
  pdf.rect(margin, y, contentWidth, 22, 'FD');
  pdf.setFillColor(cp12Yellow[0], cp12Yellow[1], cp12Yellow[2]);
  pdf.rect(margin, y, contentWidth, 4, 'F');
  pdf.setTextColor(20, 20, 20);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.text('LANDLORD / HOMEOWNER GAS SAFETY RECORD', margin + 4, y + 10.5);
  pdf.setFontSize(10);
  pdf.text('(CP12)', margin + 4, y + 17);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.text('Gas Safety (Installation and Use) Regulations 1998', margin + 20, y + 17);
  drawGasSafeBadge(margin + contentWidth - 21, y + 2.5, 18, 18);
  pdf.setTextColor(0, 0, 0);
  y += 26;

  const leftWidth = contentWidth * 0.62;
  const rightWidth = contentWidth - leftWidth - 4;
  const propertyLeftWidth = leftWidth - 6;
  const propertyRightWidth = rightWidth - 10;
  const propertyHalfWidth = rightWidth / 2;
  const propertyFirstRowTop = y + 13;
  const propertyFirstRowHeight = Math.max(
    measureFieldBottomOffset(ss(propertyName), propertyLeftWidth),
    measureFieldBottomOffset(ss(certificate.certificateNumber), propertyRightWidth),
  );
  const propertySecondRowTop = propertyFirstRowTop + propertyFirstRowHeight + 3;
  const propertySecondRowHeight = Math.max(
    measureFieldBottomOffset(ss(propertyAddress), propertyLeftWidth, 8.5),
    measureFieldBottomOffset(formatDate(certificate.inspectionDate), propertyHalfWidth - 8, 8.5),
    measureFieldBottomOffset(formatDate(certificate.nextInspectionDate), propertyHalfWidth - 10, 8.5),
  );
  const propertyBoxHeight = Math.max(32, propertySecondRowTop - y + propertySecondRowHeight + 4);

  drawBox(margin, y, leftWidth, propertyBoxHeight, 'Property Details', softBlue);
  drawBox(margin + leftWidth + 4, y, rightWidth, propertyBoxHeight, 'Record Details', soft);

  drawField('Property / Site', ss(propertyName), margin + 3, propertyFirstRowTop, propertyLeftWidth);
  drawField('Address', ss(propertyAddress), margin + 3, propertySecondRowTop, propertyLeftWidth, 8.5);

  drawField('Certificate No.', ss(certificate.certificateNumber), margin + leftWidth + 7, propertyFirstRowTop, propertyRightWidth);
  drawField('Inspection Date', formatDate(certificate.inspectionDate), margin + leftWidth + 7, propertySecondRowTop, propertyHalfWidth - 8, 8.5);
  drawField('Next Check Due', formatDate(certificate.nextInspectionDate), margin + leftWidth + 7 + propertyHalfWidth, propertySecondRowTop, propertyHalfWidth - 10, 8.5);
  y += propertyBoxHeight + sectionGap;

  const personColumnGap = 4;
  const personColumnWidth = (contentWidth - 6 - personColumnGap) / 2;
  const personLeftX = margin + 3;
  const personRightX = personLeftX + personColumnWidth + personColumnGap;
  const personFirstRowTop = y + 13;
  const personFirstRowHeight = Math.max(
    measureFieldBottomOffset(landlordName, personColumnWidth),
    measureFieldBottomOffset(tenantName, personColumnWidth),
  );
  const personSecondRowTop = personFirstRowTop + personFirstRowHeight + 4;
  const personSecondRowHeight = Math.max(
    measureFieldBottomOffset(ss(certificate.inspectorName) || 'Not specified', personColumnWidth),
    measureFieldBottomOffset(gasSafeNumber, personColumnWidth),
  );
  const responsibleBoxHeight = Math.max(26, personSecondRowTop - y + personSecondRowHeight + 4);

  drawBox(margin, y, contentWidth, responsibleBoxHeight, 'Responsible Persons and Engineer', soft);
  drawField('Landlord / Agent', landlordName, personLeftX, personFirstRowTop, personColumnWidth);
  drawField('Tenant', tenantName, personRightX, personFirstRowTop, personColumnWidth);
  drawField('Engineer', ss(certificate.inspectorName) || 'Not specified', personLeftX, personSecondRowTop, personColumnWidth);
  drawField('Gas Safe No.', gasSafeNumber, personRightX, personSecondRowTop, personColumnWidth);
  y += responsibleBoxHeight + sectionGap;

  drawBox(margin, y, contentWidth, 39, 'Appliance and Flue Details', softBlue);
  const tableX = margin + 2;
  const tableY = y + 10;
  const tableWidth = contentWidth - 4;
  const colWidths = [22, 22, 34, 22, 16, 16, 15, 15, 20];
  const headers = ['Appliance', 'Location', 'Make / Model', 'Serial No.', 'Flue', 'Pressure', 'Devices', 'Flue OK', 'Safe'];
  const colPositions: number[] = [];
  let xCursor = tableX;
  colWidths.forEach((width) => {
    colPositions.push(xCursor);
    xCursor += width;
  });

  pdf.setFillColor(cp12Yellow[0], cp12Yellow[1], cp12Yellow[2]);
  pdf.rect(tableX, tableY, tableWidth, 8, 'F');
  pdf.setTextColor(20, 20, 20);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7.5);
  headers.forEach((header, index) => {
    pdf.text(header, colPositions[index] + 1.5, tableY + 5.2);
  });

  const applianceRow = [
    ss(fd.applianceType) || 'Not specified',
    ss(fd.applianceLocation) || 'Not specified',
    ss(fd.applianceMakeModel) || 'Not specified',
    ss(fd.serialNumber) || 'Not specified',
    ss(fd.flueType) || 'Not specified',
    ss(fd.operatingPressure) || 'Not specified',
    boolLabel(fd.safetyDevicesCorrect),
    boolLabel(fd.fluePerformanceSatisfactory),
    applianceStatus,
  ];

  pdf.setTextColor(0, 0, 0);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.2);
  const rowY = tableY + 8;
  pdf.setDrawColor(border[0], border[1], border[2]);
  pdf.rect(tableX, rowY, tableWidth, 12);

  applianceRow.forEach((value, index) => {
    const width = colWidths[index];
    if (index > 0) {
      pdf.line(colPositions[index], rowY, colPositions[index], rowY + 12);
    }

    if (index === applianceRow.length - 1) {
      pdf.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
      pdf.rect(colPositions[index], rowY, width, 12, 'F');
      pdf.setDrawColor(border[0], border[1], border[2]);
      pdf.rect(colPositions[index], rowY, width, 12);
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.text(value, colPositions[index] + width / 2, rowY + 7.2, { align: 'center' });
      pdf.setTextColor(0, 0, 0);
      pdf.setFont('helvetica', 'normal');
    } else {
      const clipped = pdf.splitTextToSize(value, width - 2).slice(0, 2);
      pdf.text(clipped, colPositions[index] + 1, rowY + 4.4);
    }
  });
  y += 39 + sectionGap;

  const checks = [
    ['Ventilation', boolLabel(fd.ventilationSatisfactory)],
    ['Termination', boolLabel(fd.terminationSatisfactory)],
    ['Gas tightness', boolLabel(fd.gasTightnessTest)],
    ['CO alarm present', boolLabel(fd.coAlarmPresent)],
    ['CO alarm tested', boolLabel(fd.coAlarmTested)],
    ['Boiler serviced', boolLabel(fd.boilerServiceCompleted)],
    ['Warning notice', boolLabel(fd.warningNoticeIssued)],
    ['Emergency control', ss(fd.emergencyControlLocation) || 'Not specified'],
  ];

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.5);
  const checkLabelWidth = 24;
  const checkColumnWidth = contentWidth / 2 - 6;
  const checkRowGap = 2;
  const checkLineHeight = getLineHeight(8.5);
  const checkEntries = checks.map(([label, value]) => ({
    label,
    valueLines: pdf.splitTextToSize(value, checkColumnWidth - checkLabelWidth).slice(0, 2),
  }));
  const checkRows = Array.from({ length: Math.ceil(checkEntries.length / 2) }, (_, rowIndex) => {
    const rowEntries = checkEntries.slice(rowIndex * 2, rowIndex * 2 + 2);
    const rowHeight = Math.max(
      6,
      ...rowEntries.map((entry) => Math.max(entry.valueLines.length, 1) * checkLineHeight),
    );

    return { rowEntries, rowHeight };
  });
  const checksContentHeight = checkRows.reduce(
    (total, row, index) => total + row.rowHeight + (index < checkRows.length - 1 ? checkRowGap : 0),
    0,
  );
  const checksBoxHeight = Math.max(34, 13 + checksContentHeight + 4);

  drawBox(margin, y, contentWidth, checksBoxHeight, 'Gas Safety Checks', soft);
  let currentCheckY = y + 13;
  checkRows.forEach((row) => {
    row.rowEntries.forEach((entry, column) => {
      const fieldX = margin + 3 + column * (contentWidth / 2);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${entry.label}:`, fieldX, currentCheckY);
      pdf.setFont('helvetica', 'normal');
      pdf.text(entry.valueLines, fieldX + checkLabelWidth, currentCheckY);
    });
    currentCheckY += row.rowHeight + checkRowGap;
  });
  y += checksBoxHeight + sectionGap;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  const defects = pdf.splitTextToSize(
    ss(fd.defectsRemedialAction) || 'No defects or remedial actions recorded.',
    contentWidth - 8,
  );
  const defectsBoxHeight = Math.max(28, 14 + Math.max(defects.length, 1) * getLineHeight(9) + 4);
  drawBox(margin, y, contentWidth, defectsBoxHeight, 'Defects Identified / Remedial Action Required', softBlue);
  pdf.text(defects, margin + 3, y + 14);
  y += defectsBoxHeight + sectionGap;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.5);
  const declaration = pdf.splitTextToSize(
    'I confirm that the appliances and flues listed above were checked on the date shown and that this record reflects the condition found at the time of inspection.',
    contentWidth - 8,
  );
  const declarationBoxHeight = Math.max(24, 13 + Math.max(declaration.length, 1) * getLineHeight(8.5) + 4);
  drawBox(margin, y, contentWidth, declarationBoxHeight, 'Declaration', soft);
  pdf.text(declaration, margin + 3, y + 13);
  y += declarationBoxHeight + sectionGap;

  const signWidth = (contentWidth - 4) / 2;
  const signLeftX = margin + 3;
  const signRightX = margin + signWidth + 7;
  const signLeftWidth = signWidth - 6;
  const signRightWidth = signWidth - 8;
  const signName = tenantName !== 'Not specified' ? tenantName : landlordName;
  const signFirstRowHeight = Math.max(
    measureFieldBottomOffset(ss(certificate.inspectorName) || 'Not specified', signLeftWidth, 8.5),
    measureFieldBottomOffset(signName, signRightWidth, 8.5),
  );
  const signSecondRowHeight = Math.max(
    measureFieldBottomOffset(formatDate(certificate.inspectionDate), signLeftWidth, 8.5),
    measureFieldBottomOffset(formatDate(certificate.inspectionDate), signRightWidth, 8.5),
  );
  const signBoxHeight = Math.max(22, 13 + signFirstRowHeight + 4 + signSecondRowHeight + 4);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(footerFontSize);
  const footerLines = pdf.splitTextToSize(footerText, contentWidth);
  const footerReservedTop = pageHeight - footerBottomMargin - footerLines.length * getLineHeight(footerFontSize) - 1;

  if (y + signBoxHeight > footerReservedTop - sectionGap) {
    addContinuationHeader();
  }

  const signFirstRowTop = y + 13;
  const signSecondRowTop = signFirstRowTop + signFirstRowHeight + 4;

  drawBox(margin, y, signWidth, signBoxHeight, 'Engineer Sign-Off', softBlue);
  drawBox(margin + signWidth + 4, y, signWidth, signBoxHeight, 'Tenant / Agent Acknowledgement', softBlue);
  drawField('Engineer', ss(certificate.inspectorName) || 'Not specified', signLeftX, signFirstRowTop, signLeftWidth, 8.5);
  drawField('Date', formatDate(certificate.inspectionDate), signLeftX, signSecondRowTop, signLeftWidth, 8.5);
  drawField('Name', signName, signRightX, signFirstRowTop, signRightWidth, 8.5);
  drawField('Date', formatDate(certificate.inspectionDate), signRightX, signSecondRowTop, signRightWidth, 8.5);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(footerFontSize);
  pdf.setTextColor(90, 90, 90);
  pdf.text(footerLines, margin, pageHeight - footerBottomMargin - (footerLines.length - 1) * getLineHeight(footerFontSize));

  return new Uint8Array(pdf.output('arraybuffer'));
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
  
  // Safely parse inspection schedule data - handle both string and object formats
  let inspectionData: Record<string, { comment?: string; outcome?: string }> = {};
  if (fd.inspectionSchedule) {
    inspectionData = parseJsonLike<Record<string, { comment?: string; outcome?: string }>>(fd.inspectionSchedule, {});
  }
  
  const circuitRows = parseJsonLike<Array<Record<string, any>>>(fd.circuits, []);
  const observations = normalizeObservationRows(certificate.items);
  const overallAssessment = deriveEicrAssessment(fd, observations);

  // ── Colour palette (driven by template when available) ──
  const tc = certificate.templateConfig?.colors;
  const brandRed = tc?.primary ? hexToRgb(tc.primary) : [200, 16, 46] as [number, number, number];
  const light  = tc?.secondary ? lighten(hexToRgb(tc.secondary), 0.9) : [248, 248, 246] as [number, number, number];
  const gold   = tc?.accent     ? hexToRgb(tc.accent)    : [255, 193, 7]  as [number, number, number];
  const green  = [40,  167, 69] as [number, number, number];  // outcome – always green
  const red    = [220, 53,  69] as [number, number, number];  // outcome – always red
  const orange = [255, 140, 0]  as [number, number, number];  // outcome – always orange
  const purple = [100, 55, 155] as [number, number, number];  // outcome – always purple
  const charcoal = [70, 70, 70] as [number, number, number];
  const white  = tc?.background ? hexToRgb(tc.background) : [255, 255, 255] as [number, number, number];
  const borderGrey = tc?.secondary ? lighten(hexToRgb(tc.secondary), 0.55) : [165, 165, 165] as [number, number, number];
  const tableHeaderBg = tc?.secondary ? lighten(hexToRgb(tc.secondary), 0.84) : [237, 237, 237] as [number, number, number];

  const W = pageWidth - 2 * margin;
  const companyName = ss(fd.tradingTitle) || 'Cain Enabled Engineering Ltd';
  const companyEmail = ss(fd.companyEmail) || 'office@cain-enabled.co.uk';

  // ── Helpers ──────────────────────────────────────────────
  const text = (t: string, x: number, yy: number, opts?: any) => {
    let str = ss(t);
    
    // Replace "I\"n" or "I dn" or variants with true Δ character and "ohms" with Ω 
    // This allows us to handle input easily
    str = str.replace(/I"n/g, 'I\u0394n').replace(/I dn/g, 'I\u0394n').replace(/ohms/g, '\u03A9');

    if (!str.includes('\u03A9') && !str.includes('\u0394')) {
      pdf.text(str, x, yy, opts);
      return;
    }

    const parts = str.split(/([\u03A9\u0394])/);
    let currentX = x;

    const font = pdf.getFont();
    const fontSize = pdf.getFontSize();
    
    // Manual alignment calculations purely for center/right since pdf.text options don't cover chunked calls
    let renderOpts = opts ? { ...opts } : undefined;
    if (opts && (opts.align === 'center' || opts.align === 'right')) {
      let totalWidth = 0;
      parts.forEach(p => {
        if (p === '\u03A9') {
          pdf.setFont('Symbol', 'normal');
          totalWidth += pdf.getStringUnitWidth('W') * fontSize / pdf.internal.scaleFactor;
        } else if (p === '\u0394') {
          pdf.setFont('Symbol', 'normal');
          totalWidth += pdf.getStringUnitWidth('D') * fontSize / pdf.internal.scaleFactor;
        } else {
          pdf.setFont(font.fontName, font.fontStyle);
          totalWidth += pdf.getStringUnitWidth(p) * fontSize / pdf.internal.scaleFactor;
        }
      });
      if (opts.align === 'center') currentX = x - totalWidth / 2;
      if (opts.align === 'right') currentX = x - totalWidth;
      
      // Strip align out so manual positioning works left-to-right
      delete renderOpts.align;
    }

    // Render char by char seamlessly swapping between Helvetica and Symbol
    parts.forEach(part => {
      if (!part) return;
      if (part === '\u03A9') {
        pdf.setFont('Symbol', 'normal');
        pdf.text('W', currentX, yy, renderOpts);
        currentX += pdf.getStringUnitWidth('W') * fontSize / pdf.internal.scaleFactor;
      } else if (part === '\u0394') {
        pdf.setFont('Symbol', 'normal');
        pdf.text('D', currentX, yy, renderOpts);
        currentX += pdf.getStringUnitWidth('D') * fontSize / pdf.internal.scaleFactor;
      } else {
        pdf.setFont(font.fontName, font.fontStyle);
        pdf.text(part, currentX, yy, renderOpts);
        currentX += pdf.getStringUnitWidth(part) * fontSize / pdf.internal.scaleFactor;
      }
    });

    // Restore original font
    pdf.setFont(font.fontName, font.fontStyle);
  };

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

  // Right-side section tabs intentionally disabled, but retain the page section state
  // because other pagination logic still assigns to this variable.
  let currentPageSections: string[] = [];

  // Page footer with reference, page number, company info
  const addPageFooter = (showPageNum = true) => {
    const footerY = pageHeight - 10;
    pdf.setFontSize(6.5);
    pdf.setFont('helvetica', 'italic');
    pdf.setTextColor(100, 100, 100);
    text('This form is based on the model shown in Appendix 6 of BS 7671:2018.', margin, footerY);
    pdf.setFont('helvetica', 'normal');
    text(`Ref: ${ss(certificate.certificateNumber)}`, margin, footerY + 4);
    if (showPageNum) {
      text(`Page: ${currentPage} of ${totalPages}`, pageWidth / 2, footerY + 4, { align: 'center' });
    }
    // Company name & email aligned right in footer area
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(brandRed[0], brandRed[1], brandRed[2]);
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

  // Section header bar (NICEIC-style red with white text)
  const sectionHeader = (num: string, title: string) => {
    checkPage(9);
    filledRect(margin, y, W, 8, brandRed);
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
    filledRect(margin, y, W, 7, tableHeaderBg);
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
    labLines.forEach((line: string, i: number) => {
      text(line, margin + 2, labY + i * 3.2);
    });
    
    pdf.setFont('helvetica', 'normal');
    const valY = y + h / 2 + 1.5 - (valLines.length > 1 ? (valLines.length - 1) * 1.6 : 0);
    valLines.forEach((line: string, i: number) => {
      text(line, margin + labelW + 2, valY + i * 3.2);
    });
    
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
    lines.forEach((line: string, i: number) => {
      text(line, margin + 3, y + 3 + i * (fontSize * 0.4));
    });
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
    lines.forEach((line: string, i: number) => {
      text(line, margin + 2, y + 2.5 + i * (fontSize * 0.4));
    });
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'normal');
    y += h;
  };

  // ════════════════════════════════════════════════════════════
  // PAGE 1 – Cover page (sections 1-6)
  // ════════════════════════════════════════════════════════════
  currentPageSections = ['1', '2', '3', '4', '5', '6'];

  // Report title block
  filledRect(margin, y, W, 16, brandRed);
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

  sectionHeader('', 'AI Validation Check');
  textBlock(buildEicrValidationSummary(fd, circuitRows).join('\n'), 6.5);
  y += 1;

  const isSatisfactory = overallAssessment === 'SATISFACTORY';
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
  currentPageSections = ['7'];

  sectionHeader('7', 'OBSERVATIONS AND RECOMMENDATIONS FOR ACTIONS TO BE TAKEN');

  // Introductory text
  italicNote("Referring to the attached schedules of inspection and test results, and subject to the limitations specified on page 1 of this report under 'Extent of the Installation and Limitations of Inspection and Testing':");
  y += 1;

  // Height reserved below the table for the classification key + summary rows section.
  // Accounts for: spacing (2) + "or" note (5.4) + "following obs" note (5.4) +
  // spacing (2) + "one of the following codes" note (8) + key box (26) + 4 summary rows (24)
  const SECTION_K_BOTTOM_RESERVE = 75;
  const tableBottomAnchor = maxContentY - SECTION_K_BOTTOM_RESERVE;

  // Observation table — always rendered so it fills the page
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

  // Render actual observation rows
  observations.forEach((obs, idx) => {
    const codeClr: Record<string, [number,number,number]> = {
      C1: red, C2: orange, C3: charcoal, FI: purple
    };
    const clr = codeClr[obs.code] || charcoal;
    const descLines = pdf.splitTextToSize(ss(obs.description), obsColWidths.desc - 4);
    const h = Math.max(7, descLines.length * 3.2 + 3);
    checkPage(h);

    if (idx % 2 === 1) filledRect(margin, y, W, h, light);
    borderedRect(margin, y, W, h);
    vLine(margin + obsColWidths.num, y, h);
    vLine(margin + W - obsColWidths.code, y, h);
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'bold');
    text(obs.itemNumber || String(idx + 1), margin + obsColWidths.num / 2, y + h / 2 + 1.5, { align: 'center' });
    pdf.setFont('helvetica', 'normal');
    descLines.forEach((line: string, i: number) => {
      text(line, margin + obsColWidths.num + 2, y + 4 + i * 3.2);
    });
    // Code badge
    filledRect(margin + W - obsColWidths.code + 0.15, y + 0.15, obsColWidths.code - 0.3, h - 0.3, clr);
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    text(obs.code, margin + W - obsColWidths.code / 2, y + h / 2 + 1.5, { align: 'center' });
    pdf.setTextColor(0, 0, 0);
    y += h;
  });

  // Fill remaining table height with empty rows so the table reaches the classification key
  const emptyRowH = 7;
  while (y + emptyRowH <= tableBottomAnchor) {
    borderedRect(margin, y, W, emptyRowH);
    vLine(margin + obsColWidths.num, y, emptyRowH);
    vLine(margin + W - obsColWidths.code, y, emptyRowH);
    y += emptyRowH;
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
    { code: 'C3', label: 'Improvement\nrecommended', detail: '', clr: charcoal },
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
  const c1Items = observations.filter(o => o.code === 'C1').map((o) => o.itemNumber).join(', ') || 'N/A';
  const c2Items = observations.filter(o => o.code === 'C2').map((o) => o.itemNumber).join(', ') || 'N/A';
  const c3Items = observations.filter(o => o.code === 'C3').map((o) => o.itemNumber).join(', ') || 'N/A';
  const fiItems = observations.filter(o => o.code === 'FI').map((o) => o.itemNumber).join(', ') || 'N/A';

  row('Immediate remedial action required for items:', c1Items);
  row('Urgent remedial action required for items:', c2Items);
  row('Improvement recommended for items:', c3Items);
  row('Further investigation required for items:', fiItems);

  // Page 2 footer
  // ════════════════════════════════════════════════════════════
  // PAGE 3 – General condition, declaration, instruments, supply and particulars
  // ════════════════════════════════════════════════════════════
  newPage();
  currentPageSections = ['8', '9', '10', '11', '12'];

  // Section 8 – General condition
  sectionHeader('8', 'General Condition of the Installation');
  row('General condition of the installation (in terms of electrical safety):', ss(fd.generalCondition) || 'Adequate.');

  // Section 9 – Declaration
  sectionHeader('9', 'Declaration for the Inspection, Testing and Assessment');
  const declarationText =
    'I/We, being the person(s) responsible for the inspection and testing of the electrical installation (as indicated by my/our signatures below), particulars of which are described above, having exercised reasonable skill and care when carrying out the inspection and testing, hereby declare that the information in this report, including the observations and the attached schedules, provides an accurate assessment of the condition of the electrical installation taking into account the stated extent and limitations in section 4 of this report.';
  textBlock(declarationText, 6.2);

  const declarationTwoColRow = (leftLabel: string, leftValue: string, rightLabel: string, rightValue: string) => {
    const colW = W / 2;
    const labelW = colW * 0.52;
    const valueW = colW - labelW;

    pdf.setFontSize(6.5);
    pdf.setFont('helvetica', 'bold');
    const leftLabelLines = pdf.splitTextToSize(leftLabel, labelW - 4);
    const rightLabelLines = pdf.splitTextToSize(rightLabel, labelW - 4);

    pdf.setFont('helvetica', 'normal');
    const leftValueLines = pdf.splitTextToSize(ss(leftValue), valueW - 4);
    const rightValueLines = pdf.splitTextToSize(ss(rightValue), valueW - 4);

    const maxLines = Math.max(
      leftLabelLines.length,
      rightLabelLines.length,
      leftValueLines.length,
      rightValueLines.length
    );
    const h = Math.max(6.5, maxLines * 3.1 + 2.5);
    checkPage(h);

    const drawCell = (x0: number, labelLines: string[], valueLines: string[]) => {
      borderedRect(x0, y, colW, h);
      filledRect(x0 + 0.15, y + 0.15, labelW - 0.3, h - 0.3, light);

      pdf.setFontSize(6.5);
      pdf.setFont('helvetica', 'bold');
      const labelY = y + h / 2 + 1.5 - (labelLines.length > 1 ? (labelLines.length - 1) * 1.55 : 0);
      labelLines.forEach((line: string, i: number) => {
        text(line, x0 + 2, labelY + i * 3.1);
      });

      pdf.setFont('helvetica', 'normal');
      const valueY = y + h / 2 + 1.5 - (valueLines.length > 1 ? (valueLines.length - 1) * 1.55 : 0);
      valueLines.forEach((line: string, i: number) => {
        text(line, x0 + labelW + 2, valueY + i * 3.1);
      });
    };

    drawCell(margin, leftLabelLines, leftValueLines);
    drawCell(margin + colW, rightLabelLines, rightValueLines);
    y += h;
  };

  declarationTwoColRow('Trading Title:', ss(fd.tradingTitle) || companyName, 'Address:', ss(fd.companyAddress) || '');
  declarationTwoColRow('Registration Number (if applicable):', ss(fd.registrationNumber) || '', 'Telephone Number:', ss(fd.companyTelephone) || '');
  y += 0.5;
  subHeader('For the INSPECTION, TESTING AND ASSESSMENT of the report:');
  declarationTwoColRow('Name:', ss(certificate.inspectorName), 'Position:', ss(fd.inspectorPosition) || 'Qualified Supervisor');
  declarationTwoColRow('Signature:', '', 'Date:', formatDate(certificate.inspectionDate || null));

  // Test Instruments (Section 10)
  sectionHeader('10', 'Details of Test Instruments Used');
  italicNote('Details of test instruments used (state serial and/or asset numbers):');
  {
    // Two-column instrument grid matching the original report layout
    const halfW = W / 2;
    const labelW = 42;
    const valW = halfW - labelW;
    const rh = 4.4;

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
        pdf.setFontSize(6.1);
        pdf.setFont('helvetica', 'bold');
        text(cell.lbl, x0 + 2, y + rh / 2 + 1.2);
        pdf.setFont('helvetica', 'normal');
        text(cell.val, x0 + labelW + 2, y + rh / 2 + 1.2);
      });
      y += rh;
    });
  }

  // Section 11 – Supply Characteristics and Earthing Arrangements
  sectionHeader('11', 'Supply Characteristics and Earthing Arrangements at the Origin');

  // ── Three-panel side-by-side layout matching original report ──
  {
    const panelH = 46;
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
    filledRect(col1x + 0.15, panelY + 0.15, col1W - 0.3, 5.2, light);
    pdf.setFontSize(5.6);
    pdf.setFont('helvetica', 'bold');
    text('Earthing Arrangement', col1x + 2, panelY + 3.7);
    hLine(col1x, panelY + 5.5, col1W);

    const earthing = ss(fd.earthingArrangements) || 'TN-C-S';
    const earthTypes = ['TN-S', 'TN-C-S', 'TT'];
    let ey = panelY + 7;
    pdf.setFontSize(5.2);
    pdf.setFont('helvetica', 'normal');
    earthTypes.forEach((et) => {
      const checked = earthing.toUpperCase().replace(/-/g, '').includes(et.replace(/-/g, '').toUpperCase()) || earthing === et;
      text(checked ? '[X]' : '[  ]', col1x + 4, ey + 2.2);
      text(et, col1x + 12, ey + 2.2);
      ey += 3.1;
    });
    text('Other:', col1x + 4, ey + 2.2);
    text(earthTypes.some(et => earthing.includes(et)) ? '' : earthing, col1x + 16, ey + 2.2);
    ey += 3.4;

    hLine(col1x, ey, col1W);
    ey += 0.5;
    filledRect(col1x + 0.15, ey, col1W - 0.3, 4.5, light);
    pdf.setFont('helvetica', 'bold');
    text('Number and Type of Live Conductors', col1x + 2, ey + 3.2);
    ey += 5.2;

    const supply = ss(fd.natureOfSupply) || '1-phase (2 wire)';
    const supplyOpts = ['1-phase (2 wire)', '3-phase (3 wire)', '1-phase (3 wire)', '3-phase (4 wire)'];
    pdf.setFont('helvetica', 'normal');
    supplyOpts.forEach((st) => {
      const checked = supply.includes(st);
      text(checked ? '[X]' : '[  ]', col1x + 4, ey + 2.2);
      text(st + ':', col1x + 12, ey + 2.2);
      ey += 3.1;
    });

    // Confirmation of supply polarity at bottom of panel 1
    hLine(col1x, panelY + panelH - 5, col1W);
    pdf.setFontSize(5.1);
    pdf.setFont('helvetica', 'bold');
    text('Confirmation of supply polarity:', col1x + 2, panelY + panelH - 1.7);
    pdf.setFont('helvetica', 'normal');
    text(ss(fd.supplyPolarityConfirmed) || 'Yes', col1x + col1W - 15, panelY + panelH - 1.7);

    // ── PANEL 2: Nature of Supply Parameters ──
    filledRect(col2x + 0.15, panelY + 0.15, col2W - 0.3, 5.2, light);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(5.6);
    text('Supply Parameters', col2x + 2, panelY + 3.7);
    hLine(col2x, panelY + 5.5, col2W);

    const supplyParams = [
      { lbl: 'Nominal voltage(s): U:', val: `${ss(fd.nominalVoltageU) || '240'} V` },
      { lbl: 'Nominal voltage(s): Uo:', val: `${ss(fd.nominalVoltageUo) || '230'} V` },
      { lbl: 'Nominal frequency, f:', val: `${ss(fd.nominalFrequency) || '50'} Hz` },
      { lbl: 'Prospective fault current, Ipf:', val: ss(fd.prospectiveFaultCurrent) ? `${ss(fd.prospectiveFaultCurrent)} kA` : 'N/A' },
      { lbl: 'External earth fault loop impedance, Ze:', val: ss(fd.externalEarthFaultLoopImpedance) ? `${ss(fd.externalEarthFaultLoopImpedance)} ohms` : 'N/A' },
    ];

    let py = panelY + 7;
    pdf.setFontSize(5.1);
    supplyParams.forEach((sp) => {
      const lblW = col2W * 0.64;
      hLine(col2x, py + 4.1, col2W);
      pdf.setFont('helvetica', 'bold');
      text(sp.lbl, col2x + 2, py + 3.1);
      pdf.setFont('helvetica', 'normal');
      text(sp.val, col2x + lblW + 2, py + 3.1);
      py += 4.4;
    });

    // ── PANEL 3: Supply Protective Device ──
    filledRect(col3x + 0.15, panelY + 0.15, col3W - 0.3, 5.2, light);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(5.6);
    text("Distributor's Protective Device", col3x + 2, panelY + 3.7);
    hLine(col3x, panelY + 5.5, col3W);

    const deviceParams = [
      { lbl: 'BS(EN):', val: ss(fd.supplyProtectiveDeviceStandard) || '1361 Fuse HBC' },
      { lbl: 'Type:', val: ss(fd.supplyProtectiveDeviceType) || '' },
      { lbl: 'Rated current:', val: ss(fd.supplyProtectiveDeviceRating) ? `${ss(fd.supplyProtectiveDeviceRating)} A` : '' },
      { lbl: 'Short-circuit capacity:', val: ss(fd.shortCircuitCapacity) ? `${ss(fd.shortCircuitCapacity)} kA` : '' },
    ];

    let dy = panelY + 7;
    pdf.setFontSize(5.1);
    deviceParams.forEach((dp) => {
      const lblW = col3W * 0.5;
      hLine(col3x, dy + 4.1, col3W);
      pdf.setFont('helvetica', 'bold');
      text(dp.lbl, col3x + 2, dy + 3.1);
      pdf.setFont('helvetica', 'normal');
      text(dp.val, col3x + lblW + 2, dy + 3.1);
      dy += 4.4;
    });

    y = panelY + panelH;
  }

  // ════════════════════════════════════════════════════════════
  // Particulars of Installation (section J)
  // ════════════════════════════════════════════════════════════

  // Section 12 – Particulars of Installation Referred to in this Report
  sectionHeader('12', 'Particulars of Installation Referred to in this Report');

  // ── Row 1: Means of Earthing (full width) + electrode details ──
  {
    const meansDistributor = (ss(fd.meansOfEarthing) || '').toLowerCase().includes('distributor');
    const meansElectrode = (ss(fd.meansOfEarthing) || '').toLowerCase().includes('electrode');
    checkPage(7);
    borderedRect(margin, y, W, 6);
    filledRect(margin + 0.15, y + 0.15, W * 0.25, 5.7, light);
    pdf.setFontSize(5.6);
    pdf.setFont('helvetica', 'bold');
    text('Means of Earthing', margin + 2, y + 3.9);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(5.1);
    text(meansDistributor ? '[X]' : '[  ]', margin + W * 0.26, y + 3.9);
    text("Distributor's facility", margin + W * 0.30, y + 3.9);
    text(meansElectrode ? '[X]' : '[  ]', margin + W * 0.55, y + 3.9);
    text('Installation earth electrode', margin + W * 0.59, y + 3.9);
    y += 6;
  }

  // ── Row 2: Two-panel — Earth Electrode Details | Maximum Demand / Protective Measures ──
  {
    const halfW = W / 2;
    const panelH = 19;
    checkPage(panelH);
    const py = y;

    // Left panel: Earth Electrode Details
    borderedRect(margin, py, halfW, panelH);
    filledRect(margin + 0.15, py + 0.15, halfW - 0.3, 5, light);
    pdf.setFontSize(5.2);
    pdf.setFont('helvetica', 'bold');
    text('Earth Electrode Details (where applicable)', margin + 2, py + 3.6);
    hLine(margin, py + 5.2, halfW);

    const electrodeRows = [
      { lbl: 'Type:', val: ss(fd.earthElectrodeType) || 'N/A' },
      { lbl: 'Resistance to Earth:', val: ss(fd.earthElectrodeResistance) ? `${ss(fd.earthElectrodeResistance)} ohms` : 'N/A' },
      { lbl: 'Location:', val: ss(fd.earthElectrodeLocation) || 'N/A' },
    ];
    let ey = py + 6;
    electrodeRows.forEach((r) => {
      pdf.setFont('helvetica', 'bold');
      text(r.lbl, margin + 2, ey + 2.7);
      pdf.setFont('helvetica', 'normal');
      text(r.val, margin + halfW * 0.45, ey + 2.7);
      hLine(margin, ey + 4, halfW);
      ey += 4.2;
    });

    // Right panel: Max Demand + Protective Measures
    const rx = margin + halfW;
    borderedRect(rx, py, halfW, panelH);
    filledRect(rx + 0.15, py + 0.15, halfW - 0.3, 5, light);
    pdf.setFont('helvetica', 'bold');
    text('Maximum Demand / Protective Measures', rx + 2, py + 3.6);
    hLine(rx, py + 5.2, halfW);

    const demandRows = [
      { lbl: 'Maximum Demand (Load):', val: ss(fd.maximumDemand) || '100 Amps' },
      { lbl: 'Protective measure(s):', val: ss(fd.protectiveMeasures) || 'ADS' },
      { lbl: 'Method of measurement:', val: ss(fd.earthElectrodeMeasurementMethod) || 'N/A' },
    ];
    let dy = py + 6;
    demandRows.forEach((r) => {
      pdf.setFont('helvetica', 'bold');
      text(r.lbl, rx + 2, dy + 2.7);
      pdf.setFont('helvetica', 'normal');
      text(r.val, rx + halfW * 0.55, dy + 2.7);
      hLine(rx, dy + 4, halfW);
      dy += 4.2;
    });

    y = py + panelH;
  }

  // ── Row 3: Two-panel — Main Switch Details | RCD / Supply Conductors ──
  {
    const halfW = W / 2;
    const panelH = 34;
    checkPage(panelH);
    const py = y;

    // Left panel: Main Switch
    borderedRect(margin, py, halfW, panelH);
    filledRect(margin + 0.15, py + 0.15, halfW - 0.3, 5, light);
    pdf.setFontSize(5.2);
    pdf.setFont('helvetica', 'bold');
    text('Main Switch / Switch-Fuse / Circuit-Breaker / RCD', margin + 2, py + 3.6);
    hLine(margin, py + 5.2, halfW);

    const switchRows = [
      { lbl: 'Type BS(EN):', val: ss(fd.mainSwitchType) || ss(fd.mainSwitchBSEN) || '60947-3 Isolator' },
      { lbl: 'Number of poles:', val: ss(fd.mainSwitchPoles) || '2' },
      { lbl: 'Current rating:', val: ss(fd.mainSwitchCurrentRating) ? `${ss(fd.mainSwitchCurrentRating)} A` : '100 A' },
      { lbl: 'Fuse/device rating:', val: ss(fd.mainSwitchFuseRating) ? `${ss(fd.mainSwitchFuseRating)} A` : '100 A' },
      { lbl: 'Voltage rating:', val: ss(fd.mainSwitchVoltageRating) ? `${ss(fd.mainSwitchVoltageRating)} V` : '240 V' },
      { lbl: 'Supply conductors:', val: ss(fd.supplyConductorMaterial) || 'Copper' },
      { lbl: 'Supply conductors csa:', val: ss(fd.supplyConductorCSA) ? `${ss(fd.supplyConductorCSA)} mm\u00B2` : '25 mm\u00B2' },
    ];
    let sy = py + 6;
    switchRows.forEach((r) => {
      pdf.setFont('helvetica', 'bold');
      text(r.lbl, margin + 2, sy + 2.7);
      pdf.setFont('helvetica', 'normal');
      text(r.val, margin + halfW * 0.45, sy + 2.7);
      hLine(margin, sy + 4, halfW);
      sy += 4;
    });

    // Right panel: RCD details + If RCD main switch
    const rx = margin + halfW;
    borderedRect(rx, py, halfW, panelH);
    filledRect(rx + 0.15, py + 0.15, halfW - 0.3, 5, light);
    pdf.setFont('helvetica', 'bold');
    text('RCD Main Switch Details', rx + 2, py + 3.6);
    hLine(rx, py + 5.2, halfW);

    const rcdRows = [
      { lbl: 'Rated residual current (I\u0394n):', val: ss(fd.rcdRatedResidualCurrent) ? `${ss(fd.rcdRatedResidualCurrent)} mA` : 'N/A' },
      { lbl: 'Rated time delay:', val: ss(fd.rcdRatedTimeDelay) ? `${ss(fd.rcdRatedTimeDelay)} ms` : 'N/A' },
      { lbl: 'Measured operating time:', val: ss(fd.rcdMeasuredTime) ? `${ss(fd.rcdMeasuredTime)} ms` : 'N/A' },
    ];
    let ry = py + 6;
    rcdRows.forEach((r) => {
      pdf.setFont('helvetica', 'bold');
      text(r.lbl, rx + 2, ry + 2.7);
      pdf.setFont('helvetica', 'normal');
      text(r.val, rx + halfW * 0.6, ry + 2.7);
      hLine(rx, ry + 4, halfW);
      ry += 4;
    });

    // Sub-panel: Earthing conductor
    ry += 0.5;
    hLine(rx, ry, halfW);
    filledRect(rx + 0.15, ry + 0.15, halfW - 0.3, 4.4, light);
    pdf.setFont('helvetica', 'bold');
    text('Earthing Conductor', rx + 2, ry + 3.1);
    ry += 4.6;

    const ecRows = [
      { lbl: 'Material:', val: ss(fd.earthingConductorMaterial) || 'Copper' },
      { lbl: 'CSA:', val: ss(fd.earthingConductorCSA) ? `${ss(fd.earthingConductorCSA)} mm\u00B2` : '16 mm\u00B2' },
      { lbl: 'Verified:', val: ss(fd.earthingConductorVerified) || 'Yes' },
    ];
    ecRows.forEach((r) => {
      pdf.setFont('helvetica', 'bold');
      text(r.lbl, rx + 2, ry + 2.7);
      pdf.setFont('helvetica', 'normal');
      text(r.val, rx + halfW * 0.35, ry + 2.7);
      hLine(rx, ry + 4, halfW);
      ry += 4;
    });

    y = py + panelH;
  }

  // ── Row 4: Two-panel — Main Bonding Conductor | Bonding of Extraneous Parts ──
  {
    const halfW = W / 2;
    const panelH = 25;
    checkPage(panelH);
    const py = y;

    // Left panel: Main Bonding Conductor
    borderedRect(margin, py, halfW, panelH);
    filledRect(margin + 0.15, py + 0.15, halfW - 0.3, 5, light);
    pdf.setFontSize(5.2);
    pdf.setFont('helvetica', 'bold');
    text('Main Protective Bonding Conductor', margin + 2, py + 3.6);
    hLine(margin, py + 5.2, halfW);

    const bondRows = [
      { lbl: 'Material:', val: ss(fd.mainBondingMaterial) || 'Copper' },
      { lbl: 'CSA:', val: ss(fd.mainBondingCSA) ? `${ss(fd.mainBondingCSA)} mm\u00B2` : '10 mm\u00B2' },
      { lbl: 'Verified:', val: ss(fd.mainBondingVerified) || 'Yes' },
    ];
    let by = py + 6;
    bondRows.forEach((r) => {
      pdf.setFont('helvetica', 'bold');
      text(r.lbl, margin + 2, by + 2.7);
      pdf.setFont('helvetica', 'normal');
      text(r.val, margin + halfW * 0.35, by + 2.7);
      hLine(margin, by + 4, halfW);
      by += 4.2;
    });

    // Right panel: Bonding of extraneous-conductive parts
    const rx = margin + halfW;
    borderedRect(rx, py, halfW, panelH);
    filledRect(rx + 0.15, py + 0.15, halfW - 0.3, 5, light);
    pdf.setFont('helvetica', 'bold');
    text('Bonding to Extraneous-Conductive-Parts', rx + 2, py + 3.6);
    hLine(rx, py + 5.2, halfW);

    const bondParts = [
      { lbl: 'Water installation pipes:', val: ss(fd.bondingWater) || 'Yes' },
      { lbl: 'Gas installation pipes:', val: ss(fd.bondingGas) || 'Yes' },
      { lbl: 'Oil installation pipes:', val: ss(fd.bondingOil) || 'N/A' },
      { lbl: 'Lightning protection:', val: ss(fd.bondingLightning) || 'N/A' },
      { lbl: 'Structural steel:', val: ss(fd.bondingSteel) || 'N/A' },
    ];
    let bpy = py + 6;
    bondParts.forEach((r) => {
      pdf.setFont('helvetica', 'bold');
      text(r.lbl, rx + 2, bpy + 2.7);
      pdf.setFont('helvetica', 'normal');
      text(r.val, rx + halfW * 0.55, bpy + 2.7);
      hLine(rx, bpy + 4, halfW);
      bpy += 4;
    });

    y = py + panelH;
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

  // Get inspection data from formData (stored as JSON string via FormData.set)
  const inspData = inspectionData;

  // Render inspection schedule across pages
  const renderInspectionSchedule = () => {
    newPage();

    const scheduleTitle = 'INSPECTION SCHEDULE FOR DOMESTIC & SIMILAR PREMISES WITH UP TO 100A SUPPLY';
    let inspSectionNum = 13;
    currentPageSections = ['13'];

    // Section number for inspection
    sectionHeader(String(inspSectionNum), scheduleTitle);

    // Column widths for inspection table
    const refW = 11;
    const commentW = 22;
    const outcomeW = 15;
    const descW = W - refW - commentW - outcomeW;

    // Table header
    const drawTableHeader = () => {
      checkPage(7);
      filledRect(margin, y, W, 6, tableHeaderBg);
      borderedRect(margin, y, W, 6);
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(6);
      pdf.setFont('helvetica', 'bold');
      text('Item', margin + 2, y + 4.2);
      text('Description', margin + refW + 2, y + 4.2);
      text('Comments', margin + refW + descW + 2, y + 4.2);
      text('Outcome', margin + W - outcomeW + 1.5, y + 4.2);
      pdf.setTextColor(0, 0, 0);
      y += 6;
    };

    const startInspectionSchedulePage = () => {
      inspSectionNum++;
      newPage();
      currentPageSections = [String(inspSectionNum)];
      sectionHeader(String(inspSectionNum), scheduleTitle);
      drawTableHeader();
    };

    drawTableHeader();

    inspectionSchedule.forEach((section) => {
      const forceSectionBreak =
        (section.section === '5.0' && inspSectionNum === 13) ||
        (section.section === '6.0' && inspSectionNum === 14);

      if (forceSectionBreak) {
        startInspectionSchedulePage();
      }

      // Section row
      pdf.setFontSize(5.4);
      pdf.setFont('helvetica', 'bold');
      const titleLines = pdf.splitTextToSize(section.title, descW - 2);
      const sectionH = Math.max(5.2, titleLines.length * 2.2 + 1.8);
      if (y + sectionH > maxContentY) {
        startInspectionSchedulePage();
      }
      filledRect(margin, y, W, sectionH, light);
      borderedRect(margin, y, W, sectionH);
      const sectionLabel = section.items.length === 0
        ? `${section.section}  ${section.title}`
        : `${section.section}`;
      text(sectionLabel, margin + 2, y + 4);
      if (section.items.length > 0) {
        titleLines.forEach((tLine: string, i: number) => {
          text(tLine, margin + refW + 2, y + 3.6 + i * 2.2);
        });
      }
      // section outcome if no items
      if (section.items.length === 0) {
        let sectionOutcome: string;
        if (section.section in inspData) {
          // User has explicitly set this section - use their value
          const secData = inspData[section.section];
          sectionOutcome = secData?.outcome || '';
        } else {
          // No user data - default to N/A
          sectionOutcome = 'N/A';
        }
        pdf.setFont('helvetica', 'normal');
        text(sectionOutcome, margin + W - outcomeW / 2, y + sectionH / 2 + 1, { align: 'center' });
      }
      y += sectionH;

      section.items.forEach((item) => {
        const itemData = inspData[item.ref] || {};
        const comment = ss(itemData.comment || item.comment || '');
        // Check if there's data from the user (the key exists in inspData)
        let outcome: string;
        if (item.ref in inspData) {
          // User has explicitly set this item - use their value
          outcome = itemData.outcome || '';
        } else {
          // No user data - use fallback
          outcome = item.outcome || (item.desc ? '\u2713' : 'N/A');
        }

        pdf.setFont('helvetica', 'normal');
        const descLines = pdf.splitTextToSize(item.desc || 'N/A', descW - 3);
        const commentLines = comment ? pdf.splitTextToSize(comment, commentW - 3) : [''];
        const rowH = Math.max(4.8, Math.max(descLines.length, commentLines.length) * 2.15 + 1.6);

        if (y + rowH > maxContentY) {
          startInspectionSchedulePage();
        }

        if ((Number(item.ref.replace(/[^0-9]/g, '')) || 0) % 2 === 0) {
          filledRect(margin, y, W, rowH, white);
        } else {
          filledRect(margin, y, W, rowH, [250, 250, 250]);
        }
        borderedRect(margin, y, W, rowH);
        vLine(margin + refW, y, rowH);
        vLine(margin + refW + descW, y, rowH);
        vLine(margin + W - outcomeW, y, rowH);

        pdf.setFontSize(5.2);
        text(item.ref, margin + 2, y + rowH / 2 + 0.9);
        descLines.forEach((dLine: string, i: number) => {
          text(dLine, margin + refW + 1.5, y + 3 + i * 2.15);
        });
        commentLines.forEach((cLine: string, i: number) => {
          text(cLine, margin + refW + descW + 1.5, y + 3 + i * 2.15);
        });

        // Outcome - use tick mark for acceptable
        if (outcome === '✓' || outcome === '\u2713' || outcome === 'TICK') {
          pdf.setFont('ZapfDingbats');
          text('4', margin + W - outcomeW / 2, y + rowH / 2 + 0.9, { align: 'center' });
        } else {
          pdf.setFont('helvetica', 'bold');
          text(outcome, margin + W - outcomeW / 2, y + rowH / 2 + 0.9, { align: 'center' });
        }
        pdf.setFont('helvetica', 'normal');

        y += rowH;
      });
    });

    // Outcomes legend
    addOutcomesLegend();
  };

  const addOutcomesLegend = () => {
    y += 1.5;
    const legendText = '✓ Acceptable   C1 Danger present   C2 Potentially dangerous   C3 Improvement recommended   FI Further investigation   NV Not verified   LIM Limitation   N/A Not applicable';
    pdf.setFontSize(5.2);
    const legendLines = pdf.splitTextToSize(legendText, W - 26);
    const legendH = Math.max(6.5, legendLines.length * 2.2 + 2);
    if (y + legendH > maxContentY) {
      return;
    }
    filledRect(margin, y, W, legendH, light);
    borderedRect(margin, y, W, legendH);
    pdf.setFontSize(5.2);
    pdf.setFont('helvetica', 'bold');
    text('OUTCOME CODES', margin + 2, y + 4);
    pdf.setFont('helvetica', 'normal');
    legendLines.forEach((line: string, i: number) => {
      text(line, margin + 24, y + 4 + i * 2.2);
    });
    y += legendH;
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
    pdf.setTextColor(brandRed[0], brandRed[1], brandRed[2]);
    text(companyName, lsPageW - margin, footerY, { align: 'right' });
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(6);
    text(companyEmail, lsPageW - margin, footerY + 4, { align: 'right' });
    pdf.setTextColor(0, 0, 0);
  };

  // ── Section title bar ──
  filledRect(margin, y, lsW, 8, brandRed);
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
  const circuits = Array.isArray(circuitRows) ? circuitRows : [];

  // Column definitions matching BS 7671 Appendix 6 model form (NICEIC layout)
  // group    = tier-1 merged header label
  // subgroup = tier-2 merged sub-header label (only for Circuit impedances section)
  // rotate   = render individual label rotated 90°
  const cols = [
    { label: 'Circuit\nnumber',                          w: 8,  group: '',                            subgroup: '' },
    { label: 'Circuit\ndesignation',                     w: 24, group: '',                            subgroup: '' },
    { label: 'Type of\nwiring',                          w: 8,  group: '',                            subgroup: '' },
    { label: 'Ref.\nmethod',                             w: 7,  group: '',                            subgroup: '' },
    { label: 'No. of\npoints\nserved',                   w: 7,  group: '',                            subgroup: '' },
    { label: 'Live\n(mm\u00B2)',                         w: 7,  group: 'Circuit conductors: csa',     subgroup: '', rotate: true },
    { label: 'cpc\n(mm\u00B2)',                          w: 7,  group: 'Circuit conductors: csa',     subgroup: '', rotate: true },
    { label: 'Max disc.\ntime (s)',                       w: 7,  group: '',                            subgroup: '', rotate: true },
    { label: 'BS(EN)',                                   w: 10, group: 'Overcurrent protective devices', subgroup: '', rotate: true },
    { label: 'Type\nNo',                                 w: 7,  group: 'Overcurrent protective devices', subgroup: '', rotate: true },
    { label: 'Rating\n(A)',                              w: 7,  group: 'Overcurrent protective devices', subgroup: '', rotate: true },
    { label: 'Cap.\n(kA)',                               w: 7,  group: 'Overcurrent protective devices', subgroup: '', rotate: true },
    { label: 'Operating\ncurrent\nI\u0394n (mA)',        w: 7,  group: 'RCD',                         subgroup: '', rotate: true },
    { label: 'Max Zs\nperm.\n\u03A9',                   w: 8,  group: '',                            subgroup: '', rotate: true },
    { label: 'r1\n(Line)',                               w: 8,  group: 'Circuit impedances (Ohms)',   subgroup: 'Ring final circuits only\n(measured end to end)', rotate: true },
    { label: 'rn\n(Neutral)',                            w: 8,  group: 'Circuit impedances (Ohms)',   subgroup: 'Ring final circuits only\n(measured end to end)', rotate: true },
    { label: 'r2\n(cpc)',                                w: 8,  group: 'Circuit impedances (Ohms)',   subgroup: 'Ring final circuits only\n(measured end to end)', rotate: true },
    { label: 'R1+R2\n\u03A9',                           w: 9,  group: 'Circuit impedances (Ohms)',   subgroup: 'All circuits', rotate: true },
    { label: 'R2\n\u03A9',                               w: 8,  group: 'Circuit impedances (Ohms)',   subgroup: 'All circuits', rotate: true },
    { label: 'Live-Live\nM\u03A9',                      w: 9,  group: 'Insulation resistance',       subgroup: '', rotate: true },
    { label: 'Live-Earth\nM\u03A9',                     w: 9,  group: 'Insulation resistance',       subgroup: '', rotate: true },
    { label: 'Test\nvoltage (V)',                        w: 7,  group: 'Insulation resistance',       subgroup: '', rotate: true },
    { label: 'Polarity',                                 w: 6,  group: '',                            subgroup: '' },
    { label: 'Max Zs\nmeasured\n\u03A9',                 w: 9,  group: '',                            subgroup: '', rotate: true },
    { label: 'Disc.\ntime (ms)',                         w: 8,  group: 'RCD',                         subgroup: '', rotate: true },
    { label: 'Test btn',                        w: 7,  group: 'RCD',                         subgroup: '', rotate: true },
    { label: 'AFDD\ntest btn',                  w: 7,  group: 'AFDD',                        subgroup: '', rotate: true },
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

  // ── Draw the 3-tier table header (matches BS 7671 Appendix 6 / NICEIC layout) ──
  //   tier 1: group labels (Circuit conductors: csa, Overcurrent…, RCD, Circuit impedances, Insulation…)
  //   tier 2: sub-group labels (Ring final circuits only | All circuits) – only for Circuit impedances
  //   tier 3: individual rotated column labels
  const drawTableHeader = (atY: number) => {
    const t1H = 4.5;   // tier-1 height (group labels)
    const t2H = 5;     // tier-2 height (sub-group labels)
    const t3H = 18;    // tier-3 height (individual labels, rotated)
    const totalHeaderH = t1H + t2H + t3H;

    // ── Background ──
    filledRect(margin, atY, lsW, totalHeaderH, tableHeaderBg);

    // ── Build contiguous tier-1 groups (same .group value) ──
    const t1Groups: Array<{ label: string; x1: number; x2: number }> = [];
    {
      let prev = '';
      cols.forEach((c, i) => {
        const cp = colPositions[i];
        if (c.group && c.group === prev) {
          t1Groups[t1Groups.length - 1].x2 = cp.x + cp.w;
        } else if (c.group) {
          t1Groups.push({ label: c.group, x1: cp.x, x2: cp.x + cp.w });
        }
        prev = c.group;
      });
    }

    // ── Build contiguous tier-2 sub-groups (same .subgroup within same .group) ──
    const t2Groups: Array<{ label: string; x1: number; x2: number }> = [];
    {
      let prevKey = '';
      cols.forEach((c, i) => {
        const cp = colPositions[i];
        const key = c.subgroup ? `${c.group}::${c.subgroup}` : '';
        if (key && key === prevKey) {
          t2Groups[t2Groups.length - 1].x2 = cp.x + cp.w;
        } else if (key) {
          t2Groups.push({ label: c.subgroup, x1: cp.x, x2: cp.x + cp.w });
        }
        prevKey = key;
      });
    }

    // ── Horizontal tier separators (only drawn within grouped column spans) ──
    pdf.setDrawColor(borderGrey[0], borderGrey[1], borderGrey[2]);
    pdf.setLineWidth(0.3);
    t1Groups.forEach((g) => {
      pdf.line(g.x1, atY + t1H,        g.x2, atY + t1H);         // tier1 / tier2 separator
      pdf.line(g.x1, atY + t1H + t2H,  g.x2, atY + t1H + t2H);  // tier2 / tier3 separator
    });

    // ── Tier-1: group labels ──
    pdf.setFontSize(4.6);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.setCharSpace(0.1);
    t1Groups.forEach((g) => {
      const spanW = g.x2 - g.x1;
      const lines = pdf.splitTextToSize(g.label, spanW - 1.5);
      const blockH = lines.length * 2.3;
      const startY = atY + (t1H - blockH) / 2 + 2;
      lines.forEach((line: string, i: number) => {
        text(line, g.x1 + spanW / 2, startY + i * 2.3, { align: 'center' });
      });
    });
    pdf.setCharSpace(0);

    // ── Tier-2: sub-group labels ──
    pdf.setFontSize(4.1);
    pdf.setFont('helvetica', 'bold');
    pdf.setCharSpace(0.1);
    t2Groups.forEach((g) => {
      const spanW = g.x2 - g.x1;
      const lines = pdf.splitTextToSize(g.label, spanW - 1.5);
      const blockH = lines.length * 2.1;
      const startY = atY + t1H + (t2H - blockH) / 2 + 2;
      lines.forEach((line: string, i: number) => {
        text(line, g.x1 + spanW / 2, startY + i * 2.1, { align: 'center' });
      });
    });
    pdf.setCharSpace(0);

    // ── Tier-3: individual column labels + vertical dividers ──
    pdf.setFontSize(4.5);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);

    cols.forEach((c, i) => {
      const cp = colPositions[i];

      // ── Vertical dividers ──
      if (i > 0) {
        const prev = cols[i - 1];
        const sameGroup    = !!c.group && c.group === prev.group;
        const sameSub      = sameGroup && (c.subgroup ?? '') === (prev.subgroup ?? '');
        // Divider starts lower the more "inside" the column is
        const vTop = sameGroup ? (sameSub ? atY + t1H + t2H : atY + t1H) : atY;
        pdf.setDrawColor(borderGrey[0], borderGrey[1], borderGrey[2]);
        pdf.setLineWidth(0.3);
        pdf.line(cp.x, vTop, cp.x, atY + totalHeaderH);
      }

      // ── Column label ──
      pdf.setFont('helvetica', 'bold');
      if (!c.rotate) {
        // Ungrouped horizontal columns: label centered in full header height
        const lines = pdf.splitTextToSize(c.label, cp.w - 1.5);
        const blockH = lines.length * 2.3;
        const startY = atY + (totalHeaderH - blockH) / 2 + 2;
        lines.forEach((line: string, li: number) => {
          text(line, cp.x + cp.w / 2, startY + li * 2.3, { align: 'center' });
        });
      } else {
        // Rotated 90° – each \n-delimited segment is a separate visual "row"
        // stacked left→right within the column (advancing in page-X).
        // lineSpacing is capped so all rows always fit within cp.w.
        const labelLines = c.label.split('\n');
        const numLines = labelLines.length;
        const charHeightMm = 4.5 * 0.352778; // ~1.59mm at 4.5pt
        const lineSpacing = numLines <= 1
          ? 0
          : Math.min(2.4, (cp.w - charHeightMm - 0.5) / (numLines - 1));
        const totalBlockW = (numLines - 1) * lineSpacing + charHeightMm;
        const firstLineX = cp.x + (cp.w - totalBlockW) / 2 + charHeightMm / 2;

        labelLines.forEach((line, lineIdx) => {
          const lineX = firstLineX + lineIdx * lineSpacing;
          // Start at the bottom of the header and render upward
          let curY = atY + totalHeaderH - 1.5;

          // Handle Δ/Ω special characters requiring font switching
          const parts = line.split(/([ΔΩ])/);
          parts.forEach((part) => {
            if (part === 'Δ') {
              pdf.setFont('symbol', 'normal');
              pdf.text('D', lineX, curY, { angle: 90 });
              curY -= pdf.getTextWidth('D');
            } else if (part === 'Ω') {
              pdf.setFont('symbol', 'normal');
              pdf.text('W', lineX, curY, { angle: 90 });
              curY -= pdf.getTextWidth('W');
            } else if (part.length > 0) {
              pdf.setFont('helvetica', 'bold');
              pdf.text(part, lineX, curY, { angle: 90 });
              curY -= pdf.getTextWidth(part);
            }
          });
        });
        pdf.setFont('helvetica', 'normal');
      }
    });
    pdf.setCharSpace(0);

    // ── Outer border (drawn last, on top) ──
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
      filledRect(margin, rowY, lsW, rowH, light);
    }

    // Outer row border
    pdf.setDrawColor(borderGrey[0], borderGrey[1], borderGrey[2]);
    pdf.setLineWidth(0.3);
    pdf.rect(margin, rowY, lsW, rowH);

    // Cell text and vertical dividers
    pdf.setFontSize(5);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(0, 0, 0);

    // Extract deviceType (col 9), rating (col 10), measuredZs (col 24)
    const deviceType = values[9]?.trim() || '';
    const rating = values[10]?.trim().replace(/A/i, '') || '';
    const measuredZsRaw = values[23]?.trim() || '';
    const maxZsComputed = calculateMaxZs(deviceType, rating);
    const measuredZsNum = parseFloat(measuredZsRaw.replace(/[ΩΩ]|ohms/i, '')) || 0;
    const maxZsNum = parseFloat(maxZsComputed.replace(/Ω|ohms/i, '')) || Infinity;
    const zsPass = measuredZsNum > 0 && measuredZsNum <= maxZsNum;

    values.forEach((val, ci) => {
      const cp = colPositions[ci];

      // Vertical cell border
      if (ci > 0) {
        pdf.setDrawColor(borderGrey[0], borderGrey[1], borderGrey[2]);
        pdf.setLineWidth(0.2);
        pdf.line(cp.x, rowY, cp.x, rowY + rowH);
      }

      let cellColor: [number,number,number] | null = null;

      // ZS FAIL highlighting: measuredZs column (23) — only highlight if it exceeds the limit
      if (ci === 23 && measuredZsRaw && !zsPass) {
        cellColor = red;
      }

      // Background fill for ZS cell
      if (cellColor) {
        filledRect(cp.x + 0.5, rowY + 0.5, cp.w - 1, rowH - 1, cellColor);
        pdf.setTextColor(255, 255, 255);  // white text on colored bg
        pdf.setFont('helvetica', 'bold');
      } else {
        pdf.setTextColor(0, 0, 0);
        pdf.setFont('helvetica', 'normal');
      }

      // Cell text - center-align numeric values, left-align text
      const isText = ci === 1; // designation column
      if (isText) {
        // Left-align designation (may be long)
        const truncated = val.length > 18 ? val.substring(0, 17) + '\u2026' : val;
        text(truncated, cp.x + 1.5, rowY + rowH / 2 + 1.2);
      } else {
        // Center-align all other values
        text(ss(val), cp.x + cp.w / 2, rowY + rowH / 2 + 1.2, { align: 'center' });
      }

      // Restore normal styling after ZS cell
      pdf.setTextColor(0, 0, 0);
      pdf.setFont('helvetica', 'normal');
    });

    pdf.setDrawColor(0, 0, 0);
  };

  // ── Render data rows ──
  const dataRowH = 6;
  const minRows = 15; // Show at least 15 rows (empty ones if no data) like the original

  const getWiringCode = (typeStr: string): string => {
    if (!typeStr) return '';
    const s = typeStr.toLowerCase();
    if (s.length === 1 && 'ABCDEFGHOT'.includes(typeStr.toUpperCase())) return typeStr.toUpperCase();
    if (s.includes('mineral')) return 'H';
    if ((s.includes('thermosetting') || s.includes('xlpe')) && s.includes('swa')) return 'G';
    if ((s.includes('thermoplastic') || s.includes('pvc')) && s.includes('swa')) return 'F';
    if ((s.includes('thermoplastic') || s.includes('pvc')) && (s.includes('nonmetallic trunking') || s.includes('non-metallic trunking'))) return 'E';
    if ((s.includes('thermoplastic') || s.includes('pvc')) && s.includes('metallic trunking')) return 'D';
    if ((s.includes('thermoplastic') || s.includes('pvc')) && (s.includes('nonmetallic conduit') || s.includes('non-metallic conduit'))) return 'C';
    if ((s.includes('thermoplastic') || s.includes('pvc')) && s.includes('metallic conduit')) return 'B';
    if (s.includes('thermoplastic') || s.includes('pvc') || s.includes('twin') || s.includes('t&e')) return 'A';
    return String(typeStr).charAt(0).toUpperCase(); // Best effort if not matched exactly
  };

  const circuitValues = (circuit: Record<string, any>, idx: number): string[] => [
    ss(circuit.circuitNumber) || String(idx + 1),
    ss(circuit.designation) || '',
    getWiringCode(ss(circuit.wiringType)),
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
    ss(circuit.r1Line) || '',            // ring final circuits only: r1 (Line)
    ss(circuit.rnNeutral) || '',         // ring final circuits only: rn (Neutral)
    ss(circuit.r2Cpc) || '',             // ring final circuits only: r2 (cpc)
    ss(circuit.r1r2) || '',              // all circuits: R1+R2
    ss(circuit.r2) || '',                // all circuits: R2
    ss(circuit.insResLL) || '',
    ss(circuit.insResLE) || '',
    ss(circuit.testVoltage) || '',
    ss(circuit.polarity) || '',
    ss(circuit.measuredZs) || '',
    ss(circuit.discTime) || '',
    ss(circuit.rcdTestButton) || '',
    ss(circuit.afddTestButton) || '',    // AFDD test button
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
    filledRect(margin, y, lsW, 6, tableHeaderBg);
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
  // PAGE 8 – Guidance for Recipients (back to portrait, appendix)
  // ════════════════════════════════════════════════════════════
  pdf.addPage('a4', 'p'); // explicit portrait after landscape page
  currentPage++;
  y = margin;
  currentPageSections = []; // guidance page is an appendix – no section tabs, no page counter

  // Title
  filledRect(margin, y, W, 10, brandRed);
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  text('DOMESTIC ELECTRICAL INSTALLATION CONDITION REPORT', pageWidth / 2, y + 7, { align: 'center' });
  pdf.setTextColor(0, 0, 0);
  y += 12;

  filledRect(margin, y, W, 8, tableHeaderBg);
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

  addPageFooter(false); // guidance page is an appendix – no page numbering

  return new Uint8Array(pdf.output('arraybuffer'));
}
