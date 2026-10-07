"use client";

import { useEffect, useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import styles from "./bottom-nav.module.css";

export function UnreadMessagesBadge() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let isActive = true;

    async function loadUnreadCount() {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return;

      const { count } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .neq("sender_id", authData.user.id)
        .is("read_at", null);

      if (isActive) setUnreadCount(count ?? 0);
    }

    void loadUnreadCount();
    let channel: ReturnType<typeof supabase.channel> | undefined;
    let isCancelled = false;

    async function subscribeToMessages() {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        await supabase.realtime.setAuth(data.session.access_token);
      }
      if (isCancelled) return;

      channel = supabase
        .channel("unread-messages")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "messages" },
          () => void loadUnreadCount(),
        )
        .subscribe();
    }

    void subscribeToMessages();

    return () => {
      isActive = false;
      isCancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, []);

  if (unreadCount === 0) return null;

  return (
    <span className={styles.unreadBadge} aria-label={`${unreadCount} unread messages`}>
      {unreadCount > 99 ? "99+" : unreadCount}
    </span>
  );
}
