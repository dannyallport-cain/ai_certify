const fs = require('fs');
const file = 'app/(dashboard)/admin/reports/disseminator/page.tsx';
let data = fs.readFileSync(file, 'utf8');

const tCR = `
export type ConditionalRule = {
  id: string;
  sourceFieldIds: string[];
  triggerValues: string[];
  targetValue: string;
};

/** A single exclusion rule stored on a field. */`;
data = data.replace('/** A single exclusion rule stored on a field. */', tCR);

data = data.replace('// Max options to return from Search Online Options (default 12, max 40)', `// Conditional logic rules (e.g., auto-set value based on other fields)
  conditionalRules?: ConditionalRule[];
  // Max options to return from Search Online Options (default 12, max 40)`);

fs.writeFileSync(file, data);
