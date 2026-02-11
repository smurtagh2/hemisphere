# Hemisphere

A learning platform based on McGilchrist's hemisphere theory, implementing the RH-LH-RH (Right Hemisphere → Left Hemisphere → Right Hemisphere) learning loop for deep, integrated learning experiences.

## Overview

Hemisphere is designed to facilitate natural, brain-aligned learning by structuring content around the three-stage learning loop:

1. **Encounter (RH)**: Immersive, contextual introduction with emotional engagement
2. **Analysis (LH)**: Focused, structured exploration and practice
3. **Return (RH)**: Creative synthesis and contextual application

## Project Structure

```
hemisphere/
├── apps/
│   └── web/              # Next.js web application
├── packages/
│   ├── db/               # Database schema (Drizzle ORM)
│   └── shared/           # Shared utilities
├── content/              # Learning content (YAML)
│   ├── examples/         # Example content files
│   └── topics/           # Production topics
├── scripts/              # Utility scripts
│   ├── validate-content.ts
│   └── git-hooks/        # Git hook scripts
├── .github/
│   └── workflows/        # GitHub Actions
├── content-schema.yaml   # Content validation schema
└── docs/                 # Documentation
```

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 10+
- PostgreSQL (for database)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/hemisphere.git
cd hemisphere

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
pnpm db:migrate

# Start development server
pnpm dev
```

## Development

### Available Scripts

```bash
# Development
pnpm dev                    # Start all workspaces in dev mode
pnpm dev:web               # Start web app only

# Building
pnpm build                 # Build all workspaces
pnpm build:web            # Build web app only

# Testing
pnpm test                  # Run all tests
pnpm typecheck            # Type check all workspaces

# Code Quality
pnpm lint                  # Lint all workspaces
pnpm format               # Format code

# Content Validation
pnpm validate-content      # Validate all content files
pnpm validate-content:watch # Watch mode for development
pnpm validate-content:ci   # CI mode

# Database
pnpm db:migrate           # Run migrations
pnpm db:studio            # Open Drizzle Studio
pnpm db:generate          # Generate migrations
```

### Workspace Structure

The project uses Turborepo for monorepo management:

- **apps/web**: Next.js application for the learning platform
- **packages/db**: Database schema, client, and migrations
- **packages/shared**: Shared TypeScript utilities and types

## Content System

### Content Schema

All learning content is defined in YAML files following the Hemisphere content schema (v1.0).

See:
- [`content-schema.yaml`](./content-schema.yaml) - Schema definition
- [`CONTENT-MODEL-SUMMARY.md`](./CONTENT-MODEL-SUMMARY.md) - Content model documentation
- [`content/README.md`](./content/README.md) - Content authoring guide

### Content Validation

The project includes a comprehensive validation system:

```bash
# Validate all content
pnpm validate-content

# Watch mode for development
pnpm validate-content:watch

# Validate specific files
pnpm validate-content content/topics/my-topic.yaml
```

For detailed documentation, see [`VALIDATION.md`](./VALIDATION.md).

### Creating Content

1. **Create YAML file** in `content/topics/`
2. **Follow schema** defined in `content-schema.yaml`
3. **Validate locally**: `pnpm validate-content`
4. **Test in app**: Preview the learning experience
5. **Commit**: Pre-commit hook validates automatically

Example structure:

```yaml
schemaVersion: '1.0'
topics:
  - id: my-topic
    version: 1.0.0
    metadata:
      title: My Learning Topic
      summary: Brief description
      subject: Subject area
      template: conceptual
      estimatedDuration: 15
    learningObjectives:
      - id: obj-1
        objective: Learn something specific
        bloom: understand
    stages:
      encounter:
        stage: encounter
        contentItems: [...]
      analysis:
        stage: analysis
        contentItems: [...]
      return:
        stage: return
        contentItems: [...]
```

## Git Workflow

### Pre-Commit Hooks

The project uses git hooks to ensure quality:

- **Content validation**: Validates YAML files against schema
- **bd (beads) integration**: Project management and task tracking

Hooks are automatically installed when using bd.

### Committing Changes

```bash
# Stage files
git add .

# Commit (hooks run automatically)
git commit -m "Your commit message"

# Push
git push
```

If validation fails, fix the errors and commit again.

To bypass hooks (not recommended):

```bash
git commit --no-verify
```

## CI/CD

### GitHub Actions

The project includes automated workflows:

- **Content Validation**: Validates content on PRs and main branch
- **Test Suite**: Runs tests on all workspaces (coming soon)
- **Type Checking**: Validates TypeScript types (coming soon)
- **Deployment**: Automated deployment pipeline (coming soon)

See `.github/workflows/` for workflow definitions.

## Technology Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **React 19** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling (planned)

### Backend
- **Hono** - Lightweight API framework
- **Drizzle ORM** - Type-safe database access
- **PostgreSQL** - Primary database

### Content
- **YAML** - Content definition format
- **JSON Schema** - Content validation
- **Ajv** - Schema validator

### Development
- **Turborepo** - Monorepo management
- **pnpm** - Package manager
- **tsx** - TypeScript execution
- **Beads (bd)** - Project management

## Documentation

- [**VALIDATION.md**](./VALIDATION.md) - Content validation system
- [**CONTENT-MODEL-SUMMARY.md**](./CONTENT-MODEL-SUMMARY.md) - Content model
- [**AGENTS.md**](./AGENTS.md) - AI agent guidelines
- [**CHANGELOG.md**](./CHANGELOG.md) - Project changelog
- [**content/README.md**](./content/README.md) - Content authoring
- [**scripts/README.md**](./scripts/README.md) - Script documentation

## Contributing

### Development Workflow

1. **Create branch**: `git checkout -b feature/your-feature`
2. **Make changes**: Implement your feature
3. **Validate**: Run `pnpm validate-content` if touching content
4. **Test**: Run `pnpm test` (when available)
5. **Commit**: `git commit -m "feat: your feature"`
6. **Push**: `git push origin feature/your-feature`
7. **Create PR**: Open pull request on GitHub

### Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting)
- `refactor:` - Code refactoring
- `test:` - Test changes
- `chore:` - Build process or auxiliary tool changes

### Code Quality

- **Type Safety**: All code must type check (`pnpm typecheck`)
- **Linting**: Follow ESLint rules (`pnpm lint`)
- **Formatting**: Use Prettier (automatic with `pnpm format`)
- **Content Validation**: All content must validate against schema

## Beads Integration

The project uses Beads (bd) for task and issue tracking:

```bash
# View issues
bd list

# Show issue details
bd show <issue-id>

# Update issue status
bd update <issue-id> --status=in_progress

# Close issue
bd close <issue-id>

# Sync with remote
bd sync
```

Issues are stored in `.beads/issues.jsonl`.

## Architecture

### Learning Loop Implementation

The RH-LH-RH learning loop is implemented through:

1. **Content Structure**: Three-stage content model
2. **UI/UX Design**: Different visual themes per stage
3. **Interaction Types**: Stage-appropriate activities
4. **Pacing**: Flexible timing matching hemisphere engagement
5. **Assessment**: Distributed throughout stages

### Data Model

- **Topics**: Top-level learning modules
- **Stages**: Three stages per topic (encounter, analysis, return)
- **Content Items**: Individual learning activities
- **Interactions**: User engagement prompts
- **Sessions**: User learning sessions (tracked)
- **Progress**: User progress through content

See database schema in `packages/db/src/schema/`.

## Performance

- **Validation**: ~30-50ms per content file
- **Watch Mode**: ~10-20ms overhead per change
- **Build Time**: Optimized with Turborepo caching

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- ES2022+ JavaScript features
- Progressive enhancement approach

## License

[Your License Here]

## Support

For issues, questions, or contributions:

- GitHub Issues: [Project Issues](https://github.com/yourusername/hemisphere/issues)
- Documentation: See `/docs` directory
- Content Questions: See `VALIDATION.md` and `content/README.md`

## Acknowledgments

Based on research and theory by:
- Iain McGilchrist - Hemisphere theory and attention
- Cognitive science research on learning and memory
- Spaced repetition and retrieval practice research

## Roadmap

See `.beads/issues.jsonl` for current tasks and issues.

Key upcoming features:
- Spaced repetition system
- Adaptive difficulty
- Social learning features
- Mobile applications
- Content authoring tools
- Analytics dashboard

---

Built with hemisphere theory for hemisphere-balanced learning.
