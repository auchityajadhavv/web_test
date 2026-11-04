import { useEffect, useRef, useState } from 'react'

type TurnstileAPI = {
  render: (element: HTMLElement, options: Record<string, unknown>) => string
  remove: (id: string) => void
}
declare global { interface Window { turnstile?: TurnstileAPI } }
let ready: Promise<void> | undefined
function loadTurnstile() {
  if (window.turnstile) return Promise.resolve()
  if (!ready) ready = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.async = true
    script.onload = () => { if (window.turnstile) resolve(); else { ready = undefined; reject(new Error('Verification unavailable')) } }
    script.onerror = () => { script.remove(); ready = undefined; reject(new Error('Verification unavailable')) }
    document.head.append(script)
  })
  return ready
}
export default function Turnstile({ onToken, attempt }: { onToken: (token: string) => void; attempt: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    let disposed = false
    let widget: string | undefined
    setError('')
    onToken('')
    loadTurnstile().then(() => {
      if (disposed || !ref.current || !window.turnstile) return
      widget = window.turnstile.render(ref.current, {
        sitekey: import.meta.env.VITE_TURNSTILE_SITE_KEY, action: 'request-demo', theme: 'dark',
        callback: (token: string) => { setError(''); onToken(token) },
        'expired-callback': () => onToken(''),
        'error-callback': () => { onToken(''); setError('Verification unavailable. Check your connection and reopen the form.') },
      })
    }).catch(() => { if (!disposed) setError('Verification could not load. Please reopen the form to retry.') })
    return () => { disposed = true; if (widget !== undefined) window.turnstile?.remove(widget) }
  }, [onToken, attempt])
  return <div><div ref={ref} />{error && <p role="alert" className="dm__error">{error}</p>}</div>
}
