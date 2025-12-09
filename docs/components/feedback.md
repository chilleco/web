# Feedback & Alerts

- Use `widgets/feedback-system` for all feedback; map severities to `success | error | warning | info`.
- Success actions (create/save/delete) must show green success toasts; failures show red error toasts. No `alert()`.
- Provide `ToastProvider` at the app root; use `useToastActions`/`useToast` in features.

Example:
```tsx
import { useToastActions } from '@/widgets/feedback-system'

const { showSuccess, showError } = useToastActions()
showSuccess({ title: 'Saved', description: 'Changes persisted' })
showError({ title: 'Failed', description: 'Please retry' })
```
