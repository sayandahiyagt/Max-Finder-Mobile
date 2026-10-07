"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import styles from "./auth-form.module.css";

type AuthMode = "sign-in" | "sign-up";

export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);
  const isSignUp = mode === "sign-up";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsPending(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const supabase = createSupabaseBrowserClient();

    const result = isSignUp
      ? await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: String(formData.get("displayName") ?? "").trim(),
              phone: String(formData.get("phone") ?? "").trim(),
            },
          },
        })
      : await supabase.auth.signInWithPassword({ email, password });

    if (result.error) {
      setError(result.error.message);
      setIsPending(false);
      return;
    }

    if (isSignUp && !result.data.session) {
      setError("Check your email to confirm your account before signing in.");
      setIsPending(false);
      return;
    }

    router.push(isSignUp ? "/profile" : "/home");
    router.refresh();
  }

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <div className={styles.heading}>
          <p className={styles.eyebrow}>Max Finder</p>
          <h1>{isSignUp ? "Create your account" : "Welcome back"}</h1>
          <p>
            {isSignUp
              ? "Create an account to help reunite lost pets with their families."
              : "Sign in to continue to Max Finder."}
          </p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          {isSignUp && (
            <>
              <label htmlFor="displayName">Display name</label>
              <input id="displayName" name="displayName" type="text" required autoComplete="name" />
              <label htmlFor="phone">Phone number <span>(optional)</span></label>
              <input id="phone" name="phone" type="tel" autoComplete="tel" />
            </>
          )}
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required autoComplete="email" />
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
            autoComplete={isSignUp ? "new-password" : "current-password"}
          />
          {error && <p className={styles.error} role="alert">{error}</p>}
          <button type="submit" disabled={isPending}>
            {isPending ? "Please wait..." : isSignUp ? "Create account" : "Sign in"}
          </button>
        </form>

        <p className={styles.switchPrompt}>
          {isSignUp ? "Already have an account?" : "Don&apos;t have an account?"}{" "}
          <Link href={isSignUp ? "/sign-in" : "/sign-up"}>
            {isSignUp ? "Sign in" : "Create one"}
          </Link>
        </p>
      </section>
    </main>
  );
}
