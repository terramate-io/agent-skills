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
