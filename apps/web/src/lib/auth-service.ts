import { getSupabase } from "./supabase.js";
import { SignUpSchema, SignInSchema, type SignUpInput, type SignInInput } from "@tinh-hoa/shared";

export interface UserProfile {
  id: string;
  display_name: string;
  locale: string;
  created_at: string;
}

export interface AuthState {
  user: { id: string; email?: string } | null;
  profile: UserProfile | null;
}

/**
 * Register a new user with email, password, display name and Turnstile validation.
 */
export async function signUpUser(
  input: SignUpInput,
): Promise<{ success: boolean; error?: string; messageKey?: string }> {
  const parsed = SignUpSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, messageKey: "auth.notConfigured" };
  }

  // Turnstile validation check: must not be empty
  if (!input.turnstileToken || input.turnstileToken.trim().length === 0) {
    return { success: false, messageKey: "auth.invalidTurnstile" };
  }

  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        display_name: parsed.data.displayName,
        locale: parsed.data.locale,
      },
      captchaToken: input.turnstileToken,
      emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
    },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, messageKey: "auth.verificationSent" };
}

/**
 * Sign in an existing user with email, password and Turnstile token.
 */
export async function signInUser(
  input: SignInInput,
): Promise<{ success: boolean; error?: string; messageKey?: string }> {
  const parsed = SignInSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, messageKey: "auth.notConfigured" };
  }

  if (!input.turnstileToken || input.turnstileToken.trim().length === 0) {
    return { success: false, messageKey: "auth.invalidTurnstile" };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      captchaToken: input.turnstileToken,
    },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Sign out the currently active user.
 */
export async function signOutUser(): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false };
  }

  const { error } = await supabase.auth.signOut();
  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Fetch the authenticated user's profile from public.profiles table.
 */
export async function fetchCurrentProfile(userId: string): Promise<UserProfile | null> {
  const supabase = getSupabase();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, locale, created_at")
    .eq("id", userId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as UserProfile;
}
