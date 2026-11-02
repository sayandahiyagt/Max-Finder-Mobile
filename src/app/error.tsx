"use client";

import Link from "next/link";

type ErrorProps = {
  error: unknown;
  retry: () => void;
};

export default function ApplicationError({ retry }: ErrorProps) {
  return (
    <main className="app-main">
      <section className="content-card" role="alert">
        <h1>We couldn’t load this page</h1>
        <p>Please try again. If the problem continues, return to the map.</p>
        <div className="form-actions">
          <button className="primary-button" type="button" onClick={retry}>
            Try again
          </button>
          <Link className="secondary-button" href="/">
            Back to map
          </Link>
        </div>
      </section>
    </main>
  );
}
