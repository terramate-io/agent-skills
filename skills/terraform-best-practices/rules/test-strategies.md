# test-strategies

**Priority:** MEDIUM  
**Category:** Testing & Validation

## Why It Matters

Testing catches errors before they reach production. Different testing strategies validate different aspects of your Terraform code, from syntax to actual infrastructure behavior.

## Incorrect

```bash
# No testing - errors discovered in production
vim main.tf
terraform apply -auto-approve
# Hope it works!

# Problems found after deployment:
# - Syntax errors
# - Security misconfigurations
# - Missing resources
# - Wrong configurations
```

## Correct

```bash
# Multi-layer testing strategy
terraform fmt -check        # Format check
terraform validate          # Syntax validation
tflint --recursive          # Static analysis
tfsec .                     # Security scanning
terraform plan -out=tfplan  # Plan review
conftest test tfplan.json   # Policy checks
terraform test              # Native tests (1.6+)
```

## Testing Pyramid

```
                    ┌─────────────┐
                    │ Integration │  Slowest, most confidence
                    │    Tests    │
                    └─────────────┘
                   ┌───────────────┐
                   │  Plan Tests   │
                   └───────────────┘
                  ┌─────────────────┐
                  │  Static Analysis │
                  └─────────────────┘
                 ┌───────────────────┐
                 │  Format & Validate │  Fastest, basic checks
                 └───────────────────┘
```

## Level 1: Format and Validate

```bash
# Format check (fast, catches style issues)
terraform fmt -check -recursive -diff

# Validate syntax and configuration
terraform init -backend=false
terraform validate
```

### CI Pipeline

```yaml
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3
      
      - name: Format Check
        run: terraform fmt -check -recursive
        
      - name: Validate
        run: |
          terraform init -backend=false
          terraform validate
```

## Level 2: Static Analysis

### tflint

```hcl
# .tflint.hcl
config {
  plugin_dir = "~/.tflint.d/plugins"
}

plugin "aws" {
  enabled = true
  version = "0.27.0"
  source  = "github.com/terraform-linters/tflint-ruleset-aws"
}

rule "terraform_naming_convention" {
  enabled = true
}

rule "terraform_documented_variables" {
  enabled = true
}
```

```bash
tflint --init
tflint --recursive
```

### Security Scanning

```bash
# tfsec - security focused
tfsec .

# checkov - compliance and security
checkov -d .

# trivy - vulnerability scanning
trivy config .
```

### Example Output

```bash
$ tfsec .
Result: CRITICAL - Security group rule allows all traffic
Resource: aws_security_group_rule.bad_rule
Location: main.tf:15

$ checkov -d .
Passed checks: 45
Failed checks: 3
  - CKV_AWS_23: "Ensure every security group rule has a description"
  - CKV_AWS_24: "Ensure no security group allows ingress from 0.0.0.0/0 to port 22"
```

## Level 3: Plan Tests

### Terraform Plan Analysis

```bash
# Generate plan
terraform plan -out=tfplan

# Convert to JSON for analysis
terraform show -json tfplan > tfplan.json

# Analyze with custom scripts or tools
```

### OPA/Conftest for Plan Validation

```rego
# policy/terraform.rego
package main

# Deny resources without required tags
deny[msg] {
  resource := input.resource_changes[_]
  not resource.change.after.tags.Environment
  msg := sprintf("Resource %s missing required 'Environment' tag", [resource.address])
}

# Deny overly permissive security groups
deny[msg] {
  resource := input.resource_changes[_]
  resource.type == "aws_security_group_rule"
  resource.change.after.cidr_blocks[_] == "0.0.0.0/0"
  resource.change.after.from_port == 22
  msg := sprintf("Security group %s allows SSH from anywhere", [resource.address])
}
```

```bash
conftest test tfplan.json -p policy/
```

### Terraform Test (Native)

```hcl
# tests/basic.tftest.hcl
run "verify_vpc_created" {
  command = plan
  
  assert {
    condition     = aws_vpc.main.cidr_block == "10.0.0.0/16"
    error_message = "VPC CIDR block is incorrect"
  }
}

run "verify_tags" {
  command = plan
  
  assert {
    condition     = aws_vpc.main.tags["Environment"] == var.environment
    error_message = "Environment tag not set correctly"
  }
}
```

```bash
terraform test
```

## Testing Framework Decision Matrix

Choose the right testing approach based on your needs:

| Criteria | Native Tests (Terraform 1.6+) | Terratest (Go) |
|----------|-------------------------------|----------------|
| **Language** | HCL | Go |
| **Setup complexity** | Low (built-in) | Medium (Go project setup) |
| **Test speed** | Fast (no actual resources) | Slow (creates real resources) |
| **Cost** | Free (plan-only) | Costs money (real resources) |
| **Best for** | Plan validation, output checks | Integration testing, multi-step workflows |
| **When to use** | Simple assertions, plan validation | Complex scenarios, cross-resource validation |

### Decision Flow

```
Start: Need to test Terraform code?
│
├─ Can test with plan output? (no real resources needed)
│  │
│  ├─ Yes → Use Native Tests (terraform test)
│  │   └─ Fast, free, built-in
│  │
│  └─ No → Need actual resources?
│      │
│      ├─ Yes → Use Terratest
│      │   └─ Creates real resources, validates behavior
│      │
│      └─ No → Use Static Analysis
│          └─ tflint, tfsec, checkov
```

### When to Use Native Tests

```hcl
# Use native tests for:
# - Plan validation
# - Output value checks
# - Variable validation
# - Resource attribute verification

# tests/module.tftest.hcl
run "verify_outputs" {
  command = plan
  
  assert {
    condition     = aws_vpc.main.cidr_block == "10.0.0.0/16"
    error_message = "VPC CIDR must be 10.0.0.0/16"
  }
  
  assert {
    condition     = length(aws_subnet.public) == 3
    error_message = "Must have 3 public subnets"
  }
}
```

### When to Use Terratest

```go
// Use Terratest for:
// - Actual resource creation and validation
// - Multi-step workflows
// - Cross-resource integration
// - End-to-end testing

func TestVpcWithEksIntegration(t *testing.T) {
    terraformOptions := terraform.WithDefaultRetryableErrors(t, &terraform.Options{
        TerraformDir: "./fixtures/vpc-eks",
    })
    
    defer terraform.Destroy(t, terraformOptions)
    terraform.InitAndApply(t, terraformOptions)
    
    // Verify actual AWS resources exist
    vpcId := terraform.Output(t, terraformOptions, "vpc_id")
    aws.GetVpcById(t, vpcId, "us-east-1")
    
    // Test EKS cluster can access VPC
    clusterName := terraform.Output(t, terraformOptions, "cluster_name")
    aws.GetEksCluster(t, clusterName, "us-east-1")
}
```

## Level 4: Integration Tests

### Terratest (Go)

```go
// test/vpc_test.go
package test

import (
    "testing"
    "github.com/gruntwork-io/terratest/modules/terraform"
    "github.com/stretchr/testify/assert"
)

func TestVpcModule(t *testing.T) {
    t.Parallel()

    terraformOptions := terraform.WithDefaultRetryableErrors(t, &terraform.Options{
        TerraformDir: "./fixtures/vpc",  // Path to test fixture
        Vars: map[string]interface{}{
            "vpc_cidr":    "10.0.0.0/16",
            "environment": "test",
        },
    })

    // Clean up after test
    defer terraform.Destroy(t, terraformOptions)

    // Deploy infrastructure
    terraform.InitAndApply(t, terraformOptions)

    // Validate outputs
    vpcId := terraform.Output(t, terraformOptions, "vpc_id")
    assert.NotEmpty(t, vpcId)

    // Verify actual AWS resources
    // ... additional AWS SDK calls to verify infrastructure
}
```

### Test Fixtures

```hcl
# Test fixture that uses the module under test
module "vpc" {
  source = "../../"  # Reference to module being tested
  
  vpc_cidr    = "10.0.0.0/16"
  environment = "test"
  
  # Test-specific configuration
  enable_nat_gateway = false
}

output "vpc_id" {
  value = module.vpc.vpc_id
}
```

## Test Strategy by Environment

| Stage | Tests | When |
|-------|-------|------|
| Local | Format, Validate | Before commit |
| PR | Static analysis, Plan tests | On pull request |
| Staging | Integration tests | After merge |
| Prod | Smoke tests, Drift detection | After deploy |

## CI/CD Pipeline Example

```yaml
name: Terraform CI

on:
  pull_request:
    paths: ['**.tf']
  push:
    branches: [main]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3
      
      - name: Format
        run: terraform fmt -check -recursive
        
      - name: Validate
        run: |
          terraform init -backend=false
          terraform validate

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: tfsec
        uses: aquasecurity/tfsec-action@v1.0.0
        
      - name: checkov
        uses: bridgecrewio/checkov-action@master
        with:
          directory: .

  plan:
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3
      
      - name: Plan
        run: |
          terraform init
          terraform plan -out=tfplan
          
      - name: Policy Check
        run: |
          terraform show -json tfplan > tfplan.json
          conftest test tfplan.json -p policy/

  integration:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v4
      
      - name: Integration Tests
        run: |
          cd test
          go test -v -timeout 30m
```

## Quick Reference: Testing Decision Tree

```
┌─────────────────────────────────────┐
│  What do you need to test?          │
└─────────────────────────────────────┘
              │
              ├─ Syntax/Format?
              │  └─→ terraform fmt, terraform validate
              │
              ├─ Security/Compliance?
              │  └─→ tfsec, checkov, trivy
              │
              ├─ Plan Output Validation?
              │  └─→ terraform test (native)
              │
              ├─ Actual Resource Behavior?
              │  └─→ Terratest (Go)
              │
              └─ Policy Enforcement?
                 └─→ conftest, OPA, Sentinel
```

## Testing Checklist

Use this checklist when setting up testing for your Terraform code:

- [ ] Format check (`terraform fmt -check`)
- [ ] Syntax validation (`terraform validate`)
- [ ] Static analysis (`tflint`)
- [ ] Security scanning (`tfsec`, `checkov`)
- [ ] Plan generation (`terraform plan`)
- [ ] Policy checks (`conftest`, OPA)
- [ ] Native tests (`terraform test`) - if Terraform 1.6+
- [ ] Integration tests (Terratest) - if needed
- [ ] CI/CD integration
- [ ] Pre-commit hooks

## Common Testing Patterns

### Pattern 1: Simple Module (Native Tests)

```hcl
# modules/s3-bucket/tests/basic.tftest.hcl
run "verify_bucket_created" {
  command = plan
  
  assert {
    condition     = aws_s3_bucket.main.bucket == var.bucket_name
    error_message = "Bucket name mismatch"
  }
  
  assert {
    condition     = aws_s3_bucket_versioning.main.enabled == true
    error_message = "Versioning must be enabled"
  }
}
```

### Pattern 2: Complex Integration (Terratest)

```go
// test/integration_test.go
func TestVpcWithSubnets(t *testing.T) {
    terraformOptions := terraform.WithDefaultRetryableErrors(t, &terraform.Options{
        TerraformDir: "./fixtures/vpc",
        Vars: map[string]interface{}{
            "vpc_cidr": "10.0.0.0/16",
        },
    })
    
    defer terraform.Destroy(t, terraformOptions)
    terraform.InitAndApply(t, terraformOptions)
    
    // Verify VPC exists
    vpcId := terraform.Output(t, terraformOptions, "vpc_id")
    vpc := aws.GetVpcById(t, vpcId, "us-east-1")
    assert.Equal(t, "10.0.0.0/16", *vpc.CidrBlock)
    
    // Verify subnets
    subnetIds := terraform.OutputList(t, terraformOptions, "subnet_ids")
    assert.Len(t, subnetIds, 3)
}
```

### Pattern 3: Multi-Environment Testing

```hcl
# Test with different variable sets
run "dev_environment" {
  command = plan
  variables {
    environment = "dev"
    instance_count = 1
  }
  
  assert {
    condition     = aws_instance.web.count == 1
    error_message = "Dev should have 1 instance"
  }
}

run "prod_environment" {
  command = plan
  variables {
    environment = "prod"
    instance_count = 3
  }
  
  assert {
    condition     = aws_instance.web.count == 3
    error_message = "Prod should have 3 instances"
  }
}
```

## References

- [Terraform Test](https://developer.hashicorp.com/terraform/language/tests)
- [Terratest](https://terratest.gruntwork.io/)
- [tfsec](https://github.com/aquasecurity/tfsec)
- [Checkov](https://www.checkov.io/)
- [Conftest](https://www.conftest.dev/)
- [Testing Best Practices](https://developer.hashicorp.com/terraform/language/tests/best-practices)
