import assert from 'node:assert/strict';
import { decideStartupState } from '../decideStartupState';
import type { BiometricCapability } from '../../../services/biometrics/types';

const ENROLLED_FACE: BiometricCapability = {
  isSupported: true,
  isEnrolled: true,
  kind: 'face',
  label: 'Face ID',
  description: 'Unlock AI Certify with Face ID instead of typing your password.',
};

const SENSOR_NOT_ENROLLED: BiometricCapability = {
  ...ENROLLED_FACE,
  isEnrolled: false,
};

const NO_SENSOR: BiometricCapability = {
  isSupported: false,
  isEnrolled: false,
  kind: 'biometric',
  label: 'Biometric login',
  description: 'Face or fingerprint unlock is not available on this device.',
};

function check(name: string, run: () => void) {
  run();
  console.log(`ok - ${name}`);
}

check('no token signs the user out and drops a stale preference', () => {
  const decision = decideStartupState({
    hasToken: false,
    preferenceEnabled: true,
    capability: ENROLLED_FACE,
  });

  assert.equal(decision.status, 'signed-out');
  assert.equal(decision.isBiometricEnabled, false);
  assert.equal(decision.shouldClearPreference, true);
  assert.equal(decision.notice, null);
});

check('no token and no preference leaves storage untouched', () => {
  const decision = decideStartupState({
    hasToken: false,
    preferenceEnabled: false,
    capability: ENROLLED_FACE,
  });

  assert.equal(decision.status, 'signed-out');
  assert.equal(decision.shouldClearPreference, false);
});

check('token without a preference goes straight in', () => {
  const decision = decideStartupState({
    hasToken: true,
    preferenceEnabled: false,
    capability: ENROLLED_FACE,
  });

  assert.equal(decision.status, 'unlocked');
  assert.equal(decision.isBiometricEnabled, false);
  assert.equal(decision.shouldClearPreference, false);
});

check('token plus an enrolled sensor opens on the lock screen', () => {
  const decision = decideStartupState({
    hasToken: true,
    preferenceEnabled: true,
    capability: ENROLLED_FACE,
  });

  assert.equal(decision.status, 'locked');
  assert.equal(decision.isBiometricEnabled, true);
  assert.equal(decision.shouldClearPreference, false);
  assert.equal(decision.notice, null);
});

check('removed face data falls back to the password screen', () => {
  const decision = decideStartupState({
    hasToken: true,
    preferenceEnabled: true,
    capability: SENSOR_NOT_ENROLLED,
  });

  assert.equal(decision.status, 'password');
  assert.equal(decision.isBiometricEnabled, false);
  assert.equal(decision.shouldClearPreference, true);
  assert.match(decision.notice ?? '', /Face ID is no longer set up/);
});

check('a device without a sensor falls back to the password screen', () => {
  const decision = decideStartupState({
    hasToken: true,
    preferenceEnabled: true,
    capability: NO_SENSOR,
  });

  assert.equal(decision.status, 'password');
  assert.equal(decision.shouldClearPreference, true);
  assert.equal(decision.isBiometricEnabled, false);
});

console.log('decideStartupState: all checks passed');
