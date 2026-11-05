import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useSession } from '../lib/useSession'
import './admin.css'

export default function SetPassword() {
  const { session, loading } = useSession()
  const navigate = useNavigate()
  const [approvedToken, setApprovedToken] = useState('')
  const [checking, setChecking] = useState(true)
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    let live = true
    setApprovedToken('')
    setChecking(true)
    if (!session || !supabase) { setChecking(false); return }
    supabase.rpc('is_admin').then(({ data, error }) => {
      if (!live) return
      if (!error && data === true) setApprovedToken(session.access_token)
      setChecking(false)
    }, () => { if (live) setChecking(false) })
    return () => { live = false }
  }, [session])
  const approved = Boolean(session && approvedToken === session.access_token)
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!supabase || !approved || busy) return
    setError('')
    if (password.length < 12) { setError('Use at least 12 characters.'); return }
    if (password !== confirmation) { setError('The passwords do not match.'); return }
    setBusy(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw new Error('Could not set your password. Try again or request a new invitation.')
      setPassword(''); setConfirmation('')
      const { error: logoutError } = await supabase.auth.signOut()
      if (logoutError) throw new Error('Password saved. Please sign out and sign in again to continue.')
      navigate('/login?setup=complete', { replace: true })
    } catch (error) { setError((error as Error).message) }
    finally { setBusy(false) }
  }
  return <div className="auth"><div className="auth__card">
    <Link to="/" className="auth__brand">REVORA</Link>
    <h1 className="auth__title">Set your admin password</h1>
    {loading || checking ? <p role="status">Checking your invitation…</p> : approved ? <>
      <p className="auth__sub">Choose a private password. After saving, sign in to set up your authenticator.</p>
      <form className="auth__form" onSubmit={submit}>
        <label className="auth__field"><span>New password</span><input type="password" autoComplete="new-password" minLength={12} value={password} onChange={e => setPassword(e.target.value)} disabled={busy} required /></label>
        <label className="auth__field"><span>Confirm password</span><input type="password" autoComplete="new-password" minLength={12} value={confirmation} onChange={e => setConfirmation(e.target.value)} disabled={busy} required /></label>
        {error && <p role="alert" className="auth__error">{error}</p>}
        <button className="btn btn-primary auth__submit" disabled={busy}>{busy ? 'Saving…' : 'Save password'}</button>
      </form>
    </> : <p role="alert">Open the latest admin invitation from your email to continue. The link must be valid and your account must be approved.</p>}
    <Link to="/login">Back to sign in</Link>
  </div></div>
}
