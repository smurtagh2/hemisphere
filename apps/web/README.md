# Hemisphere Web App

The frontend web application for the Hemisphere Learning Platform, implementing a stage-aware design system based on McGilchrist's hemisphere theory.

## Design System

### Stage-Aware Design Tokens

The app uses CSS custom properties (design tokens) that dynamically change based on the learning stage:

#### Three Learning Stages

1. **Encounter (RH-Primary)** - Warm, organic, expansive
   - Warm amber/terracotta color palette
   - Serif typography (Source Serif 4)
   - Slow, fluid animations (400-800ms)
   - Generous spacing (125% multiplier)
   - Large, rounded corners

2. **Analysis (LH-Primary)** - Cool, precise, structured
   - Cool steel blue color palette
   - Sans-serif typography (Inter)
   - Quick, precise animations (150-300ms)
   - Standard spacing (100% multiplier)
   - Small, geometric corners

3. **Return (RH-Primary, Enriched)** - Deep warm, reflective
   - Deep coral/mauve color palette
   - Serif typography (Source Serif 4)
   - Slowest, contemplative animations (500-1000ms)
   - Most spacious (135% multiplier)
   - Medium, organic corners

### Usage

#### Setting the Stage

Add `data-stage` attribute to elements to apply stage-specific tokens:

```tsx
<div data-stage="encounter">
  {/* This section uses Encounter palette, typography, and motion */}
</div>

<div data-stage="analysis">
  {/* This section uses Analysis palette, typography, and motion */}
</div>

<div data-stage="return">
  {/* This section uses Return palette, typography, and motion */}
</div>
```

#### Using Design Tokens in Components

Use the stage-aware CSS custom properties directly:

```tsx
// Background colors
className="bg-[var(--bg-primary)]"
className="bg-[var(--bg-secondary)]"

// Text colors
className="text-[var(--text-primary)]"
className="text-[var(--text-secondary)]"

// Accent colors
className="text-[var(--accent-primary)]"
className="border-[var(--accent-primary)]"

// Typography
className="font-[var(--font-body)]"
className="text-[var(--text-body)]"
```

Or use the Tailwind utilities:

```tsx
// Stage-aware colors
className="bg-bg-primary text-text-primary"
className="border-accent-primary"

// Specific stage colors
className="bg-encounter-bg-primary"
className="text-analysis-accent-primary"
className="bg-return-bg-secondary"

// Stage-aware motion
className="duration-short ease-stage"
className="stage-transition"
```

#### Light/Dark Mode

Add `data-theme` attribute for light mode:

```tsx
<body data-theme="light" data-stage="encounter">
  {/* Light mode + Encounter stage */}
</body>
```

### Design Token Files

- **`src/styles/tokens.css`** - All design token definitions
- **`src/styles/globals.css`** - Global styles and Tailwind integration
- **`tailwind.config.ts`** - Tailwind configuration with token mapping
- **`postcss.config.mjs`** - PostCSS configuration

### Design Philosophy

The interface itself embodies the hemisphere-aware pedagogy:

1. **The UI breathes** - Spacing and motion change with stages
2. **Warmth invites, structure supports** - Color palettes signal mode
3. **No visual noise** - Restrained, purposeful design
4. **Motion communicates mode** - Animation timing reinforces attention
5. **Learner always knows where they are** - Ambient sensory environment
6. **Accessibility first** - All cues have non-visual equivalents

### Color Palette Summary

#### Encounter
- Primary: `#E8913A` (amber)
- Secondary: `#C26E3A` (terracotta)
- Background: `#1C1612` (dark warm)

#### Analysis
- Primary: `#4A9EDE` (steel blue)
- Secondary: `#3B7BBE` (medium blue)
- Background: `#0F1419` (dark cool)
- Correct: `#4CAF82` (success green)
- Incorrect: `#D4845A` (warm amber, not harsh red)

#### Return
- Primary: `#D4724A` (deep coral)
- Secondary: `#A85C8A` (warm mauve)
- Background: `#18121C` (dark purple-warm)

### Typography

- **Encounter/Return**: Source Serif 4 (serif, humanistic)
- **Analysis**: Inter (sans-serif, geometric)
- **Display**: Source Serif 4 (all stages)
- **Mono**: JetBrains Mono (code/formulas)

### Spacing Scale

Base unit: 4px

- `space-1`: 4px
- `space-2`: 8px
- `space-3`: 12px
- `space-4`: 16px
- `space-5`: 20px
- `space-6`: 24px
- `space-8`: 32px
- `space-10`: 40px
- `space-12`: 48px
- `space-16`: 64px
- `space-20`: 80px
- `space-24`: 96px

### Animation Principles

#### Encounter Motion
- Easing: `cubic-bezier(0.25, 0.46, 0.45, 0.94)`
- Duration: 400-800ms
- Character: Slow, organic, flowing

#### Analysis Motion
- Easing: `cubic-bezier(0.4, 0.0, 0.2, 1)`
- Duration: 150-300ms
- Character: Quick, precise, mechanical

#### Return Motion
- Easing: `cubic-bezier(0.22, 0.61, 0.36, 1)`
- Duration: 500-1000ms
- Character: Slowest, contemplative

### Stage Transitions

Transitions between stages take 1.5-2 seconds with crossfades:

```tsx
className="stage-transition"
```

This applies smooth transitions for:
- Background color
- Text color
- Font family
- All other stage-aware properties

## Development

### Install Dependencies

```bash
pnpm install
```

### Run Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

### Build for Production

```bash
pnpm build
pnpm start
```

### Type Check

```bash
pnpm typecheck
```

## Architecture

- **Framework**: Next.js 15 (App Router, React Server Components)
- **Styling**: Tailwind CSS 3.4 + CSS Custom Properties
- **TypeScript**: Strict mode enabled
- **Fonts**: Source Serif 4, Inter, JetBrains Mono

## References

- Design system spec: `/docs/design/04-ui-ux-design.md`
- Instructional design: `/docs/design/03-instructional-design.md`
- Neuroscience foundation: `/docs/research/01-neuroscience-foundation.md`
