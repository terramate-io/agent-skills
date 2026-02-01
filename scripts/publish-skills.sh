#!/bin/bash

# Script to help publish skills to skills.sh
# Skills.sh automatically discovers skills from GitHub repositories
# This script validates and provides instructions for publishing

set -e

REPO_OWNER="${GITHUB_REPOSITORY_OWNER:-terramate-io}"
REPO_NAME="${GITHUB_REPOSITORY##*/}"
REPO_NAME="${REPO_NAME:-agent-skills}"

echo "🔍 Validating skills for publishing..."
echo ""

# Check if SKILL.md files exist
check_skill_file() {
  local skill_path=$1
  local skill_name=$2
  
  if [ ! -f "$skill_path/SKILL.md" ]; then
    echo "❌ ERROR: $skill_name/SKILL.md not found"
    return 1
  fi
  
  # Check frontmatter
  if ! head -n 1 "$skill_path/SKILL.md" | grep -q "^---"; then
    echo "❌ ERROR: $skill_name/SKILL.md missing frontmatter"
    return 1
  fi
  
  echo "✓ $skill_name/SKILL.md is valid"
  return 0
}

# Validate all skills
VALID=true

if ! check_skill_file "skills/terraform-best-practices" "terraform-best-practices"; then
  VALID=false
fi

if ! check_skill_file "skills/terramate-best-practices" "terramate-best-practices"; then
  VALID=false
fi

if [ "$VALID" != "true" ]; then
  echo ""
  echo "❌ Validation failed. Please fix errors before publishing."
  exit 1
fi

echo ""
echo "✅ All skills validated successfully!"
echo ""

# Build skills
echo "📦 Building skills..."
cd packages/terraform-best-practices-build && pnpm install && pnpm build && cd ../..
cd packages/terramate-best-practices-build && pnpm install && pnpm build && cd ../..

echo ""
echo "📋 Publishing Instructions"
echo "=========================="
echo ""
echo "Skills.sh automatically discovers skills from GitHub repositories."
echo "Your skills are ready to be published!"
echo ""
echo "1. Ensure your repository is public on GitHub:"
echo "   https://github.com/$REPO_OWNER/$REPO_NAME"
echo ""
echo "2. Create a GitHub release (optional but recommended):"
echo "   - Go to: https://github.com/$REPO_OWNER/$REPO_NAME/releases/new"
echo "   - Create a new release with a version tag (e.g., v1.0.0)"
echo "   - The release workflow will validate and build skills"
echo ""
echo "3. Users can install your skills:"
echo ""
echo "   Install all skills:"
echo "   npx skills add $REPO_OWNER/$REPO_NAME"
echo ""
echo "   Install individual skills:"
echo "   npx skills add $REPO_OWNER/$REPO_NAME#terraform-best-practices"
echo "   npx skills add $REPO_OWNER/$REPO_NAME#terramate-best-practices"
echo ""
echo "4. Skills will appear on skills.sh based on usage telemetry"
echo ""
echo "📚 Documentation:"
echo "   - Skills.sh docs: https://skills.sh/docs"
echo "   - Agent Skills spec: https://agentskills.io/specification"
echo ""
