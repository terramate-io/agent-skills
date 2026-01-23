# language-linting

**Priority:** MEDIUM  
**Category:** Language Best Practices

## Why It Matters

Consistent formatting improves readability and reduces merge conflicts. Linting catches common errors before they reach production. Automate these checks in CI/CD and pre-commit hooks.

## Incorrect

```hcl
# Inconsistent formatting, no linting
resource "aws_instance" "web" {
ami           = var.ami_id
  instance_type="t3.micro"
    tags={Name="web"}
}

# No pre-commit hooks
# No CI checks
# Errors discovered in production
```

## Correct

```bash
# Run format and lint before every commit
terraform fmt -recursive
tflint --recursive
terraform validate
```

## terraform fmt

Run `terraform fmt` before every commit to ensure consistent formatting.

```bash
# Format current directory
terraform fmt

# Format recursively
terraform fmt -recursive

# Check formatting without changing files (useful for CI)
terraform fmt -check -recursive

# Show diff of changes
terraform fmt -diff
```

### Pre-commit Hook

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/antonbabenko/pre-commit-terraform
    rev: v1.83.5
    hooks:
      - id: terraform_fmt
      - id: terraform_validate
      - id: terraform_tflint
```

Install and run:

```bash
pip install pre-commit
pre-commit install
pre-commit run --all-files
```

## terraform validate

Validates configuration syntax and internal consistency:

```bash
terraform init -backend=false
terraform validate
```

### CI Pipeline

```yaml
# .github/workflows/terraform.yml
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: hashicorp/setup-terraform@v3
      
      - name: Terraform Format Check
        run: terraform fmt -check -recursive
        
      - name: Terraform Init
        run: terraform init -backend=false
        
      - name: Terraform Validate
        run: terraform validate
```

## tflint

TFLint catches errors that `terraform validate` misses:

```bash
# Install
brew install tflint  # macOS
# or
curl -s https://raw.githubusercontent.com/terraform-linters/tflint/master/install_linux.sh | bash

# Run
tflint --init
tflint
```

### Configuration

```hcl
# .tflint.hcl
config {
  plugin_dir = "~/.tflint.d/plugins"
  
  # Enable module inspection
  module = true
}

# AWS-specific rules
plugin "aws" {
  enabled = true
  version = "0.27.0"
  source  = "github.com/terraform-linters/tflint-ruleset-aws"
}

# Enforce naming conventions
rule "terraform_naming_convention" {
  enabled = true
}

# Require descriptions
rule "terraform_documented_variables" {
  enabled = true
}

rule "terraform_documented_outputs" {
  enabled = true
}

# Require type declarations
rule "terraform_typed_variables" {
  enabled = true
}
```

### Common tflint Rules

```hcl
# Catch invalid instance types
rule "aws_instance_invalid_type" {
  enabled = true
}

# Warn about deprecated resources
rule "terraform_deprecated_interpolation" {
  enabled = true
}

# Enforce standard module structure
rule "terraform_standard_module_structure" {
  enabled = true
}
```

## .editorconfig

Ensure consistent whitespace across editors:

```ini
# .editorconfig
root = true

[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true

[*.tf]
indent_size = 2

[*.md]
trim_trailing_whitespace = false

[Makefile]
indent_style = tab
```

## Complete CI Workflow

```yaml
name: Terraform CI

on:
  pull_request:
    paths:
      - '**.tf'
      - '**.tfvars'

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.6.0

      - name: Terraform Format
        run: terraform fmt -check -recursive -diff

      - name: Setup TFLint
        uses: terraform-linters/setup-tflint@v4

      - name: Init TFLint
        run: tflint --init

      - name: Run TFLint
        run: tflint --recursive

      - name: Terraform Init
        run: terraform init -backend=false

      - name: Terraform Validate
        run: terraform validate
```

## Makefile for Local Development

```makefile
.PHONY: fmt lint validate

fmt:
	terraform fmt -recursive

lint: fmt
	tflint --recursive

validate: lint
	terraform init -backend=false
	terraform validate

check: validate
	@echo "All checks passed!"
```

## References

- [terraform fmt](https://developer.hashicorp.com/terraform/cli/commands/fmt)
- [terraform validate](https://developer.hashicorp.com/terraform/cli/commands/validate)
- [TFLint](https://github.com/terraform-linters/tflint)
- [pre-commit-terraform](https://github.com/antonbabenko/pre-commit-terraform)
