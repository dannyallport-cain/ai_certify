const fs = require('fs');
let code = fs.readFileSync('lib/pdf/generator.ts', 'utf8');

if (!code.includes('const tableHeaderBg')) {
  code = code.replace(
    'const borderGrey = tc?.secondary ? lighten(hexToRgb(tc.secondary), 0.45) : [180, 190, 200] as [number, number, number];',
    'const borderGrey = tc?.secondary ? lighten(hexToRgb(tc.secondary), 0.45) : [180, 190, 200] as [number, number, number];\n  const tableHeaderBg = tc?.secondary ? lighten(hexToRgb(tc.secondary), 0.75) : [230, 235, 240] as [number, number, number];'
  );
}

// 1. Re-write the newPage function to be smart
code = code.replace(
  `  const newPage = () => {
    addPageFooter();
    pdf.addPage();
    currentPage++;
    y = margin;
  };`,
  `  const newPage = () => {
    if (y > margin) {
      addPageFooter();
      pdf.addPage();
      currentPage++;
      y = margin;
    }
  };`
);

// 2. Replace hardcoded manual page breaks with the smart newPage()
// Observations page break
code = code.replace(
  `  // Page 1 footer
  addPageFooter();

  // ════════════════════════════════════════════════════════════
  // PAGE 2 – Observations (section 7)
  // ════════════════════════════════════════════════════════════
  pdf.addPage();
  currentPage++;
  y = margin;`,
  `  // Page 1 footer
  // ════════════════════════════════════════════════════════════
  // PAGE 2 – Observations (section 7)
  // ════════════════════════════════════════════════════════════
  newPage();`
);

// General condition page break
code = code.replace(
  `  // Page 2 footer
  addPageFooter();

  // ════════════════════════════════════════════════════════════
  // PAGE 3 – General condition, Declaration, Test Instruments, Supply (sections 8-12)
  // ════════════════════════════════════════════════════════════
  pdf.addPage();
  currentPage++;
  y = margin;`,
  `  // Page 2 footer
  // ════════════════════════════════════════════════════════════
  // PAGE 3 – General condition, Declaration, Test Instruments, Supply (sections 8-12)
  // ════════════════════════════════════════════════════════════
  newPage();`
);

// Particulars of installation break
code = code.replace(
  `  }

  addPageFooter();

  // ════════════════════════════════════════════════════════════
  // PAGE 3 continued / PAGE 4 start – Particulars of Installation (section 12)
  // then Inspection Schedule
  // ════════════════════════════════════════════════════════════
  pdf.addPage();
  currentPage++;
  y = margin;`,
  `  }

  // ════════════════════════════════════════════════════════════
  // PAGE 3 continued / PAGE 4 start – Particulars of Installation (section 12)
  // then Inspection Schedule
  // ════════════════════════════════════════════════════════════
  newPage();`
);

// Inspection schedule break
code = code.replace(
  `  // Render inspection schedule across pages
  const renderInspectionSchedule = () => {
    pdf.addPage();
    currentPage++;
    y = margin;`,
  `  // Render inspection schedule across pages
  const renderInspectionSchedule = () => {
    newPage();`
);

// Replace remaining manual break inside Inspection Schedule loop
code = code.replace(
  `          addPageFooter();
          pdf.addPage();
          currentPage++;
          y = margin;`,
  `          newPage();`
);

// Specific landscape break for Circuit Details
code = code.replace(
  `  addPageFooter();

  // ════════════════════════════════════════════════════════════
  // PAGE 8 – Circuit details (section 16)
  // ════════════════════════════════════════════════════════════
  pdf.addPage('a4', 'l'); // landscape A4: 297 × 210 mm
  currentPage++;
  y = margin;`,
  `  if (y > margin) {
    addPageFooter();
  }

  // ════════════════════════════════════════════════════════════
  // PAGE 8 – Circuit details (section 16)
  // ════════════════════════════════════════════════════════════
  pdf.addPage('a4', 'l'); // landscape A4: 297 × 210 mm
  currentPage++;
  y = margin;`
);

// Specific landscape break inside CheckPage if it overspills
code = code.replace(
  `    if (y + space > maxLsContentY) {
      lsAddPageFooter();
      pdf.addPage('a4', 'l');
      currentPage++;
      y = margin;`,
  `    if (y + space > maxLsContentY) {
      if (y > margin) {
        lsAddPageFooter();
        pdf.addPage('a4', 'l');
        currentPage++;
        y = margin;
      }`
);
code = code.replace(
  `      // re-draw header on new page
      y += 8; // space for header
    }`,
  `      // re-draw header on new page
      y += 8; // space for header
      }
    }`
);

// Final portrait break
code = code.replace(
  `  lsAddPageFooter();

  pdf.addPage('a4', 'p'); // explicit portrait after landscape page
  currentPage++;
  y = margin;`,
  `  if (y > margin) {
    lsAddPageFooter();
  }

  pdf.addPage('a4', 'p'); // explicit portrait after landscape page
  currentPage++;
  y = margin;`
);

// 3. Table background colors
code = code.replace(
  `    filledRect(margin, y, W, 7, navy);
    pdf.setTextColor(255, 255, 255);`,
  `    filledRect(margin, y, W, 7, tableHeaderBg);
    borderedRect(margin, y, W, 7);
    pdf.setTextColor(0, 0, 0);`
);

// There's a second one of those
code = code.replace(
  `      filledRect(margin, y, W, 7, navy);
      pdf.setTextColor(255, 255, 255);`,
  `      filledRect(margin, y, W, 7, tableHeaderBg);
      borderedRect(margin, y, W, 7);
      pdf.setTextColor(0, 0, 0);`
);

code = code.replace(
  `    filledRect(margin, atY, lsW, totalHeaderH, navy);

    // ── Tier 1: Group labels ──
    pdf.setTextColor(255, 255, 255);`,
  `    filledRect(margin, atY, lsW, totalHeaderH, tableHeaderBg);
    pdf.setDrawColor(borderGrey[0], borderGrey[1], borderGrey[2]);
    pdf.rect(margin, atY, lsW, totalHeaderH);

    // ── Tier 1: Group labels ──
    pdf.setTextColor(0, 0, 0);`
);

// dividers inside landscape table
code = code.replace(
  `      pdf.setDrawColor(120, 150, 180);`,
  `      pdf.setDrawColor(borderGrey[0], borderGrey[1], borderGrey[2]);`
);

code = code.replace(
  `        pdf.setDrawColor(80, 110, 140);`,
  `        pdf.setDrawColor(borderGrey[0], borderGrey[1], borderGrey[2]);`
);


fs.writeFileSync('lib/pdf/generator.ts', code);
console.log('done');
