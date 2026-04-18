const { SignJWT } = require('jose');

async function main() {
  const key = new TextEncoder().encode(process.env.AUTH_SECRET);
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const token = await new SignJWT({
    user: { id: 209 },
    expires,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1 day from now')
    .sign(key);

  process.stdout.write(token);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
