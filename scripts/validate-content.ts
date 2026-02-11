#!/usr/bin/env tsx
/**
 * Content Validation Script
 * Validates YAML content files against the Hemisphere content schema
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { glob } from 'glob';

const ajv = new Ajv({
  allErrors: true,
  verbose: true,
  strict: false,
});
addFormats(ajv);

interface ValidationResult {
  file: string;
  valid: boolean;
  errors?: any[];
}

/**
 * Load and parse YAML file
 */
function loadYaml(filePath: string): any {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return yaml.load(content);
  } catch (error) {
    console.error(`❌ Error loading ${filePath}:`, error);
    process.exit(1);
  }
}

/**
 * Validate a single content file
 */
function validateFile(schemaPath: string, contentPath: string): ValidationResult {
  const schema = loadYaml(schemaPath);
  const content = loadYaml(contentPath);

  const validate = ajv.compile(schema);
  const valid = validate(content);

  return {
    file: contentPath,
    valid,
    errors: valid ? undefined : validate.errors,
  };
}

/**
 * Format validation errors for display
 */
function formatErrors(errors: any[]): string {
  return errors.map(err => {
    const path = err.instancePath || 'root';
    const message = err.message || 'Unknown error';
    const params = err.params ? JSON.stringify(err.params) : '';
    return `  • ${path}: ${message} ${params}`;
  }).join('\n');
}

/**
 * Main validation function
 */
async function main() {
  const args = process.argv.slice(2);
  const schemaPath = path.join(process.cwd(), 'content-schema.yaml');

  // Check if schema exists
  if (!fs.existsSync(schemaPath)) {
    console.error('❌ Schema file not found:', schemaPath);
    console.error('   Run this script from the project root directory.');
    process.exit(1);
  }

  let contentFiles: string[] = [];

  if (args.length > 0) {
    // Validate specific files provided as arguments
    contentFiles = args;
  } else {
    // Validate all YAML files in content/ directory
    const pattern = 'content/**/*.yaml';
    contentFiles = await glob(pattern, {
      ignore: ['**/node_modules/**'],
      absolute: true
    });

    if (contentFiles.length === 0) {
      console.log('ℹ️  No content files found matching:', pattern);
      process.exit(0);
    }
  }

  console.log(`\n🔍 Validating ${contentFiles.length} content file(s) against schema...\n`);

  const results: ValidationResult[] = [];
  let validCount = 0;
  let invalidCount = 0;

  for (const file of contentFiles) {
    if (!fs.existsSync(file)) {
      console.error(`❌ File not found: ${file}`);
      invalidCount++;
      continue;
    }

    const result = validateFile(schemaPath, file);
    results.push(result);

    if (result.valid) {
      validCount++;
      console.log(`✅ ${path.relative(process.cwd(), result.file)}`);
    } else {
      invalidCount++;
      console.log(`❌ ${path.relative(process.cwd(), result.file)}`);
      if (result.errors) {
        console.log(formatErrors(result.errors));
        console.log('');
      }
    }
  }

  console.log('\n' + '─'.repeat(60));
  console.log(`\n📊 Validation Summary:`);
  console.log(`   ✅ Valid:   ${validCount}`);
  console.log(`   ❌ Invalid: ${invalidCount}`);
  console.log(`   📁 Total:   ${results.length}\n`);

  if (invalidCount > 0) {
    console.error('❌ Validation failed. Please fix the errors above.\n');
    process.exit(1);
  } else {
    console.log('✅ All content files are valid!\n');
    process.exit(0);
  }
}

main().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
