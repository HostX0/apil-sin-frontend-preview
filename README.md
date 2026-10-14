# Apil Sin Frontend Preview

An independent, editable Next.js frontend preview with the DevsHub interface and synthetic sample records. This repository has its own history and deployment. It contains no production server, database, upload storage, credentials or customer records.

The preview opens directly at `/dashboard`. The banner identifies it as a preview. All client, case, calendar, finance and message records are examples. Changes stay in browser memory and reset when the page reloads. Do not enter real personal or client information.

## Run locally

Requires Node.js 22.12 or newer and pnpm 11.

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm start
```

Checks: `pnpm test` and `pnpm typecheck`.

Open `http://localhost:3000`. For development, run `pnpm --filter @muhami/shared build` once, then `pnpm dev`.

## Deploy on Vercel

Create or import a **separate** Vercel project from this repository with:

- Root Directory: `apps/web`
- Framework: Next.js
- Build Command: `pnpm --filter @muhami/shared build && pnpm build`
- Install Command: `pnpm install --frozen-lockfile`
- Output Directory: `.next`

These commands are also recorded in `apps/web/vercel.json`. No environment variables, API credentials or production domains are required. Do not reuse the production project's settings or domains.

## Source structure

- `apps/web/src`: editable React pages, components and frontend logic.
- `apps/web/src/lib/preview-api.js`: readable synthetic fixtures and an in-memory API, recovered from the already published standalone preview.
- `apps/web/src/lib/api-client.ts`: preview-only adapter. It never makes an HTTP API request.
- `packages/ui`: shared frontend components and styles.
- `packages/shared`: frontend domain types, labels and validation schemas.

The interface source is copied from the original frontend into a new repository; the backend and original Git history are excluded. The mock transport was restored from the existing preview so its sample workflows are preserved.

## Preview limits and isolation

Authentication is simulated with a sample office manager; there is no real login service. Messaging, email delivery, push notifications, file uploads, signed downloads, archive exports and restore operations do not contact external services. Controls that need those services show a preview limitation instead. CRUD demonstrations affect sample memory only.

The browser's Content Security Policy permits connections only to the preview origin. The preview has no API proxy, production API fallback, service worker registration or production environment configuration. Search engines are instructed not to index it. Deploy it independently from the production application.
