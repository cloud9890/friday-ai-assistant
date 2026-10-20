## 2025-05-20 - Custom HUD Design System Focus & ARIA Patterns
**Learning:** High-tech custom HUD UIs with custom button components often rely purely on SVG icons or title attributes, missing ARIA labels and native browser focus indicators for keyboard navigation.
**Action:** Always audit icon-only control buttons for explicit `aria-label`s and provide styled `:focus-visible` outlines matching the HUD design system.
