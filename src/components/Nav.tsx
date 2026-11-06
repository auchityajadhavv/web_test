import { useCallback, useEffect, useRef, useState } from 'react'
import './Nav.css'
import { useDialog } from '../hooks/useDialog'

export default function Nav() {
  const root = useRef<HTMLElement>(null)
  const mark = useRef<HTMLAnchorElement>(null)
  const links = useRef<HTMLElement>(null)
  const [open, setOpen] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null)
  const close = useCallback(() => setOpen(false), [])
  useDialog(dialog, open, close)
  useEffect(() => {
    let frame = 0
    const reduced = matchMedia('(prefers-reduced-motion: reduce)')
    const draw = () => {
      frame = 0
      const w = innerWidth, mobile = w < 700
      const gutter = mobile ? 22 : Math.max(40, (w - 1280) / 2)
      const initial = Math.min(w - gutter * 2, 1280)
      const end = mobile ? 125 : 166
      const p = reduced.matches ? (scrollY > 30 ? 1 : 0) : Math.min(1, Math.max(0, scrollY / (mobile ? 200 : 390)))
      if (mark.current) {
        mark.current.style.width = `${initial}px`
        mark.current.style.transform = `translate3d(${gutter}px,${(mobile ? 90 : 108) * (1-p) + 25*p}px,0) scale(${1 + (end / initial - 1) * p})`
      }
      if (links.current) links.current.style.transform = `translateX(${mobile ? 0 : -(w / 2 - gutter - 225) * (1-p)}px)`
      root.current?.style.setProperty('--nav-progress', String(p))
      root.current?.classList.toggle('is-docked', p > .95)
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(draw) }
    draw()
    addEventListener('scroll', schedule, { passive: true }); addEventListener('resize', schedule)
    reduced.addEventListener('change', schedule)
    return () => { cancelAnimationFrame(frame); removeEventListener('scroll', schedule); removeEventListener('resize', schedule); reduced.removeEventListener('change', schedule) }
  }, [])
  return <header ref={root} className="morph-nav">
    <a ref={mark} href="#top" className="morph-nav__logo" aria-label="REVORA home"><img src="/assets/revora-logo.png" alt="REVORA" width="900" height="180" /></a>
    <button className="morph-nav__toggle" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} aria-controls="primary-links" onClick={() => setOpen(!open)}>Menu</button>
    <nav ref={links} id="primary-links" aria-label="Primary" className={`morph-nav__links ${open ? 'is-open' : ''}`}>
      {[['How it works','#flow'],['For your business','#customize'],['Pricing','#pricing']].map(([label,href]) => <a key={href} href={href} onClick={() => setOpen(false)}>{label}</a>)}
    </nav>
    <dialog ref={dialog} className="morph-nav__dialog" aria-label="Mobile navigation"><button className="btn btn-ghost" onClick={close}>Close menu</button>{[['How it works','#flow'],['For your business','#customize'],['Pricing','#pricing']].map(([label,href])=><a key={href} href={href} onClick={close}>{label}</a>)}</dialog>
  </header>
}
