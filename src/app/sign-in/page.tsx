import Link from "next/link";

import { signIn } from "@/app/auth/actions";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link className="auth-brand" href="/">🐾 MaxFinder</Link>
        <p className="auth-eyebrow">Welcome back</p>
        <h1>Sign in to MaxFinder</h1>
        <p className="auth-copy">Keep an eye on nearby reports and messages.</p>
        {error && <p className="auth-error" role="alert">{error}</p>}
        <form action={signIn} className="auth-form">
          <label>Email<input name="email" type="email" required autoComplete="email" /></label>
          <label>Password<input name="password" type="password" required autoComplete="current-password" /></label>
          <button type="submit">Sign in</button>
        </form>
        <p className="auth-switch">New to MaxFinder? <Link href="/sign-up">Create an account</Link></p>
      </section>
    </main>
  );
}
