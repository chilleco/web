# Repository Guidelines

## Architecture & Structure
- Services: `api/` FastAPI backend; `web/` Next.js 15 + TypeScript (dirs: `src/app`, `entities`, `features`, `widgets`, `shared`, `i18n`, `styles`); `tg/` Telegram worker; `infra/` Docker Compose; `data/` runtime storage.
- Localization: bundles in `web/messages/*.json`; per-locale routing under `web/src/app/[locale]/**`. All user-facing text must use locale files.

## Environments
- `.env` defines `MODE`: LOCAL / TEST / DEV / PRE / PROD; loaded in `api/`, `web/`, and `tg/` containers. Copy `base.env` → `.env`; merge `prod.env` values for production.

## API & Backend Principles
- API-first and POST-only JSON (Stripe/Twitter style). Endpoints are JSON-RPC-ish: POST body carries action payload; responses have consistent success/error envelopes; avoid form/multipart unless required.
- Real async: async/await end-to-end with non-blocking clients; try/catch with domain error mapping; avoid blocking I/O.
- Keep it lean: no unnecessary wrappers, deep inheritance, or extra deps; keep schemas/models near routes.
- Custom libs: `consys` ORM (`docs/CONSYS_ORM_DOCUMENTATION.md`), `libdev` helpers (`docs/LIBDEV_DOCUMENTATION.md`), `userhub` (auth), `tgio` (Telegram helpers), `tgreports` (reporting). Check docs/README before changes.

## Frontend Principles
- Tailwind CSS + Radix UI (shadcn/ui)
- Mobile-first; build single adaptive components instead of breakpoint forks. Honor theme tokens and reuse Radix primitives.
- Themes: system (default) / light / dark; components should honor tokens.
- Path alias `@/*` → `web/src/*`. Strict TS; PascalCase components; hooks as `useThing`; slices in `features/*/stores/*Slice.ts`. Keep barrels small.

## Development Workflow (AI-friendly)
1) Plan requirements (locale keys, timezone, themes, access rules, API contracts, error shapes). 2) Define models + DB migrations. 3) Draft corner/edge-case backend tests (aim for 100% on models/routes/functions; add fixtures). 4) Implement routes/functions/scripts. 5) Update docs and generate TS schemas. 6) Build frontend components/pages; verify styling/locales/themes/access/mobile. 7) Add frontend tests. 8) Run tests and linters. Avoid extra layers unless justified.

## Commands
- Frontend (`web/`): `npm install`; `npm run dev`; `npm run build`; `npm run start`; `npm run lint`.
- Stack (repo root): `make up` / `make up-dev` / `make down`; logs via `make logs-local`.
- Tests: `make test` for API + web in compose; `make test-api` or `make test-web` individually.

## Testing & QA
- API tests live in `api/tests` (pytest). Add alongside new routes/models; name `test_*`; share fixtures in `tests/conftest.py`; target high coverage.
- Frontend currently lint/manual; if adding tests, place under `web/src/**/__tests__` and wire into `make test-web`.
- Note skips/flakes in PRs.

## Git & PR Hygiene
- Commits: short, imperative (`Fix local API requests`). Branches: `feature/*`, `bugfix/*`. PRs: summary, linked issue, commands run, screenshots/GIFs for UI changes, and env/migration updates.
