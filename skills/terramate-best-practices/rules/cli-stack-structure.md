# cli-stack-structure

**Priority:** CRITICAL  
**Category:** CLI Fundamentals

## Why It Matters

Proper stack structure enables clear organization, dependency management, and efficient orchestration. Stacks should represent logical units of infrastructure that can be managed independently.

## Incorrect

```
infrastructure/
├── main.tf
├── variables.tf
└── outputs.tf
```

**Problem:** No stack structure. All infrastructure in a single directory without clear boundaries. Cannot leverage Terramate's orchestration, change detection, or dependency management.

## Correct

```
infrastructure/
├── stacks/
│   ├── networking/
│   │   └── stack.tm.hcl
│   ├── compute/
│   │   └── stack.tm.hcl
│   └── database/
│       └── stack.tm.hcl
└── terramate.tm.hcl
```

**Stack Definition:**

```hcl
# stacks/networking/stack.tm.hcl
stack {
  name        = "networking"
  description = "Core networking infrastructure"
  
  tags = ["core", "networking"]
}
```

**Benefits:**
- Clear separation of concerns
- Independent management and deployment
- Enables change detection per stack
- Supports parallel execution of independent stacks
- Better organization for large codebases

## Additional Context

Stack naming conventions:
- Use descriptive names: `networking`, `compute`, `database`
- Avoid generic names: `stack1`, `infra`, `resources`
- Consider environment prefixes: `prod-networking`, `staging-networking`
- Use kebab-case for consistency

Stack directory structure:
- Each stack should be in its own directory
- Include `stack.tm.hcl` in each stack directory
- Terraform files can be in the stack directory or subdirectories

## References

- [Terramate Stacks Documentation](https://terramate.io/docs/cli/stacks/)
- [Create Stacks](https://terramate.io/docs/cli/stacks/create-stacks/)
