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
