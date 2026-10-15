import Link from "next/link";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { reverseGeocode } from "@/lib/geocoding";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function SpottingDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  const { id } = await params;
  const { created } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: spotting } = await supabase.from("spottings").select("*").eq("id", id).maybeSingle();
  if (!spotting) notFound();
  const storedLocation = String(spotting.location_label ?? "").trim();
  const locationLabel =
    storedLocation &&
    !/^(?:your )?current location$/i.test(storedLocation) &&
    !/^selected map location$/i.test(storedLocation)
      ? storedLocation
      : await reverseGeocode(Number(spotting.latitude), Number(spotting.longitude));
  const imageUrl = spotting.image_path
    ? supabase.storage.from("spotting-images").getPublicUrl(spotting.image_path).data.publicUrl
    : null;
  return <AppShell active="Spottings"><main className="app-main"><div className="detail-layout">
    <article className="detail-card">{created && <div className="notice">Spotting published. Thank you for helping the community.</div>}<span className="status-pill found">Spotting</span><h1>Spotted {spotting.species}</h1><p>{spotting.description ?? "No description was provided."}</p><div className="detail-meta"><div><strong>Spotted</strong><span>{new Date(spotting.spotted_at).toLocaleString()}</span></div><div><strong>Location</strong><span>{locationLabel ?? "Address unavailable"}</span></div><div><strong>Breed</strong><span>{spotting.breed ?? "Unknown"}</span></div><div><strong>Weight</strong><span>{spotting.weight_range ?? "Unknown"}</span></div></div><h2>Distinguishing characteristics</h2><p>{spotting.distinguishing_characteristics ?? "None provided."}</p></article>
    <aside className="detail-card"><div style={{ minHeight: 190, display: "grid", placeItems: "center", borderRadius: 10, background: "#e8f5f0", overflow: "hidden" }}>{imageUrl ? <img src={imageUrl} alt="Pet spotting" style={{ maxWidth: "100%", maxHeight: 260, objectFit: "cover" }} /> : "Spotting image"}</div><Link className="secondary-button" style={{ marginTop: 20 }} href="/">Return to map</Link></aside>
  </div></main></AppShell>;
}
