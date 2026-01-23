# variable-descriptions

**Priority:** MEDIUM  
**Category:** Variable & Output Patterns

## Why It Matters

Variables without descriptions make modules difficult to use. Descriptions serve as inline documentation and appear in generated docs, `terraform plan` output, and IDE tooltips.

## Incorrect

```hcl
variable "instance_type" {
  type    = string
  default = "t3.micro"
}

variable "vpc_cidr" {
  type = string
}

variable "enable_monitoring" {
  type    = bool
  default = true
}
```

**Problem:** Users must read the code or guess what each variable does.

## Correct

```hcl
variable "instance_type" {
  type        = string
  default     = "t3.micro"
  description = "EC2 instance type for the web servers. See https://aws.amazon.com/ec2/instance-types/"
}

variable "vpc_cidr" {
  type        = string
  description = "CIDR block for the VPC. Must be a /16 to /28 range."
}

variable "enable_monitoring" {
  type        = bool
  default     = true
  description = "Enable detailed CloudWatch monitoring for EC2 instances."
}
```

## Best Practices

### Use Upstream Provider Descriptions

When wrapping provider resources, use the same descriptions as the upstream provider documentation:

```hcl
# From AWS provider docs for aws_instance
variable "associate_public_ip_address" {
  type        = bool
  default     = false
  description = "Whether to associate a public IP address with an instance in a VPC."
}
```

### Include Constraints in Description

```hcl
variable "retention_days" {
  type        = number
  default     = 30
  description = "Number of days to retain logs. Must be between 1 and 365."
  
  validation {
    condition     = var.retention_days >= 1 && var.retention_days <= 365
    error_message = "Retention days must be between 1 and 365."
  }
}
```

### Document Default Behavior

```hcl
variable "tags" {
  type        = map(string)
  default     = {}
  description = "Additional tags to apply to all resources. Merged with default tags."
}

variable "subnet_ids" {
  type        = list(string)
  default     = null
  description = "List of subnet IDs. If not provided, subnets are created automatically."
}
```

## References

- [Input Variables](https://developer.hashicorp.com/terraform/language/values/variables)
- [Terraform Style Guide](https://developer.hashicorp.com/terraform/language/style)
