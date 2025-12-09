# Forms (inputs, selects, textareas)

- Use shared controls: `@/shared/ui/input`, `textarea`, `select`, `file-upload`, `multi-file-upload`, `editor`. Keep muted backgrounds, no borders, and allow clearing values (never force immediate fallbacks while typing). Select triggers must visually match inputs and stay pointer-only.
- Required fields: mark labels with `*`; highlight missing/invalid required fields with a red focus/outline when API returns validation errors.
- Numbers: hide steppers, block scroll-wheel changes, and support clearing. Add unit suffixes on the right side of inputs, not in labels.
- Inline rows: place the label text inside the same muted surface as the control with pointer-only on interactive parts.
- Uploads: call `/upload/` on selection, store the returned URL, and keep previews in sync. Provide `fileData={{ type: 'image' }}` or an image URL via `value`.
- Rich text: use `@/shared/ui/editor` with localized placeholders.
- Copy/suffix actions: keep read-only input and right-side icon+label action inside one muted row; ensure the action has `cursor-pointer`.
- Group related fields (e.g., name+surname, country/region/city) into a single inline row on desktop with shared background/dividers and stack vertically on mobile.
- Toggles/checkbox rows should be full-row click targets with 20px checkboxes and rounded corners.

Inline row with suffix + select:
```tsx
import { Input } from '@/shared/ui/input'
import { InlineSelect } from '@/shared/ui/select'
import { Box } from '@/shared/ui/box'

<Box className="space-y-4">
  <div className="flex items-center gap-3 rounded-[0.75rem] bg-muted px-3 py-2">
    <span className="text-sm text-muted-foreground">Price*</span>
    <Input
      type="number"
      inputMode="decimal"
      className="border-none bg-transparent focus-visible:ring-0"
      suffix="%"
      placeholder="0"
      required
    />
    <InlineSelect
      value="monthly"
      onValueChange={() => {}}
      options={[
        { label: 'Monthly', value: 'monthly' },
        { label: 'Yearly', value: 'yearly' },
      ]}
      className="cursor-pointer"
    />
  </div>
</Box>
```

File upload + editor:
```tsx
import { FileUpload } from '@/shared/ui/file-upload'
import { Editor } from '@/shared/ui/editor'

<div className="grid gap-4 md:grid-cols-2">
  <FileUpload
    fileData={{ type: 'image' }}
    value={imageUrl}
    onChange={setImageUrl}
    width="w-full h-full"
  />
  <Editor placeholder="Write content..." value={body} onChange={setBody} />
</div>
```
