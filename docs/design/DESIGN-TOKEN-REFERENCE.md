# Hatsi360 Design Token Reference

**Version:** 2.0  
**Last Updated:** 2026-11-14  
**Source:** `src/app/globals.css`

---

## Complete Token Inventory

### 1. Brand Colors

| Token | Value | RGB | HSL | WCAG on White |
|-------|-------|-----|-----|---------------|
| `brand-50` | #f1f7f0 | rgb(241, 247, 240) | hsl(114, 38%, 95%) | — |
| `brand-100` | #e1efe0 | rgb(225, 239, 224) | hsl(114, 38%, 90%) | — |
| `brand-200` | #c2dec1 | rgb(194, 222, 193) | hsl(114, 38%, 81%) | — |
| `brand-300` | #9bc798 | rgb(155, 199, 152) | hsl(114, 38%, 69%) | — |
| `brand-400` | #7cb277 | rgb(124, 178, 119) | hsl(114, 38%, 58%) | — |
| `brand-500` | #2f8257 | rgb(47, 130, 87) | hsl(149, 47%, 35%) | 4.6:1 ✓ |
| `brand-600` | #26734b | rgb(38, 115, 75) | hsl(149, 50%, 30%) | 5.2:1 ✓ |
| `brand-700` | #174d35 | rgb(23, 77, 53) | hsl(149, 54%, 20%) | 8.1:1 ✓ |
| `brand-800` | #123b2a | rgb(18, 59, 42) | hsl(149, 53%, 15%) | 10.5:1 ✓ |
| `brand-900` | #0e2c1f | rgb(14, 44, 31) | hsl(149, 52%, 11%) | 12.8:1 ✓ |
| `brand-950` | #071a12 | rgb(7, 26, 18) | hsl(149, 57%, 6%) | 15.2:1 ✓ |

**Primary brand color:** `brand-600` (#26734b)  
**Dark brand color:** `brand-700` (#174d35)  
**Light brand color:** `brand-50` (#f1f7f0)

---

### 2. Leaf Colors (Fresh Growth Accent)

| Token | Value | Usage |
|-------|-------|-------|
| `leaf-100` | #e6f1e4 | Light surfaces |
| `leaf-200` | #c9e2c5 | Hover states |
| `leaf-300` | #9bc798 | Selected states |
| `leaf-400` | #7cb277 | Secondary accent |
| `leaf-500` | #5b9a57 | Primary accent |
| `leaf-600` | #467c43 | Dark accent |
| `leaf-700` | #376136 | Darkest accent |

---

### 3. Harvest Colors (Gold Accent)

| Token | Value | Usage |
|-------|-------|-------|
| `harvest-100` | #faf1dc | Light surfaces |
| `harvest-200` | #f3dfb2 | Hover states |
| `harvest-300` | #e9c97e | Selected states |
| `harvest-400` | #e5b95f | Primary gold |
| `harvest-500` | #d5a441 | Dark gold |
| `harvest-600` | #b98b2e | Darker gold |
| `harvest-700` | #96702a | Darkest gold |

---

### 4. Sand Colors (Warm Editorial)

| Token | Value | Usage |
|-------|-------|-------|
| `sand-50` | #fbf8f1 | Lightest surfaces |
| `sand-100` | #f4efe4 | Editorial backgrounds |
| `sand-200` | #e9d8b5 | Warm panels |
| `sand-300` | #dcc79a | Accents |
| `sand-400` | #cbb078 | Secondary accents |
| `sand-500` | #b0945f | Dark accents |
| `sand-600` | #8b7548 | Darker accents |
| `sand-700` | #6b5a36 | Darkest accents |

---

### 5. Earth Colors (Chart Series)

| Token | Value | Usage |
|-------|-------|-------|
| `earth-100` | #ede7de | Lightest series |
| `earth-200` | #d9cdbc | Series 2 |
| `earth-300` | #bfaf9a | Series 3 |
| `earth-400` | #a28f78 | Series 4 |
| `earth-500` | #85735c | Series 5 |
| `earth-600` | #675844 | Series 6 |
| `earth-700` | #4c4132 | Series 7 |

---

### 6. Ink Colors (Typography & Neutrals)

| Token | Value | Usage |
|-------|-------|-------|
| `ink-50` | #f7f8f5 | Page backgrounds |
| `ink-100` | #eff2ee | Light surfaces |
| `ink-200` | #e3e9e2 | Borders |
| `ink-300` | #cbd5cd | Strong borders |
| `ink-400` | #68756e | Muted text |
| `ink-450` | #718078 | Secondary muted |
| `ink-500` | #5a6760 | Secondary text |
| `ink-600` | #465149 | Tertiary text |
| `ink-700` | #3a443d | Dark secondary |
| `ink-800` | #34423a | Dark text |
| `ink-900` | #202923 | Primary text |
| `ink-950` | #121815 | Darkest text |

---

### 7. Status Colors

| Status | Token | Value | WCAG on White | Usage |
|--------|-------|-------|---------------|-------|
| Success | `success-500` | #228b55 | 4.5:1 ✓ | Verified, approved |
| Success | `success-700` | #1c6e45 | 6.2:1 ✓ | Success actions |
| Warning | `warning-50` | #fdf6e6 | — | Warning backgrounds |
| Warning | `warning-200` | #efd9a2 | — | Warning borders |
| Warning | `warning-500` | #d69e2e | 2.1:1 ✗ | Warning text (use on dark) |
| Warning | `warning-700` | #8a6520 | 4.8:1 ✓ | Warning actions |
| Error | `error-50` | #fdf0ef | — | Error backgrounds |
| Error | `error-200` | #f0c6c3 | — | Error borders |
| Error | `error-500` | #c84b45 | 3.8:1 ✗ | Error text (use on dark) |
| Error | `error-700` | #a63e39 | 5.1:1 ✓ | Error actions |
| Info | `info-50` | #eef4fb | — | Info backgrounds |
| Info | `info-200` | #bcd6f0 | — | Info borders |
| Info | `info-500` | #3478b8 | 4.2:1 ✗ | Info text (use on dark) |
| Info | `info-700` | #2c628f | 5.8:1 ✓ | Info actions |

---

### 8. Terminal Colors

| Token | Value | Usage |
|-------|-------|-------|
| `terminal-bg` | #101713 | Terminal background |
| `terminal-surface` | #17211b | Panel backgrounds |
| `terminal-elevated` | #1c2921 | Elevated panels |
| `terminal-interactive` | #24332a | Interactive elements |
| `terminal-border` | #2c3a31 | Dividers |
| `terminal-text` | #f3f6f2 | Primary text |
| `terminal-text-secondary` | #a8b5aa | Secondary text |
| `terminal-text-muted` | #748278 | Muted text |

---

### 9. Editorial Colors

| Token | Value | Usage |
|-------|-------|-------|
| `editorial-bg` | #f7f8f5 | Editorial background |
| `editorial-surface` | #ffffff | Card backgrounds |
| `editorial-soft` | #f0f3ee | Soft surfaces |
| `editorial-text` | #202923 | Primary text |
| `editorial-text-secondary` | #59665e | Secondary text |
| `editorial-border` | #e3e9e2 | Dividers |

---

### 10. Movement Colors

| Direction | Token | Value | Usage |
|-----------|-------|-------|-------|
| Up | `move-up` | #2f8f57 | Positive movement |
| Up (soft) | `move-up-soft` | #14301f | Up badge background |
| Down | `move-down` | #d0584f | Negative movement |
| Down (soft) | `move-down-soft` | #331a18 | Down badge background |
| Flat | `move-flat` | #748278 | No movement |

---

### 11. Semantic Color Aliases

| Token | Light Value | Dark Value | Purpose |
|-------|-------------|------------|---------|
| `surface` | #ffffff | `terminal-surface-primary` | Card backgrounds |
| `background` | #f7f8f5 | `terminal-background` | Page backgrounds |
| `text-primary` | #202923 | `terminal-text-primary` | Primary text |
| `text-secondary` | #59665e | `terminal-text-secondary` | Secondary text |
| `text-muted` | #68756e | `terminal-text-muted` | Tertiary text |
| `border` | #e3e9e2 | `terminal-border` | Dividers |
| `border-strong` | #cbd5cd | `terminal-border-strong` | Active borders |

---

### 12. Typography Tokens

| Token | Value | Line Height | Letter Spacing |
|-------|-------|-------------|----------------|
| `--text-micro` | 0.625rem | 0.875rem | 0.06em |
| `--text-metadata` | 0.6875rem | 1rem | normal |
| `--text-label` | 0.75rem | 1.125rem | normal |
| `--text-body-sm` | 0.8125rem | 1.25rem | normal |
| `--text-figure` | 0.9375rem | 1.375rem | -0.01em |
| `--text-figure-lg` | 1.25rem | 1.5rem | normal |
| `--text-figure-xl` | 1.75rem | 2rem | normal |

**Font families:**
- Display: `--font-display` (Manrope)
- Sans: `--font-sans` (Inter)

---

### 13. Spacing Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--spacing-terminal-gutter` | 1rem | Terminal gutters |
| `--spacing-terminal-panel` | 1rem | Panel padding |
| `--spacing-terminal-row` | 0.5rem | Row spacing |

---

### 14. Radius Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-card` | 0.875rem | Cards |
| `--radius-panel` | 0.625rem | Panels |
| `--radius-control` | 0.375rem | Controls |
| `--radius-pill` | 999px | Pills, badges |

---

### 15. Shadow Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--shadow-soft` | 0 1px 2px rgba(18,59,42,0.04), 0 8px 24px -12px rgba(18,59,42,0.14) | Cards |
| `--shadow-lift` | 0 2px 4px rgba(18,59,42,0.06), 0 18px 40px -20px rgba(18,59,42,0.24) | Elevated |
| `--shadow-terminal` | 0 1px 0 rgba(0,0,0,0.3), 0 8px 24px -16px rgba(0,0,0,0.6) | Terminal panels |
| `--shadow-terminal-lift` | 0 2px 6px rgba(0,0,0,0.35), 0 20px 44px -24px rgba(0,0,0,0.7) | Terminal elevated |

---

### 16. Motion Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--ease-terminal` | cubic-bezier(0.2, 0, 0.1, 1) | Standard easing |
| `--duration-instant` | 90ms | Hover states |
| `--duration-fast` | 140ms | Transitions |
| `--duration-panel` | 200ms | Panel animations |

---

### 17. Z-Index Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--z-sticky` | 20 | Sticky elements |
| `--z-header` | 40 | Headers |
| `--z-drawer` | 60 | Drawers |
| `--z-modal` | 70 | Modals |
| `--z-tooltip` | 80 | Tooltips |
| `--z-boot` | 200 | Boot overlay |

---

## Token Usage Guidelines

### DO Use Tokens

```css
/* Correct */
background-color: var(--color-surface);
color: var(--color-text-primary);
border: 1px solid var(--color-border);
```

### DON'T Use Raw Values

```css
/* Incorrect */
background-color: #ffffff;
color: #202923;
border: 1px solid #e3e9e2;
```

### DO Use Semantic Aliases

```css
/* Correct - works on both light and dark surfaces */
background-color: var(--color-surface);
```

### DON'T Hardcode Surface Colors

```css
/* Incorrect - only works on light surfaces */
background-color: #ffffff;
```

---

## Migration Checklist

- [ ] Replace all `neutral-*` with `ink-*`
- [ ] Replace all `bg-white` with `bg-surface`
- [ ] Replace all `bg-gray-50` with `bg-background`
- [ ] Replace all `text-gray-900` with `text-text-primary`
- [ ] Replace all `text-gray-600` with `text-text-secondary`
- [ ] Replace all `text-gray-400` with `text-text-muted`
- [ ] Replace all `border-gray-200` with `border-border`
- [ ] Replace all `border-gray-300` with `border-border-strong`

---

**Total Tokens:** 120+  
**Color Tokens:** 90+  
**Typography Tokens:** 7  
**Spacing Tokens:** 3  
**Radius Tokens:** 4  
**Shadow Tokens:** 4  
**Motion Tokens:** 4  
**Z-Index Tokens:** 6

**Last Audited:** 2026-11-14
