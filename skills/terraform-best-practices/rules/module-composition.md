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
