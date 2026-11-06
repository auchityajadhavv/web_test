import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase, supabaseConfigured } from '../lib/supabase'
import './admin.css'

export default function AuthPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [factorId, setFactorId] = useState('')
  const [qr, setQr] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!supabase || busy) return
    setError(''); setBusy(true)
    try {
      if (factorId) {
        if (!/^\d{6}$/.test(code)) throw new Error('Enter the six-digit code from your authenticator.')
        const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code })
        if (error) throw new Error('Verification failed. Check the code and try again.')
        navigate('/dashboard', { replace: true })
        return
      }
      const { error: loginError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (loginError) throw new Error('Sign in failed. Check your credentials.')
      setPassword('')
      const { data: admin, error: adminError } = await supabase.rpc('is_admin')
      if (adminError || admin !== true) {
        await supabase.auth.signOut()
        throw new Error('This account does not have admin access.')
      }
      const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors()
      if (factorsError) throw new Error('Could not load account verification. Please sign in again.')
      const verified = factors.totp.find(f => f.status === 'verified')
      if (verified) setFactorId(verified.id)
      else {
        // Remove abandoned, unverified enrollments before creating a new one.
        for (const factor of factors.all.filter(f => f.factor_type === 'totp' && f.status === 'unverified')) {
          const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id })
          if (error) throw new Error('Could not restart authenticator setup.')
        }
        const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'REVORA owner' })
        if (error) throw new Error('Could not set up the authenticator. Please try again.')
        setFactorId(data.id)
        setQr(data.totp.qr_code.startsWith('data:') ? data.totp.qr_code : `data:image/svg+xml;utf8,${encodeURIComponent(data.totp.qr_code)}`)
      }
    } catch (err) {
      setError((err as Error).message)
    } finally { setBusy(false) }
  }

  return <div className="auth"><div className="auth__card">
    <Link to="/" className="auth__brand"><span className="auth__mark" aria-hidden="true" /><span className="auth__wm">REVORA</span></Link>
    <h1 className="auth__title">{factorId ? 'Verify your sign in' : 'Owner sign in'}</h1>
    <p className="auth__sub">Access is restricted to approved admins with two-step verification.</p>
    {params.get('setup') === 'complete' && <p role="status">Password saved. Sign in to continue with authenticator verification.</p>}
    {!supabaseConfigured && <div className="auth__banner">Owner sign in is currently unavailable.</div>}
    {qr && <div><p>Scan this code with your authenticator app, then enter its six-digit code. Keep your authenticator private.</p><img src={qr} alt="Authenticator setup QR code" width="200" height="200" /></div>}
    <form className="auth__form" onSubmit={submit}>
      {factorId ? <label className="auth__field"><span>Authenticator code</span><input value={code} onChange={e => setCode(e.target.value)} autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required /></label> : <>
        <label className="auth__field"><span>Email</span><input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="username" maxLength={254} required /></label>
        <label className="auth__field"><span>Password</span><input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required /></label>
      </>}
      {error && <p className="auth__error" role="alert">{error}</p>}
      <button className="btn btn-primary auth__submit" disabled={busy || !supabaseConfigured}>{busy ? 'Please wait…' : factorId ? 'Verify' : 'Sign in'}</button>
    </form>
    {factorId && <button className="btn btn-ghost" onClick={async () => { await supabase?.auth.signOut(); setFactorId(''); setQr(''); setCode(''); setError('') }}>Use another account</button>}
  </div></div>
}
