# Security

## Required before deploying this branch

Confirm **`REVALIDATION_SECRET`** is set. `/api/revalidate` used to accept a
request with no secret when the variable was missing; it now fails closed.

Nothing else is newly required.

## Payments

Fees are settled in cash and recorded by an administrator through
`recordCashPayment`. There is no online payment provider and no payment webhook.

The Moolre integration was removed before it was ever used. When a provider is
added — Paystack is the intent — the webhook that confirms a payment is the
piece to get right:

- Verify the provider's signature over the **raw** request body before parsing
  it. Re-serializing a parsed object reorders keys, so the digest will not match
  what the sender signed. Paystack signs with HMAC-SHA512 over the raw body,
  keyed on the secret key, in the `x-paystack-signature` header.
- Fail closed when the signing secret is not configured. The removed handler
  originally trusted an unauthenticated body, which meant anyone who knew the
  URL could mark any fee `PAID` by iterating an integer.
- Treat the callback as a hint, not as truth: confirm the transaction against
  the provider's own API before changing fee status, and make replays
  idempotent so a repeated callback cannot double-credit.
- Never take the amount from the callback body.

## How authorization works

Every API route handler and every exported server action authorizes for itself
through `src/lib/security/guard.ts`. Nothing else is a security boundary:

- `src/proxy.ts` only matches paths under `/dashboard`. API routes never reach
  its role matrix.
- Server actions are dispatched by action ID, not URL, so an action is reachable
  by posting a `Next-Action` header to any page including public ones. The proxy
  cannot see them at all.

Pick the narrowest guard that fits:

| Guard | Allows |
| --- | --- |
| `requireSession()` | any signed-in user |
| `requireRole(...roles)` | the listed roles |
| `requireStaff()` | admin, teacher |
| `requireAdmin()` | admin |
| `requireSuperAdmin()` | admin with `adminRole === "SUPER_ADMIN"` |
| `requireFeeAccess(permission)` | staff holding that fee permission |
| `requireStudentAccess(studentId)` | staff, the student, or their guardian |
| `requireSelfOrAdmin(userId)` | the owner of the record, or an admin |

`require*` throws; use it in server actions, where the surrounding `try/catch`
turns it into a returned failure. `guard*` returns `{ ok, response }`; use it in
route handlers, where the failure needs a specific status code.

`npm run check:guards` fails the build if an exported server action has no
authorization check. It runs as part of `npm run lint`.

### Identifiers from the request are not trusted

If an action takes a `studentId`, `userId` or record ID from its caller, check
it against the session — do not assume the UI sent the right one. Where a write
can be scoped in the query instead, prefer that: `updateMany` with the owner in
the `where` clause fails safely, returning a count of zero.

## Tenant isolation

Which school's database a request uses comes from the tenant recorded in the
signed session token, resolved in `resolveTenantContext`. It is deliberately
**not** taken from the `Host` header or the `sms_tenant` cookie, both of which
the caller controls, and one `NEXTAUTH_SECRET` signs tokens for every school.

`ignoreSession: true` exists for the sign-in path only, where the caller is
establishing which tenant they belong to. Do not use it anywhere else.

## Password hashes

`password` is omitted from query results by default for `Admin`, `Teacher`,
`Student`, `Parent` and `Staff` — see `GLOBAL_OMIT` in `src/lib/prisma.ts`. This
protects against `include`, which otherwise returns every scalar on a related
model and has repeatedly leaked hashes into pages rendered in the browser.

Prisma discards a global omit when a query supplies its own `select`, so reading
a hash is a deliberate act: either `select: { password: true }` or
`omit: { password: false }`. If you add such a query, make sure the value never
reaches a client component.

Prefer `select` over `include` generally, and always on anything a signed-out
visitor can reach.

## Known outstanding items

- **Content-Security-Policy still allows `'unsafe-inline'` for scripts.** The
  pop-out bootstrap in `app/layout.tsx`, the theme `<style>` block and Next's own
  hydration scripts are inline. Tightening this to a nonce means generating one
  in `src/proxy.ts`, forwarding it as `x-nonce`, and stamping it on those tags —
  it needs verifying against a running app.
- **`xlsx` has no patched release** for its prototype-pollution and ReDoS
  advisories. It parses uploaded spreadsheets in the student and teacher import
  routes, which are now admin-only. Migrating to `exceljs` would close it.
- **`next`, `postcss`, `serialize-javascript`, `sharp`** have advisories that
  need a Next.js upgrade (16.1.1 → 16.3.1) to clear. `next-pwa` is unmaintained
  and pins several of them.
- **Receipt pages are reachable by receipt number alone.** Field exposure is
  fixed, but if receipt numbers turn out to be predictable, consider an
  unguessable token in the URL.
- Consider raising admin creation and deletion from `requireAdmin` to
  `requireSuperAdmin`.

## Reporting

Report suspected vulnerabilities privately to the maintainer rather than opening
a public issue.
