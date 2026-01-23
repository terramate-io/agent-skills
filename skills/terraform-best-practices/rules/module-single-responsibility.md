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
