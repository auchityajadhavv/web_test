import Reveal from './Reveal'
import { openDemo } from '../lib/openDemo'
import './Pricing.css'

const PLANS = [
  {
    name: 'Starter',
    price: '499',
    note: 'For a single counter finding its feet.',
    features: ['1 Revora stand', 'NFC + QR feedback', 'Suggested Google reviews', 'Basic dashboard'],
    featured: false,
  },
  {
    name: 'Growth',
    price: '999',
    note: 'For venues serious about their rating.',
    features: [
      'Up to 3 stands',
      'Everything in Starter',
      'Private issue routing',
      'Custom card branding',
      'Full review analytics',
    ],
    featured: true,
  },
  {
    name: 'Managed',
    price: '2,499',
    note: 'We run the loop; you read the results.',
    features: [
      'Unlimited stands',
      'Everything in Growth',
      'Dedicated success manager',
      'Monthly reputation report',
    ],
    featured: false,
  },
]

export default function Pricing() {
  return (
    <section className="section pricing" id="pricing">
      <div className="container">
        <Reveal className="pricing__head">
          <span className="eyebrow">Pricing</span>
          <h2 className="h2">Simple plans for real businesses.</h2>
          <p className="lead">Ask our team to confirm hardware, installation, taxes, and feature availability before choosing a plan.</p>
        </Reveal>

        <div className="pricing__grid">
          {PLANS.map((p, i) => (
            <Reveal
              as="article"
              key={p.name}
              className={`pricing__card glass ${p.featured ? 'is-featured' : ''}`}
              delay={i * 70}
            >
              {p.featured && <span className="mono pricing__badge">Most popular</span>}
              <h3 className="pricing__name">{p.name}</h3>
              <p className="pricing__note">{p.note}</p>
              <div className="pricing__price">
                <span className="pricing__cur">₹</span>
                <span className="pricing__amt">{p.price}</span>
                <span className="mono pricing__per">/mo</span>
              </div>
              <hr className="hairline" />
              <ul className="pricing__features">
                {p.features.map((f) => (
                  <li key={f} className="pricing__feat">
                    <Check />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                className={`btn ${p.featured ? 'btn-primary' : 'btn-ghost'} pricing__cta`}
                onClick={() => openDemo(p.name)}
              >
                {p.featured ? 'Start with Growth' : `Choose ${p.name}`}
              </button>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

function Check() {
  return (
    <svg className="pricing__check" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 8.5 6.2 11.5 13 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
