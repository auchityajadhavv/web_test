import { useCallback, useEffect, useRef, useState } from 'react'
import Logo from './Logo'
import { openDemo } from '../lib/openDemo'
import './Nav.css'
import { useDialog } from '../hooks/useDialog'

const LINKS = [
  { label: 'How it works', href: '#flow' },
  { label: 'Why Revora', href: '#why' },
  { label: 'Products', href: '#products' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'FAQ', href: '#faq' },
]

export default function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState('')
  const dialogRef = useRef<HTMLDialogElement>(null)
  const close = useCallback(() => setOpen(false), [])
  useDialog(dialogRef, open, close)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // highlight the nav link for whichever section is currently in view
  useEffect(() => {
    const sections = LINKS.map((l) => document.querySelector(l.href)).filter(
      (el): el is Element => !!el,
    )
    if (!sections.length) return
    const obs = new IntersectionObserver(
      (entries) => {
        // the section occupying the middle band of the viewport wins
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        if (visible[0]) setActive('#' + visible[0].target.id)
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: [0, 0.5, 1] },
    )
    sections.forEach((s) => obs.observe(s))
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    const media = matchMedia('(min-width: 901px)')
    const resize = () => { if (media.matches) setOpen(false) }
    media.addEventListener('change', resize)
    return () => media.removeEventListener('change', resize)
  }, [])

  return (
    <header className={`nav ${scrolled ? 'is-scrolled' : ''}`}>
      <div className="nav__inner container">
        <Logo />

        <nav className="nav__links" aria-label="Primary">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className={`nav__link ${active === l.href ? 'is-active' : ''}`}
              aria-current={active === l.href ? 'true' : undefined}
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="nav__actions">
          <button className="btn btn-primary nav__cta" onClick={() => openDemo()}>
            Book a demo
          </button>
          <button
            className={`nav__burger ${open ? 'is-open' : ''}`}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="mobile-navigation"
            onClick={() => setOpen((v) => !v)}
          >
            <span />
            <span />
          </button>
        </div>
      </div>

      {/* mobile sheet */}
      <dialog ref={dialogRef} id="mobile-navigation" aria-label="Mobile navigation" className={`nav__sheet ${open ? 'is-open' : ''}`} onClick={close}>
        <div className="nav__sheetInner" onClick={(e) => e.stopPropagation()}>
          <button className="btn btn-ghost" onClick={close}>Close menu</button>
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="nav__sheetLink" onClick={() => setOpen(false)}>
              {l.label}
            </a>
          ))}
          <button
            className="btn btn-primary nav__sheetCta"
            onClick={() => {
              setOpen(false)
              openDemo()
            }}
          >
            Book a demo
          </button>
        </div>
      </dialog>
    </header>
  )
}
