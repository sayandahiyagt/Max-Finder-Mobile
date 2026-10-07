import Link from "next/link";

import { UnreadMessagesBadge } from "./unread-messages-badge";
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
      <Link className={styles.link} href="/lost-pets/search">
        <span className={styles.navSymbol} aria-hidden="true">⌕</span>
        <span>Search</span>
      </Link>
      <Link className={styles.link} href="/lost-pets/reports">
        <span className={styles.navSymbol} aria-hidden="true">▤</span>
        <span>Your reports</span>
      </Link>
      <Link className={styles.link} href="/lost-pets/new">
        <span className={styles.navSymbol} aria-hidden="true">＋</span>
        <span>Report</span>
      </Link>
      <Link className={styles.link} href="/faq">
        <span className={styles.navSymbol} aria-hidden="true">?</span>
        <span>Help</span>
      </Link>
      <Link className={styles.link} href="/messages">
        <span className={styles.navIconWithBadge}>
          <span className={styles.navSymbol} aria-hidden="true">✉</span>
          <UnreadMessagesBadge />
        </span>
        <span>DMs</span>
      </Link>
    </nav>
  );
}
