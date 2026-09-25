const fs = require('fs');
const dotenv = require('dotenv');

function hostOf(url) {
  try {
    const u = new URL(url);
    return u.host + u.pathname;
  } catch {
    return '(invalid)';
  }
}

function readVar(file, key) {
  if (!fs.existsSync(file)) return null;
  const text = fs.readFileSync(file, 'utf8');
  const m = text.match(new RegExp('^' + key + '="?([^"\\n]+)', 'm'));
  return m ? m[1].trim() : null;
}

const out = [];
const log = (m) => {
  out.push(m);
  fs.writeFileSync('tmp-forge-session-out.txt', out.join('\n'));
};

// Match Next.js precedence: .env.production, then .env.local overrides it.
dotenv.config({ path: '.env.production' });
dotenv.config({ path: '.env.local', override: true });

for (const f of ['.env.local', '.env.production']) {
  const p = readVar(f, 'POSTGRES_URL') || readVar(f, 'DATABASE_URL');
  log(f + ' POSTGRES_URL host -> ' + (p ? hostOf(p) : '(unset)'));
}

const url = process.env.POSTGRES_URL || process.env.DATABASE_URL || '';
log('effective host -> ' + (url ? hostOf(url) : '(none)'));

async function main() {
  if (!url) {
    log('No DB url');
    return;
  }
  const postgres = require('postgres');
  const client = postgres(url, { max: 1, connect_timeout: 20 });
  let userRows = [];
  try {
    userRows = await client`
      select u.id, u.email, u.role, u.status, u.team_id
      from users u
      join team_members tm on tm.user_id = u.id
      where u.deleted_at is null
      order by (u.role = 'admin') desc, u.id asc
      limit 10`;
    log('users with team_members (first 10): ' + JSON.stringify(userRows));
  } catch (e) {
    log('user query error: ' + e.message);
  }
  await client.end();

  const wantedId = process.argv[2] ? Number(process.argv[2]) : null;
  const chosen = wantedId
    ? userRows.find((r) => r.id === wantedId) || userRows[0]
    : userRows.find((r) => r.role === 'admin') || userRows[0];

  if (!chosen) {
    log('No user found to forge a session for');
    return;
  }
  log('chosen user: ' + JSON.stringify(chosen));

  const { SignJWT } = require('jose');
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    log('AUTH_SECRET missing');
    return;
  }
  const key = new TextEncoder().encode(secret);
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const token = await new SignJWT({ user: { id: chosen.id }, expires })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1 day from now')
    .sign(key);

  fs.writeFileSync('tmp-session-cookie.txt', token);
  log('session token written (' + token.length + ' chars)');
}

main().catch((e) => log('FATAL: ' + (e && e.stack ? e.stack : e)));
