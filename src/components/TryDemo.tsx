import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import './TryDemo.css'
import { useDialog } from '../hooks/useDialog'

/**
 * "Try it yourself" — opens the real, interactive REVORA guest review flow
 * (public/demo.html) inside a phone frame so a prospect can drag the sliders
 * and watch the AI write their review, hands-on.
 */
export default function TryDemo({
  label = 'Try it yourself',
  variant = 'primary',
}: {
  label?: string
  variant?: 'primary' | 'ghost'
}) {
  const [open, setOpen] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const closeRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const close = useCallback(() => setOpen(false), [])
  useDialog(dialogRef, open, close)

  useEffect(() => {
    if (!open) return
    setLoaded(false)
    // fallback: never let the loader linger even if the iframe load event is slow
    const t = window.setTimeout(() => setLoaded(true), 4000)
    return () => {
      window.clearTimeout(t)
    }
  }, [open])

  return (
    <>
      <button
        className={`btn ${variant === 'ghost' ? 'btn-ghost' : 'btn-primary'} trydemo__btn`}
        onClick={() => setOpen(true)}
      >
        <span className="trydemo__spark" aria-hidden="true" />
        {label}
      </button>

      {open && createPortal(
        <dialog ref={dialogRef} className="trydemo__overlay" aria-label="Try the REVORA guest demo" onClick={close}>
          <div className="trydemo__sheet" onClick={(e) => e.stopPropagation()}>
            <div className="trydemo__bar">
              <span className="mono trydemo__hint">Interactive example — no feedback is sent. Drag the sliders.</span>
              <button ref={closeRef} className="trydemo__close" aria-label="Close demo" onClick={() => setOpen(false)}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
              </button>
            </div>
            <div className="trydemo__phone">
              {!loaded && <div className="trydemo__loading mono">Loading demo…</div>}
              <iframe
                title="REVORA guest review demo"
                src="/demo.html"
                onLoad={() => setLoaded(true)}
                allow="clipboard-write"
              />
            </div>
          </div>
        </dialog>,
        document.body,
      )}
    </>
  )
}
