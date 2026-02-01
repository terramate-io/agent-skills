# Agent Skills

A collection of skills for AI coding agents. Skills are packaged instructions and scripts that extend agent capabilities.

Skills follow the [Agent Skills format](https://github.com/vercel-labs/agent-skills).

## Available Skills

### terraform-best-practices

Terraform and Infrastructure as Code (IaC) optimization guidelines from Terramate. Contains 37 rules across 10 categories, prioritized by impact.

**Use when:**

- Writing new Terraform modules or configurations
- Implementing infrastructure patterns (AWS, GCP, Azure)
- Reviewing code for security and reliability issues
- Optimizing state management and performance
- Refactoring existing Terraform code

**Categories covered:**

- Organization & Workflow (Critical)
- State Management (Critical)
- Security Best Practices (Critical)
- Module Design (High)
- Resource Organization (Medium-High)
- Variable & Output Patterns (Medium)
- Language Best Practices (Medium)
- Provider Configuration (Medium)
- Performance Optimization (Low-Medium)
- Testing & Validation (Low)

### terramate

Terramate CLI, Cloud, and Catalyst best practices and usage guides. Contains 15+ rules across 8 categories for stack management, orchestration, code generation, and Cloud integration.

**Use when:**

- Creating and organizing Terramate stacks
- Orchestrating commands across multiple stacks
- Using code generation to keep configurations DRY
- Integrating with Terramate Cloud for observability
- Creating Catalyst components and bundles
- Setting up CI/CD workflows with Terramate

**Categories covered:**

- CLI Fundamentals (Critical)
- CLI Orchestration (High)
- CLI Code Generation (High)
- CLI Configuration (Medium-High)
- Terramate Cloud (Medium-High)
- Terramate Catalyst (Medium)
- CI/CD Integration (Medium)
- Advanced Patterns (Low-Medium)

## Installation

```bash
# Install all skills
npx skills add terramate-io/agent-skills

# Or install individual skills
npx skills add terramate-io/agent-skills#terraform-best-practices
npx skills add terramate-io/agent-skills#terramate-best-practices
```

## Publishing

Skills are automatically discovered by [skills.sh](https://skills.sh/) from GitHub repositories. To publish new versions:

### Initial Publishing

1. **Validate your skills**:
   ```bash
   ./scripts/publish-skills.sh
   ```

2. **Ensure your repository is public** on GitHub

3. **Create a GitHub release** (recommended):
   - Go to your repository's Releases page
   - Click "Create a new release"
   - Tag a version (e.g., `v1.0.0`)
   - The release workflow will automatically validate and build skills

### Publishing New Versions

When releasing a new version:

1. **Create a GitHub release** with a version tag (e.g., `v1.1.0`)
2. The `.github/workflows/release.yml` workflow will:
   - Validate all SKILL.md files
   - Build AGENTS.md files
   - Verify frontmatter format
   - Create a release summary

3. **Users can install the new version**:
   ```bash
   npx skills add terramate-io/agent-skills@v1.1.0
   ```

### Skills Discovery

Skills.sh automatically discovers skills from GitHub repositories. Your skills will appear on the [skills.sh directory](https://skills.sh/) based on:
- Repository visibility (must be public)
- Proper SKILL.md format with frontmatter
- Usage telemetry from CLI installations

### Manual Publishing Script

Run the publishing script to validate and get instructions:

```bash
./scripts/publish-skills.sh
```

## Usage

Skills are automatically available once installed. The agent will use them when relevant tasks are detected.

**Examples:**

```
Review this Terraform module for security issues
```

```
Help me optimize this AWS infrastructure
```

```
Refactor this Terraform configuration to use modules
```

```
Create a Terramate stack structure for my infrastructure
```

```
Set up change detection for my Terramate stacks
```

```
Generate provider configurations for all my stacks
```

## Skill Structure

Each skill contains:

- `SKILL.md` - Instructions for the agent
- `rules/` - Individual rule files with examples
- `references/` - Supporting documentation (optional)

## Contributing

We welcome contributions! Please see our contributing guidelines for more information.

## Acknowledgments

This project's skill format and structure was inspired by [Vercel Labs Agent Skills](https://github.com/vercel-labs/agent-skills). We adapted their approach for Terraform and Infrastructure as Code best practices.

## License

MIT
