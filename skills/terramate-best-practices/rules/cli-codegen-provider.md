# cli-codegen-provider

**Priority:** HIGH  
**Category:** CLI Code Generation

## Why It Matters

Provider configuration generation ensures consistent provider versions and settings across all stacks while allowing stack-specific customization. Essential for multi-stack, multi-environment setups.

## Incorrect

```hcl
# Each stack manually configures providers
# stacks/networking/main.tf
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"  # Different version!
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

# stacks/compute/main.tf
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"  # Inconsistent!
    }
  }
}

provider "aws" {
  region = "us-west-2"  # Different region!
}
```

**Problem:** Inconsistent provider versions, different regions, hard to maintain, version conflicts.

## Correct

```hcl
# terramate.tm.hcl - Central provider generation
generate_hcl "providers.tf" {
  content {
    terraform {
      required_providers {
        aws = {
          source  = "hashicorp/aws"
          version = global.provider_versions.aws
        }
      }
    }
    
    provider "aws" {
      region = global.aws_region
      
      default_tags {
        tags = {
          Environment   = global.environment
          ManagedBy     = "Terramate"
          Stack         = tm_metadata("stack", "name")
          Project       = tm_metadata("project", "name")
        }
      }
    }
  }
}

# Globals in terramate.tm.hcl or stack-specific
globals {
  provider_versions = {
    aws = "~> 5.0"
  }
  
  aws_region  = "us-east-1"
  environment = tm_metadata("environment")
}
```

**Stack-specific overrides:**

```hcl
# stacks/networking/stack.tm.hcl
globals {
  aws_region = "us-west-2"  # Override for this stack
}
```

**Benefits:**
- Consistent provider versions across stacks
- Centralized provider configuration
- Stack-specific overrides when needed
- Automatic default tags
- Single place to update versions

## Additional Context

Provider generation patterns:
- Generate `providers.tf` in each stack
- Use globals for version management
- Allow stack-specific overrides
- Include default tags for cost tracking

Provider version management:
- Define versions in root `terramate.tm.hcl`
- Use semantic versioning constraints
- Update versions centrally

## References

- [Terraform Backend and Provider Generation](https://terramate.io/docs/how-to-guides/code-generation/terraform-backend-and-provider-generation/)
- [Dynamic Provider Generation](https://terramate.io/docs/how-to-guides/code-generation/dynamic-provider-generation/)
