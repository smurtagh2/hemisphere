# Hemisphere Content Model - YAML Schema Documentation

**Version:** 1.0
**Date:** 2026-02-11
**Status:** Approved
**Schema File:** `/content-schema.yaml`

---

## Table of Contents

1. [Overview](#overview)
2. [Schema Architecture](#schema-architecture)
3. [Core Concepts](#core-concepts)
4. [Schema Definitions](#schema-definitions)
5. [Content Creation Guide](#content-creation-guide)
6. [Validation](#validation)
7. [Examples](#examples)
8. [Best Practices](#best-practices)

---

## Overview

The Hemisphere Content Model defines a structured YAML schema for creating learning content that implements the **RH→LH→RH (Right Hemisphere → Left Hemisphere → Right Hemisphere) learning loop** based on Iain McGilchrist's hemisphere theory of attention and learning.

### Purpose

This schema enables:

- **Structured learning content** that follows neuroscience-based pedagogy
- **Consistent format** across all learning modules
- **Machine-readable content** for validation and processing
- **Adaptive learning** through metadata and variants
- **Spaced repetition** integration via tagging and interaction tracking
- **Knowledge graph** construction for cross-topic connections

### Design Principles

1. **Hemisphere-aware**: Content explicitly maps to RH (contextual, narrative, emotional) or LH (analytical, sequential, categorical) processing
2. **Three-stage mandatory**: Every topic must include Encounter, Analysis, and Return stages
3. **Media-rich**: Support for multimodal learning (visual, audio, haptic, interactive)
4. **Adaptive**: Content variants for different skill levels
5. **Validatable**: JSON Schema validation ensures content integrity
6. **Extensible**: Metadata fields allow future enhancements

---

## Schema Architecture

```
Topic (Root Level)
├── Metadata (title, subject, template, etc.)
├── Learning Objectives (with Bloom's taxonomy)
├── Stages (required: all three)
│   ├── Encounter (RH-Primary)
│   │   ├── UI Theme (warm, immersive, untimed)
│   │   ├── Content Items
│   │   │   ├── Narrative Hook
│   │   │   ├── Visual Overview
│   │   │   ├── Emotional Anchor
│   │   │   └── Each with Media & Interactions
│   │   └── Transition to Analysis
│   ├── Analysis (LH-Primary)
│   │   ├── UI Theme (cool, focused, paced)
│   │   ├── Content Items
│   │   │   ├── Concept Cards
│   │   │   ├── Practice Activities
│   │   │   ├── Retrieval Practice
│   │   │   └── Each with Media & Interactions
│   │   └── Transition to Return
│   └── Return (RH-Primary)
│       ├── UI Theme (reflective, open, flexible)
│       ├── Content Items
│       │   ├── Reflection Prompts
│       │   ├── Transfer Challenges
│       │   ├── Creative Synthesis
│       │   └── Each with Media & Interactions
│       └── Completion
├── Assessments (formative, summative, transfer)
└── Knowledge Graph (concepts, relationships)
```

---

## Core Concepts

### Topics

A **Topic** is the top-level learning module (e.g., "The Hidden Architecture of Music", "Darwin's Dangerous Idea"). Topics are self-contained but can reference prerequisites and relate to other topics via the knowledge graph.

**Key Fields:**
- `id`: Unique slug identifier (e.g., `harmony-intervals`)
- `version`: Semantic version (e.g., `1.0.0`)
- `metadata`: Descriptive information, template type, duration, etc.
- `learningObjectives`: What the learner will achieve (mapped to Bloom's taxonomy)
- `stages`: The three required learning stages
- `knowledgeGraph`: Concept relationships within and across topics

### Learning Stages

Each topic contains exactly three stages, aligned with McGilchrist's cognitive circuit:

#### 1. Encounter Stage (RH-Primary)

**Purpose:** Introduce the whole before the parts; create emotional engagement and contextual understanding.

**Characteristics:**
- Warm, immersive UI theme
- Narrative-driven content
- Visual/spatial overviews
- Metaphorical framing
- Emotional hooks (wonder, curiosity)
- Untimed or flexible pacing
- No premature analysis

**Typical Content Items:**
- Narrative hook (story, scenario, surprising fact)
- Visual overview (concept map, spatial layout)
- Emotional anchor (personal connection, significance)
- Prediction prompts (activate prior knowledge)

#### 2. Analysis Stage (LH-Primary)

**Purpose:** Break down the whole into analyzable parts; practice, categorize, make explicit.

**Characteristics:**
- Cool, focused UI theme
- Structured, grid-based layout
- Clear definitions and rules
- Sequential presentation
- Active retrieval practice
- Feedback loops
- Spaced repetition items

**Typical Content Items:**
- Concept cards (definitions, taxonomies)
- Practice activities (drills, categorization)
- Retrieval practice (recall, recognition)
- Elaborative interrogation (why/how questions)

#### 3. Return Stage (RH-Primary)

**Purpose:** Reintegrate parts into enriched whole; transfer knowledge; creative synthesis.

**Characteristics:**
- Reflective, open UI theme
- Spacious layout
- Cross-topic connections
- Creative challenges
- Metacognitive prompts
- Celebration of insight
- Untimed reflection

**Typical Content Items:**
- Reflection prompts ("What surprised you?")
- Transfer challenges (apply to new domain)
- Creative synthesis (make something new)
- Cross-topic connections (knowledge web)

### Content Items

**Content Items** are the individual learning activities within each stage. They define what the learner sees, reads, hears, and does.

**Types:**
- `narrative`: Story-based introduction or explanation
- `concept_card`: Formal definition or explanation of a concept
- `visual_overview`: Spatial or graphical representation
- `spatial_map`: Interactive concept map
- `activity`: Learning activity or exercise
- `practice`: Retrieval practice or drill
- `reflection_prompt`: Open-ended reflection question
- `transition`: Bridge between stages

**Key Fields:**
- `content`: Main text (supports Markdown)
- `media`: Associated visual, audio, or interactive assets
- `interactions`: User engagement prompts
- `layout`: UI presentation style
- `emotionalTone`: Intended affective engagement
- `metadata.hemisphere`: Primary hemisphere engagement (RH/LH/balanced)

### Interactions

**Interactions** are user engagement points within content items—questions, exercises, prompts.

**Types:**

**Analysis Stage (LH-focused):**
- `free_recall`: Open-ended recall without prompts
- `cued_recall`: Recall with hints or partial information
- `multiple_choice`: Select from options
- `audio_recognition`: Identify audio samples
- `categorization`: Sort items into categories
- `drag_drop`: Arrange or match items
- `sequencing`: Put items in correct order
- `fill_blank`: Complete sentences or formulas

**Encounter/Return Stages (RH-focused):**
- `prediction`: Make a guess before learning
- `reflection`: Open-ended reflection on meaning
- `creative_synthesis`: Produce something new (metaphor, diagram, essay)
- `transfer_challenge`: Apply knowledge to novel context
- `free_text`: Extended written response

**All Stages:**
- `self_assessment`: Confidence or understanding rating

**Key Fields:**
- `prompt`: Question or instruction text
- `options`: Answer choices (for multiple choice, categorization)
- `correctAnswer`: Expected answer(s) for validation
- `feedback`: Messages for correct/partial/incorrect responses
- `modelAnswer`: Example answer (shown after submission for open-ended)
- `tags`: For spaced repetition and topic categorization

### Media References

Media assets (images, audio, video, haptics, interactive elements) that support content.

**Types:**
- `image`: Static visual (photo, illustration, diagram)
- `audio`: Sound (narration, music, sound effects)
- `video`: Moving visual with sound
- `haptic`: Vibration or tactile feedback patterns
- `interactive`: Embedded interactive element (animation, simulation)

**Key Fields:**
- `url`: Path or URL to asset
- `alt`: Alternative text (accessibility, required for images)
- `caption`: Optional caption text
- `duration`: Length in seconds (audio/video)
- `attribution`: Credit for the asset
- `artistNotes`: Instructions for content creators

---

## Schema Definitions

### Root Schema

```yaml
schemaVersion: '1.0'
topics:
  - [topic object]
  - [topic object]
  - ...
```

### Topic Object

```yaml
id: string (slug format, e.g., 'photosynthesis-basics')
version: string (semver, e.g., '1.0.0')

metadata:
  title: string (display title)
  subtitle: string (optional)
  summary: string (brief description)
  subject: string (e.g., 'biology', 'music', 'economics')
  template: enum [conceptual, procedural, narrative_historical, creative_systems, problem_solving]
  targetAudience: enum [general, novice, intermediate, advanced]
  estimatedDuration: number (total minutes)
  prerequisites: [topic IDs]
  tags: [searchable strings]
  authors:
    - name: string
      role: string
  createdAt: ISO 8601 datetime
  updatedAt: ISO 8601 datetime

learningObjectives:
  - id: string
    objective: string (what learner will achieve)
    bloom: enum [remember, understand, apply, analyze, evaluate, create]

stages:
  encounter:
    [learning stage object]
  analysis:
    [learning stage object]
  return:
    [learning stage object]

assessments:
  - id: string
    type: enum [formative, summative, transfer, creative]
    timing: enum [during, after, delayed]
    interactions: [interaction objects]

knowledgeGraph:
  nodes:
    - id: string
      label: string
      type: enum [concept, skill, fact, relationship]
  edges:
    - from: string (node id)
      to: string (node id)
      relationship: enum [prerequisite, related, part_of, example_of, contrasts_with]
```

### Learning Stage Object

```yaml
stage: enum [encounter, analysis, return]
name: string (display name)
description: string (stage purpose)
estimatedDuration: number (seconds)

uiTheme:
  colorPalette: enum [warm_immersive, cool_focused, reflective_open]
  typography: enum [serif_narrative, sans_structured]
  layout: enum [expansive, grid, open]
  timing: enum [untimed, paced, flexible]

transition:
  type: enum [crossfade, shift, gentle]
  duration: number (seconds)
  bridgeText: string (shown during transition)
  hapticCue: enum [pulse, none]

contentItems:
  - [content item object]
  - [content item object]
  - ...
```

### Content Item Object

```yaml
id: string (unique identifier)
type: enum [narrative, concept_card, visual_overview, spatial_map, activity, practice, reflection_prompt, transition]
title: string (optional display title)
content: string (markdown-supported text)
duration: number (estimated seconds)

media:
  - [media reference object]
  - ...

interactions:
  - [interaction object]
  - ...

layout: enum [full_bleed, card, split, grid, spatial]
emotionalTone: enum [wonder, curiosity, focus, reflection, celebration, neutral]

metadata:
  hemisphere: enum [RH, LH, balanced]
  difficulty: enum [novice, intermediate, advanced]
  adaptiveVariants:
    novice: [alternative content item]
    advanced: [alternative content item]
```

### Interaction Object

```yaml
id: string
type: enum [free_recall, cued_recall, multiple_choice, audio_recognition, categorization, drag_drop, sequencing, fill_blank, free_text, prediction, reflection, creative_synthesis, transfer_challenge, self_assessment]
prompt: string (question or instruction)

options:  # for multiple_choice, categorization
  - id: string
    text: string
    isCorrect: boolean
    feedback: string (optional)

correctAnswer: string | [strings]  # expected answer(s)

feedback:
  correct: string
  partial: string
  incorrect: string
  general: string

modelAnswer: string  # example answer for open-ended

allowSkip: boolean (default: false)
timeLimit: number (seconds, optional)

media:
  [media reference object]  # e.g., audio for recognition

tags: [strings]  # for spaced repetition
```

### Media Reference Object

```yaml
type: enum [image, audio, video, haptic, interactive]
url: string (path or URL)
alt: string (required for images)
caption: string (optional)
duration: number (seconds, for audio/video)
attribution: string (credit)
artistNotes: string (creation instructions)
```

---

## Content Creation Guide

### Step-by-Step Process

1. **Choose a Template**
   - Conceptual: Abstract ideas and principles
   - Procedural: Step-by-step processes
   - Narrative/Historical: Story-driven learning
   - Creative/Systems: Emergent patterns and creative production
   - Problem-Solving: Puzzle-based learning

2. **Define Learning Objectives**
   - What will learners be able to do?
   - Map to Bloom's taxonomy levels
   - Ensure objectives span remember → create

3. **Design the Encounter Stage**
   - Start with a narrative hook or surprising fact
   - Create visual overview (concept map)
   - Establish emotional connection
   - NO formal definitions yet
   - Duration: 3-4 minutes

4. **Design the Analysis Stage**
   - Break down into clear concepts
   - Create practice activities with feedback
   - Include spaced repetition items
   - Use retrieval practice, not just re-reading
   - Duration: 6-10 minutes

5. **Design the Return Stage**
   - Reflection prompts
   - Transfer challenges (new contexts)
   - Creative synthesis activities
   - Cross-topic connections
   - Duration: 3-4 minutes

6. **Create Transitions**
   - Bridge text between stages
   - UI theme changes (warm → cool → reflective)
   - Haptic cues (mobile)

7. **Build Knowledge Graph**
   - Identify key concepts (nodes)
   - Map relationships (edges)
   - Connect to other topics

8. **Add Media Assets**
   - Narrative images for Encounter
   - Diagrams for Analysis
   - Open visuals for Return
   - Audio where appropriate
   - Alt text for accessibility

9. **Validate Content**
   - Run YAML validator (see Validation section)
   - Check all three stages present
   - Ensure learning objectives are addressed
   - Test interactions

### Writing Guidelines

**Encounter Stage:**
- Use storytelling techniques
- Lead with questions, not answers
- Create "curiosity gap"
- Warm, inviting tone
- Rich metaphors
- No jargon without context

**Analysis Stage:**
- Clear, precise definitions
- Structured presentation
- Immediate feedback on practice
- Neutral, informative tone
- Break complex into simple
- Build from familiar to unfamiliar

**Return Stage:**
- Open-ended questions
- Encourage personal connection
- Celebrate insight
- Warm, reflective tone
- Connect to broader context
- Invite creativity

---

## Validation

### Schema Validation

Validate YAML content files against the schema:

```bash
# Using ajv-cli (JSON Schema validator for YAML)
npm install -g ajv-cli ajv-formats

# Validate a content file
ajv validate -s content-schema.yaml -d content/topics/harmony-intervals.yaml
```

### TypeScript Validation

Generate TypeScript types from schema:

```bash
# Using json-schema-to-typescript
npm install -g json-schema-to-typescript

# Generate types
json2ts content-schema.yaml > types/content-schema.ts
```

### Validation Script

Create `scripts/validate-content.ts`:

```typescript
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import fs from 'fs';
import yaml from 'js-yaml';

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

const schema = yaml.load(fs.readFileSync('content-schema.yaml', 'utf8'));
const validate = ajv.compile(schema);

// Validate all content files
const contentFiles = fs.readdirSync('content/topics').filter(f => f.endsWith('.yaml'));

for (const file of contentFiles) {
  const content = yaml.load(fs.readFileSync(`content/topics/${file}`, 'utf8'));
  const valid = validate(content);

  if (!valid) {
    console.error(`❌ ${file}: Validation failed`);
    console.error(validate.errors);
  } else {
    console.log(`✅ ${file}: Valid`);
  }
}
```

---

## Examples

See `/docs/content/examples/` for complete topic examples:

- `harmony-intervals.yaml` - Music theory (Creative/Systems template)
- `photosynthesis.yaml` - Biology (Conceptual template)
- `supply-and-demand.yaml` - Economics (Conceptual template)
- `natural-selection.yaml` - Biology (Narrative/Historical template)

Each example demonstrates:
- Complete RH→LH→RH loop
- All required metadata
- Multiple interaction types
- Media references
- Knowledge graph

---

## Best Practices

### Content Design

1. **Always complete the circuit**: Never skip any of the three stages
2. **Respect hemisphere characteristics**: Match content type to stage
3. **Use rich media**: Visual and audio enhance encoding
4. **Provide feedback**: Immediate, specific, and constructive
5. **Space practice**: Distribute retrieval practice over time
6. **Interleave topics**: Mix related concepts to promote discrimination
7. **Celebrate insight**: Mark moments of genuine understanding
8. **Build connections**: Use knowledge graph to link concepts

### Technical

1. **Use semantic versioning**: Update version on content changes
2. **Include all required fields**: Run validation before committing
3. **Provide alt text**: Accessibility is mandatory, not optional
4. **Use relative URLs**: For portability across environments
5. **Tag interactions**: Enable spaced repetition tracking
6. **Document artistic intent**: Use `artistNotes` for media creation
7. **Specify adaptive variants**: Support learners at different levels
8. **Test interactions**: Ensure feedback logic is correct

### Quality Checklist

Before publishing content:

- [ ] All three stages present and complete
- [ ] Learning objectives defined and mapped to Bloom's
- [ ] Each stage has appropriate UI theme
- [ ] Encounter stage begins with narrative/emotional hook
- [ ] Analysis stage includes retrieval practice
- [ ] Return stage includes reflection and transfer
- [ ] All images have alt text
- [ ] All interactions have feedback
- [ ] Knowledge graph nodes and edges defined
- [ ] Content validates against schema
- [ ] Estimated durations are realistic
- [ ] Media assets exist at specified URLs
- [ ] Tags are meaningful and consistent
- [ ] Version is correct and updated

---

## Schema Evolution

This schema is version 1.0. Future versions will:

- Remain backward compatible where possible
- Use semantic versioning
- Provide migration guides
- Support deprecated fields for transition periods

Proposed future enhancements:
- Collaborative learning activities (peer interaction)
- Adaptive difficulty algorithms (embedded in schema)
- Multimodal assessment (beyond text/audio)
- AR/VR content types
- Real-time analytics integration

---

## References

- [01-neuroscience-foundation.md](../research/01-neuroscience-foundation.md) - McGilchrist's hemisphere theory
- [02-pedagogy-and-learning-science.md](../research/02-pedagogy-and-learning-science.md) - Evidence-based learning strategies
- [03-instructional-design.md](../design/03-instructional-design.md) - Learning loop specification
- [05-sample-content.md](./05-sample-content.md) - Example learning modules
- [JSON Schema Draft 7](https://json-schema.org/draft-07/schema) - Schema specification standard

---

**Document Status:** Approved for implementation
**Next Review:** 2026-06-11
**Maintainer:** Content Team
**Questions:** Contact content@hemisphere.app
