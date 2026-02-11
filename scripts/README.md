# Hemisphere Scripts

This directory contains utility scripts for the Hemisphere learning platform.

## Content Validation CLI

The content validation CLI (`validate-content.ts`) validates YAML content files against the Hemisphere content schema.

### Features

- **Batch Validation**: Validate multiple files at once
- **Watch Mode**: Continuously validate files as they change during development
- **Git Integration**: Validate only staged files for pre-commit hooks
- **CI/CD Support**: Optimized output for continuous integration pipelines
- **Detailed Error Reports**: Comprehensive error messages with suggestions
- **Multiple Report Formats**: JSON, text, and GitHub Actions compatible output

### Usage

#### Basic Validation

Validate all content files:

```bash
pnpm validate-content
```

Validate specific files:

```bash
pnpm validate-content content/topics/harmony.yaml
pnpm validate-content content/examples/*.yaml
```

#### Watch Mode

Watch for file changes during development:

```bash
pnpm validate-content:watch
# or
pnpm validate-content --watch
```

#### CI/CD Mode

For GitHub Actions and other CI pipelines:

```bash
pnpm validate-content:ci
# or
pnpm validate-content --ci --report=github
```

#### Git Staged Files

Validate only files staged for commit:

```bash
pnpm validate-content --git-staged
```

### CLI Options

```
-h, --help              Show help message
-w, --watch             Watch mode - continuously validate on file changes
-v, --verbose           Verbose output with detailed error information
--ci                    CI mode - optimized output for CI/CD pipelines
--git-staged            Validate only git staged files (for pre-commit hooks)
--pattern=PATTERN       Custom glob pattern for files (default: content/**/*.yaml)
--report=FORMAT         Generate report (json|text|github)
```

### Error Messages

The validation CLI provides detailed error messages with:

- **Location**: Where in the file the error occurred
- **Error Type**: What kind of validation error it is
- **Suggestions**: Helpful hints on how to fix the error

Example error output:

```
❌ content/topics/example.yaml

  1. Location: /metadata
     Error: must have required property 'title'
     Suggestion: Missing required field: title

  2. Location: /stages/encounter/contentItems/0/type
     Error: must be equal to one of the allowed values
     Suggestion: Value must be one of: narrative, concept_card, visual_overview, spatial_map, activity, practice, reflection_prompt, transition
```

## Git Hooks

### Pre-Commit Content Validation

The pre-commit hook automatically validates content files before they are committed.

#### Installation

The hook is already integrated with the bd (beads) hook system. If you need to set it up manually:

```bash
# The hook script is at:
scripts/git-hooks/pre-commit-content-validation.sh

# It's automatically called by the bd pre-commit hook
# No manual installation needed if using bd
```

#### How It Works

1. When you run `git commit`, the pre-commit hook is triggered
2. The hook identifies all staged YAML files in the `content/` directory
3. It runs validation against the content schema
4. If validation passes, the commit proceeds
5. If validation fails, the commit is blocked and errors are displayed

#### Skipping Validation

If you need to bypass validation (not recommended):

```bash
git commit --no-verify
```

### Manual Hook Integration

If not using bd, you can integrate the validation into your pre-commit hook:

```bash
# Add to .git/hooks/pre-commit
./scripts/git-hooks/pre-commit-content-validation.sh || exit 1
```

## CI/CD Integration

### GitHub Actions

Add to your GitHub Actions workflow:

```yaml
- name: Validate Content
  run: pnpm validate-content:ci
```

The GitHub Actions compatible output will automatically annotate files with errors.

### Other CI Systems

For other CI systems, use the JSON report format:

```bash
pnpm validate-content --report=json > validation-report.json
```

## Development Workflow

Recommended workflow for content authors:

1. **Start Watch Mode**: Run `pnpm validate-content:watch` in a terminal
2. **Edit Content**: Make changes to YAML files
3. **See Instant Feedback**: Validation runs automatically on save
4. **Commit Changes**: Pre-commit hook validates before committing

## Schema

Content files are validated against `content-schema.yaml` in the project root.

Schema version: 1.0

For schema documentation, see:
- `content-schema.yaml` - Full JSON Schema definition
- `CONTENT-MODEL-SUMMARY.md` - Human-readable content model documentation
- `content/README.md` - Content authoring guide

## Troubleshooting

### "Schema file not found"

Make sure you're running the script from the project root directory:

```bash
cd /path/to/hemisphere
pnpm validate-content
```

### "No content files found"

Check that your content files are in the `content/` directory and have `.yaml` extension.

Use a custom pattern if your files are elsewhere:

```bash
pnpm validate-content --pattern="my-content/**/*.yaml"
```

### Watch mode not working

Make sure `chokidar` is installed:

```bash
pnpm install
```

## Contributing

When adding new validation features:

1. Update `validate-content.ts` with the new functionality
2. Add corresponding CLI options and help text
3. Update this README with usage examples
4. Add tests if applicable
5. Update the content schema if needed
