import { ListObjectsV2Command } from '@aws-sdk/client-s3';
import { NextResponse } from 'next/server';

import { isAdmin } from '@/lib/auth/admin';
import { getR2BucketName, getR2Client } from '@/lib/storage/r2';

export const dynamic = 'force-dynamic';

const BACKUP_PREFIX = 'database-backups/';

type BackupItem = {
  objectKey: string;
  bucket: string;
  size: number | null;
  timestamp: string | null;
  lastModified: string | null;
};

function isBackupObjectKey(key: string): boolean {
  return /^database-backups\/\d{4}\/\d{2}\/[A-Za-z0-9._-]+\.sql\.gz$/.test(key);
}

function toBackupItem(bucket: string, entry: { Key?: string; Size?: number; LastModified?: Date }): BackupItem | null {
  const objectKey = entry.Key;

  if (!objectKey || !isBackupObjectKey(objectKey)) {
    return null;
  }

  const lastModified = entry.LastModified?.toISOString() ?? null;

  return {
    objectKey,
    bucket,
    size: typeof entry.Size === 'number' ? entry.Size : null,
    timestamp: lastModified,
    lastModified,
  };
}

export async function GET() {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const client = getR2Client();
    const bucket = getR2BucketName();
    const backups: BackupItem[] = [];
    let continuationToken: string | undefined;

    do {
      const response = await client.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: BACKUP_PREFIX,
          ContinuationToken: continuationToken,
          MaxKeys: 1000,
        })
      );

      for (const entry of response.Contents ?? []) {
        const backup = toBackupItem(bucket, entry);

        if (backup) {
          backups.push(backup);
        }
      }

      continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
    } while (continuationToken);

    backups.sort((a, b) => {
      const aTime = a.lastModified ? new Date(a.lastModified).getTime() : 0;
      const bTime = b.lastModified ? new Date(b.lastModified).getTime() : 0;
      return bTime - aTime;
    });

    return NextResponse.json({
      success: true,
      backups,
      count: backups.length,
    });
  } catch (error) {
    console.error('Error listing database backups:', error);

    const message = error instanceof Error ? error.message : 'Failed to list database backups';

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
