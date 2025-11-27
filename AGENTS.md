# Repository Guidelines

## Project Structure & Module Organization
- Root services: `web/` (Next.js 15 + TypeScript, feature-sliced: `src/app`, `entities`, `features`, `widgets`, `shared`, `i18n`, `styles`), `api/` (FastAPI), `tg/` (Telegram worker), `infra/` (Docker Compose stacks), `data/` (runtime storage).
- Env templates: copy `base.env` to `.env`; merge `prod.env` values for deploys. Web assets in `web/public/`; locales in `web/messages/`.
- Path alias: `@/*` -> `web/src/*`; keep module barrels lean.

## Build, Test, and Development Commands
- Frontend (in `web/`): `npm install`; `npm run dev` (`0.0.0.0:3000`); `npm run build`; `npm run start`; `npm run lint`.
- Containers (repo root): `make up` for local stack, `make up-dev` for dev overrides, `make down` to stop, `make logs-local` for tails.
- Tests: `make test` runs API + web suites in compose; `make test-api` or `make test-web` targets one service.

## Coding Style & Naming Conventions
- TypeScript strict; 2-space indent; prefer single quotes. React components and files in PascalCase; hooks as `useThing`; Redux Toolkit slices under `features/*/stores/*Slice.ts`.
- Reuse utilities from `shared/`; Tailwind 4 + `clsx`/`class-variance-authority` available. Keep server/client component boundaries explicit in Next 15.
- Run `npm run lint` before commits; follow `eslint.config.mjs` (Next/TS rules, alias support).

## Testing Guidelines
- API tests live in `api/tests` (pytest). Add coverage alongside new routes/models; name tests `test_*` and centralize fixtures in `tests/conftest.py`.
- Frontend currently relies on lint + manual checks; if you add tests, mirror components under `web/src/**/__tests__` and wire into `make test-web`.
- Execute `make test` before PRs; document any skips or flakes in the PR body.

## Commit & Pull Request Guidelines
- Commits are short and imperative (e.g., `Fix local API requests`, `Change frontend structure`); squash noisy WIP locally.
- PRs: include a brief summary, linked issue, commands run (lint/tests), and UI screenshots/GIFs when visuals change. Flag env var or migration updates.
- Branch naming: `feature/login-form`, `bugfix/cart-total`; keep diffs focused.

## Security & Configuration Tips
- Never commit secrets; derive `.env` from `base.env` (local `MODE=LOCAL` per `README.md`). Use `prod.env` overrides for deployments.
- `DATA_PATH` defaults to `./data`; compose binds host storage—avoid removing logs or user data without backups.
