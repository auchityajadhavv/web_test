import OrbitVisual from "./OrbitVisual";
import "./Logo.css";

export default function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <a href="#top" className="logo" aria-label="REVORA — home">
      <span className="logo__mark">
        <OrbitVisual compact />
      </span>
      {!compact && (
        <img
          className="logo__wordmark"
          src="/assets/revora-logo.png"
          alt="REVORA"
          width="118"
          height="24"
        />
      )}
    </a>
  );
}
