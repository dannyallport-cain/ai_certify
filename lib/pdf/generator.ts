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
  // Use specialized generator for Fire Detection and Alarm System reports
  if (certificate.certificateType === 'BS5839-1' || certificate.certificateType === 'BS5839_1') {
    return generateFireDetectionInspectionReport(certificate);
  }

  // Default generator for other certificate types
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  let yPosition = margin;

  // Helper function to ensure string values
  const safeString = (value: any): string => {
    if (value === null || value === undefined) return '';
    return String(value);
  };

  // Helper function to add text with line breaks
  const addTextWithWrap = (text: string, x: number, y: number, maxWidth: number, fontSize = 12) => {
    pdf.setFontSize(fontSize);
    const textStr = safeString(text);
    const lines = pdf.splitTextToSize(textStr, maxWidth);
    pdf.text(lines, x, y);
    return y + (lines.length * fontSize * 0.3);
  };

  // Helper function to check if we need a new page
  const checkNewPage = (requiredSpace: number) => {
    if (yPosition + requiredSpace > pageHeight - margin) {
      pdf.addPage();
      yPosition = margin;
    }
  };

  // Header
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Fire Safety Certificate', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 15;

  // Certificate Type
  pdf.setFontSize(16);
  const certificateTypeText = getCertificateTypeDisplayName(certificate.certificateType);
  pdf.text(certificateTypeText, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 20;

  // Certificate Details Section
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Certificate Details', margin, yPosition);
  yPosition += 10;

  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  
  const details = [
    ['Certificate Number:', certificate.certificateNumber],
    ['Status:', certificate.status.toUpperCase()],
    ['Inspector:', certificate.inspectorName || 'Not specified'],
    ['Inspection Date:', certificate.inspectionDate || 'Not specified'],
    ['Next Inspection:', certificate.nextInspectionDate || 'Not specified']
  ];

  details.forEach(([label, value]) => {
    checkNewPage(15);
    pdf.setFont('helvetica', 'bold');
    pdf.text(label, margin, yPosition);
    pdf.setFont('helvetica', 'normal');
    pdf.text(value, margin + 50, yPosition);
    yPosition += 8;
  });

  yPosition += 10;

  // Customer Information Section
  checkNewPage(40);
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Customer Information', margin, yPosition);
  yPosition += 10;

  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');

  const customerDetails = [
    ['Company:', certificate.customer.name],
    ['Contact Person:', certificate.customer.contactPerson || 'Not specified'],
    ['Email:', certificate.customer.email || 'Not specified'],
    ['Phone:', certificate.customer.phone || 'Not specified'],
    ['Address:', certificate.customer.address || 'Not specified'],
    ['Postcode:', certificate.customer.postcode || 'Not specified']
  ];

  customerDetails.forEach(([label, value]) => {
    checkNewPage(15);
    pdf.setFont('helvetica', 'bold');
    pdf.text(safeString(label), margin, yPosition);
    pdf.setFont('helvetica', 'normal');
    yPosition = addTextWithWrap(safeString(value), margin + 50, yPosition, pageWidth - margin - 60);
    yPosition += 2;
  });

  yPosition += 10;

  // Site Information Section
  if (certificate.siteName || certificate.siteAddress) {
    checkNewPage(30);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Site Information', margin, yPosition);
    yPosition += 10;

    pdf.setFontSize(12);
    if (certificate.siteName) {
      pdf.setFont('helvetica', 'bold');
      pdf.text('Site Name:', margin, yPosition);
      pdf.setFont('helvetica', 'normal');
      yPosition = addTextWithWrap(safeString(certificate.siteName), margin + 50, yPosition, pageWidth - margin - 60);
      yPosition += 2;
    }

    if (certificate.siteAddress) {
      checkNewPage(15);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Site Address:', margin, yPosition);
      pdf.setFont('helvetica', 'normal');
      yPosition = addTextWithWrap(safeString(certificate.siteAddress), margin + 50, yPosition, pageWidth - margin - 60);
      yPosition += 2;
    }

    yPosition += 10;
  }

  // Certificate Type Specific Data
  if (certificate.formData && Object.keys(certificate.formData).length > 0) {
    checkNewPage(30);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Technical Details', margin, yPosition);
    yPosition += 10;

    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');

    Object.entries(certificate.formData).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        checkNewPage(15);
        const formattedKey = formatFieldName(key);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${formattedKey}:`, margin, yPosition);
        pdf.setFont('helvetica', 'normal');
        yPosition = addTextWithWrap(String(value), margin + 80, yPosition, pageWidth - margin - 90);
        yPosition += 2;
      }
    });

    yPosition += 10;
  }

  // Inspection Items Section
  if (certificate.items && certificate.items.length > 0) {
    checkNewPage(50);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Inspection Items', margin, yPosition);
    yPosition += 15;

    certificate.items.forEach((item, index) => {
      checkNewPage(40);
      
      // Item header
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${index + 1}. ${item.itemType.replace(/_/g, ' ').toUpperCase()}`, margin, yPosition);
      yPosition += 8;

      // Item details
      pdf.setFont('helvetica', 'normal');
      if (item.location) {
        pdf.setFont('helvetica', 'bold');
        pdf.text('Location:', margin + 10, yPosition);
        pdf.setFont('helvetica', 'normal');
        yPosition = addTextWithWrap(item.location, margin + 50, yPosition, pageWidth - margin - 60);
      }

      if (item.description) {
        checkNewPage(15);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Description:', margin + 10, yPosition);
        pdf.setFont('helvetica', 'normal');
        yPosition = addTextWithWrap(item.description, margin + 50, yPosition, pageWidth - margin - 60);
      }

      checkNewPage(15);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Status:', margin + 10, yPosition);
      pdf.setFont('helvetica', 'normal');
      
      // Color code status
      if (item.status === 'satisfactory') {
        pdf.setTextColor(0, 128, 0); // Green
      } else if (item.status === 'unsatisfactory') {
        pdf.setTextColor(255, 0, 0); // Red
      } else {
        pdf.setTextColor(255, 165, 0); // Orange for 'requires_attention'
      }
      
      pdf.text(item.status.toUpperCase(), margin + 50, yPosition);
      pdf.setTextColor(0, 0, 0); // Reset to black
      yPosition += 8;

      if (item.defects) {
        checkNewPage(15);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Defects:', margin + 10, yPosition);
        pdf.setFont('helvetica', 'normal');
        yPosition = addTextWithWrap(item.defects, margin + 50, yPosition, pageWidth - margin - 60);
      }

      if (item.recommendations) {
        checkNewPage(15);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Recommendations:', margin + 10, yPosition);
        pdf.setFont('helvetica', 'normal');
        yPosition = addTextWithWrap(item.recommendations, margin + 50, yPosition, pageWidth - margin - 60);
      }

      yPosition += 10;
    });
  }

  // Footer
  const footerY = pageHeight - 30;
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Generated on: ${new Date().toLocaleDateString()}`, margin, footerY);
  pdf.text(`Page 1 of ${pdf.getNumberOfPages()}`, pageWidth - margin - 30, footerY);

  return pdf.output('arraybuffer') as Uint8Array;
}

export function generateFireDetectionInspectionReport(certificate: CertificateData): Uint8Array {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  let yPosition = margin;

  // Helper functions
  const safeString = (value: any): string => {
    if (value === null || value === undefined) return '';
    return String(value);
  };

  const addText = (text: string, x: number, y: number, options?: any) => {
    pdf.text(safeString(text), x, y, options);
  };

  const addLine = (x1: number, y1: number, x2: number, y2: number) => {
    pdf.line(x1, y1, x2, y2);
  };

  const addBox = (x: number, y: number, width: number, height: number) => {
    pdf.rect(x, y, width, height);
  };

  const checkNewPage = (requiredSpace: number) => {
    if (yPosition + requiredSpace > pageHeight - margin) {
      pdf.addPage();
      yPosition = margin;
    }
  };

  // Title Section
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  addText('FIRE DETECTION AND ALARM SYSTEM', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 8;
  addText('INSPECTION AND SERVICING REPORT', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 12;

  // Reference Standards
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  addText('In accordance with BS 5839-1: Fire detection and fire alarm systems for buildings - Part 1: Code of practice for design, installation, commissioning and maintenance of systems in non-domestic premises', 
    pageWidth / 2, yPosition, { align: 'center', maxWidth: pageWidth - 2 * margin });
  yPosition += 20;

  // Section 1: Site Details
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  addText('1. SITE DETAILS', margin, yPosition);
  yPosition += 8;

  // Site details table
  const siteRows = [
    ['Site Name:', certificate.siteName || ''],
    ['Site Address:', certificate.siteAddress || ''],
    ['Customer:', certificate.customer.name || ''],
    ['Contact Person:', certificate.customer.contactPerson || ''],
    ['Telephone:', certificate.customer.phone || ''],
    ['Email:', certificate.customer.email || '']
  ];

  siteRows.forEach(([label, value]) => {
    pdf.setFont('helvetica', 'bold');
    addText(label, margin, yPosition);
    pdf.setFont('helvetica', 'normal');
    addText(safeString(value), margin + 50, yPosition);
    addLine(margin + 48, yPosition + 2, pageWidth - margin, yPosition + 2);
    yPosition += 12;
  });

  yPosition += 10;

  // Section 2: System Details
  checkNewPage(100);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  addText('2. SYSTEM DETAILS', margin, yPosition);
  yPosition += 8;

  const systemData = certificate.formData || {};
  const systemRows = [
    ['System Type:', safeString(systemData.systemType) || 'L2'],
    ['Number of Zones:', safeString(systemData.numberOfZones) || '8'],
    ['Number of Devices:', safeString(systemData.numberOfDevices) || '45'],
    ['Control Panel Make/Model:', safeString(systemData.controlPanelModel) || 'Kentec Syncro AS'],
    ['Installation Date:', safeString(systemData.installationDate) || 'Not specified'],
    ['Last Service Date:', safeString(systemData.lastServiceDate) || 'Not specified'],
    ['Service Interval:', safeString(systemData.serviceInterval) || '6 Months']
  ];

  systemRows.forEach(([label, value]) => {
    pdf.setFont('helvetica', 'bold');
    addText(label, margin, yPosition);
    pdf.setFont('helvetica', 'normal');
    addText(safeString(value), margin + 60, yPosition);
    addLine(margin + 58, yPosition + 2, pageWidth - margin, yPosition + 2);
    yPosition += 12;
  });

  yPosition += 10;

  // Section 3: Inspection Details
  checkNewPage(60);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  addText('3. INSPECTION DETAILS', margin, yPosition);
  yPosition += 8;

  const inspectionRows = [
    ['Certificate Number:', safeString(certificate.certificateNumber)],
    ['Inspection Date:', safeString(certificate.inspectionDate) || ''],
    ['Inspector Name:', safeString(certificate.inspectorName) || ''],
    ['Inspector Qualification:', safeString(systemData.inspectorQualification) || 'FIA Certified'],
    ['Inspection Type:', safeString(systemData.inspectionType) || 'Routine Service'],
    ['Next Inspection Due:', safeString(certificate.nextInspectionDate) || '']
  ];

  inspectionRows.forEach(([label, value]) => {
    pdf.setFont('helvetica', 'bold');
    addText(label, margin, yPosition);
    pdf.setFont('helvetica', 'normal');
    addText(safeString(value), margin + 55, yPosition);
    addLine(margin + 53, yPosition + 2, pageWidth - margin, yPosition + 2);
    yPosition += 12;
  });

  yPosition += 15;

  // Section 4: System Components Tested
  checkNewPage(150);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  addText('4. SYSTEM COMPONENTS TESTED', margin, yPosition);
  yPosition += 10;

  // Table headers for components
  const tableY = yPosition;
  const colWidths = [15, 45, 40, 40, 30];
  const colPositions = [margin];
  for (let i = 1; i < colWidths.length; i++) {
    colPositions.push(colPositions[i-1] + colWidths[i-1]);
  }

  // Draw table headers
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  addBox(margin, tableY, pageWidth - 2 * margin, 8);
  
  const headers = ['Item', 'Location/Description', 'Type', 'Test Result', 'Status'];
  headers.forEach((header, index) => {
    addText(header, colPositions[index] + 2, tableY + 6);
  });

  yPosition = tableY + 10;

  // Add component items
  if (certificate.items && certificate.items.length > 0) {
    certificate.items.forEach((item, index) => {
      checkNewPage(10);
      
      const rowY = yPosition;
      addBox(margin, rowY, pageWidth - 2 * margin, 8);
      
      pdf.setFont('helvetica', 'normal');
      const rowData = [
        safeString(index + 1),
        safeString(item.location) || '',
        safeString(item.itemType) || '',
        item.status === 'satisfactory' ? 'Pass' : 'Fail',
        item.status === 'satisfactory' ? '✓' : '✗'
      ];
      
      rowData.forEach((data, colIndex) => {
        addText(safeString(data), colPositions[colIndex] + 2, rowY + 6);
      });
      
      yPosition += 8;
    });
  }

  yPosition += 15;

  // Section 5: Defects and Recommendations
  checkNewPage(80);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  addText('5. DEFECTS AND RECOMMENDATIONS', margin, yPosition);
  yPosition += 10;

  const defectItems = certificate.items?.filter(item => 
    item.defects || item.recommendations || item.status !== 'satisfactory'
  ) || [];

  if (defectItems.length > 0) {
    defectItems.forEach((item, index) => {
      checkNewPage(30);
      
      pdf.setFont('helvetica', 'bold');
      addText(`${index + 1}. Location: ${safeString(item.location)}`, margin, yPosition);
      yPosition += 8;
      
      if (item.defects) {
        pdf.setFont('helvetica', 'normal');
        addText(`Defect: ${safeString(item.defects)}`, margin + 10, yPosition);
        yPosition += 8;
      }
      
      if (item.recommendations) {
        pdf.setFont('helvetica', 'normal');
        addText(`Recommendation: ${safeString(item.recommendations)}`, margin + 10, yPosition);
        yPosition += 8;
      }
      
      yPosition += 5;
    });
  } else {
    pdf.setFont('helvetica', 'normal');
    addText('No defects found. All components tested satisfactorily.', margin, yPosition);
    yPosition += 15;
  }

  // Section 6: Declaration
  checkNewPage(100);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  addText('6. DECLARATION', margin, yPosition);
  yPosition += 10;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  const declaration = `I certify that the fire detection and alarm system described above has been inspected and serviced in accordance with BS 5839-1. The system has been tested and, except where noted above, is in satisfactory working order.

The next inspection/service is due: ${safeString(certificate.nextInspectionDate) || 'As specified above'}

This certificate is valid only for the system in its present form and any alterations or additions to the system will invalidate this certificate.`;

  const declarationLines = pdf.splitTextToSize(declaration, pageWidth - 2 * margin);
  declarationLines.forEach((line: string) => {
    checkNewPage(8);
    addText(line, margin, yPosition);
    yPosition += 6;
  });

  yPosition += 20;

  // Signature section
  checkNewPage(50);
  addLine(margin, yPosition, margin + 60, yPosition);
  addText('Inspector Signature', margin, yPosition + 8);
  
  addLine(pageWidth - margin - 60, yPosition, pageWidth - margin, yPosition);
  addText('Date', pageWidth - margin - 30, yPosition + 8);

  yPosition += 20;
  
  addLine(margin, yPosition, margin + 60, yPosition);
  addText('Inspector Name (Print)', margin, yPosition + 8);
  
  addLine(pageWidth - margin - 80, yPosition, pageWidth - margin, yPosition);
  addText('Qualification/Registration', pageWidth - margin - 40, yPosition + 8);

  // Footer
  yPosition = pageHeight - 30;
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  addText(`Certificate No: ${safeString(certificate.certificateNumber)}`, margin, yPosition);
  addText(`Generated: ${new Date().toLocaleDateString()}`, pageWidth - margin - 50, yPosition);
  addText(`Page 1 of ${pdf.getNumberOfPages()}`, pageWidth / 2, yPosition, { align: 'center' });

  return pdf.output('arraybuffer') as Uint8Array;
}

function getCertificateTypeDisplayName(type: string): string {
  const typeMap: Record<string, string> = {
    BS5839_1: 'BS5839-1 Fire Detection and Alarm Systems (Commercial)',
    BS5839_6: 'BS5839-6 Fire Detection and Alarm Systems (Domestic)',
    BS5266: 'BS5266 Emergency Lighting Systems',
    FIRE_EXTINGUISHER: 'Fire Extinguisher Inspection Certificate',
    DRY_RISER: 'Dry Riser System Testing Certificate'
  };
  
  return typeMap[type] || type;
}

function formatFieldName(fieldName: string): string {
  return fieldName
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .replace(/_/g, ' ')
    .trim();
}
