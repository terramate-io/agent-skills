# provider-version-constraints

**Priority:** MEDIUM  
**Category:** Provider Configuration

## Why It Matters

Unpinned provider versions can cause unexpected behavior when providers release breaking changes. Pin versions for reproducibility while allowing controlled updates.

## Incorrect

```hcl
terraform {
  required_providers {
    aws = {
      source = "hashicorp/aws"
      # No version constraint - uses latest
    }
  }
}

provider "aws" {
  region = "us-east-1"
}
```

**Problem:** Running `terraform init` on different days may get different provider versions with different behavior.

## Correct

```hcl
terraform {
  required_version = ">= 1.5.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"  # Allows 5.x, not 6.0
    }
    
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
    
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = ">= 2.20.0, < 3.0.0"
    }
  }
}
```

## Version Constraint Strategies

### Production - Conservative

```hcl
# Pin to exact version in production
aws = {
  source  = "hashicorp/aws"
  version = "5.31.0"
}
```

### Development - Flexible

```hcl
# Allow minor updates in development
aws = {
  source  = "hashicorp/aws"
  version = "~> 5.31"  # Allows 5.31.x
}
```

### Balanced Approach

```hcl
# Allow minor updates, block major
aws = {
  source  = "hashicorp/aws"
  version = ">= 5.0.0, < 6.0.0"
}
```

## The Lock File

Terraform creates `.terraform.lock.hcl` to record exact versions:

```hcl
# .terraform.lock.hcl (auto-generated)
provider "registry.terraform.io/hashicorp/aws" {
  version     = "5.31.0"
  constraints = "~> 5.0"
  hashes = [
    "h1:abc123...",
  ]
}
```

**Best practices:**
- Commit `.terraform.lock.hcl` to version control
- Update with `terraform init -upgrade`
- Review lock file changes in PRs

## Updating Providers

```bash
# Update all providers within constraints
terraform init -upgrade

# Check for outdated providers
terraform version

# Update specific provider
terraform providers lock -platform=linux_amd64 hashicorp/aws
```

## Multiple Provider Configurations

```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
      configuration_aliases = [aws.west]
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

provider "aws" {
  alias  = "west"
  region = "us-west-2"
}
```

## References

- [Provider Requirements](https://developer.hashicorp.com/terraform/language/providers/requirements)
- [Dependency Lock File](https://developer.hashicorp.com/terraform/language/files/dependency-lock)
