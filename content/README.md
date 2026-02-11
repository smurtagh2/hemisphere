# Hemisphere Learning Content

This directory contains YAML-formatted learning content for the Hemisphere app, structured according to the RH→LH→RH (Right Hemisphere → Left Hemisphere → Right Hemisphere) learning loop based on McGilchrist's hemisphere theory.

## Directory Structure

```
content/
├── README.md                    # This file
├── topics/                      # Production learning topics
│   └── [topic-id].yaml         # Individual topic files
├── examples/                    # Example content for reference
│   ├── harmony-intervals.yaml  # Music theory example
│   └── [other-examples].yaml
└── drafts/                      # Work-in-progress content
    └── [draft-topics].yaml
```

## Content Schema

All content files must conform to the YAML schema defined in `/content-schema.yaml`.

See `/docs/content/CONTENT-SCHEMA.md` for complete documentation.

## Quick Start

### Creating New Content

1. Copy an example file from `/content/examples/` as a template
2. Update the metadata with your topic information
3. Follow the three-stage structure:
   - **Encounter Stage** (RH-Primary): Narrative, context, emotional hook
   - **Analysis Stage** (LH-Primary): Concepts, practice, retrieval
   - **Return Stage** (RH-Primary): Reflection, transfer, synthesis
4. Validate your content (see below)
5. Move to `/content/topics/` when ready for production

### Required Fields

Every topic must include:

- `id`: Unique slug (e.g., `photosynthesis-basics`)
- `version`: Semantic version (e.g., `1.0.0`)
- `metadata`: Title, summary, subject, template, duration, etc.
- `learningObjectives`: At least one objective with Bloom's level
- `stages`: All three stages (encounter, analysis, return)
  - Each stage must have at least one content item
  - Each content item must have `id`, `type`, and `content`

### Content Validation

Validate YAML files before committing:

```bash
# Install dependencies
npm install

# Validate a single file
npm run validate:content content/topics/your-topic.yaml

# Validate all content files
npm run validate:content:all

# Lint and format YAML
npm run lint:yaml content/topics/your-topic.yaml
```

### Content Quality Checklist

Before publishing, ensure:

- [ ] All three stages are present and complete
- [ ] Learning objectives are defined with Bloom's taxonomy levels
- [ ] Encounter stage begins with narrative/emotional hook
- [ ] Analysis stage includes retrieval practice (not just reading)
- [ ] Return stage includes reflection and transfer activities
- [ ] All images have alt text for accessibility
- [ ] All interactions have appropriate feedback
- [ ] Media files exist at specified URLs
- [ ] Content validates against schema
- [ ] Estimated durations are realistic (test with actual users)
- [ ] Knowledge graph nodes and edges are defined
- [ ] Tags are meaningful and consistent with other content

## Content Templates

Choose the appropriate template for your topic:

### 1. Conceptual
**For:** Abstract ideas, principles, theories
**Example:** Supply and demand, photosynthesis, gravity
**Focus:** Understanding relationships and mechanisms

### 2. Procedural
**For:** Step-by-step processes, algorithms, methods
**Example:** Solving quadratic equations, CPR, the scientific method
**Focus:** Mastering sequences and procedures

### 3. Narrative/Historical
**For:** Stories, historical events, biographical learning
**Example:** Darwin's voyage, the French Revolution, a case study
**Focus:** Context, causation, human dimension

### 4. Creative/Systems
**For:** Emergent patterns, creative production, complex systems
**Example:** Music composition, ecosystems, economic systems
**Focus:** Understanding patterns and creating something new

### 5. Problem-Solving
**For:** Puzzles, mysteries, analytical challenges
**Example:** Detective reasoning, debugging code, diagnosis
**Focus:** Applying logic and testing hypotheses

## Writing Guidelines

### Encounter Stage (RH-Primary)

**Do:**
- Start with a story, question, or surprising fact
- Use rich metaphors and imagery
- Create emotional connection
- Provide spatial/visual overview
- Let ambiguity sit before resolving

**Don't:**
- Start with formal definitions
- Front-load technical jargon
- Rush to analysis
- Use generic stock language

### Analysis Stage (LH-Primary)

**Do:**
- Break concepts into clear components
- Provide immediate, specific feedback
- Use retrieval practice (not just re-reading)
- Space and interleave practice items
- Make structure explicit

**Don't:**
- Overwhelm with information
- Skip practice opportunities
- Provide only recognition tasks (use recall)
- Leave errors uncorrected

### Return Stage (RH-Primary)

**Do:**
- Reconnect to the opening narrative
- Ask for transfer to new contexts
- Invite creative synthesis
- Prompt metacognitive reflection
- Celebrate genuine insight

**Don't:**
- End with more analysis
- Skip the reflection phase
- Ignore cross-topic connections
- Miss the "aha" moment

## Media Assets

### Directory Structure

```
/assets/
├── images/
│   └── [topic-id]/
│       └── [image-name].{jpg,png,svg}
├── audio/
│   └── [topic-id]/
│       └── [audio-name].mp3
├── video/
│   └── [topic-id]/
│       └── [video-name].mp4
└── interactive/
    └── [topic-id]/
        └── [interactive-name].{html,json}
```

### Media Guidelines

**Images:**
- Format: JPG (photos), PNG (screenshots), SVG (diagrams)
- Max size: 500KB for photos, 200KB for diagrams
- Resolution: 2x for retina displays
- Always include alt text

**Audio:**
- Format: MP3, 128kbps minimum
- Normalize audio levels
- Keep clips under 30 seconds when possible
- Provide transcripts for accessibility

**Video:**
- Format: MP4, H.264 codec
- Max length: 2 minutes for Encounter, 30 seconds for Analysis
- Include captions/subtitles

**Interactive:**
- Use web standards (HTML5, SVG, JSON)
- Ensure mobile compatibility
- Provide fallback content
- Test on multiple devices

## Interaction Types

### Analysis Stage (LH-Focused)

- `free_recall`: Type the answer without prompts
- `cued_recall`: Fill in blanks with hints
- `multiple_choice`: Select from options
- `audio_recognition`: Identify sound samples
- `categorization`: Sort items into groups
- `drag_drop`: Arrange or match elements
- `sequencing`: Put steps in order
- `fill_blank`: Complete sentences

### Encounter/Return Stages (RH-Focused)

- `prediction`: Guess before learning
- `reflection`: Open-ended contemplation
- `creative_synthesis`: Make something new
- `transfer_challenge`: Apply to new domain
- `free_text`: Extended written response

### All Stages

- `self_assessment`: Rate confidence or understanding

## Spaced Repetition

Tag interactions for spaced repetition tracking:

```yaml
interactions:
  - id: practice-1
    type: free_recall
    prompt: What is photosynthesis?
    tags:
      - biology           # Subject area
      - photosynthesis   # Topic
      - definition       # Type
      - core-concept     # Importance
```

The system will automatically schedule review based on FSRS algorithm.

## Knowledge Graph

Define concept relationships for each topic:

```yaml
knowledgeGraph:
  nodes:
    - id: photosynthesis
      label: Photosynthesis
      type: concept
    - id: chloroplast
      label: Chloroplast
      type: concept

  edges:
    - from: chloroplast
      to: photosynthesis
      relationship: part_of
```

**Relationship Types:**
- `prerequisite`: Must learn A before B
- `related`: Conceptually connected
- `part_of`: A is a component of B
- `example_of`: A exemplifies B
- `contrasts_with`: A and B are opposites/alternatives

## Adaptive Content

Provide variants for different skill levels:

```yaml
contentItems:
  - id: enc-hook
    type: narrative
    content: |
      [Standard content for general audience]
    metadata:
      hemisphere: RH
      difficulty: novice
      adaptiveVariants:
        advanced: |
          [More sophisticated version for advanced learners]
```

## Versioning

Use semantic versioning for content:

- **Major** (1.0.0 → 2.0.0): Significant restructuring, different learning objectives
- **Minor** (1.0.0 → 1.1.0): New content items, enhanced activities, better media
- **Patch** (1.0.0 → 1.0.1): Typo fixes, minor clarifications, updated links

Update `metadata.updatedAt` whenever version changes.

## Getting Help

- **Schema questions:** See `/docs/content/CONTENT-SCHEMA.md`
- **Design principles:** See `/docs/design/03-instructional-design.md`
- **Neuroscience foundation:** See `/docs/research/01-neuroscience-foundation.md`
- **Examples:** See `/content/examples/`
- **Issues:** Create a Beads issue with `content` tag

## Contributing

1. Create content in `/content/drafts/`
2. Follow the schema and quality checklist
3. Validate your YAML
4. Request peer review
5. Move to `/content/topics/` when approved
6. Update version and date in metadata

## License

All content is proprietary to Hemisphere Learning, Inc.
Do not distribute without authorization.

---

**Last Updated:** 2026-02-11
**Schema Version:** 1.0
**Maintainer:** Content Team
