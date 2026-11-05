import ArrowIcon from "./ArrowIcon";
import Reveal from "./Reveal";
import { openDemo } from "../lib/openDemo";
import "./Products.css";

const PRODUCTS = [
  {
    name: "The card",
    body: "A detachable black acrylic card. Guests tap with an NFC-enabled phone or scan the printed QR code.",
    detail: "Two ways in. One simple experience.",
  },
  {
    name: "The stand",
    body: "A weighted, brushed-gold base that gives your feedback card a considered place on the counter.",
    detail: "Black acrylic. Brushed gold. Made to belong.",
  },
  {
    name: "Your finishing touch",
    body: "Discuss your logo, venue name, and card design with our team. A small detail that feels like your brand.",
    detail: "Your venue, down to the details.",
  },
];
export default function Products() {
  return (
    <section className="section prod" id="products">
      <div className="container">
        <Reveal className="prod__head">
          <div>
            <span className="eyebrow">Meet your new front-of-house detail</span>
            <h2 className="h2">
              Designed to belong.
              <br />
              <span className="text-purple">Built to connect.</span>
            </h2>
          </div>
          <p className="lead">
            The smallest things shape a guest’s experience. Make asking for
            feedback one of the thoughtful ones.
          </p>
        </Reveal>
        <div className="prod__layout">
          <Reveal as="figure" className="prod__visual">
            <img
              src="/assets/revora-lifestyle.webp"
              alt="A black-and-gold REVORA stand on a warmly lit restaurant counter"
              loading="lazy"
              decoding="async"
              width="1448"
              height="1086"
            />
            <figcaption>
              <span>Good design has a place at the table.</span>
              <span className="mono">REVORA / NFC + QR</span>
            </figcaption>
          </Reveal>
          <div className="prod__details">
            {PRODUCTS.map((product, i) => (
              <Reveal
                as="article"
                key={product.name}
                className="prod__item"
                delay={i * 50}
              >
                <span className="prod__number mono">0{i + 1}</span>
                <div>
                  <h3>{product.name}</h3>
                  <p>{product.body}</p>
                  <span className="prod__detail">{product.detail}</span>
                </div>
              </Reveal>
            ))}
            <button className="prod__contact" onClick={() => openDemo()}>
              Find the right setup for your venue <ArrowIcon />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
