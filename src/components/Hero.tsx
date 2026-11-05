import ArrowIcon from "./ArrowIcon";
import TryDemo from "./TryDemo";
import { openDemo } from "../lib/openDemo";
import OrbitVisual from "./OrbitVisual";
import "./Hero.css";

export default function Hero() {
  return (
    <section className="hero" id="top">
      <div className="container hero__inner">
        <div className="hero__copy">
          <span className="hero__eyebrow mono">
            REVORA <span aria-hidden="true">/</span> NFC + QR
          </span>
          <h1 className="hero__h1">
            Experiences that <span className="text-purple">matter.</span>
          </h1>
          <p className="hero__sub">
            One tap for honest feedback. A simple way for your guests to share
            their experience, in their own words.
          </p>
          <div className="hero__actions">
            <button className="btn btn-primary" onClick={() => openDemo()}>
              Book a demo <ArrowIcon />
            </button>
            <TryDemo label="Try it yourself" variant="ghost" />
          </div>
          <p className="hero__note">No app. No guest sign-up.</p>
        </div>
        <div className="hero__orbit">
          <OrbitVisual />
        </div>
        <a href="#products" className="hero__scroll mono">
          <span>Discover Revora</span>
          <ArrowIcon down />
        </a>
      </div>
    </section>
  );
}
