import Link from "next/link";

import styles from "./bottom-nav.module.css";

export function BottomNav() {
  return (
    <nav className={styles.nav} aria-label="Primary navigation">
      <Link
        className={styles.link}
        href="/home"
      >
        <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true">
          <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V10Z" />
        </svg>
        <span>Home</span>
      </Link>
    </nav>
  );
}
