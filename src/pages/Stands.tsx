import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import QRCode from 'qrcode'
import { supabase, supabaseConfigured } from '../lib/supabase'
import { useSession } from '../lib/useSession'
import './admin.css'

type Business = { id: string; name: string; primary_color: string; accent_color: string; review_url: string | null }
type Stand = { id: string; label: string; status: 'active' | 'disabled' | 'retired'; created_at: string; businesses: { name: string } | { name: string }[]; locations: { name: string } | { name: string }[]; stand_public_codes: { code: string; active: boolean }[] }
type Metrics = { total_feedback: number; average_overall: number | null; review_clicks: number; last_30_days: number }
const blank = { businessId: 'new', businessName: '', locationName: '', standLabel: 'Front counter', reviewUrl: '', primaryColor: '#202124', accentColor: '#F2F3F4' }

export default function Stands() {
  const { session, loading } = useSession()
  const navigate = useNavigate()
  const [authorized, setAuthorized] = useState(false)
  const [checking, setChecking] = useState(true)
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [stands, setStands] = useState<Stand[]>([])
  const [metrics, setMetrics] = useState<Metrics>({ total_feedback: 0, average_overall: null, review_clicks: 0, last_30_days: 0 })
  const [form, setForm] = useState(blank)
  const [fetching, setFetching] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    let live = true
    setChecking(true)
    if (!session || !supabase) { setAuthorized(false); setChecking(false); return }
    supabase.rpc('is_admin_session').then(({ data, error: authError }) => {
      if (live) { setAuthorized(!authError && data === true); setChecking(false) }
    })
    return () => { live = false }
  }, [session])

  useEffect(() => {
    if (!authorized || !supabase) return
    let live = true
    setFetching(true); setError('')
    Promise.all([
      supabase.from('businesses').select('id,name,primary_color,accent_color,review_url').eq('active', true).order('name'),
      supabase.from('stands').select('id,label,status,created_at,businesses(name),locations(name),stand_public_codes(code,active)').order('created_at', { ascending: false }),
      supabase.rpc('get_admin_feedback_metrics'),
    ]).then(([businessResult, standResult, metricsResult]) => {
      if (!live) return
      if (businessResult.error || standResult.error || metricsResult.error) setError('Stand data could not be loaded. Apply the latest Supabase schema, then try again.')
      else { setBusinesses((businessResult.data || []) as Business[]); setStands((standResult.data || []) as unknown as Stand[]); const row = (Array.isArray(metricsResult.data) ? metricsResult.data[0] : metricsResult.data) as Metrics | null; if (row) setMetrics(row) }
    }).catch(() => { if (live) setError('Stand data could not be loaded. Please retry.') }).finally(() => { if (live) setFetching(false) })
    return () => { live = false }
  }, [authorized, refresh])

  const selectedBusiness = useMemo(() => businesses.find(item => item.id === form.businessId), [businesses, form.businessId])

  function chooseBusiness(id: string) {
    const business = businesses.find(item => item.id === id)
    setForm(current => business ? { ...current, businessId: id, businessName: business.name, reviewUrl: business.review_url || '', primaryColor: business.primary_color, accentColor: business.accent_color } : { ...blank, locationName: current.locationName, standLabel: current.standLabel })
  }

  async function createStand(event: FormEvent) {
    event.preventDefault()
    if (!supabase || saving) return
    setSaving(true); setError(''); setNotice('')
    const { data, error: createError } = await supabase.rpc('create_stand_setup', {
      p_business_id: form.businessId === 'new' ? null : form.businessId,
      p_business_name: form.businessName.trim(), p_location_name: form.locationName.trim(), p_stand_label: form.standLabel.trim(),
      p_review_url: form.reviewUrl.trim(), p_primary_color: form.primaryColor, p_accent_color: form.accentColor,
    })
    if (createError) setError('The stand was not created. Check each field and try again.')
    else {
      const result = Array.isArray(data) ? data[0] : data
      setNotice(`Stand created. Its secure link ends in …${String(result?.public_code || '').slice(-6)}.`)
      setForm(blank); setRefresh(value => value + 1)
    }
    setSaving(false)
  }

  async function updateStatus(id: string, status: Stand['status']) {
    if (!supabase) return
    const { error: updateError } = await supabase.from('stands').update({ status }).eq('id', id)
    if (updateError) setError('The stand status was not saved.')
    else setRefresh(value => value + 1)
  }

  async function rotateCode(id: string) {
    if (!supabase || !window.confirm('Replace this stand’s link? The old QR and NFC link will stop working immediately.')) return
    const { error: rotateError } = await supabase.rpc('rotate_stand_code', { p_stand_id: id })
    if (rotateError) setError('The link could not be replaced.')
    else { setNotice('A new secure link was created. Reprogram the NFC tag and replace the printed QR.'); setRefresh(value => value + 1) }
  }

  if (!supabaseConfigured) return <Shell><State title="Backend not connected" text="Stand management will be available after Supabase is configured." /></Shell>
  if (loading || checking) return <Shell><State title="Loading" text="Checking your secure admin session…" /></Shell>
  if (!session) return <Navigate to="/login" replace />
  if (!authorized) return <Shell><State title="Admin verification required" text="Sign in with your approved account and authenticator verification." /></Shell>

  return <Shell>
    <div className="dash__topbar"><Link to="/" className="auth__brand"><span className="auth__wm">REVORA</span></Link><div className="stand__nav"><Link to="/dashboard">Demo requests</Link><Link to="/">Visit website</Link></div></div>
    <header className="dash__head"><div><span className="eyebrow">Owner console</span><h1 className="dash__title">Stands & links</h1><p className="dash__intro">Create one secure feedback destination for every physical stand.</p></div><button className="btn btn-ghost dash__signout" onClick={async () => { await supabase?.auth.signOut(); navigate('/login') }}>Sign out</button></header>
    {error && <p className="auth__error stand__message" role="alert">{error}</p>}
    {notice && <p className="auth__notice stand__message" role="status">{notice}</p>}
    <div className="dash__stats stand__stats"><MiniStat label="Total feedback" value={metrics.total_feedback} /><MiniStat label="Last 30 days" value={metrics.last_30_days} /><MiniStat label="Average overall" value={metrics.average_overall == null ? '—' : `${metrics.average_overall}/5`} /><MiniStat label="Review clicks" value={metrics.review_clicks} /></div>
    <div className="stand__layout">
      <form className="stand__form" onSubmit={createStand}>
        <div><span className="eyebrow">New setup</span><h2>Create a stand</h2><p>Create the business once, then add as many locations and counters as needed.</p></div>
        <label>Business<select value={form.businessId} onChange={event => chooseBusiness(event.target.value)}><option value="new">＋ New business</option>{businesses.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        {form.businessId === 'new' && <><label>Business name<input required maxLength={120} value={form.businessName} onChange={event => setForm(current => ({ ...current, businessName: event.target.value }))} placeholder="e.g. Meridian Salon" /></label><label>Public review link<input type="url" value={form.reviewUrl} onChange={event => setForm(current => ({ ...current, reviewUrl: event.target.value }))} placeholder="https://g.page/r/…/review" /></label><div className="stand__colors"><label>Card colour<input type="color" value={form.primaryColor} onChange={event => setForm(current => ({ ...current, primaryColor: event.target.value }))} /></label><label>Accent colour<input type="color" value={form.accentColor} onChange={event => setForm(current => ({ ...current, accentColor: event.target.value }))} /></label></div></>}
        {selectedBusiness && <p className="stand__selected">Using {selectedBusiness.name}’s saved colours and review link.</p>}
        <label>Location<input required maxLength={120} value={form.locationName} onChange={event => setForm(current => ({ ...current, locationName: event.target.value }))} placeholder="e.g. Bandra West" /></label>
        <label>Stand label<input required maxLength={80} value={form.standLabel} onChange={event => setForm(current => ({ ...current, standLabel: event.target.value }))} placeholder="e.g. Reception" /></label>
        <button className="btn btn-primary" disabled={saving}>{saving ? 'Creating…' : 'Create secure stand'}</button>
      </form>
      <section className="stand__list"><div className="stand__listHead"><div><span className="eyebrow">Live setup</span><h2>Your stands</h2></div><button className="btn btn-ghost" disabled={fetching} onClick={() => setRefresh(value => value + 1)}>Refresh</button></div>
        {fetching ? <p className="stand__loading">Loading stands…</p> : stands.length === 0 ? <div className="dash__empty"><h2>No stands yet.</h2><p>Create your first business and stand using the setup form.</p></div> : <div className="stand__cards">{stands.map(stand => <StandCard key={stand.id} stand={stand} onStatus={updateStatus} onRotate={rotateCode} />)}</div>}
      </section>
    </div>
  </Shell>
}

function StandCard({ stand, onStatus, onRotate }: { stand: Stand; onStatus: (id: string, status: Stand['status']) => void; onRotate: (id: string) => void }) {
  const business = Array.isArray(stand.businesses) ? stand.businesses[0] : stand.businesses
  const location = Array.isArray(stand.locations) ? stand.locations[0] : stand.locations
  const code = stand.stand_public_codes.find(item => item.active)?.code || ''
  const url = code ? `${window.location.origin}/r/${code}` : ''
  const [copied, setCopied] = useState(false)
  async function copy() { await navigator.clipboard.writeText(url); setCopied(true); window.setTimeout(() => setCopied(false), 1500) }
  async function download() {
    const data = await QRCode.toDataURL(url, { width: 1200, margin: 4, color: { dark: '#000000', light: '#FFFFFF' }, errorCorrectionLevel: 'H' })
    const link = document.createElement('a'); link.href = data; link.download = `${business?.name || 'revora'}-${stand.label}-qr.png`.toLowerCase().replace(/[^a-z0-9.-]+/g, '-'); link.click()
  }
  return <article className="stand__card"><div className="stand__cardTop"><div><span className={`stand__status is-${stand.status}`}>{stand.status}</span><h3>{business?.name || 'Business'}</h3><p>{location?.name || 'Location'} · {stand.label}</p></div><select aria-label={`Status for ${stand.label}`} value={stand.status} onChange={event => onStatus(stand.id, event.target.value as Stand['status'])}><option value="active">Active</option><option value="disabled">Disabled</option><option value="retired">Retired</option></select></div>{url ? <><code className="stand__url">{url}</code><div className="stand__actions"><a className="btn btn-ghost" href={url} target="_blank" rel="noreferrer">Open</a><button className="btn btn-ghost" onClick={copy}>{copied ? 'Copied' : 'Copy link'}</button><button className="btn btn-primary" onClick={download}>Download QR</button><button className="stand__rotate" onClick={() => onRotate(stand.id)}>Replace link</button></div></> : <p className="auth__error">No active link. Replace the link to restore this stand.</p>}</article>
}

function Shell({ children }: { children: React.ReactNode }) { return <div className="admin"><div className="admin__inner">{children}</div></div> }
function State({ title, text }: { title: string; text: string }) { return <div className="dash__notice"><h1>{title}</h1><p>{text}</p><Link to="/login" className="btn btn-primary">Go to sign in</Link></div> }
function MiniStat({ label, value }: { label: string; value: number | string }) { return <div className="dash__stat"><span className="dash__statValue">{value}</span><span className="dash__statLabel">{label}</span></div> }
