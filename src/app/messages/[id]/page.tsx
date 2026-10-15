import { notFound } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { sendMessage } from "@/app/messages/actions";
import { requireUser } from "@/lib/supabase/auth";

export default async function MessageThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await requireUser();
  const { data: conversation } = await supabase.from("conversations").select("id, lost_pet_report_id, report_id, owner_id, participant_id").eq("id", id).maybeSingle();
  if (!conversation || (conversation.owner_id !== user.id && conversation.participant_id !== user.id)) notFound();
  const otherUserId = conversation.owner_id === user.id ? conversation.participant_id : conversation.owner_id;
  const { data: otherProfile } = await supabase.from("profiles").select("display_name").eq("id", otherUserId).maybeSingle();
  const reportId = conversation.lost_pet_report_id ?? conversation.report_id;
  const { data: report } = reportId
    ? await supabase.from("lost_pet_reports").select("pet_name, species, breed, location_label").eq("id", reportId).maybeSingle()
    : { data: null };
  const { data: messages } = await supabase.from("messages").select("id, sender_id, content, body, created_at").eq("conversation_id", id).order("created_at");
  return <AppShell active="Messages"><main className="app-main"><div className="message-layout"><section className="thread"><div className="thread-header"><strong>{report?.pet_name ?? "Lost pet"} · with {otherProfile?.display_name || "MaxFinder user"}</strong>{report && <span className="muted">{report.species} · {report.breed} · Last seen near {report.location_label}</span>}</div><div className="thread-messages">{messages?.length ? messages.map((message) => <div className={`bubble ${message.sender_id === user.id ? "sent" : "received"}`} key={message.id}>{message.content ?? message.body}</div>) : <p className="muted">Start the conversation with a helpful, respectful message.</p>}</div><form action={sendMessage} className="message-form"><input type="hidden" name="conversationId" value={id} /><input name="content" required maxLength={2000} placeholder="Write a message…" /><button type="submit">Send</button></form></section></div></main></AppShell>;
}
