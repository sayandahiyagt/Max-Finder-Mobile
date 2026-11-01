"use client";

import Link from "next/link";
import { PawPrint } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { signOut } from "@/app/auth/actions";
import { subscribeToBrowserAuthState } from "@/lib/supabase/browser-auth";

import styles from "./app-shell.module.css";

const links = [
  ["Explore", "/"],
  ["FAQ", "/faq"],
  ["Messages", "/messages"],
  ["Account", "/profile"],
] as const;

export function AppShell({
  children,
  active,
}: {
  children: ReactNode;
  active?: string;
}) {
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    return subscribeToBrowserAuthState(setIsSignedIn);
  }, []);

  return (
    <>
      <header className={styles.header}>
        <Link className={styles.brand} href="/">
          <span className={styles.brandMark}>
            <PawPrint size={19} />
          </span>
          MaxFinder
        </Link>
        <nav className={styles.nav} aria-label="Main navigation">
          {links.map(([label, href]) => (
            <Link
              aria-current={active === label ? "page" : undefined}
              href={href}
              key={label}
            >
              {label}
            </Link>
          ))}
        </nav>
        {isSignedIn ? (
          <form action={signOut}>
            <button className={styles.signIn} type="submit">
              Sign out
            </button>
          </form>
        ) : (
          <Link className={styles.signIn} href="/sign-in">
            Sign in
          </Link>
        )}
      </header>
      {children}
    </>
  );
}
