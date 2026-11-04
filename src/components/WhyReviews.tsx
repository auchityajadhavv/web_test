import Reveal from './Reveal'
import './WhyReviews.css'

const POINTS = [
  {
    k: 'Rank',
    t: 'Reviews help you stand out',
    b: 'Reviews are one part of local visibility, alongside relevance and distance.',
  },
  {
    k: 'Trust',
    t: 'Rating + count = instant trust',
    b: 'Recent, honest reviews help guests decide whether your venue is right for them.',
  },
  {
    k: 'Fresh',
    t: 'Recent reviews keep you there',
    b: 'A steady stream of fresh reviews signals a place that’s alive right now.',
  },
  {
    k: 'Compound',
    t: 'Visibility compounds into walk-ins',
    b: 'Being seen turns into footfall. Revora starts that loop and keeps it turning.',
  },
]

const RANKS = [
  { name: 'Your venue', tag: 'Revora-powered', score: '4.9', count: '340', you: true },
  { name: 'The corner bistro', tag: 'Nearby', score: '4.4', count: '128', you: false },
  { name: 'Riverside kitchen', tag: 'Nearby', score: '4.2', count: '96', you: false },
  { name: 'Old town café', tag: 'Nearby', score: '4.0', count: '61', you: false },
]

export default function WhyReviews() {
  return (
    <section className="section wr" id="reviews">
      <div className="container wr__grid">
        <div className="wr__copy">
          <Reveal>
            <span className="eyebrow">Why Google reviews matter</span>
            <h2 className="h2 wr__h2">Google reviews decide who walks in.</h2>
          </Reveal>
          <ul className="wr__points">
            {POINTS.map((p, i) => (
              <Reveal as="li" key={p.k} className="wr__point" delay={i * 60}>
                <span className="mono wr__pointK">{p.k}</span>
                <div>
                  <h3 className="wr__pointT">{p.t}</h3>
                  <p className="wr__pointB">{p.b}</p>
                </div>
              </Reveal>
            ))}
          </ul>
        </div>

        <Reveal className="wr__widget glass" delay={120}>
          <div className="wr__widgetHead">
            <span className="mono wr__widgetLabel">Illustrative example · not live Google rankings</span>
          </div>
          <ol className="wr__ranks">
            {RANKS.map((r, i) => (
              <li key={r.name} className={`wr__rank ${r.you ? 'is-you' : ''}`}>
                <span className="mono wr__rankNo">{i + 1}</span>
                <div className="wr__rankMain">
                  <span className="wr__rankName">{r.name}</span>
                  <span className="mono wr__rankTag">{r.tag}</span>
                </div>
                {/* ratings as numbers only — no star glyphs */}
                <span className="mono wr__rankScore">
                  {r.score} <span className="wr__rankCount">· {r.count}</span>
                </span>
              </li>
            ))}
          </ol>
        </Reveal>
      </div>
    </section>
  )
}
