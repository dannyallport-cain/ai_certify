const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');

const key = 'database-backups/2026/04/ai-certify-db-20260410-112529.sql.gz';
const required = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET'];

for (const name of required) {
  if (!process.env[name]) {
    throw new Error(`Missing required env: ${name}`);
  }
}

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

async function main() {
  await client.send(
    new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key,
    }),
  );

  console.log(JSON.stringify({ success: true, key }));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
