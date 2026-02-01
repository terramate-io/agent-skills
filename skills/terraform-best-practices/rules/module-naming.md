# module-naming

**Priority:** HIGH  
**Category:** Module Design

## Why It Matters

Consistent naming conventions make modules discoverable, indicate their purpose, and follow community standards. Well-named modules are easier to find, understand, and reuse.

## Incorrect

```hcl
# Inconsistent naming patterns
module "vpc" {
  source = "./modules/vpc-module"
}

module "s3" {
  source = "./modules/storage"
}

module "db" {
  source = "./modules/database-module"
}

# Or worse - no clear pattern
module "infra1" {
  source = "./modules/module1"
}
```

**Problem:** Inconsistent naming makes modules hard to discover and understand. No indication of provider or purpose.

## Correct

### Standard Naming Convention

For reusable modules (especially public/registry modules):

```
terraform-<PROVIDER>-<NAME>
```

**Examples:**
- `terraform-aws-vpc` - AWS VPC module
- `terraform-aws-eks` - AWS EKS cluster module
- `terraform-aws-rds` - AWS RDS database module
- `terraform-google-network` - GCP network module
- `terraform-azurerm-aks` - Azure AKS module

### Directory Structure

```
modules/
├── terraform-aws-vpc/
│   ├── main.tf
│   ├── variables.tf
│   ├── outputs.tf
│   ├── versions.tf
│   └── README.md
├── terraform-aws-eks/
│   ├── main.tf
│   ├── variables.tf
│   ├── outputs.tf
│   └── README.md
```

### Module Usage

```hcl
# Registry module
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.1.2"
  
  name = "my-vpc"
  cidr = "10.0.0.0/16"
}

# Local module following convention
module "vpc" {
  source = "./modules/terraform-aws-vpc"
  
  name = "my-vpc"
  cidr = "10.0.0.0/16"
}

# Git module
module "vpc" {
  source = "git::https://github.com/myorg/terraform-aws-vpc.git?ref=v1.0.0"
  
  name = "my-vpc"
  cidr = "10.0.0.0/16"
}
```

### Internal/Private Modules

For internal modules, you can use shorter names but maintain consistency:

```hcl
# Option 1: Keep full convention
module "vpc" {
  source = "./modules/terraform-aws-vpc"
}

# Option 2: Shorter internal convention (if consistent)
module "vpc" {
  source = "./modules/aws-vpc"  # Still indicates provider
}

# Option 3: Organization-specific prefix
module "vpc" {
  source = "./modules/acme-aws-vpc"  # acme = company name
}
```

### Naming Guidelines

1. **Use kebab-case** - `terraform-aws-vpc`, not `terraform_aws_vpc` or `terraformAwsVpc`
2. **Include provider** - Makes it clear which cloud provider
3. **Be descriptive** - `terraform-aws-vpc` is better than `terraform-aws-networking`
4. **Avoid abbreviations** - `terraform-aws-database` not `terraform-aws-db`
5. **Use singular** - `terraform-aws-instance` not `terraform-aws-instances`

### Module Variable Naming

```hcl
# Variables should match module purpose
variable "vpc_name" {
  type        = string
  description = "Name of the VPC"
}

variable "vpc_cidr" {
  type        = string
  description = "CIDR block for the VPC"
}

# Avoid generic names
variable "name" {  # Too generic
  type = string
}

variable "cidr" {  # Too generic
  type = string
}
```

### Module Output Naming

```hcl
# Outputs should be descriptive and prefixed
output "vpc_id" {
  value       = aws_vpc.main.id
  description = "ID of the VPC"
}

output "vpc_cidr_block" {
  value       = aws_vpc.main.cidr_block
  description = "CIDR block of the VPC"
}

output "public_subnet_ids" {
  value       = aws_subnet.public[*].id
  description = "List of public subnet IDs"
}
```

### Terraform Resource Names

Within modules, use consistent resource naming:

```hcl
# Use descriptive names
resource "aws_vpc" "main" {
  # Main VPC resource
}

resource "aws_subnet" "public" {
  # Public subnet
}

resource "aws_subnet" "private" {
  # Private subnet
}

# Avoid generic names
resource "aws_vpc" "vpc" {  # Redundant
resource "aws_subnet" "subnet1" {  # Non-descriptive
```

## Additional Context

### Registry Module Naming

When publishing to Terraform Registry:
- Follow `terraform-<PROVIDER>-<NAME>` pattern
- Check for naming conflicts
- Use descriptive, searchable names
- Consider SEO (what will users search for?)

### Module Documentation

Include naming in README:

```markdown
# terraform-aws-vpc

Terraform module for creating AWS VPC infrastructure.

## Usage

```hcl
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.1.2"
  
  name = "my-vpc"
  cidr = "10.0.0.0/16"
}
```
```

## References

- [Terraform Registry Module Naming](https://www.terraform.io/docs/registry/modules/publish.html)
- [terraform-aws-modules Naming Convention](https://github.com/terraform-aws-modules)
