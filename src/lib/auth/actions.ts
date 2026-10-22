'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createClient } from '@/lib/supabase/server';

export interface AuthActionState {
  error?: string;
  success?: string;
}

const emailSchema = z.string().trim().email('Enter a valid email address.').max(254);
const passwordSchema = z
  .string()
  .min(8, 'Use at least 8 characters.')
  .max(128, 'That password is too long.');

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
    .object({ email: emailSchema, password: z.string().min(1, 'Enter your password.') })
    .safeParse({
      email: String(formData.get('email') ?? ''),
      password: String(formData.get('password') ?? ''),
    });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check your details and try again.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    // Deliberately vague: do not reveal whether the account exists.
    return { error: 'Those sign-in details were not recognised.' };
  }

  revalidatePath('/', 'layout');
  redirect('/dashboard');
}

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
  redirect('/dashboard');
}

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

  // Always report success so the form cannot be used to discover accounts.
  return {
    success: 'If that address has an account, a password reset link is on its way.',
  };
}

export async function signOut(): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/');
}
