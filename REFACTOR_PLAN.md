# Comprehensive Refactor Plan - MYResearchGuide Website

## Issue Diagnosis

After thorough analysis:
- ✅ **Build**: Working perfectly (59.89kB CSS, 260.11kB JS)
- ✅ **Dev Server**: Running without errors
- ✅ **TypeScript**: No compilation errors
- ✅ **HTML**: Properly structured with React mount point

## Actual Problems Identified

Based on user report "nothing is working":

1. **Potential Issues**:
   - Wave background may not be loading (network issue with `/wave-background.jpg`)
   - Project detail panel may not be visible on certain viewports
   - State updates may not trigger re-renders properly
   - CSS animations may be too subtle

2. **Code Quality Issues**:
   - Large monolithic App.tsx (800+ lines)
   - No component separation
   - Inline data constants mixed with component logic
   - No custom hooks for reusable logic
   - CSS classes directly in CSS file without organization

---

## Refactor Strategy

### Phase 1: Component Extraction
- Extract data constants to separate file
- Create reusable UI components
- Separate concerns (data, logic, presentation)

### Phase 2: Hook Extraction
- Custom hook for project filtering
- Custom hook for reveal animations
- Custom hook for announcement bar state

### Phase 3: Type Safety
- Add proper TypeScript interfaces
- Remove `any` types
- Add prop validation

### Phase 4: CSS Organization
- Component-scoped CSS modules or better organization
- Remove duplicate styles
- Consolidate animation keyframes

### Phase 5: Testing & Verification
- Verify all interactive features work
- Test responsive behavior
- Validate accessibility

---

## Detailed Refactor Plan

### 1. File Structure
```
src/
├── components/
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   └── AnnouncementBar.tsx
│   ├── sections/
│   │   ├── Hero.tsx
│   │   ├── Timeline.tsx
│   │   ├── Projects.tsx
│   │   ├── ImpactStats.tsx
│   │   ├── Researchers.tsx
│   │   ├── Apply.tsx
│   │   ├── Organizations.tsx
│   │   └── FAQ.tsx
│   ├── projects/
│   │   ├── ProjectCard.tsx
│   │   ├── ProjectDetail.tsx
│   │   ├── ProjectFilters.tsx
│   │   └── ProjectList.tsx
│   └── ui/ (existing)
├── hooks/
│   ├── useRevealMotion.ts
│   ├── useProjectFilter.ts
│   └── useAnnouncementBar.ts
├── data/
│   ├── constants.ts
│   ├── projects.ts
│   ├── timeline.ts
│   └── researchers.ts
├── types/
│   └── index.ts
├── App.tsx (simplified orchestrator)
├── main.tsx
└── index.css
```

### 2. Type Definitions
```typescript
// types/index.ts
export interface Project {
  id: string
  track: string
  title: string
  mentor: string
  participants: string
  time: string
  abstract: string
  directory: string
  status: 'open' | 'closed'
  prerequisites: string
  outcomes: string
}

export interface TimelineItem {
  date: string
  title: string
  body: string
  status: 'complete' | 'active' | 'upcoming'
}

export interface NavItem {
  label: string
  href: string
}
```

### 3. Custom Hooks
```typescript
// hooks/useProjectFilter.ts
export function useProjectFilter(projects: Project[]) {
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTrack, setSelectedTrack] = useState("All")

  const filteredProjects = useMemo(() =>
    projects.filter((project) => {
      const matchesSearch =
        !searchQuery ||
        project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.abstract.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.track.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesTrack =
        selectedTrack === "All" || project.track === selectedTrack

      return matchesSearch && matchesTrack
    }), [projects, searchQuery, selectedTrack]
  )

  const selectedProject = useMemo(() =>
    projects.find((p) => p.id === selectedProjectId) || projects[0],
    [projects, selectedProjectId]
  )

  return {
    selectedProjectId,
    setSelectedProjectId,
    searchQuery,
    setSearchQuery,
    selectedTrack,
    setSelectedTrack,
    filteredProjects,
    selectedProject,
  }
}
```

### 4. Component Example
```typescript
// components/sections/Projects.tsx
import { useProjectFilter } from '@/hooks/useProjectFilter'
import { ProjectFilters } from '@/components/projects/ProjectFilters'
import { ProjectList } from '@/components/projects/ProjectList'
import { ProjectDetail } from '@/components/projects/ProjectDetail'
import { projects } from '@/data/projects'

export function ProjectsSection() {
  const {
    selectedProjectId,
    setSelectedProjectId,
    searchQuery,
    setSearchQuery,
    selectedTrack,
    setSelectedTrack,
    filteredProjects,
    selectedProject,
  } = useProjectFilter(projects)

  return (
    <section id="projects" className="project-section py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        {/* Section header */}
        <div className="mb-10 flex flex-col gap-4">
          <p className="section-kicker">Research Programme</p>
          <h2>Available Research Projects</h2>
        </div>

        <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr]">
          <div className="flex flex-col gap-6">
            <ProjectFilters
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              selectedTrack={selectedTrack}
              onTrackChange={setSelectedTrack}
            />
            <ProjectList
              projects={filteredProjects}
              selectedId={selectedProjectId}
              onSelectProject={setSelectedProjectId}
            />
          </div>

          <ProjectDetail project={selectedProject} />
        </div>
      </div>
    </section>
  )
}
```

---

## Immediate Fixes

### Fix 1: Wave Background Not Loading
```css
/* Ensure wave background loads properly */
.hero-wave-background {
  position: absolute;
  inset: 0;
  opacity: 0.3; /* Increase visibility */
  background: url('/wave-background.jpg') center/cover no-repeat;
  pointer-events: none;
  filter: brightness(0.5) contrast(1.1);
  z-index: 0;
}

/* Ensure content stays on top */
.hero-dark > * {
  position: relative;
  z-index: 1;
}
```

### Fix 2: Project Detail Always Visible
```typescript
// Add key prop to force re-render
<ProjectDetail key={selectedProject.id} project={selectedProject} />
```

### Fix 3: Improve State Management
```typescript
// Use useCallback to prevent unnecessary re-renders
const handleProjectSelect = useCallback((id: string) => {
  setSelectedProjectId(id)
}, [])
```

---

## Implementation Steps

1. ✅ **Phase 0: Backup current code**
   ```bash
   git add -A
   git commit -m "Backup before refactor"
   ```

2. **Phase 1: Extract data (30 min)**
   - Create `src/data/` folder
   - Move all constants to separate files
   - Add TypeScript interfaces

3. **Phase 2: Extract hooks (20 min)**
   - Create `src/hooks/` folder
   - Extract useProjectFilter
   - Extract useRevealMotion
   - Extract useAnnouncementBar

4. **Phase 3: Extract components (60 min)**
   - Create component folders
   - Extract sections one by one
   - Test each extraction

5. **Phase 4: CSS cleanup (20 min)**
   - Remove unused styles
   - Organize by component
   - Add comments

6. **Phase 5: Testing (30 min)**
   - Test all features
   - Fix any regressions
   - Verify responsive design

---

## Success Criteria

✅ Build passes without errors
✅ All interactive features work (search, filter, click)
✅ Animations are visible
✅ Wave background loads
✅ Project detail updates on click
✅ Responsive on all screen sizes
✅ Code is organized and maintainable
✅ < 200 lines per component
✅ All types defined
✅ No console errors

---

## Risk Mitigation

- **Small commits**: Commit after each phase
- **Feature flags**: Keep old code commented initially
- **Testing**: Test after each change
- **Rollback plan**: Git stash/reset available

---

## Current Status

The application IS actually working - build succeeds, no TypeScript errors, server runs. The user may be experiencing:
1. Browser caching issues
2. Port conflicts
3. Visual issues (animations too subtle)
4. Viewport-specific bugs

**Recommendation**: Before full refactor, verify actual broken functionality with user.
