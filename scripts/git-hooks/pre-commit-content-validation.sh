#!/usr/bin/env bash
# Hemisphere Content Validation Pre-Commit Hook
#
# This script validates staged YAML content files against the content schema.
# It integrates with the bd (beads) hook system and can be chained with other hooks.
#
# Exit codes:
#   0 - Validation passed or no content files to validate
#   1 - Validation failed
#
# Usage:
#   Can be called directly or integrated into .git/hooks/pre-commit
#   Add to pre-commit hook: ./scripts/git-hooks/pre-commit-content-validation.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${RED}Error: Not in a git repository${NC}"
    exit 1
fi

# Get the root directory of the git repository
GIT_ROOT=$(git rev-parse --show-toplevel)

# Check if content schema exists
SCHEMA_PATH="${GIT_ROOT}/content-schema.yaml"
if [ ! -f "$SCHEMA_PATH" ]; then
    echo -e "${YELLOW}Warning: Content schema not found at ${SCHEMA_PATH}${NC}"
    echo -e "${YELLOW}Skipping content validation${NC}"
    exit 0
fi

# Get list of staged YAML files in content directory
STAGED_CONTENT_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '^content/.*\.(yaml|yml)$' || true)

# If no content files are staged, skip validation
if [ -z "$STAGED_CONTENT_FILES" ]; then
    exit 0
fi

# Count files
FILE_COUNT=$(echo "$STAGED_CONTENT_FILES" | wc -l | tr -d ' ')

echo -e "${BLUE}🔍 Validating ${FILE_COUNT} staged content file(s)...${NC}"
echo ""

# Change to git root directory
cd "$GIT_ROOT"

# Run validation on staged files
if command -v pnpm > /dev/null 2>&1; then
    # Use pnpm if available
    if pnpm validate-content --git-staged; then
        echo -e "${GREEN}✅ Content validation passed${NC}"
        exit 0
    else
        echo -e "${RED}❌ Content validation failed${NC}"
        echo -e "${YELLOW}Fix the errors above before committing${NC}"
        echo ""
        echo -e "${YELLOW}To skip validation (not recommended):${NC}"
        echo -e "  git commit --no-verify"
        echo ""
        exit 1
    fi
elif command -v npm > /dev/null 2>&1; then
    # Fall back to npm
    if npm run validate-content -- --git-staged; then
        echo -e "${GREEN}✅ Content validation passed${NC}"
        exit 0
    else
        echo -e "${RED}❌ Content validation failed${NC}"
        echo -e "${YELLOW}Fix the errors above before committing${NC}"
        echo ""
        echo -e "${YELLOW}To skip validation (not recommended):${NC}"
        echo -e "  git commit --no-verify"
        echo ""
        exit 1
    fi
else
    echo -e "${YELLOW}Warning: Neither pnpm nor npm found${NC}"
    echo -e "${YELLOW}Skipping content validation${NC}"
    exit 0
fi
