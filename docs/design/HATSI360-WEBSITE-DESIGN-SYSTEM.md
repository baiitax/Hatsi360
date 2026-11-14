# Hatsi360 Design System

**Version:** 2.0  
**Last Updated:** 2026-11-14  
**Status:** Active Development

---

## 1. Overview

The Hatsi360 design system provides a unified visual language for the agricultural market intelligence platform. It supports two distinct environments:

- **Terminal Environment (Dark):** For traders, analysts, and data-intensive workflows
- **Editorial Environment (Light):** For research, reading, and marketing content

Both environments share the same foundational tokens but express them through different surface values.

---

## 2. Design Principles

1. **Data-First:** Every design decision serves data clarity and readability
2. **Honest Presentation:** Never mislead about data quality, freshness, or verification
3. **Accessibility:** WCAG 2.2 AA compliance across all components
4. **Consistency:** Same token, same meaning, everywhere
5. **Performance:** Minimal motion, fast interactions, efficient rendering

---

## 3. Color System

### 3.1 Brand Palette

| Token | Value | Usage |
|-------|-------|-------|
| `brand-50` | #f1f7f0 | Lightest surfaces |
| `brand-100` | #e1efe0 | Hover states |
| `brand-200` | #c2dec1 | Selected states |
| `brand-300` | #9bc798 | Disabled states |
| `brand-400` | #7cb277 | Secondary accents |
| `brand-500` | #2f8257 | Primary actions |
| `brand-600` | #26734b | Primary brand |
| `brand-700` | #174d35 | Dark emphasis |
| `brand-800` | #123b2a | Deep brand |
| `brand-900` | #0e2c1f | Darkest surfaces |
| `brand-950` | #071a12 | Terminal backgrounds |

### 3.2 Semantic Colors

| Token | Light Surface | Dark Surface | Purpose |
|-------|---------------|--------------|---------|
| `surface` | #ffffff | `terminal-surface-primary` | Card backgrounds |
| `background` | #f7f8f5 | `terminal-background` | Page backgrounds |
| `text-primary` | #202923 | `terminal-text-primary` | Primary text |
| `text-secondary` | #59665e | `terminal-text-secondary` | Secondary text |
| `text-muted` | #68756e | `terminal-text-muted` | Tertiary text |
| `border` | #e3e9e2 | `terminal-border` | Dividers |
| `border-strong` | #cbd5cd | `terminal-border-strong` | Active borders |

### 3.3 Status Colors

| Status | Token | Value | Usage |
|--------|-------|-------|-------|
| Success | `success-500` | #228b55 | Verified, approved |
| Success | `success-700` | #1c6e45 | Success actions |
| Warning | `warning-500` | #d69e2e | Pending, caution |
| Warning | `warning-700` | #8a6520 | Warning actions |
| Error | `error-500` | #c84b45 | Rejected, errors |
| Error | `error-700` | #a63e39 | Error actions |
| Info | `info-500` | #3478b8 | Informational |
| Info | `info-700` | #2c628f | Info actions |

### 3.4 Movement Colors

| Direction | Token | Value | Context |
|-----------|-------|-------|---------|
| Up | `move-up` | #2f8f57 | Positive movement |
| Up (soft) | `move-up-soft` | #14301f | Up badge background |
| Down | `move-down` | #d0584f | Negative movement |
| Down (soft) | `move-down-soft` | #331a18 | Down badge background |
| Flat | `move-flat` | #748278 | No movement |

---

## 4. Typography

### 4.1 Font Families

| Family | Variable | Fallbacks |
|--------|----------|-----------|
| Display | `--font-display` | Manrope, ui-sans-serif, system-ui |
| Sans | `--font-sans` | Inter, ui-sans-serif, system-ui |

### 4.2 Type Scale

| Role | Size | Line Height | Weight | Usage |
|------|------|-------------|--------|-------|
| Display | 2.5rem | 3rem | 700 | Page titles |
| H1 | 2rem | 2.5rem | 700 | Section titles |
| H2 | 1.5rem | 2rem | 700 | Subsections |
| H3 | 1.25rem | 1.75rem | 600 | Card titles |
| Body | 1rem | 1.5rem | 400 | Body text |
| Body Small | 0.875rem | 1.25rem | 400 | Secondary text |
| Caption | 0.75rem | 1rem | 500 | Labels, metadata |
| Micro | 0.625rem | 0.875rem | 600 | Table headers, badges |

### 4.3 Numeric Typography

| Role | Size | Line Height | Features | Usage |
|------|------|-------------|----------|-------|
| Figure | 0.9375rem | 1.375rem | tabular-nums | Prices, quantities |
| Figure Large | 1.25rem | 1.5rem | tabular-nums | KPI values |
| Figure XL | 1.75rem | 2rem | tabular-nums | Hero metrics |

**All numeric values use `font-variant-numeric: tabular-nums` to prevent reflow.**

---

## 5. Spacing

### 5.1 Spacing Scale

| Token | Value | Usage |
|-------|-------|-------|
| `space-1` | 0.25rem | Tight spacing |
| `space-2` | 0.5rem | Element spacing |
| `space-3` | 0.75rem | Component spacing |
| `space-4` | 1rem | Standard spacing |
| `space-6` | 1.5rem | Section spacing |
| `space-8` | 2rem | Large spacing |
| `space-12` | 3rem | Hero spacing |

### 5.2 Section Spacing

| Class | Mobile | Desktop | Usage |
|-------|--------|---------|-------|
| `section-compact` | 2rem | 3rem | Related content |
| `section` | 3rem | 4.5rem | Standard sections |
| `section-generous` | 4rem | 6rem | Major breaks |

---

## 6. Layout

### 6.1 Containers

| Class | Max Width | Padding | Usage |
|-------|-----------|---------|-------|
| `container-narrow` | 48rem | 1–2rem | Forms, articles |
| `container-page` | 80rem | 1–2rem | Standard pages |
| `container-wide` | 96rem | 1–2rem | Dashboards |

### 6.2 Grid System

Use Tailwind's grid utilities:
- `grid-cols-1` to `grid-cols-12`
- Responsive: `sm:`, `md:`, `lg:`, `xl:`, `2xl:`

---

## 7. Components

### 7.1 Cards

| Class | Purpose | Interaction |
|-------|---------|-------------|
| `card` | Base card | Static |
| `card-hover` | Interactive card | Hoverable |
| `card-metric` | KPI display | Static |
| `card-status` | Status display | Static |
| `card-elevated` | Modal/overlay | Static |
| `card-flush` | Tables/lists | Static |

### 7.2 Buttons

| Class | Surface | Purpose |
|-------|---------|---------|
| `terminal-action` | Dark | Primary action |
| `terminal-control` | Dark | Secondary action |
| Button component | Light | All actions |

### 7.3 Badges

| Class | Surface | Purpose |
|-------|---------|---------|
| `Badge` | Dark | Status indicators |
| `StatusBadge` | Light | Status indicators |
| `move-chip-up` | Dark | Positive movement |
| `move-chip-down` | Dark | Negative movement |
| `move-chip-flat` | Dark | No movement |

### 7.4 Empty States

| Component | Surface | Usage |
|-----------|---------|-------|
| `EmptyState` | Light | No data |
| `EmptyStatePanel` | Dark | No data |

---

## 8. Motion

### 8.1 Easing

| Token | Value | Usage |
|-------|-------|-------|
| `--ease-terminal` | cubic-bezier(0.2, 0, 0.1, 1) | Standard easing |

### 8.2 Duration

| Token | Value | Usage |
|-------|-------|-------|
| `--duration-instant` | 90ms | Hover states |
| `--duration-fast` | 140ms | Transitions |
| `--duration-panel` | 200ms | Panel animations |

### 8.3 Reduced Motion

All animations respect `prefers-reduced-motion: reduce`:
- Disable non-essential animations
- Keep essential feedback (focus, hover)
- Maintain accessibility

---

## 9. Accessibility

### 9.1 Color Contrast

All text colors meet WCAG 2.2 AA:
- Normal text: 4.5:1 contrast ratio
- Large text: 3:1 contrast ratio
- UI components: 3:1 contrast ratio

### 9.2 Focus Indicators

| Class | Color | Offset |
|-------|-------|--------|
| `focus-ring` | brand-700 | 2px |
| `focus-ring-dark` | harvest-400 | 2px |

### 9.3 Keyboard Navigation

- All interactive elements are keyboard accessible
- Tab order follows visual order
- Escape closes modals and dropdowns
- Arrow keys navigate menus

---

## 10. Implementation

### 10.1 Token Usage

**DO:**
```css
color: var(--color-text-primary);
background: var(--color-surface);
border: 1px solid var(--color-border);
```

**DON'T:**
```css
color: #202923;
background: white;
border: 1px solid #e3e9e2;
```

### 10.2 Component Usage

**DO:**
```tsx
<div className="card-hover">
  <h3 className="text-lg font-semibold">Title</h3>
  <p className="text-sm text-text-secondary">Description</p>
</div>
```

**DON'T:**
```tsx
<div className="bg-white border border-gray-200 rounded-lg hover:shadow-md">
  <h3 className="text-lg font-semibold text-gray-900">Title</h3>
  <p className="text-sm text-gray-600">Description</p>
</div>
```

---

## 11. Migration Guide

### 11.1 Color Migration

| Old Pattern | New Token |
|-------------|-----------|
| `bg-white` | `bg-surface` |
| `bg-gray-50` | `bg-background` |
| `text-gray-900` | `text-text-primary` |
| `text-gray-600` | `text-text-secondary` |
| `text-gray-400` | `text-text-muted` |
| `border-gray-200` | `border-border` |
| `border-gray-300` | `border-border-strong` |

### 11.2 Component Migration

| Old Component | New Component |
|---------------|---------------|
| Multiple page headers | `PageHero` or `PageHeader` |
| Multiple status badges | `StatusBadge` or `Badge` |
| Multiple empty states | `EmptyState` or `EmptyStatePanel` |

---

## 12. Resources

- **Figma Library:** [Link to Figma]
- **Storybook:** [Link to Storybook]
- **Component Documentation:** [Link to docs]
- **Token Reference:** See `DESIGN-TOKEN-REFERENCE.md`

---

**Maintained by:** Design Systems Team  
**Last Reviewed:** 2026-11-14
