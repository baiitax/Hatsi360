'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { z } from 'zod';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createClient } from '@/lib/supabase/server';
import { landingPathForRole, safeRedirectPath } from './routing';
import {
  checkSignInLimit,
  clearSignInAttempts,
  recordSignInAttempt,
} from './rate-limit';
import type { UserRole } from '@/types/domain';

export interface AuthActionState {
  error?: string;
  success?: string;
  /** The path the form should send the browser to. */
  redirectTo?: string;
}

const emailSchema = z.string().trim().email('Enter a valid email address.').max(254);
const passwordSchema = z
  .string()
  .min(8, 'Use at least 8 characters.')
  .max(128, 'That password is too long.');

async function clientIp(): Promise<string | null> {
  try {
    const headerList = await headers();
    return (
      headerList.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      headerList.get('x-real-ip') ??
      null
    );
  } catch {
    return null;
  }
}

/**
 * Sign in to the central portal.
 *
 * The order matters: the throttle is checked before the credentials are
 * tried, the account status is checked after the session exists, and the
 * redirect target is validated against the allowlist. A suspended account is
 * signed out again immediately so it holds no usable session.
 */
export async function signIn(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!isSupabaseConfigured()) {
    return {
      error:
        'Sign-in is unavailable because this deployment has no Supabase project configured. See .env.example.',
    };
  }

  const parsed = z
    .object({
      email: emailSchema,
      password: z.string().min(1, 'Enter your password.'),
      next: z.string().optional(),
    })
    .safeParse({
      email: String(formData.get('email') ?? ''),
      password: String(formData.get('password') ?? ''),
      next: String(formData.get('next') ?? ''),
    });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check your details and try again.' };
  }

  const email = parsed.data.email;
  const ip = await clientIp();

  const limit = await checkSignInLimit(email);
  if (!limit.allowed) {
    return {
      error: `Too many unsuccessful sign-in attempts. Try again in ${Math.ceil(
        limit.retryAfterSeconds / 60,
      )} minute(s).`,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: parsed.data.password,
  });

  if (error) {
    await recordSignInAttempt(email, false, ip);
    // Deliberately vague: do not reveal whether the account exists.
    return { error: 'Those sign-in details were not recognised.' };
  }

  // The session exists. Now check the account is allowed to use it.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Those sign-in details were not recognised.' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, account_status')
    .eq('id', user.id)
    .maybeSingle();

  const role = (profile?.role as UserRole) ?? 'public_user';
  const accountStatus = (profile?.account_status as string) ?? 'active';

  if (accountStatus !== 'active') {
    await supabase.auth.signOut();
    await recordSignInAttempt(email, false, ip);
    return {
      error:
        accountStatus === 'suspended'
          ? 'This account is suspended. Contact your supervisor to restore access.'
          : 'This account is no longer active. Contact your supervisor.',
    };
  }

  await recordSignInAttempt(email, true, ip);
  await clearSignInAttempts(email);

  const landing = landingPathForRole(role);
  const target = safeRedirectPath(parsed.data.next, landing);

  revalidatePath('/', 'layout');
  redirect(target);
}

/**
 * Register a public account.
 *
 * A self-registered account is always a public user. Operational roles are
 * provisioned by a super administrator on the server, never by the browser.
 */
export async function signUp(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!isSupabaseConfigured()) {
    return {
      error:
        'Registration is unavailable because this deployment has no Supabase project configured. See .env.example.',
    };
  }

  const parsed = z
    .object({
      email: emailSchema,
      password: passwordSchema,
      fullName: z.string().trim().min(2, 'Enter your full name.').max(120),
      organisation: z.string().trim().max(120).optional(),
    })
    .safeParse({
      email: String(formData.get('email') ?? ''),
      password: String(formData.get('password') ?? ''),
      fullName: String(formData.get('fullName') ?? ''),
      organisation: String(formData.get('organisation') ?? ''),
    });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check your details and try again.' };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.fullName,
        organisation: parsed.data.organisation ?? null,
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (!data.session) {
    return { success: 'Account created. Check your email to confirm your address, then sign in.' };
  }

  revalidatePath('/', 'layout');
  redirect(landingPathForRole('public_user'));
}

/**
 * Start password recovery.
 *
 * The response is the same whether or not the address exists, so the form
 * cannot be used to find out who has an account.
 */
export async function requestPasswordReset(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!isSupabaseConfigured()) {
    return { error: 'Password recovery is unavailable in this deployment.' };
  }

  const parsed = z.object({ email: emailSchema }).safeParse({
    email: String(formData.get('email') ?? ''),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Enter a valid email address.' };
  }

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/reset-password`,
  });

  return {
    success: 'If that address has an account, a password reset link is on its way.',
  };
}

/** Set a new password from the recovery link. */
export async function updatePassword(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!isSupabaseConfigured()) {
    return { error: 'Password recovery is unavailable in this deployment.' };
  }

  const parsed = z
    .object({
      password: passwordSchema,
      confirm: z.string(),
    })
    .safeParse({
      password: String(formData.get('password') ?? ''),
      confirm: String(formData.get('confirm') ?? ''),
    });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the password.' };
  }
  if (parsed.data.password !== parsed.data.confirm) {
    return { error: 'The two passwords do not match.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

  if (error) {
    return { error: error.message };
  }

  return { success: 'Your password has been changed. You can sign in now.' };
}

/** Sign out and return to the public site. */
export async function signOut(): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  revalidatePath('/', 'layout');
  redirect('/');
}
