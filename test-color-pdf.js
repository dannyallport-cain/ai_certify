const { jsPDF } = require('jspdf');
const fs = require('fs');

const pdf = new jsPDF();

// Test navy filled rect
pdf.setFillColor(26, 58, 92);
pdf.rect(10, 10, 180, 15, 'F');
pdf.setTextColor(255, 255, 255);
pdf.setFontSize(12);
pdf.setFont('helvetica', 'bold');
pdf.text('NAVY FILL + WHITE TEXT', 15, 20);

// Test green filled rect
pdf.setFillColor(40, 167, 69);
pdf.rect(10, 30, 180, 12, 'F');
pdf.setTextColor(255, 255, 255);
pdf.text('GREEN FILL', 15, 38);

// Test light blue fill
pdf.setFillColor(235, 242, 250);
pdf.rect(10, 47, 180, 10, 'F');
pdf.setDrawColor(180, 190, 200);
pdf.setLineWidth(0.3);
pdf.rect(10, 47, 180, 10);
pdf.setTextColor(0, 0, 0);
pdf.setFontSize(8);
pdf.text('Light blue background with grey border', 15, 53);

// Test red fill
pdf.setFillColor(220, 53, 69);
pdf.rect(10, 62, 180, 12, 'F');
pdf.setTextColor(255, 255, 255);
pdf.setFontSize(12);
pdf.text('RED FILL - UNSATISFACTORY', 15, 70);

const buf = Buffer.from(pdf.output('arraybuffer'));
fs.writeFileSync('test-results/color-test.pdf', buf);
console.log('Test PDF written to test-results/color-test.pdf');
console.log('File size:', buf.length, 'bytes');
