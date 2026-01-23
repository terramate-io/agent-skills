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
