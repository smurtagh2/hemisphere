# Content Authoring Guide

Guide for curriculum designers adding new learning items to Hemisphere.

## Data Model

### Item

An `Item` represents a single unit of learnable content. Key fields:

```ts
interface Item {
  id: string;
  subjectId: string;
  content: string;              // The question or prompt
  type: ItemType;               // interaction type (see below)
  correctAnswer: string;        // expected answer
  distractors?: string[];       // for multiple-choice
  tags: string[];               // Bloom's taxonomy level, topic
  difficulty: number;           // 0..1 initial FSRS difficulty
  stage: SessionStage;          // 'encounter' | 'analysis' | 'return'
}
```

### LearnerProfile

Tracks per-learner state across all items:
- `hemisphereScore`: [-1, +1] float — negative = left-dominant, positive = right-dominant
- `masteredItems`, `reviewQueue` — FSRS-scheduled item lists
- `learnerLevel`: overall mastery level

### FsrsCard

Per-item scheduling state for a learner:
- `stability`: how long memory lasts (days)
- `difficulty`: item-specific difficulty factor (1..10)
- `state`: `new | learning | review | relearning`
- `lastReview`, `nextReview`: timestamps
- Note: `retrievability` is computed dynamically — do not store it manually.

---

## The Four Stages

Each item maps to one of three session stages:

| Stage | Hemisphere | Purpose |
|-------|-----------|---------|
| `encounter` | Right (RH) | First exposure — imagery, story, pattern recognition |
| `analysis` | Left (LH) | Deep analysis — logic, structure, rule application |
| `return` | Right (RH) | Transfer — creative synthesis, novel connection |

In an `rh-lh-rh` experiment variant, a session presents items in encounter → analysis → return order. The `lh-only` baseline focuses on analysis-stage items.

---

## Interaction Types

Six interaction types are supported. Choose based on the cognitive goal:

| Type | Use when… |
|------|-----------|
| `MultipleChoice` | Testing recognition of a single correct answer with plausible distractors |
| `ShortAnswer` | Testing free recall with a rubric-gradable answer |
| `CategorizationDnD` | Testing ability to sort items into named categories |
| `SequencingDnD` | Testing ability to order steps or events correctly |
| `CreativeSynthesis` | Testing open-ended synthesis (return stage) |
| `ConnectionMapping` | Testing ability to identify relationships between concepts |

---

## Adding Items to the Seed Database

1. Open `scripts/verify-seed-ready.ts` — this script validates that the DB is populated.
2. Items are seeded through the API or directly via Drizzle into the `items` table.
3. Minimum fields required: `id`, `subjectId`, `content`, `type`, `correctAnswer`, `stage`, `difficulty`.
4. Run `npx tsx scripts/verify-seed-ready.ts` to confirm the seed is valid.

### Example Item JSON

```json
{
  "id": "item-001-photosynthesis-encounter",
  "subjectId": "biology-101",
  "content": "Which image best represents the flow of energy in photosynthesis?",
  "type": "MultipleChoice",
  "correctAnswer": "Sun → Leaf → Sugar",
  "distractors": [
    "Leaf → Sun → Sugar",
    "Sugar → Leaf → Sun",
    "Sun → Sugar → Leaf"
  ],
  "stage": "encounter",
  "difficulty": 0.3,
  "tags": ["bloom:remember", "topic:photosynthesis"]
}
```

---

## FSRS Scheduling Overview

Hemisphere uses the FSRS-5 algorithm for spaced repetition:

1. After each review, the learner rates difficulty (Again / Hard / Good / Easy).
2. FSRS computes new `stability` and `difficulty` values.
3. `nextReview` is set to `now + stability * retrievability_threshold`.
4. Items with low retrievability are surfaced first in the review queue.

**Retrievability** is computed as: `R = (1 + (19/81) × (t/s))^(-0.5)` where `t` = days since last review, `s` = stability. This is never stored; it is always recalculated.

---

## Quality Checklist

Before committing new items:

- [ ] Stem is unambiguous — one clear question
- [ ] Correct answer is objectively correct
- [ ] Distractors are plausible but clearly wrong
- [ ] `difficulty` is calibrated (use 0.3 for easy, 0.5 for medium, 0.7 for hard)
- [ ] `stage` matches the cognitive level (encounter=recognise, analysis=understand, return=apply/synthesise)
- [ ] At least one `bloom:*` tag is present
- [ ] Content is free of cultural bias and gender-neutral language
