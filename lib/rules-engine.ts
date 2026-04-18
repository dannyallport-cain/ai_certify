import fs from 'fs';
import path from 'path';

interface RuleCondition {
  path: string;
  op: 'eq' | 'neq' | 'contains' | 'not_contains' | 'exists' | 'in';
  value?: any;
  valueFrom?: string;
}

interface RuleGroup {
  all?: RuleEntry[];
  any?: RuleEntry[];
}

type RuleEntry = RuleCondition | RuleGroup;

interface Rule {
  id: string;
  title?: string;
  message?: string;
  severity?: 'info' | 'warning' | 'error';
  confidence?: number;
  needsHumanReview?: boolean;
  suggestedCodes?: string[];
  reportTargets?: Array<{
    sectionKey: string;
    fieldPath: string;
    reason?: string;
    expectedValue?: any;
  }>;
  observation?: {
    code?: string;
    title?: string;
    comment?: string;
    classification?: string;
  };
  summaryComment?: string;
  source?: string;
  when: RuleEntry;
}

interface RuleResult {
  ruleId: string;
  issueType: string;
  message: string;
  severity: string;
  title?: string;
  suggestedCodes: string[];
  evidence: Array<{
    text?: string;
    field?: string;
    value?: any;
    note?: string;
  }>;
  reportTargets: Array<{
    sectionKey: string;
    fieldPath: string;
    reason?: string;
    expectedValue?: any;
  }>;
  observation?: {
    code?: string;
    title?: string;
    comment?: string;
    classification?: string;
    scheduleItems?: Array<{
      itemKey: string;
      description?: string;
      suggestedCode?: string;
      comment?: string;
      sourceRuleId: string;
    }>;
  };
  summaryComment?: string;
  source: string;
  confidence: number;
  needsHumanReview: boolean;
}

function getByPath(data: any, pathStr: string): any {
  const parts = pathStr.split('.');
  let current = data;

  for (const part of parts) {
    if (current == null || typeof current !== 'object') {
      return undefined;
    }

    if (Array.isArray(current)) {
      const index = parseInt(part);
      if (isNaN(index) || index < 0 || index >= current.length) {
        return undefined;
      }
      current = current[index];
    } else {
      current = current[part];
    }
  }

  return current;
}

function existsValue(value: any): boolean {
  if (value == null) {
    return false;
  }

  if (typeof value === 'string') {
    return value.trim() !== '';
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (typeof value === 'object') {
    return Object.keys(value).length > 0;
  }

  return true;
}

function evaluateCondition(condition: RuleCondition, context: any): boolean {
  const { path: pathStr, op, value, valueFrom } = condition;
  const actual = getByPath(context, pathStr);

  if (op === 'exists') {
    return existsValue(actual);
  }

  let expected = value;
  if (valueFrom) {
    expected = getByPath(context, valueFrom);
  }

  switch (op) {
    case 'eq':
      return actual === expected;
    case 'neq':
      return existsValue(actual) && existsValue(expected) && actual !== expected;
    case 'contains':
      const actualStr = Array.isArray(actual) ? actual.join(' ').toLowerCase() : String(actual || '').toLowerCase();
      return String(expected || '').toLowerCase().includes(actualStr);
    case 'not_contains':
      const actualStr2 = Array.isArray(actual) ? actual.join(' ').toLowerCase() : String(actual || '').toLowerCase();
      return !String(expected || '').toLowerCase().includes(actualStr2);
    case 'in':
      return Array.isArray(expected) && expected.includes(actual);
    default:
      return false;
  }
}

function evaluateEntry(entry: RuleEntry, context: any): boolean {
  if ('all' in entry) {
    return entry.all ? entry.all.every(item => evaluateEntry(item, context)) : false;
  }
  if ('any' in entry) {
    return entry.any ? entry.any.some(item => evaluateEntry(item, context)) : false;
  }
  return evaluateCondition(entry as RuleCondition, context);
}

function loadRules(): Rule[] {
  const rulesDir = path.join(process.cwd(), 'lib', 'rules');
  const ruleFiles = [
    'v1_0_eicr_consumer_unit.json',
    'v1_1_standards_compiled.json',
    'v1_2_bs7671_domain.json',
    'v1_2_gn3_domain.json',
    'v1_2_eicr_coding_domain.json',
    'v1_2_image_observation_domain.json',
    'v1_3_certificate_validation_domain.json',
    'v1_4_structured_certificate_validation_domain.json',
  ];

  const allRules: Rule[] = [];

  for (const fileName of ruleFiles) {
    try {
      const filePath = path.join(rulesDir, fileName);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const rules = JSON.parse(content);
        if (Array.isArray(rules)) {
          allRules.push(...rules);
        }
      }
    } catch (error) {
      console.error(`Failed to load rules from ${fileName}:`, error);
    }
  }

  return allRules;
}

export function evaluateRules(
  textLines: string[],
  imageQuality: any,
  derived: any,
  certificateContext?: any
): RuleResult[] {
  const rules = loadRules();
  const context = {
    textLines,
    imageQuality,
    derived,
    certificateContext,
  };

  const results: RuleResult[] = [];

  for (const rule of rules) {
    try {
      if (evaluateEntry(rule.when, context)) {
        const result: RuleResult = {
          ruleId: rule.id,
          issueType: 'rule-match',
          message: rule.message || 'Rule matched during analysis',
          severity: rule.severity || 'warning',
          title: rule.title,
          suggestedCodes: rule.suggestedCodes || [],
          evidence: [],
          reportTargets: rule.reportTargets || [],
          observation: rule.observation,
          summaryComment: rule.summaryComment,
          source: rule.source || 'rule-pack',
          confidence: rule.confidence || 0.8,
          needsHumanReview: rule.needsHumanReview !== false,
        };

        results.push(result);
      }
    } catch (error) {
      console.error(`Error evaluating rule ${rule.id}:`, error);
    }
  }

  return results;
}
