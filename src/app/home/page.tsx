import { redirect } from "next/navigation";

import { AppHeader } from "@/components/app-header";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { BottomNav } from "@/components/bottom-nav";
import styles from "../protected-page.module.css";

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  return (
    <main className={styles.page}>
      <AppHeader />
      <section className={styles.content}>
        <h1>Home</h1>
      </section>
      <BottomNav />
    </main>
  );
}
