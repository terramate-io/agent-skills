# cli-config-globals

**Priority:** MEDIUM-HIGH  
**Category:** CLI Configuration

## Why It Matters

Globals provide shared configuration across stacks, enabling DRY patterns and consistent values. They can be defined at project or stack level and are inherited hierarchically.

## Incorrect

```hcl
# Hardcoded values in each stack
# stacks/networking/main.tf
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
  
  tags = {
    Environment = "prod"
    Project     = "myproject"
  }
}

# stacks/compute/main.tf - Same values repeated!
resource "aws_instance" "web" {
  tags = {
    Environment = "prod"  # Copy-paste
    Project     = "myproject"  # Copy-paste
  }
}
```

**Problem:** Values duplicated, hard to change, inconsistent, violates DRY principle.

## Correct

```hcl
# terramate.tm.hcl - Root globals
globals {
  environment = tm_metadata("environment")
  project     = tm_metadata("project", "name")
  
  common_tags = {
    Environment = global.environment
    Project     = global.project
    ManagedBy   = "Terramate"
  }
  
  aws_region = "us-east-1"
}

# stacks/networking/main.tf
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
  tags       = global.common_tags
}

# stacks/compute/main.tf
resource "aws_instance" "web" {
  tags = merge(global.common_tags, {
    Name = "web-server"
  })
}
```

**Stack-specific overrides:**

```hcl
# stacks/networking/stack.tm.hcl
globals {
  # Inherit from parent, override specific values
  aws_region = "us-west-2"  # Override for this stack
}
```

**Benefits:**
- Single source of truth for shared values
- Hierarchical inheritance (parent → child)
- Stack-specific overrides when needed
- Consistent tagging and configuration
- Easy to update globally

## Additional Context

Global scoping:
- Root `terramate.tm.hcl` - Project-wide globals
- Stack `stack.tm.hcl` - Stack-specific globals
- Child stacks inherit parent globals
- Overrides merge hierarchically

Common use cases:
- Environment names
- Common tags
- Provider regions
- Shared configuration values
- Feature flags

## References

- [Globals Reference](https://terramate.io/docs/cli/reference/blocks/globals/)
- [Variable Namespaces](https://terramate.io/docs/cli/reference/variable-namespaces/)
