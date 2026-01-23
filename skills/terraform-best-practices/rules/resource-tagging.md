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
