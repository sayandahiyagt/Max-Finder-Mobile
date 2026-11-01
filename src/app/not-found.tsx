import Link from "next/link";

export default function NotFound() {
  return (
    <main className="app-main">
      <section className="content-card" aria-labelledby="not-found-title">
        <p className="eyebrow">404</p>
        <h1 id="not-found-title">We couldn’t find that page</h1>
        <p>The page or item may have moved or may no longer be available.</p>
        <Link className="primary-button" href="/">
          Back to map
        </Link>
      </section>
    </main>
  );
}
