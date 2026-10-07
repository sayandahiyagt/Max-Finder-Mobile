import Link from "next/link";

import styles from "./back-button.module.css";

export function BackButton() {
  return <Link className={styles.button} href="/profile">← Back to profile</Link>;
}
