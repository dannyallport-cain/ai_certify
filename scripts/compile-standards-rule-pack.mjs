import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

const defaultCandidatesPath = resolve(repoRoot, 'railway-ai-worker/app/standards/rule_candidates.json');
const defaultOutputPath = resolve(repoRoot, 'railway-ai-worker/app/rules/v1_1_standards_compiled.json');

function parseArgs(argv) {
  const options = {
    candidatesPath: defaultCandidatesPath,
    outputPath: defaultOutputPath,
    packName: 'standards-compiled-v1.1',
    description: 'Compiled deterministic rules generated from local standards knowledge candidates.',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--candidates' && argv[index + 1]) {
      options.candidatesPath = resolve(repoRoot, argv[index + 1]);
      index += 1;
      continue;
    }
    if (arg === '--output' && argv[index + 1]) {
      options.outputPath = resolve(repoRoot, argv[index + 1]);
      index += 1;
      continue;
    }
    if (arg === '--name' && argv[index + 1]) {
      options.packName = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === '--description' && argv[index + 1]) {
      options.description = argv[index + 1];
      index += 1;
    }
  }

  return options;
}

function stableId(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function toRule(candidate, index) {
  const triggerTokens = Array.from(new Set((candidate.triggerTokens || []).filter(Boolean)));
  if (!triggerTokens.length) {
    return null;
  }

  const authority = Array.isArray(candidate.authority) ? candidate.authority : [];
  const sourceClauses = Array.isArray(candidate.sourceClauses) ? candidate.sourceClauses : [];
  const primaryAuthority = authority[0] || null;

  return {
    id: stableId(candidate.id || `${candidate.issueType}-${index + 1}`),
    issueType: candidate.issueType || 'standards_review',
    severity: candidate.severity || 'medium',
    message: candidate.message || 'Standards-derived rule matched OCR text.',
    source: 'standards_compiler',
    confidence: 0.8,
    needsHumanReview: true,
    suggestedCodes: Array.isArray(candidate.suggestedCodes) ? candidate.suggestedCodes : [],
    authority,
    metadata: {
      sourceDocumentId: candidate.sourceDocumentId || null,
      compiledFromCandidateId: candidate.id || null,
      triggerTokens,
      authorityStandard: primaryAuthority?.standard || null,
      authorityTitle: primaryAuthority?.title || null,
      sourceClauseIds: sourceClauses.map((clause) => clause.clauseId).filter(Boolean),
      sourceClausePages: sourceClauses.map((clause) => clause.page).filter((page) => Number.isInteger(page)),
    },
    conditions: {
      any: triggerTokens.map((token) => ({
        path: 'text.joinedLower',
        op: 'contains',
        value: String(token).toLowerCase(),
      })),
    },
    evidence: [
      {
        label: 'matchedText',
        path: 'text.lines',
      },
      {
        label: 'sourceDocumentId',
        path: 'metadata.sourceDocumentId',
      },
      {
        label: 'sourceClauseIds',
        path: 'metadata.sourceClauseIds',
      },
      {
        label: 'authorityTitle',
        path: 'metadata.authorityTitle',
      },
    ],
  };
}

function compileRulePack(candidates, options) {
  const compiledRules = [];
  const dedupe = new Set();

  for (const [index, candidate] of candidates.entries()) {
    const normalizedKey = JSON.stringify({
      issueType: candidate.issueType || null,
      severity: candidate.severity || null,
      message: candidate.message || null,
      triggerTokens: [...new Set((candidate.triggerTokens || []).map((token) => String(token).toLowerCase()))].sort(),
    });

    if (dedupe.has(normalizedKey)) {
      continue;
    }

    dedupe.add(normalizedKey);
    const rule = toRule(candidate, index);
    if (rule) compiledRules.push(rule);
  }

  return {
    version: '1.1',
    name: options.packName,
    description: options.description,
    generatedAt: new Date().toISOString(),
    sourceCandidatesPath: options.candidatesPath.replace(`${repoRoot}/`, ''),
    ruleCount: compiledRules.length,
    rules: compiledRules,
  };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const candidates = JSON.parse(readFileSync(options.candidatesPath, 'utf-8'));
  if (!Array.isArray(candidates)) {
    throw new Error('Candidates file must contain a JSON array.');
  }

  const compiled = compileRulePack(candidates, options);
  mkdirSync(dirname(options.outputPath), { recursive: true });
  writeFileSync(options.outputPath, JSON.stringify(compiled, null, 2));

  console.log(
    JSON.stringify(
      {
        ok: true,
        candidatesPath: options.candidatesPath.replace(`${repoRoot}/`, ''),
        outputPath: options.outputPath.replace(`${repoRoot}/`, ''),
        compiledRuleCount: compiled.ruleCount,
      },
      null,
      2,
    ),
  );
}

main();
