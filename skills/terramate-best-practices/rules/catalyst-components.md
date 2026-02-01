# catalyst-components

**Priority:** MEDIUM  
**Category:** Terramate Catalyst

## Why It Matters

Components are reusable, opinionated infrastructure blueprints that encode organizational standards. They enable platform engineers to define best practices once and developers to consume them easily.

## Incorrect

```hcl
# Developers write Terraform from scratch
# No standardization
# Inconsistent patterns
# Security issues
# Cost overruns

# app-team/main.tf
resource "aws_s3_bucket" "data" {
  # Missing encryption
  # Missing versioning
  # Missing lifecycle policies
  # Inconsistent naming
}
```

**Problem:** Each team reinvents the wheel, inconsistent patterns, security gaps, no governance, hard to maintain.

## Correct

**Component definition:**

```hcl
# components/s3-bucket/component.tm.hcl
component {
  name        = "s3-bucket"
  description = "Secure S3 bucket with encryption and lifecycle policies"
  
  input {
    name = {
      type        = string
      description = "Bucket name"
    }
    
    versioning = {
      type        = bool
      default     = true
      description = "Enable versioning"
    }
    
    lifecycle_days = {
      type        = number
      default     = 90
      description = "Days before transitioning to Glacier"
    }
  }
  
  output {
    bucket_id = {
      type        = string
      description = "Bucket ID"
    }
    
    bucket_arn = {
      type        = string
      description = "Bucket ARN"
    }
  }
}

# components/s3-bucket/main.tf
resource "aws_s3_bucket" "this" {
  bucket = input.name
  
  tags = {
    Component = "s3-bucket"
    ManagedBy = "Terramate Catalyst"
  }
}

resource "aws_s3_bucket_versioning" "this" {
  bucket = aws_s3_bucket.this.id
  
  versioning_configuration {
    status = input.versioning ? "Enabled" : "Disabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "this" {
  bucket = aws_s3_bucket.this.id
  
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "this" {
  bucket = aws_s3_bucket.this.id
  
  rule {
    id     = "transition-to-glacier"
    status = "Enabled"
    
    transition {
      days          = input.lifecycle_days
      storage_class = "GLACIER"
    }
  }
}

output "bucket_id" {
  value       = aws_s3_bucket.this.id
  description = output.bucket_id.description
}

output "bucket_arn" {
  value       = aws_s3_bucket.this.arn
  description = output.bucket_arn.description
}
```

**Component usage:**

```hcl
# stacks/app-data/stack.tm.hcl
stack {
  name = "app-data"
}

# Instantiate component
tm_bundle "s3-bucket" {
  component = "s3-bucket"
  
  input = {
    name           = "app-data-bucket"
    versioning     = true
    lifecycle_days = 90
  }
}
```

**Benefits:**
- Standardized infrastructure patterns
- Built-in security and compliance
- Consistent naming and tagging
- Cost optimization built-in
- Easy for developers to use
- Platform team maintains standards

## Additional Context

Component structure:
- `component.tm.hcl` - Component definition (inputs/outputs)
- `main.tf` - Terraform implementation
- Can use any IaC tool (Terraform, OpenTofu, Kubernetes)

Converting existing Terraform modules to components:
- Run `terramate component create` inside an existing Terraform module directory
- This automatically generates the component structure from your module
- Converts module variables to component inputs
- Converts module outputs to component outputs
- Preserves existing Terraform code
- Example: `cd modules/s3-bucket && terramate component create`

Component best practices:
- Define clear inputs and outputs
- Include security defaults
- Add cost optimization
- Document usage examples
- Version components
- Convert existing modules using `terramate component create` for quick migration

## References

- [Terramate Catalyst Components](https://terramate.io/docs/catalyst/concepts/components/)
- [Create a Component](https://terramate.io/docs/catalyst/tutorials/create-a-component-and-bundle/)
- [Convert Module to Component](https://terramate.io/docs/catalyst/how-to-guides/convert-module-to-component/)
