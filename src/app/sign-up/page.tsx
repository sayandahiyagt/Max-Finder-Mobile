import Link from "next/link";

import { signUp } from "@/app/auth/actions";
import accountForm from "@/components/account-form.module.css";

import styles from "../auth.module.css";

export default async function SignUpPage({
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
        <p className={styles.eyebrow}>Join the community</p>
        <h1>Create your account</h1>
        <p className={styles.copy}>
          Help bring more pets home, one report at a time.
        </p>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <form action={signUp} className={accountForm.form}>
          <label>
            Display name
            <input
              name="displayName"
              required
              maxLength={80}
              autoComplete="name"
            />
          </label>
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
              minLength={8}
              autoComplete="new-password"
            />
          </label>
          <button type="submit">Create account</button>
        </form>
        <p className={styles.switch}>
          Already have an account? <Link href="/sign-in">Sign in</Link>
        </p>
      </section>
    </main>
  );
}
