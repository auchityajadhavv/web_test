import { test, expect } from '@playwright/test'

test('the guest flow stays focused, responsive and submits only to its stand', async ({ page }) => {
  const code = 'a'.repeat(32)
  const calls: Record<string, unknown>[] = []
  await page.route('**/functions/v1/guest-feedback', async route => {
    const body = route.request().postDataJSON() as Record<string, unknown>
    calls.push(body)
    if (body.action === 'config') return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: true, config: { businessName: 'Meridian Salon', locationName: 'Bandra West', standLabel: 'Reception', logoUrl: null, primaryColor: '#202124', accentColor: '#F2F3F4', reviewUrl: 'https://reviews.example.test/meridian' } }) })
    if (body.action === 'submit') return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: true, feedbackId: '11111111-1111-4111-8111-111111111111' }) })
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: true }) })
  })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`/r/${code}`)
  await expect(page.getByRole('heading', { name: 'Meridian Salon' })).toBeVisible()
  await page.getByRole('radio', { name: '5 out of 5' }).nth(0).click()
  await page.getByRole('radio', { name: '4 out of 5' }).nth(1).click()
  await page.getByRole('radio', { name: '5 out of 5' }).nth(2).click()
  await page.getByPlaceholder('Share a little more…').fill('Beautiful service and a calm experience.')
  await page.getByRole('button', { name: 'Send feedback' }).click()
  await expect(page.getByRole('heading', { name: 'Thank you.' })).toBeVisible()
  expect(calls.find(call => call.action === 'submit')).toEqual({ action: 'submit', code, input: { service: 5, quality: 4, overall: 5, comment: 'Beautiful service and a calm experience.', website: '' } })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('the offline sales demo works without a backend write', async ({ page }) => {
  const calls: string[] = []
  page.on('request', request => { if (request.url().includes('/functions/v1/guest-feedback')) calls.push(request.url()) })
  await page.goto('/r/demo')
  await expect(page.getByRole('heading', { name: 'Your Business' })).toBeVisible()
  for (const item of await page.getByRole('radio', { name: '5 out of 5' }).all()) await item.click()
  await page.getByRole('button', { name: 'Send feedback' }).click()
  await expect(page.getByRole('heading', { name: 'Thank you.' })).toBeVisible()
  expect(calls).toEqual([])
})
