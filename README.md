# REVORA

Marketing site and private owner console for the REVORA NFC + QR feedback stand. Built with React, TypeScript, Vite, Three.js, MapLibre, and Supabase.

## Develop

Use Node.js 24 (tested with 24.22.1) and npm. Work in the existing checkout; each cloud task is isolated.

```bash
npm ci
npm run dev        # Vite on port 5173
npm run typecheck
npm run build
npm run preview    # Production build preview
npm test           # Request-handler and actual PostgreSQL access-policy tests
npm run test:e2e   # Local Chromium browser tests with mock services
npm run test:production # Build + browser check with deployment CSP (no backend config)
```

Browser tests default to `/usr/bin/chromium`. Set `CHROMIUM_PATH` to another installed Chromium executable if needed. Test-only keys are fake public configuration, and tests send no real emails. Generated reports are ignored.

## Demo requests and private admin access

The company demo inbox is **revora.org.com@gmail.com**. The request form collects name, venue, email and requirements, plus the selected plan when applicable. An Edge Function saves validated requests and sends a plain-text email via Resend. The browser never gets the email API credential. Success requires confirmed provider acceptance; without configured services the form offers a manual email link instead of simulating a successful submission.

Follow [the complete backend setup and live validation guide](docs/DASHBOARD-SETUP.md) before deploying. It covers SQL, approved admin UUIDs, mandatory authenticator verification, Turnstile, Resend, server secrets, frontend public configuration, failure handling and retention. Live email delivery and Supabase configuration require real accounts and credentials and are not established by local tests.

Admin access is enforced by PostgreSQL row-level security for direct API calls as well as the website. Visiting `/dashboard` or editing browser state grants no data access. Public signup has been removed from the app and must also be disabled in Supabase Auth. Only approved admins with an MFA session can read requests or update their status.

## Performance and content

- The map module loads near the viewport; example venues and ratings are clearly labeled.
- The hero uses a lightweight canvas orbit with projected 3D geometry and depth shading, shared with the small logo mark. It needs no image or WebGL bundle and pauses offscreen, in hidden tabs, and for reduced motion.
- The optimized, silent 960px tap video is about 217 KB and pauses offscreen. Reduced-motion/data-saving visitors see its poster.
- Fonts are self-hosted. Decorative animations pause when hidden and clean up listeners/frames.
- Native dialogs provide background isolation, keyboard navigation and focus restoration. Pricing opens a plan-specific request, all section anchors remain available before lazy loading, and the owner console uses mobile request cards. Owner sign-in is unlinked from public navigation; use /login directly. Password, MFA and database policies remain required; an unlisted URL is not an access-control boundary.
- The interactive guest demo generates an example draft locally. It does not submit feedback or post Google reviews.

Assets live in `public/assets/`, components in `src/components/`, owner pages in `src/pages/`, SQL in `supabase/schema.sql`, and the email function in `supabase/functions/request-demo/`. The purple/black UI and black/gold product identity remain intact.
