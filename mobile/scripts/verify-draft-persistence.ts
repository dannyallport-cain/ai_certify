import type { JobState } from '../components/JobStateContext';
import {
  DRAFT_TTL_MS,
  DRAFT_VERSION,
  buildPersistedDraft,
  hasMeaningfulDraft,
  parseStoredDraft,
} from '../services/draft-payload';
import {
  FIRE_ALARM_FLOW_VERSION,
  buildPersistedFireAlarmFlow,
  hasMeaningfulFireAlarmFlow,
  parseStoredFireAlarmFlow,
} from '../services/fire-alarm-flow-payload';

/**
 * The draft is what lets an engineer leave the app and come back to a
 * half-captured certificate, so two things must always hold: work worth
 * restoring is written, and nothing that should stay in the keychain (session
 * token, contact details) ever reaches the file.
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

function buildState(overrides: Partial<JobState> = {}): JobState {
  return {
    selectedCustomer: null,
    gpsAddress: '',
    gpsCoords: null,
    capturedImages: [],
    analysisResult: null,
    createdCertificate: null,
    selectedServiceM8Job: null,
    selectedServiceM8JobDetail: null,
    selectedServiceM8Client: null,
    importedServiceM8Images: [],
    wizard: {
      inspectionDate: '2026-10-28',
      certificateType: 'EICR',
      dataEntryMode: 'guided_photo',
      reportPurpose: null,
      installationType: null,
      occupancyType: null,
      supplyPhase: null,
      hasOutbuildingsOrAncillarySupplies: null,
      consumerUnitMaterial: null,
      distributionBoardCount: 1,
      hasRcdProtection: null,
      hasRcboProtection: null,
      hasSurgeProtectionDevice: null,
      hasEvCharger: null,
      hasSolarPv: null,
      hasBatteryStorage: null,
      hasAfddProtection: null,
      hasCommunalOrLandlordSupplies: null,
      hasDamagedAccessory: null,
      hasDamagedLuminaire: null,
      storeyCount: 1,
      smokeDetectorCount: 0,
      hasSolidFuelAppliance: null,
      coDetectorTested: false,
      activeCaptureType: null,
      activeCaptureLabel: null,
      activeCaptureSlotIndex: null,
    },
    ...overrides,
  };
}

// --- When a draft exists --------------------------------------------------------------------

check('an untouched job is not a draft', !hasMeaningfulDraft(buildState()));

check(
  'a wizard answer makes it a draft',
  hasMeaningfulDraft(
    buildState({
      wizard: { ...buildState().wizard, reportPurpose: 'change_of_tenancy' },
    }),
  ),
);

check(
  'a captured photo makes it a draft',
  hasMeaningfulDraft(
    buildState({
      capturedImages: [{ uri: 'file:///photo.jpg', mode: 'consumer_unit' }],
    }),
  ),
);

check(
  'a chosen customer makes it a draft',
  hasMeaningfulDraft(
    buildState({
      selectedCustomer: {
        id: 42,
        name: 'Acme Ltd',
        email: 'site@acme.test',
        phone: '07700 900000',
        address: '1 High Street',
        postcode: 'AB1 2CD',
        contactPerson: 'Jo Bloggs',
      },
    }),
  ),
);

check(
  'a submitted certificate is never a draft',
  !hasMeaningfulDraft(
    buildState({
      createdCertificate: { id: 9, certificateNumber: 'EICR-9' },
      gpsAddress: '1 High Street',
    }),
  ),
);

// --- What reaches the disk ------------------------------------------------------------------

const withContactDetails = buildState({
  gpsAddress: '1 High Street',
  gpsCoords: { latitude: 51.5, longitude: -0.12 },
  selectedCustomer: {
    id: 42,
    name: 'Acme Ltd',
    email: 'site@acme.test',
    phone: '07700 900000',
    address: '1 High Street',
    postcode: 'AB1 2CD',
    contactPerson: 'Jo Bloggs',
  },
  capturedImages: [{ uri: 'file:///photo.jpg', mode: 'consumer_unit', type: 'bonding' }],
});

const persisted = buildPersistedDraft(withContactDetails, new Date('2026-10-28T09:00:00Z'));
const raw = JSON.stringify(persisted);

check('the customer id is kept', persisted.selectedCustomer?.id === 42);
check('the customer name is kept', persisted.selectedCustomer?.name === 'Acme Ltd');
check('the customer email is not persisted', !raw.includes('site@acme.test'));
check('the customer phone is not persisted', !raw.includes('07700 900000'));
check('the customer address is not persisted', !raw.includes('"address":"1 High Street"'));
check('the postcode is not persisted', !raw.includes('AB1 2CD'));
check('the contact person is not persisted', !raw.includes('Jo Bloggs'));
check('no session token is persisted', !/token|password|secret|bearer/i.test(raw));
check('the site address is kept', persisted.gpsAddress === '1 High Street');
check('captured photos are kept', persisted.capturedImages.length === 1);
check('the job detail is not part of the payload', !raw.includes('selectedServiceM8JobDetail'));

// --- Reading it back ------------------------------------------------------------------------

const savedAt = new Date('2026-10-28T09:00:00Z').getTime();

const fresh = parseStoredDraft(raw, savedAt + 60 * 60 * 1000);
check('a draft saved an hour ago loads', fresh.status === 'ok');
if (fresh.status === 'ok') {
  check('the restored wizard keeps its answers', fresh.draft.wizard.inspectionDate === '2026-10-28');
  check('the restored photos survive', fresh.draft.capturedImages.length === 1);
  check(
    'the restored coordinates survive',
    fresh.draft.gpsCoords?.latitude === 51.5 && fresh.draft.gpsCoords?.longitude === -0.12,
  );
}

check(
  'a draft older than the TTL is dropped',
  parseStoredDraft(raw, savedAt + DRAFT_TTL_MS + 1000).status === 'expired',
);

check(
  'a draft exactly at the TTL still loads',
  parseStoredDraft(raw, savedAt + DRAFT_TTL_MS).status === 'ok',
);

check(
  'a draft stamped in the future is dropped',
  parseStoredDraft(raw, savedAt - 60 * 1000).status === 'expired',
);

check('corrupt JSON is rejected', parseStoredDraft('{not json', savedAt).status === 'invalid');

check(
  'an older schema version is rejected',
  parseStoredDraft(JSON.stringify({ ...persisted, version: DRAFT_VERSION - 1 }), savedAt).status ===
    'invalid',
);

check(
  'a payload without a wizard is rejected',
  parseStoredDraft(JSON.stringify({ version: DRAFT_VERSION, savedAt: persisted.savedAt }), savedAt)
    .status === 'invalid',
);

// --- Partial files --------------------------------------------------------------------------

const sparse = parseStoredDraft(
  JSON.stringify({ version: DRAFT_VERSION, savedAt: persisted.savedAt, wizard: persisted.wizard }),
  savedAt,
);
check('a sparse but valid draft loads', sparse.status === 'ok');
if (sparse.status === 'ok') {
  check('missing photos default to none', sparse.draft.capturedImages.length === 0);
  check('a missing address defaults to empty', sparse.draft.gpsAddress === '');
  check('a missing customer stays null', sparse.draft.selectedCustomer === null);
}

// --- Fire alarm flow ------------------------------------------------------------------------

check('an idle fire alarm flow is not stored', !hasMeaningfulFireAlarmFlow(null, []));
check('a session alone is worth storing', hasMeaningfulFireAlarmFlow('session-1', []));
check('a ticked step alone is worth storing', hasMeaningfulFireAlarmFlow(null, ['scan']));

const flow = buildPersistedFireAlarmFlow(
  'session-1',
  ['scan', 'identify'],
  {
    savedAt: new Date('2026-10-28T09:00:00Z'),
    surveyName: 'Riverside House',
    serviceM8Job: {
      uuid: 'job-uuid-1',
      jobNumber: '1042',
      jobDate: '2026-10-27',
      companyUuid: 'company-uuid-1',
      companyName: 'Riverside Ltd',
      address: '1 Riverside Way',
    },
  },
);
const flowRaw = JSON.stringify(flow);
const flowSavedAt = new Date('2026-10-28T09:00:00Z').getTime();

check('the flow keeps its session', flow.sessionId === 'session-1');
check('the flow keeps its completed steps', flow.completedSteps.join(',') === 'scan,identify');
check('the flow keeps the survey name', flow.surveyName === 'Riverside House');
check('the flow keeps the chosen job', flow.serviceM8Job?.uuid === 'job-uuid-1');
check('the flow stores no customer data', !/customer|email|token/i.test(flowRaw));

const restoredFlow = parseStoredFireAlarmFlow(flowRaw, flowSavedAt + 60 * 1000);
check('a recent flow restores', restoredFlow.status === 'ok');
if (restoredFlow.status === 'ok') {
  check('the restored session matches', restoredFlow.flow.sessionId === 'session-1');
  check('the restored steps match', restoredFlow.flow.completedSteps.length === 2);
  check('the restored survey name matches', restoredFlow.flow.surveyName === 'Riverside House');
  check('the restored job matches', restoredFlow.flow.serviceM8Job?.jobNumber === '1042');
}

check(
  'an expired flow is dropped',
  parseStoredFireAlarmFlow(flowRaw, flowSavedAt + DRAFT_TTL_MS + 1000).status === 'expired',
);

check(
  'a flow from an unknown schema is rejected',
  parseStoredFireAlarmFlow(
    JSON.stringify({ ...flow, version: FIRE_ALARM_FLOW_VERSION + 1 }),
    flowSavedAt,
  ).status === 'invalid',
);

check(
  'a version 1 flow still restores without the survey fields',
  (() => {
    const legacy = parseStoredFireAlarmFlow(
      JSON.stringify({
        version: 1,
        savedAt: flow.savedAt,
        sessionId: 'session-legacy',
        completedSteps: ['scan'],
      }),
      flowSavedAt,
    );

    return (
      legacy.status === 'ok' &&
      legacy.flow.surveyName === null &&
      legacy.flow.serviceM8Job === null
    );
  })(),
);

const unknownSteps = parseStoredFireAlarmFlow(
  JSON.stringify({
    version: FIRE_ALARM_FLOW_VERSION,
    savedAt: flow.savedAt,
    sessionId: 'session-2',
    completedSteps: ['scan', 'not-a-step', 'plan'],
  }),
  flowSavedAt,
);
check('unknown steps are dropped, not trusted', unknownSteps.status === 'ok');
if (unknownSteps.status === 'ok') {
  check(
    'only real steps survive',
    unknownSteps.flow.completedSteps.join(',') === 'scan,plan',
    unknownSteps.flow.completedSteps.join(','),
  );
}

check(
  'an empty flow is rejected rather than restored',
  parseStoredFireAlarmFlow(
    JSON.stringify({
      version: FIRE_ALARM_FLOW_VERSION,
      savedAt: flow.savedAt,
      sessionId: null,
      completedSteps: [],
    }),
    flowSavedAt,
  ).status === 'invalid',
);

check(
  'a corrupt flow is rejected',
  parseStoredFireAlarmFlow('{oops', flowSavedAt).status === 'invalid',
);

if (failures > 0) {
  console.error(`\n${failures} draft persistence check(s) failed`);
  process.exit(1);
}

console.log('\nall draft persistence checks passed');
