# Instructional Design: The Hemisphere Learning Experience

**Version:** 1.0
**Date:** 2026-02-10
**Purpose:** Translate neuroscience research and pedagogy evidence into concrete, implementable learning experience designs
**Dependencies:** [01-neuroscience-foundation.md](../research/01-neuroscience-foundation.md), [02-pedagogy-and-learning-science.md](../research/02-pedagogy-and-learning-science.md)

---

## Table of Contents

1. [Learning Loop Specification](#1-learning-loop-specification)
2. [Lesson Template Designs](#2-lesson-template-designs)
3. [Assessment Framework](#3-assessment-framework)
4. [Adaptive Difficulty Algorithm Specification](#4-adaptive-difficulty-algorithm-specification)
5. [Content Type Taxonomy](#5-content-type-taxonomy)

---

## 1. Learning Loop Specification

### 1.1 Architecture Overview

Every learning interaction in Hemisphere follows a three-stage loop grounded in McGilchrist's RH-->LH-->RH cognitive circuit (see 01-neuroscience-foundation.md, Section 2.5). The loop is the atomic unit of the app. No content is ever delivered outside this structure.

```
SESSION ARCHITECTURE (Single Lesson, ~12-18 minutes)

 [ENCOUNTER]          [ANALYSIS]           [RETURN]
  RH-Primary           LH-Primary           RH-Primary
  ~3-4 min             ~6-10 min            ~3-4 min

  Narrative Hook  -->  Decomposition   -->  Reconnection
  Visual Overview      Retrieval Practice   Transfer Challenge
  Emotional Setup      Categorization       Creative Synthesis
  Metaphor Intro       Feedback Loops       Reflection Prompt
  Curiosity Gap        Spaced Items         Cross-Topic Links

      |                    |                    |
      v                    v                    v
  "What is this       "How does this       "What does this
   about?"              work?"               mean?"
```

The loop operates at three nested timescales:

| Timescale | Encounter | Analysis | Return |
|-----------|-----------|----------|--------|
| **Micro** (within a session, 12-18 min) | 3-4 min opening | 6-10 min focused practice | 3-4 min synthesis |
| **Meso** (across a topic unit, 3-7 sessions) | Session 1 is Encounter-heavy | Sessions 2-5 are Analysis-heavy with spaced review | Session 6-7 are Return-heavy |
| **Macro** (across the curriculum, months) | New domain introduction with broad survey | Systematic coverage of domain components | Cross-domain synthesis projects |

### 1.2 Stage 1: The Encounter (RH-Primary)

#### Purpose

Activate the right hemisphere's broad, open, contextual attention. The learner meets the subject as a living whole before any decomposition occurs. The goal is to create an initial gestalt -- a felt sense of what the territory looks like, why it matters, and what questions it raises.

**Neuroscience basis:** RH global precedence (Navon, 1977), novelty detection (Goldberg & Costa, 1981), emotional encoding enhancement (Cahill & McGaugh, 1998), narrative network activation (Mar, 2011), curiosity-enhanced memory (Gruber et al., 2014).

#### Exact Activities and Interaction Patterns

**Activity 1: The Hook (30-60 seconds)**

Format: A single screen presenting a surprising fact, paradox, or question. No scrolling. No options. Just the hook and a "Continue" button.

Interaction: The learner reads/listens. That is all. The design is deliberately minimal -- one piece of information, large typography, optional ambient audio. The restraint is intentional: the RH needs space, not stimulation overload.

Content types by subject:
- Science: A counterintuitive observation. "A tree weighs 10 tons. The soil it grew from lost almost none of its weight. Where did the tree come from?"
- History: A human moment. "In June 1789, a group of men locked out of their meeting hall walked to a nearby tennis court and swore an oath that changed the world."
- Math: A visual puzzle. An image of a pattern that seems impossible until the underlying principle is understood.
- Language: A sentence that means two completely different things depending on tone. (Audio plays both versions.)

UI specification:
- Full-bleed background: either a single striking image, a subtle gradient, or a dark field with the text centered.
- Typography: Large (24-32pt equivalent), serif or humanist sans-serif. Maximum 3 sentences.
- Audio: Optional ambient tone (not music with lyrics -- a sustained chord, a natural soundscape, or silence). If the hook is auditory, auto-play with waveform visualization.
- Color palette: Warm, saturated tones. Deep blues, ambers, terracottas. These shift to cooler tones in the Analysis stage.
- No progress bar visible. No timer. No score. The learner is not being measured; they are being invited.

**Activity 2: The Narrative Frame (60-120 seconds)**

Format: A short narrative -- 3-6 screens, each with 1-3 sentences and an accompanying illustration or animation. This is a story, not an explanation. It follows a character (historical figure, scientist, fictional learner, or the phenomenon itself personified) through a situation that embodies the concept.

Interaction: The learner swipes or taps through screens at their own pace. At one or two points, they face a low-stakes prediction prompt: "What do you think happened next?" or "What would you do?" These are not graded. They exist to activate the generation effect (Richland et al., 2005 -- the pretesting effect) and to shift the learner from passive reception to active engagement.

Content structure:
- Screen 1: Set the scene. A character, a place, a situation. Use concrete, sensory language.
- Screen 2-3: Develop the tension. Something puzzling, unexpected, or problematic occurs. This is the information gap (Loewenstein, 1994) that drives curiosity.
- Screen 4: Prediction prompt. "Before we go further -- what do you think is happening here?" Free-text input or 2-3 open-ended options (not right/wrong, but perspective choices).
- Screen 5-6: The reveal begins but does not complete. The narrative gestures toward the concept without naming it formally. The learner should feel "I almost understand this -- I want to know more."

UI specification:
- Card-style layout: each screen is a card that swipes horizontally.
- Illustrations: Hand-drawn or painterly style (not clinical diagrams -- those come in Analysis). The aesthetic should feel warm, human, and slightly imprecise, matching the RH's tolerance for ambiguity.
- Text overlay on images, or text-left / image-right split on larger screens.
- Prediction prompts appear as a gentle modal: rounded corners, warm background, placeholder text that says "There are no wrong answers here."
- Subtle page-turn or parallax animation between cards.

**Activity 3: The Spatial Overview (30-60 seconds)**

Format: A visual map showing the concept's territory -- how it connects to what the learner already knows and what they are about to explore. This is not a detailed diagram; it is a landscape view.

Interaction: The map is zoomable and pannable on touch. Key nodes are labeled with short phrases, not definitions. The node representing the current topic pulses gently. Previously studied topics are shown in solid color; upcoming topics are shown as translucent outlines. The learner can tap any node to see a one-sentence teaser ("You'll explore this next week") but cannot access the full content yet.

UI specification:
- Organic layout: nodes are positioned in a spatial arrangement that reflects conceptual relationships, not a rigid grid or tree. The RH processes spatial relationships and embodied space.
- Connections between nodes are shown as flowing lines, not arrows (arrows imply linear sequence; lines imply relationship).
- The current topic node is centered and enlarged.
- Color coding: warm colors for Encounter-stage content, cool colors for Analysis-stage content, mixed for Return-stage content.
- On mobile: the map fills the screen. Pinch-to-zoom is the primary interaction.

**Activity 4: The Emotional Anchor (15-30 seconds)**

Format: A single reflective prompt that connects the topic to the learner's life, identity, or values. This leverages the self-reference effect (Rogers, Kuiper, & Kirker, 1977) and emotional encoding.

Interaction: The learner sees a prompt like: "When was the last time you experienced something you couldn't explain?" or "Think about a time when knowing this would have changed a decision you made." They can either type a brief response (stored privately in their learning journal), tap "I thought about it" to proceed, or skip.

UI specification:
- Minimal screen: prompt text centered, journal-entry input field below.
- The input field is optional -- the prompt itself does the cognitive work even if the learner does not type anything.
- Warm, personal tone. First-person address.

#### Encounter Stage Timing

| Activity | Duration | Required? |
|----------|----------|-----------|
| The Hook | 30-60s | Yes |
| The Narrative Frame | 60-120s | Yes |
| The Spatial Overview | 30-60s | Yes (first encounter); optional on revisit |
| The Emotional Anchor | 15-30s | Optional but encouraged |
| **Total** | **~3-4 min** | |

#### Encounter Stage Exit Condition

The Encounter stage ends when the learner has completed the Narrative Frame and viewed the Spatial Overview. There is no knowledge check at this point. The purpose is engagement and context-setting, not assessment. The transition to Analysis is signaled by a clear UI shift (described in Section 1.5).

### 1.3 Stage 2: The Analysis (LH-Primary)

#### Purpose

Activate the left hemisphere's narrow, focused, analytical attention. Decompose the encountered whole into explicit, categorized, practicable parts. Build fluency through retrieval practice, spaced repetition, and interleaved exercises. This is where the hard cognitive work happens.

**Neuroscience basis:** LH categorical processing (Kosslyn et al., 1989), sequential processing (Efron, 1990), schema formation (Ghosh & Gilboa, 2014), desirable difficulties (Bjork & Bjork, 2011), testing effect (Roediger & Karpicke, 2006), spacing effect (Cepeda et al., 2006).

#### Exact Practice Types

**Practice Type 1: Active Recall Cards (Core mechanic)**

Format: A prompt appears. The learner must produce the answer from memory before seeing any options. This is free recall first, the strongest form of retrieval practice (Rowland, 2014).

Interaction flow:
1. Prompt appears (text, image, or audio). Example: "In the story of van Helmont's willow tree, what was his surprising finding?"
2. Learner types their response in a free-text field (or taps "Show options" if stuck, which downgrades to cued recall).
3. After submitting, the correct answer appears alongside the learner's response.
4. The learner self-rates: "Got it" / "Partially" / "Missed it" (this feeds the spaced repetition algorithm -- see Section 4).
5. If the learner chose "Show options," the system logs this as a failed free recall and successful cued recall (different data for the algorithm).

Difficulty progression:
- Level 1 (Novice): Cued recall with 4 options (multiple choice). Correct answer is verbatim from the Encounter narrative.
- Level 2 (Developing): Free recall with generous acceptance. The system matches keywords, not exact phrasing.
- Level 3 (Proficient): Free recall requiring precise terminology.
- Level 4 (Advanced): Free recall in a novel context. "If van Helmont had used a cactus instead of a willow, what would his results have shown?"

**Practice Type 2: Categorization Exercises**

Format: A set of items that must be sorted into categories. This engages the LH's categorical processing directly.

Interaction: Drag-and-drop on touch screens. Items appear in a central pool; category buckets are arranged at the top or sides. The learner drags each item to its correct category.

Examples:
- Sort these processes into "Light-dependent reactions" and "Light-independent reactions."
- Sort these historical events into "Causes of the Revolution" and "Effects of the Revolution."
- Sort these words into grammatical categories.

Feedback: Immediate per-item feedback. Correct placements stick with a subtle green pulse. Incorrect placements bounce back with a brief explanation of why they belong elsewhere. After completing the sort, a summary screen shows the organized categories.

**Practice Type 3: Sequencing Tasks**

Format: A set of steps or events presented in random order. The learner must arrange them in the correct sequence.

Interaction: Vertical drag-and-drop list. The learner drags items up and down to order them. A "Check" button reveals results.

Examples:
- Arrange the steps of the Calvin cycle in order.
- Place these historical events on a timeline.
- Order these steps for solving a quadratic equation.

Feedback: Correct positions lock in place (green). Incorrect positions are highlighted (amber) with arrows showing where they should move.

**Practice Type 4: Definition Matching**

Format: Two columns -- terms on the left, definitions on the right. The learner draws connections between matching pairs.

Interaction: Tap a term, then tap its definition. A line connects them. Tap either to disconnect.

Feedback: After all pairs are matched, correct pairs turn green, incorrect pairs turn amber with the correct match shown.

**Practice Type 5: Worked Example with Fading**

Format: A complete solution to a problem is shown step-by-step. On subsequent encounters, steps are progressively removed and the learner must fill them in.

Interaction flow (across multiple sessions, implementing Renkl et al., 2002):
- Session 1: Full worked example. The learner reads each step and answers a self-explanation prompt: "Why did we do this step?"
- Session 2: Same problem type, but step 3 of 5 is blank. The learner fills it in.
- Session 3: Steps 2 and 4 are blank.
- Session 4: Only step 1 is provided. The learner completes the rest.
- Session 5: The learner solves a similar problem from scratch.

**Practice Type 6: Elaborative Interrogation Prompts**

Format: A stated fact followed by "Why is this true?" or "Why does this make sense?"

Interaction: Free-text response. The system provides a model answer after the learner submits, and asks the learner to compare: "How does your explanation compare to this one? What did you include that we didn't? What did we include that you missed?"

This bridges LH analysis to RH integration (Pressley et al., 1992). It is placed late in the Analysis stage as preparation for the Return.

**Practice Type 7: Error Identification**

Format: A worked solution, explanation, or diagram that contains a deliberate error. The learner must find and correct it.

Interaction: The learner taps the location of the error and types or selects the correction.

This engages the LH's error-detection circuitry and builds deeper understanding than simply producing correct answers.

#### Feedback Mechanisms

All Analysis activities provide feedback following these principles:

1. **Immediate per-item feedback** for factual/procedural items. The learner knows within 2 seconds whether they were correct. Delayed feedback undermines the testing effect for simple recall (Rowland, 2014).

2. **Explanatory feedback** for conceptual items. Not just "correct/incorrect" but a brief explanation of why. "Carbon dioxide enters through the stomata, not the roots. The roots primarily absorb water and minerals."

3. **Confidence-calibration feedback** periodically. After a set of items, the system shows: "You said you were confident about 8 items. You got 6 of those right. You said you were unsure about 4 items. You got 3 of those right." This builds metacognitive accuracy (Kornell & Bjork, 2007; de Bruin et al., 2017).

4. **Growth-oriented framing**. Errors are never punished or dramatized. The language is: "Not quite -- here's why" rather than "Wrong!" Difficulty is framed as productive: "This one is tricky because it requires connecting two ideas." (Dweck, 2006.)

5. **No hearts, lives, or penalty systems**. The learner can always continue practicing regardless of accuracy. Errors are information, not punishment. This directly counters the Duolingo anti-pattern identified in the pedagogy research (02-pedagogy-and-learning-science.md, Section 5.1).

#### Difficulty Progression Within Analysis

Difficulty follows a four-level model inspired by Bloom's revised taxonomy, mapped to hemispheric processing:

| Level | Cognitive Demand | Typical Exercise | LH/RH Balance |
|-------|-----------------|------------------|----------------|
| 1: Remember | Recognize/recall facts | Multiple choice, definition matching | Pure LH |
| 2: Understand | Explain in own words | Elaborative interrogation, paraphrase | LH with RH bridge |
| 3: Apply | Use in familiar context | Worked example fading, structured problems | LH dominant |
| 4: Analyze | Distinguish, compare | Error identification, categorization of novel items | LH with RH preparation |

The system starts each learner at Level 1 for new content and advances based on accuracy and latency data (see Section 4). Levels 1-2 are the core Analysis activities; Levels 3-4 serve as a bridge toward the Return stage.

#### Spaced Repetition Within Analysis

Items from previous sessions are interleaved into the current session's Analysis stage. The schedule follows the FSRS algorithm (see Section 4.3). In a typical 8-minute Analysis block:

- 40% of items are new (from the current lesson's Encounter).
- 35% of items are due for review (from previous lessons, scheduled by FSRS).
- 25% of items are interleaved from different topics (to force discrimination -- Rohrer et al., 2015).

This means the learner is never only practicing one topic at a time. Even in a lesson "about" photosynthesis, some items will be from cellular respiration, plant anatomy, or chemistry -- topics related enough to require active discrimination.

#### Analysis Stage Timing

| Activity | Duration | Notes |
|----------|----------|-------|
| Active Recall Cards (new items) | 3-4 min | ~8-10 new items at 20-25s each |
| Spaced Review Items | 2-3 min | ~8-12 review items at 12-18s each (faster due to familiarity) |
| Categorization / Sequencing / Matching | 1-2 min | One structured exercise per session |
| Elaborative Interrogation | 1-2 min | 1-2 "why" prompts |
| **Total** | **~6-10 min** | Adapts to learner pace and available time |

#### Analysis Stage Exit Condition

The Analysis stage ends based on a combination of:
1. Minimum item count reached (at least 12 items attempted).
2. Performance threshold met (at least 60% accuracy on new items -- below this, the system provides additional scaffolding rather than continuing to the Return).
3. Time check (if the learner has been in Analysis for 10+ minutes, transition to Return regardless, to prevent fatigue).

If the learner's accuracy is below 60%, the system inserts a micro-Encounter: a 30-second re-engagement with the narrative or metaphor from Stage 1, followed by a simplified practice set. This prevents the "drill of death" anti-pattern where struggling learners are subjected to more of the same failing experience.

### 1.4 Stage 3: The Return (RH-Primary)

#### Purpose

Reactivate the right hemisphere's integrative, contextual, creative attention. The analyzed parts are now reassembled into a richer understanding of the whole. The learner transfers knowledge to new contexts, creates novel connections, and achieves the "aha" moment that signals genuine understanding.

**Neuroscience basis:** DMN integration (Beaty et al., 2016), insight generation in right anterior temporal lobe (Jung-Beeman et al., 2004), transfer requires broad RH representations (Barnett & Ceci, 2002), generation effect (Slamecka & Graf, 1978), sleep consolidation (Walker & Stickgold, 2010).

#### Exact Transfer and Synthesis Activities

**Activity 1: The Reconnection (30-60 seconds)**

Format: The original Encounter hook or narrative is re-presented, but now the learner has the analytical vocabulary to understand it differently.

Interaction: The same opening hook appears, but this time the learner is asked: "Now that you've studied the details, look at this again. What do you see differently?" The learner types a brief response or selects from 2-3 reflection options.

Example (photosynthesis): The original hook -- "Where does the tree's mass come from?" -- reappears. The learner now knows: "It's built from carbon dioxide in the air and water from the soil, powered by sunlight." The app shows: "A tree is literally made of air and light. The next time you see a forest, you're looking at solidified sunlight."

This is the moment McGilchrist describes as the enriched return -- the whole is encountered again, but now it is deeper, richer, and more resonant because the parts have been understood.

**Activity 2: The Transfer Challenge (60-120 seconds)**

Format: A novel scenario that requires applying the learned concept in a context the learner has not seen before. This is the critical test of genuine understanding versus memorized facts.

Interaction: A short scenario is presented (2-3 sentences), followed by an open-ended question. The learner types a response.

Transfer types (increasing difficulty):
- Near transfer: Same concept, slightly different context. "If a plant were placed in a sealed glass jar with only CO2 and water, what would happen over time?"
- Far transfer: Same principle, different domain. "A solar panel converts sunlight into electricity. How is this similar to and different from photosynthesis?"
- Creative transfer: Generate a novel application. "If you wanted to design a system that removed CO2 from the atmosphere, what could you learn from how plants do it?"

The system evaluates responses using keyword matching for basic correctness and, where available, LLM-based semantic evaluation for depth and creativity (see Section 3 for rubrics).

**Activity 3: The Creative Synthesis (60-90 seconds)**

Format: The learner creates something that demonstrates understanding. This is the generation effect (Fiorella & Mayer, 2016) at its most powerful.

Synthesis options (the learner chooses one):
- **Create a metaphor:** "Explain photosynthesis using a metaphor of your own invention. No scientific terms allowed."
- **Teach it:** "Explain this concept as if you were teaching a 10-year-old. What would you say?"
- **Draw it:** "Sketch a diagram showing how photosynthesis works. Label the key parts." (Touch-drawing interface on mobile.)
- **Connect it:** "How does today's topic connect to something else you've learned in Hemisphere?" (The learner selects nodes on their knowledge map and writes a sentence explaining the connection.)

These are stored in the learner's portfolio and can be revisited. The act of creation -- regardless of quality -- strengthens encoding more than any amount of passive review.

**Activity 4: The Reflection Prompt (30-45 seconds)**

Format: A metacognitive question that asks the learner to think about their own learning process.

Prompt examples:
- "What surprised you about this topic?"
- "What do you still wonder about?"
- "On a scale of 1-5, how well do you feel you understand this? What would move you from a 3 to a 4?"
- "What was the hardest part of today's practice? Why?"

Interaction: Free-text input, stored in the learning journal. The confidence rating feeds the adaptive algorithm (see Section 4).

**Activity 5: The Forward Glimpse (15-30 seconds)**

Format: A brief teaser of what comes next, creating a curiosity gap that carries across sessions.

Content: "Next time, we'll explore what happens to all that glucose the plant just made. Here's a hint: it's the reverse of what you just learned." Or: "You now understand how one plant feeds itself. But what about an entire ecosystem?"

This leverages the Zeigarnik effect (uncompleted tasks are remembered better than completed ones) and maintains engagement between sessions. It also sets up the next session's Encounter.

#### Return Stage Timing

| Activity | Duration | Required? |
|----------|----------|-----------|
| The Reconnection | 30-60s | Yes |
| The Transfer Challenge | 60-120s | Yes |
| The Creative Synthesis | 60-90s | Yes (choose one format) |
| The Reflection Prompt | 30-45s | Optional but encouraged |
| The Forward Glimpse | 15-30s | Yes |
| **Total** | **~3-4 min** | |

### 1.5 Transitions Between Stages

Transitions are critical. The learner must know which mode they are in and feel the shift. The transition design communicates "we are changing how you should attend" without being disruptive.

#### Encounter --> Analysis Transition

**UI shift:**
- Background transitions from warm tones (amber, terracotta, deep blue) to cool tones (slate, steel blue, white) over a 1.5-second crossfade.
- Typography shifts from serif (narrative) to sans-serif (analytical). Font size decreases slightly (from 24pt to 18pt equivalent).
- A thin progress bar appears at the top of the screen. It was absent during the Encounter.
- The layout shifts from full-bleed immersive to structured card-based grid.

**Verbal bridge:**
A single transition screen appears (1-2 seconds): "Now let's look more closely." or "Time to dig into the details." The language signals a shift from open exploration to focused work.

**Haptic cue (mobile):**
A single gentle vibration pulse marks the transition, creating a tactile anchor for the mode shift.

#### Analysis --> Return Transition

**UI shift:**
- Background transitions from cool tones back to warm, but slightly different from the Encounter (to signal "same-but-richer," not "going back to the beginning"). Use deeper, more saturated versions of the Encounter palette.
- Typography shifts back toward serif, with slightly more generous spacing (to signal reflective openness).
- The progress bar transforms into a completion ring or fades out.
- Layout returns to immersive/full-bleed.

**Verbal bridge:**
"Let's step back and see the bigger picture." or "Now that you know the parts, let's return to the whole."

**Audio cue:**
A brief ascending tone (2-3 notes) signals the shift, mirroring the "aha" or "opening up" quality of the Return.

#### Transition Timing

Transitions should be swift but not abrupt. Total transition time: 2-3 seconds. The learner should feel the mode shift but should not be waiting for an animation to complete.

### 1.6 Session Pacing and Timing

#### Default Session Length: 12-18 minutes

This is based on mobile-first design constraints: most learners will use the app in short sessions during commutes, breaks, or before bed. Research on attention spans in digital learning suggests 15-20 minutes as the effective ceiling before engagement drops (though this varies by learner and content).

#### Pacing Rules

1. **The Encounter should never be skippable on first exposure.** On repeat visits to a topic (spaced review), the Encounter is compressed or optional, but the first encounter must be complete.

2. **The Analysis stage adapts its length.** If the learner is performing well (>80% accuracy), the stage shortens. If the learner is struggling (<60% accuracy), the stage extends and inserts scaffolding. The target is always the ZPD (Vygotsky, 1978).

3. **The Return should never be cut short by time.** If a session is running long, shorten the Analysis stage rather than the Return. An incomplete Return is worse than a shorter Analysis -- it leaves the learner with fragmented knowledge rather than integrated understanding. This is the core lesson from McGilchrist: stopping at the Analysis stage is the fundamental educational error.

4. **Short sessions (5-7 minutes) are supported.** When the learner signals limited time, the system delivers a "Quick Loop": abbreviated Encounter (hook only, 30s), focused review (spaced items only, 3-4 min), and a single reflection prompt (30s). The Quick Loop is always less effective than a full session but better than skipping a day entirely.

5. **Long sessions (25-35 minutes) are supported.** The system can chain two loops: Loop 1 covers new material; Loop 2 covers a different topic in review. This naturally creates interleaving. Sessions longer than 35 minutes are discouraged -- the app suggests a break.

#### Cross-Session Pacing

A typical topic unit spans 5-7 sessions:

| Session | Primary Activity | Loop Balance |
|---------|-----------------|--------------|
| 1 | First Encounter with new topic | 40% Encounter, 35% Analysis, 25% Return |
| 2 | Deep Analysis, first spaced review | 15% Encounter (recap), 60% Analysis, 25% Return |
| 3 | Continued Analysis, interleaved review | 10% Encounter, 65% Analysis, 25% Return |
| 4 | Advanced Analysis, new connections | 10% Encounter, 55% Analysis, 35% Return |
| 5 | Integration and Transfer focus | 10% Encounter, 30% Analysis, 60% Return |
| 6 (optional) | Synthesis project | 5% Encounter, 15% Analysis, 80% Return |
| 7 (optional) | Cross-topic integration | 5% Encounter, 10% Analysis, 85% Return |

---

## 2. Lesson Template Designs

### 2.1 Template 1: Conceptual (Understanding Abstract Concepts)

**Use for:** Topics where the primary challenge is understanding a non-obvious idea. Examples: gravity, democracy, supply and demand, natural selection, opportunity cost.

#### Worked Example: "What is Natural Selection?"

**ENCOUNTER (3-4 min)**

*Hook (40s):*
Screen shows a photograph of a peppered moth on tree bark -- almost invisible. Text: "This moth survived because it was invisible. Its cousin, who looked identical in every other way, was eaten. The only difference? Color. This single difference changed the course of life on Earth."

*Narrative Frame (90s):*
- Screen 1: "In 1848, Manchester's trees were pale with lichen. Light-colored moths blended in. Dark moths stood out and were eaten by birds."
- Screen 2: "Then the Industrial Revolution blackened the trees with soot. Suddenly, the light moths stood out. The dark moths blended in."
- Screen 3: "Within fifty years, nearly all the moths near Manchester were dark. No one bred them that way. No one chose them. It just... happened."
- Screen 4 (prediction prompt): "What do you think caused this shift? How could a population change without anyone directing it?"
- Screen 5: "The answer is one of the most powerful ideas in the history of science. And it's simpler than you might think."

*Spatial Overview (45s):*
A concept map showing: Natural Selection at center, connected to Variation, Inheritance, Selection Pressure, Adaptation, and Evolution. Previously studied topics (if any) shown as connected nodes.

*Emotional Anchor (20s):*
"Think about something you're good at that your parents aren't (or vice versa). Where did that difference come from?"

**ANALYSIS (8 min)**

*Decomposition (2 min):*
Four key components presented as a structured breakdown:
1. **Variation** -- individuals in a population differ.
2. **Inheritance** -- traits pass from parent to offspring.
3. **Selection pressure** -- some traits improve survival.
4. **Differential reproduction** -- better-suited individuals have more offspring.

Each component gets a flashcard-style definition card with an example.

*Retrieval Practice (3 min):*
- Active recall: "What are the four requirements for natural selection to occur?" (free recall first, then options if stuck)
- Definition matching: Match each component to its example (variation <-> fur color differs among foxes)
- Sequencing: Arrange the process in logical order: variation exists --> environment poses challenge --> some variants survive better --> survivors reproduce more --> trait frequency shifts

*Worked Example with Fading (2 min):*
Worked example: "Bacteria in a hospital are exposed to an antibiotic. Most die, but a few have a mutation that makes them resistant. These survive and reproduce. Soon the hospital has antibiotic-resistant bacteria."
- Step 1 (given): Identify the variation. [Mutation for antibiotic resistance]
- Step 2 (given): Identify the selection pressure. [The antibiotic]
- Step 3 (learner fills in): What is the outcome? [Resistant bacteria survive and reproduce; population becomes resistant]

Next session: Steps 1 and 3 will be blank. Session after: all steps blank with a new scenario.

*Elaborative Interrogation (1 min):*
"Why can't natural selection work if there is no variation in a population?"

**RETURN (3.5 min)**

*Reconnection (45s):*
The peppered moth image returns. "Now you can see what happened: the variation was always there (light and dark moths). The selection pressure changed (tree color). Differential survival did the rest. No one designed it. No one directed it. The environment selected."

*Transfer Challenge (90s):*
"A farmer uses the same pesticide on their crops for ten years. Each year, the pesticide becomes less effective. Using what you know about natural selection, explain why."

*Creative Synthesis (60s):*
Choose one:
- "Invent a metaphor for natural selection that doesn't use biology. How is it like something in everyday life?"
- "Explain natural selection to a friend in three sentences. No scientific jargon allowed."

*Reflection (30s):*
"What surprised you about natural selection? What do you still wonder about?"

*Forward Glimpse (15s):*
"Next time: if natural selection is so simple, why did it take until 1859 for someone to figure it out? And why do some people still misunderstand it?"

#### Adaptation by Level

| Element | Novice | Intermediate | Advanced |
|---------|--------|-------------|----------|
| Encounter | Full narrative, all activities | Compressed narrative, skip spatial overview | Hook + brief recap only |
| Analysis recall | Multiple choice (4 options) | Free recall with keyword matching | Free recall requiring precise terminology |
| Worked examples | Full worked examples with self-explanation | Faded examples (2-3 steps blank) | Independent problems, novel scenarios |
| Transfer | Near transfer (same domain) | Mixed transfer | Far transfer (different domain), creative generation |
| Timing | 18 min (extended Analysis) | 15 min (standard) | 12 min (compressed Analysis, extended Return) |

#### Media Requirements

| Media Type | Encounter | Analysis | Return |
|------------|-----------|----------|--------|
| Photography | 1-2 striking images | None | 1 (revisited from Encounter) |
| Illustration | 3-5 narrative illustrations | Labeled diagrams | Optional |
| Animation | Optional (time-lapse, process) | Step-by-step process animation | Optional |
| Audio | Ambient tone, optional narration | None (silent focus) | Optional reflective music |
| Interactive | Concept map (zoomable) | Drag-and-drop sorting, flashcards | Free-text input, drawing canvas |

---

### 2.2 Template 2: Procedural (Learning Step-by-Step Processes)

**Use for:** Topics where the primary challenge is executing a sequence of operations correctly. Examples: solving quadratic equations, writing a thesis statement, performing CPR, balancing chemical equations.

#### Worked Example: "How to Solve a Quadratic Equation by Factoring"

**ENCOUNTER (3 min)**

*Hook (30s):*
An animation shows a ball arcing through the air -- a parabolic trajectory. Text: "Every time you throw a ball, you create a shape that mathematicians have studied for over 2,000 years. The equation that describes this curve holds the answer to questions like: How high will it go? When will it land?"

*Narrative Frame (90s):*
- Screen 1: "In ancient Babylon, scribes needed to calculate the areas of fields that weren't perfect rectangles. They scratched equations into clay tablets that look remarkably like what you'll learn today."
- Screen 2: "Their problem: 'I have a field. Its length is 7 more than its width. Its area is 60. What are its dimensions?' This is a quadratic equation in disguise."
- Screen 3 (prediction prompt): "If the width is x, the length is x + 7, and the area is 60, can you set up the equation?" [Input field]
- Screen 4: "The equation is x(x + 7) = 60, or x^2 + 7x - 60 = 0. Today you'll learn to find x."

*Spatial Overview (30s):*
Map showing: Quadratic Equations at center, connected to Factoring, Quadratic Formula, Completing the Square, Graphing Parabolas. Current lesson highlights Factoring.

**ANALYSIS (9 min)**

*Full Worked Example (2 min):*
Problem: Solve x^2 + 7x - 60 = 0

Step-by-step, one screen per step:
1. Identify a, b, c: a=1, b=7, c=-60
2. Find two numbers that multiply to ac (-60) and add to b (7). Numbers: 12 and -5 (because 12 x -5 = -60 and 12 + (-5) = 7)
3. Rewrite: (x + 12)(x - 5) = 0
4. Set each factor to zero: x + 12 = 0 or x - 5 = 0
5. Solve: x = -12 or x = 5
6. Check: Does x = 5 make sense for the field? Width = 5, Length = 12, Area = 60. Yes.

Self-explanation prompt after step 2: "Why do we need two numbers that multiply to ac AND add to b?"

*Faded Practice (3 min):*
Problem 2: Solve x^2 + 5x - 14 = 0
- Step 1 (given): a=1, b=5, c=-14
- Step 2 (learner fills): Find two numbers that multiply to ___ and add to ___. Numbers: ___ and ___
- Steps 3-5 (given)
- Step 6 (learner fills): Check your answer.

Problem 3: Solve x^2 - 3x - 10 = 0
- Step 1 (learner fills)
- Step 2 (learner fills)
- Step 3 (given)
- Steps 4-6 (learner fills)

*Independent Practice (2 min):*
Problem 4: Solve x^2 + 2x - 15 = 0 (all steps blank, hints available on tap)
Problem 5: Solve 2x^2 + 7x + 3 = 0 (increased difficulty -- leading coefficient not 1)

*Interleaved Review (2 min):*
2-3 items from previously learned procedures (e.g., solving linear equations, simplifying expressions) mixed with 1-2 quadratic items. This forces the learner to identify which procedure to use -- a critical discrimination skill.

**RETURN (3 min)**

*Reconnection (30s):*
The ball trajectory animation returns. "The ball's height at time t follows a quadratic equation. Now you can solve it. If h = -16t^2 + 48t + 4, when does the ball hit the ground?"

*Transfer Challenge (90s):*
"A store owner notices that if she raises the price of an item by $1, she sells 10 fewer per week. Currently the price is $20 and she sells 200 per week. Revenue = price x quantity = (20 + x)(200 - 10x). What price maximizes her revenue?" The learner must recognize this as a quadratic problem, set it up, and solve.

*Creative Synthesis (45s):*
"In your own words, explain the key insight behind factoring. Why does breaking a quadratic into two factors help us solve it?"

*Forward Glimpse (15s):*
"Not all quadratics factor neatly. Next time: what do you do when the numbers don't cooperate? There's a formula that always works."

#### Adaptation by Level

| Element | Novice | Intermediate | Advanced |
|---------|--------|-------------|----------|
| Worked examples | 2 full worked examples before any independent practice | 1 full, 1 faded | Jump to faded/independent |
| Error tolerance | Generous hints, "show me the next step" button always visible | Hints available on request | Hints withheld for 30s, then available |
| Problem types | Standard form only, integer solutions | Non-standard forms, include setup from word problems | Non-integer solutions, systems requiring method selection |
| Interleaving | None (blocked practice for first exposure) | Light interleaving (70% current, 30% review) | Heavy interleaving (50% current, 50% mixed review) |

#### Media Requirements

| Media Type | Encounter | Analysis | Return |
|------------|-----------|----------|--------|
| Animation | Parabolic trajectory | Step-by-step solution reveal | Ball trajectory with equation overlay |
| Interactive | Equation setup prompt | Step-by-step input fields, drag-and-drop for factoring | Word problem setup, graphing |
| Text | Narrative about Babylonian scribes | Definitions, formulas, step labels | Transfer scenario text |
| Audio | Optional ambient | None | None |

---

### 2.3 Template 3: Narrative/Historical (Understanding Events, Stories, and Causation)

**Use for:** Topics where the primary challenge is understanding why events happened, what caused what, and what the significance was. Examples: The French Revolution, the discovery of DNA, the fall of Rome, the Civil Rights movement.

#### Worked Example: "The French Revolution: Why Did It Happen?"

**ENCOUNTER (4 min)**

*Hook (45s):*
A single image: an ornate palace dining table set for one, contrasted with a bare wooden table set for a family of eight. Text: "In 1789, the price of bread consumed 88% of an average worker's wages. At Versailles, Marie Antoinette's annual clothing budget could have fed 1,000 families for a year. Something was about to break."

*Narrative Frame (120s):*
- Screen 1: "Meet Jacques. He's a baker in Paris in 1789. Every morning he opens his shop knowing he can barely afford the flour to make the bread his customers can barely afford to buy. Last week, a hailstorm destroyed the wheat harvest. The price of flour doubled overnight."
- Screen 2: "Meanwhile, at Versailles -- 12 miles away but a different world -- the king is hunting. The queen is redecorating. The court is debating the proper color for the season's waistcoats. France is bankrupt, but the nobles pay no taxes."
- Screen 3: "Jacques hears a rumor: the king is calling a meeting of the Estates-General for the first time in 175 years. The common people will have a voice. Maybe things will change."
- Screen 4 (prediction prompt): "Based on what you know about human nature, what do you think will happen when people who have been voiceless for 175 years are suddenly given a platform?"
- Screen 5: "What happened next was so explosive that it remade the political map of Europe and still shapes the world you live in today."

*Spatial Overview (45s):*
A timeline-map hybrid. The timeline spans 1789-1799. Key events are positioned as nodes. Connected causes (economic, social, political, intellectual) are shown as streams flowing into the revolutionary period. The learner can see the whole shape of the revolution before examining any single event.

*Emotional Anchor (30s):*
"Have you ever been in a situation where the rules felt fundamentally unfair? Where the people making the rules were the ones benefiting from them? Hold that feeling -- it's the emotional core of what we're about to study."

**ANALYSIS (8 min)**

*Causal Decomposition (2 min):*
Four categories of causes presented as structured cards:
1. **Economic causes:** National debt, tax inequality, bread crisis.
2. **Social causes:** Rigid estate system, rising bourgeoisie, Enlightenment ideas spreading.
3. **Political causes:** Weak king, power of the nobility, Estates-General crisis.
4. **Intellectual causes:** Voltaire, Rousseau, the American Revolution as precedent.

*Retrieval Practice (3 min):*
- Active recall: "Name two economic causes of the French Revolution."
- Categorization: Sort these factors into Economic / Social / Political / Intellectual causes (drag-and-drop).
- Sequencing: Arrange these events in chronological order: Estates-General meets --> Tennis Court Oath --> Storming of the Bastille --> Declaration of the Rights of Man --> Women's March on Versailles.

*Cause-and-Effect Mapping (2 min):*
Interactive exercise: the learner draws arrows between causes and effects. "The bread crisis led to ___." "Enlightenment ideas influenced ___." This builds the causal reasoning that history demands.

*Elaborative Interrogation (1 min):*
"Why did the revolution happen in 1789 specifically, and not in 1750 or 1800? What combination of factors made that particular moment explosive?"

**RETURN (4 min)**

*Reconnection (45s):*
Return to Jacques the baker. "Three months after the Estates-General, Jacques is standing outside the Bastille with a borrowed musket. He's not hungry anymore -- he's furious. The bread crisis didn't cause the revolution by itself. But without it, the intellectual ideas and political grievances might have stayed as grumbling. It was the stomach that lit the fuse."

*Transfer Challenge (90s):*
"In 2011, a street vendor in Tunisia set himself on fire to protest police corruption and economic hopelessness. Within weeks, revolutions spread across the Arab world. Using the causal categories you learned (economic, social, political, intellectual), analyze what caused the Arab Spring. What parallels do you see with 1789? What differences?"

*Creative Synthesis (60s):*
Choose one:
- "If you could travel back to 1788 and advise King Louis XVI, what three changes would you recommend to prevent the revolution?"
- "Write a one-paragraph diary entry from Jacques's perspective on July 14, 1789 (the storming of the Bastille)."

*Reflection (30s):*
"Revolutions are often described as either 'inevitable' or 'accidental.' Based on what you've learned, which do you think the French Revolution was? Why?"

*Forward Glimpse (15s):*
"The revolution promised liberty, equality, and fraternity. Within five years, it had produced the Reign of Terror. Next time: how does a revolution eat its children?"

#### Adaptation by Level

| Element | Novice | Intermediate | Advanced |
|---------|--------|-------------|----------|
| Narrative | Simplified, focus on 2-3 key figures | Full narrative with multiple perspectives | Primary source excerpts, competing interpretations |
| Analysis categories | Pre-labeled, learner sorts items into given categories | Learner must identify the categories themselves | Learner critiques the categories and proposes alternatives |
| Transfer | Guided comparison (specific parallels provided) | Open comparison (learner identifies parallels) | Independent analysis of an unfamiliar revolution |
| Creative synthesis | Guided prompts with sentence starters | Open prompts | "Write a counter-narrative: tell this story from the perspective of a noble." |

---

### 2.4 Template 4: Creative/Generative (Developing Creative Skills)

**Use for:** Topics where the primary goal is producing original work. Examples: writing metaphors, composing melodies, designing experiments, crafting arguments, drawing from observation.

This template inverts the typical balance: the Return stage is the longest and most important, because creative production IS the learning.

#### Worked Example: "Writing Metaphors"

**ENCOUNTER (3.5 min)**

*Hook (45s):*
Three metaphors appear, one after another, each lingering for 5 seconds:
- "Hope is the thing with feathers." -- Emily Dickinson
- "The fog comes on little cat feet." -- Carl Sandburg
- "All the world's a stage, and all the men and women merely players." -- Shakespeare

Text: "These sentences changed how millions of people see the world. None of them are literally true. All of them are deeply true. How?"

*Narrative Frame (90s):*
- Screen 1: "A metaphor is a bridge between two things that don't obviously belong together. When Emily Dickinson says hope has feathers, she forces your brain to hold two things at once -- hope and a bird -- and find the hidden connection."
- Screen 2: "Neuroscience tells us something remarkable: your right hemisphere is the bridge-builder. It specializes in seeing connections between distant ideas. When you read a fresh metaphor, your right hemisphere lights up."
- Screen 3: "But here's the key: the best metaphors don't just compare. They illuminate. They make you see something familiar as if for the first time."
- Screen 4 (prediction prompt): "Try it right now. Complete this sentence: 'Loneliness is ___.' Don't think too hard. Write the first image that comes to mind."

*Emotional Anchor (30s):*
"Think of a metaphor you use in everyday life without thinking about it -- 'life is a journey,' 'argument as war,' 'time is money.' What does that metaphor make you see? What does it hide?"

**ANALYSIS (5 min)**

*Decomposition (1.5 min):*
The anatomy of a metaphor:
1. **Tenor:** The subject being described (hope, fog, the world).
2. **Vehicle:** The image or comparison (feathers/bird, cat feet, stage).
3. **Ground:** The shared quality that connects them (hope is fragile and persistent like a bird; fog moves silently like a cat; life involves playing roles like actors).
4. **Tension:** The surprise or strangeness that makes the metaphor fresh (hope doesn't literally have feathers -- the gap between tenor and vehicle is what creates meaning).

*Analysis Practice (2 min):*
- Identify the tenor, vehicle, and ground in: "Her voice was a warm blanket on a cold night."
- Identify the tenor, vehicle, and ground in: "Time is a thief."
- Error identification: "Why is 'Life is a box of chocolates' considered a weak metaphor by many writers? What's missing?"

*Pattern Study (1.5 min):*
Present 5 strong metaphors and 5 weak ones. The learner categorizes them as strong or weak and then articulates what distinguishes the two groups. This builds discrimination -- the LH skill that underpins craft.

**RETURN (5.5 min) -- Extended for creative template**

*Reconnection (30s):*
"Now you know the machinery inside a metaphor. But knowing the parts doesn't make you a poet -- just as knowing the anatomy of a joke doesn't make you funny. The real skill is in the making."

*Generative Exercise 1: Guided Creation (90s):*
Prompt: "Write a metaphor for each of these abstract concepts. Try to surprise yourself."
- Fear is ___
- Memory is ___
- Learning is ___

After each submission, the system shows 2-3 published metaphors for comparison -- not to grade, but to expand the learner's sense of possibility.

*Generative Exercise 2: Constraint-Based Creation (90s):*
"Write a metaphor for anger that uses an image from the natural world (not fire -- that's too obvious)."
Constraints force creativity by closing off the easy paths (the LH's routinized responses) and demanding novel connections (an RH operation).

*Peer Gallery (optional, 30s):*
If social features are enabled, the learner sees 3-5 anonymous metaphors from other learners for the same prompt. They can mark ones they find striking. This provides social context and expands the space of possibilities.

*Reflection (30s):*
"Which of your metaphors surprised you the most? Why?"

*Forward Glimpse (15s):*
"Next time: how to extend a metaphor across an entire paragraph. One image, sustained and developed, can carry an entire essay."

#### Adaptation by Level

| Element | Novice | Intermediate | Advanced |
|---------|--------|-------------|----------|
| Encounter | Full analysis of what metaphor is | Brief recap, focus on advanced examples | Jump to complex examples (extended metaphor, mixed metaphor, dead metaphor revival) |
| Analysis | Identify components in given metaphors | Critique weak metaphors and improve them | Analyze why certain metaphors become cultural cliches and what that reveals |
| Generation | Fill-in-the-blank: "Anger is a ___" | Open prompts with constraints | Write an extended metaphor (3-5 sentences sustaining a single image) |
| Feedback | Model answers shown for comparison | Peer comparison + self-assessment rubric | Self-assessment against published literary examples |

---

### 2.5 Template 5: Systems/Relational (Understanding Complex Systems)

**Use for:** Topics where the primary challenge is understanding how multiple components interact to produce emergent behavior. Examples: climate change, the immune system, economic markets, ecosystems, the water cycle.

This template emphasizes the spatial overview and cross-component relationships. The RH's capacity for seeing the whole and the relationships between parts is especially critical here.

#### Worked Example: "The Immune System: How Your Body Fights Invaders"

**ENCOUNTER (4 min)**

*Hook (45s):*
Text: "Right now, as you read this, your body is fighting a war. Billions of cells are patrolling, communicating, and attacking invaders. You have an army you've never seen, and it's been protecting you since the day you were born. Most of the time, it wins. When it doesn't, you get sick. When it overreacts, you get allergies. When it attacks your own body, you get autoimmune disease. Meet your immune system."

*Narrative Frame (90s):*
- Screen 1: "Imagine your body as a fortified city. The skin is the city wall -- a physical barrier that keeps most invaders out. But sometimes, the wall is breached: a cut, a splinter, a breath of contaminated air."
- Screen 2: "The first responders are the innate immune cells -- the general-purpose soldiers who attack anything that doesn't belong. They're fast but not precise. Think of them as the city's fire department: they contain the damage but can't hunt down a specific criminal."
- Screen 3: "If the innate response isn't enough, specialized forces are called in: the adaptive immune system. These are the detectives and snipers -- they identify the specific invader and create custom weapons to destroy it."
- Screen 4 (prediction prompt): "Based on this metaphor, why do you think you can get the same cold twice but only get chickenpox once?"

*Spatial Overview (60s):*
An interactive system diagram showing the immune system's components as an interconnected network. Three layers are visible:
- Layer 1 (outer): Physical barriers (skin, mucus, stomach acid)
- Layer 2 (middle): Innate immunity (neutrophils, macrophages, inflammation)
- Layer 3 (inner): Adaptive immunity (T-cells, B-cells, antibodies, memory cells)

Arrows show communication pathways between layers. The learner can tap any component for a one-sentence description. The diagram pulses to show activity flow: invader enters --> barrier breached --> innate response --> adaptive response activated --> memory formed.

**ANALYSIS (8 min)**

*Component Decomposition (2 min):*
Each major component gets a card:
- **Physical barriers:** Skin, mucous membranes, stomach acid, cilia.
- **Innate immunity:** Neutrophils, macrophages, natural killer cells, inflammation, fever.
- **Adaptive immunity:** T-helper cells, T-killer cells, B-cells, antibodies, memory cells.

*Retrieval Practice (2.5 min):*
- Active recall: "What is the difference between innate and adaptive immunity?"
- Categorization: Sort these cells into "Innate immunity" and "Adaptive immunity."
- Sequencing: Arrange the immune response in order: pathogen enters --> physical barrier fails --> innate cells respond --> antigen presented --> T-cells activated --> B-cells produce antibodies --> pathogen destroyed --> memory cells formed.

*Interaction Mapping (2 min):*
Interactive exercise: given a scenario ("A virus enters through a cut on your hand"), the learner must trace the response through the system diagram, selecting which components activate in which order and drawing the communication arrows.

*Elaborative Interrogation (1.5 min):*
- "Why is it important that the adaptive immune system is slow to activate? What would happen if it responded as quickly as the innate system?"
- "Why do memory cells matter for vaccination?"

**RETURN (4 min)**

*Reconnection (45s):*
"Remember the city metaphor? Now you know who's in the army: the walls (physical barriers), the fire department (innate immunity), and the detective squad (adaptive immunity). But here's what's remarkable: this isn't just a metaphor for an army. It's a communication network. The cells talk to each other. They learn. They remember. Your immune system is, in a very real sense, an intelligent system."

*Transfer Challenge (90s):*
"Antibiotics kill bacteria but don't work on viruses. Using your understanding of the immune system, explain: (1) Why antibiotics are useless against viruses. (2) Why overusing antibiotics can actually weaken your immune system's ability to fight bacteria in the long run. (Hint: connect this to what you learned about natural selection.)"

This transfer challenge deliberately links to a previously studied concept (natural selection from Template 1), building the cross-topic web that characterizes deep understanding.

*Systems Thinking Challenge (60s):*
"Autoimmune diseases occur when the immune system attacks the body's own cells. Given what you know about how the system identifies 'self' versus 'non-self,' what do you think could go wrong? Design a hypothesis."

*Creative Synthesis (45s):*
"If you were designing the immune system from scratch, what would you change? What trade-offs would your redesign create?"

*Reflection (30s):*
"What's one connection between the immune system and another topic you've studied that you didn't expect?"

#### Adaptation by Level

| Element | Novice | Intermediate | Advanced |
|---------|--------|-------------|----------|
| System diagram | 3 components, simple arrows | Full diagram, labeled pathways | Full diagram + feedback loops, failure modes, edge cases |
| Analysis | Identify components and basic sequence | Trace multi-step interactions | Predict system behavior in novel scenarios (e.g., "What happens if T-helper cells are destroyed?" -- HIV) |
| Transfer | Single-system application | Cross-system comparison (immune system vs. computer firewall) | Multi-system integration (immune + natural selection + antibiotic resistance) |
| Creative challenge | "Draw the immune response to a cold" | "Design a vaccine delivery system" | "Propose a treatment for an autoimmune disease based on your understanding of the system" |

#### Media Requirements for Systems Template

| Media Type | Encounter | Analysis | Return |
|------------|-----------|----------|--------|
| Interactive diagram | System overview (zoomable, tappable) | Component isolation and interaction tracing | System diagram with learner annotations |
| Animation | Activity flow through system layers | Step-by-step process animations | Optional: "what-if" simulations |
| Illustration | Metaphor illustrations (city/army) | Labeled component diagrams | None (focus on learner-generated content) |
| Audio | Ambient (heartbeat, subtle body sounds) | None | Optional reflective |

---

## 3. Assessment Framework

### 3.1 Assessment Philosophy

Assessment in Hemisphere serves learning, not judgment. Every assessment activity is also a learning activity (the testing effect -- Roediger & Karpicke, 2006). There are no high-stakes "tests" separated from the learning experience. Instead, assessment is continuous, embedded, and feeds directly into the adaptive engine.

Two hemispheric modes require two assessment approaches:

| | LH Assessment | RH Assessment |
|---|---|---|
| **What it measures** | Recall accuracy, categorization skill, procedural fluency, factual knowledge | Transfer ability, creative application, connection-making, depth of understanding |
| **Format** | Structured: multiple choice, matching, sequencing, fill-in-the-blank, timed recall | Open-ended: free response, analogy creation, novel scenario analysis, creative production |
| **Evaluation** | Automated: exact match, keyword match, pattern match | Semi-automated: keyword + semantic analysis via LLM; rubric-based self-assessment |
| **When it occurs** | During Analysis stage | During Return stage |
| **Data produced** | Accuracy %, latency (ms), confidence rating, item difficulty | Response quality rating, transfer distance, creativity indicators, self-assessment calibration |

### 3.2 LH Assessment Types (Structured)

**Type 1: Free Recall**
- Prompt: "List the four requirements for natural selection."
- Evaluation: Keyword matching against target list. Partial credit for partial answers.
- Data: Number of targets recalled, order of recall (first-recalled items indicate strongest encoding), latency.

**Type 2: Cued Recall (Multiple Choice)**
- Prompt: "Which of these is NOT a requirement for natural selection? (a) Variation, (b) Intention, (c) Inheritance, (d) Selection pressure"
- Evaluation: Exact match. Track distractor selection patterns to identify misconceptions.
- Data: Accuracy, latency, distractor analysis.

**Type 3: Categorization**
- Prompt: Sort items into categories (drag-and-drop).
- Evaluation: Each item placement scored independently. Partial credit for partially correct sorts.
- Data: Accuracy per item, confusion patterns (which items are most frequently miscategorized, and into which wrong category).

**Type 4: Sequencing**
- Prompt: Arrange steps/events in order.
- Evaluation: Scored by number of items in correct position, or by Kendall tau distance from correct order.
- Data: Accuracy, specific inversions (which pairs are most often swapped).

**Type 5: Definition Matching**
- Prompt: Match terms to definitions.
- Evaluation: Exact pair matching. Partial credit for partially correct sets.
- Data: Accuracy, confusion pairs.

**Type 6: Procedural Completion**
- Prompt: Fill in missing steps of a worked example.
- Evaluation: Each step evaluated independently. For mathematical steps, evaluate the result; for verbal steps, use keyword matching.
- Data: Which steps are mastered, which require more practice.

### 3.3 RH Assessment Types (Open-Ended)

**Type 1: Transfer Application**
- Prompt: "A new scenario is described. Apply [concept] to explain what happens."
- Evaluation rubric:

| Score | Criteria |
|-------|----------|
| 4 (Excellent) | Correctly identifies the relevant concept, applies it accurately to the new context, notes important differences between the new context and the original, and generates a novel insight. |
| 3 (Proficient) | Correctly identifies the relevant concept and applies it to the new context. May miss nuances or differences. |
| 2 (Developing) | Identifies the relevant concept but applies it inaccurately or superficially. |
| 1 (Beginning) | Does not identify the relevant concept, or applies an incorrect concept. |
| 0 (No attempt) | Blank or irrelevant response. |

Automated evaluation: LLM-based semantic scoring using the rubric above. The LLM receives the rubric, the target concept, the scenario, and the learner's response, and produces a score with brief justification. This score is validated periodically against human ratings.

**Type 2: Analogy/Metaphor Creation**
- Prompt: "Create a metaphor for [concept] that doesn't use any of the metaphors we've already seen."
- Evaluation rubric:

| Score | Criteria |
|-------|----------|
| 4 | The metaphor is original, captures the essential structure of the concept, and illuminates something the formal definition does not. |
| 3 | The metaphor is appropriate and captures key features of the concept. |
| 2 | The metaphor is partially appropriate but misses key features or is misleading in some way. |
| 1 | The metaphor is superficial or inaccurate. |
| 0 | No metaphor provided, or the response is not a metaphor. |

**Type 3: Explain-to-a-Friend**
- Prompt: "Explain [concept] as if talking to a friend who has never studied it. No jargon."
- Evaluation: LLM assesses for (a) accuracy of the core concept, (b) absence of jargon, (c) use of concrete examples or analogies, (d) logical flow. This is a particularly powerful assessment because it requires the learner to translate from LH formal knowledge back into RH accessible, contextual communication.

**Type 4: Creative Production**
- Prompt varies by template (see Section 2). The learner creates something: a diagram, a metaphor, an alternative solution, a critique, a redesign.
- Evaluation: Self-assessment against provided rubric + optional LLM scoring. Creative production is assessed less for "correctness" and more for evidence of understanding (does the creative work demonstrate that the learner grasps the concept, even if the execution is rough?).

**Type 5: Connection Mapping**
- Prompt: "How does [current topic] connect to [previously studied topic]? Describe the connection."
- Evaluation: LLM assesses whether the connection is (a) real (not fabricated), (b) meaningful (not superficial), and (c) insightful (reveals something that isn't obvious).
- Data: Connection density per learner (how many cross-topic links they can identify), connection quality.

### 3.4 Integrated Assessment Types

These assessments require both hemispheric modes working together. They appear primarily in the Return stage and in periodic "Integration Challenges" that span multiple topics.

**Type 1: Case Study Analysis**
- Format: A novel case study (2-3 paragraphs) is presented. The learner must (a) identify which concepts apply (LH: categorization), (b) apply them to explain the case (LH+RH: application and transfer), and (c) propose a creative solution or extension (RH: generation).
- Example: "A hospital reports that its antibiotic-resistant infection rate has tripled in 5 years. Using your knowledge of natural selection, the immune system, and what you know about bacterial reproduction, (1) explain why this is happening, (2) predict what will happen in the next 5 years if nothing changes, and (3) propose a strategy to address the problem."

**Type 2: Debate Preparation**
- Format: The learner is given a position to defend on a topic where reasonable people disagree. They must (a) state the position clearly (LH), (b) provide supporting evidence (LH), (c) anticipate counterarguments (RH: perspective-taking), and (d) respond to the strongest counterargument (integrated).

**Type 3: Teaching Simulation**
- Format: The learner explains a concept to a simulated student (AI-driven) who asks follow-up questions, expresses confusion, and sometimes states misconceptions. The learner must adapt their explanation in real-time.
- Evaluation: The simulated student's "understanding" improves or doesn't based on the quality of the learner's explanations. The number of exchanges required to achieve understanding is the performance metric.

### 3.5 How Assessment Drives the Adaptive Engine

Every assessment event generates data that feeds the adaptive algorithm (detailed in Section 4):

| Data Point | Source | What It Tells Us |
|------------|--------|------------------|
| Item accuracy (binary) | All LH assessments | Whether the specific knowledge component is recalled correctly |
| Item latency (ms) | All timed assessments | Strength of retrieval (fast = automatic; slow = effortful; very slow = uncertain) |
| Confidence rating (1-5) | Self-rating after retrieval | Metacognitive calibration -- compared with actual accuracy |
| Free recall completeness (%) | Free recall prompts | Breadth of knowledge encoding |
| Transfer score (0-4) | Transfer challenges | Depth of understanding, flexibility of knowledge |
| Creative quality (0-4) | Creative synthesis | Ability to generate novel applications |
| Connection count | Connection mapping | Knowledge network density |
| Help-seeking behavior | "Show options" / "Show hint" usage | Whether the learner is in their ZPD or beyond it |
| Session completion | Session-level tracking | Engagement and persistence |
| Time-in-stage | Per-stage timing | Which stages the learner spends most/least time in (indicator of hemispheric preference) |

---

## 4. Adaptive Difficulty Algorithm Specification

### 4.1 Data Collection

The system collects the following data for every learner interaction:

**Per-item data:**
```
{
  item_id: string,
  learner_id: string,
  timestamp: ISO-8601,
  stage: "encounter" | "analysis" | "return",
  activity_type: string,      // e.g., "free_recall", "categorization", "transfer"
  response_correct: boolean,
  response_latency_ms: number,
  confidence_rating: 1-5 | null,
  help_requested: boolean,
  help_type: "show_options" | "show_hint" | "show_answer" | null,
  difficulty_level: 1-4,
  response_text: string | null,  // for open-ended items
  quality_score: 0-4 | null      // for rubric-scored items
}
```

**Per-session data:**
```
{
  session_id: string,
  learner_id: string,
  session_start: ISO-8601,
  session_end: ISO-8601,
  session_type: "full" | "quick" | "review",
  encounter_duration_s: number,
  analysis_duration_s: number,
  return_duration_s: number,
  items_attempted: number,
  items_correct: number,
  new_items: number,
  review_items: number,
  interleaved_items: number,
  topics_covered: string[],
  completion_status: "completed" | "abandoned" | "paused"
}
```

**Per-learner aggregate data (updated after each session):**
```
{
  learner_id: string,
  total_sessions: number,
  average_session_duration_s: number,
  overall_accuracy: number,        // rolling average
  accuracy_by_topic: { [topic]: number },
  accuracy_by_stage: { encounter: number, analysis: number, return: number },
  average_latency_ms: number,
  confidence_calibration: number,  // correlation between confidence and accuracy
  stage_time_ratio: { encounter: %, analysis: %, return: % },
  help_request_rate: number,       // % of items where help was requested
  streak_current: number,          // consecutive days of practice
  knowledge_components: { [kc_id]: KnowledgeState }
}
```

### 4.2 Detecting Which Stage Needs More Time

The system uses three indicators to detect hemispheric imbalance:

**Indicator 1: Stage-Specific Accuracy Differential**

If a learner's Analysis accuracy (LH items) significantly exceeds their Return accuracy (RH items), this suggests they are encoding facts but not integrating them. The system responds by:
- Extending the Return stage in future sessions.
- Adding more transfer challenges and creative synthesis activities.
- Inserting elaborative interrogation prompts as bridges from Analysis to Return.

If Return accuracy exceeds Analysis accuracy (rarer), this suggests the learner grasps the big picture but hasn't done the analytical work to make their understanding precise. The system responds by:
- Extending the Analysis stage.
- Adding more retrieval practice and categorization exercises.
- Requiring precise terminology in responses (not just gist).

Threshold: A differential of more than 15 percentage points between stage accuracies triggers adjustment.

**Indicator 2: Stage Time Preference**

The system tracks how much time each learner spends in each stage relative to the session design:
- Learners who rush through the Encounter (completing it in <60% of expected time) may be LH-dominant learners who want to "get to the real work." The system responds by making certain Encounter activities non-skippable and adding brief context-building activities to the Analysis stage.
- Learners who linger in the Encounter but rush through the Return may enjoy the narrative but avoid the hard work of transfer. The system responds by scaffolding the Return activities more heavily and providing structured transfer prompts rather than open-ended ones.

**Indicator 3: Help-Seeking Patterns**

- High help-request rates (>40% of items) during Analysis suggest the learner is beyond their ZPD. The system responds by decreasing difficulty, providing more worked examples, and potentially revisiting the Encounter to rebuild context.
- Zero help requests with low accuracy suggest the learner is overconfident or not using help strategically. The system responds by inserting confidence-calibration feedback more frequently.
- Help requests concentrated on specific item types (e.g., always needing help on categorization but not recall) suggest targeted skill gaps. The system adjusts by providing more practice on the weak item type.

### 4.3 Spaced Repetition Algorithm: FSRS (Free Spaced Repetition Scheduler)

The app uses the **FSRS algorithm** (Ye et al., 2024) for scheduling review items. FSRS was chosen over SM-2 for the following reasons:

1. **Superior empirical performance:** FSRS outperforms SM-2 by 10-30% in retention per review in published comparisons.
2. **Three-component memory model:** FSRS models each item's memory state as three variables -- Stability (S), Difficulty (D), and Retrievability (R) -- providing richer data for adaptation.
3. **Machine-learning optimized:** FSRS parameters can be fine-tuned per learner using their review history, enabling true personalization.
4. **Open-source:** FSRS is freely available, well-documented, and actively maintained.

#### FSRS Core Mechanics

**Memory state per item:**
```
{
  stability: number,      // S: time (in days) until retrievability drops to 90%
  difficulty: number,     // D: inherent difficulty of the item (0.0-1.0)
  retrievability: number  // R: current probability of successful recall (0.0-1.0)
}
```

**Scheduling logic:**
1. After each review, the learner rates the item: Again (1), Hard (2), Good (3), Easy (4).
2. FSRS updates Stability and Difficulty based on the rating, the current memory state, and the elapsed time since last review.
3. The next review is scheduled for the time when Retrievability is predicted to drop to a target threshold (default: 90%, adjustable per learner).
4. Items with low Stability are reviewed sooner; items with high Stability are reviewed later.

**Hemisphere-specific extensions to FSRS:**

Standard FSRS treats all items identically. We extend it with stage-aware scheduling:

- **Encounter items** (narrative recall, metaphor recognition): These are encoded in episodic, contextual memory (RH). They tend to have higher initial stability but benefit from context variation at review. When reviewing Encounter items, the system presents them in a slightly different narrative frame each time, leveraging the RH's preference for contextual variation.

- **Analysis items** (definitions, procedures, categorizations): These are encoded in semantic, categorical memory (LH). They follow standard FSRS scheduling. Review uses the same format as initial practice.

- **Return items** (transfer questions, creative prompts): These are not scheduled for exact repetition (you cannot "review" a creative transfer the same way twice). Instead, the system schedules transfer challenges at expanding intervals, but with novel scenarios each time. The item being spaced is the underlying concept, not the specific prompt.

### 4.4 Difficulty Progression Within Stages

Each knowledge component has a difficulty level (1-4) that advances based on consecutive correct responses and retreats based on errors:

```
Advancement rule:
  If accuracy >= 80% on last 5 attempts at current level:
    advance to next level (max 4)

Retreat rule:
  If accuracy < 50% on last 5 attempts at current level:
    retreat to previous level (min 1)

Stability rule:
  If accuracy is 50-80% on last 5 attempts:
    remain at current level (this is the ZPD)
```

The four levels correspond to the Analysis difficulty progression described in Section 1.3:

| Level | Description | Typical Format |
|-------|-------------|----------------|
| 1 | Recognition/recall | Multiple choice, matching |
| 2 | Comprehension | Free recall, paraphrase, elaboration |
| 3 | Application | Problem-solving in familiar contexts, worked example completion |
| 4 | Analysis/Transfer | Novel context application, error identification, cross-topic connection |

### 4.5 RH/LH Balance Adjustment Per Learner

The system maintains a per-learner **Hemisphere Balance Score (HBS)** ranging from -1.0 (strongly LH-dominant) to +1.0 (strongly RH-dominant), with 0.0 being balanced.

**HBS calculation:**
```
HBS = weighted_average(
  0.3 * stage_time_ratio_signal,    // positive if more time in Encounter/Return
  0.3 * accuracy_differential,       // positive if Return accuracy > Analysis accuracy
  0.2 * creative_engagement_signal,  // positive if learner engages deeply with creative tasks
  0.2 * help_pattern_signal          // positive if help is requested more in Analysis than Return
)
```

**System response to HBS:**

| HBS Range | Interpretation | Adjustment |
|-----------|---------------|------------|
| -1.0 to -0.3 | Strongly LH-dominant | Extend Encounter, add narrative bridges into Analysis, increase Return weighting, add creative constraints |
| -0.3 to -0.1 | Mildly LH-leaning | Slight extension of Return activities |
| -0.1 to +0.1 | Balanced | No adjustment (ideal state) |
| +0.1 to +0.3 | Mildly RH-leaning | Slight extension of Analysis activities, add precision requirements |
| +0.3 to +1.0 | Strongly RH-dominant | Extend Analysis, add structured practice, require exact terminology, reduce scaffolding in creative tasks |

The goal is not to force every learner to balance 0.0, but to ensure no learner is stuck permanently in one mode. A naturally LH-leaning learner who engages authentically with all three stages is fine. A learner who consistently skips or rushes through the Return stage needs intervention.

### 4.6 Interleaving Management

Interleaving is managed by a **Topic Scheduler** that operates alongside FSRS:

**Rules:**
1. No more than 70% of items in any Analysis block should come from the same topic.
2. Interleaved items are selected from topics that share conceptual overlap with the current topic (to force discrimination between similar concepts -- the condition where interleaving is most beneficial, per Carvalho & Goldstone, 2019).
3. The interleaving ratio increases with learner proficiency: novices get 80% current / 20% interleaved; advanced learners get 50% current / 50% interleaved.
4. Topics eligible for interleaving must have reached at least difficulty Level 2 (the learner needs basic recall before they can discriminate between topics).

**Topic similarity matrix:**
The content system maintains a similarity score between every pair of topics (0.0 = unrelated, 1.0 = highly similar). Interleaving preferentially selects from high-similarity topics because these are the pairs most likely to be confused and most benefited by discriminative practice.

Example: When practicing "photosynthesis," interleaved items come from "cellular respiration" (similarity 0.9), "plant anatomy" (0.7), and "chemical reactions" (0.5) -- not from "the French Revolution" (0.0).

### 4.7 Edge Cases

**Edge Case 1: The Stuck Learner**

Detection: Accuracy below 50% on a knowledge component for 3+ consecutive sessions despite difficulty retreat to Level 1.

Response:
1. Insert a micro-Encounter: re-present the original narrative and metaphor for the concept (re-engage RH contextual encoding).
2. Provide a fully worked example with self-explanation prompts (Renkl, 2014).
3. Reduce the number of new items in the session and increase the proportion of review items from mastered topics (rebuild confidence through competence).
4. If the learner remains stuck after 2 more sessions, flag for potential prerequisite gap: check whether the learner has mastered the prerequisite knowledge components. If not, redirect to the prerequisite topic.

**Edge Case 2: The Bored Learner**

Detection: Accuracy above 90% with latency below the 25th percentile (answering very quickly and correctly), combined with decreasing session frequency or decreasing session completion rate.

Response:
1. Accelerate difficulty progression (advance levels more aggressively).
2. Reduce the proportion of Review items and increase New items.
3. Offer "Challenge Mode" items: Level 4 transfer and creative problems that are deliberately difficult and open-ended.
4. Introduce new topics faster rather than over-drilling mastered ones.
5. If the learner has completed all content at their current depth, offer "depth extensions" -- advanced material that goes beyond the standard curriculum.

**Edge Case 3: The Disengaged Learner**

Detection: Session abandonment rate above 40% (starting sessions but not completing them), or declining session frequency (e.g., from daily to less than twice a week).

Response:
1. Shorten sessions: offer Quick Loop (5-7 min) as the default rather than full sessions.
2. Re-engage with the Encounter stage: lead with the most compelling, curiosity-triggering hooks from upcoming content.
3. Send a "curiosity nudge" notification: not "Don't break your streak!" (extrinsic, LH) but "We have a question for you: [compelling hook from the next topic]" (intrinsic, RH).
4. Review the learner's topic choices: are they studying something they chose or something assigned? Offer more autonomy in topic selection.
5. If the learner has been in Analysis-heavy sessions, the boredom may be stage-related: increase the Encounter and Return proportions.

**Edge Case 4: The Overconfident Learner**

Detection: Confidence ratings consistently higher than accuracy (calibration gap > 20%).

Response:
1. Increase the frequency of free recall (harder retrieval) relative to cued recall (easier but creates fluency illusion).
2. Insert explicit calibration feedback: "You rated yourself 5/5 confident on these items, but you got 3 out of 5 correct. This is normal -- our brains often feel more confident than they should. Spacing and testing help close this gap."
3. Add delayed retrieval checks: items the learner rated as "Easy" are tested again after a longer-than-normal delay to reveal whether the ease was genuine or illusory.

**Edge Case 5: The Anxious Learner**

Detection: High help-request rate combined with high accuracy when help is NOT used (the learner can do it but doesn't believe they can), or very long latencies on items they ultimately answer correctly (excessive deliberation).

Response:
1. Reduce time pressure: remove any visible timers.
2. Add encouraging calibration feedback: "You asked for help on 6 items, but when we look at similar items where you didn't ask for help, you got 85% right. You know more than you think."
3. Frame difficulty as growth: "This one requires you to stretch -- that's exactly where learning happens."
4. Gradually fade the "Show help" button's prominence as the learner's success rate increases, gently nudging them toward independence.

---

## 5. Content Type Taxonomy

### 5.1 Content Primitives

Content primitives are the atomic building blocks from which all learning experiences are composed.

| Primitive | Description | File Format | Typical Size | Stage Affinity |
|-----------|-------------|-------------|-------------|----------------|
| **Text Block** | A passage of prose (1-5 sentences). Can be narrative, explanatory, or instructional. | Markdown | 50-200 words | All stages |
| **Image (Static)** | A photograph, illustration, or diagram. | PNG, WebP | 100-500KB | Encounter (illustration), Analysis (diagram) |
| **Image (Annotated)** | An image with interactive hotspots that reveal text on tap. | SVG + JSON metadata | 200KB-1MB | Analysis, Return |
| **Audio Clip** | A narration, sound effect, ambient tone, or musical element. | AAC, 64-128kbps | 5-60s | Encounter (narration, ambient), Return (reflective) |
| **Video Clip** | A short animation or recorded demonstration. | H.264, 720p | 15-90s, <10MB | Encounter (hook animation), Analysis (process demo) |
| **Interactive Widget** | A self-contained interactive element: drag-and-drop, slider, drawing canvas, sortable list. | React component | Varies | Analysis (practice), Return (creation) |
| **Prompt** | A question or instruction that elicits a response from the learner. | Markdown + type enum | 10-50 words | All stages |
| **Response Field** | An input field for learner responses: text, selection, drawing, or sorting. | React component | N/A | Analysis (structured), Return (open-ended) |
| **Feedback Block** | A response to the learner's input: correctness indicator, explanation, model answer. | Markdown + correctness enum | 20-100 words | Analysis |
| **Transition Marker** | A UI element that signals the shift between stages. | React component + audio | N/A | Between stages |

### 5.2 Content Compositions

Compositions are structured assemblies of primitives that form recognizable learning activities.

**Composition 1: Narrative Sequence**
- Structure: 3-6 Text Blocks + 3-6 Images, presented as a swipeable card sequence.
- Contains: 1 Prompt (prediction) embedded at a dramatic moment.
- Stage: Encounter.
- Duration: 60-120 seconds.

**Composition 2: Concept Card**
- Structure: 1 Text Block (term + definition) + 1 Image (illustrative diagram or example) + 1 Audio Clip (optional pronunciation or narration).
- Stage: Analysis (initial presentation and spaced review).
- Duration: 10-20 seconds per card.

**Composition 3: Practice Set**
- Structure: 5-15 Prompts + Response Fields + Feedback Blocks, sequenced by difficulty.
- Contains: Mix of recall, categorization, matching, and sequencing items.
- Stage: Analysis.
- Duration: 3-8 minutes.

**Composition 4: Worked Example**
- Structure: 1 Problem Statement (Text Block) + 3-7 Step Cards (Text Block + optional Image), each with a Self-Explanation Prompt.
- Variants: Full (all steps shown), Faded (some steps blank), Independent (only problem shown).
- Stage: Analysis.
- Duration: 2-4 minutes.

**Composition 5: Transfer Challenge**
- Structure: 1 Scenario (Text Block, 2-4 sentences) + 1 Open-Ended Prompt + 1 Response Field (free text) + 1 Feedback Block (model answer or rubric-based evaluation).
- Stage: Return.
- Duration: 60-120 seconds.

**Composition 6: Creative Synthesis Task**
- Structure: 1 Prompt (creative instruction) + 1 Response Field (text, drawing, or selection) + optional Peer Gallery (3-5 anonymous peer responses).
- Stage: Return.
- Duration: 60-120 seconds.

**Composition 7: Reflection Prompt**
- Structure: 1 Prompt (metacognitive question) + 1 Response Field (free text or scale) + optional Journal Link (connects to learner's learning journal).
- Stage: Return.
- Duration: 30-60 seconds.

**Composition 8: Spatial Overview Map**
- Structure: 1 Interactive Widget (zoomable concept map) + N Node Labels (Text Blocks) + M Edge Labels (Text Blocks).
- Stage: Encounter (full view), Return (revisit with new annotations).
- Duration: 30-60 seconds.

**Composition 9: Spaced Review Block**
- Structure: A dynamically generated Practice Set where items are selected by the FSRS algorithm from multiple topics. Contains a mix of Concept Cards (for failed items) and Prompts (for review items).
- Stage: Analysis.
- Duration: 2-4 minutes.

**Composition 10: Integration Challenge**
- Structure: 1 Case Study (Text Block, 2-4 paragraphs) + 2-3 Prompts (LH identification + RH transfer + creative synthesis) + Response Fields + Feedback Blocks.
- Stage: Return (periodic, spanning multiple topics).
- Duration: 3-5 minutes.

### 5.3 Stage-to-Content Mapping

| Stage | Primary Compositions | Primary Primitives |
|-------|---------------------|-------------------|
| **Encounter** | Narrative Sequence, Spatial Overview Map | Text Block (narrative), Image (illustration), Audio Clip (ambient/narration), Video Clip (hook animation), Prompt (prediction) |
| **Analysis** | Practice Set, Worked Example, Concept Card, Spaced Review Block | Prompt (structured), Response Field (selection/text), Feedback Block, Image (diagram), Interactive Widget (sorting/matching) |
| **Return** | Transfer Challenge, Creative Synthesis Task, Reflection Prompt, Integration Challenge | Prompt (open-ended), Response Field (free text/drawing), Text Block (reconnection narrative), Spatial Overview Map (revisited) |

### 5.4 Content Item Metadata Schema

Every content item (primitive or composition) carries the following metadata:

```
ContentItem {
  // Identity
  id: string (UUID),
  version: number,
  created_at: ISO-8601,
  updated_at: ISO-8601,

  // Classification
  type: ContentPrimitive | ContentComposition,  // from the enums above
  stage: "encounter" | "analysis" | "return" | "transition",
  hemisphere_mode: "rh_primary" | "lh_primary" | "integrated",

  // Difficulty and Progression
  difficulty_level: 1 | 2 | 3 | 4,
  bloom_level: "remember" | "understand" | "apply" | "analyze" | "evaluate" | "create",
  novice_suitable: boolean,
  advanced_suitable: boolean,

  // Topic and Prerequisites
  topic_id: string,
  topic_path: string[],           // hierarchical path, e.g., ["biology", "ecology", "photosynthesis"]
  knowledge_components: string[], // fine-grained skills/facts this item targets
  prerequisites: string[],       // knowledge_component IDs that must be mastered before this item

  // Media
  media_types: ("text" | "image" | "audio" | "video" | "interactive")[],
  estimated_duration_s: number,
  file_size_bytes: number,        // for bandwidth/offline planning

  // Spaced Repetition
  is_reviewable: boolean,         // can this item be used in spaced review?
  review_format: string | null,   // if reviewable, what format does the review take?

  // Interleaving
  similarity_tags: string[],      // tags used to compute topic similarity for interleaving
  interleave_eligible: boolean,   // can this item appear as an interleaved item in another topic's session?

  // Assessment
  assessment_type: "lh_structured" | "rh_open" | "integrated" | "none",
  auto_scorable: boolean,         // can the system score this without LLM/human?
  rubric_id: string | null,       // for rubric-scored items

  // Accessibility
  alt_text: string | null,        // for images
  transcript: string | null,      // for audio/video
  language: string,               // ISO 639-1
}
```

### 5.5 Content Relationships

Content items exist in a graph, not a list. The following relationship types connect items:

| Relationship | Description | Example |
|-------------|-------------|---------|
| **prerequisite** | Item A must be mastered before Item B is presented. | "Definition of 'gene'" is prerequisite to "How natural selection works." |
| **same_concept** | Items A and B assess the same knowledge component in different formats. | A recall card and a transfer challenge both targeting "photosynthesis light reactions." |
| **stage_sequence** | Items A, B, C form an Encounter-->Analysis-->Return sequence for one lesson. | Narrative about van Helmont --> recall cards about photosynthesis equation --> transfer to solar panels. |
| **interleave_pair** | Items A and B are similar enough to benefit from interleaved practice. | "Photosynthesis equation" and "cellular respiration equation." |
| **cross_topic_link** | Items A and B connect different topics and should be surfaced in the Return stage. | "Antibiotic resistance" (biology) and "natural selection" (evolution). |
| **difficulty_variant** | Items A, B, C, D are the same question at difficulty levels 1, 2, 3, 4. | MC version, free recall version, application version, transfer version of the same concept. |
| **narrative_continuation** | Item A's narrative continues in Item B (for multi-session topics). | Session 1's story about Jacques the baker continues in Session 2's Encounter. |

---

## Appendix A: Session Flow Diagram

```
START SESSION
    |
    v
[Time Check] -- "How much time do you have?"
    |
    +--> 5-7 min: Quick Loop
    |     |
    |     v
    |    [Abbreviated Hook (30s)]
    |     |
    |     v
    |    [Spaced Review Only (3-4 min)]
    |     |
    |     v
    |    [Single Reflection Prompt (30s)]
    |     |
    |     v
    |    END
    |
    +--> 12-18 min: Standard Loop
    |     |
    |     v
    |    [ENCOUNTER: Hook + Narrative + Spatial Overview + Emotional Anchor]
    |     |  3-4 min
    |     v
    |    [TRANSITION: Warm --> Cool]
    |     |
    |     v
    |    [ANALYSIS: New Items + Spaced Review + Interleaved Items + Exercises]
    |     |  6-10 min (adapts to performance)
    |     |
    |     +-- accuracy < 60%? --> [Micro-Encounter + Simplified Practice]
    |     |
    |     v
    |    [TRANSITION: Cool --> Warm (deeper)]
    |     |
    |     v
    |    [RETURN: Reconnection + Transfer + Creative Synthesis + Reflection + Forward Glimpse]
    |     |  3-4 min
    |     v
    |    END
    |
    +--> 25-35 min: Extended Loop
          |
          v
         [Loop 1: New Topic (Standard Loop)]
          |
          v
         [Break Prompt (30s)]
          |
          v
         [Loop 2: Review Topic (Standard Loop with heavier interleaving)]
          |
          v
         END
```

## Appendix B: Template Selection Guide

| Content Characteristic | Recommended Template | Rationale |
|-----------------------|---------------------|-----------|
| An abstract concept that must be understood | Template 1: Conceptual | The challenge is building a mental model, not executing a procedure. Encounter uses metaphor heavily. |
| A step-by-step process that must be performed | Template 2: Procedural | The challenge is fluent execution. Analysis uses worked example fading. |
| A historical event or story with causal structure | Template 3: Narrative/Historical | The challenge is understanding causation and significance. Encounter uses character-driven narrative. |
| A creative skill requiring original production | Template 4: Creative/Generative | The challenge is production, not consumption. Return stage is extended. |
| A complex system with interacting components | Template 5: Systems/Relational | The challenge is understanding emergent behavior. Encounter uses interactive system diagrams. |
| A mixed topic (e.g., "How vaccines work") | Combine Templates 1 + 5 | Use the Conceptual template for the core concept, the Systems template for the mechanism. |
| A topic at the intersection of history and concept (e.g., "How Darwin developed the theory of evolution") | Combine Templates 3 + 1 | Lead with the Narrative template for the discovery story, shift to Conceptual for the theory itself. |

## Appendix C: Research Cross-Reference

Every major design decision in this document is grounded in research from the two foundation documents. This table maps design elements to their research justification.

| Design Element | Research Basis | Source Document |
|---------------|---------------|-----------------|
| Three-stage RH-->LH-->RH loop | McGilchrist's cognitive circuit | 01-neuroscience, Section 2.5 |
| Opening with narrative hook, not definition | Concreteness fading, curiosity gap theory, premature abstraction anti-pattern | 02-pedagogy, Sections 2.5, 4.4, 6.3 |
| Free recall before multiple choice | Testing effect strongest for free recall (Rowland, 2014) | 02-pedagogy, Section 2.2 |
| FSRS for spaced repetition | Outperforms SM-2 by 10-30% (Ye et al., 2024) | 02-pedagogy, Section 2.1 |
| Interleaving across topics | Interleaving effect d=0.42 (Brunmair & Richter, 2019) | 02-pedagogy, Section 2.6 |
| Worked example fading | Renkl et al. (2002), expertise reversal (Kalyuga et al., 2003) | 02-pedagogy, Section 2.10 |
| No points/badges/leaderboards as primary motivation | Overjustification effect (Deci et al., 1999), gamification critique (Hanus & Fox, 2015) | 02-pedagogy, Sections 4.3, 6.5 |
| Warm-to-cool UI transition between stages | Stage-appropriate interaction design; RH = expansive/warm, LH = structured/cool | 01-neuroscience, Section 8.2-8.3 |
| Transfer challenges in Return stage | Transfer requires broad RH representations (Barnett & Ceci, 2002) | 01-neuroscience, Section 4.4; 02-pedagogy, Principle 15 |
| Confidence calibration feedback | Metacognitive mismatch (Kornell & Bjork, 2007) | 02-pedagogy, Section 2.7 |
| Adaptive difficulty targeting ZPD | Vygotsky (1978), Bloom's 2-sigma problem (1984) | 02-pedagogy, Section 7.1 |
| Emotional anchoring to self-reference | Self-reference effect (Rogers et al., 1977), emotional encoding (Cahill & McGaugh, 1998) | 01-neuroscience, Sections 3.1, 3.4 |
| Creative synthesis tasks | Generation effect d=0.46 (Fiorella & Mayer, 2016) | 02-pedagogy, Section 2.9 |
| Spatial overview maps | RH global precedence (Navon, 1977), spatial cognition as foundation for abstract thought | 01-neuroscience, Sections 3.8, 6.1 |
| Analysis stage never the endpoint | McGilchrist's central thesis: stopping at LH analysis is the fundamental educational error | 01-neuroscience, Section 4.6 |

---

*This document translates the neuroscience and pedagogy research from Documents 01 and 02 into implementable learning experience designs. Every design element is traceable to research evidence. The specifications are detailed enough for a developer to implement the core learning loop, lesson templates, assessment system, and adaptive engine. As the product evolves, this document should be updated to reflect learnings from user testing and performance data.*
