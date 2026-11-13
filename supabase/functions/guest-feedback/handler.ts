export type GuestConfig = {
  businessName: string
  locationName: string
  standLabel: string
  logoUrl: string | null
  primaryColor: string
  accentColor: string
  reviewUrl: string | null
}

type SubmitInput = {
  service: number
  quality: number
  overall: number
  comment: string
  website: string
}

export type GuestDependencies = {
  origins: string[]
  configured: boolean
  getConfig: (code: string) => Promise<GuestConfig | null>
  submit: (code: string, ip: string, input: SubmitInput) => Promise<string>
  markReviewClick: (code: string, feedbackId: string) => Promise<void>
}

const codeOk = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{32}$/.test(value)
const uuidOk = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
const scoreOk = (value: unknown) => Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 5

export function createGuestHandler(deps: GuestDependencies) {
  return async (req: Request): Promise<Response> => {
    const origin = req.headers.get('origin') || ''
    const allowed = deps.origins.includes(origin)
    const headers: Record<string, string> = {
      'Content-Type': 'application/json', 'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff', 'Vary': 'Origin',
      ...(allowed ? {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      } : {}),
    }
    const reply = (status: number, body: Record<string, unknown>) => new Response(JSON.stringify(body), { status, headers })
    if (!allowed) return reply(403, { error: 'This origin is not allowed.' })
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers })
    if (req.method !== 'POST') return reply(405, { error: 'Use POST.' })
    if (!deps.configured) return reply(503, { error: 'Feedback is temporarily unavailable.' })
    if (!req.headers.get('content-type')?.startsWith('application/json')) return reply(415, { error: 'Use JSON.' })
    const reader = req.body?.getReader()
    if (!reader) return reply(400, { error: 'Invalid request.' })
    const chunks: Uint8Array[] = []; let size = 0
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > 8000) { await reader.cancel(); return reply(413, { error: 'Request is too large.' }) }
      chunks.push(value)
    }
    const bytes = new Uint8Array(size); let offset = 0
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length }
    let payload: Record<string, unknown>
    try { payload = JSON.parse(new TextDecoder().decode(bytes)) } catch { return reply(400, { error: 'Invalid JSON.' }) }
    if (!codeOk(payload.code)) return reply(400, { error: 'Invalid stand code.' })
    try {
      if (payload.action === 'config') {
        const config = await deps.getConfig(payload.code)
        return config ? reply(200, { ok: true, config }) : reply(404, { error: 'This stand is not active.' })
      }
      if (payload.action === 'submit') {
        const input = payload.input as Record<string, unknown> | undefined
        if (!input || !scoreOk(input.service) || !scoreOk(input.quality) || !scoreOk(input.overall))
          return reply(400, { error: 'Please answer all three questions.' })
        const comment = typeof input.comment === 'string' ? input.comment.trim() : ''
        const website = typeof input.website === 'string' ? input.website : ''
        if (comment.length > 1200 || website) return reply(400, { error: 'Please check your feedback.' })
        const ip = req.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim()
        if (!ip) return reply(503, { error: 'Feedback is temporarily unavailable.' })
        const feedbackId = await deps.submit(payload.code, ip, {
          service: Number(input.service), quality: Number(input.quality), overall: Number(input.overall), comment, website,
        })
        return reply(200, { ok: true, feedbackId })
      }
      if (payload.action === 'review-click' && uuidOk(payload.feedbackId)) {
        await deps.markReviewClick(payload.code, payload.feedbackId)
        return reply(200, { ok: true })
      }
      return reply(400, { error: 'Invalid action.' })
    } catch (error) {
      const limited = error instanceof Error && error.message === 'rate limited'
      if (limited) headers['Retry-After'] = '3600'
      return reply(limited ? 429 : 503, { error: limited ? 'Too many attempts. Please try again later.' : 'Feedback is temporarily unavailable.' })
    }
  }
}
