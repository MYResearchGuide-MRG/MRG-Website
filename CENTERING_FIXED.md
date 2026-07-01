# Centering Issues Fixed

## Issues Identified
1. `.container` class was not defined - relying on Tailwind default
2. Hero content not properly centered
3. No responsive max-width breakpoints

## Fixes Applied

### 1. Proper Container Definition
```css
.container {
  width: 100%;
  margin-left: auto;
  margin-right: auto;
  padding-left: 1rem;
  padding-right: 1rem;
}

/* Responsive max-widths */
@media (min-width: 640px) { max-width: 640px; }
@media (min-width: 768px) { max-width: 768px; }
@media (min-width: 1024px) { max-width: 1024px; }
@media (min-width: 1280px) { max-width: 1280px; }
```

### 2. Hero Section Centering
```css
.hero-section {
  justify-content: center; /* Added */
}

.hero-content {
  width: 100%; /* Ensures full container width */
}
```

## Test
Open http://localhost:3000/ and check:
- ✅ Header content centered
- ✅ Hero content centered
- ✅ Projects section centered
- ✅ Proper responsive padding
