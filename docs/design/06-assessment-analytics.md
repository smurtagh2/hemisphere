# Assessment & Analytics: Measurement Systems for Hemisphere Learning

**Version:** 1.0
**Date:** 2026-02-10
**Purpose:** Define the measurement systems that verify learning outcomes, track learner state, drive adaptive personalization, and validate the hemisphere-informed approach through experimentation
**Dependencies:** [01-neuroscience-foundation.md](../research/01-neuroscience-foundation.md), [02-pedagogy-and-learning-science.md](../research/02-pedagogy-and-learning-science.md), [03-instructional-design.md](03-instructional-design.md)

---

## Table of Contents

1. [Assessment Type Catalog](#1-assessment-type-catalog)
2. [Learner Model Specification](#2-learner-model-specification)
3. [Spaced Repetition Algorithm Design](#3-spaced-repetition-algorithm-design)
4. [Analytics Dashboard Specifications](#4-analytics-dashboard-specifications)
5. [A/B Testing Plan](#5-ab-testing-plan)
6. [Adaptive Engine Specification](#6-adaptive-engine-specification)

---

## 1. Assessment Type Catalog

### 1.1 Design Philosophy

Assessment in Hemisphere is never separate from learning. Every assessment event is a learning event (the testing effect -- Roediger & Karpicke, 2006). There are no "test days" divorced from instruction. Assessment is continuous, embedded in the three-stage loop, and feeds the adaptive engine in real time.

The hemisphere model demands two fundamentally different assessment approaches. LH-structured assessments measure whether the learner can recall, categorize, and apply explicit knowledge -- the products of the Analysis stage. RH-open assessments measure whether the learner can transfer, connect, create, and reintegrate -- the products of the Return stage. Neither alone is sufficient. A learner who scores perfectly on LH assessments but fails RH assessments has memorized without understanding. A learner who performs well on RH assessments but poorly on LH assessments has intuition without precision. The goal is convergence: both modes confirming genuine, flexible understanding.

Assessment types are organized into three categories corresponding to the hemisphere modes they primarily engage. For each type, we specify format, scoring method, knowledge components measured, hemisphere engagement, difficulty scaling across four levels, and example items.

---

### 1.2 LH-Structured Assessments (Auto-Scorable)

These assessments engage the left hemisphere's narrow, focused, analytical attention. They measure recall accuracy, categorization skill, procedural fluency, and factual precision. All are auto-scorable without LLM assistance.

---

#### 1.2.1 Free Recall Prompts

**Format and UI Behavior:**
A prompt appears asking the learner to recall information from memory without cues. A free-text input field is presented below the prompt. No options, no hints, no word bank. The learner types their response and submits. After submission, the target answer appears alongside the learner's response for self-comparison. The learner then self-rates: "Got it" / "Partially" / "Missed it."

**Scoring Method:** Auto-scored via keyword matching. The system maintains a target keyword set for each item (e.g., for "List the four requirements for natural selection": {variation, inheritance, selection pressure, differential reproduction}). Partial credit is awarded proportionally (3 of 4 keywords = 0.75). Synonyms and common paraphrases are included in the keyword set. The self-rating is recorded separately and used for FSRS scheduling and metacognitive calibration.

**Knowledge Components Measured:** Breadth and completeness of encoding for a specific knowledge component. Free recall reveals what the learner has most strongly encoded (first-recalled items) and what has been lost or weakly encoded (omissions).

**Hemisphere Mode:** Primarily LH (explicit, decontextualized retrieval), but free recall engages broader associative networks than recognition tasks, making it a partial bridge toward RH processing.

**Difficulty Scaling:**

| Level | Description | Example |
|-------|-------------|---------|
| 1 | Recall a single fact or term | "What molecule do plants use to capture light energy?" Target: chlorophyll |
| 2 | Recall a short list (2-4 items) | "Name the four requirements for natural selection." Target: variation, inheritance, selection pressure, differential reproduction |
| 3 | Recall with precise terminology required | "Describe the two stages of photosynthesis using their scientific names." Target: light-dependent reactions, Calvin cycle (light-independent reactions) |
| 4 | Recall and organize across categories | "List the causes of the French Revolution, organized by category (economic, social, political, intellectual)." Target: multi-category structured recall |

**Example Items:**
- Level 1: "What is the term for the organelle where photosynthesis occurs?" (Target: chloroplast)
- Level 2: "Name three types of cells in the adaptive immune system." (Target: T-helper cells, T-killer cells, B-cells)
- Level 3: "State the chemical equation for photosynthesis, including all reactants and products." (Target: 6CO2 + 6H2O -> C6H12O6 + 6O2)
- Level 4: "List all the components of the immune system you have studied, organized by layer (physical barriers, innate immunity, adaptive immunity)."

---

#### 1.2.2 Multiple Choice (with Distractor Design Principles)

**Format and UI Behavior:**
A prompt appears with 4 answer options (A-D). The learner taps to select one. After selection, the correct answer is highlighted in green and the learner's selection (if incorrect) is highlighted in amber. A brief explanation appears below, addressing why the correct answer is correct and why the most common incorrect choice is wrong.

On mobile: options are displayed as full-width tappable cards stacked vertically. On larger screens: 2x2 grid. Selection is confirmed with a single tap (no separate "Submit" button for speed).

**Scoring Method:** Auto-scored, binary (correct/incorrect). Additionally, the system logs which distractor was selected on incorrect responses. Distractor analysis reveals specific misconceptions.

**Distractor Design Principles:**
Distractors are not random wrong answers. Each distractor is designed to diagnose a specific misconception or error pattern:
- **Distractor Type A (Related concept confusion):** A term or fact from a closely related but different concept. Diagnoses: the learner confuses similar concepts. Example: For "What is the role of chlorophyll?", a distractor of "Breaks down glucose for energy" diagnoses confusion between photosynthesis and cellular respiration.
- **Distractor Type B (Partial knowledge):** An answer that would be correct for a related but different question. Diagnoses: the learner has encoded the information but linked it to the wrong prompt.
- **Distractor Type C (Common misconception):** An answer that reflects a known, documented misconception about the topic. Diagnoses: the learner holds a specific false belief that needs targeted correction.
- **Distractor Type D (Surface-level plausible):** An answer that sounds right but is factually wrong. Diagnoses: the learner is guessing based on surface features rather than genuine knowledge.

**Knowledge Components Measured:** Recognition accuracy for a specific knowledge component. Distractor selection patterns reveal which misconceptions the learner holds.

**Hemisphere Mode:** Pure LH -- categorical discrimination between discrete options.

**Difficulty Scaling:**

| Level | Description | Example |
|-------|-------------|---------|
| 1 | One clearly correct answer, three obviously wrong | "Which of these is a plant cell organelle? (a) Chloroplast, (b) Steering wheel, (c) Keyboard, (d) Sandcastle" |
| 2 | One correct answer, three plausible distractors from the same domain | "Which molecule carries energy from light reactions to the Calvin cycle? (a) ATP, (b) DNA, (c) Glucose, (d) Oxygen" |
| 3 | Requires discrimination between highly similar options | "Which is true of the Calvin cycle? (a) It requires light directly, (b) It uses CO2 to build glucose, (c) It occurs in the thylakoid membrane, (d) It produces oxygen" |
| 4 | Requires integration of multiple facts or negation | "Which of the following is NOT required for natural selection? (a) Variation, (b) Intentional design, (c) Inheritance, (d) Selection pressure" |

---

#### 1.2.3 Categorization / Sorting Exercises

**Format and UI Behavior:**
A set of 6-12 items appears in a central pool. Two to four labeled category buckets are displayed at the top or sides of the screen. The learner drags each item from the pool to the correct bucket. On mobile: items are tappable cards; tapping an item highlights it, then tapping a bucket places it. Items can be moved between buckets by dragging or tap-tap.

Immediate per-item feedback: correctly placed items stick in the bucket with a subtle green pulse. Incorrectly placed items bounce back to the pool with a brief tooltip: "This belongs in [correct category] because [one-sentence reason]."

After all items are placed, a summary screen shows the completed categorization with all items in their correct positions.

**Scoring Method:** Auto-scored. Each item placement is scored independently (correct/incorrect). Overall score = proportion of correct placements. The system logs confusion patterns: which items are most frequently miscategorized, and into which wrong category they are placed. This reveals specific discrimination failures.

**Knowledge Components Measured:** Categorical discrimination -- the ability to distinguish between related but distinct categories. This directly engages the LH's categorical processing (Kosslyn et al., 1989).

**Hemisphere Mode:** Pure LH -- categorization is the LH's core operation.

**Difficulty Scaling:**

| Level | Description | Example |
|-------|-------------|---------|
| 1 | Two categories, clearly distinct items | Sort: "Plant cell" vs. "Animal cell" components. Items: chloroplast, cell wall, centriole, large vacuole |
| 2 | Two categories, some items require careful discrimination | Sort: "Light-dependent reactions" vs. "Calvin cycle" processes. Items: water splitting, carbon fixation, ATP production, G3P synthesis |
| 3 | Three or four categories, items are closely related | Sort causes of the French Revolution into: Economic, Social, Political, Intellectual |
| 4 | Categories must be inferred by the learner (no labels given), or items belong to overlapping categories requiring nuanced judgment | Given 12 immune system components, group them by function (the learner must identify the functional categories themselves) |

---

#### 1.2.4 Sequencing Exercises

**Format and UI Behavior:**
A set of 4-8 steps or events is presented in randomized order as a vertical list of draggable cards. The learner drags cards up and down to arrange them in the correct sequence. A "Check" button reveals results.

Feedback: Correctly positioned items lock in place (green border). Incorrectly positioned items are highlighted (amber border) with an arrow indicating the direction they need to move. The learner can then adjust and re-check.

**Scoring Method:** Auto-scored using Kendall tau distance (the number of pairwise inversions between the learner's sequence and the correct sequence), normalized to a 0.0-1.0 scale. A perfect sequence scores 1.0. Each individual position is also scored (binary: in correct position or not), enabling item-level tracking.

**Knowledge Components Measured:** Sequential/procedural knowledge -- the ability to order steps, events, or processes correctly. This engages the LH's sequential processing (Efron, 1990).

**Hemisphere Mode:** Pure LH -- temporal sequencing is an LH specialization.

**Difficulty Scaling:**

| Level | Description | Example |
|-------|-------------|---------|
| 1 | 4 items, clear sequential logic | Arrange: seed germinates -> plant grows leaves -> plant flowers -> fruit develops |
| 2 | 5-6 items, some steps have non-obvious ordering | Arrange the steps of the immune response: pathogen enters -> physical barrier fails -> innate cells respond -> antigen presented -> T-cells activated -> antibodies produced |
| 3 | 6-8 items, including sub-steps that could plausibly be reordered | Arrange the detailed steps of the Calvin cycle (carbon fixation, reduction, regeneration of RuBP, with intermediate steps) |
| 4 | 7-8 items from multiple interleaved processes that must be correctly sequenced relative to each other | Interleave the events of the French Revolution with the events of the American Revolution in chronological order |

---

#### 1.2.5 Definition Matching

**Format and UI Behavior:**
Two columns are displayed: terms on the left, definitions on the right. The number of items ranges from 4-8 pairs. The learner draws connections by tapping a term and then tapping its matching definition (a line connects them visually). Tapping either endpoint disconnects the pair. The learner can rearrange matches before submitting.

After submission: correct pairs turn green, incorrect pairs turn amber with the correct match indicated by a dotted line.

**Scoring Method:** Auto-scored. Each pair is scored independently (correct/incorrect). Overall score = proportion of correct matches. The system logs confusion pairs (which terms are matched to the wrong definitions), revealing specific vocabulary or conceptual gaps.

**Knowledge Components Measured:** Vocabulary precision and conceptual association -- whether the learner can correctly link technical terms to their meanings.

**Hemisphere Mode:** Pure LH -- explicit, denotative language mapping.

**Difficulty Scaling:**

| Level | Description | Example |
|-------|-------------|---------|
| 1 | Terms and definitions are clearly distinct | Match: chloroplast/organelle where photosynthesis occurs, mitochondria/organelle where cellular respiration occurs, nucleus/contains DNA, cell membrane/controls what enters and exits |
| 2 | Some definitions are similar, requiring careful reading | Match immune system terms to precise definitions (e.g., distinguishing T-helper from T-killer cells) |
| 3 | Definitions are paraphrased (not verbatim from the lesson), requiring comprehension | Match: "natural selection" to "the process by which organisms with traits better suited to their environment tend to survive and reproduce more" (not the textbook wording) |
| 4 | Definitions include novel examples or applications, not just abstract descriptions | Match: "natural selection" to "explains why hospital bacteria become harder to kill over time" |

---

#### 1.2.6 Pattern Completion

**Format and UI Behavior:**
A pattern is presented with a missing element. The pattern can be numerical (a sequence), visual (a spatial arrangement), verbal (a grammatical or logical pattern), or conceptual (a relationship pattern). The learner must identify and supply the missing element.

For numerical/verbal patterns: a text input field. For visual patterns: multiple choice from 4 visual options. For conceptual patterns: a text input field or structured selection.

**Scoring Method:** Auto-scored. For numerical and verbal patterns: exact match or match within an acceptable range. For visual patterns: selection match. For conceptual patterns: keyword matching against target set.

**Knowledge Components Measured:** Rule extraction and application -- the ability to identify an underlying pattern and extend it. This engages the LH's rule-extraction circuitry (Ghosh & Gilboa, 2014).

**Hemisphere Mode:** Primarily LH (rule identification and application), with RH involvement when the pattern requires seeing the whole before the parts.

**Difficulty Scaling:**

| Level | Description | Example |
|-------|-------------|---------|
| 1 | Simple, single-rule pattern | Complete the sequence: 2, 4, 6, 8, ___ (Answer: 10) |
| 2 | Pattern requires domain knowledge | Complete: photosynthesis is to chloroplast as cellular respiration is to ___ (Answer: mitochondria) |
| 3 | Multi-step or compound pattern | If doubling the CO2 concentration increases photosynthesis rate by 30%, and doubling light intensity increases it by 50%, what happens when both are doubled? (Requires understanding of limiting factors) |
| 4 | Pattern breaks or exceptions must be identified | "Which of these organisms does NOT follow the pattern of natural selection in the expected way?" (Requires understanding edge cases like horizontal gene transfer in bacteria) |

---

#### 1.2.7 Fill-in-the-Blank

**Format and UI Behavior:**
A sentence or short paragraph is presented with one to three blanks. Each blank is represented by an underlined input field inline with the text. The learner types their answers directly into the blanks. After submission, correct answers appear in green within the text; incorrect answers appear in amber with the correct answer shown below.

For single-word blanks: the input field is sized to accommodate the expected answer length (providing a subtle cue). For phrase blanks: the field expands as the learner types.

**Scoring Method:** Auto-scored via exact match with an accepted answer set (including common synonyms, abbreviations, and minor spelling variations). Case-insensitive matching. For multi-blank items, each blank is scored independently.

**Knowledge Components Measured:** Precise factual recall within context. Unlike free recall (which is decontextualized), fill-in-the-blank provides contextual cues while still requiring generation rather than recognition. This places it between free recall and multiple choice in retrieval difficulty.

**Hemisphere Mode:** Primarily LH (precise terminology), with mild RH involvement from the contextual sentence frame.

**Difficulty Scaling:**

| Level | Description | Example |
|-------|-------------|---------|
| 1 | Single blank, strong contextual cue | "Photosynthesis occurs in the ___." (Answer: chloroplast) |
| 2 | Single blank, weaker contextual cue | "The ___ is the stage of photosynthesis that does not directly require light." (Answer: Calvin cycle) |
| 3 | Multiple blanks requiring related but distinct terms | "In the light-dependent reactions, ___ is split to release ___ and ___." (Answer: water, oxygen, hydrogen ions/electrons) |
| 4 | Blank requires synthesis or application, not just recall | "If a plant were moved to an environment with no CO2, the ___ stage of photosynthesis would stop first because ___." (Answer: Calvin cycle / light-independent reactions; it requires CO2 as a carbon source for carbon fixation) |

---

### 1.3 RH-Open Assessments (LLM or Rubric Scoring)

These assessments engage the right hemisphere's broad, integrative, creative attention. They measure transfer ability, creative application, connection-making, and depth of understanding. They require either LLM-assisted scoring, rubric-based evaluation, or calibrated self-assessment.

---

#### 1.3.1 Analogy / Metaphor Creation

**Format and UI Behavior:**
A prompt asks the learner to create an original analogy or metaphor for a concept. The prompt explicitly prohibits reuse of metaphors presented during the Encounter stage, forcing genuine generation. A free-text input field (3-5 lines) is provided. After submission, 2-3 published or peer metaphors are shown for comparison (not as "correct answers" but as examples of the range of possibilities). The learner is asked: "How does your metaphor compare? What does it capture that theirs don't? What does it miss?"

**Scoring Method:** LLM-assisted rubric scoring.

| Score | Criteria |
|-------|----------|
| 4 (Excellent) | The metaphor is original, captures the essential structural relationships of the concept (not just surface features), and illuminates something the formal definition does not. The mapping between source and target domains is coherent across multiple points of correspondence. |
| 3 (Proficient) | The metaphor is appropriate, captures key features of the concept, and demonstrates understanding. The mapping is clear but may not extend beyond one or two points of correspondence. |
| 2 (Developing) | The metaphor is partially appropriate but misses key structural features, or the mapping is superficial (based on surface similarity rather than deep structure). |
| 1 (Beginning) | The metaphor is inaccurate, misleading, or so superficial that it does not demonstrate understanding. |
| 0 (No attempt) | Blank, irrelevant, or the response is not a metaphor. |

The LLM receives: the concept definition, the rubric, the learner's response, and instructions to score and provide a brief (1-2 sentence) justification. LLM scores are periodically validated against human ratings (see Section 5 for validation methodology).

**Knowledge Components Measured:** Depth of conceptual understanding. Metaphor creation requires the learner to identify the deep structure of a concept and map it onto a different domain -- this cannot be done through memorization alone. It engages the RH's capacity for seeing connections between distant ideas (Mashal et al., 2007).

**Hemisphere Mode:** Primarily RH -- novel metaphor creation is one of the most RH-dependent cognitive operations (Bowdle & Gentner, 2005).

**Difficulty Scaling:**

| Level | Description | Example |
|-------|-------------|---------|
| 1 | Complete a given metaphor frame | "Photosynthesis is like a ___ because ___." |
| 2 | Create a free metaphor for a concrete concept | "Create a metaphor for natural selection. Do not use any metaphors from the lesson." |
| 3 | Create a metaphor for an abstract concept | "Create a metaphor for the relationship between the innate and adaptive immune systems." |
| 4 | Create an extended metaphor that maps multiple structural correspondences | "Create a metaphor for the entire process of photosynthesis that accounts for inputs, outputs, energy transformation, and the role of the chloroplast. Extend it across at least three sentences." |

---

#### 1.3.2 Transfer Tasks

**Format and UI Behavior:**
A novel scenario is presented (2-4 sentences describing a situation the learner has not encountered before). An open-ended question asks the learner to apply a previously learned concept to explain, predict, or solve something in this new context. A free-text response field (5-10 lines) is provided. After submission, a model response is shown, and the learner is asked to compare.

**Scoring Method:** LLM-assisted rubric scoring.

| Score | Criteria |
|-------|----------|
| 4 (Excellent) | Correctly identifies the relevant concept, applies it accurately to the new context, notes important differences between the original and new contexts, and generates a novel insight or prediction not explicitly prompted. |
| 3 (Proficient) | Correctly identifies the relevant concept and applies it to the new context. Application is accurate but may miss nuances or context-specific differences. |
| 2 (Developing) | Identifies the relevant concept but applies it inaccurately or superficially. The response shows recognition but not flexible application. |
| 1 (Beginning) | Does not identify the relevant concept, applies an incorrect concept, or provides a response that does not engage with the scenario. |
| 0 (No attempt) | Blank or irrelevant. |

**Knowledge Components Measured:** Transfer -- the ability to apply knowledge flexibly in novel contexts. This is the gold standard of learning (Barnett & Ceci, 2002) and the primary product of the Return stage. Transfer requires the broad, context-sensitive representations that only RH-reintegrated understanding provides.

**Hemisphere Mode:** Primarily RH (contextual application, seeing structural similarities across different domains), with LH support (identifying and applying the correct concept).

**Difficulty Scaling:**

| Level | Description | Example |
|-------|-------------|---------|
| 1 | Near transfer: same concept, slightly different context | "If a plant were placed in a sealed jar with unlimited CO2 and water but no light, what would happen to its rate of photosynthesis?" |
| 2 | Moderate transfer: same principle, different domain | "A solar panel converts sunlight into electricity. How is this similar to and different from photosynthesis?" |
| 3 | Far transfer: abstract principle applied to an unfamiliar domain | "A company notices that its most popular product is losing market share to cheaper alternatives. Using the concept of selection pressure, analyze what is happening." |
| 4 | Creative transfer: generate a novel application | "Design a system for removing CO2 from the atmosphere, inspired by how plants do it. What would your system need? What challenges would it face?" |

---

#### 1.3.3 Creative Synthesis

**Format and UI Behavior:**
The learner is asked to create something that demonstrates understanding: an original example, a diagram, a short explanation, a redesign, or a scenario. The prompt is deliberately open-ended, with minimal constraints. A multi-line free-text field or drawing canvas is provided depending on the task. After submission, 2-3 peer responses may be shown (if social features are enabled) for comparison, and the learner self-assesses against a provided rubric.

**Scoring Method:** Hybrid -- LLM-assisted scoring for text responses, self-assessment against rubric for drawings and complex creative outputs.

| Score | Criteria |
|-------|----------|
| 4 (Excellent) | The creation is original, demonstrates accurate understanding of the concept, and reveals insight beyond what was explicitly taught. The learner has synthesized knowledge into something genuinely new. |
| 3 (Proficient) | The creation demonstrates accurate understanding and applies the concept correctly. It is competent but may not show original insight. |
| 2 (Developing) | The creation shows partial understanding but contains inaccuracies or significant gaps. |
| 1 (Beginning) | The creation does not demonstrate understanding of the concept. |
| 0 (No attempt) | Blank or irrelevant. |

**Knowledge Components Measured:** Generative understanding -- the ability to produce novel instances that conform to a learned concept's deep structure. This is the generation effect (Slamecka & Graf, 1978; Fiorella & Mayer, 2016) at its most powerful.

**Hemisphere Mode:** Primarily RH -- creative production requires the RH's capacity for novelty, integration, and seeing the whole.

**Difficulty Scaling:**

| Level | Description | Example |
|-------|-------------|---------|
| 1 | Modify a given example | "The lesson used a factory metaphor for the cell. Change one part of the metaphor to make it more accurate." |
| 2 | Create a new example | "Invent your own example of natural selection. It can be real or fictional, but it must include all four requirements." |
| 3 | Create something that integrates multiple concepts | "Design an ecosystem with at least three organisms. Explain how natural selection, energy flow, and population dynamics interact in your ecosystem." |
| 4 | Create something that challenges or extends the concept | "Natural selection explains adaptation, but it has limitations. Design a scenario where natural selection would NOT lead to optimal adaptation. Explain why." |

---

#### 1.3.4 Teaching Prompts

**Format and UI Behavior:**
The learner is asked to explain a concept as if teaching someone else -- a 10-year-old, a friend with no background, or a curious alien. The constraint on audience forces the learner to translate from technical language (LH) back into accessible, concrete, contextual language (RH). A free-text field (5-10 lines) is provided.

After submission, the system can optionally present a simulated follow-up question from the "student" (LLM-generated), testing whether the learner can handle challenges to their explanation.

**Scoring Method:** LLM-assisted evaluation assessing: (a) accuracy of the core concept, (b) absence of unexplained jargon, (c) use of concrete examples or analogies, (d) logical flow and completeness, (e) appropriateness for the specified audience.

| Score | Criteria |
|-------|----------|
| 4 (Excellent) | Explanation is accurate, jargon-free, uses vivid concrete examples or analogies, flows logically, and would be genuinely comprehensible to the target audience. Anticipates likely confusion points. |
| 3 (Proficient) | Explanation is accurate and mostly jargon-free, includes at least one concrete example, and is generally clear. |
| 2 (Developing) | Explanation is partially accurate but relies on jargon, lacks concrete examples, or has logical gaps. |
| 1 (Beginning) | Explanation is inaccurate, confusing, or inappropriate for the target audience. |
| 0 (No attempt) | Blank or irrelevant. |

**Knowledge Components Measured:** The "protege effect" -- explaining to others deepens the explainer's own understanding. Teaching prompts measure whether the learner has truly integrated LH analytical knowledge back into RH-accessible, contextual understanding.

**Hemisphere Mode:** Integrated -- the task requires translating from LH explicit knowledge into RH contextual, relational, embodied communication. This is the RH-->LH-->RH circuit made visible.

**Difficulty Scaling:**

| Level | Description | Example |
|-------|-------------|---------|
| 1 | Explain a single concept to a peer | "Explain what photosynthesis is to a classmate who missed the lesson." |
| 2 | Explain to a younger audience, requiring simplification | "Explain natural selection to a 10-year-old. No scientific words." |
| 3 | Explain a complex relationship or process | "Explain how vaccines work to someone who is skeptical about them. Be accurate and empathetic." |
| 4 | Explain while handling challenges | "Explain evolution to someone who asks: 'If humans evolved from monkeys, why are there still monkeys?' Address the misconception directly." |

---

#### 1.3.5 Connection Mapping

**Format and UI Behavior:**
The learner is presented with two concepts (from the same or different topics) and asked to describe how they relate. Alternatively, the learner can use the spatial knowledge map to select two nodes and create a new connection.

Two variants:
- **Prompted:** "How does natural selection relate to antibiotic resistance?" Free-text response field.
- **Open:** The learner selects any two nodes on their knowledge map and writes a connection sentence. This measures self-directed connection-making.

After submission, the system evaluates the connection and, if valid, adds it to the learner's visible knowledge map as a new edge.

**Scoring Method:** LLM-assisted evaluation assessing whether the connection is (a) real (factually accurate), (b) meaningful (not superficial), and (c) insightful (reveals something non-obvious).

| Score | Criteria |
|-------|----------|
| 4 (Excellent) | Connection is accurate, reveals a deep structural or causal relationship, and generates insight that goes beyond what was explicitly taught. |
| 3 (Proficient) | Connection is accurate and meaningful, identifying a genuine relationship. |
| 2 (Developing) | Connection is accurate but superficial (e.g., "both are biology topics"). |
| 1 (Beginning) | Connection is inaccurate or fabricated. |
| 0 (No attempt) | Blank or irrelevant. |

**Knowledge Components Measured:** Knowledge network density and integration. Experts organize knowledge in richly interconnected networks; novices organize in isolated clusters (Chi, Feltovich, & Glaser, 1981). Connection count and quality are proxies for expert-like knowledge organization.

**Hemisphere Mode:** Primarily RH -- seeing connections between distant concepts is a hallmark of RH broad, associative attention.

**Difficulty Scaling:**

| Level | Description | Example |
|-------|-------------|---------|
| 1 | Connect two closely related concepts | "How does variation relate to natural selection?" |
| 2 | Connect two concepts from the same domain | "How does the immune system relate to natural selection?" |
| 3 | Connect two concepts from different domains | "How does supply and demand relate to natural selection?" |
| 4 | Create a novel connection not previously suggested | Open prompt: "Find a connection between any two topics in your knowledge map that you haven't seen before. Explain it." |

---

#### 1.3.6 Visual / Spatial Tasks

**Format and UI Behavior:**
The learner is asked to create or annotate a visual representation: a diagram, concept map, flowchart, or sketch. On mobile: a drawing canvas with basic tools (pen, shapes, text labels, colors, undo). On desktop: the same canvas plus optional structured diagramming tools.

After submission, the drawing is stored in the learner's portfolio. For structured diagrams (flowcharts, concept maps), basic auto-scoring can check for required elements. For freeform drawings, self-assessment against a rubric is the primary evaluation method, with optional LLM interpretation of labeled diagrams.

**Scoring Method:** Hybrid. For structured diagrams: auto-scoring of required elements (nodes, edges, labels) plus LLM evaluation of accuracy and completeness. For freeform drawings: self-assessment against provided rubric. The system checks for required labels and structural elements.

**Knowledge Components Measured:** Spatial and relational understanding. Visual/spatial tasks engage dual coding (Paivio, 1986) and reveal whether the learner understands the structural relationships between components, not just their names.

**Hemisphere Mode:** Primarily RH -- spatial cognition, holistic visualization, and relational thinking are RH specializations.

**Difficulty Scaling:**

| Level | Description | Example |
|-------|-------------|---------|
| 1 | Label a provided diagram | Given a diagram of a plant cell, label the chloroplast, nucleus, cell wall, and vacuole. |
| 2 | Complete a partially drawn diagram | A flowchart of the immune response is missing two boxes. Fill in the missing steps. |
| 3 | Create a diagram from scratch for a studied concept | "Draw a diagram showing how photosynthesis and cellular respiration are connected. Show inputs, outputs, and energy flow." |
| 4 | Create a diagram for a novel scenario | "Design a diagram showing how antibiotic resistance develops and spreads through a hospital. Include all relevant biological and human-behavior factors." |

---

### 1.4 Integrated Assessments

These assessments require both hemispheric modes working in concert. They appear primarily in the Return stage and in periodic Integration Challenges that span multiple topics.

---

#### 1.4.1 Case Study Analysis

**Format and UI Behavior:**
A novel case study is presented (2-4 paragraphs describing a real or realistic scenario). The learner responds to a multi-part prompt that escalates from LH to RH demands:
- Part A (LH): Identify which concepts from your studies are relevant to this case.
- Part B (LH+RH): Apply those concepts to explain what is happening in the case.
- Part C (RH): Propose a creative solution, prediction, or extension.

Each part has its own response field. The learner can see all three parts before starting, enabling them to plan their approach.

**Scoring Method:** LLM-assisted, scored per part. Part A is auto-scorable (keyword matching against expected concepts). Parts B and C use rubric-based LLM scoring.

| Part | Score 4 | Score 3 | Score 2 | Score 1 |
|------|---------|---------|---------|---------|
| A (Identify) | All relevant concepts identified, no irrelevant ones included | Most relevant concepts identified | Some relevant concepts identified, some irrelevant ones included | Fails to identify key concepts |
| B (Apply) | Accurate, nuanced application showing how concepts interact in this specific context | Accurate application of main concepts | Partially accurate application, missing nuances | Inaccurate or superficial application |
| C (Create) | Creative, feasible proposal that integrates multiple concepts and considers trade-offs | Reasonable proposal that applies key concepts | Proposal shows partial understanding | Proposal does not connect to the concepts or is not feasible |

**Knowledge Components Measured:** Integrated understanding across multiple knowledge components. Case studies test whether the learner can recognize relevant concepts in an unstructured situation (LH discrimination), apply them accurately (LH+RH application), and generate novel responses (RH creation).

**Hemisphere Mode:** Integrated -- the three-part structure mirrors the RH-->LH-->RH loop within a single assessment.

**Difficulty Scaling:**

| Level | Description | Example |
|-------|-------------|---------|
| 1 | Single-concept case, explicit cues | "A farmer notices that ladybugs with more spots seem to survive longer. Using natural selection, explain why." |
| 2 | Multi-concept case, moderate cues | "A hospital's infection rate is rising despite increased cleaning. The bacteria seem resistant to the standard disinfectant. Explain what is happening (concepts: natural selection, immune system)." |
| 3 | Multi-concept case, minimal cues | "A coral reef is dying. Water temperature has risen 2 degrees C. Fish populations are declining. Tourism revenue is dropping. Analyze this situation using all relevant concepts you have studied." |
| 4 | Multi-concept case requiring cross-domain synthesis and creative problem-solving | "A city wants to reduce its carbon footprint by 50% in 10 years. Design a plan that incorporates principles from biology (photosynthesis, ecosystems), economics (supply and demand), and social science (behavior change). What trade-offs must the city accept?" |

---

#### 1.4.2 Predict-Then-Explain

**Format and UI Behavior:**
The assessment unfolds in two locked phases:
1. **Predict:** A scenario is described, and the learner is asked to predict the outcome before seeing it. They type their prediction and their reasoning. This response is locked (cannot be edited after submission).
2. **Explain:** The actual outcome is revealed. The learner must now explain why the outcome occurred, noting whether their prediction was correct and, if not, what they missed.

This two-phase structure leverages the pretesting effect (Richland et al., 2005) and metacognitive monitoring.

**Scoring Method:** Composite. The prediction is scored for accuracy (auto-scorable against the known outcome). The explanation is LLM-scored for depth and accuracy. A metacognitive bonus is awarded when the learner accurately identifies the gap between their prediction and the outcome and explains what they missed.

| Component | Scoring |
|-----------|---------|
| Prediction accuracy | Auto: correct (1.0), partially correct (0.5), incorrect (0.0) |
| Explanation quality | LLM rubric: 0-4 scale (same as Transfer Task rubric) |
| Metacognitive accuracy | Auto: +0.5 bonus if prediction was incorrect AND the learner accurately identifies and explains the error in their reasoning |

**Knowledge Components Measured:** Predictive understanding (can the learner use their knowledge to anticipate outcomes?) and metacognitive accuracy (can they recognize and correct their own errors?).

**Hemisphere Mode:** Integrated -- prediction engages both LH (applying known rules) and RH (imagining outcomes in context). Error analysis engages RH self-awareness and LH analytical diagnosis.

**Difficulty Scaling:**

| Level | Description | Example |
|-------|-------------|---------|
| 1 | Prediction follows directly from a single learned rule | "A plant is placed in complete darkness. Predict: will it continue to produce oxygen?" |
| 2 | Prediction requires combining two concepts | "An antibiotic is used on a bacterial population for six months. Predict what will happen to the effectiveness of the antibiotic over time and why." |
| 3 | Prediction involves a counterintuitive outcome | "A new island forms. The first plants to colonize it grow rapidly and produce many seeds. Predict: will these species still dominate the island 100 years from now?" |
| 4 | Prediction requires reasoning about a system with multiple interacting factors | "A government introduces a price ceiling on bread (maximum price below the market equilibrium). Predict the effects on supply, demand, quality, and the black market." |

---

#### 1.4.3 Error Identification and Correction

**Format and UI Behavior:**
A worked solution, explanation, or diagram is presented that contains 1-3 deliberate errors. The errors range from factual mistakes to logical fallacies to missing steps. The learner must:
1. **Identify** the error(s) by tapping or highlighting the location.
2. **Explain** why it is wrong (free-text).
3. **Correct** it (free-text or structured input, depending on the error type).

This three-step process engages LH error detection, LH analytical diagnosis, and RH creative correction.

**Scoring Method:** Hybrid. Error identification is auto-scorable (did the learner highlight the correct location?). Explanation and correction are LLM-scored.

| Component | Scoring |
|-----------|---------|
| Error identification | Auto: correct location (1.0 per error found), wrong location (0.0), missed error (0.0) |
| Explanation | LLM rubric: 0-2 per error (2 = accurate diagnosis of why it is wrong; 1 = partially accurate; 0 = inaccurate) |
| Correction | LLM or auto: 0-2 per error (2 = correct fix; 1 = partially correct; 0 = incorrect or missing) |

**Knowledge Components Measured:** Deep analytical understanding. Finding errors in others' work requires stronger knowledge than producing correct work oneself, because the learner must distinguish correct from incorrect without the scaffolding of generating the answer themselves. This engages the LH's error-detection circuitry while the creative correction engages RH problem-solving.

**Hemisphere Mode:** Integrated -- error detection is LH, but creative correction and understanding "why" often requires RH contextual reasoning.

**Difficulty Scaling:**

| Level | Description | Example |
|-------|-------------|---------|
| 1 | One obvious factual error | "Photosynthesis occurs in the mitochondria." (Error: should be chloroplast) |
| 2 | One subtle error requiring domain knowledge | A worked solution for factoring x^2 + 5x - 14 = 0 shows the factors as (x+7)(x-2)=0. (Error: should be (x+7)(x-2)=0 gives x=-7, x=2, but the student wrote x=7, x=-2) |
| 3 | Multiple errors of different types (factual + logical) | An explanation of vaccine immunity that confuses innate and adaptive immunity AND incorrectly states that vaccines contain active pathogens |
| 4 | A plausible-sounding but fundamentally flawed argument | "Because bacteria can develop resistance to antibiotics, we should stop using antibiotics entirely to prevent resistance from spreading." (The reasoning contains a logical error -- identify it and propose a more nuanced position) |

---

### 1.5 Assessment Frequency and Distribution

Assessment events are distributed across the learning loop as follows:

| Stage | Assessment Types Used | Frequency | Purpose |
|-------|----------------------|-----------|---------|
| **Encounter** | Prediction prompts only (ungraded) | 1-2 per session | Activate prior knowledge, generate the pretesting effect. Not scored for accuracy -- scored only for engagement (did the learner attempt a response?). |
| **Analysis** | All LH-Structured types | 12-20 items per session | Build and verify recall, categorization, and procedural fluency. Every item feeds FSRS scheduling. |
| **Return** | All RH-Open and Integrated types | 2-4 items per session | Verify transfer, integration, and creative application. These are the highest-signal assessments for genuine understanding. |
| **Integration Challenge** (periodic) | Case Study Analysis, Predict-Then-Explain | 1 per 3-5 sessions | Span multiple topics, test cross-domain synthesis. Occur as a special Return-heavy session. |

---

## 2. Learner Model Specification

### 2.1 Architecture Overview

The learner model is a structured representation of everything the system knows about a learner. It drives every adaptive decision: what to teach next, how difficult to make it, how long to wait before review, and what kind of assessment to use. The model has four layers: Knowledge State, Behavioral State, Cognitive Profile, and Motivational State.

The model is updated after every interaction and persisted per learner. All update rules are deterministic or probabilistic with defined parameters -- there are no opaque neural network components in the learner model itself (though the adaptive engine may use ML for some decision-making; see Section 6).

---

### 2.2 Knowledge State

The Knowledge State tracks what the learner knows at the finest granularity available.

#### 2.2.1 Per-Knowledge-Component Mastery

```
KnowledgeComponentState {
  kc_id: string,                    // unique identifier for the knowledge component
  kc_name: string,                  // human-readable name, e.g., "photosynthesis_light_reactions"
  topic_id: string,                 // parent topic
  mastery_level: float,             // 0.0-1.0, overall mastery estimate
  difficulty_tier: 1 | 2 | 3 | 4,  // current difficulty level in the progression

  // LH mastery (structured assessment performance)
  lh_accuracy: float,               // rolling average accuracy on LH assessments (last 10 attempts)
  lh_attempts: integer,             // total LH assessment attempts
  lh_last_accuracy: float,          // accuracy on most recent LH assessment

  // RH mastery (open assessment performance)
  rh_score: float,                  // rolling average score on RH assessments (0-4 scale, normalized to 0-1)
  rh_attempts: integer,             // total RH assessment attempts
  rh_last_score: float,             // score on most recent RH assessment

  // Integrated mastery
  integrated_score: float,          // rolling average on integrated assessments

  // Timestamps
  first_encountered: ISO-8601,
  last_practiced: ISO-8601,
  last_assessed_lh: ISO-8601,
  last_assessed_rh: ISO-8601
}
```

**Mastery Level Calculation:**
```
mastery_level = weighted_average(
  0.40 * lh_accuracy,        // LH mastery contributes 40%
  0.40 * rh_score,           // RH mastery contributes 40%
  0.20 * integrated_score    // Integrated mastery contributes 20%
)
```

The equal weighting of LH and RH mastery is a deliberate design choice. A learner who scores 1.0 on LH assessments but 0.0 on RH assessments has a mastery of 0.40, not 0.80. This prevents the system from declaring mastery based on recall alone.

**Update Rule:** After each assessment event targeting this KC:
1. Update the relevant sub-score (lh_accuracy, rh_score, or integrated_score) using an exponentially weighted moving average (EWMA) with alpha = 0.3. This means recent performance counts more than distant performance, but history is not discarded.
2. Recalculate mastery_level using the formula above.
3. Apply the difficulty progression rules from Section 4.4 of the instructional design doc (advance if >= 80% on last 5 at current level; retreat if < 50%).

#### 2.2.2 FSRS Memory State

```
FSRSMemoryState {
  item_id: string,                  // the specific reviewable item
  kc_id: string,                    // knowledge component it targets
  stability: float,                 // S: days until retrievability drops to 90%
  difficulty: float,                // D: inherent difficulty (0.0-1.0)
  retrievability: float,            // R: current recall probability (0.0-1.0)
  stage_type: "encounter" | "analysis" | "return",  // hemisphere-aware scheduling
  last_review: ISO-8601,
  next_review: ISO-8601,            // scheduled review date
  review_count: integer,            // total times reviewed
  lapse_count: integer,             // total times failed after initial learning
  state: "new" | "learning" | "review" | "relearning"
}
```

**Update Rule:** After each review, FSRS updates stability and difficulty based on the learner's rating (Again/Hard/Good/Easy), the elapsed time since last review, and the current memory state. See Section 3 for the full FSRS specification with hemisphere-aware extensions.

#### 2.2.3 Topic-Level Proficiency

```
TopicProficiency {
  topic_id: string,
  topic_name: string,
  topic_path: string[],             // hierarchical position, e.g., ["biology", "ecology", "photosynthesis"]
  overall_proficiency: float,       // 0.0-1.0, average of all KC mastery levels in this topic
  kc_count: integer,                // number of KCs in this topic
  kc_mastered: integer,             // KCs with mastery >= 0.8
  kc_in_progress: integer,          // KCs with mastery 0.3-0.79
  kc_not_started: integer,          // KCs with mastery < 0.3 or never encountered
  stage_balance: {                  // average performance by stage
    encounter_engagement: float,    // 0-1 (did the learner engage with encounter activities?)
    analysis_accuracy: float,       // 0-1
    return_quality: float           // 0-1
  },
  last_session: ISO-8601,
  sessions_completed: integer
}
```

**Update Rule:** Recalculated after each session that includes items from this topic. `overall_proficiency` is the mean of all `mastery_level` values for KCs within this topic.

#### 2.2.4 Prerequisite Completion Map

```
PrerequisiteMap {
  learner_id: string,
  prerequisites: {
    [kc_id: string]: {
      required_by: string[],       // KCs that require this one
      mastery_level: float,        // current mastery of the prerequisite
      is_met: boolean,             // mastery >= 0.6 (threshold for prerequisite completion)
      blocking: string[]           // KCs currently blocked by this unmet prerequisite
    }
  }
}
```

**Update Rule:** After each mastery_level update, re-evaluate `is_met` for all prerequisites. If a previously unmet prerequisite is now met (mastery >= 0.6), unlock the dependent KCs. If a previously met prerequisite drops below 0.5 (due to forgetting), flag the dependent KCs for review but do not re-lock them (the learner has demonstrated the ability; they may need a refresher, not a re-learn).

---

### 2.3 Behavioral State

The Behavioral State tracks patterns of engagement that reveal how the learner interacts with the system.

```
BehavioralState {
  learner_id: string,

  // Session patterns
  total_sessions: integer,
  sessions_last_7_days: integer,
  sessions_last_30_days: integer,
  average_session_duration_s: float,
  session_duration_trend: float,     // slope of duration over last 10 sessions (+/- seconds per session)
  preferred_session_time: string,    // time of day bucket: "morning" | "afternoon" | "evening" | "night"
  session_completion_rate: float,    // proportion of sessions completed (vs. abandoned or paused)

  // Response patterns
  average_latency_ms: float,         // across all timed items
  latency_by_type: {                 // latency broken down by assessment type
    free_recall: float,
    multiple_choice: float,
    categorization: float,
    sequencing: float,
    transfer: float,
    creative: float
  },
  latency_trend: float,              // slope of latency over last 50 items (negative = getting faster)

  // Help-seeking
  help_request_rate: float,          // proportion of items where help was requested
  help_type_distribution: {          // breakdown of help types
    show_options: float,             // downgraded from free recall to MC
    show_hint: float,
    show_answer: float
  },
  help_request_trend: float,         // slope over last 10 sessions (negative = becoming more independent)

  // Stage engagement
  encounter_time_ratio: float,       // proportion of session time in Encounter
  analysis_time_ratio: float,        // proportion in Analysis
  return_time_ratio: float,          // proportion in Return
  encounter_engagement_score: float, // composite: did they read narratives, respond to prompts, explore maps?
  return_engagement_score: float,    // composite: response length, time spent on creative tasks, reflection depth

  // Confidence
  confidence_ratings: float[],       // last 50 confidence ratings (1-5)
  confidence_accuracy_correlation: float,  // Pearson correlation between confidence and accuracy
  calibration_gap: float             // mean(confidence) - mean(accuracy), scaled to same range; positive = overconfident
}
```

**Update Rules:**
- Session-level metrics are updated at session end.
- Response-level metrics (latency, help-seeking, confidence) are updated after each item.
- Trends are computed as linear regression slopes over their respective windows.
- `confidence_accuracy_correlation` is recomputed after every 10 new confidence-rated items using the most recent 50 pairs.

---

### 2.4 Cognitive Profile

The Cognitive Profile captures stable-ish characteristics of the learner's cognitive style. These change slowly over time.

```
CognitiveProfile {
  learner_id: string,

  // Hemisphere Balance Score (defined in 03-instructional-design.md, Section 4.5)
  hemisphere_balance_score: float,   // -1.0 (LH dominant) to +1.0 (RH dominant), 0.0 = balanced
  hbs_history: {                     // track HBS over time to detect trends
    date: ISO-8601,
    value: float
  }[],
  hbs_trend: float,                  // slope of HBS over last 30 days

  // Learning modality preferences (inferred from engagement patterns)
  modality_preferences: {
    visual: float,                   // 0-1, relative preference
    auditory: float,
    textual: float,
    kinesthetic: float               // interaction-heavy, drag-and-drop, drawing
  },

  // Metacognitive accuracy
  metacognitive_accuracy: float,     // 0-1, derived from confidence_accuracy_correlation
                                     // 1.0 = perfect calibration, 0.0 = no correlation
  metacognitive_trend: float,        // is calibration improving over time?

  // Learning velocity
  learning_velocity: float,          // average mastery increase per session across all active KCs
  velocity_by_difficulty: {          // velocity broken down by difficulty tier
    tier_1: float,
    tier_2: float,
    tier_3: float,
    tier_4: float
  },
  velocity_trend: float,             // is the learner speeding up or slowing down?

  // Strengths and weaknesses
  strongest_assessment_types: string[],   // top 3 assessment types by accuracy/score
  weakest_assessment_types: string[],     // bottom 3
  strongest_topics: string[],             // top 3 topics by proficiency
  weakest_topics: string[]                // bottom 3
}
```

**Update Rules:**
- HBS is recalculated after each session using the formula from 03-instructional-design.md Section 4.5.
- Modality preferences are inferred from engagement depth: if the learner spends more time on visual content and scores higher on visual assessments, the visual preference score increases. Updated after every 5 sessions using EWMA.
- Metacognitive accuracy = max(0, confidence_accuracy_correlation). Updated after every 10 confidence-rated items.
- Learning velocity = mean(delta_mastery) across all KCs that were practiced in the session, measured per session. Updated each session.

---

### 2.5 Motivational State

The Motivational State tracks engagement and motivation indicators. These are the most volatile metrics and require careful interpretation.

```
MotivationalState {
  learner_id: string,

  // Engagement trend
  engagement_trend: "increasing" | "stable" | "declining",
  engagement_score: float,           // 0-1, composite of session frequency, completion, and depth
  engagement_history: {
    week: ISO-8601,                  // week start date
    score: float
  }[],

  // Autonomy
  topic_choice_rate: float,          // proportion of sessions where the learner chose the topic (vs. system-recommended)
  exploration_rate: float,           // proportion of optional content the learner explores (spatial maps, forward glimpses, etc.)
  preferred_session_type: "full" | "quick" | "extended",

  // Challenge tolerance
  challenge_tolerance: float,        // 0-1, derived from behavior after encountering difficulty
  // High: learner persists through difficult items, engages with Level 3-4 content, shows growth mindset indicators
  // Low: learner abandons sessions when difficulty increases, avoids Level 3-4 content, shows fixed mindset indicators

  // Abandonment
  session_abandonment_rate: float,   // proportion of sessions started but not completed
  abandonment_stage: {               // where in the loop does abandonment most often occur?
    encounter: float,
    analysis: float,
    return: float
  },
  last_active: ISO-8601,
  days_since_last_session: integer,

  // Risk indicators
  dropout_risk: "low" | "moderate" | "high",  // derived from engagement trend + abandonment + days inactive
  burnout_risk: "low" | "moderate" | "high"   // derived from session frequency spike + declining accuracy + increasing latency
}
```

**Update Rules:**
- `engagement_score` is computed weekly as: `0.4 * normalized_session_frequency + 0.3 * session_completion_rate + 0.3 * return_engagement_score`.
- `engagement_trend` is determined by the slope of engagement_score over the last 4 weeks: positive slope > 0.05 = "increasing"; slope between -0.05 and 0.05 = "stable"; slope < -0.05 = "declining".
- `challenge_tolerance` is computed from: (a) proportion of Level 3-4 items attempted (vs. available), (b) persistence after incorrect answers (does the learner retry or abandon?), (c) session completion rate when average difficulty is above the learner's median. Updated after every 5 sessions.
- `dropout_risk` is computed as:
  - "high" if engagement_trend = "declining" AND days_since_last_session > 7 AND session_abandonment_rate > 0.4
  - "moderate" if engagement_trend = "declining" OR days_since_last_session > 5 OR session_abandonment_rate > 0.3
  - "low" otherwise
- `burnout_risk` is computed as:
  - "high" if sessions_last_7_days > 2 * sessions_last_30_days/4 (i.e., recent frequency is double the average) AND lh_accuracy is declining AND average_latency is increasing
  - "moderate" if two of the three burnout indicators are present
  - "low" otherwise

---

### 2.6 How Each Metric Feeds the Adaptive Engine

| Metric | Feeds Into | Adaptive Action |
|--------|-----------|-----------------|
| KC mastery_level | Content selection, difficulty | Advance to harder content when high; revisit prerequisites when low |
| FSRS retrievability | Review scheduling | Schedule review when R drops below target threshold |
| Topic proficiency | Topic recommendation | Recommend topics with optimal proficiency for growth (not too easy, not too hard) |
| Prerequisite map | Content gating | Block advanced content until prerequisites are met |
| Session frequency | Session design | Adjust session length and new-item count to match learner's pace |
| Response latency | Confidence estimation | Fast + correct = automatic knowledge; slow + correct = effortful; use to calibrate FSRS |
| Help-seeking rate | Scaffolding level | High rate = increase scaffolding; zero rate + errors = insert calibration prompts |
| Stage time ratios | Loop balance | Extend underweighted stages; compress overweighted stages |
| HBS | Stage emphasis | LH-dominant learners get extended Encounter/Return; RH-dominant get extended Analysis |
| Metacognitive accuracy | Assessment type selection | Low calibration = more free recall (harder retrieval), more calibration feedback |
| Learning velocity | Pacing | Fast learners get more new content; slow learners get more review and scaffolding |
| Engagement trend | Session design, nudges | Declining = simplify sessions, re-engage with compelling hooks, offer autonomy |
| Challenge tolerance | Difficulty ceiling | Low tolerance = cap difficulty at Level 2-3 until tolerance builds; high = unlock Level 4 |
| Dropout risk | Re-engagement | High risk = send curiosity nudge, simplify next session, prioritize autonomy |
| Burnout risk | Pacing | High risk = reduce session frequency recommendation, lighten session load, celebrate progress |

---

## 3. Spaced Repetition Algorithm Design

### 3.1 Core FSRS Algorithm Specification

Hemisphere uses the **Free Spaced Repetition Scheduler (FSRS)** algorithm (Ye et al., 2024) as the foundation for review scheduling. FSRS models memory as a three-component system and uses machine-learning-optimized parameters to predict when a learner will forget each item.

#### 3.1.1 Memory Model

Each reviewable item has a memory state defined by three variables:

- **Stability (S):** The time (in days) at which retrievability drops to the target retention rate (default 90%). Higher stability means the memory decays more slowly. After a successful review, stability increases. After a failed review, stability decreases (but does not reset to zero).

- **Difficulty (D):** An item-specific parameter (range 0.0-1.0) reflecting how inherently hard the item is for this learner. High-difficulty items gain stability more slowly. Difficulty is initialized based on the learner's first rating and adjusted over subsequent reviews.

- **Retrievability (R):** The predicted probability that the learner can successfully recall the item right now. R is a function of S and the time elapsed since the last review. R decays exponentially:

```
R(t) = (1 + t / (9 * S))^(-1)
```

Where t = days since last review and S = current stability. When R drops below the target retention threshold (default 0.90), the item is due for review.

#### 3.1.2 State Transitions

Items progress through four states:

```
NEW --> LEARNING --> REVIEW <--> RELEARNING
```

- **NEW:** Never reviewed. Introduced during Analysis as new items.
- **LEARNING:** In the initial learning phase. Short intervals (minutes to hours). Graduates to REVIEW after the first successful review with rating >= Good.
- **REVIEW:** In the long-term spaced review cycle. Intervals range from days to months. If the learner fails (rating = Again), the item enters RELEARNING.
- **RELEARNING:** Failed after previously being in REVIEW. Short intervals again, similar to LEARNING. Returns to REVIEW after successful re-learning.

#### 3.1.3 Stability Update After Review

After a review, stability is updated based on the rating:

**For successful reviews (rating = Hard, Good, or Easy):**
```
S' = S * (1 + e^(w[8]) * (11 - D) * S^(-w[9]) * (e^(w[10] * (1 - R)) - 1) * scaling_factor)
```

Where:
- S' = new stability
- S = current stability
- D = difficulty
- R = retrievability at time of review
- w[8], w[9], w[10] = optimizable parameters (learned from data)
- scaling_factor = {Hard: w[15], Good: 1.0, Easy: w[16]}

**For failed reviews (rating = Again):**
```
S' = w[11] * D^(-w[12]) * ((S + 1)^(w[13]) - 1) * e^(w[14] * (1 - R))
```

This ensures stability decreases after failure but does not reset to zero -- the learner retains some benefit from prior reviews.

#### 3.1.4 Difficulty Update After Review

```
D' = w[7] * D_init + (1 - w[7]) * (D - w[6] * (rating - 3))
```

Where:
- D' = new difficulty (clamped to [0.0, 1.0])
- D_init = initial difficulty based on first rating
- rating = 1 (Again), 2 (Hard), 3 (Good), 4 (Easy)
- w[6], w[7] = optimizable parameters

Items that are consistently rated Easy decrease in difficulty; items consistently rated Again increase. The mean-reversion term (w[7] * D_init) prevents difficulty from drifting too far from its initial value.

#### 3.1.5 Scheduling

The next review is scheduled for the day when R is predicted to drop to the target retention threshold:

```
interval = S * (target_retention^(-1/w[17]) - 1)
```

Where target_retention is the desired probability of recall (default: 0.90).

#### 3.1.6 Parameter Optimization

FSRS uses 19 parameters (w[0] through w[18]) that are initialized with global defaults derived from large-scale data. After a learner accumulates sufficient review history (minimum 50 reviews), the parameters are optimized per-learner using their own data, via gradient descent on a log-loss objective. This personalization typically improves scheduling accuracy by 10-20% over global defaults.

---

### 3.2 Hemisphere-Aware Extensions to FSRS

Standard FSRS treats all items identically regardless of their learning stage or hemisphere engagement. Hemisphere extends FSRS with stage-aware scheduling that respects the different memory characteristics of Encounter, Analysis, and Return items.

#### 3.2.1 Encounter Items

**Characteristics:** Encounter items are encoded in episodic, contextual, emotional memory (RH-mediated). They include narrative recall, metaphor recognition, and prediction prompts that were later validated. These items tend to have higher initial stability (emotional encoding enhances consolidation -- Cahill & McGaugh, 1998) but are more context-dependent.

**Scheduling Extensions:**
- **Initial stability bonus:** Encounter items start with S_init multiplied by 1.3 (30% higher than Analysis items), reflecting the episodic encoding advantage.
- **Context variation at review:** When an Encounter item comes up for review, the system does not present it in the identical format. Instead, it wraps the retrieval prompt in a slightly different narrative frame or context. For example, if the original Encounter introduced photosynthesis through van Helmont's willow tree experiment, a review might present: "A scientist in the 1600s planted a willow tree in a weighed pot of soil. Five years later, the tree weighed 74 kg more. The soil had lost only 57 grams. What did this tell him?" The core fact is the same; the framing varies. This leverages the RH's preference for contextual variation and prevents the LH trap of memorizing a specific card rather than understanding a concept.
- **Review format:** Cued recall with contextual variation (not bare-bones flashcard format).

#### 3.2.2 Analysis Items

**Characteristics:** Analysis items are encoded in semantic, categorical memory (LH-mediated). They include definitions, procedures, categorizations, and factual recall. These items follow standard forgetting curves and benefit from standard FSRS scheduling.

**Scheduling Extensions:**
- **Standard FSRS scheduling** with no modifications to stability initialization.
- **Review format:** The same format as initial practice (flashcard, matching, categorization, fill-in-the-blank). Consistency of format is appropriate for LH items because the LH processes familiar, routinized material efficiently.
- **Difficulty-dependent interleaving:** At higher difficulty levels (3-4), Analysis items are interleaved with items from related topics to force discrimination.

#### 3.2.3 Return Items

**Characteristics:** Return items are not facts to be recalled but demonstrations of understanding -- transfer challenges, creative prompts, and connection-making tasks. You cannot "review" a creative transfer the same way twice; presenting the identical prompt would produce rote recall of the previous response rather than genuine transfer.

**Scheduling Extensions:**
- **Concept-level scheduling, not item-level:** What is spaced is the underlying knowledge component, not the specific prompt. When a Return-type KC comes due for review, the system generates or selects a new transfer challenge, creative prompt, or connection task targeting the same concept. The learner never sees the exact same Return prompt twice.
- **Longer intervals:** Return items use a target retention threshold of 0.85 (vs. 0.90 for Analysis items). This means reviews are spaced further apart, reflecting the greater durability of deep understanding compared to surface recall.
- **Stability boost from quality:** Return items that receive scores of 3 or 4 on the rubric get a 1.5x stability multiplier, reflecting that high-quality transfer/creative responses indicate robust, deeply encoded understanding that will persist longer.
- **Fallback to Analysis on failure:** If a Return item is failed (score of 0 or 1), the system does not simply reschedule the Return item sooner. Instead, it schedules additional Analysis-level review of the underlying KCs first, rebuilding the foundation before attempting transfer again. This prevents the frustrating cycle of repeatedly failing at transfer without addressing the root cause.

---

### 3.3 Review Session Composition Algorithm

Each review session must balance multiple competing demands: reviewing due items, introducing new items, interleaving across topics, and maintaining the RH-->LH-->RH loop structure. The Review Session Composition Algorithm determines the mix.

#### 3.3.1 Session Budget

A standard Analysis block is 6-10 minutes, accommodating approximately 20-30 items (at 15-25 seconds per item on average). The budget is allocated as follows:

```
Session item budget allocation:
  New items:          35-40% of budget (~8-12 items)
  Due review items:   35-40% of budget (~8-12 items)
  Interleaved items:  20-25% of budget (~5-7 items)
```

If there are fewer due review items than budgeted (because the learner is new or has high retention), the surplus is allocated to new items. If there are more due review items than budgeted (because the learner has been absent), review takes priority over new items:

```
Priority order when budget is constrained:
  1. Overdue review items (R < 0.70) -- these are at high risk of being forgotten
  2. Due review items (R between 0.70 and 0.90)
  3. New items from current topic
  4. Interleaved items from related topics
  5. Due review items that are not yet overdue (R > 0.90 but approaching 0.90)
```

#### 3.3.2 Topic Mixing Rules

Within a session, items are drawn from multiple topics following these rules:

1. **Current topic dominance:** At least 50% of items come from the current lesson's topic (the topic featured in this session's Encounter).
2. **Related topic interleaving:** 20-30% of items come from topics with high similarity scores to the current topic (similarity > 0.5 on the topic similarity matrix defined in 03-instructional-design.md Section 4.6).
3. **Distant topic maintenance:** Up to 20% of items come from lower-similarity topics that are due for review according to FSRS. These maintain breadth of retention.
4. **No cold topics:** Items are never interleaved from topics the learner has not yet encountered. You cannot review what you have not learned.

#### 3.3.3 Item Ordering Within Session

Items within the Analysis block are not presented in random order. The ordering follows these principles:

1. **Start with moderate difficulty:** The first 2-3 items are moderate difficulty (Level 2) review items from mastered topics. This warms up retrieval without intimidating the learner.
2. **New items clustered in the middle:** New items from the current topic are presented in a cluster (not scattered), because they benefit from the contextual coherence of appearing together, close to the Encounter stage that introduced them.
3. **Interleaved items distributed throughout:** Interleaved items from other topics are distributed among the new and review items, never in their own cluster (this would defeat the purpose of interleaving).
4. **End with a confidence builder:** The last 1-2 items are easier items that the learner is likely to get right, ending the Analysis block on a positive note before the Return transition.

---

### 3.4 Optimal Review Session Length and Frequency

#### 3.4.1 Session Length

Research on attention spans in digital learning contexts suggests that productive engagement in focused, analytical work (the Analysis stage) degrades after 10-15 minutes of continuous practice (this is the basis for the 6-10 minute Analysis block in the instructional design). The full session (Encounter + Analysis + Return) should not exceed 18 minutes for standard sessions.

**Recommendations:**
- **Daily review:** 1 session per day, 12-18 minutes. This is optimal for retention and habit formation.
- **Minimum effective dose:** 3 sessions per week, each at least 7 minutes (Quick Loop format). Below this frequency, forgetting outpaces review.
- **Maximum productive dose:** 2 sessions per day (morning + evening), each 12-18 minutes. Beyond this, diminishing returns set in and burnout risk increases.
- **Session spacing:** If two sessions occur in one day, they should be separated by at least 4 hours (to allow some forgetting, creating desirable difficulty for the second session).

#### 3.4.2 Review Frequency by Item State

| Item State | Review Frequency | Rationale |
|------------|-----------------|-----------|
| LEARNING (new items) | Same day or next day | New items need rapid initial reinforcement |
| REVIEW (stable) | Per FSRS schedule (days to months) | Spacing is determined by predicted retrievability |
| RELEARNING (lapsed) | Next session | Lapsed items need immediate re-reinforcement |
| OVERDUE (R < 0.70) | Next session, priority | High risk of total forgetting |

---

### 3.5 Handling Consistently Failed Items

Items that the learner consistently fails despite repeated review require special handling. Simply showing the item more frequently is not sufficient -- it creates the "drill of death" anti-pattern without addressing the underlying learning failure.

#### 3.5.1 Detection

An item is flagged as "consistently failing" when:
- It has been reviewed at least 5 times AND
- The success rate over the last 5 reviews is below 40% AND
- The item is at difficulty Level 1 (it cannot be retreated further)

#### 3.5.2 Response Protocol

1. **Pause FSRS scheduling** for this item. Remove it from the standard review queue.
2. **Diagnose the failure mode:**
   - Check prerequisite mastery: are the KCs that this item depends on mastered? If not, schedule review of the prerequisites first.
   - Check for misconception: analyze the learner's incorrect responses. If they consistently select the same wrong answer (in MC) or produce the same incorrect response (in free recall), a specific misconception may be present.
   - Check for encoding failure: if the learner's responses show no consistent pattern (random-seeming errors), the item was likely never properly encoded in the first place.
3. **Apply targeted intervention based on diagnosis:**
   - **Prerequisite gap:** Redirect the learner to the prerequisite topic. Schedule a micro-Encounter + Analysis for the prerequisite. Resume the failed item after the prerequisite reaches mastery >= 0.6.
   - **Misconception:** Present targeted corrective content that directly addresses the misconception. Use an error identification exercise where the learner sees their own incorrect response and is guided to find the error. Then present the correct understanding with explicit contrast to the misconception.
   - **Encoding failure:** Re-introduce the item through a full mini-Encounter: re-present the narrative context, the metaphor, and the emotional anchor. Then re-practice at Level 1 with heavy scaffolding (worked example, then faded). Only after successful re-encoding does the item re-enter the FSRS queue.
4. **Resume scheduling** after the intervention has been completed and the learner has demonstrated 2 consecutive correct responses.

---

### 3.6 Detecting and Addressing Zombie Items

"Zombie items" are items that the learner reviews regularly and passes (maintaining their FSRS schedule) but has never truly learned. They represent rote pattern matching rather than genuine understanding.

#### 3.6.1 Detection Signals

A zombie item exhibits some or all of the following:
- **LH pass, RH fail:** The learner can recall the specific fact (passes Analysis assessment) but cannot transfer, explain, or apply it (fails Return assessment targeting the same KC).
- **Format-dependent success:** The learner succeeds on the exact format they have practiced (e.g., a specific MC question) but fails when the same content is presented in a different format (e.g., free recall or transfer).
- **High speed, low understanding:** Very fast response time (suggesting automatic pattern matching) combined with inability to elaborate when asked "Why is this the answer?"
- **Stable accuracy, no depth growth:** The item maintains accuracy at Level 1-2 over many sessions but never advances to Level 3-4 despite being eligible.

#### 3.6.2 Detection Algorithm

```
For each item with review_count >= 8 AND state == REVIEW:
  zombie_score = 0

  // Signal 1: LH-RH divergence
  kc = item.knowledge_component
  if kc.lh_accuracy >= 0.8 AND kc.rh_score < 0.4:
    zombie_score += 0.4

  // Signal 2: Format dependence
  if item has been tested in alternative format:
    if original_format_accuracy >= 0.8 AND alternative_format_accuracy < 0.5:
      zombie_score += 0.3

  // Signal 3: Speed without depth
  if item.average_latency < global_latency_25th_percentile AND item has elaboration_score < 2:
    zombie_score += 0.2

  // Signal 4: Stalled difficulty
  if item.difficulty_tier has not advanced in last 6 reviews AND item is eligible for advancement:
    zombie_score += 0.1

  if zombie_score >= 0.5:
    flag item as zombie
```

#### 3.6.3 Response Protocol

1. **Change the assessment format.** If the learner has been reviewing a zombie item as an MC question, switch to free recall. If they have been doing free recall, switch to a transfer challenge. The new format tests whether the knowledge is flexible or merely pattern-matched.
2. **Require elaboration.** After the learner answers, require them to explain why their answer is correct. "You said the answer is chloroplast. Explain what happens in the chloroplast and why it matters." Score the elaboration with LLM.
3. **Present in novel context.** Wrap the same knowledge component in a new scenario the learner has not seen before. If they succeed, the item is de-zombified. If they fail, treat it as an encoding failure (see Section 3.5.2, step 3).
4. **Update the KC mastery.** If the zombie detection reveals that the learner cannot transfer or elaborate, reduce the KC mastery_level by weighting the RH assessment failure more heavily. The visible knowledge map should reflect the gap -- the learner should see that this topic is "less mastered than it seemed."

---

## 4. Analytics Dashboard Specifications

### 4.1 Learner Dashboard

The Learner Dashboard is the learner's primary interface for understanding their own learning. It embodies the principle of making metacognition visible (Pedagogy doc, Principle 9). The dashboard should feel like looking at a living map of your own understanding -- not a report card.

#### 4.1.1 Knowledge Map Visualization

**What it shows:** A spatial network graph where each node represents a topic and edges represent relationships between topics. This is the same spatial overview map from the Encounter stage, but now populated with the learner's actual progress data.

**Visual encoding:**
- **Node size:** Proportional to the number of KCs in the topic. Larger topics appear as larger nodes.
- **Node color:** Encodes mastery level using a continuous gradient:
  - Not started (mastery < 0.1): Translucent outline, no fill
  - Beginning (0.1-0.3): Pale warm tone (light amber)
  - Developing (0.3-0.6): Medium warm tone (amber)
  - Proficient (0.6-0.8): Rich warm tone (deep amber/gold)
  - Mastered (0.8-1.0): Full vibrant tone (gold with subtle glow)
- **Node border:** Indicates review status:
  - Solid: All items in this topic are up-to-date (no overdue reviews)
  - Dashed: Some items are due for review
  - Pulsing: Items are overdue (R < 0.70)
- **Edge thickness:** Proportional to the number of connections the learner has made between topics (from Connection Mapping assessments). Thicker edges = more connections discovered.
- **Edge color:** Learner-created connections are highlighted in a distinct accent color; system-provided connections are in a neutral tone.

**Interaction:**
- Tap a node to expand it into its constituent KCs, each shown as a smaller sub-node with its own mastery color.
- Long-press a node to see details: mastery level, last practiced date, next review date, number of connections.
- Pinch-to-zoom to navigate the full map.
- A "What needs review?" filter highlights only nodes with overdue items.

**Layout:** Organic, force-directed layout reflecting conceptual relationships (not a rigid grid). Topics that are conceptually close appear spatially close. The layout algorithm prioritizes stability -- nodes should not jump around between sessions.

**Update frequency:** After every session. New connections and mastery changes are animated subtly to make progress visible.

**Actions driven by data:** The learner can tap "Study this" on any node to initiate a session focused on that topic. The system uses the knowledge map to surface recommendations: "Your strongest area is natural selection. Your weakest area needing review is the Calvin cycle."

---

#### 4.1.2 Learning Velocity Graph

**What it shows:** A time-series graph showing the learner's mastery growth over time. The x-axis is time (days/weeks); the y-axis is average mastery level across all active KCs.

**Visual encoding:**
- **Primary line:** Overall mastery trend (thick line, primary color).
- **Secondary lines (toggleable):** Mastery trend per topic (thinner lines, topic-coded colors). The learner can toggle individual topics on/off.
- **Shaded area:** The range between LH mastery and RH mastery for each time point. A wide band indicates hemispheric imbalance (the learner is mastering recall but not transfer, or vice versa). A narrow band indicates balanced learning.
- **Milestone markers:** Points where the learner crossed mastery thresholds (e.g., "Photosynthesis reached 'Proficient' on Feb 3").

**Chart type:** Line chart with area fill for the LH-RH band. Smoothed using a 3-session moving average to reduce noise.

**Update frequency:** After every session.

**Actions driven by data:** The velocity graph helps the learner see that consistent practice produces visible results (growth mindset reinforcement). If the graph plateaus, the system can annotate it: "Your growth has leveled off in this area. Trying Level 3 challenges or reviewing connections to related topics may help."

---

#### 4.1.3 Hemisphere Balance Indicator

**What it shows:** The learner's Hemisphere Balance Score (HBS) visualized as a simple, intuitive gauge.

**Visual encoding:** A horizontal bar centered at zero. The bar extends left for LH-dominant (cool blue) and right for RH-dominant (warm amber). The current HBS is marked with a pointer. The balanced zone (-0.1 to +0.1) is highlighted in green.

Below the gauge, a plain-language interpretation:
- "Your learning is well-balanced between analysis and creative application." (balanced)
- "You're strong at focused practice. Try spending more time on creative challenges and connections." (LH-dominant)
- "You're strong at big-picture thinking. Try spending more time on precise recall and categorization." (RH-dominant)

**Update frequency:** After every session.

**Actions driven by data:** If the indicator is consistently out of balance, the system recommends specific activities: "Try the 'Explain to a 10-year-old' challenge for your most recent topic" (for LH-dominant learners) or "Spend an extra 2 minutes on the categorization exercises today" (for RH-dominant learners).

---

#### 4.1.4 Retention Forecast

**What it shows:** A list of the learner's weakest areas that most urgently need review, ranked by predicted retrievability decay.

**Visual encoding:** A sorted list of KCs, each showing:
- KC name and parent topic
- Current estimated retrievability (as a percentage and a decay bar)
- Days until predicted forgetting (R drops below 0.70)
- A color indicator: green (safe, R > 0.90), yellow (approaching due, R 0.80-0.90), orange (due, R 0.70-0.80), red (overdue, R < 0.70)

**Update frequency:** Real-time (retrievability is computed as a function of time elapsed since last review).

**Actions driven by data:** "You have 5 items at risk of forgetting. A 7-minute Quick Loop would cover them." Tapping any item starts a focused review session.

---

#### 4.1.5 Session History and Patterns

**What it shows:** A calendar heatmap showing the learner's activity over the past 90 days, plus summary statistics for the current period.

**Visual encoding:**
- **Calendar heatmap:** Each day is a cell colored by session depth:
  - No session: Empty/light gray
  - Quick Loop: Light fill
  - Standard session: Medium fill
  - Extended session: Dark fill
- **Summary statistics:**
  - Current streak (consecutive days with at least one session)
  - Sessions this week / month
  - Average session duration
  - Total learning time this month
  - Topics studied this month

**Note on streaks:** The streak counter is present but deliberately understated (small text, no fireworks or animations). Streaks are informational, not the primary motivational mechanism. Breaking a streak produces no negative feedback -- the system simply shows "Last session: 3 days ago."

**Update frequency:** After every session.

---

#### 4.1.6 Metacognitive Accuracy Tracker

**What it shows:** A visualization of how well the learner's confidence ratings predict their actual performance.

**Visual encoding:** A 2x2 grid (calibration matrix):

```
                    Actually Correct    Actually Incorrect
Felt Confident      [True Positive]     [Overconfident]
                    Green cell          Red cell
Felt Unsure         [Underconfident]    [True Negative]
                    Amber cell          Blue cell
```

Each cell shows the count and percentage. Below the grid, a single calibration score (0-100%) and a trend arrow (improving, stable, or declining).

**Plain-language interpretation:**
- High true-positive + high true-negative: "You have a good sense of what you know and what you don't. Trust your instincts."
- High overconfident: "You tend to feel more confident than your accuracy warrants. That's normal -- spacing and testing will help you calibrate."
- High underconfident: "You know more than you think! Try trusting yourself more before asking for hints."

**Update frequency:** After every 10 confidence-rated items.

**Actions driven by data:** For overconfident learners: increase free recall frequency, add delayed tests of "Easy"-rated items. For underconfident learners: show encouraging calibration data, gradually fade help buttons.

---

### 4.2 Administrator / Researcher Dashboard

The Administrator Dashboard serves content creators, product managers, and researchers. It provides aggregate analytics for monitoring learning outcomes, evaluating content effectiveness, and running experiments.

#### 4.2.1 Cohort-Level Learning Outcomes

**What it shows:** Aggregate learning metrics across all learners or a filtered cohort.

**Metrics:**
- Mean mastery level by topic (bar chart, sorted by mastery)
- Mastery distribution by topic (histogram showing how many learners are at each mastery level)
- Mean time-to-mastery by topic (how many sessions to reach 0.8 mastery)
- LH vs. RH mastery gap by topic (are learners recalling but not transferring, or vice versa?)
- Completion rate by topic (what proportion of learners who start a topic reach mastery?)

**Chart types:** Bar charts for comparisons, histograms for distributions, scatter plots for LH-vs-RH mastery gaps.

**Filters:** Date range, cohort (e.g., new users, returning users, high-engagement, low-engagement), topic, difficulty level.

**Update frequency:** Daily batch computation (not real-time, to reduce computation load).

**Actions driven by data:** Topics with consistently low mastery or high LH-RH gaps should be flagged for content review. Topics with high time-to-mastery may need better scaffolding or a more engaging Encounter.

---

#### 4.2.2 Content Effectiveness Metrics

**What it shows:** Per-content-item analytics that reveal which pieces of content produce the best learning outcomes.

**Metrics per content item:**
- Engagement rate (proportion of learners who interact vs. skip)
- Average time spent
- Accuracy on associated assessments (for practice items)
- Discrimination index (do learners who score well on the topic also score well on this item? If not, the item may be testing something other than what it claims)
- For Encounter items: prediction prompt response rate, emotional anchor engagement rate
- For Return items: average quality score, transfer score distribution
- For MC items: distractor selection frequency (reveals which misconceptions are common)

**Chart types:** Sortable tables with sparklines for trends. Heat maps for distractor analysis. Funnel charts for engagement drop-off within multi-step activities.

**Filters:** Date range, learner cohort, topic, content type, difficulty level.

**Update frequency:** Weekly batch computation.

**Actions driven by data:** Items with low discrimination indices should be revised or replaced. Distractors that are never selected are not effective and should be replaced with more plausible alternatives. Encounter items with low engagement need more compelling hooks.

---

#### 4.2.3 A/B Test Results Display

**What it shows:** Results of currently running and completed A/B experiments (see Section 5).

**Metrics per experiment:**
- Sample size per condition (with target sample size for reference)
- Primary metric values per condition (with confidence intervals)
- Statistical significance (p-value and whether the experiment has reached significance)
- Effect size (Cohen's d or equivalent)
- Secondary metric values
- Experiment timeline (start date, estimated completion date, current progress)

**Chart types:** Bar charts with error bars for condition comparisons. Cumulative data plots showing convergence over time. Forest plots for meta-analysis across multiple related experiments.

**Update frequency:** Daily.

**Actions driven by data:** Experiments that reach statistical significance trigger an alert for the product team to decide whether to ship the winning condition. Experiments that are underpowered (running too long without reaching significance) trigger a review of sample size estimates.

---

#### 4.2.4 Hemisphere Balance Distribution

**What it shows:** The distribution of Hemisphere Balance Scores across the learner population.

**Visual encoding:** A histogram showing the HBS distribution, with the balanced zone (-0.1 to +0.1) highlighted. The chart is annotated with the percentage of learners in each zone: strongly LH, mildly LH, balanced, mildly RH, strongly RH.

Additional breakdowns:
- HBS distribution by topic (do certain topics push learners toward LH or RH?)
- HBS evolution over time (is the population trending toward better balance as they use the app?)
- HBS correlation with learning outcomes (do balanced learners achieve higher mastery?)

**Update frequency:** Weekly.

**Actions driven by data:** If a large proportion of learners are LH-dominant (the expected pattern, given that most learners come from LH-dominant educational backgrounds), the team should evaluate whether the Encounter and Return stages are compelling enough to engage learners. If certain topics push learners strongly LH, those topics may need richer Encounter content.

---

#### 4.2.5 Dropout Risk Indicators

**What it shows:** Early warning system for learner disengagement.

**Metrics:**
- Number of learners at each risk level (low, moderate, high)
- Risk level distribution over time (trend line showing whether the app is retaining learners better or worse)
- Most common dropout points (at what stage in the loop, and at what point in a topic sequence, do learners most often abandon?)
- Cohort survival curves (Kaplan-Meier style: what proportion of learners are still active at 7 days, 30 days, 90 days?)
- Predictive factors for dropout (which learner model metrics are most predictive of eventual dropout?)

**Chart types:** Risk distribution pie chart, survival curves, feature importance bar chart for dropout predictors.

**Update frequency:** Daily.

**Actions driven by data:** High dropout rates at specific stages (e.g., many learners abandon during Analysis) suggest that stage needs redesign. If the dropout prediction model identifies specific behavioral patterns (e.g., declining session duration is the strongest predictor), the adaptive engine can intervene earlier for at-risk learners.

---

#### 4.2.6 Content Gap Analysis

**What it shows:** Identifies areas where content is insufficient or missing.

**Metrics:**
- Topics with high learner demand (frequently selected or searched) but low content coverage
- KCs with low mastery across the population despite adequate practice (suggesting the content is ineffective, not that learners are not practicing)
- Assessment types with insufficient coverage (e.g., a topic has many LH assessments but few RH assessments)
- Topics where prerequisite chains are broken (learners are reaching a topic without the necessary foundation)

**Chart types:** Gap analysis matrix (topics vs. content types, with cells colored by coverage). Bar charts for demand-coverage mismatch.

**Update frequency:** Monthly.

**Actions driven by data:** Content gaps are prioritized for creation. The gap analysis should drive the content roadmap.

---

## 5. A/B Testing Plan

### 5.1 General Methodology

All experiments follow these principles:
- **Random assignment:** Learners are randomly assigned to conditions at the account level (not the session level) to prevent within-subject contamination.
- **Stratified randomization:** Assignment is stratified by key confounders: prior learning experience (new vs. returning), session frequency (high vs. low), and topic domain (to ensure balance).
- **Intention-to-treat analysis:** All randomized learners are included in the analysis regardless of compliance (to avoid selection bias from differential dropout).
- **Pre-registration:** All experiments are pre-registered with specific hypotheses, primary metrics, sample sizes, and analysis plans before data collection begins.
- **Sequential testing:** We use group sequential designs with alpha-spending functions (O'Brien-Fleming boundaries) to allow early stopping for large effects while controlling the overall Type I error rate at 0.05.
- **Minimum detectable effect:** Unless otherwise specified, experiments are powered to detect a Cohen's d of 0.20 (small-to-medium effect) with 80% power at alpha = 0.05.

---

### 5.2 Experiment 1: RH-->LH-->RH vs. LH-Only for Retention

**Hypothesis:** Learners who experience the full RH-->LH-->RH learning loop will retain significantly more knowledge at 1 week and 1 month than learners who experience an LH-only approach (Analysis stage only: definitions, drills, and retrieval practice without Encounter or Return stages).

**Rationale:** This is the foundational experiment that tests whether the hemisphere-informed approach produces superior retention compared to the traditional "teach then drill" approach used by most learning apps (see competitive analysis in 02-pedagogy-and-learning-science.md, Section 5).

**Conditions:**
- **Treatment (RH-->LH-->RH):** The full Hemisphere learning loop. Encounter (narrative, metaphor, spatial overview, emotional anchor) --> Analysis (retrieval practice, categorization, interleaving) --> Return (reconnection, transfer challenge, creative synthesis, reflection).
- **Control (LH-only):** The same content, same total time, same assessment items, but restructured: begins with a brief definition/overview (replacing the narrative Encounter), followed by extended Analysis (drills and retrieval practice using the time freed from Encounter and Return), ending with a summary (replacing the creative Return). The control represents a well-designed traditional digital learning experience -- not a strawman.

**Content:** Both conditions cover the same topics (natural selection, photosynthesis, the immune system) with the same KCs and the same total session time (15 minutes per session, 5 sessions per topic).

**Primary Metrics:**
- **1-week retention:** Accuracy on a surprise LH-structured assessment (free recall + MC) administered 7 days after the final session for each topic.
- **1-month retention:** Same assessment administered 30 days after the final session.

**Secondary Metrics:**
- Transfer score: Accuracy on novel transfer challenges (RH assessment) at 7 days and 30 days.
- Session completion rate: Do learners in one condition complete sessions at higher rates?
- Self-reported engagement: Brief post-session survey (1-5 scale, "How interesting was today's session?").
- Learning velocity: Mastery growth rate per session.

**Sample Size Calculation:**
For a two-sample t-test detecting d = 0.20 with 80% power and alpha = 0.05 (two-tailed), the required sample size per condition is approximately 394. Accounting for 20% attrition over 1 month, target recruitment is 500 per condition (1,000 total).

**Analysis Plan:**
- Primary analysis: Independent samples t-test (or Welch's t-test if variances are unequal) on 1-week and 1-month retention scores.
- Secondary: ANCOVA controlling for baseline knowledge (pretesting score), session completion, and learner demographics.
- Subgroup analysis: Does the treatment effect differ by learner HBS (do LH-dominant learners benefit more from the full loop?), by topic, or by prior knowledge level?
- Bayesian supplement: Compute Bayes factors to quantify evidence for or against the hypothesis, avoiding the dichotomy of significant/not-significant.

---

### 5.3 Experiment 2: Encounter-First vs. Definition-First for Conceptual Understanding

**Hypothesis:** Learners who encounter a topic through narrative, metaphor, and spatial overview (RH Encounter) before receiving formal definitions will achieve deeper conceptual understanding than learners who receive definitions first and narrative later.

**Rationale:** The concreteness fading literature (Goldstone & Son, 2005; Fyfe et al., 2014) strongly suggests that concrete-to-abstract sequencing is superior, but this has not been tested specifically in the context of a hemisphere-informed digital learning app. This experiment directly tests the "no premature abstraction" principle.

**Conditions:**
- **Treatment (Encounter-first):** Standard Hemisphere loop: Encounter (narrative, metaphor, curiosity gap) --> Analysis (definitions, then drills) --> Return.
- **Control (Definition-first):** Modified loop: Analysis starts with definitions and formal explanations, followed by the narrative (presented as "context" after the formal content), then Return. Same total content, same time, different sequence.

**Content:** Three conceptual topics (supply and demand, natural selection, the water cycle). Each learner studies all three topics in their assigned condition.

**Primary Metrics:**
- **Conceptual understanding:** Score on a set of "explain in your own words" and transfer challenges administered after the final session (LLM-scored, rubric-based). This is an RH-type assessment that measures genuine understanding, not just recall.
- **Misconception rate:** Number of detected misconceptions in post-assessments (scored by LLM against a misconception codebook).

**Secondary Metrics:**
- LH retention: Accuracy on factual recall (to check whether the treatment condition sacrifices recall for understanding, which would be important to know).
- Engagement: Session completion rate, time spent in each stage, self-reported interest.
- Prediction accuracy: For Encounter-first, do learners' initial predictions improve over the course of multiple topics (suggesting metacognitive growth)?

**Sample Size Calculation:**
For a two-sample t-test detecting d = 0.25 with 80% power and alpha = 0.05, the required sample size per condition is approximately 253. With 15% attrition, target 300 per condition (600 total).

**Analysis Plan:**
- Primary: Independent samples t-test on conceptual understanding scores and misconception counts.
- Secondary: Mixed ANOVA with condition (between) and topic (within) as factors, to check for condition x topic interactions.
- Process analysis: Mediation analysis testing whether engagement (mediator) explains the condition-outcome relationship.

---

### 5.4 Experiment 3: Creative Return vs. Additional Analysis for Transfer

**Hypothesis:** Learners who complete creative Return activities (metaphor creation, teaching prompts, transfer challenges) will demonstrate significantly better transfer to novel contexts than learners who spend the equivalent time on additional Analysis practice (more drills and retrieval practice).

**Rationale:** This experiment tests the core claim that the Return stage is essential for genuine understanding. The alternative hypothesis is that more Analysis practice (more retrieval repetitions) would produce better outcomes through sheer volume of retrieval practice. If the Return stage adds value beyond what additional practice provides, this validates the three-stage model.

**Conditions:**
- **Treatment (Creative Return):** Standard Hemisphere loop with full Return stage (reconnection, transfer challenge, creative synthesis, reflection).
- **Control (Additional Analysis):** Encounter + extended Analysis (using the time that would have been spent on the Return for additional retrieval practice) + brief summary (no creative activities).

**Content:** Two topics per learner, counterbalanced (topic A in treatment, topic B in control, and vice versa for half the participants). This within-subject design increases power.

**Primary Metric:**
- **Transfer score:** Accuracy on far-transfer challenges (novel domain, same principle) administered 2 weeks after the final session. These transfer challenges have not been seen by either group and are not similar to any practice items. This is the purest measure of flexible, transferable understanding.

**Secondary Metrics:**
- LH retention: Factual recall accuracy at 2 weeks (to check whether the control condition's extra practice produces better recall, even if transfer is worse).
- Creative quality: For the treatment group, the quality of their creative Return outputs (averaged over sessions).
- Self-reported depth of understanding: "How well do you feel you understand this topic?" (1-5 scale).

**Sample Size Calculation:**
Within-subject design (paired t-test) detecting d = 0.20 with 80% power and alpha = 0.05 requires approximately 199 participants. With 20% attrition, target 250.

**Analysis Plan:**
- Primary: Paired t-test on transfer scores (within-subject comparison of treatment vs. control topics).
- Secondary: Paired t-test on LH retention scores (does extra practice produce better recall?).
- Exploratory: Correlation between creative output quality and transfer scores (do learners who produce higher-quality creative work also show better transfer?).

---

### 5.5 Experiment 4: Hemisphere-Balanced vs. Hemisphere-Uniform for Long-Term Engagement

**Hypothesis:** Learners in the hemisphere-balanced condition (full RH-->LH-->RH loop with adaptive balancing) will maintain higher long-term engagement (measured by session frequency and retention over 3 months) than learners in a hemisphere-uniform condition (all stages present but no adaptive balancing based on HBS).

**Rationale:** The adaptive engine's HBS-based adjustments (extending Encounter for LH-dominant learners, extending Analysis for RH-dominant learners) should produce better engagement by keeping learners in their zone of optimal challenge across both hemispheric modes. Without adaptive balancing, naturally LH-dominant learners might find the Return stage frustrating and disengage, while naturally RH-dominant learners might find the Analysis stage tedious.

**Conditions:**
- **Treatment (Adaptive balance):** Full Hemisphere loop with the HBS-based adaptive adjustments described in Section 4.5 of the instructional design doc. Stage durations and emphases are personalized per learner based on their HBS.
- **Control (Fixed balance):** Full Hemisphere loop with fixed stage durations (the standard 25% Encounter / 50% Analysis / 25% Return split). No HBS-based adjustments. The control still includes all three stages -- it is only the personalization that is removed.

**Content:** All available topics. Learners choose freely from the topic catalog (to preserve ecological validity). The experiment runs for 3 months.

**Primary Metrics:**
- **90-day retention rate:** Proportion of learners still active (at least 1 session per week) at 90 days post-enrollment.
- **Total sessions completed:** Over the 3-month period.
- **Engagement trend:** Slope of weekly engagement scores over the 3-month period.

**Secondary Metrics:**
- Average mastery achieved (across all studied topics)
- LH-RH mastery balance (do adaptively balanced learners achieve more balanced mastery?)
- Session completion rate
- Self-reported satisfaction (monthly survey)

**Sample Size Calculation:**
For a chi-squared test of retention rates (binary outcome at 90 days) detecting a 10% difference (e.g., 45% vs. 35% retention) with 80% power and alpha = 0.05, the required sample size is approximately 400 per condition. Target 500 per condition (1,000 total) to account for the noisier nature of behavioral data.

**Analysis Plan:**
- Primary: Chi-squared test for 90-day retention rates. Mann-Whitney U test for total sessions (likely non-normal distribution). Linear mixed model for engagement trend over time (with random intercepts and slopes per learner).
- Subgroup: Does the treatment effect vary by initial HBS? (We expect the largest benefit for learners with extreme HBS scores, for whom the adaptive balancing is most active.)
- Survival analysis: Kaplan-Meier curves and Cox proportional hazards model for time-to-dropout.

---

## 6. Adaptive Engine Specification

### 6.1 Architecture Overview

The Adaptive Engine is the decision-making system that personalizes each learner's experience in real time. It sits between the Learner Model (Section 2) and the Content Delivery System, consuming learner state data and producing decisions about what to present, how to present it, and when.

```
Architecture:

  [Learner Interactions]
         |
         v
  [Learner Model]          <-- Updated after every interaction
    - Knowledge State
    - Behavioral State
    - Cognitive Profile
    - Motivational State
         |
         v
  [Adaptive Engine]         <-- Makes decisions before every content delivery
    - Content Selector
    - Difficulty Adjuster
    - Stage Balancer
    - Session Composer
    - FSRS Scheduler
         |
         v
  [Content Delivery]        <-- Delivers personalized content to the learner
    - Encounter content
    - Analysis items
    - Return activities
```

The engine operates at three timescales:
1. **Per-item (real-time):** After each response, update the learner model and potentially adjust the remaining items in the session.
2. **Per-session (session start):** Before each session begins, compose the session plan (topic, item mix, difficulty levels, stage balance).
3. **Per-week (background):** Re-optimize FSRS parameters, recalculate trends, run zombie detection, update dropout risk.

---

### 6.2 Input Signals

The engine consumes the entire Learner Model (Section 2). The most decision-relevant signals are:

| Signal | Source | Decision It Informs |
|--------|--------|-------------------|
| KC mastery levels | Knowledge State | What to teach / review next |
| FSRS retrievability | Knowledge State | When to schedule reviews |
| Prerequisite map | Knowledge State | Whether advanced content is unlocked |
| HBS | Cognitive Profile | How to balance the three stages |
| Difficulty tier per KC | Knowledge State | What difficulty level to present |
| Session frequency + recency | Behavioral State | How many new items to introduce |
| Help-seeking rate | Behavioral State | How much scaffolding to provide |
| Accuracy trend | Behavioral State | Whether to advance or retreat difficulty |
| Engagement trend | Motivational State | Whether to simplify or enrich sessions |
| Dropout risk | Motivational State | Whether emergency re-engagement is needed |
| Metacognitive accuracy | Cognitive Profile | What assessment types to emphasize |
| Learning velocity | Cognitive Profile | How fast to introduce new material |
| Challenge tolerance | Motivational State | Difficulty ceiling for this learner |

---

### 6.3 Decision Points

The engine makes the following decisions:

#### Decision 1: Topic Selection ("What do we study today?")

**Algorithm:** Hybrid rule-based + scoring.

```
TopicSelectionAlgorithm:

  Input: learner_model, available_topics, learner_choice (if any)

  // If the learner has chosen a topic, honor their choice (autonomy)
  if learner_choice is not null AND learner_choice is unlocked:
    return learner_choice

  // Otherwise, score each available topic
  for each topic in available_topics:
    if topic is locked (prerequisites not met):
      score = 0
      continue

    // Freshness: prefer topics not recently studied
    freshness = days_since_last_session(topic) / 14  // normalized to ~1.0 after 2 weeks
    freshness = min(freshness, 1.0)

    // Urgency: prefer topics with items due for review
    overdue_count = count of items in topic where R < 0.85
    urgency = min(overdue_count / 10, 1.0)

    // Optimality: prefer topics at the right mastery level for growth
    // Optimal mastery for growth is 0.3-0.7 (the ZPD)
    mastery = topic.overall_proficiency
    if mastery < 0.3:
      optimality = mastery / 0.3           // low mastery: proportionally lower score (may need prerequisites)
    elif mastery <= 0.7:
      optimality = 1.0                     // sweet spot
    else:
      optimality = 1.0 - (mastery - 0.7) / 0.3  // high mastery: diminishing returns

    // Interleaving benefit: prefer topics similar to recently studied ones
    similarity_to_recent = max_similarity(topic, last_3_topics_studied)
    interleave_bonus = similarity_to_recent * 0.3  // up to 0.3 bonus for related topics

    // Combine scores
    topic.score = 0.30 * urgency + 0.25 * optimality + 0.25 * freshness + 0.20 * interleave_bonus

  // Return the highest-scoring topic, with randomized tie-breaking
  return top_scored_topic (with random tie-breaking among topics within 5% of the top score)
```

#### Decision 2: Difficulty Level ("How hard should this be?")

**Algorithm:** Rule-based, per KC.

```
DifficultyDecision:

  Input: kc_state, learner_behavioral_state

  // Start at the KC's current difficulty tier
  base_level = kc_state.difficulty_tier

  // Adjust for challenge tolerance
  if learner.challenge_tolerance < 0.3 AND base_level >= 3:
    effective_level = base_level - 1  // reduce for low-tolerance learners

  // Adjust for help-seeking
  if learner.help_request_rate > 0.4 AND base_level >= 2:
    effective_level = base_level - 1  // reduce if learner is over-relying on help

  // Adjust for the "bored learner" pattern
  if learner.accuracy_trend > 0.9 AND learner.latency_trend < -50 AND base_level < 4:
    effective_level = base_level + 1  // push to the next level

  return clamp(effective_level, 1, 4)
```

#### Decision 3: Stage Balance ("How long should each stage be?")

**Algorithm:** HBS-driven rule-based adjustment.

```
StageBalanceDecision:

  Input: hbs, session_type, default_balance

  // Default balance (from instructional design)
  default = { encounter: 0.25, analysis: 0.50, return: 0.25 }

  // Adjust based on HBS
  if hbs < -0.3:  // strongly LH-dominant
    balance = { encounter: 0.30, analysis: 0.40, return: 0.30 }
  elif hbs < -0.1:  // mildly LH-leaning
    balance = { encounter: 0.27, analysis: 0.46, return: 0.27 }
  elif hbs <= 0.1:  // balanced
    balance = default
  elif hbs <= 0.3:  // mildly RH-leaning
    balance = { encounter: 0.22, analysis: 0.56, return: 0.22 }
  else:  // strongly RH-dominant
    balance = { encounter: 0.20, analysis: 0.60, return: 0.20 }

  // Override for session type
  if session_type == "quick":
    balance = { encounter: 0.10, analysis: 0.70, return: 0.20 }  // minimal encounter in quick loops
  elif session_type == "extended":
    // Keep proportions but allow two full loops
    pass

  // Override for topic position in sequence
  if this is session 1 for a new topic:
    balance.encounter = max(balance.encounter, 0.30)  // ensure adequate Encounter for new topics
  elif this is session 5+ for a topic (Return-heavy phase):
    balance.return = max(balance.return, 0.40)  // ensure adequate Return for integration phase

  return balance
```

#### Decision 4: Session Composition ("What specific items and activities fill this session?")

**Algorithm:** Composite, using FSRS + topic selection + difficulty decisions.

```
SessionCompositionAlgorithm:

  Input: selected_topic, stage_balance, session_duration_minutes, learner_model

  // Calculate item budget
  analysis_minutes = session_duration_minutes * stage_balance.analysis
  item_budget = floor(analysis_minutes * 60 / 20)  // ~20 seconds per item average

  // Compose the Analysis block
  items = []

  // 1. Priority: overdue items from any topic
  overdue = get_items_where(R < 0.70, sorted_by R ascending)
  items += overdue[0:min(len(overdue), item_budget * 0.2)]

  // 2. Due review items from selected topic and related topics
  due = get_items_where(R between 0.70 and target_retention, topic in [selected_topic + related_topics])
  items += due[0:min(len(due), item_budget * 0.25)]

  // 3. New items from selected topic
  new_available = get_new_items(selected_topic, difficulty <= learner.effective_difficulty)
  new_count = min(len(new_available), item_budget * 0.35, learner.new_items_per_session_limit)
  items += new_available[0:new_count]

  // 4. Interleaved items from related topics
  interleave_candidates = get_items_from_related_topics(
    selected_topic,
    similarity_threshold=0.5,
    exclude=items_already_selected
  )
  items += interleave_candidates[0:item_budget - len(items)]

  // 5. Apply ordering rules (from Section 3.3.3)
  ordered_items = apply_ordering(items, rules=[
    start_with_moderate_review,
    cluster_new_items_in_middle,
    distribute_interleaved_throughout,
    end_with_confidence_builder
  ])

  // Compose the Encounter block
  if this is session 1 for selected_topic:
    encounter = get_full_encounter(selected_topic)  // Hook + Narrative + Spatial Overview + Emotional Anchor
  else:
    encounter = get_compressed_encounter(selected_topic)  // Hook + brief recap

  // Compose the Return block
  return_activities = select_return_activities(
    selected_topic,
    learner_model,
    available=[reconnection, transfer_challenge, creative_synthesis, reflection_prompt, forward_glimpse]
  )

  return SessionPlan {
    encounter: encounter,
    analysis: ordered_items,
    return: return_activities,
    estimated_duration: session_duration_minutes
  }
```

#### Decision 5: Interleaving Ratio ("How much mixing across topics?")

**Algorithm:** Proficiency-based scaling.

```
InterleavingDecision:

  Input: learner_mastery_for_current_topic, learner_overall_proficiency

  // Novices: less interleaving (they need to build a base first)
  // Advanced: more interleaving (they need discrimination practice)
  if learner_mastery_for_current_topic < 0.3:
    interleave_ratio = 0.10  // 10% interleaved
  elif learner_mastery_for_current_topic < 0.5:
    interleave_ratio = 0.20
  elif learner_mastery_for_current_topic < 0.7:
    interleave_ratio = 0.25
  else:
    interleave_ratio = 0.35  // up to 35% interleaved for proficient learners

  // Topics eligible for interleaving must be at difficulty Level 2+
  eligible_topics = [t for t in related_topics if t.difficulty_tier >= 2]

  return interleave_ratio, eligible_topics
```

---

### 6.4 Feedback Loops

The adaptive engine learns from outcomes through three feedback loops:

#### Feedback Loop 1: Item-Level (Immediate)

After each learner response, the engine receives accuracy, latency, confidence, and help-seeking data. It uses this to:
- Update FSRS memory state for the item.
- Update KC mastery level.
- Potentially adjust the remaining items in the current session (e.g., if the learner is struggling, insert additional scaffolding; if they are breezing through, increase difficulty for remaining items).

**Latency:** Milliseconds. This loop operates within the session in real time.

#### Feedback Loop 2: Session-Level (Between Sessions)

After each session, the engine receives session-level data (completion status, stage time ratios, aggregate accuracy, engagement indicators). It uses this to:
- Update behavioral state metrics.
- Recalculate HBS.
- Adjust the next session's composition (topic, difficulty, balance).
- Detect edge cases (stuck learner, bored learner, disengaged learner -- see 03-instructional-design.md Section 4.7).

**Latency:** Between sessions (minutes to hours).

#### Feedback Loop 3: Population-Level (Weekly)

Weekly batch processing aggregates data across all learners to:
- Re-optimize FSRS parameters per learner (minimum 50 reviews required).
- Update content effectiveness metrics (which items have the best discrimination, which distractors are most diagnostic).
- Run zombie item detection across all learners.
- Update the topic similarity matrix based on learner confusion patterns (if learners frequently confuse topic A with topic B, their similarity score increases).
- Recalibrate LLM scoring rubrics by comparing LLM scores to a sample of human scores.

**Latency:** Weekly batch job.

---

### 6.5 Failsafes

The adaptive engine must handle uncertainty gracefully. When the engine does not have enough data to make a confident decision, it falls back to safe defaults.

#### Failsafe 1: Cold Start (New Learner, No Data)

**Trigger:** Learner has fewer than 3 completed sessions.

**Response:** Use global defaults for all parameters:
- Difficulty: Start at Level 1 for all KCs.
- Stage balance: Standard (25% Encounter, 50% Analysis, 25% Return).
- HBS: Assume 0.0 (balanced).
- New items per session: Conservative (6-8 new items, not the full 10-12).
- Interleaving: Minimal (10%).

The system gathers data rapidly during the first 3 sessions and begins personalizing from session 4 onward.

#### Failsafe 2: Contradictory Signals

**Trigger:** The learner model produces contradictory indicators (e.g., high accuracy but increasing help-seeking; declining engagement but increasing session frequency).

**Response:** Weight behavioral signals over derived signals. If a learner's actions contradict the model's inferences, trust the actions. Specifically:
- If accuracy is high but help-seeking is increasing: the learner may be encountering harder material. Maintain current difficulty; do not advance further until help-seeking stabilizes.
- If engagement is declining but frequency is stable: the learner may be completing sessions out of habit without genuine engagement. Introduce more compelling Encounter hooks and offer topic autonomy.

When contradictions persist for more than 5 sessions, flag the learner for manual review by the content team (if applicable) and revert to population-average parameters for the contradictory metrics.

#### Failsafe 3: Extreme Edge Cases

**Trigger:** A learner exhibits extreme values on any metric (e.g., accuracy < 10% across all topics, or session duration < 30 seconds repeatedly).

**Response:**
- Accuracy < 20% across 3+ sessions: Pause new content. Redirect to the most basic prerequisite. Present a heavily scaffolded Encounter + simple Analysis. If the pattern persists, the content may be mismatched to the learner's current knowledge level -- surface a recommendation to start with an earlier topic.
- Session duration consistently < 60 seconds: The learner may be opening and closing the app without engaging. Do not count these as sessions. Send a one-time message: "It looks like you've been checking in briefly. Would you like to try a 5-minute Quick Loop? Even a few minutes of focused practice makes a difference."
- 100% accuracy with near-zero latency across 10+ sessions: Possible cheating or the content is far too easy. Test with out-of-sequence Level 4 items. If the learner fails these, they were gaming the lower-level items. If they pass, genuinely advance them to harder content rapidly.

#### Failsafe 4: LLM Scoring Failure

**Trigger:** The LLM scoring service is unavailable or returns an error for an RH assessment.

**Response:**
- Fall back to self-assessment: present the rubric to the learner and ask them to score their own response. Self-assessment is less accurate but still valuable for metacognitive development.
- Queue the response for asynchronous LLM scoring when the service recovers. Update the learner model retroactively.
- If LLM scoring is unavailable for an extended period (> 24 hours), temporarily reduce the proportion of RH assessments in sessions and increase LH assessments (which are auto-scorable) to maintain adaptive functionality.

#### Failsafe 5: Preventing Runaway Adaptation

**Trigger:** Any adaptive parameter has been adjusted monotonically in the same direction for 10+ consecutive sessions.

**Response:** Cap the adjustment and flag for review. For example:
- If the stage balance has been shifting toward more Encounter for 10 sessions straight, cap the Encounter at 40% of session time. The learner may genuinely need more Encounter, but the system should not continue adjusting indefinitely without verification.
- If difficulty has been retreating for 10 sessions, floor it at Level 1 and trigger the "stuck learner" protocol (Section 3.5.2 of this document).

The principle is that the adaptive engine should converge on a stable personalization, not oscillate or drift indefinitely. If an adjustment has been made 10 times in the same direction without the learner's behavior changing, the adjustment is not working and a different intervention is needed.

---

### 6.6 Engine Output Actions Summary

| Action | Decision Source | Frequency | Range |
|--------|---------------|-----------|-------|
| Select topic for next session | Topic Selector | Per session | Any unlocked topic |
| Set difficulty level per KC | Difficulty Adjuster | Per item | Level 1-4 |
| Set stage time balance | Stage Balancer | Per session | Encounter 10-40%, Analysis 35-65%, Return 15-40% |
| Compose item list for Analysis | Session Composer | Per session | 12-30 items from multiple topics |
| Schedule next review per item | FSRS Scheduler | Per item | 1 day to 6 months |
| Set interleaving ratio | Interleaving Decision | Per session | 10-35% |
| Select assessment type | Assessment Selector | Per item | LH-structured, RH-open, or Integrated |
| Provide scaffolding level | Scaffolding Adjuster | Per item | Full worked example to no hints |
| Trigger edge case protocols | Edge Case Detector | Per session | Stuck, bored, disengaged, overconfident, anxious |
| Send re-engagement nudge | Dropout Prevention | Per day (if at risk) | Curiosity-driven notification |

---

*This document defines the measurement and personalization systems for the Hemisphere Learning App. Every assessment type, learner model metric, scheduling decision, and adaptive action is traceable to the neuroscience and pedagogy research in Documents 01 and 02, and to the instructional design specifications in Document 03. The assessment system measures both hemispheric modes (LH recall and RH transfer), the learner model captures the full picture of learner state, the spaced repetition system respects the different memory characteristics of each learning stage, and the adaptive engine personalizes the experience while maintaining failsafes against edge cases. As the product evolves and A/B test data accumulates, the specific parameters and thresholds in this document should be refined based on empirical evidence.*
