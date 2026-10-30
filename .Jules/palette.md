## 2025-05-18 - Tactical HUD Icon-Only Button Accessibility & Keyboard Focus
**Learning:** High-tech sci-fi HUD themes with custom border and glow effects often lack native outline visibility and screen-reader accessibility on icon-only control buttons and input fields.
**Action:** Always complement dark sci-fi themes with explicit `:focus-visible` outline rings using theme primary colors (`var(--cyan-primary)`), and ensure icon SVG elements are hidden from assistive technology (`aria-hidden="true"`) while providing descriptive `aria-label` attributes on container buttons and input controls.
