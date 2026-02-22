# UI Design System

This document is the single reference for the project UI style and component composition.

Source of truth used for this spec:
- `docs/ui.pdf` (visual framework board)
- `web/src/app/globals.css` (theme tokens, shadows, base CSS)
- `web/src/shared/ui/*` (base primitives)
- `web/src/widgets/*` (complex compositions)
- `docs/components/*.md` (existing usage rules)

## 1) Visual Style Type

- Style direction: minimalist universal framework.
- Surface style: soft-flat (muted backgrounds + shadows), low visual noise.
- Main surfaces: rounded cards/boxes, mostly borderless.
- Interaction style: all interactive elements must look clickable and use `cursor-pointer`.
- Visual hierarchy: icon + title + supporting text first, actions second.
- Content density: compact controls, medium spacing between blocks.
- Color behavior: semantic roles over arbitrary colors (`primary`, `muted`, `destructive`, etc.).

## 2) Theme & Color System

### 2.1 Theme modes

- Supported modes: `system` (default), `light`, `dark`.
- Theme is resolved at runtime and applied globally.
- All components must work in light and dark without custom one-off overrides.

### 2.2 Core semantic tokens

Primary token groups:
- Base: `--background`, `--foreground`
- Surfaces: `--card`, `--card-foreground`, `--popover`, `--popover-foreground`
- Brand/action: `--primary`, `--primary-foreground`
- Secondary: `--secondary`, `--secondary-foreground`
- Minor text/surface: `--muted`, `--muted-foreground`
- Accent: `--accent`, `--accent-foreground`
- Error: `--destructive`, `--destructive-foreground`
- Utility: `--border`, `--input`, `--ring`
- Sidebar: `--sidebar-*`

### 2.3 State palette mapping (required)

- `default`: neutral surfaces and text (`background`, `card`, `foreground`).
- `accent`: contextual emphasis (`accent`, `accent-foreground`).
- `important`: primary emphasis (`primary`, `primary-foreground`) for key actions.
- `success`: completion/positive actions (green variants, success toasts, success badges/buttons).
- `warning`: caution states (yellow/orange variants).
- `error`: failures and destructive actions (`destructive`, red palette).
- `minor`: supportive/secondary info (`muted`, `muted-foreground`).
- `info`: neutral informative states (blue variants).

### 2.4 Extra project base colors

Defined utility colors:
- Blue: `--bg-blue`, `--font-blue`
- Green: `--bg-green`, `--font-green`, `--btn-green`, `--btn-hover-green`
- Red: `--bg-red`, `--font-red`, `--btn-red`, `--btn-red-hover`
- Orange: `--bg-orange`, `--font-orange`, `--btn-orange`, `--btn-hover-orange`
- Yellow: `--bg-yellow`, `--font-yellow`, `--btn-yellow`, `--btn-hover-yellow`

### 2.5 Toast semantic colors

- Success: `--toast-success`, `--toast-success-foreground`
- Warning: `--toast-warning`, `--toast-warning-foreground`
- Error: `--toast-error`, `--toast-error-foreground`
- Info/loading: `--toast-info`, `--toast-info-foreground`

`feedback-toast` rules:
- Rounded `0.75rem`
- Shadow box style
- Semantic background mixing via `color-mix`
- Clickable (`cursor-pointer`)

## 3) Geometry, Sizes, and Spacing

### 3.1 Radius system

- Base token: `--radius: 0.625rem` (tailwind token source).
- Outer containers/cards/sections: `rounded-[1rem]`.
- Inner controls/icons/buttons/chips: `rounded-[0.75rem]`.
- Full-round only for specific circular controls (e.g., image slider dots/arrows).

### 3.2 Shadows

- Standard card shadow:
  - Light: `0 0.25rem 1.5rem rgba(0,0,0,0.12)`
  - Dark: `0 0.25rem 1.5rem rgba(0,0,0,0.25)`
- Utility class: `shadow-box`.

### 3.3 Motion

- Card hover transition: `all 300ms cubic-bezier(0,0,0.5,1)`.
- Hover scale for interactive cards/groups: `hover:scale-[1.01]`.
- Dropdown/popover/dialog open/close: fade + zoom + directional slide.

### 3.4 Component heights and paddings

- Button/IconButton:
  - `sm`: `h-8`
  - `default`: `h-9`
  - `lg`: `h-10`
  - `icon`: `size-9`
- Input: `h-9`, `px-3`.
- Select trigger: `h-10`, `px-3`.
- Search container:
  - `sm`: `h-[2.5rem]`
  - `default`: `h-[3.5rem]`
  - `lg`: `h-[4rem]`
- Box paddings:
  - `sm`: `p-3`
  - `default`: `p-4`
  - `lg`: `p-6`
- PageHeader icon container:
  - `sm`: `40x40`
  - `default`: `48x48`
  - `lg`: `56x56`

### 3.5 Borders policy

- Default: avoid visible borders on major surfaces.
- Allowed exceptions:
  - Functional separators (input groups, headers, section dividers).
  - Dashed upload dropzones.
  - Focus rings and validation rings.

## 4) Typography, Icons, and Text Rules

- Typography: use app theme fonts (`Geist` / `Geist Mono` via variables).
- Dates: always `dd.mm.yyyy`.
- Icons:
  - Import only from `@/shared/ui/icons`.
  - No inline SVG.
  - Icon color should match text color in interactive elements.
- Standalone icon containers:
  - Rounded square (`0.75rem`)
  - Neutral: `bg-muted text-muted-foreground`
  - Semantic: `bg-{color}-500/15 text-{color}-600` (+dark variants)

## 5) Layout & Shell Rules

### 5.1 App shell

- Non-app clients: show `Header` + page content + `Footer`.
- App clients (`isApp`): hide `Header`/`Footer`, show `MobileBottomBar` on all widths.

### 5.2 Page skeleton

Standard page order:
1. `PageHeader` (outside any `Box`)
2. `Box`/layout container(s)
3. Content blocks (cards, forms, lists, etc.)

Never nest `PageHeader` inside `Box`.

### 5.3 Grid layout

- `ThreeColumnLayout`:
  - left sidebar: `lg:col-span-3`
  - main: `lg:col-span-6` or `9` or `12` depending on sidebars
  - right sidebar: `lg:col-span-3`
- Sidebars can be sticky (`top-20`).
- Wide content (tables/lists) must have horizontal scroll wrappers on small screens.

## 6) Base Components (Primitives)

### 6.1 Box

- Purpose: universal surface wrapper.
- Base style: `bg-card`, `text-card-foreground`, `shadow-box`, `rounded-[1rem]`.
- Variants:
  - `default`, `muted`, `accent`
  - `sm/default/lg` for spacing

### 6.2 Buttons

- Components: `Button`, `IconButton`, `ButtonGroup`.
- Variants:
  - `default`, `secondary`, `outline`, `ghost`, `link`, `destructive`
  - `IconButton` also supports `success`, `warning`, `info`
- Rule: clickable controls must explicitly expose pointer affordance.
- Responsive icon-button mode: label hidden below `xl`, icon always visible.

### 6.3 Inputs & forms

- Components: `Input`, `Textarea`, `Select`, `Label`.
- Input behavior:
  - Number steppers hidden.
  - Mouse wheel cannot increment numbers.
  - Controlled/uncontrolled stability preserved.
  - Values can be cleared (no forced fallback while typing).
- Validation:
  - Required fields marked with `*`.
  - Invalid fields use red ring (`aria-invalid` styling).
- Suffix/units:
  - Unit appears on right side of input group, not in label text.

### 6.4 Select / dropdown / popover

- Rounded trigger/content (`0.75rem`).
- Popups have max-height and internal scroll.
- Menu items are compact, keyboard-friendly, with clear active/focus states.

### 6.5 Dialog / sheet / popup

- Dialog surface: centered rounded `1rem`, shadowed.
- Overlay: dimmed background.
- Close button and close overlay area are clickable.
- Large modal content must support internal vertical scrolling on small screens.

### 6.6 Cards

`Card` anatomy (base order):
1. Image area (`ImageSlider`) optional
2. Filters row (top metadata)
3. Title
4. Description
5. Tags row
6. Pricing block
7. Custom content
8. Metadata row
9. Actions row

Card traits:
- `rounded-[1rem]`, `shadow-box`, hover scale transition.
- Link/card/button wrappers preserve keyboard behavior.

### 6.7 File upload

- Components: `FileUpload`, `MultiFileUpload`.
- Supports drag-and-drop, previews, file type filtering, max size hints.
- Upload areas are rounded, dashed-border dropzones with hover states.

### 6.8 Sliders & calendars

- `RangeSlider`: dual-thumb support, optional control points + labels.
- `DateCalendar`: range selection with month nav and DD.MM.YYYY rendering.

### 6.9 Badges & alerts

- Badge variants: `default`, `secondary`, `destructive`, `success`, `outline`.
- Destructive badge text must remain white.
- Alert variants: `default`, `destructive`, `warning`, `success`.

### 6.10 Links, chips, entity rows

- Links: muted by default, stronger on hover; underline style for breadcrumb/URL-like links.
- Filter chips: rounded small muted pills with remove action.
- Entity rows: `leftSlot + main content + rightActions`, optional second-line metadata chips.

### 6.11 Table pattern

From `ui.pdf` framework sections:
- Use simple readable tables with compact numeric columns and right-aligned actions.
- Header uses minor/uppercase style, body rows are clean with subtle hover.
- Wrap in horizontal scroll container on mobile.
- Keep table inside `Box` unless specialized card-grid context.

## 7) Complex Components

### 7.1 PageHeader (block title system)

Contains:
- Left: icon square + title + secondary text/breadcrumbs
- Right: action group/buttons

Order:
1. Icon container
2. Title
3. Description/breadcrumb text
4. Actions cluster

### 7.2 Header (desktop/mobile)

Desktop order:
1. Logo
2. Navigation
3. Search input
4. Theme/language/profile controls

Mobile order:
1. Menu toggle
2. Expandable panel with search, nav actions, profile/settings controls

### 7.3 MobileBottomBar

- Used only in app shells.
- Rounded floating bar with icon+label nav items.
- Active item uses primary text color.

### 7.4 Search component

Unified group order:
1. Main input (left, flexible)
2. Inline filter controls (optional)
3. Popup filter trigger (optional)
4. More filters trigger (optional)
5. Search action button (optional)

Supports modes:
- `simple`
- `inline-filters`
- `popup-filters`

### 7.5 FiltersSidebar

Section order:
1. Categories tree
2. Date range with popup calendar and quick presets
3. Price range (`Input + Input + RangeSlider`)
4. Rating buttons
5. Clear filters action group

Uses `SidebarCard` wrapper and uppercase muted section labels.

### 7.6 PostCard and ProductCard

- Both are compositions over base `Card`.
- `PostCard`: category/views/date filters + author metadata.
- `ProductCard`: category/rating filters + semantic tags + price/basePrice + CTA action.

### 7.7 Footer

Multi-column structure:
1. Brand and rights
2. Legal links
3. Company links
4. Support/help links
5. Social and controls

Uses icon-first rows, semantic icon color pills, and compact link stacks.

## 8) Composition Contracts (Contains / Order / Connections)

### 8.1 Title blocks

- Block title = `icon + title + (secondary text OR breadcrumbs)` with optional right-side button group.

### 8.2 Action groups

- Related actions are grouped with `ButtonGroup`.
- Primary action first, destructive action last.

### 8.3 Input + label + action rows

- Keep label and field in one muted rounded row when semantically linked.
- Right-side action (copy/open/search/apply) lives inside the same row.
- Group related fields together on desktop and stack on mobile.

### 8.4 Card feeds

- Grid/list should reuse shared card components (`PostCard`, `ProductCard`, base `Card`).
- Do not add extra outer boxes around card grids.

### 8.5 Feedback contract

- Use one toast/dialog event per operation state.
- Severity mapping:
  - success -> green
  - error -> red
  - warning -> yellow/orange
  - info/loading -> blue

## 9) Interaction & Accessibility Rules

- Every clickable UI element uses `cursor-pointer`.
- Keyboard support for button-like surfaces (`Enter`/`Space`).
- Focus-visible rings for interactive controls.
- No color-only communication; icon/text labels required.
- Popup close affordance must be visible and accessible (`sr-only` labels where needed).

## 10) Responsive Rules

- Mobile-first behavior is mandatory.
- Forms stack on small widths, align inline on larger widths.
- Card grids collapse naturally by breakpoints.
- Wide data structures (tables, long rows) must scroll horizontally.
- Dialogs/popups must fit viewport with max height + internal scroll.

## 11) UI Framework Coverage from `ui.pdf`

The visual board includes these canonical building blocks and they must remain stylistically aligned:
- top navigation
- hero/intro + service metrics/features
- category/filter chips
- ranking/data table block
- search + segmented filter controls
- content list/cards
- calculator/step-like control group
- long-form text/article content
- form inputs (name/phone/address/etc.)
- filter panels (checkbox/radio/toggle)
- question/answer selection block
- calendar/date selection
- pagination and previous/next controls
- compact data cards
- footer with channel/social links

Use this document and component implementations together; if style conflicts appear, code-level component tokens in `web/src/shared/ui/*` and `web/src/app/globals.css` are authoritative.
