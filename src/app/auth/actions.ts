"use server";

import { redirect } from "next/navigation";

import { ensureApplicationUser } from "@/features/identity/application";
import { readRawTextField } from "@/lib/form-data";
import {
  authenticateWithPassword,
  registerWithPassword,
  signOutFromProvider,
} from "@/lib/supabase/authentication";

export async function signIn(formData: FormData) {
  const email = readRawTextField(formData, "email").trim();
  const password = readRawTextField(formData, "password");
  let identity;
  try {
    identity = await authenticateWithPassword(email, password);
  } catch {
    redirect(
      `/sign-in?error=${encodeURIComponent("Invalid email or password.")}`,
    );
  }

  try {
    await ensureApplicationUser(identity);
  } catch {
    await signOutFromProvider().catch(() => undefined);
    redirect(
      `/sign-in?error=${encodeURIComponent("Unable to load your account.")}`,
    );
  }

  redirect("/");
}

export async function signUp(formData: FormData) {
  const email = readRawTextField(formData, "email").trim();
  const password = readRawTextField(formData, "password");
  const displayName = readRawTextField(formData, "displayName").trim();
  let identity;
  try {
    identity = await registerWithPassword(email, password, displayName);
  } catch {
    redirect(
      `/sign-up?error=${encodeURIComponent("Unable to create account.")}`,
    );
  }

  if (identity) {
    try {
      await ensureApplicationUser(identity);
    } catch {
      await signOutFromProvider().catch(() => undefined);
      redirect(
        `/sign-up?error=${encodeURIComponent("Unable to create account.")}`,
      );
    }
  }

  redirect("/?registered=1");
}

export async function signOut() {
  await signOutFromProvider();
  redirect("/");
}
