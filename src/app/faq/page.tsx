import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";
import styles from "../protected-page.module.css";

const faqs = [
  {
    question: "How do I report a lost pet?",
    answer:
      "Open Report in the navigation, choose an existing pet or add its details, then provide the last-seen time, map location, and a contact method. Your report will appear in your reports and in public search.",
  },
  {
    question: "How do I search for a lost pet?",
    answer:
      "Open Search and filter by species, breed, last-seen time, or a point on the map. Choose a radius to see reports near that location. Your own active reports are not included in your search results.",
  },
  {
    question: "How do I update or remove my report?",
    answer:
      "Open Your reports and select the report. You can edit its details, mark the pet found, or delete the report. Marking a pet found removes it from active public search.",
  },
  {
    question: "Why should I choose a location on the map?",
    answer:
      "A map point lets nearby searches use distance and radius accurately. Location permission is optional; you can select any point on the map instead.",
  },
  {
    question: "What should I do if I still cannot find a match?",
    answer:
      "Contact a local animal shelter or animal services team. They may be able to check intake records, found-pet reports, and other local resources.",
  },
];

const shelters = [
  {
    name: "Atlanta Humane Society",
    phone: "404-875-5331",
    website: "https://atlantahumane.org/contact-us",
    description: "Adoption, lost-and-found guidance, and animal welfare support.",
  },
  {
    name: "LifeLine Animal Project",
    address: "3180 Presidential Drive, Atlanta, GA 30340",
    phone: "404-292-8800",
    website: "https://lifelineanimal.org/contact/",
    description: "Shelter, adoption, foster, and community animal support services.",
  },
  {
    name: "Fulton County Animal Services",
    address: "1251 Fulton Industrial Blvd NW, Atlanta, GA 30336",
    phone: "404-613-0358",
    website: "https://fultonanimalservices.com/contact/",
    description: "County animal services, lost-and-found support, and animal control.",
  },
];

export default function FaqPage() {
  return (
    <main className={styles.page}>
      <AppHeader />
      <section className={styles.content}>
        <p className={styles.eyebrow}>Help center</p>
        <h1>FAQ</h1>
        <p className={styles.pageIntro}>
          Find answers about reporting and searching for lost pets.
        </p>

        <div className={styles.faqList}>
          {faqs.map((faq) => (
            <details className={styles.faqItem} key={faq.question}>
              <summary>{faq.question}</summary>
              <p>{faq.answer}</p>
            </details>
          ))}
        </div>

        <div className={styles.shelterSection}>
          <p className={styles.eyebrow}>Atlanta resources</p>
          <h2>Animal shelters and services</h2>
          <p className={styles.pageIntro}>
            Contact these organizations if you need help beyond the app.
          </p>
          <div className={styles.shelterList}>
            {shelters.map((shelter) => (
              <article className={styles.shelterCard} key={shelter.name}>
                <h3>{shelter.name}</h3>
                <p>{shelter.description}</p>
                {shelter.address && <p>{shelter.address}</p>}
                <a href={`tel:${shelter.phone.replaceAll("-", "")}`}>
                  {shelter.phone}
                </a>
                <a href={shelter.website} target="_blank" rel="noreferrer">
                  Visit website
                </a>
              </article>
            ))}
          </div>
        </div>

      </section>
      <BottomNav />
    </main>
  );
}
