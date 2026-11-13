import { FormEvent, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import './guest-feedback.css'

type Config = {
  businessName: string
  locationName: string
  standLabel: string
  logoUrl: string | null
  primaryColor: string
  accentColor: string
  reviewUrl: string | null
}

type Scores = { service: number; quality: number; overall: number }
const demoConfig: Config = {
  businessName: 'Your Business', locationName: 'Main location', standLabel: 'Front counter',
  logoUrl: null, primaryColor: '#202124', accentColor: '#F2F3F4', reviewUrl: 'https://revora-live.vercel.app',
}

export default function GuestFeedback() {
  const { code = '' } = useParams()
  const isDemo = code === 'demo'
  const [config, setConfig] = useState<Config | null>(isDemo ? demoConfig : null)
  const [scores, setScores] = useState<Scores>({ service: 0, quality: 0, overall: 0 })
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(!isDemo)
  const [sending, setSending] = useState(false)
  const [feedbackId, setFeedbackId] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    document.title = config ? `Feedback for ${config.businessName} · REVORA` : 'Feedback · REVORA'
    return () => { document.title = 'REVORA' }
  }, [config])

  useEffect(() => {
    if (isDemo) return
    let live = true
    callGuest({ action: 'config', code }).then((data) => {
      if (live) setConfig(data.config as Config)
    }).catch(() => {
      if (live) setError('This feedback link is unavailable. Please ask the team for help.')
    }).finally(() => { if (live) setLoading(false) })
    return () => { live = false }
  }, [code, isDemo])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (Object.values(scores).some(value => value === 0)) {
      setError('Please answer all three questions.')
      return
    }
    setSending(true); setError('')
    try {
      if (isDemo) {
        await new Promise(resolve => window.setTimeout(resolve, 250))
        setFeedbackId('demo')
      } else {
        const data = await callGuest({ action: 'submit', code, input: { ...scores, comment, website: '' } })
        setFeedbackId(String(data.feedbackId))
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Feedback could not be sent. Please try again.')
    } finally { setSending(false) }
  }

  async function openReview() {
    if (!config?.reviewUrl) return
    if (!isDemo && feedbackId) void callGuest({ action: 'review-click', code, feedbackId }).catch(() => {})
    window.location.assign(config.reviewUrl)
  }

  if (loading) return <GuestShell><div className="guest__state" role="status"><span className="guest__loader" />Loading your feedback page…</div></GuestShell>
  if (!config) return <GuestShell><div className="guest__state"><h1>Link unavailable</h1><p>{error}</p></div></GuestShell>

  return (
    <GuestShell colors={config}>
      <header className="guest__header">
        {config.logoUrl ? <img src={config.logoUrl} alt={`${config.businessName} logo`} /> : <span className="guest__monogram" aria-hidden="true">{config.businessName.slice(0, 1)}</span>}
        <div><p className="guest__kicker">Your visit to</p><h1>{config.businessName}</h1><p>{config.locationName}</p></div>
      </header>

      {!feedbackId ? (
        <form className="guest__card" onSubmit={submit}>
          <div className="guest__intro"><span>Private feedback</span><h2>How was your experience?</h2><p>Your feedback goes directly to the team and helps them improve.</p></div>
          <div className="guest__questions">
            <Score label="Service" value={scores.service} onChange={service => setScores(current => ({ ...current, service }))} />
            <Score label="Quality" value={scores.quality} onChange={quality => setScores(current => ({ ...current, quality }))} />
            <Score label="Overall experience" value={scores.overall} onChange={overall => setScores(current => ({ ...current, overall }))} />
          </div>
          <label className="guest__comment"><span>Anything else? <small>Optional</small></span><textarea value={comment} maxLength={1200} onChange={event => setComment(event.target.value)} placeholder="Share a little more…" /></label>
          <input className="guest__honeypot" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
          {error && <p className="guest__error" role="alert">{error}</p>}
          <button className="guest__submit" disabled={sending}>{sending ? 'Sending…' : 'Send feedback'}</button>
          <p className="guest__privacy">No account needed. Your response is handled securely.</p>
        </form>
      ) : (
        <section className="guest__card guest__thanks" aria-live="polite">
          <span className="guest__check" aria-hidden="true">✓</span><h2>Thank you.</h2><p>Your feedback has been shared with {config.businessName}.</p>
          {config.reviewUrl && <button className="guest__submit" onClick={openReview}>Continue to public review</button>}
          <button className="guest__edit" onClick={() => setFeedbackId('')}>Edit your response</button>
        </section>
      )}
      <footer className="guest__footer">Powered by <strong>REVORA</strong><span>Experiences that matter.</span></footer>
    </GuestShell>
  )
}

function Score({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <fieldset className="guest__score"><legend>{label}</legend><div role="radiogroup" aria-label={label}>{[1,2,3,4,5].map(number => <button key={number} type="button" className={value === number ? 'is-selected' : ''} role="radio" aria-checked={value === number} aria-label={`${number} out of 5`} onClick={() => onChange(number)}>{number}</button>)}</div><div className="guest__scale"><span>Not great</span><span>Excellent</span></div></fieldset>
}

function GuestShell({ children, colors }: { children: React.ReactNode; colors?: Config }) {
  return <main className="guest" style={{ '--brand-primary': colors?.primaryColor || '#202124', '--brand-accent': colors?.accentColor || '#F2F3F4' } as React.CSSProperties}><div className="guest__wrap">{children}</div></main>
}

async function callGuest(body: Record<string, unknown>) {
  const base = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
  if (!base || !key) throw new Error('Feedback is temporarily unavailable.')
  const response = await fetch(`${base}/functions/v1/guest-feedback`, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: key, Authorization: `Bearer ${key}` }, body: JSON.stringify(body) })
  const data = await response.json().catch(() => ({})) as Record<string, unknown>
  if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Feedback could not be sent. Please try again.')
  return data
}
