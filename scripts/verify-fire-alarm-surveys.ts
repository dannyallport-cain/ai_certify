import { buildDiarySummary } from '../lib/fire-alarm/diary-summary';
import { normalizeSurveyDevice } from '../lib/fire-alarm/device-normalizer';
import {
  describeServiceM8Job,
  describeSurveyContents,
  formatSurveyDate,
  normalizeServiceM8Link,
  resolveSurveyName,
} from '../lib/fire-alarm/format';
import type { FireAlarmSurveyDetail } from '../lib/fire-alarm/types';

/**
 * The rules a fire alarm survey follows once it leaves the phone.
 *
 * These are the checks that matter for the two things that used to be wrong:
 * a device typed during review must be saved, and a survey must be filed under
 * a name a surveyor recognises rather than a raw session id.
 */

let failures = 0;

function check(name: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`PASS  ${name}`);
    return;
  }

  failures += 1;
  console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
}

// --- Naming ---------------------------------------------------------------------------------

const jobLink = {
  companyUuid: 'company-1',
  companyName: 'Riverside Ltd',
  jobUuid: 'job-1',
  jobNumber: '1042',
  jobDate: '2026-10-27',
  jobAddress: '1 Riverside Way',
};

check(
  'an explicit name wins over everything',
  resolveSurveyName({
    name: '  Ground floor  ',
    customerName: 'Riverside Ltd',
    serviceM8: jobLink,
  }) === 'Ground floor',
);

check(
  'client and job number name an unnamed survey',
  resolveSurveyName({ customerName: 'Riverside Ltd', serviceM8: jobLink }) ===
    'Riverside Ltd · Job 1042',
);

check(
  'a client alone still names it',
  resolveSurveyName({ customerName: 'Riverside Ltd' }) ===
    'Riverside Ltd fire alarm survey',
);

check(
  'a ServiceM8 company without a local client still names it',
  resolveSurveyName({ serviceM8: jobLink }) === 'Riverside Ltd · Job 1042',
);

const datedName = resolveSurveyName({ createdAt: '2026-10-28T09:00:00.000Z' });
check('a bare capture falls back to the date', datedName.startsWith('Fire alarm survey'), datedName);

check(
  'a survey is never left unnamed',
  resolveSurveyName({}).length > 0,
);

// --- ServiceM8 link coercion ----------------------------------------------------------------

check('junk is not a link', normalizeServiceM8Link('nonsense') === null);
check('an empty object is not a link', normalizeServiceM8Link({}) === null);

const partialLink = normalizeServiceM8Link({ jobUuid: '  job-9  ', jobNumber: '  ' });
check('a partial link is kept', partialLink?.jobUuid === 'job-9');
check('blank fields become null', partialLink?.jobNumber === null);

const junkLink = normalizeServiceM8Link([{ jobUuid: 'job-1' }]);
check('an array is rejected as a link', junkLink === null);

check(
  'the job line reads naturally',
  describeServiceM8Job(jobLink) === `Job 1042 · ${formatSurveyDate('2026-10-27')}`,
);
check('no link means no job line', describeServiceM8Job(null) === null);

// --- Contents wording -----------------------------------------------------------------------

check('no devices is stated plainly', describeSurveyContents(0, 0) === 'No devices captured yet');
check('one device has no plural', describeSurveyContents(1, 0) === '1 device');
check(
  'devices and rooms are both shown',
  describeSurveyContents(3, 2) === '3 devices · 2 rooms',
);

// --- Device normalisation -------------------------------------------------------------------

check('a device with no type is dropped', normalizeSurveyDevice({ label: 'Panel' }) === null);
check('an unknown device is dropped', normalizeSurveyDevice({ type: 'unknown' }) === null);

// The regression this guards: a device the engineer typed in review but did not
// tick as "identified by user" used to be silently discarded.
const reviewedDevice = normalizeSurveyDevice({
  id: '  device-1 ',
  type: 'detector',
  label: '  Smoke detector  ',
  manufacturer: { name: 'Apollo', confidence: 0.82 },
  location: { x: 1.5, y: 2.25 },
  notes: '  near stair  ',
  roomId: ' room-1 ',
});
check('a typed device is kept without the identified flag', reviewedDevice !== null);
check('the device keeps its type', reviewedDevice?.deviceType === 'detector');
check('the label is trimmed', reviewedDevice?.label === 'Smoke detector');
check('the manufacturer name is read from the object', reviewedDevice?.manufacturerName === 'Apollo');
check('the manufacturer confidence is kept', reviewedDevice?.manufacturerConfidence === 0.82);
check('the position is kept', reviewedDevice?.locationX === 1.5 && reviewedDevice?.locationY === 2.25);
check('the notes are trimmed', reviewedDevice?.notes === 'near stair');
check('the room is trimmed', reviewedDevice?.roomId === 'room-1');
check('a reviewed device is not marked user-identified', reviewedDevice?.identifiedByUser === false);
check('the device is tagged as a mobile save', reviewedDevice?.metadata != null);

const stringManufacturer = normalizeSurveyDevice({
  type: 'sounder',
  manufacturer: '  Hochiki ',
});
check('a string manufacturer is kept', stringManufacturer?.manufacturerName === 'Hochiki');
check('a string manufacturer carries no confidence', stringManufacturer?.manufacturerConfidence === null);

const blankFields = normalizeSurveyDevice({
  type: 'panel',
  label: '   ',
  notes: '',
  manufacturer: '   ',
});
check('a blank label becomes null', blankFields?.label === null);
check('blank notes become null', blankFields?.notes === null);
check('a blank manufacturer becomes null', blankFields?.manufacturerName === null);

const identified = normalizeSurveyDevice({ type: 'vad', identifiedByUser: true });
check('an explicitly identified device is marked', identified?.identifiedByUser === true);

// --- Diary summary --------------------------------------------------------------------------

const survey: FireAlarmSurveyDetail = {
  id: 7,
  sessionId: 'session-7',
  name: 'Riverside House — ground floor',
  status: 'completed',
  deviceCount: 2,
  roomCount: 1,
  units: 'meters',
  customerId: 3,
  customerName: 'Riverside Ltd',
  serviceM8: jobLink,
  startedAt: '2026-10-27T09:00:00.000Z',
  completedAt: '2026-10-27T10:00:00.000Z',
  createdAt: '2026-10-27T09:00:00.000Z',
  updatedAt: '2026-10-27T10:00:00.000Z',
  devices: [
    {
      id: 1,
      externalDeviceId: 'device-1',
      deviceType: 'detector',
      label: 'Smoke detector',
      manufacturerName: 'Apollo',
      locationX: 1,
      locationY: 2,
      locationZ: null,
      notes: null,
      roomId: 'room-1',
    },
    {
      id: 2,
      externalDeviceId: 'device-2',
      deviceType: 'sounder',
      label: null,
      manufacturerName: null,
      locationX: null,
      locationY: null,
      locationZ: null,
      notes: null,
      roomId: null,
    },
  ],
  zonePlan: {
    id: 1,
    title: 'Ground floor',
    shareToken: 'token-abc',
    viewerPath: '/plan/token-abc',
    emailedTo: 'office@riverside.test',
    updatedAt: '2026-10-27T10:00:00.000Z',
  },
};

const summary = buildDiarySummary(survey);

check('the diary summary names the survey', summary.includes('Riverside House — ground floor'));
check('the diary summary carries the job number', summary.includes('ServiceM8 job: 1042'));
check('the diary summary carries the client', summary.includes('Client: Riverside Ltd'));
check('the diary summary links the zone plan', summary.includes('/plan/token-abc'));
check('the diary summary lists a labelled device', summary.includes('detector: Smoke detector — Apollo'));
check('the diary summary falls back to the type', summary.includes('sounder: sounder'));
check('the diary summary ends with a newline', summary.endsWith('\n'));

const emptySummary = buildDiarySummary({
  ...survey,
  devices: [],
  deviceCount: 0,
  serviceM8: null,
  customerName: null,
  zonePlan: null,
});
check('an empty survey says so', emptySummary.includes('(none identified)'));
check('an unlinked survey has no job line', !emptySummary.includes('ServiceM8 job:'));

if (failures > 0) {
  console.error(`\n${failures} fire alarm survey check(s) failed`);
  process.exit(1);
}

console.log('\nall fire alarm survey checks passed');
