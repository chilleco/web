# Entity Lists

- Use `EntityManagement` and `EntityRow` for admin/management tables. Do not build custom row markup.
- Provide `leftSlot` for icons/images/expanders; avoid extra wrappers that break alignment.
- Pass metadata as an array for automatic dot separators; primary line should include `#id`, title, URL, and badges where relevant.
- Supply `rightActions` with `ButtonGroup`/`IconButton` for aligned action clusters.

Example:
```tsx
import { EntityManagement, EntityRow } from '@/shared/ui/entity-management'
import { IconButton } from '@/shared/ui/icon-button'
import { FaPen, FaTrash } from '@/shared/ui/icons'

<EntityManagement>
  <EntityRow
    leftSlot={<div className="rounded-[0.75rem] bg-muted px-2 py-1">#12</div>}
    title="Example item"
    subtitle="/example"
    meta={['Draft', '12.01.2024']}
    rightActions={
      <div className="flex gap-2">
        <IconButton responsive icon={<FaPen />} className="cursor-pointer">
          Edit
        </IconButton>
        <IconButton
          responsive
          variant="destructive"
          icon={<FaTrash />}
          className="cursor-pointer"
        >
          Delete
        </IconButton>
      </div>
    }
  />
</EntityManagement>
```
