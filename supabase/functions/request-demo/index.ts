import { createClient } from 'npm:@supabase/supabase-js@2.110.5'
import { createDemoHandler } from './handler.ts'

const get = (name: string) => Deno.env.get(name) || ''
const recipient = get('DEMO_TO_EMAIL') || 'revora.org.com@gmail.com'
const origins = get('DEMO_ALLOWED_ORIGINS').split(',').map(s => s.trim()).filter(Boolean)
const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'TURNSTILE_SECRET_KEY', 'TURNSTILE_HOSTNAMES', 'RESEND_API_KEY', 'DEMO_FROM_EMAIL', 'DEMO_RATE_SALT']
const configured = required.every(name => Boolean(get(name))) && origins.length > 0 && get('DEMO_RATE_SALT').length >= 32
const db = configured ? createClient(get('SUPABASE_URL'), get('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } }) : null
const hash = async (text: string) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))].map(b => b.toString(16).padStart(2, '0')).join('')
const checkedFetch = (url: string, options: RequestInit) => fetch(url, { ...options, signal: AbortSignal.timeout(10000) })

Deno.serve(createDemoHandler({
  origins, configured,
  async verify(token) {
    const response = await checkedFetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST', body: new URLSearchParams({ secret: get('TURNSTILE_SECRET_KEY'), response: token }),
    })
    if (!response.ok) return false
    const result = await response.json()
    return result.success === true && result.action === 'request-demo' && get('TURNSTILE_HOSTNAMES').split(',').map(s => s.trim()).includes(result.hostname)
  },
  async reserve(input, ip) {
    const { requestKey, token: _token, website: _website, ...details } = input
    const { data, error } = await db!.rpc('reserve_demo_request', {
      p_request_key: requestKey, p_payload_hash: await hash(JSON.stringify(details)),
      p_ip_hash: await hash(get('DEMO_RATE_SALT') + ':' + ip),
      p_name: input.name, p_venue: input.venue, p_email: input.email,
      p_message: input.message, p_plan: input.plan,
    })
    if (error || !data?.[0]) throw new Error('Reservation failed')
    return data[0]
  },
  async notify(input, id) {
    const response = await checkedFetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: `Bearer ${get('RESEND_API_KEY')}`, 'Content-Type': 'application/json', 'Idempotency-Key': `demo-${id}` },
      body: JSON.stringify({
        from: get('DEMO_FROM_EMAIL'), to: [recipient], reply_to: input.email,
        subject: 'New REVORA demo request',
        text: `Name: ${input.name}\nVenue: ${input.venue}\nEmail: ${input.email}\nPlan: ${input.plan || 'Not selected'}\n\nWhat they need:\n${input.message}\n\nRequest ID: ${id}`,
      }),
    })
    if (!response.ok) throw new Error('Email provider failed')
  },
  async markSent(id) {
    const { error } = await db!.from('demo_requests').update({ notification_sent: true }).eq('id', id)
    if (error) throw new Error('Could not confirm notification')
  },
  async release(id) {
    const { error } = await db!.from('demo_requests').update({ notification_claimed_at: null }).eq('id', id)
    if (error) throw new Error('Could not release reservation')
  },
}))
