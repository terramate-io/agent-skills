# resource-naming

**Priority:** MEDIUM-HIGH  
**Category:** Resource Organization

## Why It Matters

Consistent naming conventions improve readability, make resources easier to find, and help with cost allocation and compliance. Establish naming patterns early and enforce them across your infrastructure.

## Incorrect

```hcl
resource "aws_instance" "my_server" {
  # ...
}

resource "aws_instance" "WebServer1" {
  # ...
}

resource "aws_s3_bucket" "Data_Bucket" {
  bucket = "mycompany-stuff"
}

resource "aws_lambda_function" "func" {
  function_name = "DoTheThing"
}
```

**Problems:**
- Inconsistent casing (snake_case, PascalCase, mixed)
- Generic names don't convey purpose
- Resource names don't match cloud resource names

## Correct

```hcl
# Terraform resource names: snake_case, descriptive
resource "aws_instance" "web_server" {
  tags = {
    Name = "prod-web-server-001"  # Cloud name: environment-purpose-number
  }
}

resource "aws_s3_bucket" "application_data" {
  bucket = "acme-prod-application-data-us-east-1"  # org-env-purpose-region
}

resource "aws_lambda_function" "order_processor" {
  function_name = "prod-order-processor"
}

resource "aws_security_group" "web_server_sg" {
  name        = "prod-web-server-sg"
  description = "Security group for production web servers"
}
```

## Recommended Naming Pattern

```
{org}-{environment}-{purpose}-{region}-{instance}
```

| Component | Examples | Required |
|-----------|----------|----------|
| org | acme, myco | Optional |
| environment | prod, staging, dev | Yes |
| purpose | web, api, db, cache | Yes |
| region | use1, usw2, euw1 | Situational |
| instance | 001, blue, primary | Situational |

## Terraform Resource Names

```hcl
# Use snake_case for Terraform names
resource "aws_vpc" "main" {}              # Simple, single VPC
resource "aws_vpc" "application" {}        # Descriptive purpose
resource "aws_subnet" "public_a" {}        # Include zone/purpose
resource "aws_subnet" "private_database" {}

# Avoid
resource "aws_vpc" "VPC" {}               # Redundant, poor casing
resource "aws_subnet" "subnet1" {}         # Non-descriptive
```

## Using Locals for Consistency

```hcl
locals {
  name_prefix = "${var.org}-${var.environment}"
  
  common_tags = {
    Environment = var.environment
    Project     = var.project
    ManagedBy   = "terraform"
  }
}

resource "aws_instance" "web" {
  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-web-server"
  })
}

resource "aws_s3_bucket" "logs" {
  bucket = "${local.name_prefix}-logs-${data.aws_region.current.name}"
  tags   = local.common_tags
}
```

## References

- [AWS Tagging Best Practices](https://docs.aws.amazon.com/general/latest/gr/aws_tagging.html)
- [Terraform Style Guide](https://developer.hashicorp.com/terraform/language/style)
