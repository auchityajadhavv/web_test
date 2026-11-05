import ArrowIcon from "./ArrowIcon";
import Reveal from "./Reveal";
import "./WhyRevora.css";

// bento benefits — sizes vary to make the grid feel composed, not templated
const CELLS = [
  {
    span: "wide",
    stat: "NFC + QR",
    title: "Make feedback easier",
    body: "Give guests a simple way to share their experience. Results depend on your venue and participation.",
  },
  {
    span: "tall",
    stat: null,
    title: "Catch issues privately",
    body: "Give guests a private way to explain a problem, while keeping their choice to share an honest public review.",
  },
  {
    span: "small",
    stat: null,
    title: "See what guests think",
    body: "Explore the guest feedback experience, then discuss reporting options with our team.",
  },
  {
    span: "small",
    stat: "No app",
    title: "A familiar way to connect",
    body: "Tap an NFC-enabled phone or scan the QR code to open the feedback page.",
  },
  {
    span: "wide",
    stat: null,
    title: "Built for every counter",
    body: "Restaurants, cafés, salons, hotels, gyms, clinics, retail — anywhere a guest leaves with an opinion.",
  },
];

export default function WhyRevora() {
  return (
    <section className="section wrv" id="why">
      <div className="container">
        <Reveal className="wrv__head">
          <span className="eyebrow">Why Revora</span>
          <h2 className="h2">Protect your reputation. Grow it in public.</h2>
        </Reveal>

        <div className="wrv__bento">
          {CELLS.map((c, i) => (
            <Reveal
              as="article"
              key={c.title}
              className={`wrv__cell glass wrv__cell--${c.span}`}
              delay={i * 60}
            >
              {c.span === "tall" && (
                <span className="wrv__icon">
                  <ArrowIcon />
                </span>
              )}
              {c.stat && <span className="mono wrv__stat">{c.stat}</span>}
              <h3 className="wrv__cellTitle">{c.title}</h3>
              <p className="wrv__cellBody">{c.body}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
