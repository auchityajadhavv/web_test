import { useState } from "react";
import Reveal from "./Reveal";
import "./Faq.css";

const QA = [
  {
    q: "Do my guests need an app?",
    a: "No. They tap the card with any modern phone, or scan the QR — the feedback page opens straight in their browser. Nothing to download, nothing to sign up for.",
  },
  {
    q: "How does Revora get more Google reviews without faking them?",
    a: "The interactive example creates a sample draft from the sliders. It does not publish anything. Guests should review and edit any draft so it reflects their own experience.",
  },
  {
    q: "What happens when someone leaves negative feedback?",
    a: "Guests can share honest feedback across the full rating range. The example sends no data; ask our team about the private feedback workflow for your venue.",
  },
  {
    q: "How long does setup take?",
    a: "We’ll confirm setup steps and timing during your demo, including linking the stand to your venue.",
  },
  {
    q: "Which businesses is it for?",
    a: "Anywhere a guest leaves with an opinion — restaurants, cafés, salons, hotels, gyms, clinics and retail all use the same stand.",
  },
];

export default function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="section faq" id="faq">
      <div className="container faq__grid">
        <Reveal className="faq__head">
          <span className="eyebrow">FAQ</span>
          <h2 className="h2">The questions we always get.</h2>
        </Reveal>

        <Reveal className="faq__list" delay={80}>
          {QA.map((item, i) => {
            const isOpen = open === i;
            return (
              <div
                className={`faq__item ${isOpen ? "is-open" : ""}`}
                key={item.q}
              >
                <button
                  className="faq__q"
                  id={`faq-question-${i}`}
                  aria-controls={`faq-answer-${i}`}
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? null : i)}
                >
                  <span>{item.q}</span>
                  <span className="faq__icon" aria-hidden="true" />
                </button>
                <div
                  className="faq__aWrap"
                  id={`faq-answer-${i}`}
                  role="region"
                  aria-labelledby={`faq-question-${i}`}
                  hidden={!isOpen}
                >
                  <div className="faq__a">{item.a}</div>
                </div>
              </div>
            );
          })}
        </Reveal>
      </div>
    </section>
  );
}
