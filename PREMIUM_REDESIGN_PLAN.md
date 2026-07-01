# Complete Redesign Plan - Premium Research Competition Site

## Design Philosophy

**From**: Generic LLM component library look
**To**: Bespoke, premium research competition aesthetic

### Inspiration Analysis (globalresearchchallenge.org)
1. **Hero Section**: Full-screen, clean typography, visible flowing lines
2. **No Sidebar**: Grid-based project cards, no left sidebar
3. **Premium Feel**: Spacious, deliberate spacing, custom typography
4. **Visible Waves**: High-contrast flowing line patterns
5. **Clean Navigation**: Top nav only, no clutter

---

## Redesign Strategy

### 1. Remove Generic Elements
- ❌ Left sidebar with search/filter
- ❌ Generic card components
- ❌ Basic Tailwind utility spam
- ❌ Shadcn/UI generic buttons

### 2. Add Premium Elements  
- ✅ Full-width hero with large typography
- ✅ Grid-based project showcase (3-4 columns)
- ✅ Custom wave pattern SVG (visible)
- ✅ Bespoke interactions
- ✅ Light/dark mode toggle
- ✅ Premium spacing and typography

### 3. Layout Transform
```
BEFORE (Generic):
┌─────────────────────────────────┐
│  Header                         │
├──────┬──────────────────────────┤
│Sidebar│  Project Detail         │
│Search │  (Single Project)       │
│Filter │                         │
│List  │                         │
└──────┴──────────────────────────┘

AFTER (Premium):
┌─────────────────────────────────┐
│  Nav with Light/Dark Toggle     │
├─────────────────────────────────┤
│  Full-Width Hero                │
│  + Visible Wave Pattern         │
├─────────────────────────────────┤
│  ┌────┐ ┌────┐ ┌────┐          │
│  │Proj││Proj││Proj│  Grid      │
│  └────┘ └────┘ └────┘          │
│  ┌────┐ ┌────┐                 │
│  │Proj││Proj│                  │
│  └────┘ └────┘                 │
└─────────────────────────────────┘
```

---

## Implementation Steps

### Phase 1: Light/Dark Mode Infrastructure
1. Add theme provider
2. Create toggle component
3. Update color system

### Phase 2: Hero Redesign
1. Remove sidebar layout
2. Full-width hero
3. Add custom wave SVG pattern
4. Large, impactful typography

### Phase 3: Project Grid
1. Replace sidebar + detail view
2. Grid of project cards (3 columns desktop, 2 tablet, 1 mobile)
3. Click → Modal or dedicated page
4. Premium card design

### Phase 4: Custom Wave Pattern
1. Create SVG wave pattern (not background image)
2. High visibility (30-40% opacity)
3. Flowing animation
4. Controllable in code

### Phase 5: Typography & Spacing
1. Premium font stack
2. Generous spacing
3. Clear hierarchy
4. Professional feel

---

## Files to Modify

1. **src/components/theme-provider.tsx** - Add light mode support
2. **src/App.tsx** - Complete layout restructure
3. **src/index.css** - New design system
4. **src/components/ui/** - Remove generic components
5. **public/** - Add custom SVG patterns

---

## Color System

### Dark Mode (Default)
```css
--background: hsl(240 10% 3.9%)
--foreground: hsl(0 0% 98%)
--primary: hsl(217 91% 60%) /* Blue accent */
```

### Light Mode
```css
--background: hsl(0 0% 100%)
--foreground: hsl(240 10% 3.9%)
--primary: hsl(217 91% 60%) /* Same blue */
```

---

## Wave Pattern Implementation

Use inline SVG pattern (not background image):

```tsx
<div className="hero-waves">
  <svg className="wave-pattern" preserveAspectRatio="none">
    <defs>
      <linearGradient id="wave-gradient">
        <stop offset="0%" stopColor="currentColor" stopOpacity="0.1" />
        <stop offset="100%" stopColor="currentColor" stopOpacity="0.4" />
      </linearGradient>
    </defs>
    <path d="..." fill="url(#wave-gradient)" />
  </svg>
</div>
```

Benefits:
- Fully controllable
- Themeable (responds to dark/light)
- Always visible
- Performant
