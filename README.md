# astro-cf-worker-starter

An Astro static site, deployed to a Cloudflare Worker by GitHub Actions,
gated by HTTP Basic Auth out of the box.

**Live demo:** [cftemplate.ossforge.dev](https://cftemplate.ossforge.dev) —
password-protected, credentials not published here; it's just there to prove
the pipeline itself works end to end.

This exists because setting this exact stack up the first time hit three
non-obvious failures — a Node/pnpm version mismatch, Cloudflare defaulting a
new "upload assets" project to a Worker rather than a classic Pages project,
and static assets silently bypassing the Worker's own auth check. This
template already has all three fixed; the sections below explain why, so the
fix doesn't get undone by accident.

## Local development

Requires Node.js >=22.13 (pnpm 11 uses `node:sqlite` internally and fails on
Node 20 with `ERR_UNKNOWN_BUILTIN_MODULE`) and pnpm 11.24 (see
`packageManager` in `package.json`).

```bash
pnpm install
pnpm dev
```

## Build

```bash
pnpm build
pnpm check
```

## How this deploys

- **`wrangler.jsonc`** — Worker config: `name` (rename this to your
  project — it must be unique in your Cloudflare account), the
  `worker/index.ts` entry point, and the `assets` binding pointing at
  `./dist`. `run_worker_first: true` is required — without it, Cloudflare
  serves matching static files directly from the edge and never runs the
  Worker, silently bypassing the auth check below.
- **`worker/index.ts`** — checks every request's `Authorization` header
  against `BASIC_AUTH_USER` / `BASIC_AUTH_PASSWORD` (Worker secrets, not
  repo config) with a timing-safe comparison, then proxies through to
  `env.ASSETS.fetch(request)`. Unauthenticated requests get a `401` with
  `WWW-Authenticate`, which triggers the browser's native login prompt.
  Delete this file and the `main` key in `wrangler.jsonc` if you want a
  public site instead — the assets binding alone is enough to serve `dist/`.
- **`.github/workflows/deploy.yml`** — on every push to `main`: install,
  `pnpm build`, push the Basic Auth secrets into the Worker, then
  `wrangler deploy`. Excluded from the root `tsconfig.json` (see its
  `exclude`) since `worker/` runs in the Workers runtime, not the site's.

### Why a Worker and not Cloudflare Pages

Cloudflare's dashboard "Workers & Pages → Create application → Upload
assets" flow now creates a **Worker** (a `*.workers.dev` URL), not a classic
Pages project — even though the older `wrangler pages deploy` command still
exists and will fail with "Project not found" against it, since it's a
different product/API namespace. This template deploys with `wrangler
deploy` (Workers) to match what the dashboard actually creates.

## Repository setup (first time only)

Unlike classic Cloudflare Pages, a Worker doesn't need to exist before you
can deploy to it — `wrangler deploy` creates it from nothing on first run,
as long as the token below has the right permission. No manual dashboard
step to pre-create anything.

1. **Create a scoped API token.** Cloudflare dashboard → My Profile → API
   Tokens → Create Custom Token → `Account → Workers Scripts → Edit`,
   scoped to your account. This permission isn't scoped to one Worker name,
   so if you already have a token like this for another Worker in the same
   account, you can reuse it instead of making a new one.
2. **Find your Account ID.** Cloudflare dashboard → any domain → sidebar.
   Same value across every Worker in the account — also reusable.
3. **Add four GitHub Actions secrets** (repo **Settings → Secrets and
   variables → Actions**):

   | Secret | Value |
   | --- | --- |
   | `CLOUDFLARE_API_TOKEN` | From step 1. |
   | `CLOUDFLARE_ACCOUNT_ID` | From step 2. |
   | `BASIC_AUTH_USER` | Whatever username you want. |
   | `BASIC_AUTH_PASSWORD` | Whatever password you want. |

4. **Push to `main`.** CI builds, creates the Worker named in
   `wrangler.jsonc` if it doesn't exist yet, pushes the Basic Auth secrets
   into it via `wrangler secret put`, and deploys. Rotating the password
   later is just updating the `BASIC_AUTH_PASSWORD` GitHub secret and
   re-running the workflow — no code change needed.
5. **Optional: attach a custom domain.** Cloudflare dashboard → Workers &
   Pages → your Worker → Settings → Domains & Routes → Custom Domains. The
   domain's zone must already be on Cloudflare for this to auto-provision
   DNS and TLS.

## License

Use this however you like — it's a starting point, not a product.
