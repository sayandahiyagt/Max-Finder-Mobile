import Link from "next/link";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { deleteLostPet, updateLostPet } from "@/app/lost-pets/actions";
import { requireUser } from "@/lib/supabase/auth";

export default async function EditLostPetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await requireUser();
  const { data: report } = await supabase.from("lost_pet_reports").select("*").eq("id", id).eq("owner_id", user.id).maybeSingle();
  if (!report) notFound();
  return <AppShell active="Lost pets"><main className="app-main"><div className="page-heading"><div><p className="eyebrow">Manage report</p><h1>Update {report.pet_name}</h1><p>Keep the community informed as the search changes.</p></div></div>
    <form action={updateLostPet} className="form-card"><input type="hidden" name="id" value={id} /><label className="form-field">Status<select name="status" defaultValue={report.status}><option value="LOST">Lost</option><option value="FOUND">Found</option></select></label><label className="form-field" style={{ marginTop: 17 }}>Description<textarea name="description" required defaultValue={report.description} maxLength={2000} /></label><div className="form-actions"><Link className="secondary-button" href={`/lost-pets/reports/${id}`}>Cancel</Link><button className="primary-button" type="submit">Save changes</button></div></form>
    <form action={deleteLostPet} className="form-card" style={{ marginTop: 16 }}><input type="hidden" name="id" value={id} /><p className="muted">Deleting removes this report and its conversations. This cannot be undone.</p><div className="form-actions"><button className="secondary-button danger-button" type="submit">Delete report</button></div></form>
  </main></AppShell>;
}
