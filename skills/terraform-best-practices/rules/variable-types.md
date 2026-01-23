# variable-types

**Priority:** MEDIUM  
**Category:** Variable & Output Patterns

## Why It Matters

Explicit type constraints catch errors early, provide documentation, and enable better IDE support. Using `any` or omitting types loses these benefits and makes modules harder to use correctly.

## Incorrect

```hcl
# No type - accepts anything
variable "instance_count" {}

# Using 'any' when specific type is known
variable "tags" {
  type = any
}

# Overly permissive
variable "port" {
  type = any
}
```

**Problem:** Type errors only discovered at apply time, if at all.

## Correct

```hcl
# Explicit primitive types
variable "instance_count" {
  type        = number
  description = "Number of instances to create"
}

variable "environment" {
  type        = string
  description = "Deployment environment"
}

variable "enable_monitoring" {
  type        = bool
  default     = true
  description = "Enable CloudWatch monitoring"
}

# Explicit collection types
variable "tags" {
  type        = map(string)
  default     = {}
  description = "Resource tags"
}

variable "subnet_ids" {
  type        = list(string)
  description = "List of subnet IDs"
}

variable "availability_zones" {
  type        = set(string)
  description = "Set of availability zones"
}
```

## Complex Types with Objects

```hcl
# Object with required fields
variable "database_config" {
  type = object({
    engine         = string
    engine_version = string
    instance_class = string
    storage_gb     = number
  })
  description = "Database configuration"
}

# Object with optional fields and defaults
variable "scaling_config" {
  type = object({
    min_size         = optional(number, 1)
    max_size         = optional(number, 10)
    desired_capacity = optional(number, 2)
    cooldown         = optional(number, 300)
  })
  default     = {}
  description = "Auto-scaling configuration"
}
```

## Use Positive Variable Names

Avoid double negatives by using positive names:

```hcl
# Incorrect - double negative when set to false
variable "disable_encryption" {
  type    = bool
  default = false  # !disable = enable... confusing
}

# Correct - clear intent
variable "encryption_enabled" {
  type        = bool
  default     = true
  description = "Enable encryption at rest"
}

# Incorrect
variable "no_public_ip" {
  type = bool
}

# Correct
variable "associate_public_ip" {
  type        = bool
  default     = false
  description = "Associate a public IP address"
}
```

## Use `nullable = false` Where Appropriate

```hcl
# Prevent null values for collections
variable "subnet_cidrs" {
  type        = list(string)
  default     = []
  nullable    = false
  description = "List of subnet CIDR blocks"
}

variable "tags" {
  type        = map(string)
  default     = {}
  nullable    = false
  description = "Resource tags"
}

# Ensure string has a value
variable "environment" {
  type        = string
  nullable    = false
  description = "Deployment environment (required)"
}
```

## When to Use `any`

Reserve `type = any` for exceptional cases:

```hcl
# Acceptable: highly variable structure from external source
variable "datadog_monitor_config" {
  type        = any
  description = "Monitor configuration matching Datadog API schema"
}

# Acceptable: pass-through to dynamic resource
variable "container_definitions" {
  type        = any
  description = "ECS container definitions JSON"
}
```

## References

- [Type Constraints](https://developer.hashicorp.com/terraform/language/expressions/type-constraints)
- [Variable Types](https://developer.hashicorp.com/terraform/language/values/variables#type-constraints)
