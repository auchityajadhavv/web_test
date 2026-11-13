import test from 'node:test'
import assert from 'node:assert/strict'
import { createGuestHandler } from '../supabase/functions/guest-feedback/handler.ts'

const code = 'a'.repeat(32)
const feedbackId = '11111111-1111-4111-8111-111111111111'
const origin = 'https://revora-live.vercel.app'
const request = (body, headers = {}) => new Request('https://example.supabase.co/functions/v1/guest-feedback', {
  method: 'POST',
  headers: { origin, 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.2', ...headers },
  body: JSON.stringify(body),
})

function dependencies(overrides = {}) {
  return {
    origins: [origin], configured: true,
    getConfig: async () => ({ businessName: 'Example Studio', locationName: 'Main', standLabel: 'Counter', logoUrl: null, primaryColor: '#202124', accentColor: '#F2F3F4', reviewUrl: null }),
    submit: async () => feedbackId,
    markReviewClick: async () => {},
    ...overrides,
  }
}

test('guest config exposes only the public brand configuration', async () => {
  const response = await createGuestHandler(dependencies())(request({ action: 'config', code }))
  assert.equal(response.status, 200)
  const body = await response.json()
  assert.equal(body.config.businessName, 'Example Studio')
  assert.equal(body.config.reviewUrl, null)
  assert.equal(body.config.id, undefined)
})

test('guest feedback rejects invalid, forged and honeypot submissions', async () => {
  const handler = createGuestHandler(dependencies())
  assert.equal((await handler(request({ action: 'submit', code: 'short', input: {} }))).status, 400)
  assert.equal((await handler(request({ action: 'submit', code, input: { service: 6, quality: 4, overall: 5, comment: '', website: '' } }))).status, 400)
  assert.equal((await handler(request({ action: 'submit', code, input: { service: 5, quality: 4, overall: 5, comment: '', website: 'spam' } }))).status, 400)
  assert.equal((await handler(request({ action: 'config', code }, { origin: 'https://attacker.example' }))).status, 403)
})

test('guest feedback submits bounded ratings and records an explicit review click', async () => {
  let submitted
  let clicked
  const handler = createGuestHandler(dependencies({
    submit: async (standCode, ip, input) => { submitted = { standCode, ip, input }; return feedbackId },
    markReviewClick: async (standCode, id) => { clicked = { standCode, id } },
  }))
  const response = await handler(request({ action: 'submit', code, input: { service: 5, quality: 4, overall: 5, comment: 'Helpful team', website: '' } }))
  assert.equal(response.status, 200)
  assert.deepEqual(submitted, { standCode: code, ip: '203.0.113.2', input: { service: 5, quality: 4, overall: 5, comment: 'Helpful team', website: '' } })
  const click = await handler(request({ action: 'review-click', code, feedbackId }))
  assert.equal(click.status, 200)
  assert.deepEqual(clicked, { standCode: code, id: feedbackId })
})

test('guest feedback reports rate limits without leaking backend details', async () => {
  const handler = createGuestHandler(dependencies({ submit: async () => { throw new Error('rate limited') } }))
  const response = await handler(request({ action: 'submit', code, input: { service: 5, quality: 4, overall: 5, comment: '', website: '' } }))
  assert.equal(response.status, 429)
  assert.equal(response.headers.get('retry-after'), '3600')
  assert.match((await response.json()).error, /Too many attempts/)
})
