import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createDemoHandler } from '../supabase/functions/request-demo/handler.ts'
const input = () => ({ requestKey: crypto.randomUUID(), name: 'Guest', venue: 'Cafe', email: 'guest@example.com', message: 'Demo for two counters', plan: '', website: '', token: 'valid-token' })
function setup(overrides = {}) {
  const calls = []
  const deps = {
    origins: ['https://revora.example'], configured: true,
    verify: async () => true,
    reserve: async () => { calls.push('reserve'); return { state: 'reserved', request_id: 'lead-id' } },
    notify: async () => { calls.push('notify') }, markSent: async () => { calls.push('sent') }, release: async () => { calls.push('release') },
    ...overrides,
  }
  const handler = createDemoHandler(deps)
  return { calls, request: (body = input(), headers = {}, method = 'POST') => handler(new Request('https://backend.example/request-demo', { method, headers: { origin: 'https://revora.example', 'content-type': 'application/json', 'x-forwarded-for': '192.0.2.1', ...headers }, ...(method === 'POST' ? { body: typeof body === 'string' ? body : JSON.stringify(body) } : {}) })) }
}
test('confirms only after persistence, notification and acknowledgement', async () => {
  const { request, calls } = setup()
  const response = await request()
  assert.equal(response.status, 200); assert.deepEqual(await response.json(), { ok: true })
  assert.deepEqual(calls, ['reserve', 'notify', 'sent'])
})
test('mail failure never becomes a success and permits an idempotent retry', async () => {
  const { request, calls } = setup({ notify: async () => { throw new Error('secret provider response') } })
  const response = await request(); assert.equal(response.status, 503)
  assert.ok(!(await response.text()).includes('secret')); assert.deepEqual(calls, ['reserve', 'release'])
})
test('rejects forged origins, malformed data, honeypots, oversized bodies and failed verification', async () => {
  const { request, calls } = setup()
  assert.equal((await request(input(), { origin: 'https://evil.example' })).status, 403)
  assert.equal((await request('{bad')).status, 400)
  assert.equal((await request({ ...input(), email: 'x\r\nbcc: victim@example.com' })).status, 400)
  assert.equal((await request({ ...input(), website: 'spam' })).status, 400)
  assert.equal((await request({ ...input(), message: '' })).status, 400)
  assert.equal((await request({ ...input(), name: 'x'.repeat(101) })).status, 400)
  assert.equal((await request('x'.repeat(12001))).status, 413)
  assert.equal((await setup({ verify: async () => false }).request()).status, 400)
  assert.equal((await setup({ configured: false }).request()).status, 503)
  assert.deepEqual(calls, [])
})
test('rate limiting, duplicate delivery and contention do not send additional emails', async () => {
  for (const [state, expected] of [['limited', 429], ['sent', 200], ['busy', 409], ['conflict', 409], ['review', 503]]) {
    const { request, calls } = setup({ reserve: async () => ({ state, request_id: 'lead-id' }) })
    assert.equal((await request()).status, expected); assert.deepEqual(calls, [])
  }
})
