import dotenv from 'dotenv';
import postgres from 'postgres';

dotenv.config({ path: '.env.local' });

/**
 * Round-trips a survey through the real database.
 *
 * The unit checks prove the rules; this proves the wiring. It saves a survey
 * with devices and a ServiceM8 link, reads it back the way the dashboard does,
 * renames it, then deletes it — so nothing is left behind in a shared database.
 *
 * An existing team is reused rather than created, and the session id is stamped
 * so the test row is unmistakable if a run is interrupted.
 */

async function main() {
  const url = process.env.POSTGRES_URL;

  if (!url) {
    console.error('POSTGRES_URL is not set (expected in .env.local)');
    process.exit(1);
  }

  const sql = postgres(url, { max: 1, onnotice: () => {} });

  const [owner] = await sql<{ team_id: number; created_by: number | null }[]>`
    select team_id, created_by
    from fire_alarm_room_captures
    where created_by is not null
    order by id desc
    limit 1
  `;

  await sql.end();

  if (!owner) {
    console.error('No existing capture with a creator found — cannot pick a team to test against.');
    process.exit(1);
  }

  // Loaded after dotenv so the pool picks up POSTGRES_URL from .env.local.
  const { saveFireAlarmSurvey } = await import('../lib/fire-alarm/survey-writer');
  const {
    deleteFireAlarmSurvey,
    getFireAlarmSurvey,
    listFireAlarmSurveys,
    updateFireAlarmSurvey,
  } = await import('../lib/fire-alarm/survey-repository');

  const sessionId = `verify-survey-${Date.now()}`;
  const teamId = owner.team_id;

  let failures = 0;

  function check(name: string, condition: boolean, detail?: string) {
    if (condition) {
      console.log(`PASS  ${name}`);
      return;
    }

    failures += 1;
    console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }

  console.log(`team ${teamId}, session ${sessionId}\n`);

  const saved = await saveFireAlarmSurvey({
    teamId,
    userId: owner.created_by,
    session: {
      id: sessionId,
      status: 'completed',
      metadata: {
        startedAt: new Date().toISOString(),
        sessionName: 'Round-trip verification',
      },
      floorplan: { units: 'meters', rooms: [{ id: 'room-1' }], deviceCount: 2, wallCount: 4 },
    },
    devices: [
      {
        id: 'verify-device-1',
        type: 'detector',
        label: 'Smoke detector',
        manufacturer: { name: 'Apollo', confidence: 0.9 },
        location: { x: 1.25, y: 2.5 },
        roomId: 'room-1',
      },
      {
        id: 'verify-device-2',
        type: 'sounder',
        label: 'Sounder',
        location: { x: 3, y: 4 },
        roomId: 'room-1',
      },
      { id: 'verify-device-3', type: 'unknown' },
    ],
    metadata: { verificationRun: true },
    update: {
      name: 'Round-trip verification',
      status: 'completed',
      serviceM8: {
        companyUuid: 'verify-company',
        companyName: 'Verification Ltd',
        jobUuid: 'verify-job',
        jobNumber: '9999',
        jobDate: '2026-10-28',
        jobAddress: '1 Test Way',
      },
    },
  });

  check('the survey is created', saved.surveyId > 0, String(saved.surveyId));
  check('only typed devices are stored', saved.deviceCount === 2, String(saved.deviceCount));
  check('the survey is completed', saved.status === 'completed');

  const detail = await getFireAlarmSurvey(teamId, saved.surveyId);

  check('the survey reads back', detail !== null);
  check('the name survives', detail?.name === 'Round-trip verification', detail?.name);
  check('the status survives', detail?.status === 'completed', detail?.status);
  check('the device count survives', detail?.deviceCount === 2, String(detail?.deviceCount));
  check('the room count survives', detail?.roomCount === 1, String(detail?.roomCount));
  check('the devices are listed', detail?.devices.length === 2, String(detail?.devices.length));
  check(
    'device detail survives',
    detail?.devices.some(
      (device) =>
        device.deviceType === 'detector' &&
        device.label === 'Smoke detector' &&
        device.manufacturerName === 'Apollo' &&
        device.locationX === 1.25,
    ) === true,
  );
  check('the ServiceM8 job survives', detail?.serviceM8?.jobNumber === '9999');
  check('the job address survives', detail?.serviceM8?.jobAddress === '1 Test Way');
  check('the client name survives', detail?.serviceM8?.companyName === 'Verification Ltd');

  const list = await listFireAlarmSurveys(teamId);
  check(
    'the survey appears in the dashboard list',
    list.some((survey) => survey.id === saved.surveyId),
  );

  const renamed = await updateFireAlarmSurvey(teamId, saved.surveyId, {
    name: 'Renamed verification',
    status: 'draft',
  });
  check('a rename applies', renamed?.name === 'Renamed verification', renamed?.name);
  check('a status change applies', renamed?.status === 'draft', renamed?.status);

  const deleted = await deleteFireAlarmSurvey(teamId, saved.surveyId);
  check('the survey deletes', deleted);
  check('it is gone afterwards', (await getFireAlarmSurvey(teamId, saved.surveyId)) === null);

  const backupSql = postgres(url, { max: 1, onnotice: () => {} });
  const [leftovers] = await backupSql<{ count: string }[]>`
    select count(*)::text as count
    from fire_alarm_room_captures
    where external_session_id like 'verify-survey-%'
  `;
  await backupSql.end();

  check('no verification rows are left behind', leftovers.count === '0', leftovers.count);

  if (failures > 0) {
    console.error(`\n${failures} round-trip check(s) failed`);
    process.exit(1);
  }

  console.log('\nall round-trip checks passed');

  // The Drizzle pool is intentionally long-lived and would keep the process
  // alive after the checks finish, so the run ends here.
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
