# Repository Guidelines

## Project Overview
Full-stack web application with Python FastAPI backend, Next.js frontend, and Telegram bot. The application uses Docker containers for deployment.

## Architecture & Structure
- Services: `api/` FastAPI backend; `web/` Next.js 15 + TypeScript (dirs: `src/app`, `entities`, `features`, `widgets`, `shared`, `i18n`, `styles`); `tg/` Telegram worker; `infra/` Docker Compose; `data/` runtime storage.
- Telegram bot: `tg/main.py` handles webhook updates (proxied via `/tg/`), authenticates via `/users/token/` + `/users/bot/` with `utm` from `/start`, and replies with a WebApp button built from `WEB`. Localized bot messages live in `tg/messages/{locale}.json` (five locales only).
- Localization: bundles in `web/messages/*.json`; per-locale routing under `web/src/app/[locale]/**`. All user-facing text must use locale files.

## Background Jobs (Taskiq)
- Core Taskiq files live in `api/app/tasks/`: `broker.py`, `scheduler.py`, `system.py`, and `__init__.py`.
- Task definitions are grouped under `api/app/tasks/periodic/`, `api/app/tasks/scheduled/`, and `api/app/tasks/jobs/`.
- Model change hooks/events live under `api/app/tasks/events/` (handlers only).
- Event system files live in `api/app/tasks/`: `event_base.py`, `event_registry.py`, `event_dispatcher.py`, `event_enqueue.py`.
- Taskiq workers/scheduler should import `api/app/tasks/registry.py` (registers all tasks).
- Import job tasks via `from tasks import <task_name>` (no `tasks.jobs.*`); `api/app/routes/tasks/__init__.py` should only import job tasks.

## Entities
Depending on the project that develops based on this template, the entities of this template can be reused as follows:
- spaces (switch environment: like Slack workspaces)
- posts (text-centred entity: articles, news, ...)
- products (sales unit: goods, apartments, ...)
  - options (example for goods: product size variations on marketplaces, example for apartments: pricing plans)
- users (main clients of the service + admins)

## Tasks (Rewards)
The "tasks" feature is a reward checklist that grants users inner coins after verification.

### Backend
- Model: `api/app/models/task.py` (`tasks` collection). Active tasks usually have no `status` field because ConSys strips defaults; `status=0` disables a task. Optional `expired` (unix seconds) hides tasks for users and blocks claiming.
- Completion state: stored in `UserLocal.tasks` (`api/app/models/user.py`) as a list of completed task ids; user balance is `UserLocal.balance`.
- Routes:
  - `POST /tasks/get/` (`api/app/routes/tasks/get.py`): user list (active + not expired) with derived `status` (1/3) and link formatting; admin list with `{"admin": true}` returns raw definitions (requires `status>=6`).
  - `POST /tasks/check/` (`api/app/routes/tasks/check.py`): runs `verify.<key>.check(user_id, params)` and, on status `3`, awards `reward` and persists completion.
  - `POST /tasks/save/` (`api/app/routes/tasks/save.py`): admin-only create/update; audited via `TrackObject.TASK`.
- Verify modules live in `api/app/verify/`:
  - `simple`: always succeeds
  - `channel`: requires `params.chat_id` and a `UserLocal.social_user` (Telegram user id)
  - `invite`: requires `params.count` and checks referral count

### Frontend
- User page: `web/src/app/[locale]/tasks/page.tsx` (mobile nav entry only, header unchanged).
- Admin page: `web/src/app/[locale]/admin/tasks/page.tsx` (CRUD + enable/disable).
- Localization: `navigation.tasks`, `tasks.*`, `admin.tasks.*`. ICU gotcha: to show a literal `{}` in messages, quote it like `'{}'`, otherwise `next-intl` throws `INVALID_MESSAGE: EMPTY_ARGUMENT`.

## Referrals (Frens)
- Backend: `POST /users/frens/` returns the current user's frens list (sorted by balance) with relation labels and `referral_link`.
- Referral key: `UserLocal.link` is generated via `encrypt(user.id, 8)` and decoded with `decrypt()` in `routes/users/auth.update_utm` to resolve referrers.
- VK Mini Apps: share links should use `vk_ref=<referral>` so the frontend can map it to `utm` on session init.
- Frontend: `web/src/app/[locale]/social/page.tsx` renders the frens list and uses `navigation.frens` + `social.*` i18n; mobile bottom bar includes the frens entry linking to `/social`.

## Environments
- `.env` defines `MODE`: LOCAL / TEST / DEV / PRE / PROD; loaded in `api/`, `web/`, and `tg/` containers. Copy `base.env` → `.env`; merge `prod.env` values for production.
- Base URLs: server-side requests must use `http://api:5000/` (internal Docker network); client-side requests must use `NEXT_PUBLIC_API` through nginx; do not add separate API base URL variables.
- Detect environment via `NEXT_PUBLIC_MODE` (mirrors `MODE`).
- Web stack builds use Node 24 (Docker + compose test) and Next 16/React 19; keep local runtime and `@types/node` aligned when bumping.

## Golden Rules of coding & editing
- **Explain the plan** (brief): research, make strategy and all steps of changing. compliance with the rules of the repository and the specifics of custom libraries and components
- **Development**: Follow the **DevOps Principles** & **Backend Principles** & **Frontend Principles**
- **Minimal, focused diffs**: change only what's necessary; Make minimal changes in relevant files & rows only
- **Page blocks → components**: In `web/src/app/**/page.tsx`, extract each major UI block/section into a named component/function (keep `page.tsx` orchestration-focused; avoid huge JSX returns).
- **Concise naming**: prefer short, laconic labels (e.g., `pays` over `payments/charges`, `ad` over `advertisement/promotion`, `post` over `article`, `tasks` over `schedules`, `infra` over `infrastructure`)
- **Cursor pointer everywhere**: All clickable elements/blocks/links/pickers/sliders must explicitly set `cursor-pointer` for clear affordance
- **Dialog affordance**: Dialog close buttons AND the dimmed overlay/backdrop used to close dialogs must have `cursor-pointer`
- **No duplicate API calls**: guard client-side fetch effects with stable fetch keys/in-flight refs so Strict Mode doesn’t trigger the same request multiple times (one request per dataset)
- **Documentation**: Write documentation directly in code files as comments and docstrings, not as separated files (No new .md files to describe logic, usage, or implementation details; No example .json files to show data structures or logging formats)
- **Required fields UX**: For all forms mark required inputs with `*` and highlight missing/invalid required fields with a red focus/outline when the API returns validation errors (e.g., `detail` value). Keep visual feedback consistent across the app.
- **Popups/Toasts**: Emit only one localized toast per error; map backend `detail`/field keys to translated messages and surface the exact field causing the issue (no duplicate global+local toasts).
- **Error responses**: Backend errors follow `{"status":"error","error":"ErrorWrong","detail":"id"}` shape. Frontend popups must show the raw `detail` value (field/key) once, and optionally add a concise localized hint if available. Reuse this rule across all routes/components (not just categories) to avoid multiple generic popups.
- **Backend error formatting**: Raise `BaseError(txt)` (from `consys.errors`) for any user-facing API error so `api/app/services/errors.py` middleware returns HTTP 400 with `{"status":"error","error":<ErrorClass>,"detail":txt}`. Do not leak stack traces/500s for validation/processing failures (including uploads); wrap unexpected processing errors into `BaseError` with a clean `detail`.
- **Dialogs must scroll**: Large popups (forms/modals) must fit on mobile and small screens with max-height constraints and internal `overflow-y-auto` so content is scrollable without breaking layout.
- **Mobile adaptive**: Every screen, table, and control layout must stay usable on small/mobile widths; add horizontal scroll containers for wide tables instead of letting them overflow.
- **App shell layout**: `layout.isApp` (`selectIsApp`) marks in-app clients (tg/vk/max). When `isApp` is true, render `MobileBottomBar` on all viewports and hide `Header`/`Footer`; when false, always show `Header`/`Footer` and never show the bottom bar. Keep `isApp` synced to runtime detection via `shared/lib/app.ts` (`getClientNetwork`, `isApp`) and avoid breakpoint-based gating for app shells (Telegram detection lives in `shared/lib/telegram.ts`; VK detection uses `shared/lib/vk.ts` with `vk_user_id` + `sign` params; MAX detection uses `shared/lib/max.ts` with `window.WebApp.initData`).
- **Shared translations first**: Use existing `system.*` translation keys for shared labels (loading, refresh, common actions) instead of introducing feature-specific duplicates; migrate simple words from feature scopes to `system.*` when touching those areas.
  - When adding new locale strings, ensure non-English locales are translated (avoid copy-pasting English into `ru`/`es`/`ar`/`zh`).
- **No duplicated UI/i18n**: If multiple screens/forms need the same control or helper text, extract a shared component in `web/src/shared/ui/` and move the strings to `system.*` (delete feature-scoped duplicates).
- **Unit suffixes**: Show measurement units using right-side labels/suffix segments on inputs (e.g., %, kg, cm); keep left labels clean.
- **Number inputs**: Hide browser stepper arrows and prevent scroll-wheel value changes; use shared Input defaults or equivalent handlers for any custom number fields.
- **Allow clearing inputs**: Form fields (including numeric inputs) must allow users to clear the value with Backspace/Delete before retyping; do not force immediate fallback values while typing.
- **Verify APIs with curl**: When adding or debugging endpoints, hit them with `curl` (use bearer tokens provided in examples when available) to confirm responses and contracts before handoff.
- Add relevant information to this AGENTS.md file; Update the main README.md if necessary
- **API sanity via curl**: When debugging/adding flows, hit backend endpoints with curl locally (using provided bearer tokens when available) to validate responses and fix errors before shipping.
- **Pre-handoff checks**: Always run `npm run lint` and `npm run build` (or `make lint-web`) yourself before finishing a task; fix any errors locally. If sandbox/network blocks them, explicitly note the failure reason and keep TypeScript/routing types clean (use typed `redirect/push` objects aligned with `web/src/i18n/routing.ts`).
- **Track actions with enums**: Use `Track.log` + `TrackObject`/`TrackAction` enums from `api/app/models/track.py` for every audited change (objects: user, post, product, category, comment, space, payment, session, system; actions: create, update, remove, search, view, disconnect). Always pass `request` to capture context (source/network, status/roles, locale, user agent, ip via `request.state.ip`, url, token) and provide `params` with compact change sets only (no before/after echoes) via `{"id": entity.id, "changes": format_changes(entity.get_changes())}`. Example: `Track.log(object=TrackObject.POST, action=TrackAction.UPDATE, user=request.state.user, token=request.state.token, request=request, params={"id": post.id, "changes": format_changes(post.get_changes())})`. The admin feed uses `/admin/activity/` (default 20 last events) with filters for user, ip, object/action, and date range—keep Track entries consistent.
- **User profiles fetch**: When you need user login/name/surname in responses or UI feeds, never stuff them into Track params. Use `fetch_user_profiles(ids)` from `api/app/models/user.py` to fetch global users first and overlay `UserLocal` fields in one batched request; reuse this helper across routes instead of ad-hoc UserLocal queries.
- **Reuse cards/items**: Always reuse existing card/item components for repeated contexts (landing listings, related/recommended blocks, similar products, etc.)—e.g., use the shared PostCard for any post teasers (landing, related posts) and the shared product card for similar products instead of creating new variants.
- **Follow FSD Architecture**: respect Feature-Sliced Design layers and import rules
- **Never hard-code secrets** or credentials; never read or write `.env`, `secrets/`, or CI secrets
- **Ask before destructive or external actions** (network, DB migrations, Docker, `git push`, etc.)
- **Files & Paths Not To Touch**: `.env*`, `secrets/**`.
- **Translation rules**:
  - Reuse common system translations for generic actions (Add, Save, Update, Edit, Delete/Remove, Cancel, Refresh, Loading, etc.) instead of creating duplicated or feature-scoped keys.
  - Common choices (Yes/No and similar simple words) must use the shared `system` locale keys (`system.yes`, `system.no`) instead of feature-scoped duplicates.
  - Non-English locales must be properly translated (no English copy/paste for `ru`/`es`/`ar`/`zh`); add missing keys to all locales together.
  - Centralize reusable option labels (e.g., entity forms/types) under shared namespaces rather than duplicating in feature scopes.
- **API routing objects**: When calling backend routes, use the existing typed API helpers and common endpoints (`/posts/get|save|rm`, `/categories/get|save|rm`, `/products/get|save|rm`, etc.) instead of ad-hoc URLs or duplicated schemas.
- **Typed frontend routing**: Use `useRouter` from `@/i18n/routing` and pass `RouteHref = Parameters<typeof router.push>[0]` only; avoid raw string concatenation. Dynamic routes must use `{ pathname: '/spaces/[link]', params: { link } }` style objects. Keep `web/src/i18n/routing.ts` `pathnames` updated before adding navigation targets so unions include new routes. Navigation lists should type their `path` fields as `RouteHref` to prevent loose strings.

### Validation Checklist

#### BackEnd
✅ All endpoints use async/await patterns
✅ Pydantic models with field descriptions and examples for schema generation
✅ Response models specified in FastAPI decorators (`response_model=`)
✅ OpenAPI tags for endpoint organization
✅ ConSys models for MongoDB operations
✅ Structured logging with loguru
✅ Type hints on all functions and variables
✅ Error handling with proper HTTP status codes
✅ Tests cover all critical paths
✅ No sensitive data in logs
✅ Generate TypeScript schemas after API changes (`npm run generate-schemas`)

#### FrontEnd
✅ All text uses i18n keys (no hardcoded strings)
✅ Interactive elements have icons + cursor-pointer + hover states
✅ ALL icons imported from `@/shared/ui/icons` - no direct react-icons imports
✅ Icons follow priority: fa6 → bi → hi (no inline SVG and Emoji)
✅ Dates use standardized format (%dd.%mm.%YYYY)
✅ Components work in light & dark themes
✅ Consistent border-radius (.75rem vs 1rem)
✅ No border classes used (shadows/backgrounds only)
✅ FSD architecture with correct import layers
✅ TypeScript strict mode compliance
✅ Use generated TypeScript schemas from `@/generated/api/schemas`
✅ No hardcoded API types - import from generated schemas
✅ Responsive design with Tailwind CSS
✅ Redux Toolkit for state management
✅ Error handling with toast notifications
✅ Run `npm run build` to validate FSD structure
✅ Run `npm run lint` for code quality

### Testing
#### Local
- **Frontend Access**: Web App available at `http://localhost/` and **API Access**: Backend API available at `http://localhost/api/` when containers are running (using `infra/nginx` in `server` service in `compose.local.yml`)

## DevOps Principles
- Make (Makefile)
    - all main commands are stored here
- NGINX (infra/nginx/)
    - use http://localhost/ for local frontend test and http://localhost/api/ for local api requests (managed by compose.local.yml)
    - prod WebApp embed: ensure CSP `frame-ancestors` allows Telegram Web (`web.telegram.org`, `*.telegram.org`, `t.me`) and strip upstream CSP/X-Frame-Options in proxy
- Docker & Docker Compose & Docker Swarm (infra/compose/)
    - all compose files are overwrites of the base `infra/compose.yml` (for example of run: `docker compose -f compose.yml -f compose.local.yml`)

## Backend Principles
- **Database**: MongoDB with custom ConSys library for ODM
- API-first and POST-only JSON (Stripe/Twitter style). Endpoints are JSON-RPC-ish: POST body carries action payload; responses have consistent success/error envelopes; avoid form/multipart unless required.
- **Real async**: async/await end-to-end with non-blocking clients; try/catch with domain error mapping; avoid blocking I/O.
- Keep it lean: no unnecessary wrappers, deep inheritance, or extra deps; keep schemas/models near routes.
- **Typing**: prefer modern PEP syntax (for example: `T | None`, `list[str]`, `dict[str, Any]` over legacy `Optional`/`List`/`Dict`).
- **API Documentation**: OpenAPI/Swagger auto-generated; Contracts: Swagger/OpenAPI is source of truth; define Pydantic request/response schemas; auto-generate TS types + client (e.g., `openapi-typescript` + `openapi-fetch`) so drift fails lint/build.
- **Custom libs**: `consys` ORM (`docs/packages/consys.md`), `libdev` helpers (`docs/packages/libdev.md`), `userhub` (auth, `docs/packages/userhub.md`), `tgio` (Telegram helpers, `docs/packages/tgio.md`), `tgreports` (reporting, `docs/packages/tgreports.md`). Check docs/README before changes.
- **Authentication**: JWT tokens with FastAPI security
- **Caching**: Redis for session storage and caching
- **Logging & alerts**: Structured loguru logging; Telegram alerts/reporting via `tgreports` — follow `docs/packages/tgreports.md`.
- **Testing**: pytest with async test support
- **Background Tasks**: Celery with Redis broker
- **Auth/Session flow (FE+BE)**:
    - **Guest bootstrap**: On first client load `SessionInitializer` generates a client token (UUID/random), calls `/users/token/` with network=`web`, utm + browser tz/langs, receives JWT. Tokens persist in `localStorage` as `sessionToken` (client) and `authToken` (JWT). API client automatically adds `Authorization: Bearer <authToken>`.
    - **JWT contents**: encodes `token` (session id), `user` (id or 0), `status` (rights), `network` (provider id). Backend `AccessMiddleware` validates JWT and sets `request.state.token|user|status|network` for all routes.
    - **Rights/status**: Status codes follow UserHub (0 deleted, 1 blocked, 2 unauthorized, 3 authorized, 4+ elevated incl. moderators/admins up to 8 owner). Whitelist in `AccessMiddleware` allows public POSTs (token creation, content fetch/save as configured); others require valid JWT.
    - **User storage (BE)**: Users and tokens live in core UserHub (`userhub` lib), plus project-local overlay `UserLocal` (`api/app/models/user.py`) for per-project fields (balance, premium, mailing, wallet, locale, referrer/frens, utm, tasks/social cache). Creation/auth flows go through `routes/users/auth.py`, `routes/users/token.py`, `routes/users/social.py`, `routes/users/app/tg.py` using `userhub.auth/token`; `UserLocal` is created/updated during auth (on referral/locale changes). See `docs/packages/userhub.md` for contract, validation, and status meanings. Local users are fetched in routes via `UserLocal.get(request.state.user)` to apply project-specific data/roles.
    - **Login**: FE dispatches `loginWithCredentials` → `/users/auth/` with login/password/utm, stores returned JWT in `authToken`, updates Redux `auth` slice with user profile. API requests immediately use new JWT.
    - **Telegram Mini App auto-auth**: `TelegramAuthInitializer` checks `window.Telegram.WebApp.initData` + user; if present and user not set, calls `/users/app/tg/` with `initData` + utm to auth/link Telegram session and rotate JWT.
    - **VK Mini App auto-auth**: `VkAuthInitializer` checks `vk_user_id` in URL params; if present and user not set, calls `/users/app/vk/` with `window.location.href` + utm to auth/link VK session and rotate JWT. `VkBridgeInitializer` calls `VKWebAppInit` via VK Bridge when running in VK.
    - **MAX Mini App auto-auth**: `MaxAuthInitializer` checks `window.WebApp.initData`; if present and user not set, calls `/users/app/max/` with `initData` + utm to auth/link MAX session and rotate JWT.
    - **Social callback**: External providers (Google/Telegram/etc.) redirect to `/[locale]/callback` with `code`; page infers provider, calls `/users/social/` with `code` + utm, stores JWT/user, and redirects to previous path or profile.
    - **Logout**: FE `logout` thunk hits `/users/exit/`, clears `authToken`, resets auth slice, and re-runs guest token bootstrap.
    - **API signing**: All FE API requests flow through `apiClient` which reads `authToken` from storage, sets `Authorization`, and uses global error handling/toasts.
    - **Head scripts for TMA**: Locale layout loads Telegram WebApp script `beforeInteractive` plus `eruda` (dev) for Mini App debugging.

## Frontend Principles
- TypeScript
- Tailwind CSS + Radix UI (shadcn/ui)
- Redux Toolkit
- Next.JS + SEO
- **Layer Placement**: Basic UI → `shared/ui/`, Complex compositions → `widgets/`, Feature-specific → `features/*/ui/`
- **FSD Import Rules**: **Higher layers can import from lower layers only**:
    - `app/` → `widgets/`, `features/`, `entities/`, `shared/`
    - `widgets/` → `features/`, `entities/`, `shared/`
    - `features/` → `entities/`, `shared/`
    - `entities/` → `shared/` only
    - `shared/` → no internal dependencies
- **Adaptive**: Mobile-first; build single adaptive components instead of breakpoint forks. Honor theme tokens and reuse Radix primitives.
- **Themes**: system (default) / light / dark; components should honor tokens.
- Path alias `@/*` → `web/src/*`. Strict TS; PascalCase components; hooks as `useThing`; slices in `features/*/stores/*Slice.ts`. Keep barrels small.
- **Use toasts / popups for feedback**: errors/warnings/success/info should use app toasts/dialogs, not `alert()` or raw text
- **Icons**: Centralized icon management: ALL icons MUST be imported from `shared/ui/icons.tsx` file, never directly from `react-icons`; React-icons priority system**: use `react-icons` with priority order: 1. `fa6` (Font Awesome 6), 2. `bi` (Bootstrap Icons), 3. `hi` (Heroicons). Never use inline SVG
- **Special symbols vs icons**: use Unicode symbols (©, ®, ™) as text characters, not icons with backgrounds
- **Accessibility first**: proper aria labels/roles, focus states, keyboard nav; no color-only affordances

### Frontend Coding Flow
- For any entity, cover the full pipeline if needed: create/update the DB model, expose/extend the route endpoint and typed API routes, ship the frontend client page, set access levels, and surface it in header sections, landing blocks, and the admin panel page.
- After finishing any feature, run lint and build, start the frontend, and recheck Docker console logs for new errors.

### Styling & Format
- Детальные правила со сниппетами: основы (`docs/components/foundations.md`), контейнеры/страницы (`docs/components/layout.md`), кнопки (`docs/components/buttons.md`), формы (`docs/components/forms.md`), списки (`docs/components/entity-lists.md`), фидбек (`docs/components/feedback.md`).

#### Theme
- **Theme-aware**: Support both light & dark themes via CSS variables/tokens

#### Borders
- **No borders**: Use shadows for big / outer elements, backgrounds for small/inner elements

#### Border Radius
- Small / inner elements: `rounded-[0.75rem]` (buttons, inputs, avatars, icons)
- Big / outer elements: `rounded-[1rem]` (boxes, containers, cards, sections)

#### Shadows
- Interactive shadows: Big/outer components use Card-style shadow with hover effects:
    - Shadow: `shadow-[0_0.25rem_1.5rem_rgba(0,0,0,0.12)]`
    - Transition: `transition-all duration-300 ease-[cubic-bezier(0,0,0.5,1)]`
    - Hover effect: `hover:scale-[1.01]` (subtle scale animation)

#### Time / Date
- Standardized Format: `%dd.%mm.%YYYY` (e.g., "01.01.2024") everywhere. No other date formats allowed

#### Icons
- **Interactive Elements (Buttons/Links)**: Icon color MUST match text color - no separate icon coloring. Use `IconButton` with `responsive={true}` for adaptive text hiding (below 1280px shows icons only, 1280px+ shows icons + text).
- **Standalone Icon Containers**: Independent icons (avatars, PageHeader, category icons) MUST use rounded square containers (`rounded-[0.75rem]`). Icon at full opacity, background at low opacity.
- **Default Icon Styling**: `bg-muted text-muted-foreground` for neutral/default standalone icons.
- **Colored Icon Pattern**: `bg-{color}-500/15 text-{color}-600 dark:bg-{color}-500/20 dark:text-{color}-400` for themed icons.
- **Opacity Standards**: Background opacity 15% (light) / 20% (dark), icon/text at full opacity for proper contrast.
- **Examples** (`web/src/shared/ui/icons.tsx`): Save <- `SaveIcon` <- `FaFloppyDisk`

#### Badges
- **Destructive badges**: Red/danger badges (e.g. `Badge` variant `destructive`) MUST render with white text (use `text-white`; avoid black text on red backgrounds).

#### Feedback (Toasts / Popups)
- Use `widgets/feedback-system` components for all user feedback.
- Map severities to variants: `success`, `error`, `warning`, `info`.
- Never use `window.alert()` for UX feedback.
- Import: `import { ToastProvider, useToast } from '@/widgets/feedback-system'`
- Success actions (create/save/delete) must show green success toasts; failures must show red error toasts. Use shared toast helpers (`useToastActions`) consistently.

#### Custom Components
- Полные правила и примеры по компонентам см. `docs/components/foundations.md`, `docs/components/layout.md`, `docs/components/buttons.md`, `docs/components/forms.md`, `docs/components/entity-lists.md`, `docs/components/feedback.md`.

##### Box containers
- Wrap ALL content in `Box` component from `@/shared/ui/box`
- Do NOT wrap card grids (PostCard/ProductCard or similar card lists) in an extra `Box` because cards already provide the boxed surface

##### PageHeader
- Use for ALL pages/sections with proper icon color system
- **Import**: `import { PageHeader } from '@/shared/ui/page-header'`
- **Universal Usage**: EVERY page, demo component, admin section, content area MUST use PageHeader
- **Placement Rule**: PageHeader MUST be in page body, NEVER inside Box components
- **Structure**: `<div>` → `<PageHeader />` → `<Box>content</Box>`
- **Never Nest**: ❌ `<Box><PageHeader /></Box>` - PageHeader should be outside and above Box
- **Icon**: Square colored container, `size={24}`, no border, `rounded-[0.75rem]`
- **Title**: SEO-optimized page title
- **Description**: Additional context/breadcrumbs
- **Actions**: Button groups on right side

##### Tables
- Wide tables must be wrapped in horizontal scroll containers (`overflow-x-auto` with sensible `min-width`) to avoid clipping on mobile; do not let columns overflow their parent.

##### Buttons
- **Import**: `import { Button } from '@/shared/ui/button'`, `import { IconButton } from '@/shared/ui/icon-button'`,  `import { ButtonGroup } from '@/shared/ui/button-group'`
- **IconButton Rule**: ALL buttons/links MUST start with icon, then localized text
- **Responsive Pattern**: Use `responsive={true}` for adaptive behavior (icon-only <1280px, icon+text ≥1280px)
- **Required**: `cursor-pointer` styling, clear hover/focus/active states
- **Icon Color**: Icon color MUST match text color - no separate icon coloring
- **Purpose ButtonGroup**: Group related buttons with shared borders and visual connection
- **Use Cases ButtonGroup**: Edit+Delete, Save+Cancel, Upvote+Downvote, action clusters
- **Colors**: Use semantic colors (red=delete, green=add, etc.)

##### **ThreeColumnLayout** - Flexible Grid System
- **Import**: `import { ThreeColumnLayout } from '@/widgets/three-column-layout'`
- **Adaptive**: Auto-adjusts based on provided sidebars
- **Sticky**: Sidebars use `sticky top-20` (80px offset for header)
- **Usage**: `leftSidebar={<>multiple widgets</>}` `rightSidebar={<>widgets</>}`

##### **SidebarCard** - Unified Sidebar Interface
- **Import**: `import { SidebarCard } from '@/shared/ui/sidebar-card'`
- **Rule**: ALL sidebar widgets MUST use SidebarCard for consistent styling
- **Header**: Optional `title` + `icon` props (icon size 20px)
- **Content Spacing**: `sm` (space-y-4), `default` (space-y-6), `lg` (space-y-8)
- **Never**: Manual `<div className="flex items-center gap-2">` headers

##### EntityManagement / EntityRow
- **Imports**: `import { EntityManagement, EntityRow } from '@/shared/ui/entity-management'`
- **Layout**: Always a single outer `Box` from EntityManagement; rows use full-width `EntityRow` with first line `#id + title + /url + badges`, second line dot-separated metadata.
- **Left slot**: Pass icons/images/expanders via `leftSlot`; do NOT add extra wrappers that break alignment.
- **Right actions**: Provide button groups via `rightActions`; alignment comes from EntityRow (no extra flex wrappers needed).
- **Second-row items**: Pass an array of objects `{ icon, keyLabel?, value }`; `EntityRow` renders them as pills with icon + value and shows `keyLabel` on hover (`title` attr). Keep values short; let EntityRow handle pill styling.
- **Reuse**: Products, posts, categories admin lists must reuse EntityRow instead of custom row markup.
- **Row chips**: Second-line metadata must use the unified chip pill (`inline-flex items-center gap-2 rounded-[0.75rem] bg-muted px-2 py-1`) with icons (mail/phone/globe/category/price/etc.) instead of plain text so list rows match the admin activity style.
  - Example:
    ```tsx
    secondRowItems={[
      { icon: <GlobeIcon size={12} />, keyLabel: t('fields.locale'), value: locale },
      { icon: <CategoriesIcon size={12} />, keyLabel: t('fields.category'), value: categoryTitle },
    ]}
    ```

##### Edit mode layout rule
- Component reuse: use the same form component for create/edit modes and the view variation for display/preview in those modes to avoid divergence.
- Post editing screens must follow the in-place layout: full-width title input (placeholder shows the field name), then a row with image upload on the left and locale + category pickers plus description on the right (picker labels inline with values), and a large WYSIWYG/text area beneath. Inputs should present labels inline with values as in the reference design.
- Picker/input styling: Selects/inputs used in edit mode must share the same muted background style as textareas/main inputs, without borders, and show a pointer cursor on hover.
- Picker font rule: Picker inputs must use the same font weight/size/color styling as other inputs and place the key label inline with the value; hover must show pointer.
- FileUpload usage: pass `fileData` with `type: 'image'` or provide an image URL in `value`; set `width=\"w-full h-full\"` when you need full-height containers alongside form columns.
- File uploads: On selecting an image, call `/upload/` via the API, use the returned URL in form state, and keep previews in sync for post and profile editors.
- Inline label rows: For compact inputs (e.g., category, price, login, phone), place the label text inside the input row (left prefix) with the same muted background as the input (bootstrap-style inline add-on, no alternate color), a subtle divider if needed, borderless controls, and pointer-only on interactive elements.
- **Form components (use these first)**:
  - Inputs/Textareas: `@/shared/ui/input`, `@/shared/ui/textarea`. Both use muted backgrounds (light/dark) and no borders/shadows; do not wrap with extra borders. Keep placeholders localized. For inline rows keep label + control in the same muted surface.
  - Icon keys (FontAwesome): `@/shared/ui/icon-key-input` — reuse this component (no per-feature duplicates), stores key-only values (e.g., `home`) and includes a browse link.
  - Selects/Pickers: `@/shared/ui/select` (Radix) with our trigger styling; avoid native `<select>` except inside `InlineSelect` wrappers that mirror the same muted background and custom chevron (as used in product form).
  - File uploads: `@/shared/ui/file-upload` for single image/avatar; `@/shared/ui/multi-file-upload` for multiple images (products, galleries). Always upload via `/upload/` and store returned URLs in form state.
  - Rich text: `@/shared/ui/editor` (CKEditor lazy-load wrapper) for WYSIWYG fields; keep placeholders/i18n and honor the light edit surface it applies.
  - Inline rows: follow the product/profile pattern—muted row, left label segment with divider, borderless controls, pointer cursor on interactive selects/toggles.
  - Copy/suffix actions: share/copy fields must be a single muted row with a read-only input and a right-side icon+label button (suffix) inside the same surface; no extra borders, keep cursor-pointer on the action.
  - Units: keep measurement units (%, kg, cm, etc.) as right-side suffixes inside the input row; do not mix units into the left labels.
  - Grouped fields: when fields are tightly related (e.g., name+surname, country+region+city), group them into a single inline row on desktop with shared muted background/dividers and stack vertically on mobile.
  - Toggles/checkboxes: prefer row-level click targets (as in product form) with 20px checkboxes, rounded corners, and full-row cursor-pointer/hover.



## Development Workflow
1. **Make plan of changing**: Explain the plan (brief)
2. **Update objects**: Define models + DB migrations.
3. **API Tests First**: Draft corner/edge-case backend tests (aim for 100% on models/routes/functions; add fixtures).
4. **Backend Implementation**: Implement routes/functions/scripts.
5. **Documentation**: Update docs and generate TS schemas.
6. **Frontend Implementation**: Build frontend components/pages; verify styling/locales/themes/access/mobile.
7. **Frontend Tests**: Add frontend tests.
8. **Run tests and linters**: Avoid extra layers unless justified.
9. **Frontend prod parity**: Before merging, rerun frontend lint/build and fix all prod build errors (typed routes, lint violations). Ensure `npm run build` (or CI web-check job) passes without errors.
10. **Local verification gate**: Always run `npm run lint` and `npm run build` (or `make lint-web`/`make lint-web-fix` + build) before handing off; if blocked by sandbox/network (e.g., Google Fonts fetch), report the failure reason explicitly in the summary and keep the TypeScript check clean.
- On any dependency change, regenerate lockfiles: backend via `uv lock --python 3.13` in `api/`; frontend by refreshing the JS lockfile (`npm install` in `web/` to update `package-lock.json`).

## Commands
- Frontend (`web/`): `npm install`; `npm run dev`; `npm run build`; `npm run start`; `npm run lint`.
- New lint helpers: `make lint-web` (check) and `make lint-web-fix` (auto-fix) run from repo root.
- Pre-commit hook: husky runs `npm --prefix web run lint:fix`; run `npm install` in `web/` (or `npm run prepare`) to ensure hooks are installed if missing.
- Stack (repo root): `make up` / `make up-dev` / `make down`; logs via `make logs-local`.
- Tests: `make test` for API + web in compose; `make test-api` or `make test-web` individually.

## Testing & QA
- API tests live in `api/tests` (pytest). Add alongside new routes/models; name `test_*`; share fixtures in `tests/conftest.py`; target high coverage.
- Frontend currently lint/manual; if adding tests, place under `web/src/**/__tests__` and wire into `make test-web`.
- Note skips/flakes in PRs.

## Git & PR Hygiene
- Commits: short, imperative (`Fix local API requests`). Branches: `feature/*`, `bugfix/*`. PRs: summary, linked issue, commands run, screenshots/GIFs for UI changes, and env/migration updates.

## Notes
- Frontend now auto-creates a guest session on client load via `SessionInitializer` (Redux-persisted `session` slice), calling `/users/token/` and storing tokens in `localStorage` keys `authToken` / `sessionToken`.
- Auth flow restored with modal chooser (email/Google/Telegram) using Redux `auth` slice and `/users/auth/`; logout hits `/users/exit/` then reinitializes guest session.
- Auth popups should place content directly in the popup (no extra Box wrappers that add inner shadows/backgrounds); keep buttons stacked and titles concise.
 - Product pricing now lives inside `options` (each option has `price`, `discount_type`/`discount_value`, `in_stock`, `rating`, `images`, and extra `features`/`attributes`); product-level `priceFrom/finalPriceFrom` aggregate the cheapest option; base specs stay in sorted `features` list with `{key, value, value_type}` items.
- Spaces: new `Space` model/routes `/spaces/get|save|rm` (link via `encrypt(id, 5)`), attachments stored in `UserLocal.spaces`, shared edit form at `/spaces/<link>` + admin list/selector.
