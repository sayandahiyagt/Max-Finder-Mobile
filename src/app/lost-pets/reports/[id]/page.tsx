import Link from "next/link";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { createConversation } from "@/app/messages/actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function LostPetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: report } = await supabase.from("lost_pet_reports").select("*").eq("id", id).maybeSingle();
  if (!report) notFound();
  const imageUrl = report.image_path
    ? supabase.storage.from("lost-pet-images").getPublicUrl(report.image_path).data.publicUrl
    : null;
  return <AppShell active="Lost pets"><main className="app-main"><div className="detail-layout">
    <article className="detail-card"><span className={`status-pill ${report.status === "FOUND" ? "found" : "lost"}`}>{report.status}</span><h1>{report.pet_name}</h1><p className="muted">{report.species} · {report.breed}</p><h2>About {report.pet_name}</h2><p>{report.description}</p><div className="detail-meta"><div><strong>Last seen</strong><span>{new Date(report.last_seen_at).toLocaleString()}</span></div><div><strong>Location</strong><span>{report.location_label}</span></div><div><strong>Weight</strong><span>{report.weight_range}</span></div><div><strong>Report created</strong><span>{new Date(report.created_at).toLocaleDateString()}</span></div></div></article>
    <aside className="detail-card"><div style={{ minHeight: 190, display: "grid", placeItems: "center", borderRadius: 10, background: "#e8f5f0", overflow: "hidden" }}>{imageUrl ? <img src={imageUrl} alt={`${report.pet_name} profile`} style={{ maxWidth: "100%", maxHeight: 260, objectFit: "cover" }} /> : "Pet image"}</div><div style={{ display: "grid", gap: 10, marginTop: 20 }}>{report.status === "LOST" && user?.id !== report.owner_id && <form action={createConversation}><input type="hidden" name="reportId" value={report.id} /><button className="primary-button" type="submit">Message owner</button></form>}{user?.id === report.owner_id && <Link className="secondary-button" href={`/lost-pets/reports/${report.id}/edit`}>Edit report</Link>}<Link className="secondary-button" href="/lost-pets">Back to reports</Link></div></aside>
  </div></main></AppShell>;
}
