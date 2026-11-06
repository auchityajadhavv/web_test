# Private owner console and demo notifications

## Project configuration

- Supabase project reference: `njshdrkipvbjbeinircm` (provided by the owner).
- Standard project API URL: `https://njshdrkipvbjbeinircm.supabase.co` (confirm against project settings before deployment).
- Website origin: `https://revora-live.vercel.app`.
- Turnstile hostname: `revora-live.vercel.app`.
- Demo notification recipient: `revora.org.com@gmail.com`.

These values are prepared in the example configuration files. They have not been applied to the live project. Management access must be authenticated before the schema, Auth settings, owner account or function can be deployed.

## Access model

`/dashboard` is a public route name, not a secret. It reveals no private requests unless Supabase verifies a signed session belonging to an explicitly approved user UUID **and** an MFA session (`aal2`). PostgreSQL row-level security enforces this for direct REST requests as well as the website. Editing a URL, frontend code, local storage or a client-side email variable cannot grant database permissions. Public source code and marketing assets are intentionally accessible.

The frontend never receives a service-role key or email API key. Admins can select requests and update **only** their `status` column. Anonymous users cannot insert directly. The public form calls the Edge Function, which validates input, verifies Turnstile, rate-limits, reserves a request and sends its notification. Supabase Auth verifies tokens; a browser claim is not trusted on its own.

## 1. Prepare Supabase (required before deploying this version)

1. Back up existing data and review `supabase/schema.sql`. Apply it using the project's SQL editor. It upgrades the old table in place, removes the previous email-based/public-insert policies, creates the approved-admin list and rate limiter, and can be reapplied. Do not keep old permissive policies alongside these rules.
2. Disable **Allow new users to sign up** in Auth settings. The website has no signup route; disabling it at the provider prevents direct API signup too.
3. Create/invite the owner in Supabase Auth. For an invitation, allowlist the exact deployed `/set-password` callback and use it as the invitation redirect. That page accepts an authenticated, approved account, saves the password through Supabase Auth, then sends the user back to login for MFA. Do not share invitation tokens or passwords in chat. Copy the exact user's UUID. With administrator privileges, run:

   ```sql
   insert into public.admin_users(user_id) values ('EXACT-AUTH-USER-UUID');
   ```

   Use a separate approved account for each administrator. Email alone grants nothing.
4. Enable TOTP MFA in Supabase Auth. On first login the approved owner scans an authenticator QR code and enters its code. Subsequent logins require the authenticator. Database reads stay blocked until the session reaches `aal2`. If the authenticator is lost, use Supabase's administrator recovery controls, revoke existing sessions/factors as appropriate, and re-enroll; never weaken the RLS policy for recovery.
5. Use a strong unique password, restrict project-administrator access, and configure Supabase Auth rate limits and production redirect URLs. The dashboard uses explicit refresh and paginated queries; realtime publication is not required.

## 2. Create the Gmail recipient and email sender

The company recipient is **revora.org.com@gmail.com**, configured as `DEMO_TO_EMAIL` in the server example. No Gmail password is needed: **Resend sends notifications to that inbox**, with the visitor's email as Reply-To. Create a Resend account, verify a sending domain you own, and create a sending API key. `DEMO_FROM_EMAIL` must use that verified domain; arbitrary Gmail From addresses are not supported. This integration does not create a Gmail account.

Emails contain the visitor's name, venue, email, selected plan, and what they want a demo for. Delivery acceptance is not proof of inbox delivery; verify your Gmail inbox/spam folder in the live smoke test and monitor provider failures.

## 3. Spam protection and server configuration

Create a Cloudflare Turnstile widget restricted to your production hostnames. Use its public site key in the frontend and its secret on the Edge Function. The server verifies the hostname and the `request-demo` action in addition to token success. Tokens expire and are single-use, so the form re-verifies on retry.

Set the variables from `supabase/functions/.env.example` securely in Supabase Edge Function secrets. Use exact production origins (scheme + host, no trailing slash) in `DEMO_ALLOWED_ORIGINS`; use bare hostnames in `TURNSTILE_HOSTNAMES`. Include legitimate preview hosts explicitly only if they should accept submissions. Supabase injects its URL and service-role credential. Set a fresh random `DEMO_RATE_SALT` of at least 32 characters. Never put secrets in `VITE_` variables or commit populated env files.

The public function has `verify_jwt = false` in `supabase/config.toml`: it is intentionally callable before login and independently requires Turnstile. CORS is an extra browser restriction, not authentication. Request bodies are limited to 12 KB, fields have length limits, plan values are allowlisted, and a honeypot is rejected. Email is plain text with a fixed subject and server-controlled recipient/sender.

The database applies atomic hourly limits: 5 new attempts per hashed client IP, 3 per email, and 100 globally. Confirm Supabase's gateway overwrites/appends the client hop in `X-Forwarded-For` in your deployment; email/global limits also apply independently of that header. Review limits for real traffic rather than disabling them. The system stores a salted IP hash for rate limiting, not the raw IP. The global cap can temporarily limit legitimate requests during an attack; monitor rejected traffic and tune deliberately.

Deploy with the Supabase CLI from the checkout:

```bash
supabase functions deploy request-demo --project-ref njshdrkipvbjbeinircm
```

`supabase/config.toml` must be included so the configured JWT behavior applies. Review the function and SQL before deployment. This repository's local validation does not deploy either one.

## 4. Frontend deployment

Set the three browser-public variables in `.env.example` in Vercel, then build/redeploy. Use the project's **public** anon/publishable key, never a service-role key. Custom Supabase domains require matching additions to `vercel.json`'s CSP `connect-src` and `img-src`; keep exact domains and avoid `*`.

Vercel adds CSP, framing restrictions, MIME sniffing protection, referrer controls and HTTPS hardening. Inline demo scripts have been moved to local script files so `script-src` does not need `unsafe-inline`. Inline styles remain allowed because React, the map and visual effects use them. Review headers if integrating another provider.

## 5. Validate live before calling it launched

- Signed out: open `/dashboard`; verify sign-in is required. Direct anonymous REST reads/inserts must fail.
- An authenticated user not in `admin_users` must see no request rows, including when calling REST directly. An approved user's password-only session must also see none.
- Log in as the approved owner, complete MFA, read requests and change a status. Try updating another column via REST; it must fail.
- Submit a real test demo request with permission to use its contact details. Check the saved row **and actual Gmail receipt**, including Reply-To and message content. Check the notification state in the dashboard and Resend delivery logs.
- Test a failed provider response in staging: no success confirmation, no lost form details, and retry uses the same request key. Supabase credentials, Turnstile tokens and actual inbox delivery are not covered by the mock browser tests.

## Retry and operations

A request is saved before email sending. Success is returned only after the email provider accepts it and that acceptance is recorded. Retrying an unchanged form uses the same request key. A transactional lease prevents concurrent sends; Resend gets a stable idempotency key. If sending or acknowledgement fails, the UI keeps the form and the dashboard shows the pending notification. Requests unconfirmed for more than 23 hours require manual review, before the provider's 24-hour idempotency guarantee expires. Check provider logs before manually resending. There is no background retry worker: monitor pending rows; a failed request must be retried by the visitor within the window or reviewed by the team.

Rate-limit entries older than two hours are pruned during submissions. Define a business retention period for contact details and remove old requests with administrator tooling. Do not include lead data, passwords, TOTP setup secrets, or tokens in application logs. Keep the recipient Gmail account and Supabase/Resend administrator accounts protected with MFA.

## Local validation

Use Node.js 24 and `npm ci`, then `npm test`, `npm run typecheck`, `npm run build`, and `npm run test:e2e`. Browser tests use fake public configuration, mocked email/Auth responses and local Chromium; no real messages are sent. PostgreSQL tests execute the actual schema with separate database roles and simulated trusted Auth claims. They validate RLS behavior, not a deployed Supabase gateway or provider configuration.
