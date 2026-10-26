/**
 * Verifies the pure pieces behind the RoomPlan review screen's manual device
 * entry: the device factory, the append reducer used when the inspector taps
 * "Add manual device", and session param parsing.
 *
 * Run with: npx tsx scripts/verify-roomplan-review.ts
 */
import {
  buildEmptySession,
  createManualDevice,
  parseSessionParam,
  type EditableDevice,
} from '../components/roomplan/review-types';

let failures = 0;

function check(name: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`PASS  ${name}`);
    return;
  }

  failures += 1;
  console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
}

// Every tap must produce a distinct, editable row that is already reviewed.
const first = createManualDevice('session-a');
const second = createManualDevice('session-a');

check('manual device gets a unique id', first.id !== second.id, `${first.id} vs ${second.id}`);
check('manual device starts as an unknown type', first.type === 'unknown', first.type);
check('manual device records its source', first.source === 'manual', String(first.source));
check('manual device is pre-marked reviewed', first.reviewed === true);
check('manual device carries the session id', first.metadata?.sessionId === 'session-a');
check('manual device has a position', first.location?.x === 0 && first.location?.y === 0);

// The screen appends with a functional update; adding twice must keep both.
let devices: EditableDevice[] = [];
const appendManualDevice = () => {
  devices = [...devices, createManualDevice('session-a')];
};

appendManualDevice();
appendManualDevice();

check('two adds produce two rows', devices.length === 2, `length ${devices.length}`);
check('added rows are distinct', devices[0].id !== devices[1].id);

// Editing one row must not disturb the other.
devices = devices.map((device, index) =>
  index === 1 ? { ...device, type: 'sounder' as const, notes: 'kitchen ceiling' } : device,
);

check('editing a row leaves the sibling untouched', devices[0].type === 'unknown', devices[0].type);
check('editing a row keeps the edit', devices[1].type === 'sounder', devices[1].type);

// Sessions: a supplied id survives, a missing one is generated.
check('empty session keeps a supplied id', buildEmptySession('session-z').id === 'session-z');
check('empty session generates an id', buildEmptySession().id.startsWith('manual-session-'));
check('empty session starts with no devices', buildEmptySession('session-z').devices.length === 0);

const parsed = parseSessionParam(
  JSON.stringify({
    id: 'session-p',
    status: 'completed',
    metadata: { startedAt: new Date().toISOString() },
    devices: [{ id: 'd1', type: 'detector', source: 'roomplan' }],
  }),
);

check('session param parses', parsed?.id === 'session-p', String(parsed?.id));
check('session param keeps devices', parsed?.devices.length === 1, String(parsed?.devices.length));
check('an array param is unwrapped', parseSessionParam(['{"id":"session-arr"}'])?.id === 'session-arr');
check('a malformed param is rejected', parseSessionParam('{not json') === null);
check('an absent param is rejected', parseSessionParam(undefined) === null);

if (failures > 0) {
  console.error(`\n${failures} room-plan review check(s) failed`);
  process.exit(1);
}

console.log('\nall room-plan review checks passed');
