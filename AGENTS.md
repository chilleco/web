# Repository Guidelines

## Project Overview
Full-stack web application with Python FastAPI backend, Next.js frontend, and Telegram bot. The application uses Docker containers for deployment.

## Architecture & Structure
- Services: `api/` FastAPI backend; `web/` Next.js 15 + TypeScript (dirs: `src/app`, `entities`, `features`, `widgets`, `shared`, `i18n`, `styles`); `tg/` Telegram worker; `infra/` Docker Compose; `data/` runtime storage.
- Localization: bundles in `web/messages/*.json`; per-locale routing under `web/src/app/[locale]/**`. All user-facing text must use locale files.

## Environments
- `.env` defines `MODE`: LOCAL / TEST / DEV / PRE / PROD; loaded in `api/`, `web/`, and `tg/` containers. Copy `base.env` → `.env`; merge `prod.env` values for production.

## Golden Rules of coding & editing
- **Explain the plan** (brief): research, make strategy and all steps of changing. compliance with the rules of the repository and the specifics of custom libraries and components
- **Development**: Follow the **DevOps Principles** & **Backend Principles** & **Frontend Principles**
- **Minimal, focused diffs**: change only what's necessary; Make minimal changes in relevant files & rows only
- **Cursor pointer everywhere**: All clickable elements/blocks/links/pickers/sliders must explicitly set `cursor-pointer` for clear affordance
- **No duplicate API calls**: guard client-side fetch effects with stable fetch keys/in-flight refs so Strict Mode doesn’t trigger the same request multiple times (one request per dataset)
- **Documentation**: Write documentation directly in code files as comments and docstrings, not as separated files (No new .md files to describe logic, usage, or implementation details; No example .json files to show data structures or logging formats)
- Add relevant information to this AGENTS.md file; Update the main README.md if necessary
- **Reuse cards/items**: Always reuse existing card/item components for repeated contexts (landing listings, related/recommended blocks, similar products, etc.)—e.g., use the shared PostCard for any post teasers (landing, related posts) and the shared product card for similar products instead of creating new variants.
- **Follow FSD Architecture**: respect Feature-Sliced Design layers and import rules
- **Never hard-code secrets** or credentials; never read or write `.env`, `secrets/`, or CI secrets
- **Ask before destructive or external actions** (network, DB migrations, Docker, `git push`, etc.)
- **Files & Paths Not To Touch**: `.env*`, `secrets/**`.
- **Common i18n**: Reuse common system translations for generic actions (Add, Save, Update, Edit, Delete/Remove, Cancel, etc.) instead of creating duplicated or feature-scoped keys.
- Common choices (Yes/No and similar simple words) must use the shared `system` locale keys (`system.yes`, `system.no`) instead of feature-scoped duplicates.
- **API routing objects**: When calling backend routes, use the existing typed API helpers and common endpoints (`/posts/get|save|rm`, `/categories/get|save|rm`, `/products/get|save|rm`, etc.) instead of ad-hoc URLs or duplicated schemas.

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
- Docker & Docker Compose & Docker Swarm (infra/compose/)
    - all compose files are overwrites of the base `infra/compose.yml` (for example of run: `docker compose -f compose.yml -f compose.local.yml`)

## Backend Principles
- **Database**: MongoDB with custom ConSys library for ODM
- API-first and POST-only JSON (Stripe/Twitter style). Endpoints are JSON-RPC-ish: POST body carries action payload; responses have consistent success/error envelopes; avoid form/multipart unless required.
- **Real async**: async/await end-to-end with non-blocking clients; try/catch with domain error mapping; avoid blocking I/O.
- Keep it lean: no unnecessary wrappers, deep inheritance, or extra deps; keep schemas/models near routes.
- **Typing**: prefer modern PEP syntax (for example: `T | None`, `list[str]`, `dict[str, Any]` over legacy `Optional`/`List`/`Dict`).
- **API Documentation**: OpenAPI/Swagger auto-generated; Contracts: Swagger/OpenAPI is source of truth; define Pydantic request/response schemas; auto-generate TS types + client (e.g., `openapi-typescript` + `openapi-fetch`) so drift fails lint/build.
- **Custom libs**: `consys` ORM (`docs/CONSYS_ORM_DOCUMENTATION.md`), `libdev` helpers (`docs/LIBDEV_DOCUMENTATION.md`), `userhub` (auth), `tgio` (Telegram helpers), `tgreports` (reporting). Check docs/README before changes.
- **Authentication**: JWT tokens with FastAPI security
- **Caching**: Redis for session storage and caching
- **Logging & alerts**: Structured loguru logging; Telegram alerts/reporting via `tgreports` — follow `docs/TGREPORTS_GUIDE.md`.
- **Testing**: pytest with async test support
- **Background Tasks**: Celery with Redis broker
- **Auth/Session flow (FE+BE)**:
    - **Guest bootstrap**: On first client load `SessionInitializer` generates a client token (UUID/random), calls `/users/token/` with network=`web`, utm + browser tz/langs, receives JWT. Tokens persist in `localStorage` as `sessionToken` (client) and `authToken` (JWT). API client automatically adds `Authorization: Bearer <authToken>`.
    - **JWT contents**: encodes `token` (session id), `user` (id or 0), `status` (rights), `network` (provider id). Backend `AccessMiddleware` validates JWT and sets `request.state.token|user|status|network` for all routes.
    - **Rights/status**: Status codes follow UserHub (0 deleted, 1 blocked, 2 unauthorized, 3 authorized, 4+ elevated incl. moderators/admins up to 8 owner). Whitelist in `AccessMiddleware` allows public POSTs (token creation, content fetch/save as configured); others require valid JWT.
    - **User storage (BE)**: Users and tokens live in core UserHub (`userhub` lib), plus project-local overlay `UserLocal` (`api/app/models/user.py`) for per-project fields (balance, premium, mailing, wallet, locale, referrer/frens, utm, tasks/social cache). Creation/auth flows go through `routes/users/auth.py`, `routes/users/token.py`, `routes/users/social.py`, `routes/users/app/tg.py` using `userhub.auth/token`; `UserLocal` is created/updated during auth (on referral/locale changes). See `docs/USERHUB_DOC.md` for contract, validation, and status meanings. Local users are fetched in routes via `UserLocal.get(request.state.user)` to apply project-specific data/roles.
    - **Login**: FE dispatches `loginWithCredentials` → `/users/auth/` with login/password/utm, stores returned JWT in `authToken`, updates Redux `auth` slice with user profile. API requests immediately use new JWT.
    - **Telegram Mini App auto-auth**: `TelegramAuthInitializer` checks `window.Telegram.WebApp.initData` + user; if present and user not set, calls `/users/app/tg/` with `initData` + utm to auth/link Telegram session and rotate JWT.
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

### Styling & Format

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

#### Feedback (Toasts / Popups)
- Use `widgets/feedback-system` components for all user feedback.
- Map severities to variants: `success`, `error`, `warning`, `info`.
- Never use `window.alert()` for UX feedback.
- Import: `import { ToastProvider, useToast } from '@/widgets/feedback-system'`
- Success actions (create/save/delete) must show green success toasts; failures must show red error toasts. Use shared toast helpers (`useToastActions`) consistently.

#### Custom Components

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
- **Second-row items**: Pass an array of React nodes/strings; they auto-join with dots (same pattern as categories admin).
- **Reuse**: Products, posts, categories admin lists must reuse EntityRow instead of custom row markup.

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
  - Selects/Pickers: `@/shared/ui/select` (Radix) with our trigger styling; avoid native `<select>` except inside `InlineSelect` wrappers that mirror the same muted background and custom chevron (as used in product form).
  - File uploads: `@/shared/ui/file-upload` for single image/avatar; `@/shared/ui/multi-file-upload` for multiple images (products, galleries). Always upload via `/upload/` and store returned URLs in form state.
  - Rich text: `@/shared/ui/editor` (CKEditor lazy-load wrapper) for WYSIWYG fields; keep placeholders/i18n and honor the light edit surface it applies.
  - Inline rows: follow the product/profile pattern—muted row, left label segment with divider, borderless controls, pointer cursor on interactive selects/toggles.
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

## Notes
- Frontend now auto-creates a guest session on client load via `SessionInitializer` (Redux-persisted `session` slice), calling `/users/token/` and storing tokens in `localStorage` keys `authToken` / `sessionToken`.
- Auth flow restored with modal chooser (email/Google/Telegram) using Redux `auth` slice and `/users/auth/`; logout hits `/users/exit/` then reinitializes guest session.
- Auth popups should place content directly in the popup (no extra Box wrappers that add inner shadows/backgrounds); keep buttons stacked and titles concise.
 - Product pricing now lives inside `options` (each option has `price`, `discount_type`/`discount_value`, `in_stock`, `rating`, `images`, and extra `features`/`attributes`); product-level `priceFrom/finalPriceFrom` aggregate the cheapest option; base specs stay in sorted `features` list with `{key, value, value_type}` items.
