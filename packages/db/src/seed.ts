/**
 * Dev/local seed script
 * Seeds baseline reference data required by the app shell.
 * Safe to re-run — all inserts use upsert (onConflictDoUpdate) patterns.
 *
 * Usage:
 *   DATABASE_URL=postgres://... tsx packages/db/src/seed.ts
 *   # or via root script:
 *   pnpm db:seed:dev
 */

import { createHash, randomBytes, scryptSync } from 'node:crypto';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import * as schema from './schema/index.js';

// ---------------------------------------------------------------------------
// DB connection (requires DATABASE_URL in environment)
// ---------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('ERROR: DATABASE_URL environment variable is not set.');
  console.error('Copy packages/db/.env.example to packages/db/.env and fill in the value.');
  process.exit(1);
}

const client = postgres(connectionString, { max: 1 });
const db = drizzle(client, { schema });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Deterministic UUID v5-like from a namespace + name using SHA-256. */
function deterministicUuid(namespace: string, name: string): string {
  const hash = createHash('sha256').update(`${namespace}:${name}`).digest('hex');
  // Format as UUID v4 shape (not spec-compliant v5, but stable and unique enough for seeding)
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    '4' + hash.slice(13, 16),
    ((parseInt(hash.slice(16, 18), 16) & 0x3f) | 0x80).toString(16) + hash.slice(18, 20),
    hash.slice(20, 32),
  ].join('-');
}

/** Hash a plaintext password using scrypt — compatible with Node.js built-ins only. */
function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${derived}`;
}

// ---------------------------------------------------------------------------
// Seed IDs — all deterministic so re-runs produce the same rows
// ---------------------------------------------------------------------------

const ADMIN_USER_ID = deterministicUuid('user', 'admin@hemisphere.dev');

const TOPIC_MUSIC_ID = deterministicUuid('topic', 'music');
const TOPIC_HARMONY_ID = deterministicUuid('topic', 'harmony-intervals');

const KC_INTERVALS_ID = deterministicUuid('kc', 'harmony-intervals:intervals');
const KC_CONSONANCE_ID = deterministicUuid('kc', 'harmony-intervals:consonance');
const KC_CHORDS_ID = deterministicUuid('kc', 'harmony-intervals:chords');
const KC_MAJOR_CHORD_ID = deterministicUuid('kc', 'harmony-intervals:major-chord');
const KC_MINOR_CHORD_ID = deterministicUuid('kc', 'harmony-intervals:minor-chord');

const CI_ENC_HOOK_ID = deterministicUuid('content-item', 'harmony-intervals:enc-hook');
const CI_ENC_NARRATIVE_ID = deterministicUuid('content-item', 'harmony-intervals:enc-narrative');
const CI_ANA_INTERVALS_ID = deterministicUuid('content-item', 'harmony-intervals:ana-intervals');
const CI_ANA_CONSONANCE_ID = deterministicUuid('content-item', 'harmony-intervals:ana-consonance');
const CI_ANA_CHORDS_ID = deterministicUuid('content-item', 'harmony-intervals:ana-chords');
const CI_ANA_PRACTICE_ID = deterministicUuid('content-item', 'harmony-intervals:ana-practice');
const CI_RET_RECONNECT_ID = deterministicUuid('content-item', 'harmony-intervals:ret-reconnect');
const CI_RET_REFLECT_ID = deterministicUuid('content-item', 'harmony-intervals:ret-reflect');

// ---------------------------------------------------------------------------
// 1. Admin user
// ---------------------------------------------------------------------------

async function seedAdminUser() {
  console.log('Seeding admin user...');
  await db
    .insert(schema.users)
    .values({
      id: ADMIN_USER_ID,
      email: 'admin@hemisphere.dev',
      passwordHash: hashPassword('admin123'),
      displayName: 'Admin',
      role: 'admin',
      timezone: 'UTC',
      isActive: true,
    })
    .onConflictDoUpdate({
      target: schema.users.email,
      set: {
        displayName: 'Admin',
        role: 'admin',
        isActive: true,
        updatedAt: sql`now()`,
      },
    });
  console.log('  admin@hemisphere.dev (id: ' + ADMIN_USER_ID + ')');
}

// ---------------------------------------------------------------------------
// 2. FSRS default parameters row for admin user
// ---------------------------------------------------------------------------

async function seedFsrsParameters() {
  console.log('Seeding FSRS default parameters...');
  // The default weights match the FSRS-5 defaults already set in the schema.
  // We insert a row so the admin user has a parameters record from the start.
  await db
    .insert(schema.fsrsParameters)
    .values({
      userId: ADMIN_USER_ID,
      // Use schema defaults for weights and targetRetention
    })
    .onConflictDoUpdate({
      target: schema.fsrsParameters.userId,
      set: {
        updatedAt: sql`now()`,
      },
    });
  console.log('  FSRS parameters row for admin user');
}

// ---------------------------------------------------------------------------
// 3. Topics: Music (parent) and Harmony & Intervals (child)
// ---------------------------------------------------------------------------

async function seedTopics() {
  console.log('Seeding topics...');

  // Parent: Music
  await db
    .insert(schema.topics)
    .values({
      id: TOPIC_MUSIC_ID,
      slug: 'music',
      name: 'Music',
      description: 'The art and science of organised sound.',
      topicPath: ['music'],
      parentTopicId: null,
      sortOrder: 0,
      isPublished: true,
    })
    .onConflictDoUpdate({
      target: schema.topics.slug,
      set: {
        name: 'Music',
        description: 'The art and science of organised sound.',
        isPublished: true,
        updatedAt: sql`now()`,
      },
    });

  // Child: Harmony & Intervals
  await db
    .insert(schema.topics)
    .values({
      id: TOPIC_HARMONY_ID,
      slug: 'harmony-intervals',
      name: 'The Hidden Architecture of Music',
      description:
        'Discover how simple mathematical ratios create the emotional power of music, from Pythagoras\'s ancient experiments to modern pop songs.',
      topicPath: ['music', 'harmony-intervals'],
      parentTopicId: TOPIC_MUSIC_ID,
      sortOrder: 1,
      isPublished: true,
    })
    .onConflictDoUpdate({
      target: schema.topics.slug,
      set: {
        name: 'The Hidden Architecture of Music',
        description:
          'Discover how simple mathematical ratios create the emotional power of music, from Pythagoras\'s ancient experiments to modern pop songs.',
        isPublished: true,
        updatedAt: sql`now()`,
      },
    });

  console.log('  music, harmony-intervals');
}

// ---------------------------------------------------------------------------
// 4. Knowledge components for the Harmony & Intervals topic
// ---------------------------------------------------------------------------

async function seedKnowledgeComponents() {
  console.log('Seeding knowledge components...');

  const kcs = [
    {
      id: KC_INTERVALS_ID,
      topicId: TOPIC_HARMONY_ID,
      slug: 'intervals',
      name: 'Intervals',
      description:
        'Understand that an interval is the distance between two notes measured in semitones.',
    },
    {
      id: KC_CONSONANCE_ID,
      topicId: TOPIC_HARMONY_ID,
      slug: 'consonance',
      name: 'Consonance and Dissonance',
      description:
        'Distinguish consonant (stable) from dissonant (tense) intervals by ear and by principle.',
    },
    {
      id: KC_CHORDS_ID,
      topicId: TOPIC_HARMONY_ID,
      slug: 'chords',
      name: 'Chords',
      description:
        'Understand that chords are three or more notes stacked in thirds and identify chord quality.',
    },
    {
      id: KC_MAJOR_CHORD_ID,
      topicId: TOPIC_HARMONY_ID,
      slug: 'major-chord',
      name: 'Major Chord',
      description:
        'Identify and construct a major chord as Root + Major 3rd + Minor 3rd.',
    },
    {
      id: KC_MINOR_CHORD_ID,
      topicId: TOPIC_HARMONY_ID,
      slug: 'minor-chord',
      name: 'Minor Chord',
      description:
        'Identify and construct a minor chord as Root + Minor 3rd + Major 3rd.',
    },
  ];

  for (const kc of kcs) {
    await db
      .insert(schema.knowledgeComponents)
      .values(kc)
      .onConflictDoUpdate({
        target: [schema.knowledgeComponents.topicId, schema.knowledgeComponents.slug],
        set: {
          name: kc.name,
          description: kc.description,
        },
      });
  }

  // KC prerequisites: chords requires consonance, consonance requires intervals
  const prereqs = [
    { kcId: KC_CONSONANCE_ID, prerequisiteId: KC_INTERVALS_ID },
    { kcId: KC_CHORDS_ID, prerequisiteId: KC_CONSONANCE_ID },
    { kcId: KC_MAJOR_CHORD_ID, prerequisiteId: KC_CHORDS_ID },
    { kcId: KC_MINOR_CHORD_ID, prerequisiteId: KC_CHORDS_ID },
  ];

  for (const prereq of prereqs) {
    await db
      .insert(schema.kcPrerequisites)
      .values(prereq)
      .onConflictDoNothing();
  }

  console.log('  intervals, consonance, chords, major-chord, minor-chord (+ prerequisites)');
}

// ---------------------------------------------------------------------------
// 5. Sample content items
// ---------------------------------------------------------------------------

async function seedContentItems() {
  console.log('Seeding content items...');

  const items: (typeof schema.contentItems.$inferInsert)[] = [
    // --- ENCOUNTER stage ---
    {
      id: CI_ENC_HOOK_ID,
      itemType: 'narrative',
      stage: 'encounter',
      hemisphereMode: 'RH',
      difficultyLevel: 1,
      bloomLevel: 'remember',
      noviceSuitable: true,
      advancedSuitable: true,
      topicId: TOPIC_HARMONY_ID,
      body: {
        title: 'The Hook',
        content:
          'Two notes played together can make you feel safe.\n\nTwo different notes can make you feel uneasy.\n\nNobody taught you this. You knew it before you had words.',
        media: [
          {
            type: 'image',
            url: '/assets/images/pianist-hands-warmlight.jpg',
            alt: 'Top-down photograph of two relaxed hands resting on piano keys with warm amber lighting',
          },
          {
            type: 'audio',
            url: '/assets/audio/perfect-fifth-minor-second.mp3',
            alt: 'Piano playing perfect fifth (C-G) followed by minor second (C-Db)',
            duration: 8,
          },
        ],
        layout: 'full_bleed',
        emotionalTone: 'wonder',
      },
      mediaTypes: ['image', 'audio'],
      estimatedDurationS: 45,
      isReviewable: false,
      interleaveEligible: false,
      autoScorable: false,
      language: 'en',
    },
    {
      id: CI_ENC_NARRATIVE_ID,
      itemType: 'narrative',
      stage: 'encounter',
      hemisphereMode: 'RH',
      difficultyLevel: 1,
      bloomLevel: 'understand',
      noviceSuitable: true,
      advancedSuitable: true,
      topicId: TOPIC_HARMONY_ID,
      body: {
        title: 'The Narrative Frame: Pythagoras and the Blacksmith',
        content:
          "Around 500 BC, Pythagoras walked past a blacksmith's shop and stopped. He discovered something extraordinary: when you divide a vibrating string in simple ratios—half, two-thirds, three-quarters—the sounds it makes feel *right* together. Twenty-five centuries later, every pop song still follows the same principle.",
        media: [
          {
            type: 'image',
            url: '/assets/images/pythagoras-blacksmith.jpg',
            alt: 'Illustration of ancient Greek figure seated by river at dusk with glowing blacksmith forge in background',
          },
        ],
        layout: 'card',
        emotionalTone: 'curiosity',
      },
      mediaTypes: ['image'],
      estimatedDurationS: 90,
      isReviewable: false,
      interleaveEligible: false,
      autoScorable: false,
      language: 'en',
    },

    // --- ANALYSIS stage ---
    {
      id: CI_ANA_INTERVALS_ID,
      itemType: 'concept_card',
      stage: 'analysis',
      hemisphereMode: 'LH',
      difficultyLevel: 2,
      bloomLevel: 'understand',
      noviceSuitable: true,
      advancedSuitable: false,
      topicId: TOPIC_HARMONY_ID,
      body: {
        title: 'Intervals',
        content:
          '**An interval is the distance between two notes.**\n\nIntervals are measured in semitones—the smallest distance between two keys on a piano.\n\n| Interval Name | Semitones | Example | Sound Quality |\n|---|---|---|---|\n| Unison | 0 | C to C | Identity |\n| Minor 2nd | 1 | C to Db | Tense, grinding |\n| Major 3rd | 4 | C to E | Bright, happy |\n| Perfect 5th | 7 | C to G | Open, stable |\n| Octave | 12 | C to C(high) | Same note, higher |',
        media: [
          {
            type: 'image',
            url: '/assets/images/piano-intervals-diagram.svg',
            alt: 'Piano keyboard diagram showing intervals from C',
          },
          {
            type: 'audio',
            url: '/assets/audio/intervals-examples.mp3',
            alt: 'Audio examples of each interval',
            duration: 30,
          },
        ],
        layout: 'card',
        emotionalTone: 'focus',
      },
      mediaTypes: ['image', 'audio'],
      estimatedDurationS: 120,
      isReviewable: true,
      reviewFormat: 'flashcard',
      interleaveEligible: true,
      autoScorable: true,
      language: 'en',
    },
    {
      id: CI_ANA_CONSONANCE_ID,
      itemType: 'concept_card',
      stage: 'analysis',
      hemisphereMode: 'LH',
      difficultyLevel: 2,
      bloomLevel: 'understand',
      noviceSuitable: true,
      advancedSuitable: false,
      topicId: TOPIC_HARMONY_ID,
      body: {
        title: 'Consonance and Dissonance',
        content:
          '**Consonance** = intervals that sound stable, pleasant, "at rest."\n\n**Dissonance** = intervals that sound tense, unstable, "wanting to move."\n\nConsonance and dissonance are not good vs. bad. Music needs both. Consonance is home base; dissonance is the journey that makes coming home meaningful.',
        media: [
          {
            type: 'image',
            url: '/assets/images/consonance-spectrum.svg',
            alt: 'Horizontal spectrum showing intervals from consonant to dissonant',
          },
          {
            type: 'audio',
            url: '/assets/audio/tension-resolution-phrase.mp3',
            alt: 'Musical phrase moving from consonance to dissonance and back',
            duration: 6,
          },
        ],
        layout: 'card',
        emotionalTone: 'focus',
      },
      mediaTypes: ['image', 'audio'],
      estimatedDurationS: 90,
      isReviewable: true,
      reviewFormat: 'flashcard',
      interleaveEligible: true,
      autoScorable: true,
      language: 'en',
    },
    {
      id: CI_ANA_CHORDS_ID,
      itemType: 'concept_card',
      stage: 'analysis',
      hemisphereMode: 'LH',
      difficultyLevel: 3,
      bloomLevel: 'understand',
      noviceSuitable: true,
      advancedSuitable: false,
      topicId: TOPIC_HARMONY_ID,
      body: {
        title: 'Chords',
        content:
          '**A chord is three or more notes played together.**\n\nThe simplest chords are built by stacking intervals of a third:\n\n- **Major chord** = Root + Major 3rd + Minor 3rd (C-E-G) — bright, stable, happy\n- **Minor chord** = Root + Minor 3rd + Major 3rd (C-Eb-G) — darker, reflective\n- **Diminished chord** = Root + Minor 3rd + Minor 3rd (C-Eb-Gb) — tense, dramatic',
        media: [
          {
            type: 'image',
            url: '/assets/images/chord-types-diagram.svg',
            alt: 'Piano keyboard diagrams showing major, minor, and diminished chords',
          },
          {
            type: 'audio',
            url: '/assets/audio/chord-types-examples.mp3',
            alt: 'C major, C minor, and C diminished chords played in sequence',
            duration: 10,
          },
        ],
        layout: 'card',
        emotionalTone: 'focus',
      },
      mediaTypes: ['image', 'audio'],
      estimatedDurationS: 90,
      isReviewable: true,
      reviewFormat: 'flashcard',
      interleaveEligible: true,
      autoScorable: true,
      language: 'en',
    },
    {
      id: CI_ANA_PRACTICE_ID,
      itemType: 'practice',
      stage: 'analysis',
      hemisphereMode: 'LH',
      difficultyLevel: 3,
      bloomLevel: 'apply',
      noviceSuitable: true,
      advancedSuitable: false,
      topicId: TOPIC_HARMONY_ID,
      body: {
        title: 'Retrieval Practice',
        interactions: [
          {
            id: 'prac-1',
            type: 'free_recall',
            prompt: 'What is an interval?',
            correctAnswer: 'The distance between two notes',
            feedback: {
              correct: 'Got it! An interval is the distance between two notes, measured in semitones.',
              incorrect: 'An interval is the distance between two notes, measured in semitones.',
            },
            tags: ['intervals', 'definition'],
          },
          {
            id: 'prac-2',
            type: 'audio_recognition',
            prompt: 'Which interval is this?',
            media: {
              type: 'audio',
              url: '/assets/audio/perfect-fifth-test.mp3',
              alt: 'Piano playing a perfect fifth interval',
            },
            options: [
              { id: 'opt-a', text: 'Minor 2nd', isCorrect: false },
              { id: 'opt-b', text: 'Major 3rd', isCorrect: false },
              { id: 'opt-c', text: 'Perfect 5th', isCorrect: true },
              { id: 'opt-d', text: 'Octave', isCorrect: false },
            ],
            correctAnswer: 'opt-c',
            feedback: {
              correct: "That's the Perfect 5th—the wide, open, stable sound.",
              incorrect: 'Listen again for that wide, stable quality. This is a Perfect 5th (C to G).',
            },
            tags: ['intervals', 'audio-recognition', 'perfect-fifth'],
          },
          {
            id: 'prac-3',
            type: 'audio_recognition',
            prompt: 'What type of chord is this?',
            media: {
              type: 'audio',
              url: '/assets/audio/c-minor-chord-test.mp3',
              alt: 'C minor chord played on piano',
            },
            options: [
              { id: 'chord-maj', text: 'Major', isCorrect: false },
              { id: 'chord-min', text: 'Minor', isCorrect: true },
              { id: 'chord-dim', text: 'Diminished', isCorrect: false },
            ],
            correctAnswer: 'chord-min',
            feedback: {
              correct:
                "That's a minor chord—built from a minor 3rd on the bottom and a major 3rd on top.",
              incorrect: 'Listen for that darker, melancholic quality. This is a minor chord.',
            },
            tags: ['chords', 'audio-recognition', 'minor-chord'],
          },
        ],
        layout: 'card',
        emotionalTone: 'focus',
      },
      mediaTypes: ['audio'],
      estimatedDurationS: 150,
      isReviewable: true,
      reviewFormat: 'practice',
      interleaveEligible: true,
      autoScorable: true,
      language: 'en',
    },

    // --- RETURN stage ---
    {
      id: CI_RET_RECONNECT_ID,
      itemType: 'narrative',
      stage: 'return',
      hemisphereMode: 'RH',
      difficultyLevel: 2,
      bloomLevel: 'evaluate',
      noviceSuitable: true,
      advancedSuitable: true,
      topicId: TOPIC_HARMONY_ID,
      body: {
        title: 'The Living Whole',
        content:
          "Pythagoras discovered that simple ratios—2:1, 3:2, 4:3—create the intervals we call consonant. Every culture on Earth, throughout all of history, has independently discovered the same truth: the simpler the mathematical relationship between two frequencies, the more 'right' they sound together.\n\nThis isn't arbitrary. It's physics meeting neurology. And knowing this doesn't diminish the magic—it deepens it.",
        layout: 'card',
        emotionalTone: 'wonder',
      },
      mediaTypes: [],
      estimatedDurationS: 90,
      isReviewable: false,
      interleaveEligible: false,
      autoScorable: false,
      language: 'en',
    },
    {
      id: CI_RET_REFLECT_ID,
      itemType: 'reflection_prompt',
      stage: 'return',
      hemisphereMode: 'RH',
      difficultyLevel: 2,
      bloomLevel: 'evaluate',
      noviceSuitable: true,
      advancedSuitable: true,
      topicId: TOPIC_HARMONY_ID,
      body: {
        title: 'What Changed?',
        content:
          'You started this module by listening to two intervals and feeling the difference between stability and tension—without knowing why. Now you understand the structure beneath that feeling.',
        interactions: [
          {
            id: 'refl-1',
            type: 'reflection',
            prompt:
              'What surprised you most about what you learned? Did anything change about how you think about music?',
            feedback: {
              general: 'The best learning changes not just what we know, but how we see the world.',
            },
          },
        ],
        layout: 'card',
        emotionalTone: 'reflection',
      },
      mediaTypes: [],
      estimatedDurationS: 60,
      isReviewable: false,
      interleaveEligible: false,
      autoScorable: false,
      language: 'en',
    },
  ];

  for (const item of items) {
    await db
      .insert(schema.contentItems)
      .values(item)
      .onConflictDoUpdate({
        target: schema.contentItems.id,
        set: {
          body: item.body,
          itemType: item.itemType,
          stage: item.stage,
          updatedAt: sql`now()`,
        },
      });
  }

  console.log(`  ${items.length} content items across encounter / analysis / return stages`);
}

// ---------------------------------------------------------------------------
// 6. Content item <-> KC junction rows
// ---------------------------------------------------------------------------

async function seedContentItemKcs() {
  console.log('Seeding content item KC associations...');

  const links: (typeof schema.contentItemKcs.$inferInsert)[] = [
    // enc-hook introduces the concept of intervals at a felt level
    { contentItemId: CI_ENC_HOOK_ID, kcId: KC_CONSONANCE_ID },

    // enc-narrative: context for intervals + consonance
    { contentItemId: CI_ENC_NARRATIVE_ID, kcId: KC_INTERVALS_ID },
    { contentItemId: CI_ENC_NARRATIVE_ID, kcId: KC_CONSONANCE_ID },

    // ana-intervals: primary KC
    { contentItemId: CI_ANA_INTERVALS_ID, kcId: KC_INTERVALS_ID },

    // ana-consonance: primary KC
    { contentItemId: CI_ANA_CONSONANCE_ID, kcId: KC_CONSONANCE_ID },
    { contentItemId: CI_ANA_CONSONANCE_ID, kcId: KC_INTERVALS_ID },

    // ana-chords: covers chords + major/minor
    { contentItemId: CI_ANA_CHORDS_ID, kcId: KC_CHORDS_ID },
    { contentItemId: CI_ANA_CHORDS_ID, kcId: KC_MAJOR_CHORD_ID },
    { contentItemId: CI_ANA_CHORDS_ID, kcId: KC_MINOR_CHORD_ID },

    // ana-practice: tests all KCs
    { contentItemId: CI_ANA_PRACTICE_ID, kcId: KC_INTERVALS_ID },
    { contentItemId: CI_ANA_PRACTICE_ID, kcId: KC_CONSONANCE_ID },
    { contentItemId: CI_ANA_PRACTICE_ID, kcId: KC_CHORDS_ID },
    { contentItemId: CI_ANA_PRACTICE_ID, kcId: KC_MAJOR_CHORD_ID },
    { contentItemId: CI_ANA_PRACTICE_ID, kcId: KC_MINOR_CHORD_ID },

    // ret-reconnect / ret-reflect: integrative, covers all
    { contentItemId: CI_RET_RECONNECT_ID, kcId: KC_CONSONANCE_ID },
    { contentItemId: CI_RET_RECONNECT_ID, kcId: KC_INTERVALS_ID },
    { contentItemId: CI_RET_REFLECT_ID, kcId: KC_CHORDS_ID },
    { contentItemId: CI_RET_REFLECT_ID, kcId: KC_CONSONANCE_ID },
  ];

  for (const link of links) {
    await db
      .insert(schema.contentItemKcs)
      .values(link)
      .onConflictDoNothing();
  }

  console.log(`  ${links.length} content item ↔ KC links`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function seed() {
  console.log('=== Hemisphere dev seed ===\n');

  try {
    await seedAdminUser();
    await seedFsrsParameters();
    await seedTopics();
    await seedKnowledgeComponents();
    await seedContentItems();
    await seedContentItemKcs();

    console.log('\nSeed completed successfully.');
  } catch (err) {
    console.error('\nSeed failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

seed();
