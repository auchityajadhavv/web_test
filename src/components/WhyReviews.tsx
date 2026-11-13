import Reveal from "./Reveal";
import "./WhyReviews.css";

const POINTS = [
  {
    k: "01",
    t: "Hear the details that matter",
    b: "A simple prompt helps guests explain what felt good, and what could be better.",
  },
  {
    k: "02",
    t: "Keep the guest in control",
    b: "Guests can edit a draft in their own words and choose whether to share a public review.",
  },
  {
    k: "03",
    t: "Give the conversation a next step",
    b: "Bring useful feedback back to the people who can make the next visit better.",
  },
];
export default function WhyReviews() {
  return (
    <section className="section wr" id="reviews">
      <div className="container wr__grid">
        <div className="wr__copy">
          <Reveal>
            <span className="eyebrow">A little listening goes a long way</span>
            <h2 className="h2 wr__h2">
              Behind every review,
              <br />
              there’s a real experience.
            </h2>
          </Reveal>
          <ul className="wr__points">
            {POINTS.map((p, i) => (
              <Reveal as="li" key={p.k} className="wr__point" delay={i * 50}>
                <span className="mono wr__pointK">{p.k}</span>
                <div>
                  <h3 className="wr__pointT">{p.t}</h3>
                  <p className="wr__pointB">{p.b}</p>
                </div>
              </Reveal>
            ))}
          </ul>
        </div>
        <Reveal className="wr__example">
          <div className="wr__exampleTop">
            <span className="wr__exampleLogo">R</span>
            <div>
              <strong>A moment after the visit</strong>
              <span>Illustrative guest feedback</span>
            </div>
            <span className="mono wr__sample">EXAMPLE</span>
          </div>
          <p className="wr__question">How was your experience?</p>
          <div className="wr__responses">
            {[
              { label: "Service", value: "Thoughtful", width: "88%" },
              { label: "Quality", value: "Excellent", width: "91%" },
              { label: "Overall experience", value: "Great", width: "86%" },
            ].map((row) => (
              <div className="wr__response" key={row.label}>
                <div>
                  <span>{row.label}</span>
                  <span>{row.value}</span>
                </div>
                <div className="wr__track">
                  <span style={{ width: row.width }} />
                </div>
              </div>
            ))}
          </div>
          <div className="wr__draft">
            <span className="mono">A DRAFT, IN YOUR WORDS</span>
            <p>
              “A polished experience from start to finish. The team was
              thoughtful, and the quality really stood out.”
            </p>
            <span>Edit it. Make it yours. Share only if you want to.</span>
          </div>
          <p className="wr__disclaimer">
            Sample content for demonstration. No feedback or review is
            submitted.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
