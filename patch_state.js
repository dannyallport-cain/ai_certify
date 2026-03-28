const fs = require('fs');
const file = 'app/(dashboard)/admin/reports/disseminator/page.tsx';
let data = fs.readFileSync(file, 'utf8');

data = data.replace(
  "const [excludesOpen, setExcludesOpen] = useState(false);",
  "const [excludesOpen, setExcludesOpen] = useState(false);\n  const [conditionalRulesOpen, setConditionalRulesOpen] = useState(false);"
);

fs.writeFileSync(file, data);
