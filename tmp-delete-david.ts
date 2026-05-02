import { client } from './lib/db/drizzle';

async function main() {
  const targetEmail = 'davidc@total-firesolutions.com';

  const existing = await client`
    select id, name, email, deleted_at as "deletedAt", status
    from users
    where email = ${targetEmail}
    limit 1
  `;

  console.log(JSON.stringify(existing, null, 2));

  if (existing.length === 0) {
    console.log('No matching user found');
    return;
  }

  const user = existing[0];

  await client`
    delete from users
    where id = ${user.id}
  `;

  const remaining = await client`
    select id, name, email
    from users
    where email = ${targetEmail}
    limit 1
  `;

  console.log(JSON.stringify({ remaining }, null, 2));
  console.log(`Deleted user ${user.id} (${user.email})`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
