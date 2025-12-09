# Buttons & Actions

- Use `Button`, `IconButton`, and `ButtonGroup` from `@/shared/ui/*`; all buttons/links start with an icon, then localized text. Set `responsive={true}` to auto-hide text on narrow widths.
- Use semantic colors (red for destructive, green for add/save). Icons must share the same color as the label.
- Always include `cursor-pointer` and clear hover/focus/active states.

Example:
```tsx
import { ButtonGroup } from '@/shared/ui/button-group'
import { IconButton } from '@/shared/ui/icon-button'
import { FaFloppyDisk, FaTrash } from '@/shared/ui/icons'

<ButtonGroup>
  <IconButton
    responsive
    variant="success"
    icon={<FaFloppyDisk />}
    className="cursor-pointer"
  >
    Save
  </IconButton>
  <IconButton
    responsive
    variant="destructive"
    icon={<FaTrash />}
    className="cursor-pointer"
  >
    Delete
  </IconButton>
</ButtonGroup>
```
