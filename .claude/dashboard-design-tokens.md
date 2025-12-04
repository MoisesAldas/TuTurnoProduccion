# Dashboard Analytics - Design Tokens Reference

## Color System

### Primary Brand Colors (Orange)

```css
/* Orange Palette */
--orange-600: #ea580c;      /* Primary */
--orange-500: #f97316;      /* Lighter */
--orange-400: #fb923c;      /* Even Lighter */

--amber-600: #f59e0b;       /* Secondary */
--amber-500: #f59e0b;       /* Variant */
--amber-400: #fbbf24;       /* Light variant */

--yellow-600: #eab308;      /* Tertiary */
--yellow-300: #fcd34d;      /* Very light */
```

### Neutral Colors

```css
/* Grays - used for all UI elements */
--gray-900: #111827;        /* Text primary - headings, values */
--gray-800: #1f2937;        /* Text alternative */
--gray-700: #374151;        /* Text alternative dark */
--gray-600: #4b5563;        /* Labels, small text */
--gray-500: #6b7280;        /* Chart labels, secondary text */
--gray-400: #9ca3af;        /* Disabled text, tertiary */
--gray-300: #d1d5db;        /* Subtle borders */
--gray-200: #e5e7eb;        /* Card borders, dividers */
--gray-100: #f3f4f6;        /* Light backgrounds, hovers */
--gray-50:  #f9fafb;        /* Very light backgrounds */
--white:    #ffffff;        /* Card backgrounds, base */
```

### Status Colors

```css
/* Positive Trend */
--emerald-600: #059669;     /* Trend up indicator */
--emerald-100: #d1fae5;     /* Light background */

/* Negative Trend */
--red-600: #dc2626;         /* Trend down indicator */
--red-100: #fee2e2;         /* Light background */

/* Secondary Accent */
--purple-400: #a78bfa;      /* Weekday chart bars */

/* Meta Colors */
--blue-500: #3b82f6;        /* Info/tooltip */
```

## Typography

### Font Family

```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
  'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
  sans-serif;
```

### Font Sizes

```css
/* Semantic naming */
--text-xs:      0.75rem;    /* 12px - Labels, small text */
--text-sm:      0.875rem;   /* 14px - Captions, descriptions */
--text-base:    1rem;       /* 16px - Body text (not used much) */
--text-lg:      1.125rem;   /* 18px - Subheadings */
--text-xl:      1.25rem;    /* 20px - Card titles */
--text-2xl:     1.5rem;     /* 24px - Section titles */
--text-3xl:     1.875rem;   /* 30px - KPI large values */

/* Usage in component */
.kpi-label {
  font-size: var(--text-xs);        /* 12px uppercase */
}

.kpi-value {
  font-size: var(--text-3xl);       /* 30px bold */
}

.card-title {
  font-size: var(--text-xl);        /* 20px semibold */
}

.chart-label {
  font-size: var(--text-sm);        /* 14px */
}
```

### Font Weights

```css
--font-light:       300;
--font-normal:      400;
--font-medium:      500;    /* Labels, small buttons */
--font-semibold:    600;    /* Card titles, descriptions */
--font-bold:        700;    /* KPI values, headings */
--font-extrabold:   800;

/* Usage */
.kpi-label {
  font-weight: var(--font-medium);  /* 500 - uppercase */
}

.kpi-value {
  font-weight: var(--font-bold);    /* 700 - bold */
}

.trend-badge {
  font-weight: var(--font-semibold); /* 600 */
}
```

### Line Heights

```css
--leading-tight:    1.25;
--leading-normal:   1.5;
--leading-relaxed:  1.625;
--leading-loose:    2;

/* Card text */
.card-description {
  line-height: var(--leading-normal);  /* 1.5 */
}
```

## Spacing System

### Base Unit: 4px (0.25rem)

```css
--space-px:   1px;
--space-0:    0;
--space-1:    0.25rem;    /* 4px */
--space-2:    0.5rem;     /* 8px */
--space-3:    0.75rem;    /* 12px */
--space-4:    1rem;       /* 16px */
--space-6:    1.5rem;     /* 24px */
--space-8:    2rem;       /* 32px */
--space-10:   2.5rem;     /* 40px */
--space-12:   3rem;       /* 48px */

/* Component Usage */
.container {
  padding: var(--space-6);  /* 24px */
}

.card-header {
  padding-bottom: var(--space-4); /* 16px */
}

.element-gap {
  gap: var(--space-6);      /* 24px between major sections */
}
```

## Border Radius

```css
--radius-none:    0;
--radius-sm:      0.25rem;    /* 4px */
--radius-base:    0.375rem;   /* 6px */
--radius-md:      0.5rem;     /* 8px */
--radius-lg:      0.75rem;    /* 12px */
--radius-xl:      1rem;       /* 16px */
--radius-2xl:     1.5rem;     /* 24px */
--radius-full:    9999px;

/* Component Usage */
.card {
  border-radius: var(--radius-lg);  /* 12px - default card */
}

.chart-bar {
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;  /* Top rounded */
}

.progress-bar {
  border-radius: var(--radius-full);  /* Fully rounded */
}

.icon-container {
  border-radius: var(--radius-md);    /* 8px - icon box */
}
```

## Borders

### Card Borders

```css
/* Default card border */
border: 1px solid var(--gray-200);

/* Hover state - no border change, only shadow */
border: 1px solid var(--gray-200);  /* Same */
box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
```

### Chart Gridlines

```css
/* Subtle gridlines for readability */
stroke: var(--gray-100);    /* #f3f4f6 */
stroke-dasharray: 3 3;      /* Dashed pattern */

/* Alternative: solid */
stroke: var(--gray-100);
stroke-dasharray: none;
```

### Header Dividers

```css
border-bottom: 1px solid var(--gray-200);
padding-bottom: var(--space-4);  /* 16px */
```

## Shadows

### Elevation System

```css
/* No shadows on default state */
box-shadow: none;

/* Hover shadow - lift effect */
box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1),
            0 4px 6px -2px rgba(0, 0, 0, 0.05);
transition: box-shadow 0.3s ease-out;

/* Tooltip shadow */
box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1),
            0 10px 10px -5px rgba(0, 0, 0, 0.04);

/* No dark shadows - keep it light and professional */
```

## Component-Specific Styles

### KPI Card

```css
.kpi-card {
  background: var(--white);
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-lg);
  padding: var(--space-6);  /* 24px */

  /* Layout */
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-4);

  /* Interaction */
  cursor: default;
  transition: box-shadow 0.3s ease-out;

  &:hover {
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  }
}

.kpi-label {
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  color: var(--gray-500);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: var(--space-2);  /* 8px */
}

.kpi-value {
  font-size: var(--text-3xl);    /* 30px */
  font-weight: var(--font-bold);
  color: var(--gray-900);
  margin-bottom: var(--space-3); /* 12px */
}

.kpi-trend {
  display: flex;
  align-items: center;
  gap: var(--space-1);  /* 4px */
}

.kpi-icon-box {
  width: 3rem;    /* 48px */
  height: 3rem;   /* 48px */
  border-radius: var(--radius-md);
  background: var(--gray-100);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
```

### Chart Card

```css
.chart-card {
  background: var(--white);
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-lg);

  /* Sections */
  header {
    border-bottom: 1px solid var(--gray-200);
    padding: var(--space-6);  /* 24px */
    padding-bottom: var(--space-4);  /* 16px */

    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }

  content {
    padding: var(--space-6);  /* 24px */
  }
}

.chart-title {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--gray-900);
}

.chart-description {
  font-size: var(--text-sm);
  color: var(--gray-600);
  margin-top: var(--space-1);  /* 4px */
}

/* Chart selector */
.chart-selector {
  font-size: var(--text-xs);
  padding: var(--space-2) var(--space-2);
  border: 1px solid var(--gray-300);
  border-radius: var(--radius-md);
  background: var(--white);
  color: var(--gray-700);
  cursor: pointer;

  &:hover {
    border-color: var(--gray-400);
  }

  &:focus {
    outline: none;
    border-color: var(--orange-600);
    ring: 1px solid var(--orange-600);
  }
}
```

### Progress Bar

```css
.progress-container {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);  /* 4px */
  margin-bottom: var(--space-4); /* 16px */
}

.progress-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-1);  /* 4px */
}

.progress-name {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--gray-900);
}

.progress-percentage {
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  color: var(--gray-600);
}

.progress-track {
  width: 100%;
  height: 0.5rem;  /* 8px */
  background: var(--gray-200);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(to right, var(--orange-600), var(--amber-600));
  border-radius: var(--radius-full);
  transition: width 0.5s ease-out;
}

.progress-count {
  font-size: var(--text-xs);
  color: var(--gray-500);
  margin-top: var(--space-1);  /* 4px */
}
```

### Legend Item

```css
.legend-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);  /* 8px */
  margin-bottom: var(--space-3);  /* 12px */

  &:last-child {
    margin-bottom: 0;
  }
}

.legend-dot {
  width: 0.75rem;   /* 12px */
  height: 0.75rem;  /* 12px */
  border-radius: var(--radius-full);
  flex-shrink: 0;
}

.legend-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-px);  /* 1px */
}

.legend-label {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--gray-900);
}

.legend-value {
  font-size: var(--text-xs);
  color: var(--gray-500);
}
```

## Transitions & Animations

### Duration

```css
--duration-75:   75ms;
--duration-100:  100ms;
--duration-150:  150ms;
--duration-200:  200ms;
--duration-300:  300ms;
--duration-500:  500ms;
--duration-700:  700ms;
--duration-1000: 1000ms;
```

### Easing Functions

```css
--ease-linear:       linear;
--ease-in:           cubic-bezier(0.4, 0, 1, 1);
--ease-out:          cubic-bezier(0, 0, 0.2, 1);
--ease-in-out:       cubic-bezier(0.4, 0, 0.2, 1);
--ease-out-smooth:   ease-out;

/* Component usage */
.card {
  transition: box-shadow 0.3s ease-out;
}

.progress-bar {
  transition: width 0.5s ease-out;
}
```

### Hover States

```css
.card:hover {
  /* Shadow elevation */
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  transition: box-shadow 0.3s ease-out;
}

.interactive-element:hover {
  /* Color shift */
  color: var(--orange-600);
  transition: color 0.2s ease-out;
}
```

## Responsive Design

### Breakpoints

```css
/* Mobile-first */
--breakpoint-sm:  640px;   /* Tablet */
--breakpoint-md:  768px;   /* Small laptop */
--breakpoint-lg:  1024px;  /* Desktop */
--breakpoint-xl:  1280px;  /* Large desktop */

/* Grid layouts */
@media (max-width: 768px) {
  /* KPI cards: stack to 1 column */
  .kpi-grid {
    grid-template-columns: 1fr;
  }

  /* Charts: stack to 1 column */
  .chart-grid {
    grid-template-columns: 1fr;
  }
}

@media (min-width: 768px) and (max-width: 1024px) {
  /* Tablet: 2 columns for most */
  .kpi-grid {
    grid-template-columns: repeat(3, 1fr);
  }

  .chart-grid {
    grid-template-columns: 1fr;
  }
}

@media (min-width: 1024px) {
  /* Desktop: full layout */
  .kpi-grid {
    grid-template-columns: repeat(3, 1fr);
  }

  .chart-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .analytics-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
```

## Dark Mode Support (Future)

```css
/* Color overrides for dark mode */
@media (prefers-color-scheme: dark) {
  .card {
    background: var(--dark-gray-900);
    border-color: var(--dark-gray-700);
  }

  .kpi-value {
    color: var(--dark-gray-100);
  }

  .chart-label {
    color: var(--dark-gray-500);
  }
}
```

## Accessibility

### Focus States

```css
.interactive {
  &:focus {
    outline: 2px solid transparent;
    outline-offset: 2px;
  }

  &:focus-visible {
    outline: 2px solid var(--orange-600);
    outline-offset: 2px;
  }
}
```

### High Contrast

```css
@media (prefers-contrast: more) {
  .card {
    border-width: 2px;
    border-color: var(--gray-400);
  }

  .kpi-value {
    color: var(--gray-950);
  }
}
```

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

## CSS Variables in Tailwind

### Configuration Example

```typescript
// tailwind.config.ts
module.exports = {
  theme: {
    colors: {
      white: '#ffffff',
      gray: {
        50: '#f9fafb',
        100: '#f3f4f6',
        200: '#e5e7eb',
        300: '#d1d5db',
        400: '#9ca3af',
        500: '#6b7280',
        600: '#4b5563',
        700: '#374151',
        800: '#1f2937',
        900: '#111827',
      },
      orange: {
        400: '#fb923c',
        500: '#f97316',
        600: '#ea580c',
      },
      amber: {
        400: '#fbbf24',
        600: '#f59e0b',
      },
      yellow: {
        300: '#fcd34d',
        600: '#eab308',
      },
      emerald: {
        600: '#059669',
        100: '#d1fae5',
      },
      red: {
        600: '#dc2626',
        100: '#fee2e2',
      },
    },
    spacing: {
      0: '0',
      px: '1px',
      1: '0.25rem',
      2: '0.5rem',
      3: '0.75rem',
      4: '1rem',
      6: '1.5rem',
      8: '2rem',
    },
    borderRadius: {
      none: '0',
      sm: '0.25rem',
      base: '0.375rem',
      md: '0.5rem',
      lg: '0.75rem',
      xl: '1rem',
      full: '9999px',
    },
  },
}
```

---

**Last Updated:** 2025-12-01
**Status:** Complete Reference
