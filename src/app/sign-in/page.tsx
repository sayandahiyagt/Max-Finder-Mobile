import Link from "next/link";

import { signIn } from "@/app/auth/actions";
import accountForm from "@/components/account-form.module.css";

import styles from "../auth.module.css";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <Link className={styles.brand} href="/">
          🐾 MaxFinder
        </Link>
        <p className={styles.eyebrow}>Welcome back</p>
        <h1>Sign in to MaxFinder</h1>
        <p className={styles.copy}>Keep an eye on nearby reports and messages.</p>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <form action={signIn} className={accountForm.form}>
          <label>
            Email
            <input name="email" type="email" required autoComplete="email" />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
            />
          </label>
          <button type="submit">Sign in</button>
        </form>
        <p className={styles.switch}>
          New to MaxFinder? <Link href="/sign-up">Create an account</Link>
        </p>
      </section>
    </main>
  );
}
