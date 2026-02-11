#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const contentDir = path.join(process.cwd(), 'docs', 'content');

function fail(message) {
  console.error(`content validation failed: ${message}`);
  process.exit(1);
}

if (!fs.existsSync(contentDir)) {
  fail(`missing content directory: ${contentDir}`);
}

const files = fs
  .readdirSync(contentDir)
  .filter((file) => file.endsWith('.md'))
  .sort();

if (files.length === 0) {
  fail('no markdown content files found in docs/content');
}

for (const file of files) {
  const fullPath = path.join(contentDir, file);
  const text = fs.readFileSync(fullPath, 'utf8');

  if (text.trim().length === 0) {
    fail(`${file} is empty`);
  }

  if (!text.includes('# ')) {
    fail(`${file} must include at least one level-1 heading`);
  }

  if (!text.includes('## ')) {
    fail(`${file} must include at least one level-2 heading`);
  }
}

console.log(`content validation passed (${files.length} file(s))`);
