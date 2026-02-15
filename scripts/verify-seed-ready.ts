#!/usr/bin/env tsx
/**
 * Hemisphere Seed Readiness Checker
 *
 * Verifies that all prerequisites for running `pnpm db:seed` are in place:
 *   1. Content YAML files exist and can be parsed (structural validity)
 *   2. DATABASE_URL environment variable is set
 *
 * Does NOT require a live database connection to run.
 * Does NOT apply the full schema validation (use `pnpm validate-content` for that).
 *
 * Usage:
 *   pnpm tsx scripts/verify-seed-ready.ts
 *
 * Exit codes:
 *   0  — all checks pass, ready to seed
 *   1  — one or more checks failed
 */

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { glob } from 'glob';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const CONTENT_DIR = path.resolve(process.cwd(), 'content/topics');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pass(msg: string) {
  console.log(`  [PASS]  ${msg}`);
}

function fail(msg: string) {
  console.error(`  [FAIL]  ${msg}`);
}

function info(msg: string) {
  console.log(`         ${msg}`);
}

// ---------------------------------------------------------------------------
// Check 1: YAML files exist and are parseable
// ---------------------------------------------------------------------------

async function checkContentFiles(): Promise<boolean> {
  console.log('\nCheck 1: Content YAML files');

  const pattern = path.join(CONTENT_DIR, '**/*.yaml').replace(/\\/g, '/');
  let files: string[];
  try {
    files = await glob(pattern);
  } catch (err) {
    fail(`Failed to scan ${CONTENT_DIR}: ${err}`);
    return false;
  }

  if (files.length === 0) {
    fail(`No YAML files found in ${CONTENT_DIR}`);
    info('Create content files under content/topics/ before seeding.');
    return false;
  }

  let allParseable = true;
  for (const file of files) {
    const relative = path.relative(process.cwd(), file);
    try {
      const raw = fs.readFileSync(file, 'utf8');
      const doc = yaml.load(raw);
      if (!doc || typeof doc !== 'object') {
        fail(`${relative} — parsed to non-object (empty or invalid)`);
        allParseable = false;
        continue;
      }
      pass(`${relative}`);
    } catch (err) {
      fail(`${relative} — YAML parse error: ${err}`);
      allParseable = false;
    }
  }

  if (allParseable) {
    info(`${files.length} file(s) parsed successfully.`);
  } else {
    info('Fix YAML parse errors before running db:seed.');
    info('Run `pnpm validate-content` for full schema validation.');
  }

  return allParseable;
}

// ---------------------------------------------------------------------------
// Check 2: DATABASE_URL is set
// ---------------------------------------------------------------------------

function checkDatabaseUrl(): boolean {
  console.log('\nCheck 2: DATABASE_URL environment variable');

  const url = process.env.DATABASE_URL;
  if (!url) {
    fail('DATABASE_URL is not set.');
    info('Set DATABASE_URL before running db:seed, e.g.:');
    info('  export DATABASE_URL="postgresql://user:password@localhost:5432/hemisphere"');
    info('  pnpm db:seed');
    return false;
  }

  // Basic sanity check: must start with postgres:// or postgresql://
  if (!url.startsWith('postgres://') && !url.startsWith('postgresql://')) {
    fail(`DATABASE_URL does not look like a PostgreSQL connection string: "${url.slice(0, 40)}..."`);
    info('Expected format: postgresql://user:password@host:port/database');
    return false;
  }

  pass(`DATABASE_URL is set (${url.replace(/:[^:@]*@/, ':***@')})`);
  return true;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('Hemisphere Seed Readiness Check');
  console.log('================================');

  const [yamlOk, dbUrlOk] = await Promise.all([
    checkContentFiles(),
    Promise.resolve(checkDatabaseUrl()),
  ]);

  console.log('\nSummary');
  console.log('-------');

  const allOk = yamlOk && dbUrlOk;
  if (allOk) {
    console.log('All checks passed. Ready to seed.\n');
    console.log('To run the seed:');
    console.log('  pnpm db:seed');
    console.log('\nFor full schema validation first:');
    console.log('  pnpm validate-content');
  } else {
    console.error('\nOne or more checks failed. Fix the issues above before seeding.\n');
    console.error('Useful commands:');
    console.error('  pnpm validate-content          # validate YAML schemas');
    console.error('  pnpm db:migrate                # run pending DB migrations first');
    console.error('  pnpm db:seed                   # seed after all checks pass');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
