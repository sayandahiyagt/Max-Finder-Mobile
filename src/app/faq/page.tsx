import { BookOpen, HeartHandshake, Phone } from "lucide-react";

import { AppShell } from "@/components/app-shell";

const questions = [
  ["What should I do if my pet goes missing?", "Create a lost-pet report with a clear photo, the last-seen time and an approximate location. Visit local shelters and share the report with trusted neighbors."],
  ["How do I submit a spotting?", "Use Report spotting to publish an anonymous sighting. Include the time, map location, one image, and any details that could help an owner recognize the pet."],
  ["How do I contact a pet owner?", "Open an active lost-pet report and choose Message Owner. Messages stay private between the report owner and the person who contacted them."],
  ["What should I do if I find a stray animal?", "Keep a safe distance, provide water if appropriate, and contact a local shelter or animal hospital. Never put yourself or the animal at risk."],
  ["How can I improve the chances of finding my pet?", "Use a recent photo, check your contact details, search at different times of day, and ask neighbors to watch for movement."],
];

const atlantaShelters = [
  ["Fulton County Animal Services", "404-613-0358", "1251 Fulton Industrial Blvd NW, Atlanta, GA 30336", "https://fultoncountyga.gov/inside-fulton-county/fulton-county-departments/animal-services/adopt-or-foster"],
  ["DeKalb County Animal Services", "404-294-2996", "3280 Chamblee Dunwoody Rd, Chamblee, GA 30341", "https://dekalbanimalservices.com/contact/"],
  ["Atlanta Humane Society", "404-875-5331", "1551 Perry Boulevard NW, Atlanta, GA 30318", "https://atlantahumane.org/contact-us/"],
];

export default function FAQPage() {
  return <AppShell active="FAQ"><main className="app-main">
    <div className="page-heading"><div><p className="eyebrow">Help center</p><h1>Helpful answers</h1><p>Practical guidance for reporting, spotting, and safely reuniting pets.</p></div></div>
    <div className="faq-list">{questions.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div>
    <div className="card-grid" style={{ marginTop: 28 }}>
      <div className="content-card"><HeartHandshake color="#198d68" /><h2 style={{ marginTop: 12 }}>Report with care</h2><p style={{ marginTop: 8 }}>Avoid publishing private residential details. Use an approximate location and report only what is safe to share.</p></div>
      <div className="content-card"><BookOpen color="#198d68" /><h2 style={{ marginTop: 12 }}>Community resources</h2><p style={{ marginTop: 8 }}>MaxFinder is a community tool. Verify information before acting and use trusted local services for urgent animal care.</p></div>
      <div className="content-card"><Phone color="#198d68" /><h2 style={{ marginTop: 12 }}>Need urgent help?</h2><p style={{ marginTop: 8 }}>Contact your local animal control, shelter, rescue, or veterinary hospital directly for time-sensitive situations.</p></div>
    </div>
    <section className="content-card" style={{ marginTop: 28 }}>
      <p className="eyebrow">Atlanta-area resources</p>
      <h2 style={{ marginTop: 8 }}>Local shelter contacts</h2>
      <p style={{ marginTop: 8 }}>Call ahead to confirm hours and intake policies. For stray animals, contact the county shelter serving the animal&apos;s location.</p>
      <div className="table-list" style={{ marginTop: 16 }}>{atlantaShelters.map(([name, phone, address, website]) => <div className="list-row" key={name}><div><h3>{name}</h3><p>{address}</p><p><a href={`tel:${phone.replaceAll("-", "")}`}>{phone}</a></p></div><a href={website} target="_blank" rel="noreferrer">Website →</a></div>)}</div>
    </section>
  </main></AppShell>;
}
