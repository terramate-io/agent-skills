# variable-validation

**Priority:** MEDIUM  
**Category:** Variable & Output Patterns

## Why It Matters

Validation rules catch configuration errors early, before Terraform attempts to create resources. This prevents failed deployments and provides clear error messages.

## Incorrect

```hcl
variable "environment" {
  type = string
  # No validation - any string accepted
}

variable "instance_type" {
  type = string
}

variable "cidr_block" {
  type = string
}

# Errors only discovered during apply when AWS rejects values
```

## Correct

```hcl
variable "environment" {
  type        = string
  description = "Deployment environment"
  
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}

variable "instance_type" {
  type        = string
  description = "EC2 instance type"
  
  validation {
    condition     = can(regex("^[a-z][0-9]+\\.(nano|micro|small|medium|large|xlarge|[0-9]+xlarge)$", var.instance_type))
    error_message = "Invalid instance type format. Example: t3.micro, m5.large"
  }
}

variable "cidr_block" {
  type        = string
  description = "VPC CIDR block"
  
  validation {
    condition     = can(cidrhost(var.cidr_block, 0))
    error_message = "Must be a valid CIDR block (e.g., 10.0.0.0/16)."
  }
  
  validation {
    condition     = tonumber(split("/", var.cidr_block)[1]) >= 16 && tonumber(split("/", var.cidr_block)[1]) <= 28
    error_message = "CIDR block must be between /16 and /28."
  }
}
```

## Common Validation Patterns

### String Length

```hcl
variable "bucket_name" {
  type = string
  
  validation {
    condition     = length(var.bucket_name) >= 3 && length(var.bucket_name) <= 63
    error_message = "Bucket name must be between 3 and 63 characters."
  }
}
```

### Numeric Ranges

```hcl
variable "port" {
  type = number
  
  validation {
    condition     = var.port >= 1 && var.port <= 65535
    error_message = "Port must be between 1 and 65535."
  }
}

variable "instance_count" {
  type = number
  
  validation {
    condition     = var.instance_count > 0 && var.instance_count <= 10
    error_message = "Instance count must be between 1 and 10."
  }
}
```

### List Validation

```hcl
variable "availability_zones" {
  type = list(string)
  
  validation {
    condition     = length(var.availability_zones) >= 2
    error_message = "At least 2 availability zones required for high availability."
  }
}
```

### Map Validation

```hcl
variable "tags" {
  type = map(string)
  
  validation {
    condition     = contains(keys(var.tags), "Environment")
    error_message = "Tags must include 'Environment' key."
  }
}
```

### Multiple Validations

```hcl
variable "db_name" {
  type = string
  
  validation {
    condition     = length(var.db_name) >= 1 && length(var.db_name) <= 63
    error_message = "Database name must be 1-63 characters."
  }
  
  validation {
    condition     = can(regex("^[a-zA-Z][a-zA-Z0-9_]*$", var.db_name))
    error_message = "Database name must start with a letter and contain only alphanumeric characters and underscores."
  }
}
```

## References

- [Input Variable Validation](https://developer.hashicorp.com/terraform/language/values/variables#custom-validation-rules)
