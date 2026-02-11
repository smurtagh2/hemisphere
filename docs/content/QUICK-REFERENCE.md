# Hemisphere Content Model - Quick Reference

A cheat sheet for creating learning content.

---

## The Three Stages (Required)

### 1. Encounter (RH-Primary) - 3-4 minutes
**Goal:** Meet the whole before the parts

```yaml
encounter:
  stage: encounter
  uiTheme:
    colorPalette: warm_immersive    # Warm colors
    typography: serif_narrative      # Readable serif
    layout: expansive                # Spacious
    timing: untimed                  # No pressure

  contentItems:
    - Hook (narrative with emotion)
    - Visual overview (concept map)
    - Emotional anchor (personal connection)
```

**Content Types:**
- Narrative stories
- Surprising facts
- Visual/spatial overviews
- Master metaphors
- Prediction prompts

**DON'T:**
- Start with definitions
- Use technical jargon
- Rush to analysis

---

### 2. Analysis (LH-Primary) - 6-10 minutes
**Goal:** Break down and practice the parts

```yaml
analysis:
  stage: analysis
  uiTheme:
    colorPalette: cool_focused      # Cool colors
    typography: sans_structured     # Clean sans-serif
    layout: grid                    # Organized
    timing: paced                   # Optional timers

  contentItems:
    - Concept cards (definitions)
    - Practice activities (retrieval)
    - Spaced review items
```

**Content Types:**
- Clear definitions
- Categorization exercises
- Retrieval practice (recall, not re-reading)
- Immediate feedback

**DON'T:**
- Skip practice
- Only use recognition (use recall)
- Overwhelm with info

---

### 3. Return (RH-Primary) - 3-4 minutes
**Goal:** Reintegrate into enriched whole

```yaml
return:
  stage: return
  uiTheme:
    colorPalette: reflective_open   # Open, warm
    typography: serif_narrative      # Readable
    layout: open                    # Spacious
    timing: flexible                # Untimed

  contentItems:
    - Reconnection (back to opening)
    - Reflection prompts
    - Transfer challenges
    - Creative synthesis
```

**Content Types:**
- Reflection questions
- Transfer to new contexts
- Creative production
- Cross-topic connections
- Celebration of insight

**DON'T:**
- End with more analysis
- Skip reflection
- Miss the "aha" moment

---

## Minimal Valid Topic

```yaml
schemaVersion: '1.0'
topics:
  - id: my-topic-slug
    version: 1.0.0

    metadata:
      title: Topic Title
      summary: Brief description
      subject: biology
      template: conceptual
      estimatedDuration: 15

    learningObjectives:
      - id: obj-1
        objective: What learner will achieve
        bloom: understand

    stages:
      encounter:
        stage: encounter
        contentItems:
          - id: enc-1
            type: narrative
            content: Your content here

      analysis:
        stage: analysis
        contentItems:
          - id: ana-1
            type: concept_card
            content: Your content here

      return:
        stage: return
        contentItems:
          - id: ret-1
            type: reflection_prompt
            content: Your content here
```

---

## Interaction Types Reference

### Analysis Stage (LH)
| Type | Use For | Example |
|------|---------|---------|
| `free_recall` | Retrieve without hints | "What is photosynthesis?" |
| `cued_recall` | Fill in blanks | "The powerhouse of the cell is the ___" |
| `multiple_choice` | Select from options | A, B, C, or D |
| `audio_recognition` | Identify sounds | "Which interval is this?" |
| `categorization` | Sort into groups | "Consonant vs Dissonant" |
| `drag_drop` | Match or arrange | Drag items to categories |
| `sequencing` | Put in order | Steps of process |
| `fill_blank` | Complete text | Sentence completion |

### Encounter/Return Stages (RH)
| Type | Use For | Example |
|------|---------|---------|
| `prediction` | Guess before learning | "What do you think will happen?" |
| `reflection` | Open contemplation | "What surprised you?" |
| `creative_synthesis` | Make something new | "Create your own metaphor" |
| `transfer_challenge` | Apply to new domain | "How is this like...?" |
| `free_text` | Extended response | Essay or explanation |

### All Stages
| Type | Use For | Example |
|------|---------|---------|
| `self_assessment` | Confidence rating | "How well do you understand?" |

---

## Interaction Template

```yaml
interactions:
  - id: unique-id
    type: multiple_choice          # or other type
    prompt: Your question here

    options:                       # for multiple_choice
      - id: opt-a
        text: Option A
        isCorrect: false
      - id: opt-b
        text: Option B
        isCorrect: true

    correctAnswer: opt-b           # or string for open-ended

    feedback:
      correct: Great work!
      incorrect: Try again - hint here
      general: Feedback for all

    allowSkip: false
    tags: [topic, concept, type]
```

---

## Media Template

```yaml
media:
  - type: image                    # image, audio, video, haptic, interactive
    url: /assets/images/topic/filename.jpg
    alt: Descriptive text (required for images)
    caption: Optional caption
    duration: 30                   # seconds, for audio/video
    attribution: Credit/license
    artistNotes: Instructions for creators
```

---

## Content Item Template

```yaml
contentItems:
  - id: unique-id
    type: narrative                # or concept_card, practice, etc.
    title: Display Title
    content: |
      Your content here
      Supports **markdown**

    duration: 60                   # estimated seconds

    media:
      - [media object]

    interactions:
      - [interaction object]

    layout: card                   # full_bleed, card, split, grid, spatial
    emotionalTone: wonder          # wonder, curiosity, focus, reflection, celebration

    metadata:
      hemisphere: RH               # RH, LH, or balanced
      difficulty: novice           # novice, intermediate, advanced
```

---

## Templates by Subject

### Conceptual (abstract ideas)
- **Encounter:** Master metaphor, visual overview
- **Analysis:** Definition cards, categorization
- **Return:** Transfer to new domain
- **Example:** Photosynthesis, supply and demand

### Procedural (step-by-step)
- **Encounter:** Why it matters, overview of process
- **Analysis:** Sequential steps, practice procedure
- **Return:** Adapt procedure to new situation
- **Example:** Solving equations, CPR

### Narrative/Historical (stories)
- **Encounter:** The story unfolds
- **Analysis:** Key events, timelines, causes
- **Return:** Implications, connections to today
- **Example:** Darwin's voyage, French Revolution

### Creative/Systems (making things)
- **Encounter:** Experience the system
- **Analysis:** Components and patterns
- **Return:** Create something new
- **Example:** Music composition, ecosystems

### Problem-Solving (puzzles)
- **Encounter:** The mystery/challenge
- **Analysis:** Tools and methods
- **Return:** Solve novel problems
- **Example:** Detective reasoning, debugging

---

## Bloom's Taxonomy Levels

| Level | Verbs | Example Objective |
|-------|-------|------------------|
| **Remember** | define, list, recall | Define photosynthesis |
| **Understand** | explain, summarize, describe | Explain how photosynthesis works |
| **Apply** | use, demonstrate, solve | Use photosynthesis to explain plant growth |
| **Analyze** | compare, contrast, examine | Analyze differences between C3 and C4 plants |
| **Evaluate** | judge, critique, assess | Evaluate claims about biofuels |
| **Create** | design, compose, construct | Design an artificial leaf |

**Best Practice:** Include objectives at multiple levels, culminating in Create.

---

## Knowledge Graph Template

```yaml
knowledgeGraph:
  nodes:
    - id: concept-1
      label: Photosynthesis
      type: concept              # concept, skill, fact, relationship

    - id: concept-2
      label: Chloroplast
      type: concept

  edges:
    - from: concept-2
      to: concept-1
      relationship: part_of      # prerequisite, related, part_of, example_of, contrasts_with
```

---

## Common Mistakes

### Don't Do This
```yaml
# ❌ Encounter starting with definition
encounter:
  contentItems:
    - content: "Photosynthesis is the process..."

# ❌ Analysis without practice
analysis:
  contentItems:
    - content: "Here are three concepts..."
    # No retrieval practice!

# ❌ Return ending with more analysis
return:
  contentItems:
    - content: "Let's review the steps again..."

# ❌ Missing required stages
stages:
  encounter: [...]
  # Missing analysis and return!

# ❌ Image without alt text
media:
  - type: image
    url: /path/to/image.jpg
    # Missing alt!
```

### Do This Instead
```yaml
# ✅ Encounter with narrative
encounter:
  contentItems:
    - content: "A tree weighs tons. Where does all that mass come from? The soil barely changes..."

# ✅ Analysis with retrieval practice
analysis:
  contentItems:
    - type: practice
      interactions:
        - type: free_recall
          prompt: "What is photosynthesis?"

# ✅ Return with reflection
return:
  contentItems:
    - type: reflection_prompt
      interactions:
        - type: reflection
          prompt: "How does this change how you see plants?"

# ✅ All three stages present
stages:
  encounter: [...]
  analysis: [...]
  return: [...]

# ✅ Image with alt text
media:
  - type: image
    url: /path/to/image.jpg
    alt: Detailed description for screen readers
```

---

## Validation

```bash
# Validate single file
npx tsx scripts/validate-content.ts content/topics/my-topic.yaml

# Validate all content
npx tsx scripts/validate-content.ts

# Expected output
✅ content/examples/harmony-intervals.yaml
✅ content/topics/my-topic.yaml

📊 Validation Summary:
   ✅ Valid:   2
   ❌ Invalid: 0
   📁 Total:   2
```

---

## Quality Checklist

- [ ] All three stages present
- [ ] Learning objectives with Bloom's levels
- [ ] Encounter starts with narrative/emotion
- [ ] Analysis includes retrieval practice
- [ ] Return includes reflection + transfer
- [ ] All images have alt text
- [ ] All interactions have feedback
- [ ] Knowledge graph defined
- [ ] Validates against schema
- [ ] Realistic durations
- [ ] Media files exist
- [ ] Meaningful tags

---

## Getting Help

- **Full Documentation:** `/docs/content/CONTENT-SCHEMA.md`
- **Example Content:** `/content/examples/harmony-intervals.yaml`
- **Content Guide:** `/content/README.md`
- **Neuroscience Foundation:** `/docs/research/01-neuroscience-foundation.md`

---

**Last Updated:** 2026-02-11
**Schema Version:** 1.0
