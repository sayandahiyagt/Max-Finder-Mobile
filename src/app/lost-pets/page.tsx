import Link from "next/link";
import { Plus } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function LostPetsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: reports } = await supabase.from("lost_pet_reports").select("id, pet_name, species, breed, status, last_seen_at, location_label").order("created_at", { ascending: false });
  return <AppShell active="Lost pets"><main className="app-main">
    <div className="page-heading"><div><p className="eyebrow">Community reports</p><h1>Lost pets</h1><p>Browse active reports and see how you can help.</p></div><Link className="primary-button" href="/lost-pets/new"><Plus size={17} /> Report lost pet</Link></div>
    {reports?.length ? <div className="table-list">{reports.map((report) => <div className="list-row" key={report.id}><div className="list-row-main"><div className="app-avatar">🐾</div><div><h3>{report.pet_name} <span className={`status-pill ${report.status === "FOUND" ? "found" : "lost"}`}>{report.status}</span></h3><p>{report.species} · {report.breed} · {report.location_label}</p></div></div><div className="list-row-actions"><span className="muted">{new Date(report.last_seen_at).toLocaleDateString()}</span><Link className="secondary-button" href={`/lost-pets/reports/${report.id}`}>View report →</Link></div></div>)}</div> : <div className="empty-state">No reports have been published in this area yet.</div>}
  </main></AppShell>;
}
