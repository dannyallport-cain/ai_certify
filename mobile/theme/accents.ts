/**
 * Colour coding for multi-step workflows. Each step owns one hue so an
 * engineer can tell at a glance where they are in a sequence: the rail, the
 * step badge, the primary action and the completed ticks all share it.
 */

export type FlowAccent = 'sky' | 'amber' | 'violet' | 'teal' | 'emerald' | 'rose' | 'indigo';

export interface AccentColours {
  /** Solid fill for badges, pills and primary actions. */
  solid: string;
  soft: string;
  softDark: string;
  ink: string;
  inkDark: string;
  line: string;
  lineDark: string;
}

export const ACCENTS: Record<FlowAccent, AccentColours> = {
  sky: {
    solid: '#2563EB',
    soft: '#E7EEFE',
    softDark: '#152446',
    ink: '#1D4ED8',
    inkDark: '#9BC2FF',
    line: '#BFD3FB',
    lineDark: '#2C4270',
  },
  amber: {
    solid: '#D97706',
    soft: '#FDF1DC',
    softDark: '#3A2A0D',
    ink: '#B45309',
    inkDark: '#F7C871',
    line: '#F2D9AE',
    lineDark: '#5A421A',
  },
  violet: {
    solid: '#7C3AED',
    soft: '#F0EAFE',
    softDark: '#26194A',
    ink: '#6D28D9',
    inkDark: '#C4B0FF',
    line: '#D9CBFB',
    lineDark: '#3E2C6E',
  },
  teal: {
    solid: '#0D9488',
    soft: '#DFF5F2',
    softDark: '#0E3230',
    ink: '#0F766E',
    inkDark: '#6ED9CB',
    line: '#B7E5DF',
    lineDark: '#1B4C48',
  },
  emerald: {
    solid: '#059669',
    soft: '#DFF6EA',
    softDark: '#0C3325',
    ink: '#047857',
    inkDark: '#6EE7A8',
    line: '#B4E7CD',
    lineDark: '#1A4C36',
  },
  rose: {
    solid: '#E11D48',
    soft: '#FDE7EC',
    softDark: '#3E1220',
    ink: '#BE123C',
    inkDark: '#FDA4B5',
    line: '#F8C2CF',
    lineDark: '#63202F',
  },
  indigo: {
    solid: '#4338CA',
    soft: '#E8E6FD',
    softDark: '#1B1A47',
    ink: '#3730A3',
    inkDark: '#B3AEFF',
    line: '#CBC7FA',
    lineDark: '#332F73',
  },
};

export interface AccentTokens {
  solid: string;
  soft: string;
  ink: string;
  line: string;
}

/** Per-scheme tokens so call sites never branch on the scheme themselves. */
export function accentTokens(name: FlowAccent, scheme: 'light' | 'dark'): AccentTokens {
  const accent = ACCENTS[name];
  const isDark = scheme === 'dark';

  return {
    solid: accent.solid,
    soft: isDark ? accent.softDark : accent.soft,
    ink: isDark ? accent.inkDark : accent.ink,
    line: isDark ? accent.lineDark : accent.line,
  };
}
