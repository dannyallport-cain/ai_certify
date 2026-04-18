const KNOWN_BRANDS: Record<string, string> = {
  "schneider electric": "Schneider Electric",
  "schneider": "Schneider Electric",
  "square d": "Square D",
  "hager": "Hager",
  "wylex": "Wylex",
  "contactum": "Contactum",
  "crabtree": "Crabtree",
  "abb": "ABB",
  "siemens": "Siemens",
  "legrand": "Legrand",
  "eaton": "Eaton",
  "mem": "MEM",
  "gewiss": "Gewiss",
  "fusebox": "FuseBox",
  "proteus": "Proteus",
  "verso": "Verso",
  "lewden": "Lewden",
  "chint": "Chint",
  "bg electrical": "BG",
  "scolmore": "Scolmore",
  "mk": "MK",
};

const BOARD_TYPE_KEYWORDS: Record<string, string> = {
  "split load": "split-load",
  "split-load": "split-load",
  "dual rcd": "dual-rcd",
  "high integrity": "high-integrity",
  "garage consumer unit": "garage-unit",
  "garage unit": "garage-unit",
  "main switch": "main-switch",
  "all rcbo": "rcbo-board",
  "rcbo": "rcbo-board",
};

const MODEL_PATTERNS = [
  /\b(?:model|type|cat(?:alog)?(?:\s*no)?|ref(?:erence)?|part\s*no)\s*[:#-]?\s*([A-Z0-9][A-Z0-9\-\/]{2,})/gi,
  /\b([A-Z]{1,5}\d{2,}[A-Z0-9\-\/]{0,12})/g,
];

const SERIAL_PATTERNS = [
  /\b(?:serial(?:\s*(?:number|no))?|s\/n|sn)\s*[:#-]?\s*([A-Z0-9\-]{5,})/gi,
  /\b([A-Z]{1,4}\d{5,}[A-Z0-9\-]{0,8})/g,
];

function normalizeText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function cleanLines(lines: string[]): string[] {
  return lines.map(line => normalizeText(line)).filter(line => line.length > 0);
}

function uniquePreserve(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const item = value.trim();
    if (!item) continue;

    const key = item.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    result.push(item);
  }

  return result;
}

export function extractBrand(lines: string[]): string | null {
  const joined = cleanLines(lines).join('\n').toLowerCase();

  for (const [keyword, label] of Object.entries(KNOWN_BRANDS)) {
    if (joined.includes(keyword)) {
      return label;
    }
  }

  return null;
}

export function extractModelCandidates(lines: string[]): string[] {
  const candidates: string[] = [];

  for (const line of cleanLines(lines)) {
    for (const pattern of MODEL_PATTERNS) {
      const matches = line.matchAll(pattern);
      for (const match of matches) {
        const value = match[1] || match[0];
        const cleaned = value.toUpperCase().replace(/^[ -:#]+|[ -:#]+$/g, '');
        if (cleaned.length >= 3 && !/^\d+$/.test(cleaned)) {
          candidates.push(cleaned);
        }
      }
    }
  }

  return uniquePreserve(candidates).slice(0, 5);
}

export function extractSerialCandidates(lines: string[]): string[] {
  const candidates: string[] = [];

  for (const line of cleanLines(lines)) {
    for (const pattern of SERIAL_PATTERNS) {
      const matches = line.matchAll(pattern);
      for (const match of matches) {
        const value = match[1] || match[0];
        const cleaned = value.toUpperCase().replace(/^[ -:#]+|[ -:#]+$/g, '');
        if (cleaned.length >= 5) {
          candidates.push(cleaned);
        }
      }
    }
  }

  return uniquePreserve(candidates).slice(0, 5);
}

export function detectBoardType(lines: string[]): string | null {
  const joined = cleanLines(lines).join(' ').toLowerCase();

  for (const [keyword, boardType] of Object.entries(BOARD_TYPE_KEYWORDS)) {
    if (joined.includes(keyword)) {
      return boardType;
    }
  }

  return null;
}

export function detectProtectiveDevices(lines: string[]): {
  hasMainSwitch: boolean;
  hasRCD: boolean;
  hasRCBO: boolean;
  hasSPD: boolean;
  hasMCB: boolean;
} {
  const joined = cleanLines(lines).join(' ').toLowerCase();

  return {
    hasMainSwitch: /\bmain\s+switch\b/.test(joined),
    hasRCD: /\brcd\b/.test(joined),
    hasRCBO: /\brcbo\b/.test(joined),
    hasSPD: /\bspd\b/.test(joined) || /\bsurge\s+protector\b/.test(joined),
    hasMCB: /\bmcb\b/.test(joined),
  };
}

export function extractConsumerUnitHints(textLines: string[]): Record<string, any> {
  const lines = cleanLines(textLines);

  return {
    brand: extractBrand(lines),
    modelCandidates: extractModelCandidates(lines),
    serialNumberCandidates: extractSerialCandidates(lines),
    boardTypeHint: detectBoardType(lines),
    hasMainSwitchHint: detectProtectiveDevices(lines).hasMainSwitch,
    hasRCDHint: detectProtectiveDevices(lines).hasRCD,
    hasRCBOHint: detectProtectiveDevices(lines).hasRCBO,
    hasSPDHint: detectProtectiveDevices(lines).hasSPD,
    hasMCBHint: detectProtectiveDevices(lines).hasMCB,
    observations: [],
    reviewNotes: [],
  };
}

export function buildImageQualitySummary(imageQuality: any): string {
  const parts = [];

  if (imageQuality.width && imageQuality.height) {
    parts.push(`${imageQuality.width}x${imageQuality.height}`);
  }

  if (imageQuality.hasText) {
    parts.push('text detected');
  } else {
    parts.push('no text detected');
  }

  if (imageQuality.textConfidence > 0) {
    parts.push(`OCR confidence: ${Math.round(imageQuality.textConfidence)}%`);
  }

  return parts.join(', ');
}