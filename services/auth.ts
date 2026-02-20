import { supabase } from "@/lib/supabase";
import type { AuthResponse } from "@supabase/supabase-js";

export async function signInWithEmail(
  email: string,
  password: string,
): Promise<AuthResponse> {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUpWithEmail(
  email: string,
  password: string,
  displayName?: string,
): Promise<AuthResponse> {
  return supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: displayName },
    },
  });
}

export async function signOut(): Promise<{ error: Error | null }> {
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function resetPassword(email: string) {
  return supabase.auth.resetPasswordForEmail(email);
}
