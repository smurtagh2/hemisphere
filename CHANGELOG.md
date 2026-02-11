# Changelog

All notable changes to the Hemisphere project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

#### Content Validation System (2026-02-11)

- **Content Validation CLI** - Comprehensive command-line tool for validating YAML content files
  - Batch validation of multiple files
  - Watch mode for continuous validation during development
  - Git integration for validating only staged files
  - CI/CD mode with optimized output
  - Multiple report formats: JSON, text, and GitHub Actions compatible
  - Detailed error messages with helpful suggestions
  - Verbose mode for debugging

- **Git Hooks Integration**
  - Pre-commit hook for automatic content validation
  - Validates staged content files before commit
  - Prevents invalid content from being committed
  - Integrates with bd (beads) hook system

- **GitHub Actions Workflow**
  - Automatic validation on pull requests
  - Validates content on pushes to main branch
  - Comments on PRs with validation errors
  - Uploads validation reports as artifacts
  - Schema validation job

- **Documentation**
  - Comprehensive validation system documentation (`VALIDATION.md`)
  - Scripts documentation with usage examples (`scripts/README.md`)
  - CLI help system with detailed examples

- **NPM Scripts**
  - `validate-content` - Validate all content files
  - `validate-content:watch` - Watch mode for development
  - `validate-content:ci` - CI mode with GitHub Actions format

### Technical Details

- Uses Ajv 8.x for JSON Schema validation
- Supports YAML and YML file extensions
- Validates against `content-schema.yaml` v1.0
- File watching powered by chokidar
- Pattern matching with glob
- TypeScript implementation with tsx runtime

### Dependencies Added

- `ajv@^8.17.1` - JSON Schema validator
- `ajv-formats@^3.0.1` - Format validation for Ajv
- `chokidar@^4.0.3` - File watching
- `glob@^11.0.1` - File pattern matching
- `js-yaml@^4.1.0` - YAML parsing
- `tsx@^4.19.2` - TypeScript execution
- `@types/node@^22.10.5` - Node.js type definitions

### Files Added

- `scripts/validate-content.ts` - Main validation CLI tool
- `scripts/git-hooks/pre-commit-content-validation.sh` - Pre-commit hook script
- `scripts/README.md` - Scripts documentation
- `.github/workflows/validate-content.yml` - GitHub Actions workflow
- `VALIDATION.md` - Validation system documentation
- `CHANGELOG.md` - Project changelog

### Files Modified

- `package.json` - Added validation scripts and dependencies
- `.git/hooks/pre-commit` - Integrated with bd hook system (existing)

## [0.1.0] - 2026-02-11

### Added

- Initial project setup with Turborepo
- Content schema definition (v1.0)
- Database schema with Drizzle ORM
- Hono API workspace
- Basic project structure and documentation

### Project Structure

- `apps/web/` - Next.js web application
- `packages/db/` - Database schema and client
- `packages/shared/` - Shared utilities
- `content/` - Learning content directory
- `scripts/` - Utility scripts

[Unreleased]: https://github.com/yourusername/hemisphere/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/yourusername/hemisphere/releases/tag/v0.1.0
