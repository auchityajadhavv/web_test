import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/browser', fullyParallel: false, workers: 2,
  use: { baseURL: 'http://127.0.0.1:5174', headless: true, reducedMotion: 'reduce',
    launchOptions: { executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] } },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5174 --strictPort',
    url: 'http://127.0.0.1:5174', reuseExistingServer: false,
    env: { VITE_SUPABASE_URL: 'https://project.supabase.test', VITE_SUPABASE_ANON_KEY: 'public-test-key', VITE_TURNSTILE_SITE_KEY: 'public-test-site-key' },
  },
})
