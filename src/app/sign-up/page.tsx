import Link from "next/link";

import { signUp } from "@/app/auth/actions";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link className="auth-brand" href="/">
          🐾 MaxFinder
        </Link>

        <p className="auth-eyebrow">Join the community</p>
        <h1>Create your account</h1>
        <p className="auth-copy">
          Help bring more pets home, one report at a time.
        </p>

        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}

        <form action={signUp} className="auth-form">
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
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
            />
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

        <p className="auth-switch">
          Already have an account? <Link href="/sign-in">Sign in</Link>
        </p>
      </section>
    </main>
  );
}
