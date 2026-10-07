import Link from "next/link";

import styles from "./app-header.module.css";

export function AppHeader() {
  return (
    <header className={styles.header}>
      <Link className={styles.brand} href="/home">Max Finder</Link>
      <Link className={styles.profileLink} href="/profile" aria-label="Open profile">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 21a7 7 0 0 1 14 0" />
        </svg>
      </Link>
    </header>
  );
}
