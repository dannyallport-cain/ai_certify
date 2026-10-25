import { Ionicons } from '@expo/vector-icons';
import type { BiometricKind } from '@/services/biometrics';

const GLYPHS: Record<BiometricKind, keyof typeof Ionicons.glyphMap> = {
  face: 'scan-outline',
  fingerprint: 'finger-print-outline',
  iris: 'eye-outline',
  biometric: 'lock-closed-outline',
};

interface BiometricGlyphProps {
  kind: BiometricKind;
  size: number;
  color: string;
}

/** Ionicons glyph for the enrolled sensor: face scan or fingerprint. */
export function BiometricGlyph({ kind, size, color }: BiometricGlyphProps) {
  return <Ionicons name={GLYPHS[kind]} size={size} color={color} />;
}
