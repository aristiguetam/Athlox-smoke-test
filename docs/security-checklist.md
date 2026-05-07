# Security checklist — ATHLOX smoke test

Audit date: 2026-05-07. Pre-deployment hardening for Vercel.

Status legend:
- ✅ Done
- ⚠️ Partial / has caveat
- ❌ Not applicable / explicitly accepted

---

## 1. Environment variables & secrets

| Item | Status | Detail |
| --- | --- | --- |
| `.env.local` ignored by git | ✅ | `.gitignore` has `.env*` (covers `.env.local`, `.env.production.local`, etc.) |
| No hardcoded secrets in source | ✅ | Grep across `app/`, `next.config.ts`, `eslint.config.mjs` — no API keys, tokens, passwords. Only the Mailchimp URL template (server-side, uses env vars) |
| Mailchimp creds used only server-side | ✅ | `MAILCHIMP_*` is referenced only in `app/api/subscribe/route.ts` which declares `runtime = "nodejs"`. No `NEXT_PUBLIC_MAILCHIMP_*` exists |
| `.env.example` committed | ✅ | Created at project root with placeholder values + comments |

**How to verify:** `grep -rln "MAILCHIMP" app` — should return only `app/api/subscribe/route.ts`.

---

## 2. API route hardening (`/api/subscribe`)

| Item | Status | Detail |
| --- | --- | --- |
| Rate limit: 3 req / IP / hour | ⚠️ | Implemented via in-process sliding-window `Map`. **Caveat:** Vercel serverless instances are ephemeral and not shared, so this is best-effort and bypassable by an attacker who can land on cold-started or different instances. Returns HTTP 429 |
| Server-side email validation | ✅ | `^[^\s@]+@[^\s@]+\.[^\s@]+$` regex applied after origin/payload/rate gates. Mailchimp is the second line of defense |
| `firstName` length cap (50) + sanitize | ✅ | `.trim().slice(0, 50).replace(/[\x00-\x1f<>|]/g, "")` — strips control chars, angle brackets, and `\|` (Mailchimp merge-tag delimiter) |
| `language` whitelist | ✅ | Only `"es"` or `"en"` accepted; anything else falls back to default `"es"` |
| Generic error messages | ✅ | All client responses are `{"error":"something went wrong"}` or `{"error":"already subscribed"}`. No upstream Mailchimp error bodies are surfaced |
| Payload size limit (1 KB) | ✅ | Two-pass: header `content-length` check pre-parse + raw body length check post-read. Returns HTTP 413 |

**Verified branches (curl tests, all green):**
- No Origin header → 403
- Wrong Origin → 403
- 1500-byte body → 413
- Honeypot filled → 200 silent success
- `loadedAt` < 3s ago → 200 silent success
- Bad email → 400
- 4th request within an hour → 429

---

## 3. HTTP security headers

Configured in `next.config.ts` (`headers()` callback) and mirrored at the Vercel edge in `vercel.json`. When both are present, Vercel headers take precedence.

| Header | Status | Value |
| --- | --- | --- |
| Content-Security-Policy | ✅ | `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; frame-src 'none'; base-uri 'self'; form-action 'self'; object-src 'none'; upgrade-insecure-requests` (production). Dev adds `'unsafe-eval'` to script-src and `ws: wss:` to connect-src for HMR |
| X-Frame-Options | ✅ | `DENY` |
| X-Content-Type-Options | ✅ | `nosniff` |
| Referrer-Policy | ✅ | `strict-origin-when-cross-origin` |
| Permissions-Policy | ✅ | `camera=(), microphone=(), geolocation=(), interest-cohort=()` |
| Strict-Transport-Security | ✅ | `max-age=63072000; includeSubDomains; preload` — applied only when `NODE_ENV=production` (no benefit on `localhost`) |
| X-DNS-Prefetch-Control | ✅ | `off` (extra fingerprinting reduction) |
| X-Powered-By removed | ✅ | `poweredByHeader: false` in `next.config.ts` |

**CSP caveats:**
- `'unsafe-inline'` in `script-src` is required by Next.js's bootstrap inline script and can't be removed without switching to a nonce-based middleware (overkill for a smoke test)
- `'unsafe-inline'` in `style-src` is required by the inline `style={{...}}` props used throughout the JSX. Same upgrade path: nonces + middleware
- `next/font/google` self-hosts the font files at build, so no `https://fonts.googleapis.com` / `https://fonts.gstatic.com` is whitelisted — the smaller surface is intentional

---

## 4. CORS / Origin

| Item | Status | Detail |
| --- | --- | --- |
| Same-origin only | ✅ | `/api/subscribe` rejects requests where `Origin` header is missing OR doesn't match `https://${host}` / `http://${host}` / `NEXT_PUBLIC_SITE_URL` |
| No `Access-Control-Allow-Origin: *` | ✅ | We don't emit any CORS headers — same-origin form posts don't need them |

**Effect:** server-to-server calls (curl / postman / external apps) without an `Origin` header are rejected. This is intentional.

---

## 5. Anti-spam

| Item | Status | Detail |
| --- | --- | --- |
| Honeypot field | ✅ | `<input name="company">` rendered inside a wrapper with `aria-hidden="true"`, `tabIndex={-1}`, `autoComplete="off"`, positioned at `left:-9999px; top:-9999px` (not `display:none`, which some bots skip). Server returns `{"success":true}` silently when filled — no Mailchimp call |
| Timestamp validation (3s minimum) | ✅ | Form sets `loadedAt = Date.now()` in `useEffect` on mount. Server returns silent success if `Date.now() - loadedAt < 3000` |

**Lenient timestamp:** if `loadedAt` is missing entirely (e.g., a JS-disabled bot or a curl test), the timestamp check is skipped — the honeypot still catches those.

---

## 6. Dependencies

| Item | Status | Detail |
| --- | --- | --- |
| `npm audit` clean | ⚠️ | 2 moderate findings, both transitive `postcss <8.5.10` bundled inside Next.js itself. Advisory: XSS via unescaped `</style>` in CSS Stringify output. **Accepted** — Next.js doesn't expose postcss to user input; we don't process user-generated CSS. The "fix" downgrades Next.js to 9.x (massively breaking, no real benefit). Newer Next 16.3 canary has the same transitive dep |
| Unused dependencies removed | ✅ | Source imports only `next`, `next/font/google`, `react`. All `package.json` deps are in active use (Tailwind/PostCSS for build, eslint configs, types) |

---

## 7. Vercel-specific

| Item | Status | Detail |
| --- | --- | --- |
| HTTPS forced | ✅ | Vercel auto-redirects HTTP→HTTPS on all `.vercel.app` and verified custom domains. HSTS header tells browsers to never try HTTP |
| Security headers at edge | ✅ | `vercel.json` declares the static security headers (HSTS, XFO, X-CTO, Referrer-Policy, Permissions-Policy) for edge-level enforcement before requests hit Next.js |
| No production source maps | ✅ | `productionBrowserSourceMaps: false` in `next.config.ts` |

---

## 8. `.gitignore` audit

| Pattern | Status |
| --- | --- |
| `.env*` (covers `.env.local`, `.env*.local`, `.env.production`) | ✅ |
| `node_modules` (`/node_modules`) | ✅ |
| `.next/` | ✅ |
| `.vercel` | ✅ |
| `*.pem` (cert/key files) | ✅ |

---

## Remaining risks & known gaps

1. **Rate limiting is in-process.** A determined attacker who hits cold-started or load-balanced instances can exceed 3/hour. To harden: switch to Vercel KV or Upstash Redis using a sliding-window algorithm. Pattern: `@upstash/ratelimit`. Until then, treat the rate limit as a speed bump, not a guarantee.
2. **CSP uses `'unsafe-inline'` for scripts and styles.** Required by Next.js bootstrap and inline `style={{}}` JSX props. Upgrade path: a `middleware.ts` that injects per-request nonces and rewrites the CSP. Worth doing if/when this becomes a non-smoke-test app.
3. **postcss transitive vulnerability inside Next.js.** Tracked, no exploitable vector in this app, no upstream fix that doesn't involve downgrading Next.js to 9.x. Re-check after each Next.js upgrade.
4. **Honeypot is single-field.** Sophisticated bots may detect the offscreen positioning. Multi-honeypot or hCaptcha/Turnstile would harden. Not worth the friction for a smoke test.
5. **No request logging / audit trail.** If we get spam through, we'll have nothing to inspect. For early validation this is fine; production should add structured logs (Vercel Log Drains → Axiom / Datadog).
6. **No CSRF token.** Same-origin check + JSON-only `Content-Type` defends against classic CSRF (browsers won't send `application/json` cross-origin without preflight, which our 403 blocks). Still, a token would be an extra layer if we ever add cookie-based session state.

---

## How to re-verify after changes

```bash
# 1. Type check
npx tsc --noEmit

# 2. Audit
npm audit

# 3. Boot
npm run dev

# 4. Headers
curl -sS -D - -o /dev/null http://localhost:3000/ | \
  grep -iE "^(content-security-policy|x-frame-options|x-content-type-options|referrer-policy|permissions-policy|x-powered-by)"

# 5. Origin reject
curl -sS -o /dev/stdout -w "  HTTP %{http_code}\n" -X POST http://localhost:3000/api/subscribe \
  -H "Content-Type: application/json" -d '{"email":"x@y.com"}'
# expect: HTTP 403

# 6. Rate limit (4 calls from same fake IP)
for i in 1 2 3 4; do
  curl -sS -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/subscribe \
    -H "Content-Type: application/json" -H "Origin: http://localhost:3000" \
    -H "x-forwarded-for: 198.51.100.42" -d '{"email":"bad"}'
done
# expect: 400 400 400 429
```
