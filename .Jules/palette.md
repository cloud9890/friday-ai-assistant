# Palette's Journal - Critical UX & Accessibility Learnings

## 2025-05-18 - Header Control Buttons & Form Inputs ARIA Accessibility
**Learning:** Icon-only buttons in HUD header navigation and un-labelled form inputs for directives lack explicit `aria-label` attributes or `aria-labelledby` linkages, making them unannounced or unclear for screen reader users.
**Action:** Always ensure header control icon buttons specify `aria-label` matching their `title` attribute, and form inputs specify `aria-label` when inline visual labels are absent.
