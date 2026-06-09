import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';

import { getCurrentUser } from '@/lib/auth/admin';
import { db } from '@/lib/db/drizzle';
import { teams, users, type EicrProfileDefaults } from '@/lib/db/schema';
import {
  ServiceM8Client_API,
  type ServiceM8CompanyContact,
  type ServiceM8AttachmentDownloadInfo,
} from '@/lib/servicem8/client';

type EicrField =
  | 'tradingTitle'
  | 'companyAddress'
  | 'companyTelephone'
  | 'companyEmail'
  | 'registrationNumber';

type UserField = 'name' | 'email';
type TeamField = 'name';

type OverwriteDecisions = Partial<
  Record<EicrField | UserField | TeamField | 'teamLogo', boolean>
>;

type ImportTargets = {
  userProfile?: boolean;
  teamProfile?: boolean;
  eicrDefaults?: boolean;
};

type ImportRequestBody = {
  dryRun?: boolean;
  overwrite?: OverwriteDecisions;
  applyTeamLogo?: boolean;
  overwriteTeamLogo?: boolean;
  targets?: ImportTargets;
};

type ConflictItem = {
  target: 'userProfile' | 'teamProfile' | 'eicrDefaults' | 'teamLogo';
  field: string;
  existingValue: string;
  incomingValue: string;
};

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function isTruthyText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function formatCompanyAddress(company: {
  address: string | null;
  city: string | null;
  state: string | null;
  postcode: string | null;
  country: string | null;
}): string {
  const parts = [
    company.address,
    company.city,
    company.state,
    company.postcode,
    company.country,
  ].filter(isTruthyText);

  return parts.join(', ').trim();
}

function pickPrimaryContact(
  contacts: ServiceM8CompanyContact[]
): ServiceM8CompanyContact | null {
  if (!contacts.length) return null;

  const explicitlyPrimary = contacts.find(
    (contact) =>
      normalizeText(contact.is_primary_contact).toLowerCase() === '1' ||
      normalizeText(contact.is_primary_contact).toLowerCase() === 'true'
  );
  if (explicitlyPrimary) return explicitlyPrimary;

  return contacts[0] ?? null;
}

function sanitizeExistingDefaults(value: unknown): EicrProfileDefaults {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

  const source = value as Record<string, unknown>;
  return {
    tradingTitle: normalizeText(source.tradingTitle),
    companyAddress: normalizeText(source.companyAddress),
    registrationNumber: normalizeText(source.registrationNumber),
    companyTelephone: normalizeText(source.companyTelephone),
    companyEmail: normalizeText(source.companyEmail),
    approvalSchemes: Array.isArray(source.approvalSchemes)
      ? source.approvalSchemes.filter((item): item is string => typeof item === 'string')
      : undefined,
  };
}

function isValidEmail(email: string): boolean {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

const MAX_LOGO_BYTES = 2 * 1024 * 1024;

function isSupportedLogoMimeType(mimeType: string | null): boolean {
  if (!mimeType) return false;
  const normalized = mimeType.toLowerCase();
  return (
    normalized === 'image/png' ||
    normalized === 'image/jpeg' ||
    normalized === 'image/jpg' ||
    normalized === 'image/webp' ||
    normalized === 'image/gif' ||
    normalized === 'image/svg+xml'
  );
}

function inferLogoMimeType(downloadInfo: ServiceM8AttachmentDownloadInfo): string | null {
  const contentType = normalizeText(downloadInfo.mimeType).toLowerCase();
  if (isSupportedLogoMimeType(contentType)) return contentType;

  const fileName = normalizeText(downloadInfo.fileName).toLowerCase();
  if (fileName.endsWith('.png')) return 'image/png';
  if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) return 'image/jpeg';
  if (fileName.endsWith('.webp')) return 'image/webp';
  if (fileName.endsWith('.gif')) return 'image/gif';
  if (fileName.endsWith('.svg')) return 'image/svg+xml';

  return null;
}

async function fetchServiceM8CompanyLogoDataUri(
  serviceM8Client: ServiceM8Client_API
): Promise<{ dataUri: string } | { error: string }> {
  let downloadInfo: ServiceM8AttachmentDownloadInfo;

  try {
    downloadInfo = await serviceM8Client.getCompanyLogoDownloadInfo();
  } catch {
    return { error: 'ServiceM8 company logo is not available for this account' };
  }

  if (!downloadInfo?.url) {
    return { error: 'ServiceM8 company logo URL could not be resolved' };
  }

  const mimeType = inferLogoMimeType(downloadInfo);
  if (!mimeType) {
    return { error: 'ServiceM8 company logo type is unsupported' };
  }

  if (downloadInfo.contentLength && downloadInfo.contentLength > MAX_LOGO_BYTES) {
    return { error: 'ServiceM8 company logo exceeds size limit (2MB)' };
  }

  let response: Response;
  try {
    response = await fetch(downloadInfo.url);
  } catch {
    return { error: 'Unable to download ServiceM8 company logo' };
  }

  if (!response.ok) {
    return { error: `ServiceM8 company logo download failed (${response.status})` };
  }

  const actualContentType = normalizeText(response.headers.get('content-type'))
    .split(';')[0]
    .trim()
    .toLowerCase();
  const resolvedMimeType = isSupportedLogoMimeType(actualContentType) ? actualContentType : mimeType;

  if (!isSupportedLogoMimeType(resolvedMimeType)) {
    return { error: 'Downloaded ServiceM8 company logo has unsupported type' };
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (!buffer.length) {
    return { error: 'Downloaded ServiceM8 company logo is empty' };
  }

  if (buffer.length > MAX_LOGO_BYTES) {
    return { error: 'Downloaded ServiceM8 company logo exceeds size limit (2MB)' };
  }

  return {
    dataUri: `data:${resolvedMimeType};base64,${buffer.toString('base64')}`,
  };
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as ImportRequestBody;
    const dryRun = body.dryRun !== false;
    const overwrite: OverwriteDecisions = body.overwrite ?? {};
    const applyTeamLogo = body.applyTeamLogo === true;
    const overwriteTeamLogo = body.overwriteTeamLogo === true;
    const targets: Required<ImportTargets> = {
      userProfile: body.targets?.userProfile !== false,
      teamProfile: body.targets?.teamProfile !== false,
      eicrDefaults: body.targets?.eicrDefaults !== false,
    };

    const serviceM8Client = await ServiceM8Client_API.fromUserId(user.id);

    if (!serviceM8Client) {
      return NextResponse.json(
        {
          connected: false,
          error: 'ServiceM8 is not connected for this user/team',
        },
        { status: 400 }
      );
    }

    const companyInfo = await serviceM8Client.getCompanyInfo();
    const contacts = await serviceM8Client.getCompanyContacts().catch(() => []);
    const primaryContact = pickPrimaryContact(contacts);

    const incomingCompanyName = normalizeText(companyInfo.name);
    const incomingAddress = formatCompanyAddress(companyInfo);
    const incomingPhone =
      normalizeText(companyInfo.phone) ||
      normalizeText(primaryContact?.phone) ||
      normalizeText(primaryContact?.mobile);
    const incomingEmail = normalizeText(companyInfo.email) || normalizeText(primaryContact?.email);

    const userRow = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        teamId: users.teamId,
        eicrProfileDefaults: users.eicrProfileDefaults,
      })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    if (!userRow.length) {
      return NextResponse.json({ error: 'User record not found' }, { status: 404 });
    }

    const currentUser = userRow[0];
    const currentDefaults = sanitizeExistingDefaults(currentUser.eicrProfileDefaults);
    const resolvedTeamId = currentUser.teamId ?? null;

    const teamRow = resolvedTeamId
      ? await db
          .select({
            id: teams.id,
            name: teams.name,
            logoDataUri: teams.logoDataUri,
          })
          .from(teams)
          .where(eq(teams.id, resolvedTeamId))
          .limit(1)
      : [];

    const currentTeam = teamRow[0] ?? null;

    const conflicts: ConflictItem[] = [];
    const skipped: Array<{ target: string; field: string; reason: string }> = [];

    const userToApply: Partial<Record<UserField, string>> = {};
    const teamToApply: Partial<Record<TeamField, string>> = {};
    const eicrToApply: Partial<Record<EicrField, string>> = {};

    if (targets.userProfile) {
      const nameIncoming = incomingCompanyName;
      const emailIncoming = incomingEmail;

      if (nameIncoming) {
        const existing = normalizeText(currentUser.name);
        if (!existing) {
          userToApply.name = nameIncoming;
        } else if (existing === nameIncoming) {
          skipped.push({ target: 'userProfile', field: 'name', reason: 'already matches existing value' });
        } else if (overwrite.name === true) {
          userToApply.name = nameIncoming;
        } else {
          conflicts.push({
            target: 'userProfile',
            field: 'name',
            existingValue: existing,
            incomingValue: nameIncoming,
          });
        }
      }

      if (emailIncoming && isValidEmail(emailIncoming)) {
        const existing = normalizeText(currentUser.email);
        if (!existing) {
          userToApply.email = emailIncoming;
        } else if (existing.toLowerCase() === emailIncoming.toLowerCase()) {
          skipped.push({ target: 'userProfile', field: 'email', reason: 'already matches existing value' });
        } else if (overwrite.email === true) {
          userToApply.email = emailIncoming;
        } else {
          conflicts.push({
            target: 'userProfile',
            field: 'email',
            existingValue: existing,
            incomingValue: emailIncoming,
          });
        }
      } else if (emailIncoming && !isValidEmail(emailIncoming)) {
        skipped.push({ target: 'userProfile', field: 'email', reason: 'incoming email is invalid' });
      }
    }

    if (targets.teamProfile) {
      if (!currentTeam) {
        skipped.push({ target: 'teamProfile', field: 'name', reason: 'no team context' });
      } else if (incomingCompanyName) {
        const existing = normalizeText(currentTeam.name);
        if (!existing) {
          teamToApply.name = incomingCompanyName;
        } else if (existing === incomingCompanyName) {
          skipped.push({ target: 'teamProfile', field: 'name', reason: 'already matches existing value' });
        } else if (overwrite.name === true) {
          teamToApply.name = incomingCompanyName;
        } else {
          conflicts.push({
            target: 'teamProfile',
            field: 'name',
            existingValue: existing,
            incomingValue: incomingCompanyName,
          });
        }
      }
    }

    if (targets.eicrDefaults) {
      const incomingDefaults: Partial<Record<EicrField, string>> = {};
      if (incomingCompanyName) incomingDefaults.tradingTitle = incomingCompanyName;
      if (incomingAddress) incomingDefaults.companyAddress = incomingAddress;
      if (incomingPhone) incomingDefaults.companyTelephone = incomingPhone;
      if (incomingEmail) incomingDefaults.companyEmail = incomingEmail;

      for (const [field, incomingValue] of Object.entries(incomingDefaults) as Array<[EicrField, string]>) {
        if (!incomingValue) continue;
        const existingValue = normalizeText(currentDefaults[field]);

        if (!existingValue) {
          eicrToApply[field] = incomingValue;
          continue;
        }

        if (existingValue === incomingValue) {
          skipped.push({ target: 'eicrDefaults', field, reason: 'already matches existing value' });
          continue;
        }

        if (overwrite[field] === true) {
          eicrToApply[field] = incomingValue;
        } else {
          conflicts.push({
            target: 'eicrDefaults',
            field,
            existingValue,
            incomingValue,
          });
        }
      }
    }

    let logoUpdate:
      | { attempted: false; applied: false; reason: string }
      | { attempted: true; applied: false; reason: string }
      | { attempted: true; applied: true; reason: string } = {
      attempted: false,
      applied: false,
      reason: 'logo import not requested',
    };

    let teamLogoToApply: string | null = null;

    if (applyTeamLogo) {
      if (!currentTeam) {
        logoUpdate = {
          attempted: true,
          applied: false,
          reason: 'user has no team context for logo import',
        };
      } else {
        const logoResult = await fetchServiceM8CompanyLogoDataUri(serviceM8Client);
        if ('error' in logoResult) {
          logoUpdate = {
            attempted: true,
            applied: false,
            reason: logoResult.error,
          };
        } else if (currentTeam.logoDataUri && !overwriteTeamLogo && overwrite.teamLogo !== true) {
          conflicts.push({
            target: 'teamLogo',
            field: 'teamLogo',
            existingValue: 'existing team logo present',
            incomingValue: 'servicem8 company logo',
          });
          logoUpdate = {
            attempted: true,
            applied: false,
            reason: 'team logo already exists; overwriteTeamLogo=false',
          };
        } else {
          teamLogoToApply = logoResult.dataUri;
          logoUpdate = {
            attempted: true,
            applied: !dryRun,
            reason: dryRun
              ? 'team logo fetched and ready to apply'
              : 'team logo imported from ServiceM8',
          };
        }
      }
    }

    const updatedFields = {
      userProfile: Object.keys(userToApply) as UserField[],
      teamProfile: Object.keys(teamToApply) as TeamField[],
      eicrDefaults: Object.keys(eicrToApply) as EicrField[],
      logo: logoUpdate.attempted && logoUpdate.applied ? (['teamLogo'] as const) : ([] as const),
    };

    const requiresDecisions = conflicts.length > 0;

    if (dryRun || requiresDecisions) {
      return NextResponse.json({
        connected: true,
        dryRun: true,
        targets,
        incoming: {
          companyName: incomingCompanyName,
          companyAddress: incomingAddress,
          companyTelephone: incomingPhone,
          companyEmail: incomingEmail,
        },
        wouldApply: {
          userProfile: userToApply,
          teamProfile: teamToApply,
          eicrDefaults: eicrToApply,
          ...(teamLogoToApply ? { teamLogo: 'servicem8 company logo' } : {}),
        },
        conflicts,
        skipped,
        updatedFields,
        requiresDecisions,
        logo: logoUpdate,
      });
    }

    if (Object.keys(userToApply).length > 0) {
      await db
        .update(users)
        .set({
          ...userToApply,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));
    }

    if (targets.eicrDefaults && Object.keys(eicrToApply).length > 0) {
      const nextDefaults: EicrProfileDefaults = {
        ...currentDefaults,
        ...eicrToApply,
      };

      await db
        .update(users)
        .set({
          eicrProfileDefaults: nextDefaults,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));
    }

    if (currentTeam && (Object.keys(teamToApply).length > 0 || teamLogoToApply)) {
      await db
        .update(teams)
        .set({
          ...teamToApply,
          ...(teamLogoToApply ? { logoDataUri: teamLogoToApply } : {}),
          updatedAt: new Date(),
        })
        .where(eq(teams.id, currentTeam.id));

      if (teamLogoToApply) {
        logoUpdate = {
          attempted: true,
          applied: true,
          reason: 'team logo imported from ServiceM8',
        };
      }
    }

    return NextResponse.json({
      connected: true,
      dryRun: false,
      targets,
      imported: {
        userProfile: userToApply,
        teamProfile: teamToApply,
        eicrDefaults: eicrToApply,
      },
      conflicts,
      skipped,
      updatedFields,
      logo: logoUpdate,
    });
  } catch (error) {
    console.error('Error importing profile data from ServiceM8:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
