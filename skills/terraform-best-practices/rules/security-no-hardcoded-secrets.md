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
