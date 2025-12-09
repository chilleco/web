# UI Foundations

- Surfaces: theme-aware backgrounds, no borders; outer cards use `shadow-[0_0.25rem_1.5rem_rgba(0,0,0,0.12)]` with `rounded-[1rem]`, inner controls/icons use `rounded-[0.75rem]`.
- Radii: outer containers 1rem, inner elements 0.75rem.
- Hover/active: every clickable block/link/picker/slider/button has `cursor-pointer` plus visible hover/focus/active states.
- Icons: import only from `@/shared/ui/icons` (priority `fa6` → `bi` → `hi`), never inline SVG; icon color matches text. Standalone icons sit in rounded squares (`bg-muted text-muted-foreground` or semantic `bg-{color}-500/15 text-{color}-600` with dark variants `dark:bg-{color}-500/20 dark:text-{color}-400`).
- Dates: always `dd.mm.yyyy`.
- Dialogs/popups: constrain height for small screens and set `overflow-y-auto` so content scrolls without breaking layout.
