# output-no-secrets

**Priority:** CRITICAL  
**Category:** Security Best Practices

## Why It Matters

Outputs are logged, displayed in CI/CD pipelines, stored in state, and accessible via `terraform output`. Secrets in outputs can easily leak to unauthorized parties.

## Incorrect

```hcl
output "database_password" {
  value = random_password.db.result
  # Secret exposed in terraform output!
}

output "api_credentials" {
  value = {
    client_id     = var.client_id
    client_secret = var.client_secret  # Secret leaked!
  }
}

output "connection_string" {
  value = "postgres://admin:${random_password.db.result}@${aws_db_instance.main.endpoint}/mydb"
  # Password embedded in output!
}
```

**Problem:** Running `terraform output` or viewing CI logs exposes secrets.

## Correct

### Store Secrets in Secret Managers

```hcl
# Generate password
resource "random_password" "db" {
  length  = 32
  special = true
}

# Store in AWS Secrets Manager
resource "aws_secretsmanager_secret" "db_password" {
  name = "${var.environment}/database/password"
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id     = aws_secretsmanager_secret.db_password.id
  secret_string = random_password.db.result
}

# Output the location, not the value
output "database_password_secret_arn" {
  value       = aws_secretsmanager_secret.db_password.arn
  description = "ARN of the Secrets Manager secret containing the database password"
}

output "database_password_secret_name" {
  value       = aws_secretsmanager_secret.db_password.name
  description = "Name of the Secrets Manager secret containing the database password"
}
```

### Store in SSM Parameter Store

```hcl
resource "aws_ssm_parameter" "db_password" {
  name        = "/${var.environment}/database/password"
  description = "Database master password"
  type        = "SecureString"
  value       = random_password.db.result

  tags = var.tags
}

output "database_password_parameter_name" {
  value       = aws_ssm_parameter.db_password.name
  description = "SSM parameter name for database password. Retrieve with: aws ssm get-parameter --name ${aws_ssm_parameter.db_password.name} --with-decryption"
}
```

### Provide Instructions Instead

```hcl
output "database_credentials_info" {
  value       = "Database credentials stored in SSM at /${var.environment}/database/*"
  description = "Location of database credentials in SSM Parameter Store"
}

output "retrieve_password_command" {
  value       = "aws ssm get-parameter --name '/${var.environment}/database/password' --with-decryption --query 'Parameter.Value' --output text"
  description = "AWS CLI command to retrieve the database password"
}
```

## If You Must Output Secrets

In rare cases where secrets must be output (e.g., bootstrap scenarios), always mark as sensitive:

```hcl
output "initial_admin_password" {
  value       = random_password.admin.result
  sensitive   = true
  description = "Initial admin password. Change immediately after first login."
}
```

**Note:** Even with `sensitive = true`:
- Value is still in the state file in plaintext
- Can be retrieved with `terraform output -json`
- Better to avoid entirely

## Root Modules vs Reusable Modules

- **Root modules (components):** Never output secrets
- **Reusable modules:** May output secrets if needed for composition, but mark as `sensitive = true`

```hcl
# In a reusable module - acceptable with sensitive
output "generated_password" {
  value       = random_password.this.result
  sensitive   = true
  description = "Generated password for use by parent module"
}

# In root module - store instead of output
resource "aws_ssm_parameter" "password" {
  name  = "/app/password"
  type  = "SecureString"
  value = module.database.generated_password
}
```

## References

- [Sensitive Outputs](https://developer.hashicorp.com/terraform/language/values/outputs#sensitive-suppressing-values-in-cli-output)
- [AWS Secrets Manager](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/secretsmanager_secret)
- [AWS SSM Parameter Store](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ssm_parameter)
