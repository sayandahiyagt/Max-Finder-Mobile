import "server-only";

import { redirect } from "next/navigation";

import { getAuthenticatedIdentity } from "./supabase/authentication";
import { getCurrentApplicationUser } from "@/features/identity/application";

export async function getOptionalUser() {
  const identity = await getAuthenticatedIdentity();
  if (!identity) return null;
  const actor = await getCurrentApplicationUser(identity.authProviderId);
  return { identity, actor };
}

export async function requireUser() {
  const user = await getOptionalUser();
  if (!user) redirect("/sign-in");
  const { identity, actor } = user;
  if (!actor) redirect("/sign-in?error=account");
  return { identity, actor };
}
