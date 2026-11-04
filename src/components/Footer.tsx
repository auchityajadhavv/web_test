import Logo from './Logo'
import { openDemo } from '../lib/openDemo'
import './Footer.css'

type Link = { label: string; href?: string; action?: 'demo' }

const COLS: { title: string; links: Link[] }[] = [
  {
    title: 'Explore',
    links: [
      { label: 'How it works', href: '#flow' },
      { label: 'Why Revora', href: '#why' },
      { label: 'Products', href: '#products' },
      { label: 'Pricing', href: '#pricing' },
      { label: 'FAQ', href: '#faq' },
    ],
  },
  {
    title: 'Get started',
    links: [
      { label: 'Book a demo', action: 'demo' },
      { label: 'See the demo', href: '#flow' },
      { label: 'On the map', href: '#map' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'Contact us', action: 'demo' },
      { label: 'revora.org.com@gmail.com', href: 'mailto:revora.org.com@gmail.com' },
    ],
  },
]

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <hr className="hairline footer__rule" />
        <div className="footer__top">
          <div className="footer__brand">
            <Logo />
            <p className="footer__tag">Experiences that matter.</p>
          </div>
          <div className="footer__cols">
            {COLS.map((c) => (
              <nav className="footer__col" key={c.title} aria-label={c.title}>
                <span className="mono footer__colTitle">{c.title}</span>
                {c.links.map((l) =>
                  l.action === 'demo' ? (
                    <button key={l.label} className="footer__link" onClick={() => openDemo()}>
                      {l.label}
                    </button>
                  ) : (
                    <a key={l.label} href={l.href} className="footer__link">
                      {l.label}
                    </a>
                  ),
                )}
              </nav>
            ))}
          </div>
        </div>
        <div className="footer__bottom">
          <span className="mono footer__copy">© 2026 Revora · Made in Mumbai</span>
          <span className="mono footer__built">Reputation, one tap at a time</span>
        </div>
      </div>
    </footer>
  )
}
