# language-locals

**Priority:** MEDIUM  
**Category:** Language Best Practices

## Why It Matters

Using `locals` improves code readability by giving names to complex expressions. It reduces duplication, makes code self-documenting, and centralizes computed values.

## Incorrect

```hcl
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = var.instance_type

  tags = {
    Name        = "${var.project}-${var.environment}-web"
    Environment = var.environment
    Project     = var.project
    ManagedBy   = "terraform"
  }
}

resource "aws_security_group" "web" {
  name = "${var.project}-${var.environment}-web-sg"

  tags = {
    Name        = "${var.project}-${var.environment}-web-sg"
    Environment = var.environment
    Project     = var.project
    ManagedBy   = "terraform"
  }
}

resource "aws_lb" "web" {
  name = "${var.project}-${var.environment}-alb"

  tags = {
    Name        = "${var.project}-${var.environment}-alb"
    Environment = var.environment
    Project     = var.project
    ManagedBy   = "terraform"
  }
}
```

**Problems:**
- Duplicated tag blocks across resources
- Name pattern repeated multiple times
- Changes require updating many places

## Correct

```hcl
locals {
  name_prefix = "${var.project}-${var.environment}"
  
  common_tags = {
    Environment = var.environment
    Project     = var.project
    ManagedBy   = "terraform"
  }
}

resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = var.instance_type

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-web"
  })
}

resource "aws_security_group" "web" {
  name = "${local.name_prefix}-web-sg"

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-web-sg"
  })
}

resource "aws_lb" "web" {
  name = "${local.name_prefix}-alb"

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-alb"
  })
}
```

## Use Cases for Locals

### Name Complex Expressions

```hcl
locals {
  # Instead of repeating this expression
  is_production = var.environment == "prod" || var.environment == "production"
  
  # Calculate subnet CIDRs
  subnet_cidrs = [for i in range(var.subnet_count) : cidrsubnet(var.vpc_cidr, 8, i)]
  
  # Build ARN pattern
  log_group_arn = "arn:aws:logs:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:log-group:/aws/lambda/${var.function_name}:*"
}

resource "aws_lambda_function" "main" {
  function_name = var.function_name
  # ...
  
  environment {
    variables = {
      LOG_LEVEL = local.is_production ? "INFO" : "DEBUG"
    }
  }
}
```

### Centralize Computed Values

```hcl
data "aws_region" "current" {}
data "aws_caller_identity" "current" {}

locals {
  account_id = data.aws_caller_identity.current.account_id
  region     = data.aws_region.current.name
  
  # Build resource ARNs
  bucket_arn = "arn:aws:s3:::${var.bucket_name}"
  table_arn  = "arn:aws:dynamodb:${local.region}:${local.account_id}:table/${var.table_name}"
}
```

### Transform Input Data

```hcl
variable "users" {
  type = list(object({
    name  = string
    email = string
    role  = string
  }))
}

locals {
  # Create lookup maps
  users_by_name = { for user in var.users : user.name => user }
  users_by_role = { for user in var.users : user.role => user... }
  
  # Filter lists
  admin_users = [for user in var.users : user if user.role == "admin"]
  
  # Extract values
  all_emails = [for user in var.users : user.email]
}
```

### Conditional Logic

```hcl
variable "enable_https" {
  type    = bool
  default = true
}

variable "custom_domain" {
  type    = string
  default = null
}

locals {
  # Compute derived values
  protocol    = var.enable_https ? "https" : "http"
  default_port = var.enable_https ? 443 : 80
  
  # Handle optional values
  domain = coalesce(var.custom_domain, "${var.app_name}.example.com")
  
  # Build URLs
  app_url = "${local.protocol}://${local.domain}"
}
```

## Organize Locals

```hcl
locals {
  # Naming
  name_prefix = "${var.project}-${var.environment}"
  
  # Tags
  common_tags = {
    Environment = var.environment
    Project     = var.project
    ManagedBy   = "terraform"
  }
}

locals {
  # Network calculations
  vpc_cidr        = var.vpc_cidr
  public_subnets  = [for i in range(3) : cidrsubnet(local.vpc_cidr, 4, i)]
  private_subnets = [for i in range(3) : cidrsubnet(local.vpc_cidr, 4, i + 3)]
}

locals {
  # Feature flags
  is_production    = var.environment == "prod"
  enable_monitoring = local.is_production
  enable_backups   = local.is_production
}
```

## References

- [Local Values](https://developer.hashicorp.com/terraform/language/values/locals)
- [Expressions](https://developer.hashicorp.com/terraform/language/expressions)
