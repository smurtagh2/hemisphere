# Content Validation System

The Hemisphere content validation system ensures all learning content adheres to the content schema, maintaining quality and consistency across the platform.

## Overview

The validation system provides:

- **Schema-based validation** using JSON Schema for YAML content files
- **CLI tool** with batch validation, watch mode, and CI integration
- **Git hooks** for pre-commit validation
- **GitHub Actions** integration for continuous validation
- **Detailed error reporting** with suggestions and context

## Quick Start

### Validate All Content

```bash
pnpm validate-content
```

### Watch Mode (Development)

```bash
pnpm validate-content:watch
```

### Validate Specific Files

```bash
pnpm validate-content content/topics/your-topic.yaml
```

## Content Schema

All content must conform to the schema defined in `content-schema.yaml`.

### Schema Version

Current version: **1.0**

Every content file must include:

```yaml
schemaVersion: '1.0'
```

### Main Structure

```yaml
schemaVersion: '1.0'
topics:
  - id: unique-topic-id        # Slug format: lowercase, hyphens
    version: 1.0.0              # Semantic version
    metadata:
      title: Topic Title
      summary: Brief description
      subject: Subject area
      template: Template type
      estimatedDuration: Minutes
      # ... more metadata
    learningObjectives:
      - id: obj-1
        objective: Learning goal
        bloom: Bloom's taxonomy level
    stages:
      encounter:                # Right hemisphere stage
        stage: encounter
        contentItems: [...]
      analysis:                 # Left hemisphere stage
        stage: analysis
        contentItems: [...]
      return:                   # Right hemisphere stage
        stage: return
        contentItems: [...]
```

For complete schema documentation, see:
- `content-schema.yaml` - Full JSON Schema definition
- `CONTENT-MODEL-SUMMARY.md` - Detailed content model documentation
- `content/README.md` - Content authoring guide

## CLI Reference

### Basic Usage

```bash
pnpm validate-content [OPTIONS] [FILES...]
```

### Options

| Option | Description |
|--------|-------------|
| `-h, --help` | Show help message |
| `-w, --watch` | Watch mode - validate on file changes |
| `-v, --verbose` | Detailed error information |
| `--ci` | CI mode - optimized for pipelines |
| `--git-staged` | Validate only staged files |
| `--pattern=PATTERN` | Custom glob pattern (default: `content/**/*.yaml`) |
| `--report=FORMAT` | Generate report: `json`, `text`, or `github` |

### Examples

#### Development Workflow

```bash
# Start watch mode in a terminal
pnpm validate-content:watch

# Edit content files
# Validation runs automatically on save
```

#### Batch Validation

```bash
# All content
pnpm validate-content

# Specific directory
pnpm validate-content --pattern="content/topics/**/*.yaml"

# Multiple specific files
pnpm validate-content content/topics/topic1.yaml content/topics/topic2.yaml
```

#### CI/CD Integration

```bash
# GitHub Actions compatible
pnpm validate-content:ci

# Generate JSON report
pnpm validate-content --report=json > validation-report.json

# Generate text report
pnpm validate-content --report=text > validation-report.txt
```

## Error Messages

### Understanding Validation Errors

Validation errors include:

1. **Location**: Path in the YAML file where the error occurred
2. **Error Type**: What validation rule failed
3. **Suggestion**: Helpful hint on how to fix it

Example:

```
❌ content/topics/example.yaml

  1. Location: /metadata
     Error: must have required property 'title'
     Suggestion: Missing required field: title

  2. Location: /stages/encounter/contentItems/0/type
     Error: must be equal to one of the allowed values
     Suggestion: Value must be one of: narrative, concept_card, ...
```

### Common Errors

#### Missing Required Field

```
Error: must have required property 'field_name'
Suggestion: Missing required field: field_name
```

**Fix**: Add the required field to your YAML file.

#### Invalid Enum Value

```
Error: must be equal to one of the allowed values
Suggestion: Value must be one of: option1, option2, option3
```

**Fix**: Use one of the allowed values from the suggestion.

#### Invalid Format

```
Error: must match format "uri"
Suggestion: Value must be a valid uri
```

**Fix**: Ensure URLs start with `http://`, `https://`, or are properly formatted paths.

#### Invalid Type

```
Error: must be number
Suggestion: Expected type number
```

**Fix**: Check the data type. Numbers should not be quoted in YAML.

#### Invalid Pattern

```
Error: must match pattern "^[a-z0-9-]+$"
Suggestion: Value must match pattern: ^[a-z0-9-]+$
```

**Fix**: Topic IDs must be lowercase with hyphens only (e.g., `harmony-intervals`).

### Verbose Mode

For more detailed error information:

```bash
pnpm validate-content --verbose
```

This shows:
- Error keyword/type
- Schema path
- Full validation parameters
- Data that caused the error

## Git Integration

### Pre-Commit Hook

The pre-commit hook automatically validates staged content files before commit.

#### How It Works

1. Hook detects staged `.yaml` files in `content/` directory
2. Runs validation on staged files only
3. Blocks commit if validation fails
4. Shows error details

#### Bypass Hook (Not Recommended)

```bash
git commit --no-verify
```

Only use this in exceptional cases. Always prefer fixing validation errors.

### Hook Configuration

The hook is integrated with the bd (beads) system at:
- Hook script: `scripts/git-hooks/pre-commit-content-validation.sh`
- Git hook: `.git/hooks/pre-commit`

The bd pre-commit hook automatically calls the validation hook.

## CI/CD Integration

### GitHub Actions

The project includes a GitHub Actions workflow that:
- Validates content on PRs and main branch pushes
- Runs when content or schema files change
- Comments on PRs with validation errors
- Uploads validation reports as artifacts

Workflow file: `.github/workflows/validate-content.yml`

#### Workflow Triggers

- Pull requests affecting content files
- Pushes to main branch affecting content files
- Manual workflow dispatch

#### Workflow Jobs

1. **validate**: Validates all content files
   - Installs dependencies
   - Runs validation in CI mode
   - Uploads reports as artifacts
   - Comments on PR if validation fails

2. **validate-schema**: Validates the schema file itself
   - Checks YAML syntax
   - Verifies schema version

### Other CI Systems

For other CI systems, use the CI mode:

```bash
# Exit code 0 = success, 1 = failure
pnpm validate-content:ci

# Or with custom pattern
pnpm validate-content --ci --pattern="content/**/*.yaml"
```

### Report Formats

#### JSON Report

```bash
pnpm validate-content --report=json > validation-report.json
```

Structure:

```json
{
  "summary": {
    "total": 10,
    "valid": 8,
    "invalid": 2,
    "timestamp": "2026-02-11T20:00:00Z",
    "duration": 125
  },
  "results": [
    {
      "file": "content/topics/example.yaml",
      "valid": false,
      "errors": [...],
      "timestamp": "2026-02-11T20:00:00Z"
    }
  ],
  "schemaVersion": "1.0"
}
```

#### GitHub Report

```bash
pnpm validate-content --report=github
```

Outputs GitHub Actions annotations:

```
::error file=content/topics/example.yaml::Location: Error message
```

#### Text Report

```bash
pnpm validate-content --report=text
```

Formatted text report with:
- Summary header
- Duration and timestamp
- Detailed error listing
- File-by-file breakdown

## Development Workflow

### Recommended Setup

1. **Terminal 1**: Watch mode

   ```bash
   pnpm validate-content:watch
   ```

2. **Terminal 2**: Development server

   ```bash
   pnpm dev
   ```

3. **Editor**: Edit content files

Watch mode provides instant feedback as you save files.

### Content Authoring Process

1. **Create/Edit Content**: Write or modify YAML files in `content/`

2. **Validate Locally**:
   ```bash
   pnpm validate-content
   ```

3. **Fix Errors**: Address any validation issues

4. **Test Content**: Preview in the app (if applicable)

5. **Commit**: Pre-commit hook validates automatically
   ```bash
   git add content/topics/my-topic.yaml
   git commit -m "Add new topic: My Topic"
   ```

6. **Push**: CI validates on PR
   ```bash
   git push
   ```

### Tips for Content Authors

- Keep watch mode running while editing
- Use verbose mode to debug complex errors
- Validate frequently (every few edits)
- Reference example content files
- Check schema documentation for field requirements

## Troubleshooting

### Schema Not Found

**Error**: `Schema file not found: content-schema.yaml`

**Solution**: Run from project root directory:

```bash
cd /path/to/hemisphere
pnpm validate-content
```

### No Content Files Found

**Error**: `No content files found matching: content/**/*.yaml`

**Solutions**:

1. Check files are in `content/` directory
2. Check file extension is `.yaml` (not `.yml`)
3. Use custom pattern if files are elsewhere:
   ```bash
   pnpm validate-content --pattern="my-content/**/*.yaml"
   ```

### Watch Mode Not Working

**Solutions**:

1. Ensure dependencies are installed:
   ```bash
   pnpm install
   ```

2. Check file permissions

3. Try re-running:
   ```bash
   pnpm validate-content:watch
   ```

### Git Hook Not Running

**Solutions**:

1. Ensure hook is executable:
   ```bash
   chmod +x scripts/git-hooks/pre-commit-content-validation.sh
   chmod +x .git/hooks/pre-commit
   ```

2. Check bd is installed:
   ```bash
   bd --version
   ```

3. Re-initialize hooks:
   ```bash
   bd init
   ```

### Validation Passes Locally But Fails in CI

**Causes**:

1. Different files staged vs. committed
2. Uncommitted schema changes
3. Different dependency versions

**Solutions**:

1. Ensure schema is committed
2. Run exact CI command locally:
   ```bash
   pnpm validate-content:ci
   ```
3. Check dependency lockfile is committed

## Performance

### Optimization Tips

- **Incremental Validation**: Use `--git-staged` for pre-commit
- **Watch Mode**: More efficient than repeated runs
- **Pattern Matching**: Validate specific subdirectories when possible
- **CI Caching**: GitHub Actions caches dependencies for faster runs

### Benchmarks

Typical validation times:
- Single file: ~30-50ms
- 10 files: ~200-400ms
- 100 files: ~1-2s

Watch mode adds ~10-20ms overhead per file change.

## Schema Updates

When updating the content schema:

1. **Update Schema**: Modify `content-schema.yaml`

2. **Update Version**: Increment schema version if breaking changes

3. **Test Validation**: Run against all content
   ```bash
   pnpm validate-content
   ```

4. **Update Documentation**: Update this file and content guides

5. **Migrate Content**: Update existing content files if needed

6. **Commit Together**: Schema and content changes together

## API Reference

For programmatic use, see `scripts/validate-content.ts`:

```typescript
// Load and validate a single file
function validateFile(schemaPath: string, contentPath: string): ValidationResult

// Format errors for display
function formatErrors(errors: any[], verbose?: boolean): string

// Generate validation report
function generateReport(
  results: ValidationResult[],
  format: 'json' | 'text' | 'github',
  duration: number
): string
```

## Contributing

When contributing to the validation system:

1. **Test Changes**: Test with various content files
2. **Update CLI**: Add new options if needed
3. **Update Docs**: Update this file and scripts/README.md
4. **Add Examples**: Include usage examples
5. **Test CI**: Test GitHub Actions workflow changes

## Resources

- **Schema**: `content-schema.yaml`
- **CLI Tool**: `scripts/validate-content.ts`
- **Git Hook**: `scripts/git-hooks/pre-commit-content-validation.sh`
- **GitHub Workflow**: `.github/workflows/validate-content.yml`
- **Examples**: `content/examples/`
- **Content Guide**: `content/README.md`
- **Model Documentation**: `CONTENT-MODEL-SUMMARY.md`

## Support

For validation issues:

1. Check this documentation
2. Run with `--verbose` flag for details
3. Check example content files
4. Review schema documentation
5. Check GitHub Actions logs for CI failures
