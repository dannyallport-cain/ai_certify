'use server';

import { randomUUID } from 'crypto';
import { z } from 'zod';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import {
  User,
  type Team,
  users,
  teams,
  teamRuntimeSafeColumns,
  teamMembers,
  activityLogs,
  type NewUser,
  type NewTeam,
  type NewTeamMember,
  type NewActivityLog,
  ActivityType,
  invitations
} from '@/lib/db/schema';
import { comparePasswords, hashPassword, setSession } from '@/lib/auth/session';
import { isAdminRole } from '@/lib/auth/roles';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createCheckoutSession } from '@/lib/payments/stripe';
import { hasSubscriptionAccess } from '@/lib/payments/subscription';
import { ensureTeamForUser, getUser, getUserWithTeam } from '@/lib/db/queries';
import {
  validatedAction,
  validatedActionWithUser
} from '@/lib/auth/middleware';
import {
  createAndSendEmailVerification,
  getTeamIdForUser,
  isEmailVerificationRequired,
} from '@/lib/auth/email-verification';

function getSafeRedirectPath(value: FormDataEntryValue | null): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  if (!value.startsWith('/') || value.startsWith('//')) {
    return null;
  }

  return value;
}

async function logActivity(
  teamId: number | null | undefined,
  userId: number,
  type: ActivityType,
  ipAddress?: string
) {
  if (teamId === null || teamId === undefined) {
    return;
  }
  const newActivity: NewActivityLog = {
    teamId,
    userId,
    action: type,
    ipAddress: ipAddress || ''
  };
  await db.insert(activityLogs).values(newActivity);
}

const signInSchema = z.object({
  email: z.string().email().min(3).max(255),
  password: z.string().min(8).max(100)
});

export const signIn = validatedAction(signInSchema, async (data, formData) => {
  const { email, password } = data;
  const normalizedEmail = email.trim().toLowerCase();

  const userWithTeam = await db
    .select({
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
        passwordHash: users.passwordHash,
        role: users.role,
        status: users.status,
        activatedAt: users.activatedAt,
        deletedAt: users.deletedAt,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      },
      teamId: teamMembers.teamId
    })
    .from(users)
    .leftJoin(teamMembers, eq(users.id, teamMembers.userId))
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  if (userWithTeam.length === 0) {
    return {
      error: 'Invalid email or password. Please try again.',
      email,
      password
    };
  }

  const { user: foundUser } = userWithTeam[0];

  const isPasswordValid = await comparePasswords(
    password,
    foundUser.passwordHash
  );

  if (!isPasswordValid) {
    return {
      error: 'Invalid email or password. Please try again.',
      email,
      password
    };
  }

  if (isEmailVerificationRequired(foundUser)) {
    return {
      error: 'Verify your email address before signing in.',
      email: normalizedEmail,
      password: '',
      unverified: true,
    };
  }

  const foundTeam = isAdminRole(foundUser.role) ? null : await ensureTeamForUser(foundUser);
  const loginAt = new Date();

  await Promise.all([
    setSession(foundUser),
    db
      .update(users)
      .set({
        lastLoginAt: loginAt,
        updatedAt: loginAt,
      })
      .where(eq(users.id, foundUser.id)),
    logActivity(foundTeam?.id, foundUser.id, ActivityType.SIGN_IN)
  ]);

  const redirectTo = formData.get('redirect') as string | null;
  if (redirectTo === 'checkout') {
    const priceId = formData.get('priceId') as string;
    return createCheckoutSession({ team: foundTeam, priceId });
  }

  const safeRedirectPath = getSafeRedirectPath(redirectTo);
  if (safeRedirectPath) {
    redirect(safeRedirectPath);
  }

  if (isAdminRole(foundUser.role)) {
    redirect('/admin');
  }

  if (!hasSubscriptionAccess(foundTeam)) {
    redirect('/subscription');
  }

  redirect('/dashboard');
});

function buildCompanyAddress(
  addressLine1: string,
  addressLine2: string,
  postcode: string
) {
  return [addressLine1, addressLine2, postcode]
    .map((value) => value.trim())
    .filter(Boolean)
    .join(', ');
}

const signUpSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  company: z.string().max(255).optional().or(z.literal('')),
  email: z.string().email('Invalid email address').min(3).max(255),
  addressLine1: z.string().min(1, 'Address line 1 is required').max(255),
  addressLine2: z.string().max(255).optional().or(z.literal('')),
  postcode: z.string().min(1, 'Postcode is required').max(20),
  mobileNumber: z.string().min(1, 'Contact mobile number is required').max(50),
  password: z.string().min(8).max(100),
  inviteId: z.string().optional()
});

export const signUp = validatedAction(signUpSchema, async (data, formData) => {
  const {
    name,
    company,
    email,
    addressLine1,
    addressLine2,
    postcode,
    mobileNumber,
    password,
    inviteId
  } = data;

  const normalizedEmail = email.trim().toLowerCase();
  const trimmedName = name.trim();
  const trimmedCompany = company?.trim() || '';
  const trimmedAddressLine1 = addressLine1.trim();
  const trimmedAddressLine2 = addressLine2?.trim() || '';
  const trimmedPostcode = postcode.trim();
  const trimmedMobileNumber = mobileNumber.trim();
  const parsedInviteId =
    inviteId && inviteId.trim() !== '' ? Number.parseInt(inviteId, 10) : null;

  if (inviteId && (!Number.isInteger(parsedInviteId) || parsedInviteId! <= 0)) {
    return { error: 'Invitation link is invalid.', email, password };
  }

  const passwordHash = await hashPassword(password);

  let createdUser: typeof users.$inferSelect;
  let createdTeam: Team | null = null;

  try {
    const result = await db.transaction(async (tx) => {
      const existingUser = await tx
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, normalizedEmail))
        .limit(1);

      if (existingUser.length > 0) {
        throw new Error('EMAIL_IN_USE');
      }

      let teamId: number | null = null;
      let userRole: string | null = null;
      let team: Team | null = null;
      let teamAction: ActivityType | null = null;

      if (parsedInviteId) {
        const [invitation] = await tx
          .select()
          .from(invitations)
          .where(
            and(
              eq(invitations.id, parsedInviteId),
              eq(invitations.email, normalizedEmail),
              eq(invitations.status, 'pending')
            )
          )
          .limit(1);

        if (!invitation) {
          throw new Error('INVALID_INVITE');
        }

        teamId = invitation.teamId;
        userRole = invitation.role;
        teamAction = ActivityType.ACCEPT_INVITATION;

        await tx
          .update(invitations)
          .set({ status: 'accepted' })
          .where(eq(invitations.id, invitation.id));

        [team] = await tx
          .select(teamRuntimeSafeColumns)
          .from(teams)
          .where(eq(teams.id, teamId))
          .limit(1);

        if (!team) {
          throw new Error('TEAM_NOT_FOUND');
        }
      } else {
        const [createdTeamRecord] = await tx
          .insert(teams)
          .values({
            name: trimmedCompany || `${trimmedName}'s Team`
          })
          .returning(teamRuntimeSafeColumns);

        if (!createdTeamRecord) {
          throw new Error('TEAM_CREATE_FAILED');
        }

        team = createdTeamRecord;
        teamId = team.id;
        userRole = 'owner';
        teamAction = ActivityType.CREATE_TEAM;
      }

      if (teamId === null || userRole === null || !team) {
        throw new Error('TEAM_MEMBERSHIP_CREATE_FAILED');
      }

      const newUser: NewUser = {
        name: trimmedName,
        email: normalizedEmail,
        passwordHash,
        teamId,
        role: 'user',
        status: 'pending',
        activatedAt: null,
        eicrProfileDefaults: {
          tradingTitle: trimmedCompany || trimmedName,
          companyAddress: buildCompanyAddress(
            trimmedAddressLine1,
            trimmedAddressLine2,
            trimmedPostcode
          ),
          companyTelephone: trimmedMobileNumber,
          companyEmail: normalizedEmail,
        }
      };

      [createdUser] = await tx.insert(users).values(newUser).returning();

      if (!createdUser) {
        throw new Error('USER_CREATE_FAILED');
      }

      await tx.insert(teamMembers).values({
        userId: createdUser.id,
        teamId,
        role: userRole
      });

      if (teamAction) {
        await tx.insert(activityLogs).values({
          teamId,
          userId: createdUser.id,
          action: teamAction,
          ipAddress: ''
        });
      }

      await tx.insert(activityLogs).values({
        teamId,
        userId: createdUser.id,
        action: ActivityType.SIGN_UP,
        ipAddress: ''
      });

      return { createdUser, createdTeam: team };
    });

    createdUser = result.createdUser;
    createdTeam = result.createdTeam;
  } catch (error) {
    const message = error instanceof Error ? error.message : '';

    if (message === 'EMAIL_IN_USE') {
      return {
        error: 'An account with this email already exists. Try signing in instead.',
        email,
        password
      };
    }

    if (message === 'INVALID_INVITE') {
      return { error: 'This invitation is invalid or has expired.', email, password };
    }

    if (message === 'TEAM_NOT_FOUND') {
      return {
        error: 'This invitation points to a team that no longer exists.',
        email,
        password
      };
    }

    console.error('Sign-up failed:', error);
    return {
      error: 'We could not create your account right now. Please try again.',
      email,
      password
    };
  }

  const redirectTo = formData.get('redirect') as string | null;
  const priceId = formData.get('priceId') as string | null;

  try {
    await createAndSendEmailVerification({
      user: createdUser,
      redirectTo,
      priceId,
    });
  } catch (error) {
    console.error('Failed to send verification email:', error);
    return {
      error:
        'Your account was created, but we could not send the verification email. Please try signing in to resend it.',
      email,
      password: '',
    };
  }

  return {
    success:
      'Account created. Check your email for a verification link before signing in.',
    email: normalizedEmail,
    password: '',
    verificationPending: true,
  };
});

const resendVerificationSchema = z.object({
  email: z.string().email(),
  redirect: z.string().optional(),
  priceId: z.string().optional(),
});

export const resendVerificationEmail = validatedAction(
  resendVerificationSchema,
  async (data) => {
    const normalizedEmail = data.email.trim().toLowerCase();

    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        status: users.status,
      })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (!user) {
      return {
        success: 'If that account exists, a verification email has been sent.',
        email: normalizedEmail,
        password: '',
      };
    }

    if (!isEmailVerificationRequired(user)) {
      return {
        success: 'That email address is already verified. You can sign in now.',
        email: normalizedEmail,
        password: '',
      };
    }

    try {
      await createAndSendEmailVerification({
        user,
        redirectTo: data.redirect ?? null,
        priceId: data.priceId ?? null,
      });
    } catch (error) {
      console.error('Failed to resend verification email:', error);
      return {
        error:
          'We could not resend the verification email right now. Please try again.',
        email: normalizedEmail,
        password: '',
        unverified: true,
      };
    }

    const teamId = await getTeamIdForUser(user.id);
    await logActivity(
      teamId,
      user.id,
      ActivityType.RESEND_VERIFICATION_EMAIL
    );

    return {
      success: 'Verification email sent. Check your inbox.',
      email: normalizedEmail,
      password: '',
      unverified: true,
    };
  }
);

export async function signOut() {
  const user = await getUser();
  if (!user) {
    (await cookies()).delete('session');
    return;
  }
  const userWithTeam = await getUserWithTeam(user.id);
  await logActivity(userWithTeam?.teamId, user.id, ActivityType.SIGN_OUT);
  (await cookies()).delete('session');
}

const updatePasswordSchema = z.object({
  currentPassword: z.string().min(8).max(100),
  newPassword: z.string().min(8).max(100),
  confirmPassword: z.string().min(8).max(100)
});

export const updatePassword = validatedActionWithUser(
  updatePasswordSchema,
  async (data, _, user) => {
    const { currentPassword, newPassword, confirmPassword } = data;

    const isPasswordValid = await comparePasswords(
      currentPassword,
      user.passwordHash
    );

    if (!isPasswordValid) {
      return {
        currentPassword,
        newPassword,
        confirmPassword,
        error: 'Current password is incorrect.'
      };
    }

    if (currentPassword === newPassword) {
      return {
        currentPassword,
        newPassword,
        confirmPassword,
        error: 'New password must be different from the current password.'
      };
    }

    if (confirmPassword !== newPassword) {
      return {
        currentPassword,
        newPassword,
        confirmPassword,
        error: 'New password and confirmation password do not match.'
      };
    }

    const newPasswordHash = await hashPassword(newPassword);
    const userWithTeam = await getUserWithTeam(user.id);

    await Promise.all([
      db
        .update(users)
        .set({ passwordHash: newPasswordHash })
        .where(eq(users.id, user.id)),
      logActivity(userWithTeam?.teamId, user.id, ActivityType.UPDATE_PASSWORD)
    ]);

    return {
      success: 'Password updated successfully.'
    };
  }
);

const deleteAccountSchema = z.object({
  password: z.string().min(8).max(100)
});

export const deleteAccount = validatedActionWithUser(
  deleteAccountSchema,
  async (data, _, user) => {
    const { password } = data;

    const isPasswordValid = await comparePasswords(password, user.passwordHash);
    if (!isPasswordValid) {
      return {
        password,
        error: 'Incorrect password. Account deletion failed.'
      };
    }

    const userWithTeam = await getUserWithTeam(user.id);

    await logActivity(
      userWithTeam?.teamId,
      user.id,
      ActivityType.DELETE_ACCOUNT
    );

    // Soft delete
    await db
      .update(users)
      .set({
        deletedAt: sql`CURRENT_TIMESTAMP`,
        email: sql`CONCAT(email, '-', id, '-deleted')` // Ensure email uniqueness
      })
      .where(eq(users.id, user.id));

    if (userWithTeam?.teamId) {
      await db
        .delete(teamMembers)
        .where(
          and(
            eq(teamMembers.userId, user.id),
            eq(teamMembers.teamId, userWithTeam.teamId)
          )
        );
    }

    (await cookies()).delete('session');
    redirect('/sign-in');
  }
);

const updateAccountSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address'),
  eicrProfileDefaults: z.string().optional().or(z.literal(''))
});

export const updateAccount = validatedActionWithUser(
  updateAccountSchema,
  async (data, _, user) => {
    const { name, email, eicrProfileDefaults } = data;
    const userWithTeam = await getUserWithTeam(user.id);

    const updates: Record<string, unknown> = {
      name,
      email,
    };

    if (typeof eicrProfileDefaults === 'string' && eicrProfileDefaults.trim()) {
      try {
        const parsedDefaults = JSON.parse(eicrProfileDefaults);
        if (parsedDefaults && typeof parsedDefaults === 'object' && !Array.isArray(parsedDefaults)) {
          updates.eicrProfileDefaults = parsedDefaults;
        }
      } catch (error) {
        console.error('Invalid EICR profile defaults payload:', error);
      }
    }

    await Promise.all([
      db.update(users).set(updates).where(eq(users.id, user.id)),
      logActivity(userWithTeam?.teamId, user.id, ActivityType.UPDATE_ACCOUNT)
    ]);

    return { name, success: 'Account updated successfully.' };
  }
);

const removeTeamMemberSchema = z.object({
  memberId: z.number()
});

export const removeTeamMember = validatedActionWithUser(
  removeTeamMemberSchema,
  async (data, _, user) => {
    const { memberId } = data;
    const userWithTeam = await getUserWithTeam(user.id);

    if (!userWithTeam?.teamId) {
      return { error: 'User is not part of a team' };
    }

    await db
      .delete(teamMembers)
      .where(
        and(
          eq(teamMembers.id, memberId),
          eq(teamMembers.teamId, userWithTeam.teamId)
        )
      );

    await logActivity(
      userWithTeam.teamId,
      user.id,
      ActivityType.REMOVE_TEAM_MEMBER
    );

    return { success: 'Team member removed successfully' };
  }
);

const inviteTeamMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['member', 'owner'])
});

export const inviteTeamMember = validatedActionWithUser(
  inviteTeamMemberSchema,
  async (data, _, user) => {
    const { email, role } = data;
    const userWithTeam = await getUserWithTeam(user.id);

    if (!userWithTeam?.teamId) {
      return { error: 'User is not part of a team' };
    }

    const existingMember = await db
      .select()
      .from(users)
      .leftJoin(teamMembers, eq(users.id, teamMembers.userId))
      .where(
        and(eq(users.email, email), eq(teamMembers.teamId, userWithTeam.teamId))
      )
      .limit(1);

    if (existingMember.length > 0) {
      return { error: 'User is already a member of this team' };
    }

    // Check if there's an existing invitation
    const existingInvitation = await db
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.email, email),
          eq(invitations.teamId, userWithTeam.teamId),
          eq(invitations.status, 'pending')
        )
      )
      .limit(1);

    if (existingInvitation.length > 0) {
      return { error: 'An invitation has already been sent to this email' };
    }

    // Create a new invitation
    await db.insert(invitations).values({
      teamId: userWithTeam.teamId,
      email,
      token: randomUUID(),
      role,
      invitedBy: user.id,
      status: 'pending'
    });

    await logActivity(
      userWithTeam.teamId,
      user.id,
      ActivityType.INVITE_TEAM_MEMBER
    );

    // TODO: Send invitation email and include ?inviteId={id} to sign-up URL
    // await sendInvitationEmail(email, userWithTeam.team.name, role)

    return { success: 'Invitation sent successfully' };
  }
);
