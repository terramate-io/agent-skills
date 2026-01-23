# Agent Skills

A collection of skills for AI coding agents. Skills are packaged instructions and scripts that extend agent capabilities.

Skills follow the [Agent Skills format](https://github.com/vercel-labs/agent-skills).

## Available Skills

### terraform-best-practices

Terraform and Infrastructure as Code (IaC) optimization guidelines from Terramate. Contains 40+ rules across 8 categories, prioritized by impact.

**Use when:**

- Writing new Terraform modules or configurations
- Implementing infrastructure patterns (AWS, GCP, Azure)
- Reviewing code for security and reliability issues
- Optimizing state management and performance
- Refactoring existing Terraform code

**Categories covered:**

- State Management (Critical)
- Security Best Practices (Critical)
- Module Design (High)
- Resource Organization (Medium-High)
- Variable & Output Patterns (Medium)
- Provider Configuration (Medium)
- Performance Optimization (Low-Medium)
- Testing & Validation (Low)

## Installation

```bash
npx add-skill terramate-io/agent-skills
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
