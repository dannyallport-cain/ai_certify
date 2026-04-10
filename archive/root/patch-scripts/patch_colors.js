const fs = require('fs');
let code = fs.readFileSync('lib/pdf/generator.ts', 'utf8');

code = code.replace(/\[200,\s*215,\s*230\]/g, "tableHeaderBg");
code = code.replace(/\[245,\s*248,\s*252\]/g, "[248, 248, 248]");
code = code.replace(/\[240,\s*245,\s*250\]/g, "tableHeaderBg");
code = code.replace(/\[220,\s*230,\s*240\]/g, "tableHeaderBg");

fs.writeFileSync('lib/pdf/generator.ts', code);
