# test-policy-as-code

**Priority:** LOW  
**Category:** Testing & Validation

## Why It Matters

Policy as code enforces organizational standards automatically, catching security violations and compliance issues before deployment. It shifts security left and scales governance.

## Incorrect

```hcl
# No policy enforcement - security issues reach production
resource "aws_s3_bucket" "data" {
  bucket = "my-data"
  # No encryption - violates policy
  # No logging - violates compliance
  # Discovered in security audit months later
}

resource "aws_security_group_rule" "ssh" {
  type        = "ingress"
  from_port   = 22
  to_port     = 22
  cidr_blocks = ["0.0.0.0/0"]  # Open to world - security risk
}
```

## Correct

```bash
# Automated policy checks in CI/CD
terraform plan -out=tfplan
terraform show -json tfplan > tfplan.json

# Run policy checks before apply
conftest test tfplan.json -p policy/
checkov -d .
tfsec .
```

## Tools Overview

| Tool | Use Case | Integration |
|------|----------|-------------|
| Sentinel | HashiCorp Enterprise | Terraform Cloud/Enterprise |
| OPA/Conftest | Open source | CI/CD, local |
| Checkov | Security scanning | CI/CD, local |
| tfsec | Security scanning | CI/CD, local |
| Terramate | Stack policies | CI/CD, local |

## OPA/Conftest Example

```rego
# policy/terraform.rego
package main

# Deny S3 buckets without encryption
deny[msg] {
  resource := input.resource_changes[_]
  resource.type == "aws_s3_bucket"
  resource.change.after.server_side_encryption_configuration == null
  
  msg := sprintf("S3 bucket '%s' must have encryption enabled", [resource.name])
}

# Deny public security groups
deny[msg] {
  resource := input.resource_changes[_]
  resource.type == "aws_security_group_rule"
  resource.change.after.cidr_blocks[_] == "0.0.0.0/0"
  resource.change.after.type == "ingress"
  
  msg := sprintf("Security group rule '%s' allows ingress from 0.0.0.0/0", [resource.name])
}

# Require tags
deny[msg] {
  resource := input.resource_changes[_]
  required_tags := {"Environment", "Owner", "Project"}
  provided_tags := {tag | resource.change.after.tags[tag]}
  missing := required_tags - provided_tags
  count(missing) > 0
  
  msg := sprintf("Resource '%s' missing required tags: %v", [resource.name, missing])
}
```

### Running Conftest

```bash
# Generate plan JSON
terraform plan -out=tfplan
terraform show -json tfplan > tfplan.json

# Run policy check
conftest test tfplan.json -p policy/
```

## Checkov Example

```yaml
# .checkov.yaml
framework:
  - terraform

check:
  - CKV_AWS_18  # S3 bucket logging
  - CKV_AWS_19  # S3 bucket encryption
  - CKV_AWS_21  # S3 bucket versioning
  
skip-check:
  - CKV_AWS_144  # Skip cross-region replication (not needed)

soft-fail-on:
  - CKV_AWS_33  # Warn but don't fail on KMS rotation
```

```bash
# Run Checkov
checkov -d . --config-file .checkov.yaml
```

## tfsec Example

```yaml
# .tfsec/config.yml
severity_overrides:
  AWS002: ERROR    # S3 bucket without logging
  AWS017: WARNING  # S3 bucket without versioning

exclude:
  - AWS089  # CloudWatch log group encryption
```

```bash
# Run tfsec
tfsec . --config-file .tfsec/config.yml
```

## CI/CD Integration

```yaml
# GitHub Actions
name: Terraform Policy Check

on: [pull_request]

jobs:
  policy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        
      - name: Terraform Plan
        run: |
          terraform init
          terraform plan -out=tfplan
          terraform show -json tfplan > tfplan.json
          
      - name: Run Checkov
        uses: bridgecrewio/checkov-action@master
        with:
          directory: .
          
      - name: Run Conftest
        uses: instrumenta/conftest-action@master
        with:
          files: tfplan.json
          policy: policy/
```

## Terramate Policies

```hcl
# terramate.tm.hcl
terramate {
  config {
    experiments = ["scripts"]
  }
}

script "validate" {
  description = "Run all validations"
  
  job {
    commands = [
      ["terraform", "validate"],
      ["tfsec", "."],
      ["checkov", "-d", "."],
    ]
  }
}
```

## References

- [OPA Terraform](https://www.openpolicyagent.org/docs/latest/terraform/)
- [Checkov](https://www.checkov.io/)
- [tfsec](https://aquasecurity.github.io/tfsec/)
- [Sentinel](https://developer.hashicorp.com/sentinel)
