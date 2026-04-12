import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'fs';
import { basename, dirname, extname, join, relative, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const defaultInputDir = resolve(repoRoot, 'archive/root/reference-pdfs');
const defaultOutputDir = resolve(repoRoot, 'railway-ai-worker/app/standards');
const allowedExtensions = new Set(['.pdf']);

const domainKeywordMap = {
  consumer_unit: [
    'consumer unit',
    'distribution board',
    'db',
    'main switch',
    'rcd',
    'rcbo',
    'mcb',
    'fuseboard',
    'spd',
    'surge protection',
  ],
  inspection_testing: [
    'inspection',
    'testing',
    'verification',
    'eicr',
    'electrical installation condition report',
    'periodic inspection',
    'test results',
  ],
  protective_devices: [
    'type ac',
    'type a',
    'type b',
    'rcd',
    'rcbo',
    'mcb',
    'fuse',
    'overcurrent',
    'fault protection',
  ],
  labeling_identification: [
    'label',
    'labelling',
    'identification',
    'notice',
    'warning',
    'circuit chart',
  ],
  earthing_bonding: [
    'earthing',
    'bonding',
    'main protective bonding',
    'earth electrode',
    'ze',
    'pscc',
  ],
};

const ruleSeedMap = [
  {
    id: 'consumer-unit-type-ac-review',
    triggerTokens: ['type ac'],
    issueType: 'protective_device',
    severity: 'medium',
    message: 'Type AC wording appears in the source standards and should be reviewed for suitability.',
    suggestedCodes: ['manual-review'],
  },
  {
    id: 'consumer-unit-spd-review',
    triggerTokens: ['surge protection', 'spd'],
    issueType: 'protective_device',
    severity: 'info',
    message: 'SPD-related guidance was found in the standards source set.',
    suggestedCodes: [],
  },
  {
    id: 'inspection-labeling-review',
    triggerTokens: ['labelling', 'label', 'identification'],
    issueType: 'labeling',
    severity: 'medium',
    message: 'Labelling or identification guidance was found in the standards source set.',
    suggestedCodes: ['manual-review'],
  },
  {
    id: 'inspection-earthing-review',
    triggerTokens: ['earthing', 'bonding'],
    issueType: 'earthing_bonding',
    severity: 'medium',
    message: 'Earthing/bonding guidance was found in the standards source set.',
    suggestedCodes: ['manual-review'],
  },
];

function parseArgs(argv) {
  const options = {
    inputDir: defaultInputDir,
    outputDir: defaultOutputDir,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--input' && argv[index + 1]) {
      options.inputDir = resolve(repoRoot, argv[index + 1]);
      index += 1;
      continue;
    }
    if (arg === '--output' && argv[index + 1]) {
      options.outputDir = resolve(repoRoot, argv[index + 1]);
      index += 1;
    }
  }

  return options;
}

async function extractPdfText(pdfPath) {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const data = readFileSync(pdfPath);
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(data) });
  const pdf = await loadingTask.promise;

  const pages = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    let lastY = null;
    let line = '';
    const lines = [];

    for (const item of content.items) {
      if (!item.str) continue;
      const y = item.transform[5];
      if (lastY !== null && Math.abs(y - lastY) > 3) {
        const cleaned = line.trim();
        if (cleaned) lines.push(cleaned);
        line = '';
      }
      line += `${item.str} `;
      lastY = y;
    }

    const cleaned = line.trim();
    if (cleaned) lines.push(cleaned);

    pages.push({
      pageNumber,
      text: lines.join('\n'),
      lineCount: lines.length,
    });
  }

  return {
    pageCount: pdf.numPages,
    pages,
    fullText: pages.map((page) => page.text).join('\n\n'),
  };
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/\.pdf$/i, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

function inferStandardMetadata(fileName, text) {
  const lowerName = fileName.toLowerCase();
  const lowerText = text.toLowerCase();
  const title = basename(fileName, extname(fileName));

  let standard = 'unknown';
  let family = 'guidance';
  if (lowerName.includes('bs 7671') || lowerName.includes('bs-7671') || lowerText.includes('bs 7671')) {
    standard = 'BS 7671';
    family = 'electrical-installations';
  } else if (lowerName.includes('guidance note 3') || lowerText.includes('guidance note 3')) {
    standard = 'Guidance Note 3';
    family = 'inspection-testing';
  } else if (lowerName.includes('site guide') || lowerText.includes('on-site guide')) {
    standard = 'On-Site Guide';
    family = 'practical-guidance';
  }

  const editionMatch =
    title.match(/18th edition/i) ||
    text.match(/18th edition/i) ||
    title.match(/a\d/i) ||
    text.match(/amendment\s+\d/i);

  return {
    title,
    standard,
    family,
    editionHint: editionMatch ? editionMatch[0] : null,
  };
}

function collectDomains(text) {
  const lowerText = text.toLowerCase();
  const hits = [];

  for (const [domain, keywords] of Object.entries(domainKeywordMap)) {
    if (keywords.some((keyword) => lowerText.includes(keyword))) {
      hits.push(domain);
    }
  }

  return hits;
}

function buildClauses(pdfRecord) {
  const clauses = [];
  for (const page of pdfRecord.pages) {
    const trimmed = page.text.trim();
    if (!trimmed) continue;

    const summary = trimmed.split(/\n+/).slice(0, 8).join(' ').slice(0, 1200);
    clauses.push({
      id: `${pdfRecord.id}:page-${page.pageNumber}`,
      sourceDocumentId: pdfRecord.id,
      page: page.pageNumber,
      summary,
      keywords: collectDomains(trimmed),
      sourceCitation: {
        standard: pdfRecord.standard,
        title: pdfRecord.title,
        authority: pdfRecord.standard,
        page: page.pageNumber,
      },
    });
  }
  return clauses;
}

function buildRuleCandidates(pdfRecord) {
  const lowerText = pdfRecord.fullText.toLowerCase();
  const candidates = [];

  for (const seed of ruleSeedMap) {
    if (!seed.triggerTokens.some((token) => lowerText.includes(token))) continue;

    const matchedClauses = pdfRecord.pages
      .filter((page) => seed.triggerTokens.some((token) => page.text.toLowerCase().includes(token)))
      .map((page) => ({
        clauseId: `${pdfRecord.id}:page-${page.pageNumber}`,
        page: page.pageNumber,
        matchedTokens: seed.triggerTokens.filter((token) => page.text.toLowerCase().includes(token)),
        sourceCitation: {
          standard: pdfRecord.standard,
          title: pdfRecord.title,
          page: page.pageNumber,
        },
      }));

    candidates.push({
      id: `${seed.id}:${pdfRecord.id}`,
      sourceDocumentId: pdfRecord.id,
      issueType: seed.issueType,
      severity: seed.severity,
      message: seed.message,
      suggestedCodes: seed.suggestedCodes,
      triggerTokens: seed.triggerTokens,
      authority: [
        {
          standard: pdfRecord.standard,
          title: pdfRecord.title,
        },
      ],
      sourceClauses: matchedClauses,
    });
  }

  return candidates;
}

function ensureDir(pathname) {
  mkdirSync(pathname, { recursive: true });
}

function listPdfFiles(dir) {
  return readdirSync(dir)
    .map((name) => join(dir, name))
    .filter((pathname) => statSync(pathname).isFile())
    .filter((pathname) => allowedExtensions.has(extname(pathname).toLowerCase()));
}

async function buildKnowledge({ inputDir, outputDir }) {
  ensureDir(outputDir);

  const files = listPdfFiles(inputDir);
  const catalog = {
    generatedAt: new Date().toISOString(),
    inputDirectory: relative(repoRoot, inputDir),
    documentCount: files.length,
    documents: [],
  };

  const allClauses = [];
  const allRuleCandidates = [];

  for (const filePath of files) {
    const relativePath = relative(repoRoot, filePath);
    const fileName = basename(filePath);
    const extraction = await extractPdfText(filePath);
    const metadata = inferStandardMetadata(fileName, extraction.fullText);
    const id = slugify(fileName);
    const domains = collectDomains(extraction.fullText);

    const documentRecord = {
      id,
      fileName,
      relativePath,
      ...metadata,
      domains,
      pageCount: extraction.pageCount,
      textLength: extraction.fullText.length,
      extractedAt: new Date().toISOString(),
    };

    const documentDir = join(outputDir, id);
    ensureDir(documentDir);

    writeFileSync(join(documentDir, 'metadata.json'), JSON.stringify(documentRecord, null, 2));
    writeFileSync(
      join(documentDir, 'pages.json'),
      JSON.stringify(
        extraction.pages.map((page) => ({
          pageNumber: page.pageNumber,
          lineCount: page.lineCount,
          text: page.text,
        })),
        null,
        2,
      ),
    );
    writeFileSync(join(documentDir, 'source.txt'), extraction.fullText);

    const pdfRecord = {
      ...documentRecord,
      fullText: extraction.fullText,
      pages: extraction.pages,
    };

    const clauses = buildClauses(pdfRecord);
    const ruleCandidates = buildRuleCandidates(pdfRecord);

    writeFileSync(join(documentDir, 'clauses.json'), JSON.stringify(clauses, null, 2));
    writeFileSync(join(documentDir, 'rule_candidates.json'), JSON.stringify(ruleCandidates, null, 2));

    catalog.documents.push(documentRecord);
    allClauses.push(...clauses);
    allRuleCandidates.push(...ruleCandidates);
  }

  writeFileSync(join(outputDir, 'catalog.json'), JSON.stringify(catalog, null, 2));
  writeFileSync(join(outputDir, 'clauses.json'), JSON.stringify(allClauses, null, 2));
  writeFileSync(join(outputDir, 'rule_candidates.json'), JSON.stringify(allRuleCandidates, null, 2));

  console.log(
    JSON.stringify(
      {
        ok: true,
        inputDirectory: relative(repoRoot, inputDir),
        outputDirectory: relative(repoRoot, outputDir),
        documentCount: catalog.documents.length,
        clauseCount: allClauses.length,
        ruleCandidateCount: allRuleCandidates.length,
      },
      null,
      2,
    ),
  );
}

const options = parseArgs(process.argv.slice(2));
buildKnowledge(options).catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});
