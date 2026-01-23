# Terraform Best Practices - Full Reference

Comprehensive optimization guide for Terraform and Infrastructure as Code, maintained by Terramate.

---

# language-data-sources

**Priority:** MEDIUM  
**Category:** Language Best Practices

## Why It Matters

Data sources fetch information dynamically instead of hardcoding values. This makes configurations more portable, self-documenting, and less prone to errors from stale or incorrect values.

## Incorrect

```hcl
# Hardcoded values that can become stale or incorrect
resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"  # What region? What OS? Still valid?
  instance_type = "t3.micro"
  subnet_id     = "subnet-abc123def456"    # What if this changes?
}

resource "aws_iam_role_policy" "app" {
  policy = jsonencode({
    Statement = [{
      Effect   = "Allow"
      Action   = ["s3:GetObject"]
      Resource = "arn:aws:s3:::my-bucket/*"  # Hardcoded account assumed
    }]
  })
}

# Hardcoded account ID
locals {
  account_id = "123456789012"  # Copy-pasted, easy to get wrong
}
```

**Problems:**
- AMI IDs vary by region
- Values become stale over time
- Hardcoded IDs can be wrong
- Not portable across environments

## Correct

### Dynamic AMI Lookup

```hcl
# Always get the latest Amazon Linux 2 AMI for current region
data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-*-x86_64-gp2"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

resource "aws_instance" "web" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t3.micro"
}
```

### Current Account and Region

```hcl
# Get current AWS account ID dynamically
data "aws_caller_identity" "current" {}

# Get current region
data "aws_region" "current" {}

locals {
  account_id = data.aws_caller_identity.current.account_id
  region     = data.aws_region.current.name
}

resource "aws_iam_role_policy" "app" {
  policy = jsonencode({
    Statement = [{
      Effect   = "Allow"
      Action   = ["s3:GetObject"]
      Resource = "arn:aws:s3:::${local.account_id}-app-data/*"
    }]
  })
}
```

### Availability Zones

```hcl
# Get available AZs in current region
data "aws_availability_zones" "available" {
  state = "available"
}

resource "aws_subnet" "private" {
  count             = 3
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index)
  availability_zone = data.aws_availability_zones.available.names[count.index]
}
```

### Reference Existing Resources

```hcl
# Look up existing VPC by tag
data "aws_vpc" "main" {
  filter {
    name   = "tag:Name"
    values = ["production-vpc"]
  }
}

# Look up existing subnets
data "aws_subnets" "private" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.main.id]
  }

  filter {
    name   = "tag:Tier"
    values = ["private"]
  }
}

resource "aws_instance" "web" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t3.micro"
  subnet_id     = data.aws_subnets.private.ids[0]
}
```

### IAM Policy Documents

```hcl
# Use data source instead of JSON strings
data "aws_iam_policy_document" "s3_read" {
  statement {
    effect = "Allow"
    
    actions = [
      "s3:GetObject",
      "s3:ListBucket"
    ]
    
    resources = [
      aws_s3_bucket.data.arn,
      "${aws_s3_bucket.data.arn}/*"
    ]
  }
}

resource "aws_iam_role_policy" "app" {
  name   = "s3-read-policy"
  role   = aws_iam_role.app.id
  policy = data.aws_iam_policy_document.s3_read.json
}
```

### Cross-Account Data

```hcl
# Reference resources from another account
data "aws_secretsmanager_secret" "shared" {
  provider = aws.shared_services
  name     = "shared/api-key"
}

# Reference from another Terraform state
data "terraform_remote_state" "networking" {
  backend = "s3"
  
  config = {
    bucket = "terraform-state"
    key    = "networking/terraform.tfstate"
    region = "us-east-1"
  }
}

resource "aws_instance" "web" {
  subnet_id = data.terraform_remote_state.networking.outputs.private_subnet_ids[0]
}
```

### Common Data Sources

| Use Case | Data Source |
|----------|-------------|
| Current account | `aws_caller_identity` |
| Current region | `aws_region` |
| Availability zones | `aws_availability_zones` |
| Latest AMI | `aws_ami` |
| Existing VPC | `aws_vpc` |
| Existing subnets | `aws_subnets` |
| IAM policy | `aws_iam_policy_document` |
| Secrets | `aws_secretsmanager_secret_version` |
| SSM parameters | `aws_ssm_parameter` |
| Route53 zone | `aws_route53_zone` |
| ACM certificate | `aws_acm_certificate` |

### GCP Data Sources

```hcl
data "google_project" "current" {}

data "google_compute_zones" "available" {
  region = var.region
}

data "google_compute_image" "debian" {
  family  = "debian-11"
  project = "debian-cloud"
}
```

### Azure Data Sources

```hcl
data "azurerm_subscription" "current" {}

data "azurerm_client_config" "current" {}

data "azurerm_resource_group" "existing" {
  name = "my-resource-group"
}
```

## References

- [Data Sources](https://developer.hashicorp.com/terraform/language/data-sources)
- [AWS Data Sources](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)


---

# language-dynamic-blocks

**Priority:** MEDIUM  
**Category:** Language Best Practices

## Why It Matters

Dynamic blocks generate repeated nested blocks based on variables, eliminating code duplication and enabling flexible configurations. They're essential for DRY (Don't Repeat Yourself) Terraform code.

## Incorrect

```hcl
# Hardcoded ingress rules - not flexible
resource "aws_security_group" "web" {
  name = "web-sg"

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/8"]
  }

  # Adding new rules requires changing the resource
}
```

**Problems:**
- Adding rules requires code changes
- Can't vary rules by environment
- Code duplication
- Not reusable

## Correct

### Basic Dynamic Block

```hcl
variable "ingress_rules" {
  type = list(object({
    port        = number
    protocol    = string
    cidr_blocks = list(string)
    description = string
  }))
  default = [
    {
      port        = 80
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
      description = "HTTP"
    },
    {
      port        = 443
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
      description = "HTTPS"
    }
  ]
}

resource "aws_security_group" "web" {
  name        = "web-sg"
  description = "Web server security group"
  vpc_id      = var.vpc_id

  dynamic "ingress" {
    for_each = var.ingress_rules
    content {
      from_port   = ingress.value.port
      to_port     = ingress.value.port
      protocol    = ingress.value.protocol
      cidr_blocks = ingress.value.cidr_blocks
      description = ingress.value.description
    }
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

### Conditional Dynamic Blocks

```hcl
variable "enable_https" {
  type    = bool
  default = true
}

variable "allowed_ssh_cidrs" {
  type    = list(string)
  default = []  # Empty = no SSH access
}

resource "aws_security_group" "web" {
  name   = "web-sg"
  vpc_id = var.vpc_id

  # Always allow HTTP
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Conditionally allow HTTPS
  dynamic "ingress" {
    for_each = var.enable_https ? [1] : []
    content {
      from_port   = 443
      to_port     = 443
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
    }
  }

  # Conditionally allow SSH (only if CIDRs provided)
  dynamic "ingress" {
    for_each = length(var.allowed_ssh_cidrs) > 0 ? [1] : []
    content {
      from_port   = 22
      to_port     = 22
      protocol    = "tcp"
      cidr_blocks = var.allowed_ssh_cidrs
    }
  }
}
```

### Dynamic Blocks with Maps

```hcl
variable "ingress_rules" {
  type = map(object({
    port        = number
    protocol    = string
    cidr_blocks = list(string)
  }))
  default = {
    http = {
      port        = 80
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
    }
    https = {
      port        = 443
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
    }
  }
}

resource "aws_security_group" "web" {
  name   = "web-sg"
  vpc_id = var.vpc_id

  dynamic "ingress" {
    for_each = var.ingress_rules
    content {
      from_port   = ingress.value.port
      to_port     = ingress.value.port
      protocol    = ingress.value.protocol
      cidr_blocks = ingress.value.cidr_blocks
      description = ingress.key  # Use map key as description
    }
  }
}
```

### Nested Dynamic Blocks

```hcl
variable "load_balancer_config" {
  type = object({
    listeners = list(object({
      port     = number
      protocol = string
      actions = list(object({
        type             = string
        target_group_arn = string
      }))
    }))
  })
}

resource "aws_lb_listener" "main" {
  for_each = { for l in var.load_balancer_config.listeners : l.port => l }

  load_balancer_arn = aws_lb.main.arn
  port              = each.value.port
  protocol          = each.value.protocol

  dynamic "default_action" {
    for_each = each.value.actions
    content {
      type             = default_action.value.type
      target_group_arn = default_action.value.target_group_arn
    }
  }
}
```

### Dynamic Blocks for Settings

```hcl
variable "enable_encryption" {
  type    = bool
  default = true
}

variable "kms_key_id" {
  type    = string
  default = null
}

resource "aws_db_instance" "main" {
  identifier     = "mydb"
  engine         = "postgres"
  instance_class = "db.t3.micro"

  # Conditional encryption block
  dynamic "restore_to_point_in_time" {
    for_each = var.restore_from_snapshot != null ? [1] : []
    content {
      source_db_instance_identifier = var.restore_from_snapshot
      restore_time                  = var.restore_time
    }
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "main" {
  bucket = aws_s3_bucket.main.id

  dynamic "rule" {
    for_each = var.enable_encryption ? [1] : []
    content {
      apply_server_side_encryption_by_default {
        sse_algorithm     = var.kms_key_id != null ? "aws:kms" : "AES256"
        kms_master_key_id = var.kms_key_id
      }
    }
  }
}
```

### ECS Container Definitions

```hcl
variable "containers" {
  type = list(object({
    name   = string
    image  = string
    cpu    = number
    memory = number
    ports  = list(number)
    env    = map(string)
  }))
}

resource "aws_ecs_task_definition" "app" {
  family                   = "app"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 256
  memory                   = 512

  container_definitions = jsonencode([
    for container in var.containers : {
      name      = container.name
      image     = container.image
      cpu       = container.cpu
      memory    = container.memory
      essential = true
      
      portMappings = [
        for port in container.ports : {
          containerPort = port
          protocol      = "tcp"
        }
      ]
      
      environment = [
        for key, value in container.env : {
          name  = key
          value = value
        }
      ]
    }
  ])
}
```

## When Not to Use Dynamic Blocks

```hcl
# If you only have 1-2 static blocks, just write them out
# Dynamic blocks add complexity - use only when needed

resource "aws_security_group" "simple" {
  name = "simple-sg"

  # Just two rules? Write them explicitly
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

## References

- [Dynamic Blocks](https://developer.hashicorp.com/terraform/language/expressions/dynamic-blocks)
- [for_each Meta-Argument](https://developer.hashicorp.com/terraform/language/meta-arguments/for_each)


---

# language-linting

**Priority:** MEDIUM  
**Category:** Language Best Practices

## Why It Matters

Consistent formatting improves readability and reduces merge conflicts. Linting catches common errors before they reach production. Automate these checks in CI/CD and pre-commit hooks.

## Incorrect

```hcl
# Inconsistent formatting, no linting
resource "aws_instance" "web" {
ami           = var.ami_id
  instance_type="t3.micro"
    tags={Name="web"}
}

# No pre-commit hooks
# No CI checks
# Errors discovered in production
```

## Correct

```bash
# Run format and lint before every commit
terraform fmt -recursive
tflint --recursive
terraform validate
```

## terraform fmt

Run `terraform fmt` before every commit to ensure consistent formatting.

```bash
# Format current directory
terraform fmt

# Format recursively
terraform fmt -recursive

# Check formatting without changing files (useful for CI)
terraform fmt -check -recursive

# Show diff of changes
terraform fmt -diff
```

### Pre-commit Hook

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/antonbabenko/pre-commit-terraform
    rev: v1.83.5
    hooks:
      - id: terraform_fmt
      - id: terraform_validate
      - id: terraform_tflint
```

Install and run:

```bash
pip install pre-commit
pre-commit install
pre-commit run --all-files
```

## terraform validate

Validates configuration syntax and internal consistency:

```bash
terraform init -backend=false
terraform validate
```

### CI Pipeline

```yaml
# .github/workflows/terraform.yml
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: hashicorp/setup-terraform@v3
      
      - name: Terraform Format Check
        run: terraform fmt -check -recursive
        
      - name: Terraform Init
        run: terraform init -backend=false
        
      - name: Terraform Validate
        run: terraform validate
```

## tflint

TFLint catches errors that `terraform validate` misses:

```bash
# Install
brew install tflint  # macOS
# or
curl -s https://raw.githubusercontent.com/terraform-linters/tflint/master/install_linux.sh | bash

# Run
tflint --init
tflint
```

### Configuration

```hcl
# .tflint.hcl
config {
  plugin_dir = "~/.tflint.d/plugins"
  
  # Enable module inspection
  module = true
}

# AWS-specific rules
plugin "aws" {
  enabled = true
  version = "0.27.0"
  source  = "github.com/terraform-linters/tflint-ruleset-aws"
}

# Enforce naming conventions
rule "terraform_naming_convention" {
  enabled = true
}

# Require descriptions
rule "terraform_documented_variables" {
  enabled = true
}

rule "terraform_documented_outputs" {
  enabled = true
}

# Require type declarations
rule "terraform_typed_variables" {
  enabled = true
}
```

### Common tflint Rules

```hcl
# Catch invalid instance types
rule "aws_instance_invalid_type" {
  enabled = true
}

# Warn about deprecated resources
rule "terraform_deprecated_interpolation" {
  enabled = true
}

# Enforce standard module structure
rule "terraform_standard_module_structure" {
  enabled = true
}
```

## .editorconfig

Ensure consistent whitespace across editors:

```ini
# .editorconfig
root = true

[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true

[*.tf]
indent_size = 2

[*.md]
trim_trailing_whitespace = false

[Makefile]
indent_style = tab
```

## Complete CI Workflow

```yaml
name: Terraform CI

on:
  pull_request:
    paths:
      - '**.tf'
      - '**.tfvars'

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.6.0

      - name: Terraform Format
        run: terraform fmt -check -recursive -diff

      - name: Setup TFLint
        uses: terraform-linters/setup-tflint@v4

      - name: Init TFLint
        run: tflint --init

      - name: Run TFLint
        run: tflint --recursive

      - name: Terraform Init
        run: terraform init -backend=false

      - name: Terraform Validate
        run: terraform validate
```

## Makefile for Local Development

```makefile
.PHONY: fmt lint validate

fmt:
	terraform fmt -recursive

lint: fmt
	tflint --recursive

validate: lint
	terraform init -backend=false
	terraform validate

check: validate
	@echo "All checks passed!"
```

## References

- [terraform fmt](https://developer.hashicorp.com/terraform/cli/commands/fmt)
- [terraform validate](https://developer.hashicorp.com/terraform/cli/commands/validate)
- [TFLint](https://github.com/terraform-linters/tflint)
- [pre-commit-terraform](https://github.com/antonbabenko/pre-commit-terraform)


---

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


---

# language-no-heredoc-json

**Priority:** MEDIUM  
**Category:** Language Best Practices

## Why It Matters

HEREDOC strings for JSON, YAML, and IAM policies are error-prone, hard to validate, and don't benefit from Terraform's type checking. Use native functions and resources instead.

## Incorrect

```hcl
resource "aws_iam_role_policy" "lambda" {
  name = "lambda-policy"
  role = aws_iam_role.lambda.id

  # HEREDOC JSON - hard to maintain, no validation
  policy = <<-EOF
    {
      "Version": "2012-10-17",
      "Statement": [
        {
          "Effect": "Allow",
          "Action": [
            "s3:GetObject",
            "s3:PutObject"
          ],
          "Resource": "arn:aws:s3:::${var.bucket_name}/*"
        }
      ]
    }
  EOF
}

resource "kubernetes_config_map" "config" {
  metadata {
    name = "app-config"
  }

  # HEREDOC YAML - interpolation issues, no validation
  data = {
    "config.yaml" = <<-EOF
      database:
        host: ${var.db_host}
        port: 5432
      logging:
        level: info
    EOF
  }
}
```

**Problems:**
- No syntax validation until apply
- Difficult to maintain complex structures
- Interpolation can break JSON/YAML syntax
- No IDE support for structure

## Correct

### Use jsonencode() for JSON

```hcl
resource "aws_iam_role_policy" "lambda" {
  name = "lambda-policy"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject"
        ]
        Resource = "arn:aws:s3:::${var.bucket_name}/*"
      }
    ]
  })
}
```

### Use IAM Policy Document Resource

```hcl
data "aws_iam_policy_document" "lambda" {
  statement {
    effect = "Allow"
    actions = [
      "s3:GetObject",
      "s3:PutObject"
    ]
    resources = ["arn:aws:s3:::${var.bucket_name}/*"]
  }

  statement {
    effect = "Allow"
    actions = [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents"
    ]
    resources = ["arn:aws:logs:*:*:*"]
  }
}

resource "aws_iam_role_policy" "lambda" {
  name   = "lambda-policy"
  role   = aws_iam_role.lambda.id
  policy = data.aws_iam_policy_document.lambda.json
}
```

### Use yamlencode() for YAML

```hcl
resource "kubernetes_config_map" "config" {
  metadata {
    name = "app-config"
  }

  data = {
    "config.yaml" = yamlencode({
      database = {
        host = var.db_host
        port = 5432
      }
      logging = {
        level = "info"
      }
    })
  }
}
```

### Use templatefile() for Complex Templates

```hcl
# templates/user-data.sh
#!/bin/bash
echo "Environment: ${environment}"
echo "Region: ${region}"
apt-get update && apt-get install -y ${packages}

# main.tf
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = var.instance_type

  user_data = templatefile("${path.module}/templates/user-data.sh", {
    environment = var.environment
    region      = var.region
    packages    = join(" ", var.packages)
  })
}
```

## When HEREDOC is Acceptable

Use indented HEREDOC (`<<-EOT`) for:
- Plain text descriptions
- Shell scripts (when templatefile is overkill)
- Multi-line strings without structure

```hcl
resource "aws_sns_topic" "alerts" {
  name = "alerts"
}

output "usage_instructions" {
  value = <<-EOT
    To subscribe to alerts:
    1. Go to the AWS Console
    2. Navigate to SNS
    3. Subscribe to topic: ${aws_sns_topic.alerts.arn}
  EOT
  description = "Instructions for subscribing to alerts"
}
```

## References

- [jsonencode Function](https://developer.hashicorp.com/terraform/language/functions/jsonencode)
- [yamlencode Function](https://developer.hashicorp.com/terraform/language/functions/yamlencode)
- [templatefile Function](https://developer.hashicorp.com/terraform/language/functions/templatefile)
- [aws_iam_policy_document](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document)


---

# module-composition

**Priority:** HIGH  
**Category:** Module Design

## Why It Matters

Composable modules can be combined like building blocks to create complex infrastructure. This enables reuse, reduces duplication, and makes infrastructure easier to understand and maintain.

## Incorrect

```hcl
# monolithic module that does everything
module "infrastructure" {
  source = "./modules/infrastructure"
  
  # VPC settings
  vpc_cidr = "10.0.0.0/16"
  
  # EKS settings
  cluster_name    = "prod"
  node_count      = 3
  
  # RDS settings
  db_name         = "myapp"
  db_instance_class = "db.t3.medium"
  
  # ElastiCache settings
  cache_node_type = "cache.t3.micro"
  
  # ... 50 more variables
}
```

**Problems:**
- Cannot use VPC without also creating EKS, RDS, etc.
- Changes to any component affect the entire module
- Testing requires provisioning everything
- Difficult to understand and maintain

## Correct

### Design Modules with Clear Outputs

Each module should expose outputs that other modules can consume:

```hcl
# Networking module exposes IDs for composition
output "vpc_id" {
  value       = aws_vpc.main.id
  description = "VPC ID for use by other modules"
}

output "public_subnet_ids" {
  value       = [for s in aws_subnet.public : s.id]
  description = "Public subnet IDs"
}

output "private_subnet_ids" {
  value       = [for s in aws_subnet.private : s.id]
  description = "Private subnet IDs"
}
```

### Compose Modules via Outputs

```hcl
# Root module wires modules together via outputs
module "networking" {
  source = "./modules/networking"
  
  vpc_cidr           = "10.0.0.0/16"
  availability_zones = var.availability_zones
}

module "eks" {
  source = "./modules/eks"
  
  cluster_name = "${var.project}-cluster"
  vpc_id       = module.networking.vpc_id           # Output → Input
  subnet_ids   = module.networking.private_subnet_ids
}

module "database" {
  source = "./modules/rds"
  
  identifier     = "${var.project}-db"
  vpc_id         = module.networking.vpc_id
  subnet_ids     = module.networking.private_subnet_ids
  
  # Cross-module reference
  allowed_security_groups = [module.eks.node_security_group_id]
}
```

## Composition Patterns

### Use Shared Data via Locals

```hcl
locals {
  common_tags = {
    Environment = var.environment
    Project     = var.project
  }
}

module "vpc" {
  source = "./modules/vpc"
  tags   = local.common_tags
}

module "eks" {
  source = "./modules/eks"
  tags   = local.common_tags
}
```

### Optional Components with count

```hcl
module "monitoring" {
  source = "./modules/monitoring"
  count  = var.enable_monitoring ? 1 : 0
  
  vpc_id = module.vpc.vpc_id
}
```

## Module Interface Design

Keep interfaces minimal - expose what's needed, hide implementation details:

```hcl
# Good - focused interface with sensible defaults
module "s3_bucket" {
  source = "./modules/s3"
  
  name       = "my-bucket"
  versioning = true
}

# Avoid - leaky abstraction exposing every option
module "s3_bucket" {
  source = "./modules/s3"
  
  name               = "my-bucket"
  versioning         = true
  lifecycle_rules    = [...]
  cors_rules         = [...]
  replication_config = {...}
  # Exposing every S3 option defeats the purpose of abstraction
}
```

## References

- [Module Composition](https://developer.hashicorp.com/terraform/language/modules/develop/composition)
- [Module Structure](https://developer.hashicorp.com/terraform/language/modules/develop/structure)


---

# module-registry

**Priority:** HIGH  
**Category:** Module Design

## Why It Matters

Don't reinvent the wheel. Community and shared modules are battle-tested, maintained, and save significant development time. Use existing modules for common patterns and focus your effort on business-specific infrastructure.

## Incorrect

```hcl
# Writing VPC from scratch when well-maintained modules exist
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true
}

resource "aws_subnet" "public" {
  count             = 3
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index)
  availability_zone = data.aws_availability_zones.available.names[count.index]
  # ... 200 more lines of networking code
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
}

# ... NAT gateways, route tables, NACLs, etc.
```

**Problems:**
- Time spent on solved problems
- Missing edge cases the community has already handled
- Maintenance burden on your team
- Potential security gaps

## Correct

### Use Terraform Registry Modules

```hcl
# Well-maintained VPC module with all best practices built in
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.1.2"

  name = "${var.project}-${var.environment}"
  cidr = var.vpc_cidr

  azs             = ["us-east-1a", "us-east-1b", "us-east-1c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = var.environment != "prod"

  tags = local.common_tags
}
```

### Popular Community Modules

| Use Case | Module |
|----------|--------|
| AWS VPC | `terraform-aws-modules/vpc/aws` |
| AWS EKS | `terraform-aws-modules/eks/aws` |
| AWS RDS | `terraform-aws-modules/rds/aws` |
| AWS Lambda | `terraform-aws-modules/lambda/aws` |
| AWS S3 | `terraform-aws-modules/s3-bucket/aws` |
| GCP Network | `terraform-google-modules/network/google` |
| GCP GKE | `terraform-google-modules/kubernetes-engine/google` |
| Azure VNet | `Azure/vnet/azurerm` |
| Azure AKS | `Azure/aks/azurerm` |

### Evaluate Before Using

Before adopting a community module:

```bash
# Check module quality
# 1. Stars/downloads on registry
# 2. Recent updates (actively maintained?)
# 3. Open issues count
# 4. Documentation quality
# 5. Test coverage
```

### When to Write Your Own

Write custom modules when:
- No existing module fits your use case
- Security requirements prevent external dependencies
- You need tight control over implementation
- The community module is unmaintained

```hcl
# Custom module for organization-specific patterns
module "company_standard_app" {
  source = "./modules/standard-app"
  
  name        = "billing-service"
  environment = var.environment
  
  # Company-specific defaults baked in
}
```

### Private Module Registry

For internal modules, use a private registry:

```hcl
# Terraform Cloud/Enterprise private registry
module "internal_vpc" {
  source  = "app.terraform.io/my-org/vpc/aws"
  version = "1.0.0"
}

# Git source for private modules
module "internal_vpc" {
  source = "git::https://github.com/my-org/terraform-modules.git//vpc?ref=v1.0.0"
}

# S3 source
module "internal_vpc" {
  source = "s3::https://s3-us-east-1.amazonaws.com/my-modules/vpc.zip"
}
```

### Wrapping Community Modules

Add organization defaults on top of community modules:

```hcl
# Thin wrapper module that enforces company standards
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.1.2"

  name = var.name
  cidr = var.cidr

  # Company standard: always enable DNS
  enable_dns_hostnames = true
  enable_dns_support   = true

  # Company standard: flow logs required
  enable_flow_log                      = true
  create_flow_log_cloudwatch_log_group = true
  create_flow_log_cloudwatch_iam_role  = true

  # Pass through other variables
  azs             = var.azs
  private_subnets = var.private_subnets
  public_subnets  = var.public_subnets

  tags = merge(var.tags, {
    ManagedBy = "terraform"
  })
}
```

## References

- [Terraform Registry](https://registry.terraform.io/)
- [AWS Modules](https://registry.terraform.io/namespaces/terraform-aws-modules)
- [Google Modules](https://registry.terraform.io/namespaces/terraform-google-modules)
- [Azure Modules](https://registry.terraform.io/namespaces/Azure)


---

# module-single-responsibility

**Priority:** HIGH  
**Category:** Module Design

## Why It Matters

Modules that do too much become difficult to understand, test, and reuse. Each module should have a single, well-defined purpose.

## Incorrect

```hcl
# modules/everything/main.tf
# This module does too much

resource "aws_vpc" "main" {
  cidr_block = var.vpc_cidr
}

resource "aws_subnet" "public" {
  count  = 3
  vpc_id = aws_vpc.main.id
  # ...
}

resource "aws_eks_cluster" "cluster" {
  name = var.cluster_name
  # ...
}

resource "aws_rds_cluster" "database" {
  cluster_identifier = var.db_name
  # ...
}

resource "aws_elasticache_cluster" "cache" {
  cluster_id = var.cache_name
  # ...
}

resource "aws_lambda_function" "api" {
  function_name = var.lambda_name
  # ...
}
```

**Problem:** This "god module" handles networking, compute, databases, caching, and serverless. Changes to any component affect the entire module.

## Correct

```hcl
# Networking module - does ONE thing: creates VPC and subnets
resource "aws_vpc" "main" {
  cidr_block = var.vpc_cidr
  tags       = var.tags
}

resource "aws_subnet" "public" {
  count      = length(var.public_subnet_cidrs)
  vpc_id     = aws_vpc.main.id
  cidr_block = var.public_subnet_cidrs[count.index]
}

output "vpc_id" {
  value = aws_vpc.main.id
}

output "public_subnet_ids" {
  value = aws_subnet.public[*].id
}
```

```hcl
# EKS module - does ONE thing: creates Kubernetes cluster
resource "aws_eks_cluster" "cluster" {
  name     = var.cluster_name
  role_arn = var.cluster_role_arn
  
  vpc_config {
    subnet_ids = var.subnet_ids
  }
}
```

```hcl
# Root module - composes focused modules together
module "networking" {
  source = "./modules/networking"
  
  vpc_cidr            = "10.0.0.0/16"
  public_subnet_cidrs = ["10.0.1.0/24", "10.0.2.0/24"]
}

module "eks" {
  source = "./modules/eks"
  
  cluster_name     = "prod-cluster"
  subnet_ids       = module.networking.public_subnet_ids
  cluster_role_arn = module.iam.eks_cluster_role_arn
}

module "database" {
  source = "./modules/rds"
  
  db_name    = "prod-db"
  vpc_id     = module.networking.vpc_id
  subnet_ids = module.networking.private_subnet_ids
}
```

## Guidelines

1. **One logical component per module** - VPC, EKS cluster, RDS database
2. **Clear inputs and outputs** - Module interface should be obvious
3. **Composable** - Modules should work together via outputs/inputs
4. **Testable** - Each module can be tested independently
5. **Reusable** - Same module works across environments

## Module Size Heuristics

- **Too small:** Single resource with no logic
- **Right size:** 5-20 resources with clear purpose
- **Too large:** 50+ resources or multiple unrelated components

## References

- [Module Composition](https://developer.hashicorp.com/terraform/language/modules/develop/composition)


---

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


---

# org-access-control

**Priority:** HIGH  
**Category:** Organization & Workflow

## Why It Matters

Not everyone should be able to modify all infrastructure. Access control ensures changes are made by authorized personnel, protects production environments, and creates accountability.

## Incorrect

```bash
# Everyone has admin access to everything
# Shared AWS credentials in wiki
# No distinction between dev and prod access
# Anyone can run terraform apply in production
```

**Problems:**
- No accountability for changes
- Accidental production modifications
- No separation of duties
- Compliance violations

## Correct

### Principle of Least Privilege

Grant minimum permissions required for each role:

| Role | Dev | Staging | Prod |
|------|-----|---------|------|
| Junior Engineer | Apply | Plan only | Read only |
| Senior Engineer | Apply | Apply | Plan + Review |
| Tech Lead | Admin | Admin | Apply |
| Platform Team | Admin | Admin | Admin |

### Separate Credentials Per Environment

```hcl
# dev account
provider "aws" {
  alias   = "dev"
  region  = "us-east-1"
  profile = "company-dev"  # Limited permissions
}

# prod account
provider "aws" {
  alias   = "prod"
  region  = "us-east-1"
  profile = "company-prod"  # Requires MFA, stricter controls
}
```

### Use IAM Roles, Not Long-Lived Keys

```hcl
# CI/CD assumes role with limited permissions
provider "aws" {
  region = "us-east-1"
  
  assume_role {
    role_arn     = "arn:aws:iam::123456789:role/TerraformDeployRole"
    session_name = "terraform-ci"
  }
}
```

### Environment-Specific IAM Policies

```hcl
# Role for dev environment - broader permissions
resource "aws_iam_role" "terraform_dev" {
  name = "terraform-dev-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { AWS = "arn:aws:iam::${var.dev_account_id}:root" }
      Action    = "sts:AssumeRole"
    }]
  })
}

# Role for prod environment - restricted permissions
resource "aws_iam_role" "terraform_prod" {
  name = "terraform-prod-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { AWS = "arn:aws:iam::${var.prod_account_id}:root" }
      Action    = "sts:AssumeRole"
      Condition = {
        Bool = { "aws:MultiFactorAuthPresent" = "true" }  # Require MFA
      }
    }]
  })
}
```

### Restrict Direct Console/CLI Access

Once Terraform manages infrastructure:

1. Remove direct console access for most users
2. Use Terraform as the single workflow for changes
3. Enable read-only console access for troubleshooting
4. Audit any manual changes

```hcl
# Read-only policy for console access
data "aws_iam_policy_document" "readonly" {
  statement {
    effect = "Allow"
    actions = [
      "ec2:Describe*",
      "rds:Describe*",
      "s3:Get*",
      "s3:List*"
    ]
    resources = ["*"]
  }
  
  statement {
    effect = "Deny"
    actions = [
      "ec2:*",
      "rds:*",
      "s3:Put*",
      "s3:Delete*"
    ]
    resources = ["*"]
  }
}
```

### Git Branch Protection

```yaml
# .github/CODEOWNERS
# Require review from platform team for production changes
*prod* @platform-team
# Require review for shared modules
**/modules/** @platform-team @senior-engineers
```

### CI/CD Access Control

```yaml
# GitHub Actions - different permissions per environment
jobs:
  deploy-dev:
    if: github.ref == 'refs/heads/develop'
    environment: dev  # No approval needed
    
  deploy-prod:
    if: github.ref == 'refs/heads/main'
    environment: prod
    # Requires manual approval in GitHub environment settings
```

### Multi-Account Strategy

```
Organization
├── Management Account (billing, organization policies)
├── Security Account (audit logs, security tools)
├── Shared Services Account (CI/CD, artifact storage)
├── Dev Account (development workloads)
├── Staging Account (pre-production testing)
└── Prod Account (production workloads)
```

## Backend Options with Access Control

Several remote backends support access control:

- **S3 + IAM** - AWS-native, use IAM policies
- **GCS + IAM** - GCP-native, use IAM policies
- **Azure Blob + RBAC** - Azure-native
- **Terraform Cloud/Enterprise** - Built-in team permissions
- **Terramate Cloud** - GitOps-native with stack-level permissions

## References

- [AWS Multi-Account Strategy](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_best-practices.html)
- [HashiCorp Access Control Recommendations](https://developer.hashicorp.com/terraform/cloud-docs/recommended-practices/part1#personas-responsibilities-and-desired-user-experiences)


---

# org-audit-logging

**Priority:** MEDIUM-HIGH  
**Category:** Organization & Workflow

## Why It Matters

Audit logs provide accountability, support troubleshooting, enable compliance, and help with security investigations. Track all infrastructure changes and who made them.

## Incorrect

```bash
# No logging in place
# "Who changed the security group last week?"
# "I don't know, check with everyone on the team"

# Manual changelog
# Shared doc that nobody updates consistently
```

**Problems:**
- Can't determine who made changes
- Can't troubleshoot issues
- Compliance violations
- Security blind spots

## Correct

### Layer 1: Version Control History

```bash
# Git log shows who changed infrastructure code
git log --oneline --all -- '*.tf'

# Show changes for specific file
git log -p -- modules/networking/main.tf

# Find who introduced a specific change
git blame main.tf
```

### Layer 2: Cloud Provider Audit Logs

```hcl
# AWS CloudTrail
resource "aws_cloudtrail" "main" {
  name                          = "infrastructure-audit"
  s3_bucket_name                = aws_s3_bucket.cloudtrail.id
  include_global_service_events = true
  is_multi_region_trail         = true
  enable_log_file_validation    = true
  
  event_selector {
    read_write_type           = "All"
    include_management_events = true
  }
}

# GCP Audit Logs (enabled by default)
resource "google_project_iam_audit_config" "all" {
  project = var.project_id
  service = "allServices"
  
  audit_log_config {
    log_type = "ADMIN_READ"
  }
  audit_log_config {
    log_type = "DATA_READ"
  }
  audit_log_config {
    log_type = "DATA_WRITE"
  }
}

# Azure Activity Log
resource "azurerm_monitor_diagnostic_setting" "activity_log" {
  name                       = "activity-log-to-storage"
  target_resource_id         = data.azurerm_subscription.current.id
  storage_account_id         = azurerm_storage_account.audit.id
  
  enabled_log {
    category = "Administrative"
  }
  enabled_log {
    category = "Security"
  }
}
```

### Layer 3: Terraform State Changes

```hcl
# Enable versioning on state bucket
resource "aws_s3_bucket_versioning" "state" {
  bucket = aws_s3_bucket.terraform_state.id
  
  versioning_configuration {
    status = "Enabled"
  }
}

# Log access to state bucket
resource "aws_s3_bucket_logging" "state" {
  bucket = aws_s3_bucket.terraform_state.id

  target_bucket = aws_s3_bucket.logs.id
  target_prefix = "state-access-logs/"
}
```

### Layer 4: CI/CD Pipeline Logs

```yaml
# GitHub Actions - logs preserved automatically
- name: Terraform Apply
  run: terraform apply -auto-approve
  # Output captured in workflow run logs

# Include metadata in logs
- name: Log Deployment Info
  run: |
    echo "Deployer: ${{ github.actor }}"
    echo "Commit: ${{ github.sha }}"
    echo "Ref: ${{ github.ref }}"
    echo "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
```

### Centralized Logging

```hcl
# Send CloudTrail to CloudWatch Logs
resource "aws_cloudtrail" "main" {
  # ...
  cloud_watch_logs_group_arn = "${aws_cloudwatch_log_group.cloudtrail.arn}:*"
  cloud_watch_logs_role_arn  = aws_iam_role.cloudtrail.arn
}

# Create alerts for important events
resource "aws_cloudwatch_metric_alarm" "unauthorized_api_calls" {
  alarm_name          = "unauthorized-api-calls"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "UnauthorizedAPICalls"
  namespace           = "CloudTrailMetrics"
  period              = 300
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "Unauthorized API calls detected"
  alarm_actions       = [aws_sns_topic.alerts.arn]
}
```

### Log Retention

```hcl
# Retain logs for compliance
resource "aws_cloudwatch_log_group" "terraform" {
  name              = "/terraform/deployments"
  retention_in_days = 365  # Adjust based on compliance requirements
}

resource "aws_s3_bucket_lifecycle_configuration" "audit_logs" {
  bucket = aws_s3_bucket.audit_logs.id

  rule {
    id     = "archive-old-logs"
    status = "Enabled"

    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    expiration {
      days = 2555  # 7 years for compliance
    }
  }
}
```

### Query Audit Logs

```bash
# AWS CloudTrail - find who modified security groups
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=EventName,AttributeValue=AuthorizeSecurityGroupIngress \
  --start-time 2024-01-01 \
  --end-time 2024-01-31

# Find all Terraform-initiated changes (by user agent)
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=EventSource,AttributeValue=ec2.amazonaws.com \
  | jq '.Events[] | select(.CloudTrailEvent | contains("terraform"))'
```

### Terraform-Specific Logging

```hcl
# Log all Terraform operations
resource "null_resource" "log_apply" {
  triggers = {
    always_run = timestamp()
  }

  provisioner "local-exec" {
    command = <<-EOT
      echo '{"timestamp":"${timestamp()}","user":"${var.deployer}","action":"apply","workspace":"${terraform.workspace}"}' >> terraform-audit.log
    EOT
  }
}
```

## What to Track

| Event | Source | Retention |
|-------|--------|-----------|
| Code changes | Git | Forever |
| API calls | CloudTrail/Stackdriver | 1-7 years |
| State changes | S3 versioning | 1 year |
| Pipeline runs | CI/CD logs | 90 days |
| Access attempts | CloudTrail | 1 year |

## References

- [AWS CloudTrail](https://docs.aws.amazon.com/awscloudtrail/latest/userguide/)
- [GCP Audit Logs](https://cloud.google.com/logging/docs/audit)
- [Azure Activity Logs](https://docs.microsoft.com/en-us/azure/azure-monitor/essentials/activity-log)


---

# org-change-workflow

**Priority:** HIGH  
**Category:** Organization & Workflow

## Why It Matters

A formal change workflow minimizes disruption, enables rollbacks, prevents conflicts, and creates audit trails. Changes to infrastructure should follow a predictable, reviewable process.

## Incorrect

```bash
# Cowboy workflow
cd terraform/
vim main.tf
terraform apply -auto-approve
# Hope it works!
```

**Problems:**
- No review before changes
- No record of what changed
- Can't roll back easily
- Conflicts between team members

## Correct

### Standard Change Workflow

```
1. Create branch
2. Make changes
3. Run terraform plan
4. Create pull request
5. Review plan output
6. Approve and merge
7. Apply changes (automated or manual)
8. Verify deployment
```

### Branch-Based Workflow

```bash
# 1. Create feature branch
git checkout -b feature/add-redis-cache

# 2. Make changes
vim main.tf

# 3. Format and validate
terraform fmt
terraform validate

# 4. Generate plan
terraform plan -out=tfplan

# 5. Commit and push
git add .
git commit -m "Add Redis cache for session storage"
git push origin feature/add-redis-cache

# 6. Create PR with plan output
# 7. Get review and approval
# 8. Merge to main
# 9. Apply in CI/CD or manually
```

### Pull Request Template

```markdown
<!-- .github/pull_request_template.md -->
## Description
<!-- What infrastructure changes does this PR make? -->

## Motivation
<!-- Why are these changes needed? -->

## Terraform Plan
<details>
<summary>Click to expand plan output</summary>

```
<!-- Paste terraform plan output here -->
```

</details>

## Checklist
- [ ] `terraform fmt` has been run
- [ ] `terraform validate` passes
- [ ] Plan output has been reviewed
- [ ] No secrets in code
- [ ] Documentation updated (if needed)
- [ ] Tested in dev environment first

## Rollback Plan
<!-- How to revert if something goes wrong -->
```

### CI/CD Pipeline

```yaml
# .github/workflows/terraform.yml
name: Terraform

on:
  pull_request:
    paths: ['**.tf', '**.tfvars']
  push:
    branches: [main]

jobs:
  plan:
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    steps:
      - uses: actions/checkout@v4
      
      - uses: hashicorp/setup-terraform@v3
      
      - name: Terraform Init
        run: terraform init
        
      - name: Terraform Plan
        run: terraform plan -no-color
        continue-on-error: true
        
      - name: Comment Plan on PR
        uses: actions/github-script@v7
        with:
          script: |
            // Post plan output as PR comment
            
  apply:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    environment: production  # Requires approval
    steps:
      - uses: actions/checkout@v4
      
      - uses: hashicorp/setup-terraform@v3
      
      - name: Terraform Init
        run: terraform init
        
      - name: Terraform Apply
        run: terraform apply -auto-approve
```

### Environment Promotion

```
┌─────────┐     ┌─────────┐     ┌─────────┐
│   Dev   │────▶│ Staging │────▶│  Prod   │
└─────────┘     └─────────┘     └─────────┘
     │               │               │
  Auto-apply    Auto-apply    Manual approval
     │               │               │
  Feature        Main branch   Tagged release
  branches       merge           or approval
```

### Makefile for Consistency

```makefile
.PHONY: init plan apply destroy

ENV ?= dev

init:
	terraform init

plan:
	terraform plan -var-file=$(ENV).tfvars -out=tfplan

apply:
	terraform apply tfplan

destroy:
	terraform destroy -var-file=$(ENV).tfvars

# Usage: make plan ENV=prod
```

### Change Documentation

```hcl
# Document significant changes in code
# CHANGELOG: 2024-01-15 - Added read replica for reporting
# Ticket: INFRA-1234
# Author: @engineer

resource "aws_db_instance" "read_replica" {
  # ...
}
```

### Rollback Strategy

```bash
# Option 1: Revert the commit
git revert HEAD
git push
# CI/CD applies the reverted state

# Option 2: Apply previous state
terraform apply -target=aws_instance.web -var="ami_id=ami-previous"

# Option 3: Use state to restore
terraform state pull > backup.tfstate
# Restore from backup if needed
```

## Four Levels of Maturity

| Level | Practice |
|-------|----------|
| Manual | Changes via console/CLI, no tracking |
| Semi-automated | Some IaC, inconsistent processes |
| Infrastructure as Code | All changes via Terraform, VCS, reviews |
| Collaborative IaC | Delegation, access control, automated promotion |

## References

- [HashiCorp Change Workflow](https://developer.hashicorp.com/terraform/cloud-docs/recommended-practices/part2#your-current-change-control-workflow)
- [GitOps Principles](https://opengitops.dev/)


---

# org-version-control

**Priority:** CRITICAL  
**Category:** Organization & Workflow

## Why It Matters

Version control provides a complete history of infrastructure changes, enables collaboration, supports code review, and allows rollback to previous states. All Terraform code should be in version control.

## Incorrect

```bash
# Terraform code stored locally or on shared drives
/shared-drive/terraform/
├── main.tf
├── main-backup.tf
├── main-old.tf
└── main-DONT-USE.tf

# Code shared via email or chat
# No history of who changed what and when
```

**Problems:**
- No audit trail of changes
- No way to roll back
- Conflicts when multiple people edit
- No code review process

## Correct

### Use Git for All Terraform Code

```bash
# Every configuration in version control
git init
git add .
git commit -m "Initial infrastructure configuration"
git push origin main
```

### Repository Organization

There are multiple valid approaches to organizing Terraform repositories:

- **Monorepo** - All infrastructure in one repository
- **Polyrepo** - Separate repositories per component or team
- **Hybrid** - Shared modules in one repo, configurations in separate repos

Choose the approach that fits your organization's needs. The key principles are:
- Code is versioned and auditable
- Teams can collaborate with code review
- Changes can be rolled back

### Branch Strategy

```bash
# Feature branch workflow
git checkout -b feature/add-cache-layer
# Make changes
git add .
git commit -m "Add ElastiCache for session storage"
git push origin feature/add-cache-layer
# Create pull request for review
```

### Protect Main Branch

Configure branch protection rules:
- Require pull request reviews before merging
- Require status checks to pass (CI/CD)
- Require conversation resolution
- Do not allow force pushes

### Commit Message Guidelines

```bash
# Good commit messages
git commit -m "Add RDS read replica for reporting queries

- Creates read replica in us-east-1b
- Configures security group for app servers
- Updates outputs for connection string

Refs: INFRA-1234"

# Bad commit messages
git commit -m "updates"
git commit -m "fix"
git commit -m "wip"
```

## .gitignore for Terraform

```gitignore
# Local .terraform directories
**/.terraform/*

# .tfstate files
*.tfstate
*.tfstate.*

# Crash log files
crash.log
crash.*.log

# Exclude override files
override.tf
override.tf.json
*_override.tf
*_override.tf.json

# Exclude CLI config files
.terraformrc
terraform.rc

# Exclude sensitive variable files
*.tfvars
*.tfvars.json
!example.tfvars

# Lock file should be committed
# Do NOT add .terraform.lock.hcl
```

## Lock File Management

```bash
# Commit the lock file for reproducibility
git add .terraform.lock.hcl
git commit -m "Update provider lock file"

# When updating providers
terraform init -upgrade
git add .terraform.lock.hcl
git commit -m "Upgrade AWS provider to 5.32.0"
```

## References

- [Version Control Best Practices](https://developer.hashicorp.com/terraform/cloud-docs/recommended-practices/part3.2)
- [Git Workflow Strategies](https://www.atlassian.com/git/tutorials/comparing-workflows)


---

# org-workspaces

**Priority:** HIGH  
**Category:** Organization & Workflow

## Why It Matters

Organizing infrastructure into workspaces enables delegation, controls blast radius, and supports environment promotion. Each workspace should represent one environment of one infrastructure component.

## The Formula

```
Terraform configurations × environments = workspaces
```

## Incorrect

```hcl
# One giant workspace managing everything
# terraform-monolith/
#   - VPC
#   - EKS cluster  
#   - RDS database
#   - ElastiCache
#   - Lambda functions
#   - S3 buckets
#   - IAM roles
#   All in one state file for all environments
```

**Problems:**
- Single point of failure
- Long plan/apply times
- Can't delegate ownership
- Risk of accidental destruction
- State file conflicts

## Correct

### Split by Component and Environment

```bash
# Workspace naming: {component}-{environment}
networking-dev
networking-staging
networking-prod

eks-cluster-dev
eks-cluster-staging
eks-cluster-prod

database-dev
database-staging
database-prod

app-frontend-dev
app-frontend-staging
app-frontend-prod
```

### Same Code, Different Variables

```hcl
# variables.tf
variable "environment" {
  type        = string
  description = "Environment name (dev, staging, prod)"
}

variable "instance_count" {
  type        = number
  description = "Number of instances"
}

# main.tf - same code for all environments
resource "aws_instance" "app" {
  count         = var.instance_count
  instance_type = var.environment == "prod" ? "m5.large" : "t3.micro"
  
  tags = {
    Environment = var.environment
  }
}
```

```hcl
# dev.tfvars
environment    = "dev"
instance_count = 1

# prod.tfvars
environment    = "prod"
instance_count = 3
```

### Workspace Dependencies via Remote State

```hcl
# In eks-cluster configuration
# Read outputs from networking workspace
data "terraform_remote_state" "networking" {
  backend = "s3"
  
  config = {
    bucket = "terraform-state"
    key    = "networking-${var.environment}/terraform.tfstate"
    region = "us-east-1"
  }
}

resource "aws_eks_cluster" "main" {
  name = "${var.project}-${var.environment}"
  
  vpc_config {
    subnet_ids = data.terraform_remote_state.networking.outputs.private_subnet_ids
  }
}
```

### State Backend Per Workspace

```hcl
# Use different state keys per workspace
terraform {
  backend "s3" {
    bucket = "my-terraform-state"
    key    = "networking-dev/terraform.tfstate"  # Different per workspace
    region = "us-east-1"
  }
}
```

Or use workspaces feature:

```bash
# Native Terraform workspaces
terraform workspace new dev
terraform workspace new staging
terraform workspace new prod

terraform workspace select dev
terraform apply -var-file=dev.tfvars
```

## Workspace Sizing Guidelines

| Size | Resources | Use Case |
|------|-----------|----------|
| Too small | 1-3 resources | Overhead not worth it |
| Right size | 10-50 resources | Manageable, clear ownership |
| Too large | 200+ resources | Split into components |

## Benefits

1. **Blast radius** - Mistakes only affect one component/environment
2. **Delegation** - Different teams own different workspaces
3. **Parallelism** - Teams work independently
4. **Promotion** - Changes flow dev → staging → prod
5. **Auditing** - Clear history per component

## References

- [Workspace Structure](https://developer.hashicorp.com/terraform/cloud-docs/recommended-practices/part1#the-recommended-terraform-workspace-structure)
- [Remote State](https://developer.hashicorp.com/terraform/language/state/remote-state-data)


---

# output-descriptions

**Priority:** MEDIUM  
**Category:** Variable & Output Patterns

## Why It Matters

Output descriptions document what data is available from a module and how to use it. They appear in generated documentation and help users understand module interfaces.

## Incorrect

```hcl
output "vpc_id" {
  value = aws_vpc.main.id
}

output "subnet_ids" {
  value = aws_subnet.private[*].id
}

output "endpoint" {
  value = aws_db_instance.main.endpoint
}
```

**Problem:** Users must read source code to understand what each output provides.

## Correct

```hcl
output "vpc_id" {
  value       = aws_vpc.main.id
  description = "The ID of the VPC"
}

output "subnet_ids" {
  value       = aws_subnet.private[*].id
  description = "List of private subnet IDs"
}

output "endpoint" {
  value       = aws_db_instance.main.endpoint
  description = "The connection endpoint in address:port format"
}
```

## Use Symmetrical Names

Keep output names consistent with upstream resources:

```hcl
# Good - matches aws_iam_user resource attribute names
output "user_arn" {
  value       = aws_iam_user.this.arn
  description = "The ARN of the IAM user"
}

output "user_name" {
  value       = aws_iam_user.this.name
  description = "The name of the IAM user"
}

output "user_unique_id" {
  value       = aws_iam_user.this.unique_id
  description = "The unique ID assigned by AWS"
}

# Bad - inconsistent naming
output "arn" {
  value = aws_iam_user.this.arn
}

output "username" {  # Doesn't match 'name' attribute
  value = aws_iam_user.this.name
}
```

## Export Full Resource Objects

For flexibility, export the entire resource alongside specific attributes:

```hcl
# Specific commonly-used outputs
output "instance_id" {
  value       = aws_instance.web.id
  description = "The ID of the EC2 instance"
}

output "instance_public_ip" {
  value       = aws_instance.web.public_ip
  description = "The public IP address of the instance"
}

# Full resource for advanced use cases
output "instance" {
  value       = aws_instance.web
  description = "All attributes of the EC2 instance. See https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance#attribute-reference"
}
```

## Document Complex Outputs

```hcl
output "load_balancer" {
  value = {
    arn      = aws_lb.main.arn
    dns_name = aws_lb.main.dns_name
    zone_id  = aws_lb.main.zone_id
  }
  description = <<-EOT
    Load balancer attributes:
    - arn: ARN of the load balancer
    - dns_name: DNS name for the load balancer
    - zone_id: Route 53 zone ID for alias records
  EOT
}

output "subnets" {
  value = {
    for k, v in aws_subnet.this : k => {
      id         = v.id
      arn        = v.arn
      cidr_block = v.cidr_block
    }
  }
  description = "Map of subnet objects keyed by subnet name"
}
```

## Use Snake Case

```hcl
# Correct - snake_case
output "security_group_id" {
  value       = aws_security_group.main.id
  description = "The ID of the security group"
}

# Incorrect - other conventions
output "securityGroupId" {    # camelCase
  value = aws_security_group.main.id
}

output "SecurityGroupID" {    # PascalCase
  value = aws_security_group.main.id
}
```

## References

- [Output Values](https://developer.hashicorp.com/terraform/language/values/outputs)
- [Terraform Style Guide](https://developer.hashicorp.com/terraform/language/style)


---

# output-no-secrets

**Priority:** CRITICAL  
**Category:** Security Best Practices

## Why It Matters

Outputs are logged, displayed in CI/CD pipelines, stored in state, and accessible via `terraform output`. Secrets in outputs can easily leak to unauthorized parties.

## Incorrect

```hcl
output "database_password" {
  value = random_password.db.result
  # Secret exposed in terraform output!
}

output "api_credentials" {
  value = {
    client_id     = var.client_id
    client_secret = var.client_secret  # Secret leaked!
  }
}

output "connection_string" {
  value = "postgres://admin:${random_password.db.result}@${aws_db_instance.main.endpoint}/mydb"
  # Password embedded in output!
}
```

**Problem:** Running `terraform output` or viewing CI logs exposes secrets.

## Correct

### Store Secrets in Secret Managers

```hcl
# Generate password
resource "random_password" "db" {
  length  = 32
  special = true
}

# Store in AWS Secrets Manager
resource "aws_secretsmanager_secret" "db_password" {
  name = "${var.environment}/database/password"
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id     = aws_secretsmanager_secret.db_password.id
  secret_string = random_password.db.result
}

# Output the location, not the value
output "database_password_secret_arn" {
  value       = aws_secretsmanager_secret.db_password.arn
  description = "ARN of the Secrets Manager secret containing the database password"
}

output "database_password_secret_name" {
  value       = aws_secretsmanager_secret.db_password.name
  description = "Name of the Secrets Manager secret containing the database password"
}
```

### Store in SSM Parameter Store

```hcl
resource "aws_ssm_parameter" "db_password" {
  name        = "/${var.environment}/database/password"
  description = "Database master password"
  type        = "SecureString"
  value       = random_password.db.result

  tags = var.tags
}

output "database_password_parameter_name" {
  value       = aws_ssm_parameter.db_password.name
  description = "SSM parameter name for database password. Retrieve with: aws ssm get-parameter --name ${aws_ssm_parameter.db_password.name} --with-decryption"
}
```

### Provide Instructions Instead

```hcl
output "database_credentials_info" {
  value       = "Database credentials stored in SSM at /${var.environment}/database/*"
  description = "Location of database credentials in SSM Parameter Store"
}

output "retrieve_password_command" {
  value       = "aws ssm get-parameter --name '/${var.environment}/database/password' --with-decryption --query 'Parameter.Value' --output text"
  description = "AWS CLI command to retrieve the database password"
}
```

## If You Must Output Secrets

In rare cases where secrets must be output (e.g., bootstrap scenarios), always mark as sensitive:

```hcl
output "initial_admin_password" {
  value       = random_password.admin.result
  sensitive   = true
  description = "Initial admin password. Change immediately after first login."
}
```

**Note:** Even with `sensitive = true`:
- Value is still in the state file in plaintext
- Can be retrieved with `terraform output -json`
- Better to avoid entirely

## Root Modules vs Reusable Modules

- **Root modules (components):** Never output secrets
- **Reusable modules:** May output secrets if needed for composition, but mark as `sensitive = true`

```hcl
# In a reusable module - acceptable with sensitive
output "generated_password" {
  value       = random_password.this.result
  sensitive   = true
  description = "Generated password for use by parent module"
}

# In root module - store instead of output
resource "aws_ssm_parameter" "password" {
  name  = "/app/password"
  type  = "SecureString"
  value = module.database.generated_password
}
```

## References

- [Sensitive Outputs](https://developer.hashicorp.com/terraform/language/values/outputs#sensitive-suppressing-values-in-cli-output)
- [AWS Secrets Manager](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/secretsmanager_secret)
- [AWS SSM Parameter Store](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ssm_parameter)


---

# perf-debug

**Priority:** LOW-MEDIUM  
**Category:** Performance Optimization

## Why It Matters

When Terraform behaves unexpectedly, debug logs help identify the root cause. Knowing how to enable and interpret debug output speeds up troubleshooting.

## Incorrect

```bash
# Running terraform without debug info when things fail
terraform apply
# Error: something went wrong
# No idea what happened or why
```

## Correct

```bash
# Enable debug logging to understand failures
TF_LOG=DEBUG terraform apply

# Or log to file for later analysis
export TF_LOG=DEBUG
export TF_LOG_PATH="./terraform.log"
terraform apply
```

## Enable Debug Logging

### Temporary (Single Command)

```bash
# Full debug output
TF_LOG=DEBUG terraform plan

# Trace level (most verbose)
TF_LOG=TRACE terraform apply

# Available levels: TRACE, DEBUG, INFO, WARN, ERROR
TF_LOG=INFO terraform plan
```

### Persist to File

```bash
# Log to file instead of stdout
export TF_LOG=DEBUG
export TF_LOG_PATH="./terraform.log"

terraform plan

# Review logs
cat terraform.log
```

### Provider-Specific Logging

```bash
# Log only core Terraform
TF_LOG_CORE=DEBUG terraform plan

# Log only provider operations
TF_LOG_PROVIDER=DEBUG terraform plan

# Combine both
TF_LOG_CORE=WARN TF_LOG_PROVIDER=DEBUG terraform plan
```

## Common Debug Scenarios

### Slow Plans

```bash
# Time the plan and identify slow resources
TF_LOG=DEBUG terraform plan 2>&1 | tee plan.log

# Look for slow operations
grep -i "seconds" plan.log
grep -i "waiting" plan.log
```

### Authentication Issues

```bash
# Debug credential problems
TF_LOG=DEBUG terraform plan 2>&1 | grep -i "auth\|credential\|token\|401\|403"

# AWS-specific
AWS_DEBUG=1 TF_LOG=DEBUG terraform plan
```

### Provider Errors

```bash
# Capture full API responses
TF_LOG=TRACE terraform apply 2>&1 | tee apply.log

# Search for errors
grep -i "error\|failed\|invalid" apply.log
```

## Terraform Plan Debugging

### Understand Plan Output

```bash
# Detailed plan with reasons for changes
terraform plan -detailed-exitcode

# Exit codes:
# 0 = No changes
# 1 = Error
# 2 = Changes present
```

### Show What Changed

```bash
# JSON output for programmatic analysis
terraform plan -out=tfplan
terraform show -json tfplan | jq '.resource_changes[] | select(.change.actions != ["no-op"])'
```

### Refresh and State Issues

```bash
# Skip refresh to isolate issues
terraform plan -refresh=false

# Compare with refresh
terraform plan -refresh=true

# Target specific resources
terraform plan -target=aws_instance.web
```

## State Debugging

```bash
# List all resources in state
terraform state list

# Show specific resource
terraform state show aws_instance.web

# Pull state for inspection
terraform state pull > state.json
jq '.resources[] | select(.type == "aws_instance")' state.json
```

## Crash Debugging

```bash
# Terraform creates crash.log on panic
cat crash.log

# Enable core dumps
export TF_LOG=TRACE
export TF_LOG_PATH="./crash_debug.log"
terraform apply
```

## Network Debugging

```bash
# Debug HTTP requests
export TF_LOG=TRACE
export HTTPS_PROXY=http://localhost:8080  # Use with mitmproxy/Fiddler

terraform plan
```

## Common Issues and Solutions

### Stuck on "Refreshing state..."

```bash
# Likely: API rate limiting or network issues
# Solution: Increase parallelism timeout
terraform plan -parallelism=1

# Or skip refresh temporarily
terraform plan -refresh=false
```

### "Resource already exists"

```bash
# Import the existing resource
terraform import aws_instance.web i-1234567890abcdef0

# Or check for naming conflicts
terraform state list | grep instance
```

### "Error acquiring state lock"

```bash
# Find and release stuck lock
terraform force-unlock LOCK_ID

# Check DynamoDB for lock
aws dynamodb scan --table-name terraform-locks
```

### Provider Plugin Errors

```bash
# Clear plugin cache
rm -rf .terraform/

# Reinitialize
terraform init -upgrade

# Check provider versions
terraform providers
```

## Debugging Workflow

```bash
#!/bin/bash
# debug-terraform.sh

set -e

echo "=== Terraform Debug Session ==="
echo "Timestamp: $(date)"
echo "Directory: $(pwd)"
echo ""

# Capture environment
echo "=== Environment ==="
terraform version
echo ""

# Enable debugging
export TF_LOG=DEBUG
export TF_LOG_PATH="./debug_$(date +%Y%m%d_%H%M%S).log"

# Run command
echo "=== Running: terraform $@ ==="
terraform "$@"

echo ""
echo "=== Debug log saved to: $TF_LOG_PATH ==="
```

## IDE Debugging

### VSCode launch.json

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Terraform Plan",
      "type": "node",
      "request": "launch",
      "program": "/usr/local/bin/terraform",
      "args": ["plan"],
      "env": {
        "TF_LOG": "DEBUG"
      },
      "cwd": "${workspaceFolder}"
    }
  ]
}
```

## References

- [Debugging Terraform](https://developer.hashicorp.com/terraform/internals/debugging)
- [Terraform Logs](https://developer.hashicorp.com/terraform/cli/config/environment-variables#tf_log)


---

# perf-parallelism

**Priority:** LOW-MEDIUM  
**Category:** Performance Optimization

## Why It Matters

Terraform's default parallelism of 10 concurrent operations works for most cases, but large deployments or rate-limited APIs may benefit from tuning.

## Incorrect

```bash
# Using default parallelism when hitting API rate limits
terraform apply
# Error: Rate limit exceeded
# Error: Too many requests

# Or using default for very large deployments (slow)
terraform apply  # Takes forever with 500+ resources
```

## Correct

```bash
# Decrease for rate-limited APIs (GitHub, Cloudflare)
terraform apply -parallelism=3

# Increase for large deployments with no rate limits
terraform apply -parallelism=20

# Sequential for debugging
terraform apply -parallelism=1
```

## Default Behavior

```bash
# Default: 10 concurrent operations
terraform apply
```

## Increasing Parallelism

For large deployments with many independent resources:

```bash
# Increase for faster applies
terraform apply -parallelism=20
```

**When to increase:**
- 100+ independent resources
- No API rate limiting issues
- Resources don't have interdependencies
- Fast network connection to provider

## Decreasing Parallelism

For rate-limited APIs or debugging:

```bash
# Decrease for rate-limited APIs
terraform apply -parallelism=5

# Sequential for debugging
terraform apply -parallelism=1
```

**When to decrease:**
- Provider API rate limits (common with GitHub, Cloudflare)
- Debugging resource creation order
- Shared resource contention
- Memory-constrained environments

## Provider-Specific Considerations

### AWS

```hcl
# AWS generally handles high parallelism well
# But some services have limits (e.g., IAM)
terraform apply -parallelism=15
```

### GitHub

```hcl
# GitHub API is heavily rate-limited
terraform apply -parallelism=3
```

### Kubernetes

```hcl
# Kubernetes API server can be overwhelmed
terraform apply -parallelism=5
```

## Using Environment Variables

```bash
# Set default parallelism
export TF_CLI_ARGS_apply="-parallelism=15"
export TF_CLI_ARGS_plan="-parallelism=15"

terraform apply  # Uses 15
```

## CI/CD Configuration

```yaml
# GitHub Actions example
jobs:
  terraform:
    steps:
      - name: Terraform Apply
        run: terraform apply -parallelism=10 -auto-approve
        env:
          TF_IN_AUTOMATION: true
```

## Measuring Impact

```bash
# Time different parallelism settings
time terraform apply -parallelism=5 -auto-approve
time terraform apply -parallelism=10 -auto-approve
time terraform apply -parallelism=20 -auto-approve
```

## Dependencies Override Parallelism

Remember that dependent resources run sequentially regardless of parallelism:

```hcl
resource "aws_vpc" "main" {
  # Creates first
}

resource "aws_subnet" "public" {
  vpc_id = aws_vpc.main.id  # Waits for VPC
}

resource "aws_instance" "web" {
  subnet_id = aws_subnet.public.id  # Waits for subnet
}
```

## References

- [Terraform CLI Configuration](https://developer.hashicorp.com/terraform/cli/commands/apply#parallelism-n)


---

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


---

# resource-count-vs-foreach

**Priority:** MEDIUM-HIGH  
**Category:** Resource Organization

## Why It Matters

Using `count` with lists causes resources to be identified by index. Removing an item from the middle of the list destroys and recreates downstream resources. `for_each` uses stable keys that survive list modifications.

## Incorrect

```hcl
variable "subnet_cidrs" {
  default = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

resource "aws_subnet" "subnets" {
  count      = length(var.subnet_cidrs)
  vpc_id     = aws_vpc.main.id
  cidr_block = var.subnet_cidrs[count.index]
  
  tags = {
    Name = "subnet-${count.index}"
  }
}
```

**Problem:** If you remove `"10.0.2.0/24"` from the middle:
- `subnet[1]` (was 10.0.2.0/24) becomes 10.0.3.0/24
- `subnet[2]` (was 10.0.3.0/24) is destroyed
- Resources in subnet[1] are disrupted

## Correct

```hcl
variable "subnets" {
  default = {
    "public-a"  = "10.0.1.0/24"
    "public-b"  = "10.0.2.0/24"
    "public-c"  = "10.0.3.0/24"
  }
}

resource "aws_subnet" "subnets" {
  for_each   = var.subnets
  vpc_id     = aws_vpc.main.id
  cidr_block = each.value
  
  tags = {
    Name = each.key
  }
}

# Reference specific subnet
output "public_a_id" {
  value = aws_subnet.subnets["public-a"].id
}
```

## Converting List to Map

```hcl
variable "availability_zones" {
  default = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

resource "aws_subnet" "subnets" {
  for_each = toset(var.availability_zones)
  
  vpc_id            = aws_vpc.main.id
  availability_zone = each.value
  cidr_block        = cidrsubnet(aws_vpc.main.cidr_block, 8, index(var.availability_zones, each.value))
  
  tags = {
    Name = "subnet-${each.value}"
  }
}
```

## When to Use Count

`count` is still appropriate for:

```hcl
# Boolean conditional - create or not
resource "aws_eip" "nat" {
  count = var.enable_nat_gateway ? 1 : 0
  
  domain = "vpc"
}

# Fixed number of identical resources
resource "aws_nat_gateway" "gw" {
  count = var.nat_gateway_count  # e.g., 3
  
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id
}
```

## Quick Reference

| Use Case | Use |
|----------|-----|
| Create 0 or 1 resource | `count` |
| Fixed number of identical resources | `count` |
| Resources identified by name/key | `for_each` |
| List that may have items removed | `for_each` with `toset()` |

## References

- [for_each](https://developer.hashicorp.com/terraform/language/meta-arguments/for_each)
- [count](https://developer.hashicorp.com/terraform/language/meta-arguments/count)


---

# resource-immutable

**Priority:** MEDIUM  
**Category:** Resource Organization

## Why It Matters

Immutable infrastructure replaces components rather than modifying them in-place. This makes deployments more predictable, rollbacks simpler, and eliminates configuration drift.

## Incorrect

```hcl
# Mutable instance - SSH in and modify
resource "aws_instance" "web" {
  ami           = "ami-12345678"
  instance_type = "t3.micro"
  
  # Deploy by SSHing in and running commands
  provisioner "remote-exec" {
    inline = [
      "apt-get update",
      "apt-get install -y nginx",
      "systemctl start nginx"
    ]
  }
}

# Configuration drift over time:
# - Manual hotfixes applied
# - Different packages installed
# - Unknown state
```

**Problems:**
- Configuration drift between instances
- Rollbacks require complex state management
- Difficult to reproduce issues
- "Works on my machine" but not in prod

## Correct

### Immutable with AMIs/Images

```hcl
# Build immutable image with Packer
# packer/web-server.pkr.hcl
source "amazon-ebs" "web" {
  ami_name      = "web-server-${timestamp()}"
  instance_type = "t3.micro"
  source_ami_filter {
    filters = {
      name = "ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"
    }
    owners      = ["099720109477"]
    most_recent = true
  }
  ssh_username = "ubuntu"
}

build {
  sources = ["source.amazon-ebs.web"]
  
  provisioner "shell" {
    inline = [
      "sudo apt-get update",
      "sudo apt-get install -y nginx",
      "sudo systemctl enable nginx"
    ]
  }
}
```

```hcl
# Deploy immutable image
data "aws_ami" "web" {
  most_recent = true
  owners      = ["self"]
  
  filter {
    name   = "name"
    values = ["web-server-*"]
  }
}

resource "aws_launch_template" "web" {
  name_prefix   = "web-"
  image_id      = data.aws_ami.web.id
  instance_type = "t3.micro"
  
  # No provisioners - image is already configured
}

resource "aws_autoscaling_group" "web" {
  desired_capacity = 3
  max_size         = 6
  min_size         = 3
  
  launch_template {
    id      = aws_launch_template.web.id
    version = "$Latest"
  }
  
  # Rolling update - replace instances with new image
  instance_refresh {
    strategy = "Rolling"
    preferences {
      min_healthy_percentage = 50
    }
  }
}
```

### Immutable with Containers

```hcl
# Build and push container image
resource "null_resource" "docker_build" {
  triggers = {
    dockerfile_hash = filemd5("${path.module}/Dockerfile")
    app_hash        = filemd5("${path.module}/app.py")
  }
  
  provisioner "local-exec" {
    command = <<-EOT
      docker build -t ${var.ecr_repo}:${var.app_version} .
      docker push ${var.ecr_repo}:${var.app_version}
    EOT
  }
}

# Deploy immutable container
resource "aws_ecs_task_definition" "app" {
  family = "app"
  
  container_definitions = jsonencode([{
    name  = "app"
    image = "${var.ecr_repo}:${var.app_version}"  # Specific version, not :latest
    # ...
  }])
}

resource "aws_ecs_service" "app" {
  name            = "app"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = 3
  
  deployment_configuration {
    maximum_percent         = 200
    minimum_healthy_percent = 50
  }
}
```

### Blue-Green Deployments

```hcl
variable "active_color" {
  description = "Currently active deployment (blue or green)"
  default     = "blue"
}

resource "aws_launch_template" "blue" {
  name_prefix = "blue-"
  image_id    = var.blue_ami_id
  # ...
}

resource "aws_launch_template" "green" {
  name_prefix = "green-"
  image_id    = var.green_ami_id
  # ...
}

resource "aws_lb_target_group" "blue" {
  name = "blue-tg"
  # ...
}

resource "aws_lb_target_group" "green" {
  name = "green-tg"
  # ...
}

# Switch traffic by changing active color
resource "aws_lb_listener_rule" "app" {
  listener_arn = aws_lb_listener.front_end.arn
  
  action {
    type             = "forward"
    target_group_arn = var.active_color == "blue" ? aws_lb_target_group.blue.arn : aws_lb_target_group.green.arn
  }
  
  condition {
    path_pattern {
      values = ["/*"]
    }
  }
}
```

### Lifecycle Rules for Immutability

```hcl
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.micro"
  
  lifecycle {
    # Create new instance before destroying old one
    create_before_destroy = true
    
    # Force replacement when AMI changes
    replace_triggered_by = [
      null_resource.ami_version
    ]
  }
}

# Trigger replacement on version change
resource "null_resource" "ami_version" {
  triggers = {
    ami_id = var.ami_id
  }
}
```

### When Mutable is Acceptable

Some resources are inherently stateful:

```hcl
# Databases - use lifecycle rules, not replacement
resource "aws_db_instance" "main" {
  identifier = "mydb"
  # ...
  
  lifecycle {
    prevent_destroy = true  # Don't accidentally delete
    ignore_changes  = [password]  # Manage outside Terraform
  }
}

# Use snapshots for "immutable-like" database updates
resource "aws_db_instance" "main" {
  snapshot_identifier = var.restore_from_snapshot  # Deploy from snapshot
}
```

## Immutability Spectrum

| Level | Description | Example |
|-------|-------------|---------|
| Fully mutable | Modify in place | SSH and edit configs |
| Config management | Automated in-place updates | Ansible/Chef runs |
| Immutable images | Replace, don't modify | AMIs, Docker images |
| Immutable infra | Replace entire stacks | Blue-green, canary |

## References

- [HashiCorp Packer](https://developer.hashicorp.com/packer)
- [Immutable Infrastructure](https://www.hashicorp.com/resources/what-is-mutable-vs-immutable-infrastructure)
- [Blue-Green Deployments](https://martinfowler.com/bliki/BlueGreenDeployment.html)


---

# resource-lifecycle

**Priority:** MEDIUM  
**Category:** Resource Organization

## Why It Matters

Lifecycle blocks control how Terraform creates, updates, and destroys resources. Proper use prevents accidental destruction, enables zero-downtime deployments, and handles edge cases in resource management.

## Incorrect

```hcl
# No lifecycle rules - risky for critical resources
resource "aws_db_instance" "production" {
  identifier     = "production-db"
  engine         = "postgres"
  instance_class = "db.r5.large"
  # Can be accidentally destroyed with terraform destroy!
}

resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.micro"
  # Default: destroy then create = downtime
}
```

## Correct

```hcl
resource "aws_db_instance" "production" {
  identifier     = "production-db"
  engine         = "postgres"
  instance_class = "db.r5.large"
  
  lifecycle {
    prevent_destroy = true  # Protect from accidental deletion
  }
}

resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.micro"
  
  lifecycle {
    create_before_destroy = true  # Zero-downtime replacement
  }
}
```

## Lifecycle Arguments

| Argument | Purpose |
|----------|---------|
| `create_before_destroy` | Create replacement before destroying original |
| `prevent_destroy` | Prevent accidental deletion |
| `ignore_changes` | Ignore changes to specific attributes |
| `replace_triggered_by` | Force replacement when dependencies change |

## create_before_destroy

### Problem

```hcl
# Default behavior: destroy then create
# Causes downtime when replacing resources

resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.micro"
}

# When AMI changes:
# 1. Destroy old instance (downtime starts)
# 2. Create new instance (downtime ends)
```

### Solution

```hcl
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.micro"

  lifecycle {
    create_before_destroy = true
  }
}

# When AMI changes:
# 1. Create new instance
# 2. Update references (load balancer, etc.)
# 3. Destroy old instance
# Zero downtime!
```

### Common Use Cases

```hcl
# Security groups (referenced by instances)
resource "aws_security_group" "web" {
  name_prefix = "web-sg-"
  
  lifecycle {
    create_before_destroy = true
  }
}

# IAM roles (referenced by services)
resource "aws_iam_role" "app" {
  name_prefix = "app-role-"
  
  lifecycle {
    create_before_destroy = true
  }
}

# Launch templates (referenced by ASGs)
resource "aws_launch_template" "web" {
  name_prefix = "web-lt-"
  
  lifecycle {
    create_before_destroy = true
  }
}
```

## prevent_destroy

### Protect Critical Resources

```hcl
# Prevent accidental deletion of production database
resource "aws_db_instance" "production" {
  identifier     = "production-db"
  engine         = "postgres"
  instance_class = "db.r5.large"
  
  lifecycle {
    prevent_destroy = true
  }
}

# Prevent deletion of state bucket
resource "aws_s3_bucket" "terraform_state" {
  bucket = "my-terraform-state"
  
  lifecycle {
    prevent_destroy = true
  }
}

# Prevent deletion of encryption keys
resource "aws_kms_key" "main" {
  description = "Main encryption key"
  
  lifecycle {
    prevent_destroy = true
  }
}
```

### terraform destroy Behavior

```bash
# With prevent_destroy = true
terraform destroy

# Error: Instance cannot be destroyed
# Resource aws_db_instance.production has lifecycle.prevent_destroy set

# To actually destroy, first remove prevent_destroy from config
```

## ignore_changes

### Ignore External Modifications

```hcl
# Ignore tags managed by external automation
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.micro"
  
  tags = {
    Name = "web-server"
  }
  
  lifecycle {
    ignore_changes = [
      tags["LastBackup"],      # Updated by backup system
      tags["CostAllocation"],  # Updated by cost tool
    ]
  }
}

# Ignore ASG desired capacity (managed by auto-scaling)
resource "aws_autoscaling_group" "web" {
  name                = "web-asg"
  min_size            = 2
  max_size            = 10
  desired_capacity    = 2  # Initial value
  
  lifecycle {
    ignore_changes = [desired_capacity]
  }
}
```

### Ignore All Changes

```hcl
# Resource managed externally, just track in state
resource "aws_instance" "legacy" {
  ami           = "ami-12345678"
  instance_type = "t3.micro"
  
  lifecycle {
    ignore_changes = all
  }
}
```

### Common ignore_changes Patterns

```hcl
# EKS cluster version (upgraded via console/CLI)
resource "aws_eks_cluster" "main" {
  name    = "main"
  version = "1.27"
  
  lifecycle {
    ignore_changes = [version]
  }
}

# Lambda function code (deployed separately)
resource "aws_lambda_function" "app" {
  function_name = "app"
  filename      = "placeholder.zip"
  
  lifecycle {
    ignore_changes = [
      filename,
      source_code_hash,
    ]
  }
}

# RDS password (managed outside Terraform)
resource "aws_db_instance" "main" {
  identifier = "main"
  password   = "initial-password"
  
  lifecycle {
    ignore_changes = [password]
  }
}
```

## replace_triggered_by

### Force Replacement on Dependency Change

```hcl
# Replace instance when user data script changes
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.micro"
  user_data     = file("${path.module}/user-data.sh")
  
  lifecycle {
    replace_triggered_by = [
      null_resource.user_data_version
    ]
  }
}

resource "null_resource" "user_data_version" {
  triggers = {
    user_data_hash = filemd5("${path.module}/user-data.sh")
  }
}
```

### Replace on Module Output Change

```hcl
resource "aws_instance" "web" {
  ami           = module.ami.latest_id
  instance_type = "t3.micro"
  
  lifecycle {
    replace_triggered_by = [
      module.ami  # Replace when any module output changes
    ]
  }
}
```

## Combining Lifecycle Rules

```hcl
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.micro"
  
  tags = {
    Name = "web-server"
  }
  
  lifecycle {
    create_before_destroy = true
    prevent_destroy       = var.environment == "prod"
    
    ignore_changes = [
      tags["LastBackup"],
    ]
    
    replace_triggered_by = [
      null_resource.deployment_trigger
    ]
  }
}
```

## Preconditions and Postconditions

```hcl
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = var.instance_type
  
  lifecycle {
    precondition {
      condition     = var.environment != "prod" || var.instance_type != "t3.micro"
      error_message = "Production instances must be larger than t3.micro"
    }
    
    postcondition {
      condition     = self.public_ip != null
      error_message = "Instance must have a public IP"
    }
  }
}
```

## References

- [Lifecycle Meta-Argument](https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle)
- [Preconditions and Postconditions](https://developer.hashicorp.com/terraform/language/expressions/custom-conditions)


---

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


---

# resource-tagging

**Priority:** MEDIUM-HIGH  
**Category:** Resource Organization

## Why It Matters

Tags enable cost allocation, resource organization, automation, and compliance. Without consistent tagging, you cannot track costs by team, identify resource owners, or automate operations.

## Incorrect

```hcl
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.micro"
  # No tags - impossible to track ownership or costs
}

resource "aws_s3_bucket" "data" {
  bucket = "my-data-bucket"
  
  tags = {
    Name = "data"  # Minimal, inconsistent tagging
  }
}
```

**Problems:**
- Cannot determine resource owner
- Cannot allocate costs to teams/projects
- Cannot identify resources for automation
- Compliance violations

## Correct

### Define Standard Tags

```hcl
locals {
  required_tags = {
    Environment = var.environment
    Project     = var.project
    Owner       = var.owner
    ManagedBy   = "terraform"
    CostCenter  = var.cost_center
  }
}

resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.micro"
  
  tags = merge(local.required_tags, {
    Name = "${var.project}-${var.environment}-web"
    Role = "webserver"
  })
}

resource "aws_s3_bucket" "data" {
  bucket = "${var.project}-${var.environment}-data"
  
  tags = merge(local.required_tags, {
    Name        = "${var.project}-${var.environment}-data"
    DataClass   = "internal"
    Backup      = "daily"
  })
}
```

### Standard Tag Schema

| Tag | Required | Description | Example |
|-----|----------|-------------|---------|
| Environment | Yes | Deployment environment | prod, staging, dev |
| Project | Yes | Project or application name | myapp |
| Owner | Yes | Team or individual owner | platform-team |
| ManagedBy | Yes | How resource is managed | terraform |
| CostCenter | Yes | Cost allocation code | CC-12345 |
| Name | Recommended | Human-readable name | myapp-prod-web |

### Use Default Tags (AWS Provider 3.38+)

```hcl
provider "aws" {
  region = "us-east-1"
  
  default_tags {
    tags = {
      Environment = var.environment
      Project     = var.project
      Owner       = var.owner
      ManagedBy   = "terraform"
      CostCenter  = var.cost_center
    }
  }
}

# All resources automatically get default tags
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.micro"
  
  tags = {
    Name = "${var.project}-${var.environment}-web"
    Role = "webserver"
  }
}
```

### Tag Module Pattern

Create a reusable module for consistent tags:

```hcl
# Variables for the tags module
variable "environment" {
  type        = string
  description = "Environment name"
}

variable "project" {
  type        = string
  description = "Project name"
}

variable "owner" {
  type        = string
  description = "Resource owner"
}

variable "cost_center" {
  type        = string
  description = "Cost center code"
}

variable "additional_tags" {
  type        = map(string)
  default     = {}
  description = "Additional tags to apply"
}

# Output the merged tags
output "tags" {
  value = merge({
    Environment = var.environment
    Project     = var.project
    Owner       = var.owner
    ManagedBy   = "terraform"
    CostCenter  = var.cost_center
  }, var.additional_tags)
}
```

### Use in Root Module

```hcl
module "tags" {
  source = "./modules/tags"
  
  environment = "prod"
  project     = "myapp"
  owner       = "platform-team"
  cost_center = "CC-12345"
}

resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.micro"
  
  tags = merge(module.tags.tags, {
    Name = "myapp-prod-web"
  })
}
```

### Enforce Tagging with Policies

```hcl
# AWS Config rule to enforce tags
resource "aws_config_config_rule" "required_tags" {
  name = "required-tags"

  source {
    owner             = "AWS"
    source_identifier = "REQUIRED_TAGS"
  }

  input_parameters = jsonencode({
    tag1Key   = "Environment"
    tag2Key   = "Project"
    tag3Key   = "Owner"
    tag4Key   = "CostCenter"
  })
}
```

### Validate Tags in CI

```yaml
# .github/workflows/terraform.yml
- name: Check Required Tags
  run: |
    # Use tfsec or custom script to validate tags
    tfsec . --tfvars-file=prod.tfvars
```

## References

- [AWS Tagging Best Practices](https://docs.aws.amazon.com/general/latest/gr/aws_tagging.html)
- [AWS Default Tags](https://registry.terraform.io/providers/hashicorp/aws/latest/docs#default_tags)
- [Cost Allocation Tags](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/cost-alloc-tags.html)


---

# security-credentials

**Priority:** CRITICAL  
**Category:** Security Best Practices

## Why It Matters

Infrastructure provider credentials grant powerful access to your systems. Improper credential management leads to breaches, unauthorized access, and compliance violations.

## Incorrect

```hcl
# Hardcoded credentials in code
provider "aws" {
  access_key = "AKIAIOSFODNN7EXAMPLE"
  secret_key = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
}

# Credentials in terraform.tfvars committed to git
aws_access_key = "AKIAIOSFODNN7EXAMPLE"
aws_secret_key = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"

# Shared credentials across team
# "Just use the admin creds from the wiki"
```

**Problems:**
- Credentials in version control history forever
- No accountability (shared credentials)
- No rotation mechanism
- Broad access (everyone uses same creds)

## Correct

### Priority Order (Best to Good)

1. **Short-lived tokens** (OIDC, STS)
2. **Secrets management** (Vault, AWS Secrets Manager)
3. **Instance/workload identity** (IAM roles, service accounts)
4. **Environment variables** (not in code)

### Option 1: OIDC Federation (Recommended for CI/CD)

```yaml
# GitHub Actions with OIDC - no stored credentials
name: Deploy
on: push

permissions:
  id-token: write
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789:role/GitHubActionsRole
          aws-region: us-east-1
          # No access keys needed!
      
      - run: terraform apply -auto-approve
```

```hcl
# IAM role for GitHub OIDC
resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
}

resource "aws_iam_role" "github_actions" {
  name = "GitHubActionsRole"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Federated = aws_iam_openid_connect_provider.github.arn
      }
      Action = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
        }
        StringLike = {
          "token.actions.githubusercontent.com:sub" = "repo:myorg/myrepo:*"
        }
      }
    }]
  })
}
```

### Option 2: Secrets Management (Vault)

```hcl
# Retrieve credentials from Vault
provider "vault" {
  address = "https://vault.example.com"
}

data "vault_aws_access_credentials" "creds" {
  backend = "aws"
  role    = "terraform-role"
  type    = "sts"  # Short-lived STS credentials
}

provider "aws" {
  region     = "us-east-1"
  access_key = data.vault_aws_access_credentials.creds.access_key
  secret_key = data.vault_aws_access_credentials.creds.secret_key
  token      = data.vault_aws_access_credentials.creds.security_token
}
```

### Option 3: Instance/Workload Identity

```hcl
# Running on EC2 with instance profile - no credentials in code
provider "aws" {
  region = "us-east-1"
  # Automatically uses instance profile credentials
}

# Running on GKE with Workload Identity
provider "google" {
  project = "my-project"
  region  = "us-central1"
  # Automatically uses service account bound to pod
}
```

### Option 4: Environment Variables

```bash
# Set credentials in environment (not in code)
export AWS_ACCESS_KEY_ID="..."
export AWS_SECRET_ACCESS_KEY="..."
export AWS_REGION="us-east-1"

# Or use AWS CLI profiles
export AWS_PROFILE="company-prod"

terraform plan
```

```hcl
# Provider uses environment variables automatically
provider "aws" {
  region = "us-east-1"
  # No credentials specified - uses AWS_* env vars
}
```

### Credential Rotation

```hcl
# Use IAM access key rotation
resource "aws_iam_access_key" "terraform" {
  user = aws_iam_user.terraform.name
  
  lifecycle {
    create_before_destroy = true
  }
}

# Store in Secrets Manager with rotation
resource "aws_secretsmanager_secret_rotation" "terraform_creds" {
  secret_id           = aws_secretsmanager_secret.terraform_creds.id
  rotation_lambda_arn = aws_lambda_function.rotate_creds.arn
  
  rotation_rules {
    automatically_after_days = 30
  }
}
```

### Multi-Account with AssumeRole

```hcl
# Central identity account, assume into target accounts
provider "aws" {
  alias  = "prod"
  region = "us-east-1"
  
  assume_role {
    role_arn     = "arn:aws:iam::PROD_ACCOUNT:role/TerraformRole"
    session_name = "terraform-prod"
    external_id  = var.external_id  # Additional security
  }
}
```

### Never Commit Credentials

```gitignore
# .gitignore
*.tfvars
!example.tfvars
.env
.env.*
credentials*
*.pem
*.key
```

## References

- [HashiCorp Credential Management](https://developer.hashicorp.com/terraform/cloud-docs/recommended-practices/part2#q9-how-are-infrastructure-service-provider-credentials-managed)
- [AWS OIDC Provider](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc.html)
- [Vault AWS Secrets Engine](https://developer.hashicorp.com/vault/docs/secrets/aws)


---

# security-iam-least-privilege

**Priority:** CRITICAL  
**Category:** Security Best Practices

## Why It Matters

Overly permissive IAM policies increase blast radius when credentials are compromised. Always grant the minimum permissions required for a resource to function.

## Incorrect

```hcl
resource "aws_iam_role_policy" "lambda_policy" {
  name = "lambda-policy"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = "*"
        Resource = "*"
      }
    ]
  })
}
```

**Problem:** Lambda has full access to all AWS services. A compromise gives attacker complete control.

## Correct

```hcl
resource "aws_iam_role_policy" "lambda_policy" {
  name = "lambda-policy"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "ReadFromS3Bucket"
        Effect   = "Allow"
        Action   = [
          "s3:GetObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.data.arn,
          "${aws_s3_bucket.data.arn}/*"
        ]
      },
      {
        Sid      = "WriteToSQSQueue"
        Effect   = "Allow"
        Action   = [
          "sqs:SendMessage"
        ]
        Resource = aws_sqs_queue.notifications.arn
      },
      {
        Sid      = "WriteLogs"
        Effect   = "Allow"
        Action   = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:log-group:/aws/lambda/${var.function_name}:*"
      }
    ]
  })
}
```

## Best Practices

1. **Specific actions** - List exact API actions needed
2. **Specific resources** - Reference exact ARNs, not wildcards
3. **Use conditions** - Add conditions where applicable
4. **Separate statements** - Group by purpose with Sid
5. **Regular audits** - Review permissions periodically

## Using Data Sources for ARNs

```hcl
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

locals {
  account_id = data.aws_caller_identity.current.account_id
  region     = data.aws_region.current.name
}

resource "aws_iam_role_policy" "specific_policy" {
  policy = jsonencode({
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["dynamodb:GetItem", "dynamodb:PutItem"]
        Resource = "arn:aws:dynamodb:${local.region}:${local.account_id}:table/${var.table_name}"
      }
    ]
  })
}
```

## References

- [IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
- [IAM Policy Simulator](https://policysim.aws.amazon.com/)


---

# security-no-hardcoded-secrets

**Priority:** CRITICAL  
**Category:** Security Best Practices

## Why It Matters

Hardcoded secrets in Terraform code get committed to version control, logged in CI outputs, and stored in state files. This creates serious security vulnerabilities.

## Incorrect

```hcl
resource "aws_db_instance" "database" {
  identifier     = "prod-database"
  engine         = "postgres"
  instance_class = "db.t3.micro"
  
  # NEVER DO THIS
  username = "admin"
  password = "SuperSecret123!"
}

provider "aws" {
  region     = "us-east-1"
  # NEVER DO THIS
  access_key = "AKIAIOSFODNN7EXAMPLE"
  secret_key = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
}
```

**Problem:** Credentials exposed in code, state file, and git history.

## Correct

**Option 1: Environment Variables**

```hcl
variable "db_password" {
  type        = string
  sensitive   = true
  description = "Database password - set via TF_VAR_db_password"
}

resource "aws_db_instance" "database" {
  identifier     = "prod-database"
  engine         = "postgres"
  instance_class = "db.t3.micro"
  username       = "admin"
  password       = var.db_password
}
```

**Option 2: Secrets Manager**

```hcl
data "aws_secretsmanager_secret_version" "db_creds" {
  secret_id = "prod/database/credentials"
}

locals {
  db_creds = jsondecode(data.aws_secretsmanager_secret_version.db_creds.secret_string)
}

resource "aws_db_instance" "database" {
  identifier     = "prod-database"
  engine         = "postgres"
  instance_class = "db.t3.micro"
  username       = local.db_creds.username
  password       = local.db_creds.password
}
```

**Option 3: Random Password Generation**

```hcl
resource "random_password" "db_password" {
  length  = 32
  special = true
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id     = aws_secretsmanager_secret.db_password.id
  secret_string = random_password.db_password.result
}

resource "aws_db_instance" "database" {
  identifier     = "prod-database"
  engine         = "postgres"
  instance_class = "db.t3.micro"
  username       = "admin"
  password       = random_password.db_password.result
}
```

## Additional Context

- Mark sensitive variables with `sensitive = true`
- Use `.gitignore` to exclude `.tfvars` files with secrets
- Consider using SOPS or sealed-secrets for encrypted values

## References

- [Sensitive Variables](https://developer.hashicorp.com/terraform/language/values/variables#suppressing-values-in-cli-output)
- [AWS Secrets Manager](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/secretsmanager_secret_version)


---

# state-import

**Priority:** MEDIUM-HIGH  
**Category:** State Management

## Why It Matters

Most organizations have existing infrastructure created manually or by other tools. Import brings these resources under Terraform management, providing a single source of truth and preventing configuration drift.

## Incorrect

```bash
# Infrastructure exists but Terraform doesn't know about it
terraform plan
# Plan: 5 to add, 0 to change, 0 to destroy

# Terraform wants to CREATE resources that already exist!
# This will fail or create duplicates
```

## Correct

### Step 1: Write the Configuration

```hcl
# First, write the resource configuration
resource "aws_instance" "web" {
  ami           = "ami-12345678"
  instance_type = "t3.micro"
  subnet_id     = "subnet-abc123"
  
  tags = {
    Name = "production-web-server"
  }
}
```

### Step 2: Import the Resource

```bash
# Import existing resource into state
terraform import aws_instance.web i-1234567890abcdef0

# Verify import
terraform state show aws_instance.web
```

### Step 3: Adjust Configuration

```bash
# Run plan to see differences
terraform plan

# Update your configuration to match the actual resource
# Repeat until plan shows no changes
```

### Import Block (Terraform 1.5+)

```hcl
# Declarative import - preferred method
import {
  to = aws_instance.web
  id = "i-1234567890abcdef0"
}

resource "aws_instance" "web" {
  ami           = "ami-12345678"
  instance_type = "t3.micro"
  # ...
}
```

```bash
# Generate configuration from import
terraform plan -generate-config-out=generated.tf
```

### Bulk Import with for_each

```hcl
# Import multiple resources
locals {
  existing_instances = {
    "web-1" = "i-111111111"
    "web-2" = "i-222222222"
    "web-3" = "i-333333333"
  }
}

import {
  for_each = local.existing_instances
  to       = aws_instance.web[each.key]
  id       = each.value
}

resource "aws_instance" "web" {
  for_each      = local.existing_instances
  ami           = "ami-12345678"
  instance_type = "t3.micro"
}
```

### Common Import Commands

```bash
# AWS Examples
terraform import aws_vpc.main vpc-abc123
terraform import aws_subnet.public subnet-abc123
terraform import aws_security_group.web sg-abc123
terraform import aws_db_instance.main mydb
terraform import aws_s3_bucket.data my-bucket-name
terraform import aws_iam_role.app my-role-name

# Module resources
terraform import module.vpc.aws_vpc.this vpc-abc123

# Resources with complex IDs
terraform import 'aws_route53_record.www["A"]' 'Z123456_example.com_A'
```

### Import Strategy for Large Environments

```bash
# 1. Inventory existing resources
aws ec2 describe-instances --query 'Reservations[].Instances[].InstanceId'

# 2. Create import script
#!/bin/bash
terraform import aws_instance.web[0] i-111111111
terraform import aws_instance.web[1] i-222222222
terraform import aws_instance.web[2] i-333333333

# 3. Run imports
chmod +x import.sh
./import.sh

# 4. Generate configurations
terraform plan -generate-config-out=imported.tf

# 5. Review and refactor generated code
```

### Tools for Bulk Import

Several tools help with large-scale imports:

```bash
# terraformer - generate TF from existing infrastructure
terraformer import aws --resources=vpc,subnet,security_group

# former2 - AWS CloudFormation/Terraform generator
# Use web interface to select resources
```

### Handling Import Errors

```bash
# Resource not found
Error: Cannot import non-existent remote object
# Verify the resource ID is correct

# Resource already managed
Error: Resource already managed by Terraform
# Check state: terraform state list | grep resource_name

# Wrong resource type
Error: resource address does not match
# Ensure resource type matches (aws_instance vs aws_spot_instance_request)
```

### Post-Import Checklist

```markdown
- [ ] Import successful (terraform import)
- [ ] Configuration matches actual resource (terraform plan shows no changes)
- [ ] Sensitive values moved to variables
- [ ] Tags and naming conventions applied
- [ ] Documentation updated
- [ ] Team notified of newly managed resources
```

### Preventing Accidental Destruction

```hcl
# Protect imported resources during transition
resource "aws_instance" "web" {
  # ... configuration ...
  
  lifecycle {
    prevent_destroy = true  # Remove after confirming import is correct
  }
}
```

## References

- [Terraform Import](https://developer.hashicorp.com/terraform/cli/import)
- [Import Block](https://developer.hashicorp.com/terraform/language/import)
- [Generating Configuration](https://developer.hashicorp.com/terraform/language/import/generating-configuration)


---

# state-locking

**Priority:** CRITICAL  
**Category:** State Management

## Why It Matters

Without state locking, concurrent Terraform operations can corrupt state or cause race conditions. Always enable locking to prevent multiple users or CI jobs from modifying state simultaneously.

## Incorrect

```hcl
terraform {
  backend "s3" {
    bucket = "my-terraform-state"
    key    = "prod/terraform.tfstate"
    region = "us-east-1"
    # No DynamoDB table for locking
  }
}
```

**Problem:** Two engineers running `terraform apply` simultaneously can corrupt state.

## Correct

```hcl
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"
  }
}
```

**For GCS:**

```hcl
terraform {
  backend "gcs" {
    bucket = "my-terraform-state"
    prefix = "prod"
    # GCS has built-in locking, no additional config needed
  }
}
```

## Creating the Lock Table

```hcl
resource "aws_dynamodb_table" "terraform_locks" {
  name         = "terraform-locks"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  tags = {
    Purpose = "Terraform state locking"
  }
}
```

## References

- [State Locking](https://developer.hashicorp.com/terraform/language/state/locking)


---

# state-remote-backend

**Priority:** CRITICAL  
**Category:** State Management

## Why It Matters

Local state files are a single point of failure and make collaboration impossible. Remote backends provide durability, locking, and team access to state.

## Incorrect

```hcl
# No backend configuration - state stored locally
terraform {
  required_version = ">= 1.0"
}

resource "aws_instance" "web" {
  ami           = "ami-12345678"
  instance_type = "t3.micro"
}
```

**Problem:** State stored in `terraform.tfstate` locally. If lost, Terraform loses track of all managed resources.

## Correct

```hcl
terraform {
  required_version = ">= 1.0"
  
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"
  }
}

resource "aws_instance" "web" {
  ami           = "ami-12345678"
  instance_type = "t3.micro"
}
```

**Benefits:**
- State persisted durably in S3
- State locking via DynamoDB prevents concurrent modifications
- Encryption at rest for sensitive data
- Team members can access shared state

## Additional Context

Popular remote backend options:
- **S3** - AWS native, use with DynamoDB for locking
- **GCS** - Google Cloud Storage with built-in locking
- **Azure Blob** - Azure native backend
- **Terraform Cloud** - Managed backend with additional features
- **Terramate Cloud** - GitOps-native state management

## References

- [Terraform Backend Configuration](https://developer.hashicorp.com/terraform/language/settings/backends/configuration)
- [S3 Backend](https://developer.hashicorp.com/terraform/language/settings/backends/s3)


---

# test-policy-as-code

**Priority:** LOW  
**Category:** Testing & Validation

## Why It Matters

Policy as code enforces organizational standards automatically, catching security violations and compliance issues before deployment. It shifts security left and scales governance.

## Incorrect

```hcl
# No policy enforcement - security issues reach production
resource "aws_s3_bucket" "data" {
  bucket = "my-data"
  # No encryption - violates policy
  # No logging - violates compliance
  # Discovered in security audit months later
}

resource "aws_security_group_rule" "ssh" {
  type        = "ingress"
  from_port   = 22
  to_port     = 22
  cidr_blocks = ["0.0.0.0/0"]  # Open to world - security risk
}
```

## Correct

```bash
# Automated policy checks in CI/CD
terraform plan -out=tfplan
terraform show -json tfplan > tfplan.json

# Run policy checks before apply
conftest test tfplan.json -p policy/
checkov -d .
tfsec .
```

## Tools Overview

| Tool | Use Case | Integration |
|------|----------|-------------|
| Sentinel | HashiCorp Enterprise | Terraform Cloud/Enterprise |
| OPA/Conftest | Open source | CI/CD, local |
| Checkov | Security scanning | CI/CD, local |
| tfsec | Security scanning | CI/CD, local |
| Terramate | Stack policies | CI/CD, local |

## OPA/Conftest Example

```rego
# policy/terraform.rego
package main

# Deny S3 buckets without encryption
deny[msg] {
  resource := input.resource_changes[_]
  resource.type == "aws_s3_bucket"
  resource.change.after.server_side_encryption_configuration == null
  
  msg := sprintf("S3 bucket '%s' must have encryption enabled", [resource.name])
}

# Deny public security groups
deny[msg] {
  resource := input.resource_changes[_]
  resource.type == "aws_security_group_rule"
  resource.change.after.cidr_blocks[_] == "0.0.0.0/0"
  resource.change.after.type == "ingress"
  
  msg := sprintf("Security group rule '%s' allows ingress from 0.0.0.0/0", [resource.name])
}

# Require tags
deny[msg] {
  resource := input.resource_changes[_]
  required_tags := {"Environment", "Owner", "Project"}
  provided_tags := {tag | resource.change.after.tags[tag]}
  missing := required_tags - provided_tags
  count(missing) > 0
  
  msg := sprintf("Resource '%s' missing required tags: %v", [resource.name, missing])
}
```

### Running Conftest

```bash
# Generate plan JSON
terraform plan -out=tfplan
terraform show -json tfplan > tfplan.json

# Run policy check
conftest test tfplan.json -p policy/
```

## Checkov Example

```yaml
# .checkov.yaml
framework:
  - terraform

check:
  - CKV_AWS_18  # S3 bucket logging
  - CKV_AWS_19  # S3 bucket encryption
  - CKV_AWS_21  # S3 bucket versioning
  
skip-check:
  - CKV_AWS_144  # Skip cross-region replication (not needed)

soft-fail-on:
  - CKV_AWS_33  # Warn but don't fail on KMS rotation
```

```bash
# Run Checkov
checkov -d . --config-file .checkov.yaml
```

## tfsec Example

```yaml
# .tfsec/config.yml
severity_overrides:
  AWS002: ERROR    # S3 bucket without logging
  AWS017: WARNING  # S3 bucket without versioning

exclude:
  - AWS089  # CloudWatch log group encryption
```

```bash
# Run tfsec
tfsec . --config-file .tfsec/config.yml
```

## CI/CD Integration

```yaml
# GitHub Actions
name: Terraform Policy Check

on: [pull_request]

jobs:
  policy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        
      - name: Terraform Plan
        run: |
          terraform init
          terraform plan -out=tfplan
          terraform show -json tfplan > tfplan.json
          
      - name: Run Checkov
        uses: bridgecrewio/checkov-action@master
        with:
          directory: .
          
      - name: Run Conftest
        uses: instrumenta/conftest-action@master
        with:
          files: tfplan.json
          policy: policy/
```

## Terramate Policies

```hcl
# terramate.tm.hcl
terramate {
  config {
    experiments = ["scripts"]
  }
}

script "validate" {
  description = "Run all validations"
  
  job {
    commands = [
      ["terraform", "validate"],
      ["tfsec", "."],
      ["checkov", "-d", "."],
    ]
  }
}
```

## References

- [OPA Terraform](https://www.openpolicyagent.org/docs/latest/terraform/)
- [Checkov](https://www.checkov.io/)
- [tfsec](https://aquasecurity.github.io/tfsec/)
- [Sentinel](https://developer.hashicorp.com/sentinel)


---

# test-strategies

**Priority:** MEDIUM  
**Category:** Testing & Validation

## Why It Matters

Testing catches errors before they reach production. Different testing strategies validate different aspects of your Terraform code, from syntax to actual infrastructure behavior.

## Incorrect

```bash
# No testing - errors discovered in production
vim main.tf
terraform apply -auto-approve
# Hope it works!

# Problems found after deployment:
# - Syntax errors
# - Security misconfigurations
# - Missing resources
# - Wrong configurations
```

## Correct

```bash
# Multi-layer testing strategy
terraform fmt -check        # Format check
terraform validate          # Syntax validation
tflint --recursive          # Static analysis
tfsec .                     # Security scanning
terraform plan -out=tfplan  # Plan review
conftest test tfplan.json   # Policy checks
terraform test              # Native tests (1.6+)
```

## Testing Pyramid

```
                    ┌─────────────┐
                    │ Integration │  Slowest, most confidence
                    │    Tests    │
                    └─────────────┘
                   ┌───────────────┐
                   │  Plan Tests   │
                   └───────────────┘
                  ┌─────────────────┐
                  │  Static Analysis │
                  └─────────────────┘
                 ┌───────────────────┐
                 │  Format & Validate │  Fastest, basic checks
                 └───────────────────┘
```

## Level 1: Format and Validate

```bash
# Format check (fast, catches style issues)
terraform fmt -check -recursive -diff

# Validate syntax and configuration
terraform init -backend=false
terraform validate
```

### CI Pipeline

```yaml
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3
      
      - name: Format Check
        run: terraform fmt -check -recursive
        
      - name: Validate
        run: |
          terraform init -backend=false
          terraform validate
```

## Level 2: Static Analysis

### tflint

```hcl
# .tflint.hcl
config {
  plugin_dir = "~/.tflint.d/plugins"
}

plugin "aws" {
  enabled = true
  version = "0.27.0"
  source  = "github.com/terraform-linters/tflint-ruleset-aws"
}

rule "terraform_naming_convention" {
  enabled = true
}

rule "terraform_documented_variables" {
  enabled = true
}
```

```bash
tflint --init
tflint --recursive
```

### Security Scanning

```bash
# tfsec - security focused
tfsec .

# checkov - compliance and security
checkov -d .

# trivy - vulnerability scanning
trivy config .
```

### Example Output

```bash
$ tfsec .
Result: CRITICAL - Security group rule allows all traffic
Resource: aws_security_group_rule.bad_rule
Location: main.tf:15

$ checkov -d .
Passed checks: 45
Failed checks: 3
  - CKV_AWS_23: "Ensure every security group rule has a description"
  - CKV_AWS_24: "Ensure no security group allows ingress from 0.0.0.0/0 to port 22"
```

## Level 3: Plan Tests

### Terraform Plan Analysis

```bash
# Generate plan
terraform plan -out=tfplan

# Convert to JSON for analysis
terraform show -json tfplan > tfplan.json

# Analyze with custom scripts or tools
```

### OPA/Conftest for Plan Validation

```rego
# policy/terraform.rego
package main

# Deny resources without required tags
deny[msg] {
  resource := input.resource_changes[_]
  not resource.change.after.tags.Environment
  msg := sprintf("Resource %s missing required 'Environment' tag", [resource.address])
}

# Deny overly permissive security groups
deny[msg] {
  resource := input.resource_changes[_]
  resource.type == "aws_security_group_rule"
  resource.change.after.cidr_blocks[_] == "0.0.0.0/0"
  resource.change.after.from_port == 22
  msg := sprintf("Security group %s allows SSH from anywhere", [resource.address])
}
```

```bash
conftest test tfplan.json -p policy/
```

### Terraform Test (Native)

```hcl
# tests/basic.tftest.hcl
run "verify_vpc_created" {
  command = plan
  
  assert {
    condition     = aws_vpc.main.cidr_block == "10.0.0.0/16"
    error_message = "VPC CIDR block is incorrect"
  }
}

run "verify_tags" {
  command = plan
  
  assert {
    condition     = aws_vpc.main.tags["Environment"] == var.environment
    error_message = "Environment tag not set correctly"
  }
}
```

```bash
terraform test
```

## Level 4: Integration Tests

### Terratest (Go)

```go
// test/vpc_test.go
package test

import (
    "testing"
    "github.com/gruntwork-io/terratest/modules/terraform"
    "github.com/stretchr/testify/assert"
)

func TestVpcModule(t *testing.T) {
    t.Parallel()

    terraformOptions := terraform.WithDefaultRetryableErrors(t, &terraform.Options{
        TerraformDir: "./fixtures/vpc",  // Path to test fixture
        Vars: map[string]interface{}{
            "vpc_cidr":    "10.0.0.0/16",
            "environment": "test",
        },
    })

    // Clean up after test
    defer terraform.Destroy(t, terraformOptions)

    // Deploy infrastructure
    terraform.InitAndApply(t, terraformOptions)

    // Validate outputs
    vpcId := terraform.Output(t, terraformOptions, "vpc_id")
    assert.NotEmpty(t, vpcId)

    // Verify actual AWS resources
    // ... additional AWS SDK calls to verify infrastructure
}
```

### Test Fixtures

```hcl
# Test fixture that uses the module under test
module "vpc" {
  source = "../../"  # Reference to module being tested
  
  vpc_cidr    = "10.0.0.0/16"
  environment = "test"
  
  # Test-specific configuration
  enable_nat_gateway = false
}

output "vpc_id" {
  value = module.vpc.vpc_id
}
```

## Test Strategy by Environment

| Stage | Tests | When |
|-------|-------|------|
| Local | Format, Validate | Before commit |
| PR | Static analysis, Plan tests | On pull request |
| Staging | Integration tests | After merge |
| Prod | Smoke tests, Drift detection | After deploy |

## CI/CD Pipeline Example

```yaml
name: Terraform CI

on:
  pull_request:
    paths: ['**.tf']
  push:
    branches: [main]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3
      
      - name: Format
        run: terraform fmt -check -recursive
        
      - name: Validate
        run: |
          terraform init -backend=false
          terraform validate

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: tfsec
        uses: aquasecurity/tfsec-action@v1.0.0
        
      - name: checkov
        uses: bridgecrewio/checkov-action@master
        with:
          directory: .

  plan:
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3
      
      - name: Plan
        run: |
          terraform init
          terraform plan -out=tfplan
          
      - name: Policy Check
        run: |
          terraform show -json tfplan > tfplan.json
          conftest test tfplan.json -p policy/

  integration:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v4
      
      - name: Integration Tests
        run: |
          cd test
          go test -v -timeout 30m
```

## References

- [Terraform Test](https://developer.hashicorp.com/terraform/language/tests)
- [Terratest](https://terratest.gruntwork.io/)
- [tfsec](https://github.com/aquasecurity/tfsec)
- [Checkov](https://www.checkov.io/)
- [Conftest](https://www.conftest.dev/)


---

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


---

# variable-sensitive

**Priority:** CRITICAL  
**Category:** Security Best Practices

## Why It Matters

Sensitive values like passwords and API keys can leak through CLI output, logs, and CI/CD pipelines. Mark them as sensitive and never provide default values for required secrets.

## Incorrect

```hcl
variable "database_password" {
  type    = string
  default = ""  # Empty default allows skipping required secret
}

variable "api_key" {
  type = string
  # Not marked sensitive - will show in plan output
}

# In terraform plan output:
# + password = "actual-secret-value"  # LEAKED!
```

**Problem:** Secrets visible in terraform output, CI logs, and state files.

## Correct

```hcl
variable "database_password" {
  type        = string
  sensitive   = true
  description = "Database master password. Set via TF_VAR_database_password."
  # No default - forces user to provide value
}

variable "api_key" {
  type        = string
  sensitive   = true
  description = "API key for external service."
}

# Optional secret with auto-generation
variable "random_password" {
  type        = string
  default     = null
  sensitive   = true
  description = "Password. If not provided, one will be generated."
}

resource "random_password" "generated" {
  count   = var.random_password == null ? 1 : 0
  length  = 32
  special = true
}

locals {
  actual_password = coalesce(var.random_password, try(random_password.generated[0].result, null))
}
```

## Terraform Output with Sensitive Values

```hcl
# In terraform plan output:
# + password = (sensitive value)  # Protected!
```

## Passing Sensitive Values

### Environment Variables

```bash
export TF_VAR_database_password="secure-password-here"
terraform apply
```

### Terraform Cloud/Enterprise Variables

Mark variables as "Sensitive" in the UI or API.

### From Secret Stores

```hcl
# Read from AWS Secrets Manager
data "aws_secretsmanager_secret_version" "db" {
  secret_id = "prod/database/password"
}

# The retrieved value is automatically marked sensitive
resource "aws_db_instance" "main" {
  password = data.aws_secretsmanager_secret_version.db.secret_string
}
```

## Sensitive Outputs

```hcl
# Mark outputs containing secrets as sensitive
output "database_connection_string" {
  value       = "postgres://${var.db_user}:${var.db_password}@${aws_db_instance.main.endpoint}/mydb"
  sensitive   = true
  description = "Database connection string (contains credentials)"
}
```

## Warning About State Files

Even with `sensitive = true`, secret values are stored in plaintext in the Terraform state file. Protect state files by:

1. Using encrypted remote backends
2. Restricting access to state storage
3. Using Terraform Cloud with state encryption
4. Never committing state files to version control

```hcl
terraform {
  backend "s3" {
    bucket  = "terraform-state"
    key     = "prod/terraform.tfstate"
    region  = "us-east-1"
    encrypt = true  # Enable server-side encryption
  }
}
```

## References

- [Sensitive Variables](https://developer.hashicorp.com/terraform/language/values/variables#suppressing-values-in-cli-output)
- [Sensitive Outputs](https://developer.hashicorp.com/terraform/language/values/outputs#sensitive-suppressing-values-in-cli-output)


---

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


---

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


---

