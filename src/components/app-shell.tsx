"use client";

import Link from "next/link";
import { PawPrint } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const links = [
  ["Explore", "/"],
  ["FAQ", "/faq"],
  ["Messages", "/messages"],
  ["Account", "/profile"],
];

export function AppShell({
  children,
  active,
}: {
  children: ReactNode;
  active?: string;
}) {
  const router = useRouter();
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let mounted = true;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (mounted) setIsSignedIn(Boolean(user));
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setIsSignedIn(Boolean(session?.user)),
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signOut();
    if (error) return;
    setIsSignedIn(false);
    router.refresh();
  };

  return (
    <>
      <header className="app-header">
        <Link className="app-brand" href="/">
          <span className="app-brand-mark"><PawPrint size={19} /></span>
          MaxFinder
        </Link>
        <nav className="app-nav" aria-label="Main navigation">
          {links.map(([label, href]) => (
            <Link className={active === label ? "active" : ""} href={href} key={label}>{label}</Link>
          ))}
        </nav>
        {isSignedIn ? (
          <button className="app-sign-in" type="button" onClick={handleSignOut}>Sign out</button>
        ) : (
          <Link className="app-sign-in" href="/sign-in">Sign in</Link>
        )}
      </header>
      {children}
    </>
  );
}
