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
