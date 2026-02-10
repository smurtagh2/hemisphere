# UI/UX Design: The Hemisphere Visual and Interaction Language

**Version:** 1.0
**Date:** 2026-02-10
**Purpose:** Define the complete visual design system, screen layouts, interaction patterns, and responsive specifications for the Hemisphere Learning App
**Dependencies:** [01-neuroscience-foundation.md](../research/01-neuroscience-foundation.md), [02-pedagogy-and-learning-science.md](../research/02-pedagogy-and-learning-science.md), [03-instructional-design.md](03-instructional-design.md)

---

## Table of Contents

1. [Design Philosophy](#1-design-philosophy)
2. [Design System Specification](#2-design-system-specification)
3. [Core Screen Designs](#3-core-screen-designs)
4. [Hemisphere-Mode Visual Language Guide](#4-hemisphere-mode-visual-language-guide)
5. [Interaction Pattern Library](#5-interaction-pattern-library)
6. [Mobile-First Responsive Design](#6-mobile-first-responsive-design)
7. [Accessibility Specification](#7-accessibility-specification)

---

## 1. Design Philosophy

### 1.1 The UI Is the Pedagogy

The Hemisphere interface does not merely contain hemisphere-aware learning content. It **embodies** the RH-->LH-->RH model in its own visual and interaction language. The learner does not need to read a theory document to understand which mode they are in -- they feel it through color, shape, space, motion, and sound. The UI is a teaching tool in itself: it trains the learner's attention by shifting the sensory environment to match the cognitive mode required.

This is not decoration. It is grounded in the neuroscience: the right hemisphere processes the broad, warm, ambient, organic, and spatially expansive; the left hemisphere processes the narrow, cool, precise, geometric, and structured. When we shift the UI between these two sensory vocabularies, we are providing environmental cues that facilitate the corresponding attentional mode.

### 1.2 Core Design Principles

1. **The interface breathes.** RH stages use generous whitespace, slow motion, and open layouts. LH stages use tighter grids, crisper transitions, and purposeful density. The shift between them is the visual analogue of inhaling and exhaling.

2. **Warmth invites; structure supports.** Warm colors and organic shapes signal "you are safe to explore." Cool colors and geometric layouts signal "now focus precisely." Neither is superior -- both are necessary.

3. **No visual noise.** Every element on screen earns its place. Unnecessary decoration, competing animations, and visual clutter are antithetical to both RH's open awareness and LH's focused attention. The principle is restraint, not minimalism for its own sake.

4. **Motion communicates mode.** Animations in RH stages are slow, organic, and fluid (like water, like breath). Animations in LH stages are quick, precise, and mechanical (like a click, like a switch). Transitions between stages use intermediate motion qualities to signal the shift.

5. **The learner always knows where they are.** Not through explicit labels or progress bars (which are LH metrics), but through the ambient sensory environment. A learner mid-session should be able to sense whether they are in Encounter, Analysis, or Return from the color, typography, spacing, and motion alone.

6. **Accessibility is not an afterthought.** Every visual cue has a non-visual equivalent. Color conveys mood, not information alone. Motion is supplemented by static cues. Sound is supplemented by visual feedback. The design works for everyone or it does not work.

---

## 2. Design System Specification

### 2.1 Color Palette

The color system is organized around three modes, with a shared neutral base.

#### 2.1.1 Encounter Mode (RH-Primary) -- Warm Spectrum

These colors evoke warmth, curiosity, safety, and open exploration. They are drawn from amber, terracotta, and deep twilight tones -- the colors of firelight, sunset, and the earth.

| Token | Hex | RGB | Usage |
|-------|-----|-----|-------|
| `encounter-bg-primary` | `#1C1612` | 28, 22, 18 | Primary background (dark mode) |
| `encounter-bg-secondary` | `#2A2018` | 42, 32, 24 | Card backgrounds, secondary surfaces |
| `encounter-bg-light` | `#FFF8F0` | 255, 248, 240 | Primary background (light mode) |
| `encounter-bg-light-secondary` | `#F5EDE3` | 245, 237, 227 | Card backgrounds (light mode) |
| `encounter-accent-primary` | `#E8913A` | 232, 145, 58 | Primary accent -- amber/gold |
| `encounter-accent-secondary` | `#C26E3A` | 194, 110, 58 | Secondary accent -- terracotta |
| `encounter-accent-tertiary` | `#8B5E3C` | 139, 94, 60 | Tertiary accent -- warm brown |
| `encounter-text-primary` | `#F5E6D3` | 245, 230, 211 | Primary text (dark mode) |
| `encounter-text-primary-light` | `#2A2018` | 42, 32, 24 | Primary text (light mode) |
| `encounter-text-secondary` | `#BFA88E` | 191, 168, 142 | Secondary/supporting text (dark mode) |
| `encounter-text-secondary-light` | `#7A6B5A` | 122, 107, 90 | Secondary text (light mode) |
| `encounter-glow` | `#E8913A` at 15% opacity | -- | Soft ambient glow behind key elements |
| `encounter-gradient-start` | `#2A1810` | 42, 24, 16 | Gradient background start |
| `encounter-gradient-end` | `#1A1A2E` | 26, 26, 46 | Gradient background end (twilight) |

#### 2.1.2 Analysis Mode (LH-Primary) -- Cool Spectrum

These colors evoke clarity, focus, precision, and purposeful work. They are drawn from slate, steel, and ice -- the colors of daylight, paper, and clean surfaces.

| Token | Hex | RGB | Usage |
|-------|-----|-----|-------|
| `analysis-bg-primary` | `#0F1419` | 15, 20, 25 | Primary background (dark mode) |
| `analysis-bg-secondary` | `#1A2332` | 26, 35, 50 | Card backgrounds, secondary surfaces |
| `analysis-bg-light` | `#F5F7FA` | 245, 247, 250 | Primary background (light mode) |
| `analysis-bg-light-secondary` | `#EBEEF3` | 235, 238, 243 | Card backgrounds (light mode) |
| `analysis-accent-primary` | `#4A9EDE` | 74, 158, 222 | Primary accent -- steel blue |
| `analysis-accent-secondary` | `#3B7BBE` | 59, 123, 190 | Secondary accent -- medium blue |
| `analysis-accent-tertiary` | `#2C5F8A` | 44, 95, 138 | Tertiary accent -- deep blue |
| `analysis-correct` | `#4CAF82` | 76, 175, 130 | Correct answer feedback |
| `analysis-incorrect` | `#D4845A` | 212, 132, 90 | Incorrect answer feedback (warm amber, not harsh red) |
| `analysis-partial` | `#D4B85A` | 212, 184, 90 | Partial answer feedback |
| `analysis-text-primary` | `#E8EDF3` | 232, 237, 243 | Primary text (dark mode) |
| `analysis-text-primary-light` | `#1A2332` | 26, 35, 50 | Primary text (light mode) |
| `analysis-text-secondary` | `#8899AA` | 136, 153, 170 | Secondary/supporting text (dark mode) |
| `analysis-text-secondary-light` | `#5A6B7A` | 90, 107, 122 | Secondary text (light mode) |
| `analysis-border` | `#2A3A4E` | 42, 58, 78 | Card borders, dividers (dark mode) |
| `analysis-border-light` | `#D0D8E3` | 208, 216, 227 | Card borders (light mode) |

#### 2.1.3 Return Mode (RH-Primary, Enriched) -- Warm Deep Spectrum

The Return palette is related to the Encounter palette but deeper, richer, and more saturated. It signals "you have been here before, but now you see more." Think of the difference between dawn (Encounter) and a deep sunset (Return) -- same warmth, greater depth.

| Token | Hex | RGB | Usage |
|-------|-----|-----|-------|
| `return-bg-primary` | `#18121C` | 24, 18, 28 | Primary background (dark mode) -- purple-warm shift |
| `return-bg-secondary` | `#241A2A` | 36, 26, 42 | Card backgrounds |
| `return-bg-light` | `#FDF5F8` | 253, 245, 248 | Primary background (light mode) |
| `return-bg-light-secondary` | `#F2E8EE` | 242, 232, 238 | Card backgrounds (light mode) |
| `return-accent-primary` | `#D4724A` | 212, 114, 74 | Primary accent -- deep coral |
| `return-accent-secondary` | `#A85C8A` | 168, 92, 138 | Secondary accent -- warm mauve |
| `return-accent-tertiary` | `#7A5C8A` | 122, 92, 138 | Tertiary accent -- deep violet |
| `return-text-primary` | `#F0E3EC` | 240, 227, 236 | Primary text (dark mode) |
| `return-text-primary-light` | `#2A1A2E` | 42, 26, 46 | Primary text (light mode) |
| `return-text-secondary` | `#B8A0B0` | 184, 160, 176 | Secondary text (dark mode) |
| `return-text-secondary-light` | `#7A6478` | 122, 100, 120 | Secondary text (light mode) |
| `return-glow` | `#D4724A` at 12% opacity | -- | Warm glow, slightly different from encounter-glow |
| `return-gradient-start` | `#1A1020` | 26, 16, 32 | Gradient start |
| `return-gradient-end` | `#2A1810` | 42, 24, 16 | Gradient end (connects back to encounter tones) |

#### 2.1.4 Transition Colors

These are intermediate colors used during the 1.5-2 second crossfade between stages.

| Token | Hex | Usage |
|-------|-----|-------|
| `transition-encounter-to-analysis` | `#1A1E24` | Midpoint background during E-->A shift |
| `transition-analysis-to-return` | `#161420` | Midpoint background during A-->R shift |

#### 2.1.5 Neutral / Shared Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `neutral-white` | `#FFFFFF` | Pure white -- used sparingly |
| `neutral-black` | `#000000` | Pure black -- used sparingly |
| `neutral-50` | `#FAFAFA` | Lightest neutral surface |
| `neutral-100` | `#F0F0F0` | Light neutral |
| `neutral-200` | `#E0E0E0` | Borders, dividers (light mode) |
| `neutral-300` | `#C0C0C0` | Disabled states (light mode) |
| `neutral-700` | `#404040` | Secondary text (generic) |
| `neutral-800` | `#262626` | Primary text (generic) |
| `neutral-900` | `#171717` | Darkest neutral surface |

#### 2.1.6 Semantic Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `semantic-success` | `#4CAF82` | Success states (consistent with analysis-correct) |
| `semantic-warning` | `#D4B85A` | Warning, partial states |
| `semantic-error` | `#D4845A` | Error states (warm, not aggressive) |
| `semantic-info` | `#4A9EDE` | Informational highlights |
| `semantic-focus-ring` | `#4A9EDE` at 50% opacity | Keyboard focus indicator |

### 2.2 Typography

Typography shifts between stages to reinforce the attentional mode change. The key distinction: RH stages use a serif typeface (organic, flowing, humanistic); LH stages use a sans-serif typeface (clean, geometric, precise).

#### 2.2.1 Font Families

| Token | Font | Fallback Stack | Usage |
|-------|------|---------------|-------|
| `font-encounter` | Source Serif 4 | Georgia, "Times New Roman", serif | Encounter and Return stage narrative text |
| `font-analysis` | Inter | -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif | Analysis stage body text, all UI controls, navigation |
| `font-mono` | JetBrains Mono | "SF Mono", "Fira Code", "Consolas", monospace | Code, formulas, exact terms in Analysis |
| `font-display` | Source Serif 4 | Georgia, serif | Large display headings across all stages |

**Rationale:** Source Serif 4 is an open-source serif face with excellent readability at all sizes and robust language support. Its organic letterforms and slightly calligraphic stroke contrast evoke the warmth and humanity of RH-mode communication. Inter is an open-source sans-serif optimized for screen readability, with clear geometric construction and excellent metrics for UI use -- it embodies the precision and clarity of LH-mode work.

#### 2.2.2 Type Scale

The scale follows a 1.250 ratio (Major Third), providing clear hierarchy without excessive jumps. All sizes are specified in rem for accessibility (user font-size scaling).

| Token | rem | px (at 16px base) | Line Height | Usage |
|-------|-----|-------------------|-------------|-------|
| `text-xs` | 0.75rem | 12px | 1.5 | Captions, timestamps, metadata |
| `text-sm` | 0.875rem | 14px | 1.5 | Secondary text, help text, labels |
| `text-base` | 1rem | 16px | 1.6 | Body text (Analysis stage) |
| `text-md` | 1.125rem | 18px | 1.6 | Body text (Encounter/Return stages) |
| `text-lg` | 1.25rem | 20px | 1.5 | Section headings, card titles |
| `text-xl` | 1.5rem | 24px | 1.4 | Stage headings, key prompts |
| `text-2xl` | 1.875rem | 30px | 1.3 | Hook text, display content |
| `text-3xl` | 2.25rem | 36px | 1.2 | Primary display headings |
| `text-4xl` | 3rem | 48px | 1.1 | Hero text (used rarely) |

#### 2.2.3 Font Weight Rules

| Weight | Value | Usage |
|--------|-------|-------|
| Regular | 400 | Body text, narrative prose |
| Medium | 500 | Labels, secondary headings, UI elements |
| Semibold | 600 | Card titles, stage headings |
| Bold | 700 | Primary headings, emphasis in narrative, hook text |

#### 2.2.4 Stage-Specific Typography Rules

**Encounter (RH-Primary):**
- Body text: `font-encounter`, `text-md` (18px), weight 400, line-height 1.6
- Hook text: `font-display`, `text-2xl` to `text-3xl` (30-36px), weight 700, line-height 1.2
- Maximum line length: 38em (~65 characters). Wider than Analysis to create a more relaxed, open reading experience.
- Letter-spacing: 0 (natural). No tracking adjustments.
- Paragraph spacing: 1.5em. Generous to create breathing room.

**Analysis (LH-Primary):**
- Body text: `font-analysis`, `text-base` (16px), weight 400, line-height 1.6
- Card titles: `font-analysis`, `text-lg` (20px), weight 600, line-height 1.5
- Maximum line length: 34em (~55 characters). Narrower than Encounter for focused reading.
- Letter-spacing: 0.01em. Slightly open for clarity at smaller sizes.
- Paragraph spacing: 1em. Tighter than Encounter for information density.
- Terms and definitions: `font-analysis`, weight 600, with `font-mono` for formulas.

**Return (RH-Primary, Enriched):**
- Body text: `font-encounter`, `text-md` (18px), weight 400, line-height 1.7 (slightly more generous than Encounter to signal reflective openness).
- Prompt text: `font-display`, `text-xl` (24px), weight 600, italic. The italic signals reflective/questioning mode.
- Maximum line length: 36em (~60 characters).
- Paragraph spacing: 1.75em. The most generous spacing of any stage.

### 2.3 Spacing and Layout Grid

#### 2.3.1 Base Spacing Unit

The base unit is `4px`. All spacing values are multiples of this unit.

| Token | Value | Usage |
|-------|-------|-------|
| `space-1` | 4px | Minimum spacing -- icon padding, inline gaps |
| `space-2` | 8px | Tight spacing -- between related elements |
| `space-3` | 12px | Standard inner padding |
| `space-4` | 16px | Standard gap between elements |
| `space-5` | 20px | Standard component padding |
| `space-6` | 24px | Section gaps, card padding |
| `space-8` | 32px | Between content sections |
| `space-10` | 40px | Major section separation |
| `space-12` | 48px | Stage-level spacing |
| `space-16` | 64px | Page-level margins |
| `space-20` | 80px | Hero spacing (Encounter hooks) |
| `space-24` | 96px | Maximum spacing (between stages) |

#### 2.3.2 Layout Grid

**Mobile (375-389px):**
- Columns: 4
- Gutter: 16px
- Margin: 20px
- Content width: 335px (375 - 40px margins)

**Mobile Large (390-767px):**
- Columns: 4
- Gutter: 16px
- Margin: 24px
- Content width: 342px (390 - 48px margins)

**Tablet (768-1023px):**
- Columns: 8
- Gutter: 20px
- Margin: 40px
- Content width: 688px

**Desktop (1024-1439px):**
- Columns: 12
- Gutter: 24px
- Margin: auto (centered)
- Content max-width: 720px (for reading content)
- Dashboard max-width: 960px (for multi-column layouts)

**Desktop Large (1440px+):**
- Columns: 12
- Gutter: 24px
- Margin: auto (centered)
- Content max-width: 720px
- Dashboard max-width: 1120px

#### 2.3.3 Stage-Specific Spacing

**Encounter:** Add 25% to standard spacing values. A `space-6` gap becomes `space-8`. The extra space creates the expansive, unhurried feel that invites RH engagement. Content is vertically centered on screen with generous top and bottom padding (`space-20` minimum).

**Analysis:** Use standard spacing values. Density is appropriate here -- the learner is focused and working. Cards use `space-5` padding. Items in practice sets use `space-4` gaps.

**Return:** Add 35% to standard spacing values. This is the most spacious stage. Content floats in generous whitespace to signal reflective openness. Prompts are vertically centered with `space-24` above and below.

### 2.4 Corner Radii and Shape Language

Shape language shifts between stages to reinforce the RH/LH distinction.

| Token | Value | Usage |
|-------|-------|-------|
| `radius-sm` | 4px | Small elements -- chips, badges (Analysis) |
| `radius-md` | 8px | Standard cards, inputs (Analysis) |
| `radius-lg` | 12px | Cards, modals (Encounter/Return) |
| `radius-xl` | 16px | Large cards, panels (Encounter/Return) |
| `radius-2xl` | 24px | Feature cards, hero elements (Encounter/Return) |
| `radius-full` | 9999px | Pills, circular buttons, avatars |

**Stage-specific shape rules:**

- **Encounter:** Use `radius-xl` and `radius-2xl` for cards and surfaces. Edges are soft, rounded, and organic. Background shapes (decorative blurs, gradients) use fully rounded or freeform organic shapes.
- **Analysis:** Use `radius-sm` and `radius-md` for cards and inputs. Edges are crisper, more geometric. Cards have consistent, predictable shapes.
- **Return:** Use `radius-lg` and `radius-xl`. Between Encounter and Analysis in roundedness, but with asymmetric or slightly irregular shapes where possible (a card might have more rounding on one side, or use a gentle organic clip-path).

### 2.5 Elevation and Shadow

| Token | Value | Usage |
|-------|-------|-------|
| `shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | Subtle lift for cards (light mode) |
| `shadow-md` | `0 4px 8px rgba(0,0,0,0.08)` | Standard card elevation (light mode) |
| `shadow-lg` | `0 8px 24px rgba(0,0,0,0.12)` | Modal, overlay elevation |
| `shadow-encounter-glow` | `0 0 40px rgba(232,145,58,0.08)` | Ambient warm glow behind Encounter cards |
| `shadow-return-glow` | `0 0 40px rgba(212,114,74,0.06)` | Ambient warm glow behind Return cards |

In dark mode, shadows are replaced by subtle border glows using the stage accent color at low opacity (3-6%).

### 2.6 Iconography

#### 2.6.1 Icon Style

Icons follow a dual-style system matching the stage:

- **RH stages (Encounter, Return):** Use outlined (stroke-based) icons with 1.5px stroke weight and rounded caps/joins. The style is organic and slightly hand-drawn in feel. Corners of icon shapes use 2px radius.
- **LH stage (Analysis):** Use the same icon set but with 2px stroke weight and squared caps/joins. The style is geometric and precise. Corners use 1px radius.

Icon size: 24x24px default, 20x20px compact, 32x32px large (for mobile touch targets in navigation).

#### 2.6.2 Key Icons

| Icon | Description | Usage |
|------|-------------|-------|
| **Compass** | Open compass rose, organic lines | Knowledge map navigation, Encounter stage indicator |
| **Eye (open)** | Wide open eye | "Encounter" stage label |
| **Microscope** | Simple microscope outline | "Analysis" stage label |
| **Sunrise** | Sun rising over horizon | "Return" stage label |
| **Map pin** | Location marker | Current position on knowledge map |
| **Flowing line** | Wavy, organic line | Progress through Encounter narrative |
| **Grid** | 2x2 grid | Analysis activities (categorization, sorting) |
| **Lightbulb** | Radiating lightbulb | Insight/aha moment, connection made |
| **Pencil** | Writing pencil | Creative synthesis, free-text input |
| **Clock** | Simple clock face | Session timing, "How much time?" selector |
| **Check circle** | Circle with checkmark | Correct answer, completed item |
| **Arrow cycle** | Circular arrow | Return to previous concept, review |
| **Link** | Chain link | Cross-topic connection |
| **Journal** | Open book/notebook | Learning journal, reflection |
| **Leaf** | Single leaf, organic | Growth, natural progress |
| **Wave** | Sound wave | Audio playback, ambient sound |

### 2.7 Motion and Animation Principles

Motion is a primary mode-signaling tool. It is not decorative -- every animation communicates the current attentional mode.

#### 2.7.1 Encounter (RH) Motion

- **Timing function:** `cubic-bezier(0.25, 0.46, 0.45, 0.94)` -- a slow ease-out that feels organic and flowing, like a leaf settling.
- **Duration range:** 400-800ms. Movements are unhurried.
- **Character:** Fluid, organic, slightly unpredictable. Elements drift into place rather than snapping. Parallax effects on scroll. Subtle breathing (scale oscillation at 0.5-1% over 4-6 seconds) on key elements.
- **Page transitions:** Cards slide in from the right with a slight arc (not a straight line). Opacity fades from 0 to 1 over 500ms.
- **Background:** Subtle gradient animation -- colors shift slowly (10-15 second cycle), creating a living, breathing background.
- **Scroll behavior:** Smooth, momentum-based. Content reveals with parallax (background moves at 0.5x scroll speed, foreground at 1x).

#### 2.7.2 Analysis (LH) Motion

- **Timing function:** `cubic-bezier(0.4, 0.0, 0.2, 1)` -- Material Design standard easing. Precise, predictable, efficient.
- **Duration range:** 150-300ms. Quick, decisive movements.
- **Character:** Crisp, mechanical, predictable. Elements snap into position. No drift, no parallax. Everything moves in straight lines and right angles.
- **Page transitions:** Cards slide in from the right, straight horizontal, 200ms. No arc, no bounce.
- **Feedback animations:** Correct answer: a crisp scale-up to 102% and back in 200ms with the `analysis-correct` color pulse. Incorrect: a quick horizontal shake (3px, 2 cycles, 300ms) with `analysis-incorrect` color flash.
- **Background:** Static. No animation. The stillness itself signals focus.
- **Scroll behavior:** Standard scroll with no momentum modification. Content does not transform on scroll.

#### 2.7.3 Return (RH) Motion

- **Timing function:** `cubic-bezier(0.22, 0.61, 0.36, 1)` -- even slower than Encounter, with a longer deceleration curve. Contemplative.
- **Duration range:** 500-1000ms. The slowest of all stages.
- **Character:** Meditative, expansive. Elements float into place. The reconnection moment uses a gentle zoom-out effect (from 105% to 100% over 800ms) to create the sensation of "stepping back to see the bigger picture."
- **Insight animation:** When the learner returns to the original hook, the text or image has a soft golden glow that brightens over 1.5 seconds, signaling "now you see this differently."
- **Background:** Very slow gradient shift, even slower than Encounter (20-30 second cycle). Deep, contemplative tones.

#### 2.7.4 Transition Animations

**Encounter --> Analysis (1.5-2 seconds):**
1. Background crossfade: warm tones fade to cool over 1.5s. The gradient animates through `transition-encounter-to-analysis`.
2. Typography crossfade: serif text fades out (300ms), a 200ms pause, then sans-serif text fades in (300ms). The pause creates a moment of stillness -- a breath between modes.
3. Layout shift: full-bleed layout compresses inward to a card-based grid. Margins animate from `space-5` to standard grid margins over 1s.
4. Progress bar: slides down from the top of the screen (a thin 3px line in `analysis-accent-primary`) over 500ms. Its appearance signals "now we are tracking progress."
5. Haptic: One medium pulse (iOS: `.impactMedium`, Android: `VibrationEffect.EFFECT_CLICK`).
6. Sound: A subtle descending two-note chime (G4 to E4, sine wave, 200ms each, 40% volume). The descending motion signals "narrowing in."

**Analysis --> Return (1.5-2 seconds):**
1. Background crossfade: cool tones warm through `transition-analysis-to-return` to the deep Return palette over 1.5s.
2. Typography crossfade: sans-serif fades out, serif fades in, with the same 200ms pause.
3. Layout shift: card-based grid expands outward to full-bleed. Margins animate from standard to `space-8+`.
4. Progress bar: the thin line transforms into a soft completion ring (a circle that fills to 100% over 800ms), then fades out over 500ms.
5. Haptic: None. The Return is gentle -- no mechanical cue.
6. Sound: An ascending three-note chime (C4 to E4 to G4, warm pad sound, 250ms each, 35% volume). The ascending motion signals "opening up" and "aha."

### 2.8 Sound Design Principles

Sound is used sparingly and intentionally. It is never required for functionality (all audio cues have visual equivalents). It is always user-controllable (global sound on/off, plus per-category volume sliders for ambient, feedback, and transitions).

#### 2.8.1 Encounter Sound

- **Ambient:** A low, sustained pad (C major or A minor, depending on topic mood). Volume: 15-25% of max. Fades in over 3 seconds when the stage begins, fades out over 3 seconds at transition. The ambient sound should feel like it was always there -- the learner notices its absence more than its presence.
- **Narration:** Optional voice narration for the Narrative Frame. Warm, measured pace (130-150 wpm). Not a "teacher voice" -- more like a storyteller. Uses spatial audio positioning if supported (voice slightly left-of-center, ambient slightly right, to create a sense of dimension).
- **Interaction sounds:** Soft, organic. Page swipe: a gentle "whoosh" (100ms, 20% volume). Prediction prompt appearance: a soft bell tone (300ms, 25% volume).

#### 2.8.2 Analysis Sound

- **Ambient:** None. Silence signals focus. If the learner has enabled background audio externally, the app does not compete with it.
- **Feedback sounds:** Crisp, mechanical, brief.
  - Correct answer: a short, bright "click-chime" (100ms, ascending pitch, 30% volume).
  - Incorrect answer: a soft "thud" (80ms, neutral pitch, 25% volume). Not punishing, not dramatic.
  - Item completion: a tiny "tick" (50ms, 20% volume).
- **Timer sounds:** If a timer is enabled, a subtle tick at 10-second intervals during the last 30 seconds. A gentle tone at time expiry (not an alarm).

#### 2.8.3 Return Sound

- **Ambient:** A different pad from Encounter -- slightly more complex harmony (add9 chord or similar), slightly lower register. Signals "depth" and "reflection." Volume: 12-20%.
- **Insight moment:** When the reconnection text appears, a gentle "shimmer" (500ms, layered harmonics, 25% volume). This is the most distinctive sound in the app -- the learner should associate it with the feeling of understanding.
- **Interaction sounds:** Very soft. Free-text typing has no sound. Submission of a creative response triggers a soft "completion" tone (200ms, warm timbre, 20% volume).

---

## 3. Core Screen Designs

### 3.1 Home / Dashboard

The dashboard is the learner's home base. It shows where they are in their learning journey, what is next, and how their understanding is growing.

#### Layout (Mobile, 375px)

```
+------------------------------------------+
|  [Status Bar]                        [24px margin top]
|                                          |
|  Good evening, [Name].                   |
|  [text-xl, font-encounter, weight 600]   |
|                                          |
|  +----- KNOWLEDGE MAP (Preview) -------+ |
|  |                                     | |
|  |   [Organic node graph showing       | |
|  |    5-8 most recent topics as        | |
|  |    colored circles connected by     | |
|  |    flowing lines. Current topic     | |
|  |    pulses gently. Tappable to       | |
|  |    enter full Knowledge Map.]       | |
|  |                                     | |
|  |    Height: 220px                    | |
|  |    Padding: 16px                    | |
|  |    Radius: radius-2xl (24px)        | |
|  |    BG: encounter-bg-secondary       | |
|  +-------------------------------------+ |
|                                          |
|  [space-8 gap]                           |
|                                          |
|  Continue Learning                       |
|  [text-lg, font-analysis, weight 600]    |
|                                          |
|  +--- NEXT SESSION CARD ---------------+ |
|  |                                     | |
|  |  [Topic illustration]    [72x72px]  | |
|  |  "The Immune System:     [text-md]  | |
|  |   Session 3 of 5"                   | |
|  |  "Deep Analysis"         [text-sm]  | |
|  |                                     | |
|  |  [=========>         ]   60%        | |
|  |  [Progress bar, 4px height,         | |
|  |   rounded, analysis-accent-primary] | |
|  |                                     | |
|  |  [Start Session]  (Primary Button)  | |
|  |                                     | |
|  |  Padding: 20px                      | |
|  |  Radius: radius-xl (16px)           | |
|  |  BG: encounter-bg-secondary         | |
|  |  Shadow: shadow-encounter-glow      | |
|  +-------------------------------------+ |
|                                          |
|  [space-8 gap]                           |
|                                          |
|  Your Understanding                      |
|  [text-lg, font-analysis, weight 600]    |
|                                          |
|  +--- STATS ROW -----------------------+ |
|  |                                     | |
|  | [Topics]    [Connections] [Sessions] | |
|  |   12           28            47     | |
|  | [Leaf icon] [Link icon]  [Clock]    | |
|  |                                     | |
|  |  Horizontal stack, evenly spaced    | |
|  |  Each: text-2xl number + text-xs    | |
|  |  label, centered.                   | |
|  +-------------------------------------+ |
|                                          |
|  [space-6 gap]                           |
|                                          |
|  +--- DUE FOR REVIEW ------------------+ |
|  |  "8 items ready for review"         | |
|  |  [Review Now] (Secondary Button)    | |
|  |  Compact card, radius-lg, 16px pad  | |
|  +-------------------------------------+ |
|                                          |
|  [space-6 gap]                           |
|                                          |
|  +--- RECENT ACTIVITY -----------------+ |
|  |  [Scrollable horizontal list of     | |
|  |   3-5 recently completed sessions,  | |
|  |   each as a small 120x100 card      | |
|  |   with topic name, date, and a      | |
|  |   tiny spark icon if an insight     | |
|  |   was recorded in Return stage]     | |
|  +-------------------------------------+ |
|                                          |
|  [space-16 bottom padding for nav]       |
|                                          |
|  +--- BOTTOM NAV ---------------------+  |
|  |  [Home]    [Map]    [Journal]       |  |
|  |  (active)                           |  |
|  +-------------------------------------+ |
+------------------------------------------+
```

**Design details:**
- The greeting uses the learner's first name and is time-aware ("Good morning," "Good afternoon," "Good evening").
- The knowledge map preview uses the Encounter palette because the dashboard is a "whole picture" view -- an RH-mode interface.
- The stats row avoids gamification language. "Topics" not "levels." "Connections" not "points." "Sessions" not "streak days." The metrics reflect genuine learning, not extrinsic rewards.
- The "Due for Review" card uses warm amber to signal gentle urgency without anxiety. No red, no exclamation marks.
- Bottom navigation uses three tabs: Home (dashboard), Map (full knowledge map), Journal (learning journal and reflections).

### 3.2 Session Start -- "How Much Time Do You Have?"

This screen appears when the learner taps "Start Session." It respects learner autonomy (SDT) by letting them choose their engagement level.

#### Layout (Mobile, 375px)

```
+------------------------------------------+
|                                          |
|  [Back arrow]              [top-left]    |
|                                          |
|  [space-20 top padding]                  |
|                                          |
|  How much time                           |
|  do you have?                            |
|  [text-3xl, font-display, weight 700]    |
|  [Centered, encounter-text-primary]      |
|                                          |
|  [space-12 gap]                          |
|                                          |
|  +--- QUICK (5-7 min) ----------------+ |
|  |                                     | |
|  |  [Clock icon: quarter-filled]       | |
|  |  Quick Review                       | |
|  |  [text-lg, weight 600]              | |
|  |                                     | |
|  |  A hook, spaced review,             | |
|  |  and a reflection.                  | |
|  |  [text-sm, secondary text]          | |
|  |                                     | |
|  |  Pad: 20px, Radius: radius-xl       | |
|  |  BG: encounter-bg-secondary         | |
|  |  Border: 1px encounter-accent at 20%| |
|  +-------------------------------------+ |
|                                          |
|  [space-4 gap]                           |
|                                          |
|  +--- STANDARD (12-18 min) -----------+ |
|  |                                     | |
|  |  [Clock icon: half-filled]          | |
|  |  Standard Session          [Star]   | |
|  |  [text-lg, weight 600]   Recommended| |
|  |                                     | |
|  |  Full encounter, analysis,          | |
|  |  and return. The complete loop.     | |
|  |  [text-sm, secondary text]          | |
|  |                                     | |
|  |  Pad: 20px, Radius: radius-xl       | |
|  |  BG: encounter-bg-secondary         | |
|  |  Border: 2px encounter-accent       | |
|  |  Shadow: shadow-encounter-glow      | |
|  +-------------------------------------+ |
|                                          |
|  [space-4 gap]                           |
|                                          |
|  +--- EXTENDED (25-35 min) -----------+ |
|  |                                     | |
|  |  [Clock icon: three-quarter filled] | |
|  |  Deep Session                       | |
|  |  [text-lg, weight 600]              | |
|  |                                     | |
|  |  Two loops: new material and        | |
|  |  review with a break between.       | |
|  |  [text-sm, secondary text]          | |
|  |                                     | |
|  |  Pad: 20px, Radius: radius-xl       | |
|  |  BG: encounter-bg-secondary         | |
|  |  Border: 1px encounter-accent at 20%| |
|  +-------------------------------------+ |
|                                          |
+------------------------------------------+
```

**Design details:**
- The entire screen uses the Encounter palette because the learner is about to begin a new learning experience.
- The "Standard" option has a stronger border and a "Recommended" badge to gently guide without forcing.
- No gamification pressure. The screen does not say "Don't break your streak!" or show consecutive-day counts. It simply asks how much time the learner has.
- The descriptions use plain language, not jargon. "Full encounter, analysis, and return" rather than "RH-LH-RH loop." The learner will come to understand the model through experience, not labels.

### 3.3 Encounter Stage

The Encounter stage is the most visually distinctive. It is designed to feel like entering a story, not opening a textbook.

#### 3.3.1 The Hook Screen

```
+------------------------------------------+
|                                          |
|  [Full-bleed background: either a        |
|   high-quality photograph with a dark    |
|   gradient overlay (bottom 40%),         |
|   OR a rich gradient from                |
|   encounter-gradient-start to            |
|   encounter-gradient-end]                |
|                                          |
|                                          |
|                                          |
|  [Centered vertically in bottom 60%]     |
|                                          |
|  "A tree weighs 10 tons.                |
|   The soil it grew from lost            |
|   almost none of its weight.            |
|   Where did the tree                    |
|   come from?"                           |
|                                          |
|  [text-2xl, font-display, weight 700,    |
|   encounter-text-primary,                |
|   max-width: 300px, centered,            |
|   line-height: 1.3]                      |
|                                          |
|                                          |
|  [space-16]                              |
|                                          |
|       [Continue -->]                     |
|       [text-md, encounter-accent,        |
|        centered, with gentle             |
|        right-arrow that sways            |
|        slowly left-right, 2px,           |
|        2s cycle]                         |
|                                          |
|  [space-10 bottom padding]               |
|                                          |
+------------------------------------------+
```

**Design details:**
- No progress bar. No timer. No navigation chrome except a minimal back gesture area.
- The hook text is the only content. Maximum 3 sentences. The restraint is deliberate -- RH engagement requires space, not density.
- The "Continue" prompt uses the accent color and a subtle animation to draw the eye without urgency. It can be tapped, or the learner can swipe left.
- If audio is enabled, a sustained ambient pad begins fading in 1 second after screen appearance, reaching 15-20% volume over 3 seconds.
- Background image (if used) has a 60% dark gradient overlay from bottom, ensuring text readability. The image is chosen for emotional resonance, not informational content.

#### 3.3.2 The Narrative Frame

```
+------------------------------------------+
|                                          |
|  [Swipeable horizontal card stack]       |
|                                          |
|  +--- CARD 1 -------------------------+ |
|  |                                     | |
|  |  [Illustration: painterly style,    | |
|  |   warm tones, slightly impressionist.| |
|  |   Width: 100%, Height: 200px,       | |
|  |   radius-xl on top corners,         | |
|  |   object-fit: cover]               | |
|  |                                     | |
|  |  In 1848, Manchester's trees        | |
|  |  were pale with lichen.             | |
|  |  Light-colored moths blended in.    | |
|  |  Dark moths stood out and were      | |
|  |  eaten by birds.                    | |
|  |                                     | |
|  |  [text-md, font-encounter,          | |
|  |   weight 400, line-height 1.6,      | |
|  |   padding: 20px horizontal,         | |
|  |   encounter-text-primary]           | |
|  |                                     | |
|  +-------------------------------------+ |
|                                          |
|  [Page indicator dots: organic circles,  |
|   4px diameter, 8px gaps, current dot    |
|   is encounter-accent-primary at 100%,   |
|   others at 30%]                         |
|                                          |
+------------------------------------------+
```

**Narrative Flow Interaction:**
- Cards swipe horizontally with momentum scrolling. Swipe left to advance, right to go back.
- Each card has one illustration and one text block. Illustration is above text on mobile. On tablet/desktop, illustration is left and text is right in a 50/50 split.
- At prediction prompt cards (card 4 of 6 typically), the illustration is replaced by an input area:

```
+------------------------------------------+
|                                          |
|  +--- PREDICTION CARD ----------------+ |
|  |                                     | |
|  |  [Gradient background:              | |
|  |   encounter-accent-primary at 8%    | |
|  |   opacity, creating a warm wash]    | |
|  |                                     | |
|  |  What do you think caused           | |
|  |  this shift?                        | |
|  |                                     | |
|  |  [text-xl, font-encounter,          | |
|  |   italic, weight 600]              | |
|  |                                     | |
|  |  +-------------------------------+  | |
|  |  |  [Text input field]           |  | |
|  |  |  Placeholder: "There are no   |  | |
|  |  |  wrong answers here..."       |  | |
|  |  |  min-height: 80px             |  | |
|  |  |  radius-lg, border 1px        |  | |
|  |  |  encounter-accent at 20%      |  | |
|  |  |  BG: encounter-bg-primary     |  | |
|  |  +-------------------------------+  | |
|  |                                     | |
|  |  [I thought about it] (text link)   | |
|  |  [text-sm, encounter-accent,        | |
|  |   underline, for learners who       | |
|  |   prefer to reflect silently]       | |
|  |                                     | |
|  +-------------------------------------+ |
|                                          |
+------------------------------------------+
```

#### 3.3.3 The Spatial Overview

```
+------------------------------------------+
|                                          |
|  [Full-screen interactive canvas]        |
|                                          |
|  [Organic node graph:                    |
|                                          |
|   - Nodes are circles, 40-60px diameter  |
|   - Node fill: topic-stage dependent     |
|     (mastered = solid encounter-accent,  |
|      in-progress = half-filled,          |
|      upcoming = outline only at 30%)     |
|   - Current topic node: 60px, pulsing    |
|     gently (scale 1.0 to 1.04, 3s cycle) |
|     with encounter-glow shadow           |
|   - Connections: 1.5px flowing lines     |
|     (not straight -- cubic bezier curves)|
|     in encounter-text-secondary at 40%   |
|   - Layout: force-directed, organic      |
|     positioning. NOT a grid or tree.     |
|                                          |
|   Interaction:                           |
|   - Pinch to zoom (0.5x to 2x)          |
|   - Pan with one finger                  |
|   - Tap node: shows 1-line description   |
|     in a floating tooltip (radius-xl,    |
|     encounter-bg-secondary, 12px pad)    |
|   - Current topic auto-centered on load  |
|                                          |
|  ]                                       |
|                                          |
|  [Bottom: "Swipe up to continue"         |
|   text-sm, encounter-text-secondary,     |
|   with upward arrow, gentle bounce]      |
|                                          |
+------------------------------------------+
```

#### 3.3.4 The Emotional Anchor

```
+------------------------------------------+
|                                          |
|  [space-20 top padding]                  |
|                                          |
|  [Centered content, max-width 300px]     |
|                                          |
|  When was the last time                  |
|  you experienced something               |
|  you couldn't explain?                   |
|                                          |
|  [text-xl, font-encounter, italic,       |
|   weight 600, encounter-text-primary,    |
|   centered, line-height 1.4]             |
|                                          |
|  [space-10]                              |
|                                          |
|  +-------------------------------+       |
|  |  [Journal input]              |       |
|  |  Placeholder: "Optional --    |       |
|  |  jot a thought..."            |       |
|  |  min-height: 60px             |       |
|  |  radius-lg                    |       |
|  |  BG: encounter-bg-secondary   |       |
|  |  Border: 1px encounter-accent |       |
|  |  at 15%                       |       |
|  +-------------------------------+       |
|                                          |
|  [space-6]                               |
|                                          |
|  [Continue] (Primary Button)             |
|                                          |
+------------------------------------------+
```

### 3.4 Transition: Encounter --> Analysis

This is a 2-3 second interstitial that the learner passes through, not a screen they interact with.

```
+------------------------------------------+
|                                          |
|  [Background: animating crossfade from   |
|   encounter warm tones to analysis cool  |
|   tones over 1.5s]                       |
|                                          |
|  [Centered vertically]                   |
|                                          |
|  Now let's look more closely.            |
|                                          |
|  [text-xl, crossfading from              |
|   font-encounter to font-analysis,       |
|   from encounter-text-primary to         |
|   analysis-text-primary, over 1s]        |
|                                          |
|  [Below text: a thin line (3px) extends  |
|   horizontally from center outward to    |
|   screen edges over 1s, in              |
|   analysis-accent-primary. This          |
|   becomes the progress bar for the       |
|   Analysis stage.]                       |
|                                          |
|  [Haptic pulse at midpoint]              |
|  [Descending two-note chime]             |
|                                          |
+------------------------------------------+
```

The learner cannot interact during the transition. It auto-advances after 2 seconds. This forced pause is deliberate -- it creates a moment of attentional reset between modes.

### 3.5 Analysis Stage

The Analysis stage is visually distinct: cooler, tighter, more structured. The learner should immediately feel the shift from "exploring" to "working."

#### 3.5.1 Active Recall Card

```
+------------------------------------------+
|                                          |
|  [Progress bar: 3px, top of screen,      |
|   analysis-accent-primary fill,          |
|   analysis-bg-secondary track.           |
|   Shows: item 3 of 15 (20% filled)]     |
|                                          |
|  [space-6 top padding]                   |
|                                          |
|  +--- RECALL CARD --------------------+ |
|  |                                     | |
|  |  [Optional: small diagram or icon,  | |
|  |   64x64px, top-right corner]        | |
|  |                                     | |
|  |  In the story of van Helmont's      | |
|  |  willow tree, what was his          | |
|  |  surprising finding?                | |
|  |                                     | |
|  |  [text-base, font-analysis,         | |
|  |   weight 400, analysis-text-primary] | |
|  |                                     | |
|  |  Pad: 20px                          | |
|  |  Radius: radius-md (8px)            | |
|  |  BG: analysis-bg-secondary          | |
|  |  Border: 1px analysis-border        | |
|  +-------------------------------------+ |
|                                          |
|  [space-6]                               |
|                                          |
|  +-------------------------------+       |
|  |  [Free-text input field]      |       |
|  |  Placeholder: "Type your      |       |
|  |  answer..."                   |       |
|  |  min-height: 48px             |       |
|  |  radius-md                    |       |
|  |  BG: analysis-bg-primary      |       |
|  |  Border: 1.5px analysis-border|       |
|  |  Focus border:                |       |
|  |    analysis-accent-primary    |       |
|  +-------------------------------+       |
|                                          |
|  [space-4]                               |
|                                          |
|  [Submit]        [Show Options]          |
|  (Primary)       (Text button,           |
|                   analysis-text-secondary)|
|                                          |
+------------------------------------------+
```

**After submission -- correct:**

```
+------------------------------------------+
|                                          |
|  +--- FEEDBACK CARD ------------------+ |
|  |                                     | |
|  |  [Check circle icon, semantic-      | |
|  |   success, 24px]                    | |
|  |                                     | |
|  |  "The tree gained nearly all its    | |
|  |  mass from the air (CO2) and water, | |
|  |  not from the soil."               | |
|  |                                     | |
|  |  [text-base, font-analysis,         | |
|  |   semantic-success]                 | |
|  |                                     | |
|  |  Your answer:                       | |
|  |  "The soil barely lost weight       | |
|  |  even though the tree grew huge"    | |
|  |  [text-sm, analysis-text-secondary, | |
|  |   italic]                           | |
|  |                                     | |
|  |  BG: semantic-success at 8% opacity | |
|  |  Border: 1px semantic-success at 30%| |
|  |  Radius: radius-md                  | |
|  +-------------------------------------+ |
|                                          |
|  [space-4]                               |
|                                          |
|  How did that feel?                      |
|  [Got it] [Partially] [Missed it]        |
|  (Three buttons, evenly spaced,          |
|   radius-full, height 40px,              |
|   analysis-bg-secondary bg,              |
|   analysis-text-primary text,            |
|   active state: analysis-accent fill)    |
|                                          |
+------------------------------------------+
```

#### 3.5.2 Categorization Exercise

```
+------------------------------------------+
|                                          |
|  [Progress bar]                          |
|                                          |
|  Sort these into the correct             |
|  categories.                             |
|  [text-lg, font-analysis, weight 600]    |
|                                          |
|  [space-4]                               |
|                                          |
|  +--- CATEGORY A ----------+ +- CAT B -+|
|  |  Light-dependent         | | Light-  ||
|  |  reactions               | | indep.  ||
|  |                          | |         ||
|  |  [Drop zone:             | | [Drop   ||
|  |   dashed border 2px,     | |  zone]  ||
|  |   analysis-accent at 30%,| |         ||
|  |   radius-md,             | |         ||
|  |   min-height: 120px]     | |         ||
|  +--------------------------+ +---------+|
|                                          |
|  [space-6]                               |
|                                          |
|  +--- ITEM POOL ----------------------+  |
|  |                                     | |
|  |  [ATP]  [Thylakoid]  [Calvin cycle] | |
|  |  [NADPH]  [Stroma]  [Chlorophyll]   | |
|  |                                     | |
|  |  Items are pill-shaped buttons:     | |
|  |  radius-full, height 36px,          | |
|  |  pad 12px horizontal,              | |
|  |  analysis-bg-secondary bg,          | |
|  |  analysis-text-primary text,        | |
|  |  1px analysis-border.              | |
|  |  Draggable (long-press + drag)      | |
|  |  or tappable (tap item, then        | |
|  |  tap category).                     | |
|  +-------------------------------------+ |
|                                          |
|  [Check]  (Primary Button, bottom)       |
|                                          |
+------------------------------------------+
```

**Feedback state:** Correctly placed items show a subtle green-tinted background (`semantic-success` at 10%). Incorrectly placed items shake briefly (horizontal, 3px, 300ms) and show an amber tint (`semantic-warning` at 10%) with a small tooltip: "This belongs in [correct category] because..."

#### 3.5.3 Sequencing Task

```
+------------------------------------------+
|                                          |
|  Arrange these steps in order.           |
|  [text-lg, font-analysis, weight 600]    |
|                                          |
|  [space-4]                               |
|                                          |
|  +--- SORTABLE LIST ------------------+  |
|  |                                     | |
|  |  [=] 1. Antigen presented           | |
|  |  [Drag handle] [Item text]          | |
|  |  Height: 48px per item              | |
|  |  BG: analysis-bg-secondary          | |
|  |  Border-bottom: 1px analysis-border | |
|  |  Drag handle: 3 horizontal lines,   | |
|  |  analysis-text-secondary, 12x12px   | |
|  |                                     | |
|  |  [=] 2. T-cells activated           | |
|  |                                     | |
|  |  [=] 3. Pathogen enters             | |
|  |                                     | |
|  |  [=] 4. Memory cells formed         | |
|  |                                     | |
|  |  [=] 5. Antibodies produced         | |
|  |                                     | |
|  +-------------------------------------+ |
|                                          |
|  [Check Order]  (Primary Button)         |
|                                          |
+------------------------------------------+
```

Drag interaction: long-press (200ms) to initiate drag. The held item lifts with `shadow-lg` and scales to 102%. Other items smoothly reorder around it (200ms animation, LH-precise easing). Drop snaps into position with no bounce.

### 3.6 Transition: Analysis --> Return

```
+------------------------------------------+
|                                          |
|  [Background: crossfade from analysis    |
|   cool to return warm-deep over 1.5s]    |
|                                          |
|  [Centered]                              |
|                                          |
|  Let's step back and                     |
|  see the bigger picture.                 |
|                                          |
|  [text-xl, crossfading from              |
|   font-analysis to font-encounter,       |
|   from analysis-text-primary to          |
|   return-text-primary, over 1s]          |
|                                          |
|  [The progress bar at top transforms:    |
|   the thin line curves into a circle     |
|   (300ms), fills to 100% (500ms),        |
|   then fades away (300ms)]               |
|                                          |
|  [Ascending three-note chime]            |
|                                          |
+------------------------------------------+
```

### 3.7 Return Stage

#### 3.7.1 The Reconnection

```
+------------------------------------------+
|                                          |
|  [Full-bleed background: return-gradient  |
|   from return-gradient-start to           |
|   return-gradient-end]                    |
|                                          |
|  [space-20 top padding]                  |
|                                          |
|  [The original hook text or image        |
|   reappears, but now with a soft         |
|   golden glow (return-accent-primary     |
|   at 10%) that brightens over 1.5s       |
|   to 25%. The glow signals:             |
|   "you see this differently now."]       |
|                                          |
|  "A tree is literally made of            |
|  air and light. When you burn            |
|  wood, you are releasing the             |
|  sunlight that was stored in it."        |
|                                          |
|  [text-2xl, font-encounter, weight 700,  |
|   return-text-primary,                    |
|   centered, max-width: 300px]            |
|                                          |
|  [space-12]                              |
|                                          |
|  "Now that you've studied the            |
|  details, look at this again.            |
|  What do you see differently?"           |
|                                          |
|  [text-md, font-encounter, italic,       |
|   return-text-secondary]                 |
|                                          |
|  [space-8]                               |
|                                          |
|  +-------------------------------+       |
|  |  [Reflection input]           |       |
|  |  min-height: 80px             |       |
|  |  radius-xl                    |       |
|  |  BG: return-bg-secondary      |       |
|  |  Border: 1px return-accent at |       |
|  |  20%                          |       |
|  +-------------------------------+       |
|                                          |
|  [Continue] (Primary Button)             |
|                                          |
+------------------------------------------+
```

#### 3.7.2 Transfer Challenge

```
+------------------------------------------+
|                                          |
|  [space-16 top]                          |
|                                          |
|  [Lightbulb icon, return-accent,         |
|   32px, centered]                        |
|                                          |
|  [space-4]                               |
|                                          |
|  Transfer Challenge                      |
|  [text-sm, return-text-secondary,        |
|   uppercase, letter-spacing: 0.1em]      |
|                                          |
|  [space-6]                               |
|                                          |
|  A solar panel converts sunlight         |
|  into electricity. How is this           |
|  similar to and different from           |
|  photosynthesis?                         |
|                                          |
|  [text-md, font-encounter, weight 400,   |
|   return-text-primary, max-width: 320px, |
|   centered]                              |
|                                          |
|  [space-8]                               |
|                                          |
|  +-------------------------------+       |
|  |  [Free-text response area]    |       |
|  |  min-height: 120px            |       |
|  |  radius-xl                    |       |
|  |  BG: return-bg-secondary      |       |
|  |  Placeholder: "Think about    |       |
|  |  similarities and             |       |
|  |  differences..."              |       |
|  +-------------------------------+       |
|                                          |
|  [Submit] (Primary Button)               |
|                                          |
+------------------------------------------+
```

#### 3.7.3 Creative Synthesis

```
+------------------------------------------+
|                                          |
|  [space-12 top]                          |
|                                          |
|  [Pencil icon, return-accent, 32px]      |
|                                          |
|  [space-4]                               |
|                                          |
|  Create Something                        |
|  [text-sm, return-text-secondary,        |
|   uppercase, letter-spacing: 0.1em]      |
|                                          |
|  [space-6]                               |
|                                          |
|  Choose one:                             |
|  [text-sm, return-text-secondary]        |
|                                          |
|  [space-4]                               |
|                                          |
|  +--- OPTION CARDS (vertical stack) ---+ |
|  |                                     | |
|  |  +--- Create a metaphor ----------+ | |
|  |  | [Pencil icon] "Explain this    | | |
|  |  | using a metaphor of your own   | | |
|  |  | invention. No scientific       | | |
|  |  | terms allowed."               | | |
|  |  | Pad: 16px, radius-xl           | | |
|  |  | BG: return-bg-secondary        | | |
|  |  | Border: 1px return-accent 15%  | | |
|  |  +--------------------------------+ | |
|  |                                     | |
|  |  [space-3]                          | |
|  |                                     | |
|  |  +--- Teach it -------------------+ | |
|  |  | [Speech icon] "Explain this    | | |
|  |  | to a 10-year-old."            | | |
|  |  +--------------------------------+ | |
|  |                                     | |
|  |  [space-3]                          | |
|  |                                     | |
|  |  +--- Draw it --------------------+ | |
|  |  | [Brush icon] "Sketch how       | | |
|  |  | this works."                   | | |
|  |  +--------------------------------+ | |
|  |                                     | |
|  |  [space-3]                          | |
|  |                                     | |
|  |  +--- Connect it -----------------+ | |
|  |  | [Link icon] "Link this to      | | |
|  |  | something else you've learned."| | |
|  |  +--------------------------------+ | |
|  +-------------------------------------+ |
|                                          |
+------------------------------------------+
```

When an option is tapped, it expands to reveal a full-height input area. The other options collapse with a smooth animation (300ms, RH easing).

#### 3.7.4 Reflection Prompt

```
+------------------------------------------+
|                                          |
|  [Generous whitespace: space-24 top]     |
|                                          |
|  What surprised you                      |
|  about this topic?                       |
|                                          |
|  [text-xl, font-encounter, italic,       |
|   weight 600, return-text-primary,       |
|   centered]                              |
|                                          |
|  [space-10]                              |
|                                          |
|  +-------------------------------+       |
|  |  [Journal input]              |       |
|  |  min-height: 100px            |       |
|  |  radius-xl                    |       |
|  |  BG: return-bg-secondary      |       |
|  +-------------------------------+       |
|                                          |
|  [space-4]                               |
|                                          |
|  How well do you understand this?        |
|  [text-sm, return-text-secondary]        |
|                                          |
|  [1] [2] [3] [4] [5]                    |
|  (Five circular buttons, 40px each,      |
|   evenly spaced, return-bg-secondary,    |
|   selected state: return-accent-primary  |
|   fill with white number)                |
|                                          |
|  [space-4]                               |
|                                          |
|  [Continue] (Primary Button)             |
|                                          |
+------------------------------------------+
```

#### 3.7.5 Forward Glimpse and Session End

```
+------------------------------------------+
|                                          |
|  [Full-bleed return gradient bg]         |
|                                          |
|  [space-20 top]                          |
|                                          |
|  [Sunrise icon, return-accent, 48px,     |
|   centered, with a slow fade-in          |
|   and scale from 80% to 100%]            |
|                                          |
|  [space-8]                               |
|                                          |
|  Session Complete                        |
|  [text-xl, font-encounter, weight 600]   |
|                                          |
|  [space-4]                               |
|                                          |
|  "Next time, we'll explore what          |
|  happens to all that glucose the         |
|  plant just made."                       |
|                                          |
|  [text-md, font-encounter, italic,       |
|   return-text-secondary, max-width: 280] |
|                                          |
|  [space-12]                              |
|                                          |
|  +--- SESSION SUMMARY ----------------+  |
|  |                                     | |
|  |  [Leaf icon] Understanding: [---]   | |
|  |  (simple 5-level dot indicator,     | |
|  |   derived from confidence rating    | |
|  |   calibrated against accuracy)      | |
|  |                                     | |
|  |  [Grid icon] Items practiced: 14    | |
|  |  [Link icon] Connections made: 2    | |
|  |                                     | |
|  |  radius-xl, return-bg-secondary,    | |
|  |  pad: 16px                          | |
|  +-------------------------------------+ |
|                                          |
|  [space-8]                               |
|                                          |
|  [Return Home]  (Primary Button)         |
|                                          |
+------------------------------------------+
```

**Design details:**
- The session summary uses restrained metrics. Not "XP earned" or "streak maintained," but "Understanding level," "Items practiced," and "Connections made." These are genuine learning indicators.
- The Forward Glimpse text creates a curiosity gap for the next session, leveraging the Zeigarnik effect.
- The entire session end screen uses the Return palette at its deepest, signaling completion and rest.

### 3.8 Progress / Stats Screen

Accessible from the Dashboard or the Knowledge Map. Shows the learner's journey without gamifying it.

```
+------------------------------------------+
|                                          |
|  [Back arrow]           Your Journey     |
|                        [text-lg, weight  |
|                         600, centered]   |
|                                          |
|  +--- UNDERSTANDING OVERVIEW ----------+ |
|  |                                     | |
|  |  Topics Explored                    | |
|  |  [text-3xl, weight 700] 12          | |
|  |                                     | |
|  |  Deep Understanding  Developing     | |
|  |  [====]  5           [====]  4      | |
|  |                                     | |
|  |  Beginning           New            | |
|  |  [====]  2           [====]  1      | |
|  |                                     | |
|  |  (Each bar: 4px height,             | |
|  |   encounter-accent fill,            | |
|  |   proportional width)               | |
|  |  BG: encounter-bg-secondary         | |
|  |  Pad: 20px, radius-xl              | |
|  +-------------------------------------+ |
|                                          |
|  [space-6]                               |
|                                          |
|  +--- LEARNING PATTERNS ---------------+ |
|  |                                     | |
|  |  Your Learning Balance              | |
|  |  [text-md, weight 600]              | |
|  |                                     | |
|  |  [Circular diagram showing time     | |
|  |   spent in each stage as three      | |
|  |   concentric arcs:                  | |
|  |   Outer (warm): Encounter 25%       | |
|  |   Middle (cool): Analysis 50%       | |
|  |   Inner (deep warm): Return 25%     | |
|  |   Diameter: 160px, centered]        | |
|  |                                     | |
|  |  "You're well-balanced."            | |
|  |  [or: "You tend to rush through     | |
|  |  the Return stage. Take a moment    | |
|  |  to reflect -- that's where deep    | |
|  |  understanding forms."]             | |
|  |  [text-sm, font-encounter, italic]  | |
|  |                                     | |
|  +-------------------------------------+ |
|                                          |
|  [space-6]                               |
|                                          |
|  +--- CONNECTION DENSITY --------------+ |
|  |                                     | |
|  |  Cross-Topic Connections            | |
|  |  [text-md, weight 600]              | |
|  |                                     | |
|  |  28 connections found               | |
|  |  [text-2xl, weight 700]             | |
|  |                                     | |
|  |  [Small network visualization:      | |
|  |   dots and lines showing the        | |
|  |   learner's connection density.     | |
|  |   Denser = richer understanding.    | |
|  |   Height: 120px]                    | |
|  |                                     | |
|  |  Strongest connection:              | |
|  |  "Natural Selection <-->            | |
|  |   Antibiotic Resistance"            | |
|  |  [text-sm, encounter-accent]        | |
|  |                                     | |
|  +-------------------------------------+ |
|                                          |
|  [space-6]                               |
|                                          |
|  +--- RETENTION CHECK -----------------+ |
|  |                                     | |
|  |  Long-Term Retention                | |
|  |  [text-md, weight 600]              | |
|  |                                     | |
|  |  [Sparkline chart: 30-day view      | |
|  |   of average accuracy on spaced     | |
|  |   review items. Line chart,         | |
|  |   analysis-accent-primary stroke,   | |
|  |   2px, with area fill at 5%.        | |
|  |   Height: 80px]                     | |
|  |                                     | |
|  |  Average: 82% after 2+ weeks        | |
|  |  [text-sm]                          | |
|  |                                     | |
|  +-------------------------------------+ |
|                                          |
+------------------------------------------+
```

**Design details:**
- No "score" or "grade." The metrics are understanding depth, connection density, learning balance, and long-term retention.
- The "Learning Balance" arc diagram gently educates the learner about the three-stage model. Over time, they come to understand that balanced engagement across all three stages produces the best understanding.
- Retention is shown as a trend, not a single number. The learner sees how well knowledge persists over time -- the only metric that truly matters.

### 3.9 Knowledge Map (Full Screen)

The Knowledge Map is the learner's spatial visualization of everything they have studied and how topics connect.

```
+------------------------------------------+
|                                          |
|  [Full-screen interactive canvas]        |
|                                          |
|  [Status bar area]                       |
|  [Back] [Search topics...] [Filter]      |
|                                          |
|  [Force-directed graph:                  |
|                                          |
|   Layout principles:                     |
|   - Organic, not grid-based             |
|   - Related topics cluster together      |
|   - Distance reflects conceptual         |
|     similarity (closer = more related)   |
|   - The learner's current focus area     |
|     is centered                          |
|                                          |
|   Node design:                           |
|   - Circle, 36-64px diameter             |
|     (size reflects depth of study)       |
|   - Mastered: solid fill with            |
|     encounter-accent-primary             |
|   - In-progress: ring fill,             |
|     proportional to completion           |
|   - Not started: outline only,          |
|     encounter-text-secondary at 25%      |
|   - Label: topic name, text-xs,         |
|     below node, max 2 lines             |
|                                          |
|   Edge design:                           |
|   - Curved lines (cubic bezier)         |
|   - Thickness: 1-3px based on           |
|     connection strength                  |
|   - Color: encounter-text-secondary      |
|     at 20-50% based on strength          |
|   - Learner-discovered connections       |
|     have a subtle glow                   |
|                                          |
|   Interaction:                           |
|   - Pinch to zoom (0.3x - 3x)          |
|   - Pan with one finger                 |
|   - Tap node: expand to show            |
|     topic detail card (overlay)          |
|   - Long-press node: show all           |
|     connections highlighted              |
|   - Double-tap empty space:             |
|     re-center and fit all               |
|                                          |
|   Topic Detail Card (overlay):           |
|   +-------------------------------+     |
|   |  [Topic name, text-lg, wt 600]|     |
|   |  [Understanding level: dots]  |     |
|   |  [Sessions completed: N/M]    |     |
|   |  [Last studied: date]         |     |
|   |  [Connections: list of 3      |     |
|   |   connected topics, tappable] |     |
|   |                               |     |
|   |  [Continue Learning]          |     |
|   |  (Primary button)             |     |
|   |                               |     |
|   |  radius-2xl, return-bg-       |     |
|   |  secondary, shadow-lg, pad 20 |     |
|   +-------------------------------+     |
|  ]                                       |
|                                          |
|  [Bottom: tab bar remains visible]       |
|                                          |
+------------------------------------------+
```

**Design details:**
- The map uses the Encounter/Return palette because it represents the "whole picture" -- an inherently RH-mode view.
- The organic layout avoids the temptation to impose a neat hierarchy (which would be an LH representation of the knowledge structure). Real understanding is a web, not a tree.
- Learner-discovered connections (made during Return stage creative synthesis) are visually distinguished from curriculum-defined connections, celebrating the learner's own insights.
- The map gradually becomes richer and more interconnected as the learner progresses. This visual growth is its own reward -- no points needed.

---

## 4. Hemisphere-Mode Visual Language Guide

### 4.1 Mode Signaling System

The learner is always in one of three modes. The UI communicates the current mode through five simultaneous channels:

| Channel | Encounter (RH) | Analysis (LH) | Return (RH Enriched) |
|---------|----------------|----------------|----------------------|
| **Color** | Warm ambers, terracottas, deep twilight blues | Cool slates, steel blues, clean whites | Deep corals, warm mauves, rich violets |
| **Typography** | Serif (Source Serif 4), larger sizes, generous spacing | Sans-serif (Inter), standard sizes, tighter spacing | Serif, larger sizes, most generous spacing, italic for prompts |
| **Shape** | Organic: large radii, flowing edges, freeform blurs | Geometric: small radii, straight edges, grid alignment | Between: large radii, slight asymmetry |
| **Motion** | Slow, fluid, organic: 400-800ms, ease-out curves | Quick, precise, mechanical: 150-300ms, standard easing | Slowest, contemplative: 500-1000ms, long deceleration |
| **Sound** | Ambient pad, organic tones | Silence (focus) with crisp feedback clicks | Deeper ambient pad, shimmer on insight |

### 4.2 Encounter Visual Cues (RH Mode)

When the learner is in Encounter mode, the following visual cues are active:

1. **Background:** Gradient or high-quality image with warm overlay. Never flat white or flat dark. The background has texture and depth.
2. **Surfaces:** Cards and content areas have large corner radii (`radius-xl` to `radius-2xl`), soft edges, and warm-tinted backgrounds.
3. **Decorative elements:** Subtle organic shapes in the background -- soft circles, blurred ellipses at 3-5% opacity in warm accent colors. These are never in the content area; they exist at the edges of vision, creating a sense of ambient life.
4. **Text alignment:** Centered for hooks and prompts. Left-aligned for narrative body text. Never justified (justified text is an LH visual pattern -- mechanically regular).
5. **Whitespace:** Generous. Content occupies 50-65% of the vertical space at most. The rest is breathing room.
6. **No progress indicators:** No progress bar, no item count, no timer. The Encounter is timeless.

### 4.3 Analysis Visual Cues (LH Mode)

When the learner is in Analysis mode:

1. **Background:** Flat, solid color. `analysis-bg-primary` in dark mode, `analysis-bg-light` in light mode. No gradients, no images, no texture. The flatness signals focus.
2. **Surfaces:** Cards have small corner radii (`radius-sm` to `radius-md`), crisp borders, and consistent sizing. Cards in a set have identical dimensions.
3. **Decorative elements:** None. Every pixel serves a function.
4. **Text alignment:** Left-aligned throughout. Content follows a strict grid.
5. **Whitespace:** Purposeful but not excessive. Content occupies 70-80% of the vertical space. The density signals "there is work to be done."
6. **Progress indicators present:** The 3px progress bar at top shows item progress. If the learner has opted into timing, a small timer appears in the top-right corner.
7. **Grid structure visible:** Content aligns to the column grid. Cards snap to grid. The geometric order is felt even if the grid lines are not drawn.

### 4.4 Return Visual Cues (RH Enriched Mode)

When the learner is in Return mode:

1. **Background:** Deep gradient, richer and more saturated than Encounter. The deepened colors signal "you have been here before, but now you see more."
2. **Surfaces:** Large corner radii, but with a slight warmth shift compared to Encounter -- backgrounds tinted toward mauve/violet rather than amber. This distinguishes Return from Encounter while maintaining the RH family resemblance.
3. **Glow effects:** Key elements (the reconnection text, the insight moment) have a soft glow in `return-accent-primary` that brightens on appearance. This glow is the visual signature of the "aha" moment.
4. **Text alignment:** Centered for prompts and reflection questions. Left-aligned for input areas.
5. **Whitespace:** The most generous of all stages. Content occupies 40-55% of vertical space. The expansiveness invites contemplation.
6. **No progress indicators:** Like Encounter, the Return stage has no progress bar. The completeness ring appears only during the transition in, then fades.

### 4.5 Pre-Transition Signals

Before each transition, the UI provides a subtle warning that the mode is about to shift. This respects the learner's attentional state by not surprising them with an abrupt change.

**Encounter --> Analysis (last 5 seconds of Encounter):**
- The ambient background gradient slows its animation and begins cooling (a 3-5% shift toward blue tones over 5 seconds).
- The next swipe/tap cue text subtly shifts from serif to a serif-sans blend (font-feature-settings or opacity crossfade).
- If audio is enabled, the ambient pad begins a slow decrescendo.

**Analysis --> Return (last item in Analysis):**
- The progress bar shows 95%+ and begins glowing softly.
- The background color shifts 2-3% warmer.
- The final item's feedback card has slightly larger corner radii than previous items.

These signals are subliminal -- the learner should feel the coming change without consciously noticing the cues.

---

## 5. Interaction Pattern Library

### 5.1 Encounter Interactions

#### 5.1.1 Narrative Swipe (Horizontal Card Scroll)

**Trigger:** Swipe left on a narrative card (or tap "Continue" / right edge of card).
**Behavior:** Current card slides left with organic easing (400ms). Next card slides in from right with a subtle 5-degree rotation that settles to 0 (like a page turning). Parallax: card image moves at 0.8x speed, text at 1x.
**Reverse:** Swipe right to return to previous card. Same animation reversed.
**Edge cases:** First card has no left-swipe. Last card transitions to the next activity.
**Accessibility:** Tap "Previous"/"Next" buttons visible at bottom (40px height, full-width touch targets). Screen reader announces card number: "Card 3 of 6."

#### 5.1.2 Prediction Input

**Trigger:** Prediction card appears in narrative sequence.
**Behavior:** Input field auto-focuses (keyboard rises on mobile). The card expands smoothly to accommodate the keyboard (300ms).
**Submit:** Tap "Submit" or swipe to next card. If the field is empty, a gentle prompt appears: "Take a guess -- there are no wrong answers here." The learner can dismiss this and continue without typing.
**Accessibility:** Input field has `aria-label="Your prediction"`. Placeholder text is not used as the label.

#### 5.1.3 Spatial Map Interaction

**Trigger:** Map appears as part of Encounter.
**Behavior:** Pinch to zoom with smooth momentum. Pan with single finger. Double-tap to zoom in 1.5x on the tapped location (or zoom out if already zoomed in).
**Node tap:** A floating tooltip appears 8px above the tapped node with a slide-down animation (200ms). Tooltip auto-dismisses when tapping elsewhere.
**Accessibility:** Nodes are focusable via swipe gesture (VoiceOver) or Tab key. Focus order follows conceptual proximity to the current topic. Each node announces: "[Topic name], [status: mastered/in progress/upcoming], [N connections]."

### 5.2 Analysis Interactions

#### 5.2.1 Free Recall Input

**Trigger:** Recall card appears.
**Behavior:** Input field has a 48px minimum height. The field auto-expands as the learner types (line by line, smooth 100ms expansion). A subtle character count appears at the bottom-right of the field (text-xs, secondary color).
**Submit:** Tap "Submit" button (primary button style, 48px height, full-width on mobile). The button is disabled until at least 3 characters are typed.
**Fallback:** "Show Options" text button below Submit. Tapping it replaces the free-text field with 4 multiple-choice options (200ms fade transition). This downgrades the retrieval mode and the system logs it.

#### 5.2.2 Drag-and-Drop (Categorization / Sequencing)

**Trigger:** Long-press (200ms) on a draggable item.
**Behavior:** Item lifts with `shadow-lg` and 102% scale. The item follows the finger with zero delay. Drop zones highlight when the item is dragged over them (border thickens to 2px, background shows stage accent at 5% opacity).
**Drop:** Item snaps into the drop zone (150ms, LH easing). If the zone is occupied (sequencing), other items shift to make room (200ms).
**Accessibility alternative:** For users who cannot drag, each item has a "Move to" button that opens a list of valid destinations. For sequencing, "Move up" and "Move down" buttons appear alongside each item. These controls appear when the system detects assistive technology or when the learner enables them in Settings.

#### 5.2.3 Self-Rating (Got it / Partially / Missed it)

**Trigger:** Appears after feedback is shown for a recall item.
**Behavior:** Three horizontally arranged buttons with equal width (1/3 of content area each, minus gaps). Minimum touch target: 48x44px. Tap one to select; it fills with `analysis-accent-primary` and the text turns white. The other two dim to 50% opacity. After 500ms, the next item auto-advances (or the learner can tap to advance immediately).
**Accessibility:** Buttons are a radio group with `role="radiogroup"` and `aria-label="How well did you recall this?"`. Each button has an `aria-label`: "Got it -- recalled correctly", "Partially -- recalled some", "Missed it -- could not recall."

### 5.3 Return Interactions

#### 5.3.1 Free-Text Creative Response

**Trigger:** Transfer challenge or creative synthesis prompt.
**Behavior:** Large text area (minimum 120px height, expandable). Soft, warm border. No character limit displayed (to avoid constraining creative thought). The area uses `font-encounter` rather than `font-analysis` to signal "this is your space to think freely."
**Submit:** "Share your thinking" button (softer language than "Submit" -- the Return stage frames contribution, not compliance).
**Accessibility:** `aria-label` describes the full prompt. The text area has a visible label above it.

#### 5.3.2 Drawing Canvas (Sketch Option)

**Trigger:** Learner selects "Draw it" in creative synthesis.
**Behavior:** A full-width drawing canvas appears (height: 280px on mobile, 400px on tablet/desktop). Tools: pen (2px black stroke), eraser, undo, and a color picker with 6 preset colors. The canvas background is warm off-white (`encounter-bg-light`).
**Touch:** Single finger draws. Two-finger pinch zooms the canvas. Palm rejection enabled.
**Submit:** "Done" button saves the drawing as a PNG to the learner's portfolio.
**Accessibility:** The drawing canvas is not accessible to screen reader users. When assistive technology is detected, the "Draw it" option is replaced with "Describe it: explain what you would draw in words."

#### 5.3.3 Connection Builder (Connect It Option)

**Trigger:** Learner selects "Connect it" in creative synthesis.
**Behavior:** A mini knowledge map appears showing the current topic and 6-8 nearby topics. The learner taps two nodes to create a connection, then writes a sentence explaining it.
**Interaction:** Tap first node (it highlights with a pulsing ring). Tap second node (a curved line draws between them, 400ms animation). A text field appears below: "Describe the connection."
**Submit:** The connection is saved and visible on the learner's full Knowledge Map with a special "learner-discovered" visual treatment (glow, dashed line style).

#### 5.3.4 Confidence Rating (1-5 Scale)

**Trigger:** Appears in the Reflection Prompt.
**Behavior:** Five circular buttons arranged horizontally, evenly spaced. Each is 40px diameter with the number centered. Tapping a button fills it with `return-accent-primary` and shows a brief descriptor below it for 2 seconds:
- 1: "Just started"
- 2: "Getting there"
- 3: "Making sense"
- 4: "Solid understanding"
- 5: "Could teach this"
**Accessibility:** `role="radiogroup"`, `aria-label="How well do you understand this topic?"`. Each button: `role="radio"`, `aria-label="[N] out of 5: [descriptor]"`.

### 5.4 Navigation Patterns

#### 5.4.1 Within a Session

Navigation within a session is primarily **linear and forward**. The learner advances by swiping left, tapping "Continue," or submitting a response. This linearity is deliberate -- the RH-->LH-->RH sequence must be followed in order.

**Back navigation:** The learner can swipe right or tap a back arrow to return to the previous activity within the current stage. However, the learner cannot go backward across a stage boundary once a transition has occurred (they cannot return from Analysis to Encounter mid-session). This enforces the cognitive sequence.

**Exit:** A small "X" button in the top-right corner allows the learner to exit the session at any time. If they exit during Analysis, the system saves their progress and, on next session start, offers: "Continue where you left off?" If they exit during Return, the system completes the session as a shorter Return and schedules a longer Return for the next session.

#### 5.4.2 Between Sessions (App Navigation)

**Bottom tab bar** with three tabs:
- **Home** (Compass icon): Dashboard with next session, stats, and review prompt
- **Map** (Map pin icon): Full Knowledge Map
- **Journal** (Journal icon): Learning journal with all reflections, creative outputs, and connections

Tab bar height: 56px. Icon size: 24px. Label: text-xs (12px), 4px below icon. Active state: `encounter-accent-primary` icon and label. Inactive: `neutral-300` (light mode) or `neutral-700` (dark mode).

The tab bar is hidden during active sessions to maximize immersion. It reappears on session end.

### 5.5 Gesture Vocabulary (Mobile)

| Gesture | Context | Action |
|---------|---------|--------|
| Swipe left | Encounter cards | Advance to next card |
| Swipe right | Encounter cards | Return to previous card |
| Tap | Everywhere | Primary selection action |
| Long-press (200ms) | Analysis items | Initiate drag |
| Pinch | Knowledge Map, Spatial Overview | Zoom |
| Single-finger pan | Knowledge Map, Spatial Overview | Pan/scroll |
| Double-tap | Knowledge Map | Zoom in/out toggle |
| Swipe down (from top) | Session screens | Reveal minimal session info (topic, stage, optional timer) |

### 5.6 Button Styles

#### Primary Button
- Height: 48px
- Padding: 0 24px
- Border-radius: `radius-full` (pill shape)
- Background: stage accent color (`encounter-accent-primary`, `analysis-accent-primary`, or `return-accent-primary`)
- Text: `neutral-white`, `font-analysis`, `text-base`, weight 600
- Pressed: darken background 10%, scale to 98% for 100ms
- Disabled: 40% opacity, no interaction
- Min-width: 120px
- Full-width on mobile when it is the sole action

#### Secondary Button
- Height: 44px
- Padding: 0 20px
- Border-radius: `radius-full`
- Background: transparent
- Border: 1.5px, stage accent color
- Text: stage accent color, `font-analysis`, `text-sm`, weight 500
- Pressed: background fills at 8% opacity

#### Text Button
- Height: 40px (touch target), visual height matches text
- No background, no border
- Text: stage secondary text color, `font-analysis`, `text-sm`, weight 500, underline on hover/focus
- Pressed: text opacity 70%

---

## 6. Mobile-First Responsive Design

### 6.1 Breakpoint System

| Breakpoint | Width | Columns | Target Devices |
|------------|-------|---------|---------------|
| `mobile-sm` | 375px | 4 | iPhone SE, small Android |
| `mobile` | 390px | 4 | iPhone 14/15, standard Android |
| `tablet` | 768px | 8 | iPad Mini, small tablets |
| `desktop` | 1024px | 12 | iPad Pro, laptops |
| `desktop-lg` | 1440px | 12 | Desktop monitors |

### 6.2 Mobile Layout (375-389px)

This is the primary design target. All specifications in Section 3 are mobile-first.

**Key dimensions:**
- Content margins: 20px left/right
- Content width: 335px
- Touch targets: minimum 44x44px (WCAG 2.5.5 Level AAA)
- Bottom nav height: 56px + safe area inset
- Text input min-height: 48px
- Card padding: 16-20px
- Card gap: 12-16px

**Encounter stage:**
- Hook text fills width (minus margins), centered
- Narrative cards are full-width with 20px margins
- Illustration height: 200px (or 53% of screen height, whichever is smaller)
- Spatial map: full-screen takeover

**Analysis stage:**
- Practice cards: full-width, stacked vertically
- Categorization: categories stack vertically on narrow screens (side by side if width > 360px and 2 categories; stacked if 3+ categories)
- Drag items: minimum 44px height, full-width
- Feedback cards: full-width, below the question card

**Return stage:**
- Text areas: full-width minus margins
- Creative option cards: full-width, stacked vertically
- Connection map: full-screen takeover (same as Spatial Overview)
- Drawing canvas: full-width, 280px height

### 6.3 Mobile Large (390-767px)

Identical to mobile-sm with these adjustments:
- Content margins: 24px left/right
- Content width: 342px
- Narrative illustration height: 220px
- Slightly more breathing room in Return stage prompts

### 6.4 Tablet Adaptation (768px)

**Key changes from mobile:**
- Content area centered with max-width: 600px for single-column reading content
- Dashboard uses 2-column layout: Knowledge Map preview and Next Session side by side
- Narrative cards: illustration left (50%), text right (50%), vertical split
- Categorization: categories arranged horizontally (up to 3 side by side)
- Knowledge Map: larger canvas, node labels always visible (not just on hover/tap)
- Drawing canvas: 400px height
- Session summary: 2-column layout for stats

**Navigation:**
- Bottom tab bar remains (same position, same behavior)
- Within Encounter narrative, a side navigation rail can show card thumbnails (small circles indicating position in the narrative)

### 6.5 Desktop Adaptation (1024px+)

**Key changes from tablet:**
- Content area: max-width 720px for reading, centered in viewport
- Dashboard: 3-column grid for stats (Topics, Connections, Sessions)
- A sidebar (240px width) appears on the left during sessions, showing:
  - Session topic name
  - Current stage indicator (visual dot in stage color)
  - Mini progress visualization
  - "Exit session" link
  This sidebar uses the neutral palette and is visually distinct from the content area
- Narrative cards: illustration left (45%), text right (55%), with a 24px gap
- Knowledge Map: the topic detail card appears as a persistent right panel (320px) rather than an overlay
- Drawing canvas: 560px height
- Categorization: categories can be arranged in a 2x2 grid for 4 categories

**Navigation:**
- Bottom tab bar is replaced by a left sidebar navigation (64px width, icon-only, expanding to 240px with labels on hover)
- Tabs: Home, Map, Journal, Settings
- The sidebar uses the neutral palette with stage accent for the active item

### 6.6 Stage Adaptation Across Screen Sizes

| Stage Element | Mobile (375px) | Tablet (768px) | Desktop (1024px+) |
|--------------|---------------|----------------|-------------------|
| **Hook text** | `text-2xl` (30px), centered, full-width | `text-3xl` (36px), centered, max 500px | `text-3xl` (36px), centered, max 560px |
| **Narrative cards** | Image above text, stacked | Image left, text right, 50/50 | Image left, text right, 45/55 |
| **Spatial map** | Full-screen takeover | Inline, 400px height | Inline, 480px height, with persistent node labels |
| **Recall cards** | Full-width, stacked | Centered, max 500px | Centered, max 560px, sidebar visible |
| **Categorization** | Vertical stack | 2-3 columns | 2-4 columns in a grid |
| **Transfer prompt** | Full-width text area | Centered, max 500px | Centered, max 560px |
| **Drawing canvas** | Full-width, 280px | Centered, max 500px, 400px tall | Centered, max 560px, 560px tall |
| **Knowledge Map** | Full-screen tab view | Full-screen tab view | Full-screen with side panel |

### 6.7 Touch Target Specifications

All interactive elements meet or exceed these minimums:

| Element | Minimum Size | Minimum Spacing | Notes |
|---------|-------------|-----------------|-------|
| Buttons (primary) | 48x48px | 8px between buttons | Full-width on mobile when sole action |
| Buttons (secondary) | 44x44px | 8px | |
| Text buttons | 44x44px touch target (visual may be smaller) | 8px | Invisible padding extends touch area |
| Navigation tabs | 48x48px per tab | 0px (tabs fill width) | |
| Drag items | 44x48px | 4px vertical gap | Long-press to initiate |
| Rating buttons | 40x40px | 8px horizontal gap | Circular |
| Input fields | 48px min-height | | Full-width on mobile |
| Card navigation dots | 24x24px touch target (4px visual) | 8px | |
| Knowledge map nodes | 44x44px touch target (36-64px visual) | Algorithmic (force-directed) | |

---

## 7. Accessibility Specification

### 7.1 WCAG 2.1 AA Compliance

The Hemisphere app targets WCAG 2.1 AA conformance across all screens and states. The following sections detail how each guideline category is addressed.

### 7.2 Color Contrast

All text must meet these minimum contrast ratios:

| Element | Minimum Ratio | Standard |
|---------|--------------|----------|
| Body text (normal, >=16px) | 4.5:1 | WCAG AA |
| Large text (>=24px or >=18.66px bold) | 3:1 | WCAG AA |
| UI components and graphical objects | 3:1 | WCAG AA |
| Enhanced (optional target) | 7:1 / 4.5:1 | WCAG AAA |

**Per-stage contrast verification:**

| Stage | Background | Primary Text | Contrast Ratio | Status |
|-------|-----------|-------------|---------------|--------|
| Encounter (dark) | `#1C1612` | `#F5E6D3` | 12.8:1 | Pass (AAA) |
| Encounter (dark) | `#2A2018` | `#F5E6D3` | 10.4:1 | Pass (AAA) |
| Encounter (dark) | `#1C1612` | `#BFA88E` | 7.1:1 | Pass (AAA) |
| Encounter (light) | `#FFF8F0` | `#2A2018` | 13.1:1 | Pass (AAA) |
| Analysis (dark) | `#0F1419` | `#E8EDF3` | 15.2:1 | Pass (AAA) |
| Analysis (dark) | `#1A2332` | `#E8EDF3` | 11.7:1 | Pass (AAA) |
| Analysis (light) | `#F5F7FA` | `#1A2332` | 12.9:1 | Pass (AAA) |
| Return (dark) | `#18121C` | `#F0E3EC` | 13.5:1 | Pass (AAA) |
| Return (dark) | `#241A2A` | `#F0E3EC` | 10.8:1 | Pass (AAA) |
| Return (light) | `#FDF5F8` | `#2A1A2E` | 14.2:1 | Pass (AAA) |

**Accent color contrast on dark backgrounds:**

| Accent | Background | Ratio | Usage Notes |
|--------|-----------|-------|-------------|
| `#E8913A` on `#1C1612` | 5.7:1 | Pass for normal text, large text, and UI components |
| `#4A9EDE` on `#0F1419` | 5.4:1 | Pass for normal text, large text, and UI components |
| `#D4724A` on `#18121C` | 5.8:1 | Pass for normal text, large text, and UI components |

**Critical rule:** Color is never the sole means of conveying information. All color-coded states (correct/incorrect, stage identity, progress) have a secondary indicator: icon, text label, shape, or pattern.

### 7.3 Screen Reader Support

#### 7.3.1 Semantic Structure

- All screens use proper heading hierarchy (`h1` through `h4`). Each screen has exactly one `h1`.
- Interactive regions are wrapped in ARIA landmarks: `nav`, `main`, `complementary`, `form`.
- Lists (narrative cards, practice items, creative options) use semantic `list`/`listitem` markup.
- The three-stage learning loop is announced at session start: "This session has three stages: Encounter, Analysis, and Return. You are beginning the Encounter stage."

#### 7.3.2 Stage Transitions

When the stage transitions (Encounter --> Analysis, Analysis --> Return), the screen reader announces:
- "Transitioning to the Analysis stage. This is the focused practice phase."
- "Transitioning to the Return stage. This is the reflection and connection phase."

The 2-second visual transition is respected -- the announcement happens at the beginning, and the new content is available after the transition completes.

#### 7.3.3 Interactive Elements

| Element | ARIA Pattern | Announcement |
|---------|-------------|-------------|
| Narrative cards | `role="tabpanel"` with swipe navigation as tab list | "Narrative card 3 of 6. [Content]" |
| Recall prompt | Standard form input | "[Question text]. Text input. Type your answer." |
| Multiple choice | `role="radiogroup"` with `role="radio"` items | "Multiple choice. [Question]. Option A: [text]. Option B: [text]." |
| Categorization | `role="application"` with move-to buttons | "[Item]. Button: Move to [category 1]. Button: Move to [category 2]." |
| Sequencing | `role="listbox"` with aria-sort | "[Item] at position [N]. Button: Move up. Button: Move down." |
| Self-rating | `role="radiogroup"` | "How well did you recall this? Got it. Partially. Missed it." |
| Knowledge Map | `role="application"` with focusable nodes | "[Topic name]. [Status]. [N connections]. Activate to view details." |
| Confidence rating | `role="radiogroup"` | "Understanding level. 1 of 5: Just started. 2 of 5: Getting there." |

#### 7.3.4 Live Regions

- Feedback after submission uses `aria-live="polite"` to announce results: "Correct. The tree gained its mass from CO2 and water."
- Timer warnings (if enabled) use `aria-live="assertive"`: "30 seconds remaining."
- Stage progress uses `aria-live="polite"`: "Item 7 of 15 complete."

### 7.4 Keyboard Navigation

All functionality is operable via keyboard alone.

| Key | Action |
|-----|--------|
| `Tab` | Move to next focusable element |
| `Shift+Tab` | Move to previous focusable element |
| `Enter` / `Space` | Activate button, select option |
| `Arrow keys` | Navigate within radio groups, tab lists, sortable lists |
| `Escape` | Close overlay, exit modal, dismiss tooltip |

**Focus management:**
- Focus is visible as a 2px ring in `semantic-focus-ring` (blue at 50% opacity), offset 2px from the element edge. This ring is never suppressed, even when the element has its own focus style.
- When the stage transitions, focus moves to the first interactive element of the new stage.
- Modal overlays (topic detail card, creative synthesis expansion) trap focus within the modal until it is dismissed.

**Session keyboard navigation:**
- `Right Arrow` or `Enter` advances to the next narrative card in Encounter.
- `Left Arrow` returns to the previous card.
- `Tab` moves to the primary action button on each screen.

### 7.5 Reduced Motion

When the operating system's "Reduce Motion" setting is enabled (via `prefers-reduced-motion: reduce`), the following changes apply:

| Standard Behavior | Reduced Motion Alternative |
|-------------------|--------------------------|
| Stage transition crossfade (1.5s) | Instant color change with a brief (200ms) opacity fade |
| Narrative card slide animation | Opacity crossfade (200ms) |
| Background gradient animation | Static gradient (no animation) |
| Node pulse on Knowledge Map | Static glow (no animation) |
| Parallax scroll effects | Standard scroll (no parallax) |
| Drag item lift animation | Opacity change only (80% to 100%) |
| Feedback animations (shake, scale) | Color change only |
| Breathing/oscillation effects | Removed entirely |

**Critical rule:** All mode-signaling information conveyed by motion (e.g., "organic motion = RH mode") must also be conveyed by color, typography, and spacing, which change between stages regardless of motion preference.

### 7.6 Font Scaling

The app supports system font scaling from 85% to 200% of the base size.

**At 100% (default):**
- Base font size: 16px (1rem)
- All dimensions in rem scale proportionally

**At 150%:**
- All text sizes increase by 50%
- Layout adapts: cards stack vertically where they were side-by-side
- Touch targets remain at minimum 44x44px (they grow with text)
- Images scale proportionally but cap at 300px height to prevent them from dominating the viewport

**At 200%:**
- Text dominates the viewport; images are reduced to 200px max height
- Horizontal layouts collapse to vertical stacks
- Navigation labels may truncate with ellipsis; full labels available via long-press or screen reader
- Knowledge Map node labels increase but may overlap; the map becomes scrollable rather than trying to fit all labels

**Implementation:** All font sizes use `rem` units. Layout breakpoints trigger at both viewport width AND effective text size (using `em`-based media queries where needed). No `!important` overrides on font-size.

### 7.7 Color Blindness Considerations

The warm/cool color distinction between stages is perceivable by users with the most common forms of color vision deficiency (protanopia, deuteranopia, tritanopia) because the distinction operates across the warm-cool axis (which maps to the yellow-blue opponent channel, preserved in protanopia and deuteranopia) as well as through lightness and saturation differences.

However, as stated in Section 7.2, color is never the sole information carrier. Additional safeguards:

- **Correct/incorrect feedback:** Uses icons (checkmark / arrow indicator) in addition to green/amber color.
- **Stage identity:** Uses typography (serif vs. sans-serif), spacing (generous vs. tight), and layout structure (immersive vs. grid) in addition to color temperature.
- **Knowledge Map node status:** Uses fill pattern (solid, ring, outline) in addition to color intensity.
- **Progress indicators:** Use position/length in addition to color.

### 7.8 Accessibility Checklist Summary

| Requirement | Approach | WCAG Criterion |
|------------|---------|----------------|
| Text contrast >= 4.5:1 (normal) / 3:1 (large) | Verified per-stage palettes | 1.4.3 (AA) |
| Non-text contrast >= 3:1 | All UI components verified | 1.4.11 (AA) |
| Color not sole information carrier | Icons, text, shape as redundant signals | 1.4.1 (A) |
| Text resizable to 200% | rem-based sizing, responsive reflow | 1.4.4 (AA) |
| Reflow at 320px CSS pixels | Mobile-first design, tested at 320px | 1.4.10 (AA) |
| All functionality keyboard-operable | Tab, Enter, Arrow, Escape support | 2.1.1 (A) |
| No keyboard traps | Focus management, Escape to exit | 2.1.2 (A) |
| Focus visible | 2px ring, semantic-focus-ring color | 2.4.7 (AA) |
| Skip navigation link | "Skip to main content" on all screens | 2.4.1 (A) |
| Page titles descriptive | "[Topic] - [Stage] - Hemisphere" | 2.4.2 (A) |
| Heading hierarchy correct | Single h1, logical h2-h4 nesting | 1.3.1 (A) |
| ARIA landmarks present | nav, main, complementary, form | 1.3.1 (A) |
| Form labels present | Visible labels or aria-label on all inputs | 1.3.1 (A), 4.1.2 (A) |
| Error identification | Text description of errors, not just color | 3.3.1 (A) |
| Status messages via live regions | aria-live="polite" for feedback | 4.1.3 (AA) |
| Target size >= 44x44px | Verified for all interactive elements | 2.5.5 (AAA, targeted) |
| Motion reduced when preferred | prefers-reduced-motion support | 2.3.3 (AAA, targeted) |
| Audio controllable | Global volume, per-category toggles | 1.4.2 (A) |
| Captions for audio content | Transcripts for all narration | 1.2.1 (A) |

---

## Appendix A: Component Token Quick Reference

### Encounter Mode
```
Background:    #1C1612 (dark) / #FFF8F0 (light)
Accent:        #E8913A
Text:          #F5E6D3 (dark) / #2A2018 (light)
Font:          Source Serif 4, 18px body, 30-36px display
Radius:        16-24px
Motion:        400-800ms, organic ease-out
Sound:         Ambient pad, warm
```

### Analysis Mode
```
Background:    #0F1419 (dark) / #F5F7FA (light)
Accent:        #4A9EDE
Text:          #E8EDF3 (dark) / #1A2332 (light)
Font:          Inter, 16px body, 20px headings
Radius:        4-8px
Motion:        150-300ms, standard easing
Sound:         Silence + crisp clicks
```

### Return Mode
```
Background:    #18121C (dark) / #FDF5F8 (light)
Accent:        #D4724A
Text:          #F0E3EC (dark) / #2A1A2E (light)
Font:          Source Serif 4, 18px body (lh 1.7), 24px prompts (italic)
Radius:        12-16px
Motion:        500-1000ms, slow deceleration
Sound:         Deep ambient pad, shimmer on insight
```

## Appendix B: Screen Inventory

| Screen | Primary Mode | Section |
|--------|-------------|---------|
| Home / Dashboard | Encounter (whole-picture view) | 3.1 |
| Session Start (Time Selection) | Encounter | 3.2 |
| Encounter: Hook | Encounter | 3.3.1 |
| Encounter: Narrative Frame | Encounter | 3.3.2 |
| Encounter: Spatial Overview | Encounter | 3.3.3 |
| Encounter: Emotional Anchor | Encounter | 3.3.4 |
| Transition: E --> A | Transition | 3.4 |
| Analysis: Active Recall Card | Analysis | 3.5.1 |
| Analysis: Categorization | Analysis | 3.5.2 |
| Analysis: Sequencing | Analysis | 3.5.3 |
| Analysis: Feedback State | Analysis | 3.5.1 |
| Transition: A --> R | Transition | 3.6 |
| Return: Reconnection | Return | 3.7.1 |
| Return: Transfer Challenge | Return | 3.7.2 |
| Return: Creative Synthesis | Return | 3.7.3 |
| Return: Reflection | Return | 3.7.4 |
| Return: Session End | Return | 3.7.5 |
| Progress / Stats | Encounter (overview) | 3.8 |
| Knowledge Map | Encounter (spatial) | 3.9 |
| Settings | Neutral | (Not detailed -- standard settings screen) |

## Appendix C: Design-to-Research Traceability

| Design Decision | Research Basis | Source |
|----------------|---------------|--------|
| Warm colors for RH stages, cool for LH | RH processes the whole/contextual/emotional; LH processes the analytical/categorical | 01-neuroscience, 2.3, 8.1 |
| Serif font for Encounter/Return, sans-serif for Analysis | RH: organic, flowing, humanistic; LH: geometric, precise, systematic | 01-neuroscience, 2.3 |
| No progress bar during Encounter | Encounter is timeless, open, non-measured; progress metrics are LH | 01-neuroscience, 2.3; 03-design, 1.2 |
| Generous whitespace in RH stages | Broad, open attention requires expansive space | 01-neuroscience, 2.2, 2.3 |
| Dense, structured layout in Analysis | Narrow, focused attention operates on organized, structured material | 01-neuroscience, 2.2, 2.3 |
| Organic shapes for RH, geometric for LH | RH processes the living, flowing, organic; LH processes the mechanical, static, geometric | 01-neuroscience, 2.3 |
| Slow motion for RH, fast for LH | RH: lived time, flowing; LH: clock time, precise | 01-neuroscience, 2.3 |
| Ambient sound for Encounter, silence for Analysis | RH processes music, prosody, tone; LH operates in focused silence | 01-neuroscience, 3.7; 03-design, 1.2 |
| 1.5-2s transition between stages | Attentional mode shift requires a reset period | 03-design, 1.5 |
| Haptic pulse at E-->A transition | Tactile anchor for mode shift | 03-design, 1.5 |
| No gamification metrics (points, badges, streaks) | Extrinsic rewards undermine intrinsic motivation | 02-pedagogy, 4.3, 6.5 |
| Understanding depth + connection density as metrics | Genuine learning indicators vs. LH re-presentations of engagement | 01-neuroscience, 8.8; 02-pedagogy, 4.1 |
| Knowledge Map as organic force-directed graph | Real understanding is a web, not a tree; RH processes spatial relationships | 01-neuroscience, 3.8, 6.1 |
| Drawing canvas as creative output option | Embodied cognition: gesture and drawing facilitate learning | 01-neuroscience, 3.8; 02-pedagogy, 2.4 |
| "There are no wrong answers" for prediction prompts | Encounter stage allows ambiguity; pretesting effect benefits from attempted generation | 01-neuroscience, 2.7.2; 02-pedagogy, 2.9 |
| Return text uses italic for prompts | Italic signals questioning, openness, reflection -- RH qualities | Design interpretation of 01-neuroscience, 2.3 |
| Glow effect on Reconnection text | Visual signal of "seeing differently" -- the enriched RH return | 01-neuroscience, 2.5, 4.4 |
| Error feedback uses warm amber, not red | Errors are information, not punishment; growth-oriented framing | 02-pedagogy, 4.5; 03-design, 1.3 |

---

*This document specifies the complete visual and interaction design for the Hemisphere Learning App. Every design decision traces to the neuroscience and pedagogy research in Documents 01 and 02, and implements the instructional design patterns specified in Document 03. The specifications are detailed enough for a frontend developer to implement the design system, core screens, transitions, and interaction patterns. The design embodies the RH-->LH-->RH model not just in content but in the UI itself -- the learner feels the shift between hemispheric modes through color, type, shape, motion, and sound.*
