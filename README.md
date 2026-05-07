# ATHLOX — smoke test landing

Bilingual (ES / EN) landing page for an early-validation niche test of
men's outdoor-worker sun protection. Captures emails into a Mailchimp
audience, fires a localized welcome email through a Mailchimp Welcome
Automation, and is hardened for direct deploy to Vercel.

The product context, customer-research VOC, and brand voice live in
[`.agents/`](./.agents) — the landing copy and email copy are pulled
verbatim from those documents.

## Stack

- **Next.js 16** (App Router, Turbopack) on **React 19**
- **Tailwind CSS v4** with `next/font` self-hosted Anton + JetBrains Mono + Geist
- **TypeScript** strict
- **Mailchimp Marketing API** for audience + welcome automations
- **Vercel** for hosting

## Local setup

```bash
# 1. Install
npm install

# 2. Environment
cp .env.example .env.local
# Fill in the three Mailchimp values — see .env.example

# 3. Run
npm run dev
```

Opens at <http://localhost:3000>. Browser language detection runs after
hydration: Spanish primary, English when `navigator.language` starts
with `en`, Spanish otherwise.

## Routes

| Route | Type | Purpose |
| --- | --- | --- |
| `/` | static | Landing — hero, 3 benefit bullets, email form, footer |
| `/preview/welcome` | static | Local mock of the welcome email in both languages, with HTML / plain-text copy buttons |
| `/api/subscribe` | server (POST) | Adds email to Mailchimp audience with `LANGUAGE` and optional `FNAME` merge fields |

The form posts `{ email, language, firstName, company, loadedAt }`.
`company` is a honeypot, `loadedAt` is the page-mount timestamp.
See `app/api/subscribe/route.ts` for the full request lifecycle.

## Mailchimp setup

The audience and welcome automation must be configured **inside
Mailchimp** before signups start hitting production. Step-by-step:
[`MAILCHIMP_SETUP.md`](./MAILCHIMP_SETUP.md).

Key requirements (verified-via-API on 2026-05-07):
- `LANGUAGE` merge field exists on the audience (text, default `es`)
- `FNAME` audience default is set (recommend `amigo`) so the Spanish
  subject line renders cleanly
- Two welcome automations exist, segmented by `LANGUAGE = es | en`,
  triggered immediately on subscribe

## Security

This project is hardened for production deploy. The full audit lives
at [`docs/security-checklist.md`](./docs/security-checklist.md).
Highlights:

- Strict same-origin check on `/api/subscribe`
- In-process rate limit (10 / IP / hour)
- Honeypot + 3-second timestamp anti-bot
- 1 KB request payload cap
- CSP, HSTS (production), X-Frame-Options DENY, X-Content-Type-Options
  nosniff, Referrer-Policy, Permissions-Policy, no `X-Powered-By`
- `.env.local` gitignored; no secrets in source

Never commit `.env.local`. Every Mailchimp call happens server-side
inside `/app/api/subscribe`; the API key is never exposed to the
browser bundle.

## Deploy to Vercel

1. Push this repo to GitHub.
2. Import the repo at <https://vercel.com/new>.
3. Add the three `MAILCHIMP_*` environment variables in the Vercel
   project settings (production + preview).
4. Optional: set `NEXT_PUBLIC_SITE_URL` to your production domain so
   the same-origin check in `/api/subscribe` accepts your canonical
   URL.
5. Deploy.

`vercel.json` mirrors the static security headers at the edge.
`next.config.ts` disables production source maps and removes the
`X-Powered-By` header.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the Turbopack dev server |
| `npm run build` | Production build (also runs the type checker) |
| `npm run start` | Run the production build locally |
| `npm run lint` | ESLint |

## Project layout

```
app/
  api/subscribe/route.ts   server-side Mailchimp integration
  preview/welcome/         local welcome-email preview tool
  page.tsx                 landing page (client component, ES/EN toggle)
  layout.tsx               root layout with self-hosted fonts
  globals.css              Tailwind entry + theme tokens
  icon.svg                 site favicon (Next.js icon convention)
.agents/                   product / customer-research source docs
docs/security-checklist.md full audit
MAILCHIMP_SETUP.md         dashboard runbook
next.config.ts             security headers, CSP, source maps off
vercel.json                edge-level security headers
```
