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
