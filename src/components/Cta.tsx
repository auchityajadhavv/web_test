import Reveal from "./Reveal";
import { openDemo } from "../lib/openDemo";
import "./Cta.css";

export default function Cta() {
  return (
    <section className="section cta" id="cta">
      <div className="container">
        <Reveal className="cta__panel">
          <div className="cta__glow" aria-hidden="true" />
          <span className="eyebrow">Get started</span>
          <h2 className="cta__h2">Good conversations start with a tap.</h2>
          <p className="lead cta__lead">
            Tell us a little about your venue. We’ll help you explore the stand,
            the guest experience, and the right setup for you.
          </p>
          <div className="cta__actions">
            <button
              className="btn btn-primary cta__primary"
              onClick={() => openDemo()}
            >
              Book a demo
            </button>
            <a href="#pricing" className="btn btn-ghost">
              Explore plans
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
