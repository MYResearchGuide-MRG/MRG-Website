# MRG Competition Website Design System

## 1. Atmosphere & Identity

The site should feel like a monochrome research gallery: severe, technical, glossy, and easy to extend as competition details mature. The signature is a black-and-silver interface field with thin research-grid lines, metallic section bands, and compact evidence-first content blocks that make the site recognizable even without the MRG mark.

## 2. Color

### Palette

| Role                     | Token                    | Light                     | Dark                      | Usage                           |
| ------------------------ | ------------------------ | ------------------------- | ------------------------- | ------------------------------- |
| Surface/primary          | --background             | #070707                   | #070707                   | Main background                 |
| Surface/secondary        | --secondary              | #111111                   | #111111                   | Alternating sections            |
| Surface/elevated         | --card                   | #121212                   | #121212                   | Project panels, callouts        |
| Text/primary             | --foreground             | #F4F4F0                   | #F4F4F0                   | Headlines, body                 |
| Text/secondary           | --muted-foreground       | #A7A7A0                   | #A7A7A0                   | Captions, metadata              |
| Text/tertiary            | --surface-metal-muted    | #777771                   | #777771                   | Overlines, quiet labels         |
| Border/default           | --border                 | #2C2C2A                   | #2C2C2A                   | Dividers, outlines              |
| Accent/primary           | --primary                | #F1F1EC                   | #F1F1EC                   | CTAs, selected states, focus    |
| Accent/hover             | --accent                 | #20201E                   | #20201E                   | Hover and selected backgrounds  |
| Status/success           | --status-success         | #A7C7B2                   | #A7C7B2                   | Open application indicators     |
| Status/warning           | --status-warning         | #D3C098                   | #D3C098                   | Deadline indicators             |
| Status/error             | --destructive            | #E56D62                   | #E56D62                   | Closed or urgent states         |
| Surface/inverse          | --surface-inverse        | #080808                   | #080808                   | Hero and footer dark field      |
| Surface/inverse-soft     | --surface-inverse-soft   | #0D0D0D                   | #0D0D0D                   | Project directory field         |
| Text/on-inverse          | --surface-inverse-text   | #F4F4F0                   | #F4F4F0                   | Text on dark fields             |
| Text/on-inverse-muted    | --surface-inverse-muted  | #A7A7A0                   | #A7A7A0                   | Metadata on dark fields         |
| Surface/light-band       | --surface-light-band     | #0F0F0F                   | #0F0F0F                   | Timeline and FAQ metallic bands |
| Border/on-inverse        | --surface-inverse-border | rgba(255,255,255,0.13)    | rgba(255,255,255,0.13)    | Dark panel dividers             |
| Surface/on-inverse-panel | --surface-inverse-panel  | rgba(255,255,255,0.045)   | rgba(255,255,255,0.045)   | Dark fact cells                 |
| Surface/sheen            | --surface-sheen          | linear-gradient           | linear-gradient           | Metallic page sweep             |
| Surface/grid             | --surface-grid           | repeating-linear-gradient | repeating-linear-gradient | Thin reference-style grid       |
| Surface/panel-gloss      | --panel-gloss            | linear-gradient           | linear-gradient           | Glossy card edge highlight      |

### Rules

- The palette is intentionally monochrome. Silver-white is functional accent, not decoration.
- Gloss appears as edge refraction, grid lines, and broad metallic sweeps. Do not add blue, purple, beige, or saturated gradients.
- Extend this table before introducing a new color.

## 3. Typography

### Scale

| Level   | Size                    | Weight | Line Height | Tracking | Usage                   |
| ------- | ----------------------- | ------ | ----------- | -------- | ----------------------- |
| Display | clamp(48px, 9vw, 112px) | 520    | 0.9         | 0        | Hero title              |
| H1      | clamp(40px, 6vw, 76px)  | 520    | 0.95        | 0        | Major section headers   |
| H2      | clamp(28px, 4vw, 48px)  | 520    | 1.05        | 0        | Section headings        |
| H3      | 22px                    | 560    | 1.2         | 0        | Project and card titles |
| Body/lg | 18px                    | 400    | 1.65        | 0        | Leads                   |
| Body    | 16px                    | 400    | 1.6         | 0        | Default text            |
| Body/sm | 14px                    | 430    | 1.5         | 0        | Secondary info          |
| Caption | 12px                    | 650    | 1.3         | 0.08em   | Labels, metadata        |

### Font Stack

- Primary: Geist Variable, ui-sans-serif, sans-serif.
- Mono: ui-monospace, SFMono-Regular, Menlo, monospace.
- Serif: Georgia, Cambria, serif, used only for the project-directory editorial title.

### Rules

- Letter spacing remains non-negative.
- Body copy never drops below 14px.
- Serif is used as an institutional editorial accent, not for dense navigation or controls.

## 4. Spacing & Layout

### Base Unit

All spacing derives from a base of 4px.

| Token      | Value | Usage                         |
| ---------- | ----- | ----------------------------- |
| --space-1  | 4px   | Hairline gaps                 |
| --space-2  | 8px   | Inline icon gaps              |
| --space-3  | 12px  | Compact rows                  |
| --space-4  | 16px  | Default mobile padding        |
| --space-6  | 24px  | Panel padding                 |
| --space-8  | 32px  | Section inner gaps            |
| --space-12 | 48px  | Major groups                  |
| --space-16 | 64px  | Standard section rhythm       |
| --space-24 | 96px  | Hero and large-section rhythm |

### Grid

- Max content width: 1280px.
- Desktop layout: asymmetric 12-column grid with denser left rails and larger content panes.
- Mobile layout: single column with sticky navigation disabled and all fixed-format panes width-constrained.
- Breakpoints: sm 640px, md 768px, lg 1024px, xl 1280px.

### Rules

- Cards are for repeated entities only: projects, researchers, FAQ items, partners, timeline milestones.
- Page sections are full-width bands or unframed layouts.
- Fixed-format elements use aspect ratio or min/max constraints to avoid layout shifts.

## 5. Components

### Header Navigation

- **Structure**: sticky header, brand mark, anchor links, external MRG link, application button.
- **Variants**: desktop full nav, mobile wrapping nav.
- **States**: hover, focus-visible, active button press.
- **Accessibility**: semantic `nav`, visible skip link, anchor hrefs.

### Project Directory

- **Structure**: left project list, top filters, right active-project detail panel.
- **Variants**: desktop split, mobile stacked list and detail.
- **States**: selected project, hover, focus-visible, empty-state language for future detail completion.
- **Accessibility**: labelled section, real buttons for project choices, metadata exposed as text.

### Timeline Rail

- **Structure**: numbered vertical checkpoints with highlighted current/final milestone.
- **Variants**: metallic dark band, compact mobile rail.
- **States**: completed, active, upcoming.
- **Accessibility**: ordered list and concrete dates.

### Researcher Panel

- **Structure**: category columns for external researchers and UTAR researchers.
- **Variants**: category badge, affiliation line, placeholder recruitment rows.
- **States**: available mentor, pending confirmation.
- **Accessibility**: names and categories rendered as text, not image-only.

### FAQ List

- **Structure**: repeated question-answer cards.
- **Variants**: application, eligibility, schedule, project selection, sponsorship.
- **States**: hover/focus links within answers.
- **Accessibility**: headings per question with readable body copy.

## 6. Motion & Interaction

### Timing

| Type     | Duration | Easing                        | Usage                               |
| -------- | -------- | ----------------------------- | ----------------------------------- |
| Micro    | 120ms    | ease-out                      | Button press                        |
| Standard | 220ms    | cubic-bezier(0.16, 1, 0.3, 1) | Hover lift, nav color               |
| Emphasis | 680ms    | cubic-bezier(0.16, 1, 0.3, 1) | Hero entry and project panel reveal |
| Stagger  | +70ms    | cubic-bezier(0.16, 1, 0.3, 1) | Section/card scroll reveals         |

### Rules

- Only animate transform and opacity.
- Respect `prefers-reduced-motion`.
- Ambient motion is limited to a slow transform-based metallic sheen on dark surfaces.
- Scroll reveal uses IntersectionObserver and progressive opacity/translate transitions; content remains visible when JavaScript is unavailable.

## 7. Depth & Surface

### Strategy

Mixed, but constrained: all surfaces are dark. Depth comes from tonal shifts, thin borders, inner highlights, and broad metallic gradients instead of colored shadows.

| Level      | Value                                | Usage              |
| ---------- | ------------------------------------ | ------------------ |
| Subtle     | 0 1px 2px rgba(0,0,0,0.32)           | Cards at rest      |
| Default    | 0 24px 80px rgba(0,0,0,0.42)         | Prominent panels   |
| Dark inset | inset 0 1px 0 rgba(255,255,255,0.08) | Glossy dark panels |
