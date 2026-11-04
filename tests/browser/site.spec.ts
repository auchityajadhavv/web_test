import { test, expect, type Page } from '@playwright/test'

async function verification(page: Page) {
  await page.route('https://challenges.cloudflare.com/turnstile/v0/api.js*', route => route.fulfill({ contentType: 'application/javascript', body: `
    const widgets = new Map(); let next = 0; window.turnstile = { render(element, options) { const button = document.createElement('button'); button.type = 'button'; button.textContent = 'Verify test visitor'; button.onclick = () => options.callback('test-token'); element.append(button); const id = String(next++); widgets.set(id, button); return id; }, remove(id) { widgets.get(id)?.remove(); widgets.delete(id); } };
  ` }))
}
const fillDemo = async (page: Page) => {
  await page.getByRole('button', { name: 'Book a demo', exact: true }).first().click()
  await page.getByLabel('Your name', { exact: true }).fill('Priya')
  await page.getByLabel('Venue name', { exact: true }).fill('Example Cafe')
  await page.getByLabel('Email', { exact: true }).fill('priya@example.com')
  await page.getByLabel('What would you like a demo for?', { exact: true }).fill('I need NFC stands for two counters.')
  await page.getByRole('button', { name: 'Verify test visitor' }).click()
}

test('a failed email request keeps details, retries with the same key, and only then confirms', async ({ page }) => {
  await verification(page)
  const requests: Record<string, string>[] = []
  await page.route('**/functions/v1/request-demo', route => {
    requests.push(route.request().postDataJSON())
    return route.fulfill({ status: requests.length === 1 ? 503 : 200, contentType: 'application/json', body: JSON.stringify(requests.length === 1 ? { error: 'Temporary failure' } : { ok: true }) })
  })
  await page.goto('/')
  await fillDemo(page)
  await page.getByRole('button', { name: 'Request my demo' }).click()
  await expect(page.getByRole('alert')).toContainText('could not confirm')
  await expect(page.getByLabel('Your name', { exact: true })).toHaveValue('Priya')
  await expect(page.getByRole('heading', { name: 'Thanks, Priya.' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Verify test visitor' }).click()
  await page.getByRole('button', { name: 'Request my demo' }).click()
  await expect(page.getByRole('heading', { name: 'Thanks, Priya.' })).toBeVisible()
  expect(requests).toHaveLength(2)
  expect(requests[0].requestKey).toBe(requests[1].requestKey)
  expect(requests[1].message).toContain('two counters')
})

test('dialogs contain focus and restore it; Escape closes mobile navigation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  const menu = page.getByRole('button', { name: 'Open menu' })
  await menu.click()
  await expect(page.getByRole('dialog', { name: 'Mobile navigation' })).toBeVisible()
  for (let n = 0; n < 10; n++) {
    await page.keyboard.press('Tab')
    expect(await page.evaluate(() => document.activeElement?.closest('dialog')?.getAttribute('aria-label'))).toBe('Mobile navigation')
  }
  await page.keyboard.press('Escape')
  await expect(menu).toBeFocused()
  await page.getByRole('button', { name: 'Try it yourself', exact: true }).first().click()
  await expect(page.getByRole('dialog', { name: 'Try the REVORA guest demo' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Try it yourself', exact: true }).first()).toBeFocused()
})

test('changing URL does not load private requests and signup is unavailable', async ({ page }) => {
  const reads: string[] = []
  page.on('request', request => { if (request.url().includes('/rest/v1/demo_requests')) reads.push(request.url()) })
  await page.goto('/dashboard')
  await expect(page.getByRole('heading', { name: 'Owner sign in' })).toBeVisible()
  await expect(page).toHaveURL(/\/login$/)
  await page.goto('/signup')
  await expect(page.getByRole('heading', { name: 'Experiences that matter.' })).toBeVisible()
  expect(reads).toEqual([])
})

async function session(page: Page, approved: boolean) {
  const userId = '11111111-1111-4111-8111-111111111111'
  await page.addInitScript(({ userId }) => {
    const payload = btoa(JSON.stringify({ sub: userId, role: 'authenticated', aal: 'aal2', exp: Math.floor(Date.now() / 1000) + 3600 }))
    localStorage.setItem('sb-project-auth-token', JSON.stringify({ access_token: `e30.${payload}.test`, refresh_token: 'test-refresh', expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: 'bearer', user: { id: userId, email: 'owner@example.com' } }))
  }, { userId })
  await page.route('**/rest/v1/rpc/is_admin_session', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify(approved) }))
}

test('signed-in account without backend authorization cannot load requests', async ({ page }) => {
  await session(page, false)
  const reads: string[] = []
  page.on('request', request => { if (request.url().includes('/rest/v1/demo_requests')) reads.push(request.url()) })
  await page.goto('/dashboard')
  await expect(page.getByRole('heading', { name: 'Admin verification required' })).toBeVisible()
  expect(reads).toEqual([])
})

test('dashboard paginates and retains saved status when an update fails', async ({ page }) => {
  await session(page, true)
  const ranges: string[] = []
  await page.route('**/rest/v1/demo_requests?*', route => {
    if (route.request().method() === 'PATCH') return route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ message: 'Denied', code: '42501' }) })
    const url = new URL(route.request().url()); const offset = Number(url.searchParams.get('offset') || 0)
    ranges.push(String(offset))
    const rows = Array.from({ length: offset === 0 ? 26 : 1 }, (_, i) => ({ id: `id-${offset + i}`, name: `Lead ${offset + i}`, email: `lead${i}@example.com`, venue: 'Cafe', status: 'new', created_at: '2026-11-04T08:00:00Z', message: 'Demo', plan: null }))
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(rows) })
  })
  await page.goto('/dashboard')
  await expect(page.getByRole('cell', { name: 'Lead 0', exact: true })).toBeVisible()
  await page.getByRole('combobox', { name: 'Status for Lead 0', exact: true }).selectOption('contacted')
  await expect(page.getByRole('alert')).toContainText('Status was not saved')
  await expect(page.getByRole('combobox', { name: 'Status for Lead 0', exact: true })).toHaveValue('new')
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await expect(page.getByRole('cell', { name: 'Lead 25', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeDisabled()
  expect(ranges).toContain('25')
})

test('mobile and reduced-motion visitors avoid the 3D bundle and map is deferred', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const urls: string[] = []
  page.on('request', request => urls.push(request.url()))
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Experiences that matter.' })).toBeVisible()
  expect(urls.some(url => url.includes('AmbientField.tsx') || url.includes('MumbaiMap.tsx'))).toBe(false)
  await expect(page.locator('.ambient--fallback')).toBeVisible()
})

test('approved admin must complete authenticator verification before dashboard access', async ({ page }) => {
  const userId = '11111111-1111-4111-8111-111111111111'
  const tokens = (aal: string) => {
    const payload = Buffer.from(JSON.stringify({ sub: userId, role: 'authenticated', aal, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')
    return { access_token: `e30.${payload}.test`, refresh_token: 'test-refresh', expires_in: 3600, token_type: 'bearer', user: { id: userId, email: 'owner@example.com', factors: [{ id: 'factor', factor_type: 'totp', status: 'verified' }] } }
  }
  let verified = false
  await page.route('**/auth/v1/**', route => {
    const url = route.request().url()
    if (url.includes('/verify')) { verified = true; return route.fulfill({ contentType: 'application/json', body: JSON.stringify(tokens('aal2')) }) }
    if (url.includes('/challenge')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ id: 'challenge', expires_at: Date.now() / 1000 + 60 }) })
    if (url.includes('/token')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify(tokens('aal1')) })
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(tokens('aal1').user) })
  })
  await page.route('**/rest/v1/rpc/is_admin', route => route.fulfill({ contentType: 'application/json', body: 'true' }))
  await page.route('**/rest/v1/rpc/is_admin_session', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify(verified) }))
  await page.route('**/rest/v1/demo_requests?*', route => route.fulfill({ contentType: 'application/json', body: '[]' }))
  await page.goto('/login')
  await page.getByLabel('Email', { exact: true }).fill('owner@example.com')
  await page.getByLabel('Password', { exact: true }).fill('test-password')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Verify your sign in' })).toBeVisible()
  await expect(page).toHaveURL(/\/login$/)
  await page.getByLabel('Authenticator code').fill('123456')
  await page.getByRole('button', { name: 'Verify', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Demo requests' })).toBeVisible()
  expect(verified).toBe(true)
})

test('deferred map loads without crashing and reports missing map resources', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.route('https://tiles.openfreemap.org/**', route => route.abort())
  await page.goto('/')
  // Mounting the map is independent of the heavy module's network request.
  await page.locator('.prod').scrollIntoViewIfNeeded()
  await expect(page.getByRole('heading', { name: 'Picture your venue on the map.' })).toBeVisible()
  await expect(page.getByRole('status')).toContainText('interactive map is unavailable')
  expect(errors).toEqual([])
})

test('the upgraded map starts its worker and renders sample markers', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error' && message.text().includes('Worker')) errors.push(message.text()) })
  await page.route('https://tiles.openfreemap.org/**', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ version: 8, sources: {}, layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#121018' } }] }) }))
  await page.goto('/')
  await page.locator('.prod').scrollIntoViewIfNeeded()
  await expect(page.locator('.mm-store')).toHaveCount(3)
  await expect(page.getByRole('status')).toHaveCount(0)
  expect(errors).toEqual([])
})
