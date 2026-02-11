#!/usr/bin/env tsx
/**
 * Hemisphere Content Validation CLI
 *
 * A comprehensive CLI tool for validating YAML content files against
 * the Hemisphere content schema with support for:
 * - Batch validation of multiple files
 * - Watch mode for development
 * - Detailed error reporting and suggestions
 * - CI/CD integration
 * - Git hook integration
 *
 * @example
 * # Validate all content files
 * pnpm validate-content
 *
 * # Validate specific files
 * pnpm validate-content content/topics/harmony.yaml
 *
 * # Watch mode for development
 * pnpm validate-content --watch
 *
 * # CI mode (non-interactive, exits with code)
 * pnpm validate-content --ci
 *
 * # Generate validation report
 * pnpm validate-content --report=json
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

// CLI configuration
interface CLIOptions {
  files?: string[];
  watch?: boolean;
  ci?: boolean;
  report?: 'json' | 'text' | 'github';
  verbose?: boolean;
  pattern?: string;
  gitStaged?: boolean;
}

interface ValidationResult {
  file: string;
  valid: boolean;
  errors?: any[];
  parseError?: string;
  timestamp: string;
}

interface ValidationReport {
  summary: {
    total: number;
    valid: number;
    invalid: number;
    timestamp: string;
    duration: number;
  };
  results: ValidationResult[];
  schemaVersion?: string;
}

/**
 * Parse command-line arguments
 */
function parseArgs(args: string[]): CLIOptions {
  const options: CLIOptions = {
    files: [],
    watch: false,
    ci: false,
    verbose: false,
    gitStaged: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--watch' || arg === '-w') {
      options.watch = true;
    } else if (arg === '--ci') {
      options.ci = true;
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
    } else if (arg === '--git-staged') {
      options.gitStaged = true;
    } else if (arg.startsWith('--report=')) {
      const format = arg.split('=')[1] as 'json' | 'text' | 'github';
      if (['json', 'text', 'github'].includes(format)) {
        options.report = format;
      }
    } else if (arg.startsWith('--pattern=')) {
      options.pattern = arg.split('=')[1];
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else if (!arg.startsWith('-')) {
      options.files?.push(arg);
    }
  }

  return options;
}

/**
 * Print help message
 */
function printHelp(): void {
  console.log(`
Hemisphere Content Validation CLI

USAGE:
  pnpm validate-content [OPTIONS] [FILES...]

OPTIONS:
  -h, --help              Show this help message
  -w, --watch             Watch mode - continuously validate on file changes
  -v, --verbose           Verbose output with detailed error information
  --ci                    CI mode - optimized output for CI/CD pipelines
  --git-staged            Validate only git staged files (for pre-commit hooks)
  --pattern=PATTERN       Custom glob pattern for files (default: content/**/*.yaml)
  --report=FORMAT         Generate report (json|text|github)

EXAMPLES:
  # Validate all content files
  pnpm validate-content

  # Validate specific files
  pnpm validate-content content/topics/harmony.yaml

  # Watch mode for development
  pnpm validate-content --watch

  # CI mode with JSON report
  pnpm validate-content --ci --report=json

  # Validate only staged files (for git hooks)
  pnpm validate-content --git-staged

SCHEMA:
  Schema location: content-schema.yaml
  Schema version: 1.0
  `);
}

/**
 * Get list of git staged files
 */
async function getGitStagedFiles(): Promise<string[]> {
  const { execSync } = await import('child_process');

  try {
    const output = execSync('git diff --cached --name-only --diff-filter=ACM', {
      encoding: 'utf8',
      cwd: process.cwd(),
    });

    return output
      .split('\n')
      .filter(file => file.endsWith('.yaml') || file.endsWith('.yml'))
      .filter(file => file.startsWith('content/'))
      .map(file => path.join(process.cwd(), file));
  } catch (error) {
    return [];
  }
}

/**
 * Load and parse YAML file
 */
function loadYaml(filePath: string): any {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return yaml.load(content);
  } catch (error) {
    throw new Error(`YAML parse error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Validate a single content file
 */
function validateFile(schemaPath: string, contentPath: string): ValidationResult {
  const timestamp = new Date().toISOString();

  try {
    const schema = loadYaml(schemaPath);
    const content = loadYaml(contentPath);

    const validate = ajv.compile(schema);
    const valid = validate(content);

    return {
      file: contentPath,
      valid,
      errors: valid ? undefined : validate.errors,
      timestamp,
    };
  } catch (error) {
    return {
      file: contentPath,
      valid: false,
      parseError: error instanceof Error ? error.message : String(error),
      timestamp,
    };
  }
}

/**
 * Format validation errors with helpful suggestions
 */
function formatErrors(errors: any[], verbose: boolean = false): string {
  const formatted = errors.map((err, index) => {
    const location = err.instancePath || '/';
    const message = err.message || 'Unknown error';
    const keyword = err.keyword;

    let output = `  ${index + 1}. Location: ${location}\n`;
    output += `     Error: ${message}\n`;

    if (verbose) {
      output += `     Type: ${keyword}\n`;
      if (err.params && Object.keys(err.params).length > 0) {
        output += `     Details: ${JSON.stringify(err.params, null, 2).split('\n').join('\n     ')}\n`;
      }
    }

    // Add helpful suggestions based on error type
    const suggestion = getErrorSuggestion(err);
    if (suggestion) {
      output += `     Suggestion: ${suggestion}\n`;
    }

    return output;
  });

  return formatted.join('\n');
}

/**
 * Get helpful suggestions based on validation error
 */
function getErrorSuggestion(error: any): string | null {
  const { keyword, params } = error;

  switch (keyword) {
    case 'required':
      return `Missing required field: ${params.missingProperty}`;
    case 'enum':
      return `Value must be one of: ${params.allowedValues?.join(', ')}`;
    case 'type':
      return `Expected type ${params.type}`;
    case 'minItems':
      return `Array must have at least ${params.limit} items`;
    case 'pattern':
      return `Value must match pattern: ${params.pattern}`;
    case 'format':
      return `Value must be a valid ${params.format}`;
    case 'additionalProperties':
      return `Unexpected property: ${params.additionalProperty}`;
    default:
      return null;
  }
}

/**
 * Generate validation report
 */
function generateReport(
  results: ValidationResult[],
  format: 'json' | 'text' | 'github',
  duration: number,
  schemaVersion?: string
): string {
  const validCount = results.filter(r => r.valid).length;
  const invalidCount = results.length - validCount;

  const report: ValidationReport = {
    summary: {
      total: results.length,
      valid: validCount,
      invalid: invalidCount,
      timestamp: new Date().toISOString(),
      duration,
    },
    results,
    schemaVersion,
  };

  switch (format) {
    case 'json':
      return JSON.stringify(report, null, 2);

    case 'github':
      return generateGitHubReport(report);

    case 'text':
    default:
      return generateTextReport(report);
  }
}

/**
 * Generate GitHub Actions compatible report
 */
function generateGitHubReport(report: ValidationReport): string {
  let output = '';

  for (const result of report.results) {
    if (!result.valid) {
      const file = path.relative(process.cwd(), result.file);

      if (result.parseError) {
        output += `::error file=${file}::YAML Parse Error: ${result.parseError}\n`;
      } else if (result.errors) {
        for (const error of result.errors) {
          const location = error.instancePath || 'root';
          const message = error.message || 'Validation error';
          output += `::error file=${file},title=Schema Validation::${location}: ${message}\n`;
        }
      }
    }
  }

  if (report.summary.invalid > 0) {
    output += `::error::Content validation failed: ${report.summary.invalid} file(s) invalid\n`;
  }

  return output;
}

/**
 * Generate text report
 */
function generateTextReport(report: ValidationReport): string {
  let output = '\n';
  output += '='.repeat(70) + '\n';
  output += 'HEMISPHERE CONTENT VALIDATION REPORT\n';
  output += '='.repeat(70) + '\n\n';
  output += `Timestamp: ${report.summary.timestamp}\n`;
  output += `Duration:  ${report.summary.duration}ms\n`;
  if (report.schemaVersion) {
    output += `Schema:    v${report.schemaVersion}\n`;
  }
  output += '\n';
  output += `Total Files:    ${report.summary.total}\n`;
  output += `Valid:          ${report.summary.valid}\n`;
  output += `Invalid:        ${report.summary.invalid}\n`;
  output += '\n';

  if (report.summary.invalid > 0) {
    output += 'FAILED FILES:\n';
    output += '-'.repeat(70) + '\n';

    for (const result of report.results) {
      if (!result.valid) {
        const file = path.relative(process.cwd(), result.file);
        output += `\n${file}\n`;

        if (result.parseError) {
          output += `  Parse Error: ${result.parseError}\n`;
        } else if (result.errors) {
          output += formatErrors(result.errors, true);
        }
      }
    }
  }

  output += '\n' + '='.repeat(70) + '\n';
  return output;
}

/**
 * Watch files for changes
 */
async function watchMode(options: CLIOptions): Promise<void> {
  const chokidar = await import('chokidar');
  const pattern = options.pattern || 'content/**/*.yaml';

  console.log(`\n👀 Watching ${pattern} for changes...\n`);
  console.log('Press Ctrl+C to stop.\n');

  const watcher = chokidar.watch(pattern, {
    ignored: /(^|[\/\\])\../,
    persistent: true,
    ignoreInitial: false,
  });

  const schemaPath = path.join(process.cwd(), 'content-schema.yaml');

  watcher.on('change', (filePath: string) => {
    console.log(`\n📝 File changed: ${path.relative(process.cwd(), filePath)}`);
    const result = validateFile(schemaPath, filePath);

    if (result.valid) {
      console.log(`✅ Valid\n`);
    } else {
      console.log(`❌ Invalid\n`);
      if (result.parseError) {
        console.log(`Parse Error: ${result.parseError}\n`);
      } else if (result.errors) {
        console.log(formatErrors(result.errors, options.verbose));
      }
    }
  });

  watcher.on('add', (filePath: string) => {
    console.log(`\n➕ New file: ${path.relative(process.cwd(), filePath)}`);
    const result = validateFile(schemaPath, filePath);

    if (result.valid) {
      console.log(`✅ Valid\n`);
    } else {
      console.log(`❌ Invalid\n`);
      if (result.parseError) {
        console.log(`Parse Error: ${result.parseError}\n`);
      } else if (result.errors) {
        console.log(formatErrors(result.errors, options.verbose));
      }
    }
  });
}

/**
 * Main validation function
 */
async function main() {
  const startTime = Date.now();
  const args = process.argv.slice(2);
  const options = parseArgs(args);
  const schemaPath = path.join(process.cwd(), 'content-schema.yaml');

  // Check if schema exists
  if (!fs.existsSync(schemaPath)) {
    console.error('❌ Schema file not found:', schemaPath);
    console.error('   Run this script from the project root directory.');
    process.exit(1);
  }

  // Watch mode
  if (options.watch) {
    await watchMode(options);
    return;
  }

  let contentFiles: string[] = [];

  // Determine which files to validate
  if (options.gitStaged) {
    contentFiles = await getGitStagedFiles();

    if (contentFiles.length === 0) {
      if (!options.ci) {
        console.log('ℹ️  No staged content files to validate.');
      }
      process.exit(0);
    }
  } else if (options.files && options.files.length > 0) {
    contentFiles = options.files;
  } else {
    const pattern = options.pattern || 'content/**/*.yaml';
    contentFiles = await glob(pattern, {
      ignore: ['**/node_modules/**'],
      absolute: true,
    });

    if (contentFiles.length === 0) {
      if (!options.ci) {
        console.log('ℹ️  No content files found matching:', pattern);
      }
      process.exit(0);
    }
  }

  // Validate files
  if (!options.ci) {
    console.log(`\n🔍 Validating ${contentFiles.length} content file(s)...\n`);
  }

  const results: ValidationResult[] = [];

  for (const file of contentFiles) {
    if (!fs.existsSync(file)) {
      results.push({
        file,
        valid: false,
        parseError: 'File not found',
        timestamp: new Date().toISOString(),
      });
      continue;
    }

    const result = validateFile(schemaPath, file);
    results.push(result);

    if (!options.ci && !options.report) {
      const relPath = path.relative(process.cwd(), result.file);

      if (result.valid) {
        console.log(`✅ ${relPath}`);
      } else {
        console.log(`❌ ${relPath}`);

        if (result.parseError) {
          console.log(`   Parse Error: ${result.parseError}\n`);
        } else if (result.errors) {
          console.log(formatErrors(result.errors, options.verbose));
          console.log('');
        }
      }
    }
  }

  const duration = Date.now() - startTime;
  const validCount = results.filter(r => r.valid).length;
  const invalidCount = results.length - validCount;

  // Load schema version if available
  let schemaVersion: string | undefined;
  try {
    const schema = loadYaml(schemaPath);
    schemaVersion = schema.schemaVersion;
  } catch (error) {
    // Ignore
  }

  // Generate report if requested
  if (options.report) {
    const report = generateReport(results, options.report, duration, schemaVersion);
    console.log(report);
  } else if (!options.ci) {
    // Print summary
    console.log('─'.repeat(60));
    console.log(`\n📊 Validation Summary:`);
    console.log(`   ✅ Valid:   ${validCount}`);
    console.log(`   ❌ Invalid: ${invalidCount}`);
    console.log(`   📁 Total:   ${results.length}`);
    console.log(`   ⏱️  Time:    ${duration}ms\n`);
  }

  if (invalidCount > 0) {
    if (options.ci) {
      console.error(`Content validation failed: ${invalidCount} file(s) invalid`);
    } else {
      console.error('❌ Validation failed. Please fix the errors above.\n');
    }
    process.exit(1);
  } else {
    if (!options.ci && !options.report) {
      console.log('✅ All content files are valid!\n');
    }
    process.exit(0);
  }
}

main().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
