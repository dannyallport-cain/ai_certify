const fs = require('fs');
let code = fs.readFileSync('lib/pdf/generator.ts', 'utf8');

code = code.replace(
  /const groupRowH = 7;   \/\/ Top tier: group labels\n    const subRowH = 34;    \/\/ Bottom tier: individual column labels \(longer for rotated text\)/,
  `const groupRowH = 10;   // Top tier: group labels
    const subRowH = 28;    // Bottom tier: individual column labels`
);

code = code.replace(
  /pdf\.setFontSize\(5\);\n    pdf\.setFont\('helvetica', 'bold'\);\n\n    groups/,
  `pdf.setFontSize(6);
    pdf.setFont('helvetica', 'bold');

    groups`
);

code = code.replace(
  /pdf\.setFontSize\(4\.5\);\n    cols\.forEach\(\(c, i\)/,
  `pdf.setFontSize(5.5);
    cols.forEach((c, i)`
);

code = code.replace(
  /\/\/ Column label text – in the sub-row area\n      pdf\.setTextColor\(255, 255, 255\);/,
  `// Column label text – in the sub-row area
      pdf.setTextColor(0, 0, 0);`
);

fs.writeFileSync('lib/pdf/generator.ts', code);
