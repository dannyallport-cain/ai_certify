import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';

import { getCurrentUser } from '@/lib/auth/admin';
import { db } from '@/lib/db/drizzle';
import { teams, users, type EicrProfileDefaults } from '@/lib/db/schema';
import { ServiceM8Client_API, type ServiceM8CompanyContact } from '@/lib/servicem8/client';

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

    if (applyTeamLogo) {
      logoUpdate = {
        attempted: true,
        applied: false,
        reason: 'ServiceM8 company logo endpoint is not currently available in this integration',
      };

      if (!currentTeam) {
        logoUpdate = {
          attempted: true,
          applied: false,
          reason: 'user has no team context for logo import',
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

    if (currentTeam && Object.keys(teamToApply).length > 0) {
      await db
        .update(teams)
        .set({
          ...teamToApply,
          updatedAt: new Date(),
        })
        .where(eq(teams.id, currentTeam.id));
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
