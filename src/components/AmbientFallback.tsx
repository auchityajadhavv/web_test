import '../three/AmbientField.css'

export default function AmbientFallback() {
  return <div className="ambient ambient--fallback" aria-hidden="true">
    <span className="ambient__glow" />
    {[1, 2, 3].map(n => <span key={n} className={`ambient__ring ambient__ring--${n}`} />)}
  </div>
}
