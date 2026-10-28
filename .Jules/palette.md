## 2025-05-18 - Accessibility for Icon-Only HUD Buttons
**Learning:** Icon-only controls with tooltips or simple characters (`+`, `×`, SVGs) lack default screen reader labels.
**Action:** Always provide explicit `aria-label` attributes on icon-only control elements and mark nested SVGs as `aria-hidden="true"`.
