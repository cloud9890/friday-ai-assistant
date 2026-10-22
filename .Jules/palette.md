## 2025-05-18 - Icon-Only Header Control Accessibility
**Learning:** Icon-only control buttons in custom HUD header layouts lack default screen reader labels if only `title` attributes or embedded SVGs are used without `aria-label`.
**Action:** Always provide explicit `aria-label` attributes alongside `title` on icon-only header buttons to ensure screen readers announce action purpose clearly.
