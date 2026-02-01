# cli-stack-config

**Priority:** CRITICAL  
**Category:** CLI Fundamentals

## Why It Matters

Proper stack configuration enables metadata, dependencies, and integration with Terramate features. The stack block is essential for stack identification and management.

## Incorrect

```hcl
# Missing stack configuration
# Only Terraform files, no stack.tm.hcl

# main.tf
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
}
```

**Problem:** Stack not recognized by Terramate. Cannot use orchestration, change detection, or stack-specific features.

## Correct

```hcl
# stack.tm.hcl
stack {
  name        = "networking"
  description = "Core VPC and networking resources"
  
  id = "networking-prod"
  
  tags = ["networking", "core", "prod"]
  
  after = [
    "../foundation"
  ]
}
```

**Benefits:**
- Stack is recognized by Terramate CLI
- Enables dependency management via `after`
- Supports filtering with tags
- Provides metadata for automation
- Enables Cloud integration

## Additional Context

Stack block fields:
- `name` - Human-readable stack name (required)
- `description` - Documentation for the stack
- `id` - Unique identifier (optional, defaults to name)
- `tags` - Array of tags for filtering and organization
- `after` - List of stack paths for dependency ordering

Stack dependencies:
- Use `after` to specify execution order
- Dependencies are resolved automatically
- Circular dependencies are detected and reported

## References

- [Configure Stacks](https://terramate.io/docs/cli/stacks/configure-stacks/)
- [Stack Block Reference](https://terramate.io/docs/cli/reference/blocks/stack/)
