import Reveal from "./Reveal";
import "./WhyRevora.css";

const BENEFITS = [
  {
    title: "An easier invitation.",
    body: "NFC or QR. Your guests open the experience on their own phone, with no app to download.",
  },
  {
    title: "Their words. Their choice.",
    body: "A space for honest feedback and an editable review draft. Sharing publicly stays with the guest.",
  },
  {
    title: "A considered detail.",
    body: "Black acrylic, brushed gold, and a place on your counter. Explore branding that fits your venue.",
  },
];
export default function WhyRevora() {
  return (
    <section className="section wrv" id="why">
      <div className="container">
        <Reveal className="wrv__head">
          <span className="eyebrow">The thinking behind Revora</span>
          <h2 className="h2">
            Less friction.
            <br />
            More connection.
          </h2>
        </Reveal>
        <div className="wrv__benefits">
          {BENEFITS.map((benefit, i) => (
            <Reveal
              as="article"
              className="wrv__benefit"
              key={benefit.title}
              delay={i * 60}
            >
              <span className="mono wrv__number">0{i + 1}</span>
              <h3>{benefit.title}</h3>
              <p>{benefit.body}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
