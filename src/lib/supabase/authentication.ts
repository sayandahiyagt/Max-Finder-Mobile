import "server-only";

import type { User } from "@supabase/supabase-js";

import type { AuthenticatedIdentity } from "@/features/identity/types";
import { createSupabaseServerClient } from "./server";

function toIdentity(user: User | null): AuthenticatedIdentity | null {
  if (!user?.email) return null;
  const name = user.user_metadata?.display_name;
  return {
    authProviderId: user.id,
    email: user.email,
    displayName: typeof name === "string" ? name : null,
  };
}

export async function authenticateWithPassword(
  email: string,
  password: string,
) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  const identity = toIdentity(data.user);
  if (error || !identity) throw new Error("Invalid email or password.");
  return identity;
}

export async function registerWithPassword(
  email: string,
  password: string,
  displayName: string,
) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  });
  if (error) throw new Error("Unable to create account.");
  return toIdentity(data.user);
}

export async function signOutFromProvider() {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error("Unable to sign out.");
}

export async function getAuthenticatedIdentity() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  return error ? null : toIdentity(data.user);
}
