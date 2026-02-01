# cli-codegen-hcl

**Priority:** HIGH  
**Category:** CLI Code Generation

## Why It Matters

Code generation keeps Terraform configurations DRY by generating repetitive code from templates. `generate_hcl` blocks eliminate copy-paste and enable consistent patterns across stacks.

## Incorrect

```hcl
# Copy-paste provider configuration in every stack
# stacks/networking/main.tf
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

# stacks/compute/main.tf - Same code repeated!
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}
```

**Problem:** Code duplication, hard to maintain, version inconsistencies, violates DRY principle.

## Correct

```hcl
# terramate.tm.hcl - Generate provider config for all stacks
generate_hcl "providers.tf" {
  content {
    terraform {
      required_providers {
        aws = {
          source  = "hashicorp/aws"
          version = "~> 5.0"
        }
      }
    }
    
    provider "aws" {
      region = global.aws_region
    }
  }
}
```

**With stack-specific values:**

```hcl
# stacks/networking/stack.tm.hcl
stack {
  name = "networking"
}

globals {
  aws_region = "us-east-1"
}

# terramate.tm.hcl - Generate with context
generate_hcl "backend.tf" {
  content {
    terraform {
      backend "s3" {
        bucket = "terraform-state-${global.environment}"
        key    = "${tm_metadata("stack", "name")}/terraform.tfstate"
        region = global.aws_region
      }
    }
  }
}
```

**Benefits:**
- Single source of truth
- Consistent patterns across stacks
- Easy to update (change once, applies everywhere)
- Supports dynamic values via globals/metadata
- Reduces errors from copy-paste

## Additional Context

Generate HCL blocks:
- Use `generate_hcl` to create `.tf` files
- Content is HCL (not strings)
- Supports Terramate functions and variables
- Generated files are in `.terramate/cache/`

Best practices:
- Generate provider configs centrally
- Generate backend configs per stack
- Use globals for stack-specific values
- Keep generated code simple and readable

## References

- [Generate HCL](https://terramate.io/docs/cli/code-generation/generate-hcl/)
- [Basic DRY Code Generation](https://terramate.io/docs/how-to-guides/code-generation/basic-dry-code-generation/)
