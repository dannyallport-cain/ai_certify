const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.production' });
dotenv.config({ path: '.env.local', override: true });

const out = [];
const log = (m) => {
  out.push(m);
  fs.writeFileSync('tmp-hash-test-out.txt', out.join('\n'));
};

function java31(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(h, 31) + str.charCodeAt(i)) | 0;
  }
  return h;
}

function djb2(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(h, 33) + str.charCodeAt(i)) | 0;
  }
  return h;
}

function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) | 0;
  }
  return h;
}

function sdbm(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (str.charCodeAt(i) + (h << 6) + (h << 16) - h) | 0;
  }
  return h;
}

function crc32(str) {
  let c;
  const table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < str.length; i++) {
    crc = table[(crc ^ str.charCodeAt(i)) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const CANDIDATES = {
  'java31.abs': (s) => Math.abs(java31(s)),
  'java31.>>>0': (s) => java31(s) >>> 0,
  'java31.abs.neg-safe': (s) => java31(s) >>> 0,
  'djb2.abs': (s) => Math.abs(djb2(s)),
  'djb2.>>>0': (s) => djb2(s) >>> 0,
  'fnv1a.abs': (s) => Math.abs(fnv1a(s)),
  'fnv1a.>>>0': (s) => fnv1a(s) >>> 0,
  'sdbm.abs': (s) => Math.abs(sdbm(s)),
  'crc32': (s) => crc32(s),
};

async function main() {
  const url = process.env.POSTGRES_URL || process.env.DATABASE_URL || '';
  if (!url) {
    log('no db url');
    return;
  }

  const postgres = require('postgres');
  const { drizzle } = require('drizzle-orm/postgres-js');
  const { sql } = require('drizzle-orm');

  const client = postgres(url, { max: 1, connect_timeout: 20 });
  const db = drizzle(client);

  const teamId = 1;
  let message = null;
  try {
    await db.execute(sql`select "id", "team_id", "created_by", "external_session_id", "session_name", "capture_status", "units", "started_at", "ended_at", "device_count", "metadata", "created_at", "updated_at" from "fire_alarm_room_captures" where "fire_alarm_room_captures"."team_id" = ${teamId} order by "fire_alarm_room_captures"."updated_at" desc limit ${1}`);
    log('query unexpectedly succeeded');
  } catch (e) {
    message = e && e.message;
    log('error.name: ' + (e && e.constructor && e.constructor.name));
    log('error.code: ' + String(e && e.code));
    log('error.cause.code: ' + String(e && e.cause && e.cause.code));
    log('MESSAGE_JSON(teamId=1): ' + JSON.stringify(message));
  }
  await client.end();

  if (!message) return;

  log('--- hash candidates for observed digest 356633775 ---');
  for (const [name, fn] of Object.entries(CANDIDATES)) {
    const s = String(fn(message));
    log('  ' + name + ' -> ' + s + (s === '356633775' ? '   <== MATCH' : ''));
  }

  // Also try hashing with an "Error: " prefix
  log('--- with "Error: " prefix ---');
  for (const [name, fn] of Object.entries(CANDIDATES)) {
    const s = String(fn('Error: ' + message));
    if (s === '356633775') log('  ' + name + ' -> ' + s + '   <== MATCH');
  }

  // Brute force a teamId whose digest is the reported 1870007015 using the matching fn
  const matched = Object.entries(CANDIDATES).find(([, fn]) => String(fn(message)) === '356633775');
  if (!matched) {
    log('No hash candidate matched the local digest; cannot brute-force teamId.');
    return;
  }
  const [fnName, fn] = matched;
  log('using hash fn: ' + fnName);
  for (let id = 1; id <= 400; id++) {
    const candidateMsg = message.replace('params: 1,1', 'params: ' + id + ',1');
    if (String(fn(candidateMsg)) === '1870007015') {
      log('MATCH: teamId=' + id + ' produces reported digest 1870007015');
    }
  }
  log('brute force complete');
}

main().catch((e) => log('FATAL: ' + (e && e.stack ? e.stack : e)));
