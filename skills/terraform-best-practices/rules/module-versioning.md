# module-versioning

**Priority:** HIGH  
**Category:** Module Design

## Why It Matters

Unpinned module versions can break deployments when upstream changes occur. Always pin module versions for reproducibility and controlled upgrades.

## Incorrect

```hcl
module "vpc" {
  source = "terraform-aws-modules/vpc/aws"
  # No version constraint - uses latest
  
  name = "my-vpc"
  cidr = "10.0.0.0/16"
}

module "internal_module" {
  source = "git::https://github.com/org/modules.git//vpc"
  # No ref - uses HEAD of default branch
}
```

**Problem:** Module behavior can change unexpectedly between runs.

## Correct

```hcl
# Registry modules - use version constraint
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.1.2"  # Pinned to exact version
  
  name = "my-vpc"
  cidr = "10.0.0.0/16"
}

# Allow minor updates (5.1.x)
module "vpc_flexible" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.1.0"
  
  name = "my-vpc"
  cidr = "10.0.0.0/16"
}

# Git modules - use ref
module "internal_module" {
  source = "git::https://github.com/org/modules.git//vpc?ref=v1.2.3"
}

# Git with commit SHA (most reproducible)
module "internal_module_sha" {
  source = "git::https://github.com/org/modules.git//vpc?ref=abc123def456"
}
```

## Version Constraint Operators

| Operator | Example | Meaning |
|----------|---------|---------|
| `=` | `= 1.2.3` | Exact version |
| `!=` | `!= 1.2.3` | Exclude version |
| `>`, `>=`, `<`, `<=` | `>= 1.2.0` | Comparison |
| `~>` | `~> 1.2.0` | Pessimistic (allows 1.2.x, not 1.3.0) |

## Recommended Strategy

```hcl
# Production - pin exact versions
module "prod_vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.1.2"
}

# Development - allow patch updates
module "dev_vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.1.0"
}
```

## Updating Versions

Use a dependency management tool or update manually:

```bash
# Check for updates
terraform init -upgrade

# Lock file tracks exact versions
cat .terraform.lock.hcl
```

## References

- [Module Sources](https://developer.hashicorp.com/terraform/language/modules/sources)
- [Version Constraints](https://developer.hashicorp.com/terraform/language/expressions/version-constraints)
