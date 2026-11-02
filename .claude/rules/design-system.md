---
paths:
  - "app/**/*.tsx"
  - "components/**"
  - "tailwind.config.js"
---

# Design system

- Brand colors (`tailwind.config.js`): rb-dark #2D3436, rb-gray #4A5568, rb-blue #4A6A7C (light #E8EEF2, hover #3A5A6C, dark #2E4754), rb-purple #B8A9C9 (light #E8E4F0) — all WCAG AA
- Semantic type scale via `components/ui/Typography.tsx` and heading CSS classes
- Class-based dark mode (ThemeProvider/ThemeToggle); dim greys bumped to gray-300 for legibility
- Button hierarchy: primary = solid rb-blue, secondary = light outline, destructive = red
- `prefers-reduced-motion` respected globally; 44px touch targets; skip link; crisis button always visible
- PWA: installable, standalone, start_url /dashboard; iOS needs Add to Home Screen before enabling push
