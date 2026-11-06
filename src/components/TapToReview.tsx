import { useEffect, useRef } from "react";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { usePageVisible } from "../hooks/usePageVisible";
import Reveal from "./Reveal";
import ReviewPhone from "./ReviewPhone";
import TryDemo from "./TryDemo";
import { useInView } from "../hooks/useInView";
import "./TapToReview.css";

const STEPS = [
  {
    n: "01",
    t: "Tap the card",
    b: "A customer taps their phone — or scans the QR. No app, no sign-up.",
  },
  {
    n: "02",
    t: "Private feedback",
    b: "A quiet page opens. Only you see the honest answers.",
  },
  {
    n: "03",
    t: "Review a draft",
    b: "Explore an example draft based on the feedback. Customers can edit it in their own words.",
  },
  {
    n: "04",
    t: "Choose to share",
    b: "Customers choose whether to share their honest review on Google.",
  },
];

export default function TapToReview() {
  // only load the (heavy) tap video once the section is near the viewport
  const [tapRef, tapInView] = useInView<HTMLDivElement>({
    rootMargin: "300px",
  });

  const reduced = useReducedMotion();
  const visible = usePageVisible();
  const videoRef = useRef<HTMLVideoElement>(null);
  const connection = (
    navigator as Navigator & { connection?: { saveData?: boolean } }
  ).connection;
  const playVideo = tapInView && !reduced && !connection?.saveData;
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && visible) void video.play().catch(() => {});
      else video.pause();
    });
    observer.observe(video);
    return () => {
      observer.disconnect();
      video.pause();
    };
  }, [playVideo, visible]);
  return (
    <section className="section flow" id="flow">
      <div className="container">
        <Reveal className="flow__head">
          <span className="eyebrow">How it works</span>
          <h2 className="h2">From your counter to their conversation.</h2>
          <p className="lead flow__lead">
            Watch what a guest sees — from the tap on the table to an editable
            example review. Nothing is submitted by this demo.
          </p>
        </Reveal>

        <Reveal className="flow__stage">
          {/* the tap — a card standing on the table */}
          <div className="flow__tap">
            <div className="flow__tapMedia" ref={tapRef}>
              {playVideo ? (
                <video
                  ref={videoRef}
                  src="/assets/revora-tap.mp4"
                  poster="/assets/poster.jpg"
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  aria-label="A hand tapping the REVORA card"
                />
              ) : (
                <img
                  src="/assets/poster.jpg"
                  alt="A hand about to tap the REVORA card"
                />
              )}
              <span className="flow__tapTag mono">NFC · tap to open</span>
            </div>
          </div>

          {/* the NFC signal travelling from card → phone */}
          <div className="flow__link" aria-hidden="true">
            <span className="flow__linkLabel mono">signal</span>
            <div className="flow__wire">
              <span className="flow__pulse" />
              <span className="flow__pulse flow__pulse--2" />
            </div>
          </div>

          {/* the review page waking up */}
          <div className="flow__phone">
            <span className="flow__phoneGlow" aria-hidden="true" />
            <ReviewPhone />
          </div>
        </Reveal>

        <Reveal className="flow__try">
          <TryDemo label="Try it yourself" />
          <span className="flow__tryNote mono">
            Interactive sample — no feedback is submitted
          </span>
        </Reveal>

        <ol className="flow__steps">
          {STEPS.map((s, i) => (
            <Reveal as="li" key={s.n} className="flow__step" delay={i * 60}>
              <span className="mono flow__stepNo">{s.n}</span>
              <h3 className="flow__stepTitle">{s.t}</h3>
              <p className="flow__stepBody">{s.b}</p>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
