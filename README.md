# ACADEAL-SaaS

## Local development

```bash
npm install
npm run dev
```

## Multi-school control plane

The app now supports one shared deployment with one Neon database per school.

### Required environment variables

- `CONTROL_PLANE_DATABASE_URL`: connection string for the registry database that stores onboarded schools
- `CONTROL_PLANE_DATABASE_URL_UNPOOLED` or `CONTROL_PLANE_DIRECT_URL`: optional direct/unpooled registry connection for admin writes
- `TENANT_DIRECTORY_JSON`: optional fallback tenant registry; runtime now checks the control plane first and falls back to this env value

### Vercel and local dev

- On a Vercel deployment, add `CONTROL_PLANE_DATABASE_URL` to the correct environment and create a new deployment so the runtime picks it up.
- In local development, Vercel dashboard changes do not automatically appear in `next dev`. Add the value to `.env.local` or run `vercel env pull .env.local`.

### Onboarding flow

1. Sign in as a `SUPER_ADMIN`.
2. Open `/dashboard/platform/schools` from the main platform site.
3. Add the school slug, domains, login codes, and Neon connection strings.
4. The app verifies the school database before saving the record.
5. If the tenant database already has the `SystemSettings` table, onboarding will seed or gently sync:
   - `schoolName`
   - `schoolShortName`
   - `publicAppUrl`
   - `studentIdInitials`

If the tenant database is reachable but Prisma migrations have not been applied yet, onboarding will stop and tell you to migrate that school database first.

School onboarding is intentionally hidden and blocked on school subdomains. It is only available from the main platform/developer host.
