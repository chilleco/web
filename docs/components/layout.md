# Layout & Containers

- `PageHeader` is mandatory at the top of every page/section body (never inside `Box`). Structure: `<div>` → `<PageHeader />` → `<Box>content</Box>`. Use square colored icon containers and place actions on the right.
- `Box` wraps page content; do **not** wrap card grids that already provide a surface (PostCard/ProductCard, etc.).
- `ThreeColumnLayout` handles responsive grids; sidebars should use sticky widgets (`sticky top-20`) when present.
- `SidebarCard` is the only wrapper for sidebar widgets; pass `title`/`icon` props instead of custom headers.

Example:
```tsx
import { PageHeader } from '@/shared/ui/page-header'
import { Box } from '@/shared/ui/box'
import { SidebarCard } from '@/shared/ui/sidebar-card'
import { ThreeColumnLayout } from '@/widgets/three-column-layout'
import { FaInfo } from '@/shared/ui/icons'

export function ExamplePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        icon={<FaInfo size={24} />}
        title="Example title"
        description="Optional breadcrumbs or hint"
      />
      <ThreeColumnLayout
        rightSidebar={
          <SidebarCard title="Filters" icon={<FaInfo size={20} />} spacing="sm">
            <div className="text-sm text-muted-foreground">Sidebar content</div>
          </SidebarCard>
        }
      >
        <Box>Body content</Box>
      </ThreeColumnLayout>
    </div>
  )
}
```
