import ArrowIcon from "./ArrowIcon";
import TryDemo from "./TryDemo";
import { openDemo } from "../lib/openDemo";
import AmbientFallback from "./AmbientFallback";
import "./Hero.css";

export default function Hero() {
  return (
    <section className="hero" id="top">
      <AmbientFallback />
      <div className="container hero__inner">
        <div className="hero__copy">
          <span className="hero__pill">
            <span aria-hidden="true" />
            Small stand. Meaningful connections.
          </span>
          <h1 className="hero__h1">
            Experiences that <span className="text-purple">matter.</span>
          </h1>
          <p className="hero__sub">
            Give every guest a simple way to be heard. A beautifully made NFC +
            QR stand for honest feedback and optional Google reviews.
          </p>
          <div className="hero__actions">
            <button className="btn btn-primary" onClick={() => openDemo()}>
              Book a demo <ArrowIcon />
            </button>
            <TryDemo label="Try it yourself" variant="ghost" />
          </div>
          <p className="hero__note">No app to download. No guest sign-up.</p>
          <a href="#products" className="hero__link">
            Meet the stand <ArrowIcon down />
          </a>
        </div>
        <figure className="hero__product">
          <div className="hero__productHead">
            <span className="mono">THE REVORA STAND</span>
            <span className="hero__edition">Black &amp; gold</span>
          </div>
          <div className="hero__productImage">
            <img
              src="/assets/poster.jpg"
              alt="The REVORA black acrylic NFC and QR card seated in its brushed-gold stand"
              width="743"
              height="743"
              decoding="async"
            />
          </div>
          <figcaption>
            <div>
              <span className="hero__productTitle">
                A little presence.
                <br />A lasting impression.
              </span>
              <span className="hero__productDetail">
                Made for the moments after a good visit.
              </span>
            </div>
            <span className="hero__nfc" aria-label="Tap or scan">
              NFC<span>+</span>QR
            </span>
          </figcaption>
        </figure>
      </div>
      <div className="container hero__fit">
        <p>
          A place on your counter.
          <br />
          <strong>A voice for your guests.</strong>
        </p>
        <ul aria-label="Designed for these venues">
          <li>Restaurants</li>
          <li>Cafés</li>
          <li>Hotels</li>
          <li>Salons &amp; retail</li>
        </ul>
      </div>
    </section>
  );
}
