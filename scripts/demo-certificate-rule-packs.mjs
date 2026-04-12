import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createRequire } from 'module';
import { spawnSync } from 'child_process';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

const repoRoot = resolve(new URL('..', import.meta.url).pathname);
const samplePdfs = [
  'archive/root/sample-pdfs/_Highfield Hall Community Centre_CE202695_SATISFACTORY.pdf',
  'archive/root/sample-pdfs/26 The Sheddings_R Sandford_CE202692_SATISFACTORY.pdf',
  'archive/root/sample-pdfs/146 Fitzwarren Street_Vincente Dos Santos_CE202706_SATISFACTORY.pdf',
];

function normalizeLines(text) {
  return String(text || '')
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function runEngine(textLines, pdfPath) {
  const pythonCode = [
    'import json, sys',
    'from app.rules.engine import evaluate_rules',
    'payload = json.loads(sys.argv[1])',
    'results = evaluate_rules(text_lines=payload["text_lines"], image_quality={"status":"pdf-text-demo","lineCount":len(payload["text_lines"]),"width":0,"height":0}, derived={"consumerUnit": {}}, certificate_context=None)',
    'print(json.dumps(results))',
  ].join('; ');
  const result = spawnSync('./.venv311/bin/python', ['-c', pythonCode, JSON.stringify({ text_lines: textLines, pdf_path: pdfPath })], {
    cwd: resolve(repoRoot, 'railway-ai-worker'),
    encoding: 'utf-8',
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || `Python exited with code ${result.status}`);
  }

  return JSON.parse(result.stdout || '[]');
}

function escapeMarkdown(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\n/g, '<br>');
}

function buildMarkdownReport(summaries) {
  const lines = [
    '# Certificate Rule Pack Demonstration Report',
    '',
    'This report shows which deterministic rule packs fired against sample certificate PDFs stored in the repository, including the finding source, matched rule ID, severity, message, and captured evidence.',
    '',
  ];

  for (const summary of summaries) {
    lines.push(`## ${summary.pdf}`);
    lines.push('');
    lines.push(`- Text lines extracted: ${summary.textLineCount}`);
    lines.push(`- Matched rules: ${summary.matchedRuleCount}`);
    lines.push(`- Matched sources: ${summary.matchedSources.join(', ')}`);
    lines.push('');
    lines.push('| Rule ID | Source | Severity | Message | Evidence |');
    lines.push('| --- | --- | --- | --- | --- |');

    for (const result of summary.results) {
      const evidenceText = (result.evidence || [])
        .map((item) => `${item.label}: ${Array.isArray(item.value) ? item.value.slice(0, 5).join(' / ') : JSON.stringify(item.value)}`)
        .join(' ; ');

      lines.push(
        `| ${escapeMarkdown(result.ruleId)} | ${escapeMarkdown(result.source)} | ${escapeMarkdown(result.severity)} | ${escapeMarkdown(result.message)} | ${escapeMarkdown(evidenceText)} |`,
      );
    }

    lines.push('');
  }

  return `${lines.join('\n')}\n`;
}

async function main() {
  const summaries = [];

  for (const relativePath of samplePdfs) {
    const absolutePath = resolve(repoRoot, relativePath);
    const buffer = readFileSync(absolutePath);
    const parsed = await pdfParse(buffer);
    const textLines = normalizeLines(parsed.text);
    const results = runEngine(textLines, relativePath);

    summaries.push({
      pdf: relativePath,
      textLineCount: textLines.length,
      matchedRuleCount: results.length,
      matchedSources: Array.from(new Set(results.map((item) => item.source))).sort(),
      matchedRuleIds: results.map((item) => item.ruleId),
      results,
    });
  }

  console.log(JSON.stringify({ ok: true, summaries, markdown: buildMarkdownReport(summaries) }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
