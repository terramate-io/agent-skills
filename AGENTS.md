# Agent Skills - Terramate

This repository contains agent skills for Terraform and Infrastructure as Code development.

## Repository Structure

```
.
├── skills/
│   ├── terraform-best-practices/
│   │   ├── SKILL.md
│   │   └── rules/
│   └── terramate-best-practices/
│       ├── SKILL.md
│       └── rules/
├── packages/
│   ├── terraform-best-practices-build/
│   └── terramate-best-practices-build/
├── .github/
│   └── workflows/
├── README.md
├── AGENTS.md
└── CLAUDE.md
```

## Skills

### terraform-best-practices

Comprehensive Terraform and IaC optimization guide maintained by Terramate. Contains rules across multiple categories prioritized by impact.

**Categories:**

1. **State Management (CRITICAL)** - Remote state, locking, workspaces
2. **Security Best Practices (CRITICAL)** - Secrets, IAM, encryption
3. **Module Design (HIGH)** - Reusability, versioning, composition
4. **Resource Organization (MEDIUM-HIGH)** - Naming, structure, dependencies
5. **Variable & Output Patterns (MEDIUM)** - Types, validation, defaults
6. **Provider Configuration (MEDIUM)** - Versioning, aliases, features
7. **Performance Optimization (LOW-MEDIUM)** - Parallelism, targeting
8. **Testing & Validation (LOW)** - Terratest, policy as code

### terramate-best-practices

Comprehensive guide for Terramate CLI, Cloud, and Catalyst maintained by Terramate. Contains best practices and usage patterns for stack management, orchestration, code generation, Cloud integration, and Catalyst components/bundles.

**Categories:**

1. **CLI Fundamentals (CRITICAL)** - Stack structure, configuration, metadata
2. **CLI Orchestration (HIGH)** - Running commands, change detection, parallel execution, dependencies
3. **CLI Code Generation (HIGH)** - generate_hcl, generate_file, provider generation
4. **CLI Configuration (MEDIUM-HIGH)** - Globals, lets, metadata usage
5. **Terramate Cloud (MEDIUM-HIGH)** - Cloud integration, drift management, observability
6. **Terramate Catalyst (MEDIUM)** - Components, bundles, instantiation
7. **CI/CD Integration (MEDIUM)** - GitHub Actions, workflows, automation
8. **Advanced Patterns (LOW-MEDIUM)** - Complex workflows, advanced codegen

## Development

```bash
# Install dependencies
npm install

# Build skills
npm run build

# Run tests
npm test
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add or modify rules in `skills/terraform-best-practices/rules/` or `skills/terramate-best-practices/rules/`
4. Update `SKILL.md` if adding new categories
5. Run validation: `pnpm --dir packages/<skill>-build run validate`
6. Build the skill: `pnpm --dir packages/<skill>-build run build`
7. Submit a pull request
