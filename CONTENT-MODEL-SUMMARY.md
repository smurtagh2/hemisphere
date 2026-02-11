# Hemisphere Content Model - Implementation Summary

**Date:** 2026-02-11
**Issue:** hemisphere-49o.1.21
**Status:** Complete

---

## Overview

This document summarizes the YAML schema definition for the Hemisphere content model, which implements the neuroscience-based RH→LH→RH (Right Hemisphere → Left Hemisphere → Right Hemisphere) learning loop.

## Deliverables

### 1. Core Schema Definition

**File:** `/content-schema.yaml`

A comprehensive JSON Schema (Draft 7) specification for YAML content that includes:

- **Topics**: Top-level learning modules with metadata, objectives, and stages
- **Learning Stages**: Three required stages (Encounter, Analysis, Return)
- **Content Items**: Individual learning activities with media and interactions
- **Interactions**: 14 different interaction types for user engagement
- **Media References**: Support for image, audio, video, haptic, and interactive assets
- **Knowledge Graph**: Concept nodes and relationship edges
- **Assessments**: Formative, summative, and transfer evaluation

### 2. Documentation

**File:** `/docs/content/CONTENT-SCHEMA.md`

Complete documentation including:

- Schema architecture and design principles
- Core concepts and definitions
- Detailed field specifications
- Content creation step-by-step guide
- Writing guidelines for each stage
- Validation instructions
- Best practices and quality checklist
- Schema evolution plan

### 3. Example Content

**File:** `/content/examples/harmony-intervals.yaml`

A complete, production-ready example demonstrating:

- All three learning stages (Encounter, Analysis, Return)
- Multiple content item types
- Diverse interaction types (14 different types used)
- Media references with alt text and attribution
- Knowledge graph with 10 nodes and 11 edges
- Formative, summative, and transfer assessments
- Adaptive content variants
- Proper metadata and versioning

### 4. Content Directory Structure

**File:** `/content/README.md`

Content management guide covering:

- Directory organization
- Quick start instructions
- Content templates (5 types)
- Writing guidelines for each stage
- Media asset specifications
- Interaction type reference
- Spaced repetition tagging
- Knowledge graph construction
- Adaptive content creation
- Versioning guidelines

### 5. Validation Script

**File:** `/scripts/validate-content.ts`

TypeScript validation script that:

- Validates YAML files against the JSON Schema
- Supports single file or batch validation
- Provides detailed error reporting
- Generates validation summary reports
- Can be integrated into CI/CD pipeline

---

## Schema Architecture

### Hierarchical Structure

```
Topic (Root)
├── Metadata
│   ├── Title, Subject, Template
│   ├── Duration, Prerequisites
│   └── Authors, Timestamps
├── Learning Objectives
│   └── Mapped to Bloom's Taxonomy
├── Stages (Required: All Three)
│   ├── Encounter (RH-Primary)
│   │   ├── UI Theme: Warm, Immersive, Untimed
│   │   ├── Content Items
│   │   │   ├── Narrative Hook
│   │   │   ├── Visual Overview
│   │   │   ├── Emotional Anchor
│   │   │   └── Prediction Prompts
│   │   └── Transition Configuration
│   ├── Analysis (LH-Primary)
│   │   ├── UI Theme: Cool, Focused, Paced
│   │   ├── Content Items
│   │   │   ├── Concept Cards
│   │   │   ├── Practice Activities
│   │   │   ├── Retrieval Practice
│   │   │   └── Elaborative Interrogation
│   │   └── Transition Configuration
│   └── Return (RH-Primary)
│       ├── UI Theme: Reflective, Open, Flexible
│       ├── Content Items
│       │   ├── Reconnection to Whole
│       │   ├── Reflection Prompts
│       │   ├── Transfer Challenges
│       │   └── Creative Synthesis
│       └── Completion
├── Assessments
│   ├── Formative (During)
│   ├── Summative (After)
│   └── Transfer (Delayed)
└── Knowledge Graph
    ├── Nodes (Concepts, Skills, Facts)
    └── Edges (Relationships)
```

### Key Design Principles

1. **Hemisphere-Aware**: Content explicitly maps to RH (contextual, emotional) or LH (analytical, sequential) processing
2. **Three-Stage Mandatory**: Every topic must complete the full RH→LH→RH circuit
3. **Media-Rich**: Multimodal learning with visual, audio, haptic, and interactive elements
4. **Validatable**: JSON Schema ensures content integrity and consistency
5. **Adaptive**: Support for skill-level variants and personalization
6. **Connected**: Knowledge graphs enable cross-topic relationships

---

## Content Templates

The schema supports 5 learning templates based on content type:

### 1. Conceptual
- **For:** Abstract ideas, principles, theories
- **Example:** Supply and demand, photosynthesis
- **Focus:** Understanding relationships and mechanisms

### 2. Procedural
- **For:** Step-by-step processes, algorithms
- **Example:** Solving equations, scientific method
- **Focus:** Mastering sequences and procedures

### 3. Narrative/Historical
- **For:** Stories, events, biographical learning
- **Example:** Darwin's voyage, historical events
- **Focus:** Context, causation, human dimension

### 4. Creative/Systems
- **For:** Emergent patterns, creative production
- **Example:** Music composition, ecosystems
- **Focus:** Understanding patterns and creating

### 5. Problem-Solving
- **For:** Puzzles, analytical challenges
- **Example:** Detective reasoning, debugging
- **Focus:** Applying logic and testing hypotheses

---

## Interaction Types

### Analysis Stage (LH-Focused)
1. `free_recall` - Open-ended recall without prompts
2. `cued_recall` - Recall with hints or partial information
3. `multiple_choice` - Select from options
4. `audio_recognition` - Identify sound samples
5. `categorization` - Sort items into categories
6. `drag_drop` - Arrange or match elements
7. `sequencing` - Put steps in correct order
8. `fill_blank` - Complete sentences or formulas

### Encounter/Return Stages (RH-Focused)
9. `prediction` - Make a guess before learning
10. `reflection` - Open-ended contemplation
11. `creative_synthesis` - Produce something new
12. `transfer_challenge` - Apply to new domain
13. `free_text` - Extended written response

### All Stages
14. `self_assessment` - Rate confidence or understanding

---

## Media Support

### Supported Types
- **Image**: Photos, illustrations, diagrams (JPG, PNG, SVG)
- **Audio**: Narration, music, sound effects (MP3)
- **Video**: Instructional videos, demonstrations (MP4)
- **Haptic**: Vibration patterns for mobile devices
- **Interactive**: Simulations, animations, tools (HTML, JSON)

### Required Fields
- All media must include `type` and `url`
- Images require `alt` text for accessibility
- Audio/video should specify `duration`
- Attribution and artist notes recommended

---

## Knowledge Graph

### Node Types
- **Concept**: Abstract ideas (e.g., "photosynthesis")
- **Skill**: Abilities (e.g., "balancing equations")
- **Fact**: Specific information (e.g., "Pythagoras discovered ratios")
- **Relationship**: Connections (e.g., "emotional response to music")

### Edge Relationships
- **prerequisite**: Must learn A before B
- **related**: Conceptually connected
- **part_of**: A is a component of B
- **example_of**: A exemplifies B
- **contrasts_with**: A and B are opposites

---

## Validation

### Schema Validation

```bash
# Install dependencies
npm install ajv ajv-cli ajv-formats js-yaml glob tsx

# Validate single file
npx tsx scripts/validate-content.ts content/examples/harmony-intervals.yaml

# Validate all content
npx tsx scripts/validate-content.ts

# Integration with package.json
npm run validate:content [file]
npm run validate:content:all
```

### Quality Checklist

Before publishing content:

- [ ] All three stages present and complete
- [ ] Learning objectives defined with Bloom's levels
- [ ] Encounter begins with narrative/emotional hook
- [ ] Analysis includes retrieval practice (not just reading)
- [ ] Return includes reflection and transfer
- [ ] All images have alt text
- [ ] All interactions have feedback
- [ ] Knowledge graph defined
- [ ] Content validates against schema
- [ ] Durations are realistic
- [ ] Media files exist at URLs
- [ ] Tags are meaningful

---

## Implementation Notes

### Database Integration

The YAML schema should be used to:

1. **Seed the database** with initial content during development
2. **Validate content** before ingestion into the database
3. **Export content** from the database for editing
4. **Version control** learning content separately from application code

### TypeScript Types

Generate TypeScript types from the schema:

```bash
npm install -g json-schema-to-typescript
json2ts content-schema.yaml > packages/shared/src/types/content-schema.ts
```

This ensures type safety when working with content in the application.

### Content Pipeline

Recommended workflow:

1. **Create** content in YAML (version controlled)
2. **Validate** against schema (CI/CD)
3. **Transform** YAML to database records (seed script)
4. **Serve** from database to application (API)
5. **Track** learner interactions and progress (runtime)
6. **Adapt** content based on learner data (analytics)

---

## Next Steps

### Immediate (Issue hemisphere-49o.1.21)
- [x] Define YAML schema
- [x] Create documentation
- [x] Build example content
- [x] Write validation script
- [ ] Close issue and sync

### Follow-up Issues

**hemisphere-49o.1.22**: Create validation scripts and CI integration
- Integrate validation into CI/CD pipeline
- Add pre-commit hooks
- Create content linting rules
- Generate TypeScript types

**hemisphere-49o.1.23**: Build seed pipeline for initial content
- Create database seeding scripts
- Transform YAML to database records
- Handle media asset migration
- Implement versioning strategy

**Future Enhancements**:
- Content authoring UI/tools
- Visual content editor
- Media asset management
- Analytics integration
- Adaptive algorithm tuning
- Collaborative editing features

---

## References

### Documentation
- `/content-schema.yaml` - Schema definition
- `/docs/content/CONTENT-SCHEMA.md` - Complete documentation
- `/content/README.md` - Content creation guide
- `/content/examples/harmony-intervals.yaml` - Example content

### Research Foundation
- `/docs/research/01-neuroscience-foundation.md` - McGilchrist's hemisphere theory
- `/docs/research/02-pedagogy-and-learning-science.md` - Learning science evidence
- `/docs/design/03-instructional-design.md` - Learning loop specification
- `/docs/content/05-sample-content.md` - Sample modules

### Standards
- [JSON Schema Draft 7](https://json-schema.org/draft-07/schema)
- [YAML 1.2](https://yaml.org/spec/1.2/spec.html)
- [Bloom's Taxonomy](https://en.wikipedia.org/wiki/Bloom%27s_taxonomy)
- [WCAG 2.1](https://www.w3.org/WAI/WCAG21/quickref/) - Accessibility

---

## Summary

This implementation provides a complete, validated, and documented YAML schema for the Hemisphere content model that:

✅ Implements the neuroscience-based RH→LH→RH learning loop
✅ Supports all required learning stages and content types
✅ Enables rich, multimodal learning experiences
✅ Provides comprehensive validation and quality controls
✅ Includes production-ready example content
✅ Offers clear documentation and guidelines
✅ Integrates with database and application architecture
✅ Supports future extensibility and evolution

The schema is ready for validation script integration and database seeding pipeline development.

---

**Issue Status:** ✅ Complete and ready for closure
**Blocked Issues:** hemisphere-49o.1.6 (unblocked by this completion)
**Created By:** Claude Sonnet 4.5
**Date:** 2026-02-11
