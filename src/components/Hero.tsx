import { Suspense, lazy } from 'react'
import TryDemo from './TryDemo'
import { openDemo } from '../lib/openDemo'
import './Hero.css'
import AmbientFallback from './AmbientFallback'
import { useReducedMotion } from '../hooks/useReducedMotion'

// defer the 3D field (three.js) so hero text paints immediately
const AmbientField = lazy(() => import('../three/AmbientField'))

const STATS = [
  { big: 'NFC + QR', label: 'two ways to connect' },
  { big: 'No app', label: 'for your guests' },
  { big: '1 tap', label: 'for guests' },
]

export default function Hero() {
  const reduced = useReducedMotion()
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection
  const light = reduced || window.innerWidth < 720 || (navigator.hardwareConcurrency || 8) <= 4 || connection?.saveData || ['slow-2g', '2g'].includes(connection?.effectiveType || '')
  return (
    <section className="hero" id="top">
      <Suspense fallback={<AmbientFallback />}>
        {light ? <AmbientFallback /> : <AmbientField />}
      </Suspense>
      <div className="hero__scrim" aria-hidden="true" />

      <div className="container hero__inner">
        <span className="eyebrow">Feedback that becomes reputation</span>
        <h1 className="hero__h1">
          Experiences that <span className="text-purple">matter.</span>
        </h1>
        <p className="lead hero__sub">
          An NFC + QR stand for your counter. Guests tap to share feedback
          and can choose to write a Google review.
        </p>
        <div className="hero__actions">
          <button className="btn btn-primary" onClick={() => openDemo()}>Book a demo</button>
          <TryDemo label="Try it yourself" variant="ghost" />
          <a href="#flow" className="hero__link">See how it works →</a>
        </div>
        <dl className="hero__stats">
          {STATS.map((s) => (
            <div key={s.label} className="hero__stat">
              <dt className="mono hero__statBig">{s.big}</dt>
              <dd className="mono hero__statLabel">{s.label}</dd>
            </div>
          ))}
        </dl>
      </div>

      <a href="#flow" className="hero__cue" aria-label="Scroll to see how it works">
        <span className="mono">Scroll</span>
        <span className="hero__cueLine" />
      </a>
    </section>
  )
}
