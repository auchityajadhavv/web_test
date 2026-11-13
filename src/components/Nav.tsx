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
    let lastProgress = -1
    let metrics = { width: 0, mobile: false, gutter: 0, initial: 0, end: 0, distance: 0, linkShift: 0 }
    const reduced = matchMedia('(prefers-reduced-motion: reduce)')
    const measure = () => {
      const width = innerWidth
      const mobile = width < 700
      const tablet = width >= 700 && width < 1100
      const gutter = mobile ? 20 : tablet ? 30 : Math.max(40, (width - 1280) / 2)
      const initial = Math.min(width - gutter * 2, 1280)
      const end = mobile ? 116 : tablet ? 142 : 166
      metrics = {
        width, mobile, gutter, initial, end,
        distance: mobile ? 150 : tablet ? 190 : 230,
        linkShift: mobile ? 0 : Math.max(0, width / 2 - gutter - (tablet ? 190 : 225)),
      }
      if (mark.current) mark.current.style.width = `${initial}px`
      lastProgress = -1
    }
    const draw = () => {
      frame = 0
      const raw = reduced.matches ? (scrollY > 30 ? 1 : 0) : Math.min(1, Math.max(0, scrollY / metrics.distance))
      const p = reduced.matches ? raw : 1 - Math.pow(1 - raw, 3)
      if (Math.abs(p - lastProgress) < 0.001) return
      lastProgress = p
      if (mark.current) {
        const startY = metrics.mobile ? 82 : 98
        mark.current.style.transform = `translate3d(${metrics.gutter}px,${startY * (1-p) + 23*p}px,0) scale(${1 + (metrics.end / metrics.initial - 1) * p})`
      }
      if (links.current) links.current.style.transform = `translate3d(${-metrics.linkShift * (1-p)}px,0,0)`
      root.current?.style.setProperty('--nav-progress', String(p))
      root.current?.classList.toggle('is-docked', p > .97)
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(draw) }
    const resize = () => { measure(); schedule() }
    measure(); draw()
    addEventListener('scroll', schedule, { passive: true }); addEventListener('resize', resize, { passive: true })
    reduced.addEventListener('change', schedule)
    return () => { cancelAnimationFrame(frame); removeEventListener('scroll', schedule); removeEventListener('resize', resize); reduced.removeEventListener('change', schedule) }
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
