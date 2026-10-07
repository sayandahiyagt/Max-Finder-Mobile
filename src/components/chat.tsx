"use client";

import { useEffect, useState } from "react";
import { useActionState } from "react";

import { markConversationRead, sendMessage } from "@/app/messages/actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import styles from "../app/protected-page.module.css";

type Message = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
};

export function Chat({
  conversationId,
  currentUserId,
  initialMessages,
  canSend,
}: {
  conversationId: string;
  currentUserId: string;
  initialMessages: Message[];
  canSend: boolean;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [state, action, isPending] = useActionState(sendMessage, {});

  useEffect(() => {
    void markConversationRead(conversationId);
    const supabase = createSupabaseBrowserClient();
    let channel: ReturnType<typeof supabase.channel> | undefined;
    let isCancelled = false;

    async function subscribeToMessages() {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        await supabase.realtime.setAuth(data.session.access_token);
      }
      if (isCancelled) return;

      channel = supabase
        .channel(`conversation:${conversationId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload) => {
            const message = payload.new as Message;
            setMessages((current) =>
              current.some((item) => item.id === message.id)
                ? current
                : [...current, message],
            );
            if (message.sender_id !== currentUserId) {
              void markConversationRead(conversationId);
            }
          },
        )
        .subscribe((status) => {
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            if (channel) void supabase.removeChannel(channel);
          }
        });
    }

    void subscribeToMessages();

    return () => {
      isCancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [conversationId, currentUserId]);

  return (
    <div className={styles.chat}>
      <div className={styles.messageList}>
        {messages.length === 0 && (
          <p className={styles.emptyState}>Start the conversation with a message.</p>
        )}
        {messages.map((message) => (
          <div
            className={`${styles.messageBubble} ${
              message.sender_id === currentUserId ? styles.messageMine : ""
            }`}
            key={message.id}
          >
            <p>{message.body}</p>
            <small>{new Date(message.created_at).toLocaleString()}</small>
          </div>
        ))}
      </div>
      {canSend ? (
        <form className={styles.messageForm} action={action}>
          <input type="hidden" name="conversationId" value={conversationId} />
          <textarea name="body" placeholder="Write a message..." required maxLength={2000} />
          <button className={styles.editPetButton} type="submit" disabled={isPending}>
            {isPending ? "Sending..." : "Send message"}
          </button>
          {state.error && <p className={styles.formError}>{state.error}</p>}
        </form>
      ) : (
        <p className={styles.emptyState}>Messaging is closed for this report.</p>
      )}
    </div>
  );
}
