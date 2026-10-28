import { describeBuild, formatBuildDate } from '../lib/build-info-format';

/**
 * The login/unlock footer is the one place a user can tell which build they are running, so the
 * formatting has to be predictable and must never print "Invalid Date".
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

// --- Date formatting ----------------------------------------------------------------------

const formatted = formatBuildDate('2026-10-28T01:30:00Z');
check('an ISO timestamp formats', typeof formatted === 'string' && formatted.length > 0);
check('the year is present', Boolean(formatted?.includes('2026')), String(formatted));
check('the day is present', Boolean(formatted && /\b2[78]\b/.test(formatted)), String(formatted));
check(
  'the month is present',
  Boolean(formatted && /Oct/i.test(formatted)),
  String(formatted),
);

check('empty input yields null', formatBuildDate('') === null);
check('garbage input yields null', formatBuildDate('not-a-date') === null);

// --- The label ----------------------------------------------------------------------------

const withDate = describeBuild({ version: '1.2.3', buildNumber: '42', builtOn: '28 Oct 2026' });
check('the label carries the version', withDate.includes('v1.2.3'), withDate);
check('the label carries the build number', withDate.includes('(42)'), withDate);
check('the label carries the date', withDate.includes('built 28 Oct 2026'), withDate);

const withoutDate = describeBuild({ version: '1.0.0', buildNumber: '10', builtOn: null });
check('a build with no timestamp still shows version and build', withoutDate === 'v1.0.0 (10)', withoutDate);
check('a missing timestamp is never shown as Invalid Date', !/invalid/i.test(withoutDate));

const unknownBuild = describeBuild({ version: '1.0.0', buildNumber: '—', builtOn: null });
check('an unknown build number degrades to a dash', unknownBuild === 'v1.0.0 (—)', unknownBuild);

if (failures > 0) {
  console.error(`\n${failures} build info check(s) failed`);
  process.exit(1);
}

console.log('\nall build info checks passed');
