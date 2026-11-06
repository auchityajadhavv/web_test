import { validateDemoInput } from '../_shared/demo-validation.ts'
import type { DemoInput } from '../_shared/demo-validation.ts'

type Reservation = { request_id: string | null; state: string }
export type Dependencies = {
  origins: string[]
  configured: boolean
  verify: (token: string) => Promise<boolean>
  reserve: (input: DemoInput, ip: string) => Promise<Reservation>
  notify: (input: DemoInput, id: string) => Promise<void>
  markSent: (id: string) => Promise<void>
  release: (id: string) => Promise<void>
}
export function createDemoHandler(deps: Dependencies) {
  return async (req: Request): Promise<Response> => {
    const origin = req.headers.get('origin') || ''
    const allowed = deps.origins.includes(origin)
    const headers: Record<string, string> = {
      'Content-Type': 'application/json', 'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff', 'Vary': 'Origin',
      ...(allowed ? { 'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
        'Access-Control-Allow-Methods': 'POST, OPTIONS' } : {}),
    }
    const reply = (status: number, error?: string) => new Response(JSON.stringify(error ? { error } : { ok: true }), { status, headers })
    if (!allowed) return reply(403, 'This origin is not allowed.')
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers })
    if (req.method !== 'POST') return reply(405, 'Use POST.')
    if (!deps.configured) return reply(503, 'Demo requests are temporarily unavailable. Please try again later.')
    if (!req.headers.get('content-type')?.startsWith('application/json')) return reply(415, 'Use JSON.')
    let id: string | null = null
    try {
      // Bound actual streamed bytes, not just the untrusted Content-Length header.
      const reader = req.body?.getReader()
      if (!reader) return reply(400, 'Please check your details.')
      const chunks: Uint8Array[] = []; let size = 0
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        size += value.byteLength
        if (size > 12000) { await reader.cancel(); return reply(413, 'Request is too large.') }
        chunks.push(value)
      }
      const bytes = new Uint8Array(size); let offset = 0
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length }
      let payload: unknown
      try { payload = JSON.parse(new TextDecoder().decode(bytes)) } catch { return reply(400, 'Invalid JSON.') }
      const input = validateDemoInput(payload)
      if (!input) return reply(400, 'Please check your details and complete verification.')
      if (!await deps.verify(input.token)) return reply(400, 'Verification expired. Please verify again.')
      // Supabase's gateway must overwrite X-Forwarded-For; use its appended client hop.
      const ip = req.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim()
      if (!ip) return reply(503, 'Requests are temporarily unavailable.')
      const reservation = await deps.reserve(input, ip)
      if (reservation.state === 'limited') { headers['Retry-After'] = '3600'; return reply(429, 'Too many requests. Please try again later.') }
      if (reservation.state === 'conflict') return reply(409, 'Please reopen the form to submit new details.')
      if (reservation.state === 'busy') return reply(409, 'Your request is being processed. Please retry shortly.')
      if (reservation.state === 'review') return reply(503, 'Your request needs manual review. Please contact the team instead of resubmitting.')
      if (reservation.state === 'sent') return reply(200)
      if (reservation.state !== 'reserved' || !reservation.request_id) throw new Error('Invalid reservation')
      id = reservation.request_id
      await deps.notify(input, id)
      await deps.markSent(id)
      return reply(200)
    } catch {
      if (id) { try { await deps.release(id) } catch { /* Lease expires after 60s; retry uses the same mail idempotency key. */ } }
      return reply(503, 'We could not confirm your request. Please retry using the same form.')
    }
  }
}
