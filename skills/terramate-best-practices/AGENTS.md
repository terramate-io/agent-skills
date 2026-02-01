# Terramate Best Practices - Full Reference

Comprehensive guide for Terramate CLI, Cloud, and Catalyst, maintained by Terramate.

---

# catalyst-bundles

**Priority:** MEDIUM  
**Category:** Terramate Catalyst

## Why It Matters

Bundles compose multiple components into ready-to-use, deployable units. They abstract infrastructure complexity and enable developers to provision complete solutions without deep infrastructure knowledge.

## Incorrect

```hcl
# Developers manually compose components
# No standardization
# Missing dependencies
# Inconsistent patterns

# app-team/stack.tm.hcl
tm_bundle "database" {
  component = "rds-postgres"
  # ...
}

tm_bundle "cache" {
  component = "redis"
  # ...
}

tm_bundle "storage" {
  component = "s3-bucket"
  # ...
}

# Missing: VPC, networking, security groups
# Missing: Component dependencies
# Missing: Consistent configuration
```

**Problem:** Manual composition, missing dependencies, inconsistent patterns, developers need deep infrastructure knowledge.

## Correct

**Bundle definition:**

```hcl
# bundles/web-app/bundle.tm.hcl
bundle {
  name        = "web-app"
  description = "Complete web application infrastructure"
  
  component "networking" {
    source = "vpc"
    input = {
      cidr_block = "10.0.0.0/16"
    }
  }
  
  component "database" {
    source = "rds-postgres"
    input = {
      instance_class = "db.t3.micro"
      allocated_storage = 20
    }
    
    depends_on = ["networking"]
  }
  
  component "cache" {
    source = "redis"
    input = {
      node_type = "cache.t3.micro"
    }
    
    depends_on = ["networking"]
  }
  
  component "storage" {
    source = "s3-bucket"
    input = {
      name = "${bundle.name}-storage"
    }
  }
  
  component "compute" {
    source = "ecs-service"
    input = {
      cluster_name = "${bundle.name}-cluster"
      vpc_id       = component.networking.output.vpc_id
      subnet_ids   = component.networking.output.private_subnet_ids
    }
    
    depends_on = ["networking", "database", "cache"]
  }
}
```

**Bundle instantiation:**

```hcl
# stacks/prod-web-app/stack.tm.hcl
stack {
  name = "prod-web-app"
}

# Instantiate bundle
tm_bundle "web-app" {
  bundle = "web-app"
  
  input = {
    # Bundle-level overrides if needed
  }
}
```

**Benefits:**
- Complete solutions in one bundle
- Automatic dependency management
- Consistent patterns across teams
- Abstracted complexity
- Easy to instantiate
- Platform team maintains bundles

## Additional Context

Bundle composition:
- Combines multiple components
- Manages component dependencies
- Provides bundle-level configuration
- Supports component outputs as inputs

Bundle vs Component:
- **Component** - Single infrastructure resource/pattern
- **Bundle** - Multiple components composed together
- Use bundles for complete solutions
- Use components for individual resources

Converting existing Terraform modules to components:
- Run `terramate component create` inside an existing Terraform module directory
- This automatically generates the component structure from your module
- Converts module variables to component inputs
- Converts module outputs to component outputs
- Preserves existing Terraform code

## References

- [Terramate Catalyst Bundles](https://terramate.io/docs/catalyst/concepts/bundles/)
- [Instantiate Your First Bundle](https://terramate.io/docs/catalyst/tutorials/instantiate-your-first-bundle/)
- [Bundle Definition](https://terramate.io/docs/catalyst/reference/bundle-definition/)


---

# catalyst-components

**Priority:** MEDIUM  
**Category:** Terramate Catalyst

## Why It Matters

Components are reusable, opinionated infrastructure blueprints that encode organizational standards. They enable platform engineers to define best practices once and developers to consume them easily.

## Incorrect

```hcl
# Developers write Terraform from scratch
# No standardization
# Inconsistent patterns
# Security issues
# Cost overruns

# app-team/main.tf
resource "aws_s3_bucket" "data" {
  # Missing encryption
  # Missing versioning
  # Missing lifecycle policies
  # Inconsistent naming
}
```

**Problem:** Each team reinvents the wheel, inconsistent patterns, security gaps, no governance, hard to maintain.

## Correct

**Component definition:**

```hcl
# components/s3-bucket/component.tm.hcl
component {
  name        = "s3-bucket"
  description = "Secure S3 bucket with encryption and lifecycle policies"
  
  input {
    name = {
      type        = string
      description = "Bucket name"
    }
    
    versioning = {
      type        = bool
      default     = true
      description = "Enable versioning"
    }
    
    lifecycle_days = {
      type        = number
      default     = 90
      description = "Days before transitioning to Glacier"
    }
  }
  
  output {
    bucket_id = {
      type        = string
      description = "Bucket ID"
    }
    
    bucket_arn = {
      type        = string
      description = "Bucket ARN"
    }
  }
}

# components/s3-bucket/main.tf
resource "aws_s3_bucket" "this" {
  bucket = input.name
  
  tags = {
    Component = "s3-bucket"
    ManagedBy = "Terramate Catalyst"
  }
}

resource "aws_s3_bucket_versioning" "this" {
  bucket = aws_s3_bucket.this.id
  
  versioning_configuration {
    status = input.versioning ? "Enabled" : "Disabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "this" {
  bucket = aws_s3_bucket.this.id
  
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "this" {
  bucket = aws_s3_bucket.this.id
  
  rule {
    id     = "transition-to-glacier"
    status = "Enabled"
    
    transition {
      days          = input.lifecycle_days
      storage_class = "GLACIER"
    }
  }
}

output "bucket_id" {
  value       = aws_s3_bucket.this.id
  description = output.bucket_id.description
}

output "bucket_arn" {
  value       = aws_s3_bucket.this.arn
  description = output.bucket_arn.description
}
```

**Component usage:**

```hcl
# stacks/app-data/stack.tm.hcl
stack {
  name = "app-data"
}

# Instantiate component
tm_bundle "s3-bucket" {
  component = "s3-bucket"
  
  input = {
    name           = "app-data-bucket"
    versioning     = true
    lifecycle_days = 90
  }
}
```

**Benefits:**
- Standardized infrastructure patterns
- Built-in security and compliance
- Consistent naming and tagging
- Cost optimization built-in
- Easy for developers to use
- Platform team maintains standards

## Additional Context

Component structure:
- `component.tm.hcl` - Component definition (inputs/outputs)
- `main.tf` - Terraform implementation
- Can use any IaC tool (Terraform, OpenTofu, Kubernetes)

Converting existing Terraform modules to components:
- Run `terramate component create` inside an existing Terraform module directory
- This automatically generates the component structure from your module
- Converts module variables to component inputs
- Converts module outputs to component outputs
- Preserves existing Terraform code
- Example: `cd modules/s3-bucket && terramate component create`

Component best practices:
- Define clear inputs and outputs
- Include security defaults
- Add cost optimization
- Document usage examples
- Version components
- Convert existing modules using `terramate component create` for quick migration

## References

- [Terramate Catalyst Components](https://terramate.io/docs/catalyst/concepts/components/)
- [Create a Component](https://terramate.io/docs/catalyst/tutorials/create-a-component-and-bundle/)
- [Convert Module to Component](https://terramate.io/docs/catalyst/how-to-guides/convert-module-to-component/)


---

# cicd-github-actions

**Priority:** MEDIUM  
**Category:** CI/CD Integration

## Why It Matters

GitHub Actions integration enables GitOps workflows for infrastructure. Terramate provides pre-configured workflows for previews, deployments, and drift checks that work seamlessly with GitHub.

## Incorrect

```yaml
# Manual Terraform workflow
# No change detection
# Runs all stacks always
# No previews
# No drift checks

# .github/workflows/terraform.yml
- name: Terraform Plan
  run: |
    cd infrastructure
    terraform init
    terraform plan
```

**Problem:** No change detection, runs everything, no previews, manual process, inefficient.

## Correct

**Preview workflow (PR):**

```yaml
# .github/workflows/preview.yml
name: Terraform Preview

on:
  pull_request:
    paths:
      - 'stacks/**'
      - '.github/workflows/preview.yml'

jobs:
  preview:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      
      - uses: terramate-io/setup-terramate@v1
      
      - name: Terraform Plan (Changed Stacks)
        run: |
          terramate run \
            --changed \
            --git-change-base ${{ github.event.pull_request.base.sha }} \
            terraform plan -out=tfplan
      
      - name: Comment PR
        uses: actions/github-script@v7
        with:
          script: |
            // Post plan output as PR comment
```

**Deployment workflow:**

```yaml
# .github/workflows/deploy.yml
name: Terraform Deploy

on:
  push:
    branches: [main]
    paths:
      - 'stacks/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: terramate-io/setup-terramate@v1
      
      - name: Terraform Apply (Changed Stacks)
        run: |
          terramate run \
            --changed \
            --git-change-base ${{ github.event.before }} \
            terraform apply -auto-approve
      
      - name: Sync to Terramate Cloud
        run: |
          terramate cloud sync \
            --deployment-url "${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"
```

**Drift check workflow:**

```yaml
# .github/workflows/drift-check.yml
name: Drift Check

on:
  schedule:
    - cron: '0 0 * * *'  # Daily
  workflow_dispatch:

jobs:
  drift-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: terramate-io/setup-terramate@v1
      
      - name: Check for Drift
        run: |
          terramate run terraform plan -out=tfplan
          terramate cloud drift show
```

**Benefits:**
- Change detection (only runs modified stacks)
- PR previews with plan output
- Automated deployments
- Drift detection
- Cloud synchronization
- Efficient CI/CD execution

## Additional Context

Workflow types:
- **Preview** - Plan changes in PRs
- **Deploy** - Apply changes on merge
- **Drift Check** - Scheduled drift detection

Best practices:
- Use change detection (`--changed`)
- Filter by paths to avoid unnecessary runs
- Sync to Cloud for observability
- Use PR comments for plan output
- Enable required reviews for production

## References

- [GitHub Actions Integration](https://terramate.io/docs/cli/automation/github-actions/)
- [Preview Workflow](https://terramate.io/docs/cli/automation/github-actions/preview-workflow/)
- [Deployment Workflow](https://terramate.io/docs/cli/automation/github-actions/deployment-workflow/)
- [Drift Check Workflow](https://terramate.io/docs/cli/automation/github-actions/drift-check-workflow/)


---

# cli-codegen-file

**Priority:** HIGH  
**Category:** CLI Code Generation

## Why It Matters

File generation creates non-HCL files (JSON, YAML, scripts) from templates, enabling consistent configuration across stacks and integration with other tools.

## Incorrect

```bash
# Manual file creation in each stack
# stacks/app1/kubernetes.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app1-config
data:
  environment: prod
  region: us-east-1

# stacks/app2/kubernetes.yaml - Copy-pasted!
apiVersion: v1
kind: ConfigMap
metadata:
  name: app2-config
data:
  environment: prod
  region: us-east-1
```

**Problem:** Manual file creation, copy-paste errors, inconsistent configurations, hard to maintain.

## Correct

```hcl
# terramate.tm.hcl - Generate Kubernetes manifests
generate_file "kubernetes.yaml" {
  content = yamlencode({
    apiVersion = "v1"
    kind       = "ConfigMap"
    metadata = {
      name = "${tm_metadata("stack", "name")}-config"
    }
    data = {
      environment = global.environment
      region      = global.aws_region
      stack_name  = tm_metadata("stack", "name")
    }
  })
}
```

**Using template files:**

```hcl
# templates/kubernetes-configmap.yaml.tmpl
apiVersion: v1
kind: ConfigMap
metadata:
  name: ${stack_name}-config
data:
  environment: ${environment}
  region: ${region}

# terramate.tm.hcl
generate_file "kubernetes.yaml" {
  content = tm_file("${terramate.root.path.fs.absolute}/templates/kubernetes-configmap.yaml.tmpl", {
    stack_name  = tm_metadata("stack", "name")
    environment = global.environment
    region      = global.aws_region
  })
}
```

**Benefits:**
- Consistent file generation across stacks
- Template-based approach (DRY)
- Supports any file format (YAML, JSON, scripts)
- Dynamic values via globals and metadata
- Easy to update templates

## Additional Context

File generation:
- Use `generate_file` for any file type
- Content can be strings, HCL, or template files
- Supports Terramate functions
- Generated files in `.terramate/cache/`

Common use cases:
- Kubernetes manifests
- CI/CD configuration files
- Scripts and automation
- Documentation files

## References

- [Generate Files](https://terramate.io/docs/cli/code-generation/generate-files/)
- [Template Functions](https://terramate.io/docs/cli/reference/functions/)


---

# cli-codegen-hcl

**Priority:** HIGH  
**Category:** CLI Code Generation

## Why It Matters

Code generation keeps Terraform configurations DRY by generating repetitive code from templates. `generate_hcl` blocks eliminate copy-paste and enable consistent patterns across stacks.

## Incorrect

```hcl
# Copy-paste provider configuration in every stack
# stacks/networking/main.tf
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

# stacks/compute/main.tf - Same code repeated!
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}
```

**Problem:** Code duplication, hard to maintain, version inconsistencies, violates DRY principle.

## Correct

```hcl
# terramate.tm.hcl - Generate provider config for all stacks
generate_hcl "providers.tf" {
  content {
    terraform {
      required_providers {
        aws = {
          source  = "hashicorp/aws"
          version = "~> 5.0"
        }
      }
    }
    
    provider "aws" {
      region = global.aws_region
    }
  }
}
```

**With stack-specific values:**

```hcl
# stacks/networking/stack.tm.hcl
stack {
  name = "networking"
}

globals {
  aws_region = "us-east-1"
}

# terramate.tm.hcl - Generate with context
generate_hcl "backend.tf" {
  content {
    terraform {
      backend "s3" {
        bucket = "terraform-state-${global.environment}"
        key    = "${tm_metadata("stack", "name")}/terraform.tfstate"
        region = global.aws_region
      }
    }
  }
}
```

**Benefits:**
- Single source of truth
- Consistent patterns across stacks
- Easy to update (change once, applies everywhere)
- Supports dynamic values via globals/metadata
- Reduces errors from copy-paste

## Additional Context

Generate HCL blocks:
- Use `generate_hcl` to create `.tf` files
- Content is HCL (not strings)
- Supports Terramate functions and variables
- Generated files are in `.terramate/cache/`

Best practices:
- Generate provider configs centrally
- Generate backend configs per stack
- Use globals for stack-specific values
- Keep generated code simple and readable

## References

- [Generate HCL](https://terramate.io/docs/cli/code-generation/generate-hcl/)
- [Basic DRY Code Generation](https://terramate.io/docs/how-to-guides/code-generation/basic-dry-code-generation/)


---

# cli-codegen-provider

**Priority:** HIGH  
**Category:** CLI Code Generation

## Why It Matters

Provider configuration generation ensures consistent provider versions and settings across all stacks while allowing stack-specific customization. Essential for multi-stack, multi-environment setups.

## Incorrect

```hcl
# Each stack manually configures providers
# stacks/networking/main.tf
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"  # Different version!
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

# stacks/compute/main.tf
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"  # Inconsistent!
    }
  }
}

provider "aws" {
  region = "us-west-2"  # Different region!
}
```

**Problem:** Inconsistent provider versions, different regions, hard to maintain, version conflicts.

## Correct

```hcl
# terramate.tm.hcl - Central provider generation
generate_hcl "providers.tf" {
  content {
    terraform {
      required_providers {
        aws = {
          source  = "hashicorp/aws"
          version = global.provider_versions.aws
        }
      }
    }
    
    provider "aws" {
      region = global.aws_region
      
      default_tags {
        tags = {
          Environment   = global.environment
          ManagedBy     = "Terramate"
          Stack         = tm_metadata("stack", "name")
          Project       = tm_metadata("project", "name")
        }
      }
    }
  }
}

# Globals in terramate.tm.hcl or stack-specific
globals {
  provider_versions = {
    aws = "~> 5.0"
  }
  
  aws_region  = "us-east-1"
  environment = tm_metadata("environment")
}
```

**Stack-specific overrides:**

```hcl
# stacks/networking/stack.tm.hcl
globals {
  aws_region = "us-west-2"  # Override for this stack
}
```

**Benefits:**
- Consistent provider versions across stacks
- Centralized provider configuration
- Stack-specific overrides when needed
- Automatic default tags
- Single place to update versions

## Additional Context

Provider generation patterns:
- Generate `providers.tf` in each stack
- Use globals for version management
- Allow stack-specific overrides
- Include default tags for cost tracking

Provider version management:
- Define versions in root `terramate.tm.hcl`
- Use semantic versioning constraints
- Update versions centrally

## References

- [Terraform Backend and Provider Generation](https://terramate.io/docs/how-to-guides/code-generation/terraform-backend-and-provider-generation/)
- [Dynamic Provider Generation](https://terramate.io/docs/how-to-guides/code-generation/dynamic-provider-generation/)


---

# cli-config-globals

**Priority:** MEDIUM-HIGH  
**Category:** CLI Configuration

## Why It Matters

Globals provide shared configuration across stacks, enabling DRY patterns and consistent values. They can be defined at project or stack level and are inherited hierarchically.

## Incorrect

```hcl
# Hardcoded values in each stack
# stacks/networking/main.tf
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
  
  tags = {
    Environment = "prod"
    Project     = "myproject"
  }
}

# stacks/compute/main.tf - Same values repeated!
resource "aws_instance" "web" {
  tags = {
    Environment = "prod"  # Copy-paste
    Project     = "myproject"  # Copy-paste
  }
}
```

**Problem:** Values duplicated, hard to change, inconsistent, violates DRY principle.

## Correct

```hcl
# terramate.tm.hcl - Root globals
globals {
  environment = tm_metadata("environment")
  project     = tm_metadata("project", "name")
  
  common_tags = {
    Environment = global.environment
    Project     = global.project
    ManagedBy   = "Terramate"
  }
  
  aws_region = "us-east-1"
}

# stacks/networking/main.tf
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
  tags       = global.common_tags
}

# stacks/compute/main.tf
resource "aws_instance" "web" {
  tags = merge(global.common_tags, {
    Name = "web-server"
  })
}
```

**Stack-specific overrides:**

```hcl
# stacks/networking/stack.tm.hcl
globals {
  # Inherit from parent, override specific values
  aws_region = "us-west-2"  # Override for this stack
}
```

**Benefits:**
- Single source of truth for shared values
- Hierarchical inheritance (parent → child)
- Stack-specific overrides when needed
- Consistent tagging and configuration
- Easy to update globally

## Additional Context

Global scoping:
- Root `terramate.tm.hcl` - Project-wide globals
- Stack `stack.tm.hcl` - Stack-specific globals
- Child stacks inherit parent globals
- Overrides merge hierarchically

Common use cases:
- Environment names
- Common tags
- Provider regions
- Shared configuration values
- Feature flags

## References

- [Globals Reference](https://terramate.io/docs/cli/reference/blocks/globals/)
- [Variable Namespaces](https://terramate.io/docs/cli/reference/variable-namespaces/)


---

# cli-orchestration-change-detection

**Priority:** HIGH  
**Category:** CLI Orchestration

## Why It Matters

Change detection limits execution to only modified stacks, dramatically reducing runtime and preventing unnecessary operations. Essential for CI/CD efficiency.

## Incorrect

```bash
# Always run all stacks
terramate run terraform plan

# Or manually checking git diff
git diff --name-only | grep -E '\.tf$' | while read file; do
  cd $(dirname $file) && terraform plan
done
```

**Problem:** Runs all stacks even when only one changed. Slow, wasteful, and increases risk of unintended changes.

## Correct

```bash
# Only run changed stacks
terramate run --changed terraform plan

# With Git integration (default)
terramate run --changed --git-change-base main terraform plan

# Preview what would run
terramate list --changed

# Run changed stacks and their dependents
terramate run --changed terraform plan
```

**In CI/CD workflows:**

```yaml
# .github/workflows/terraform.yml
- name: Plan changed stacks
  run: |
    terramate run --changed \
      --git-change-base ${{ github.event.pull_request.base.sha }} \
      terraform plan
```

**Using stack triggers:**

```hcl
# stacks/compute/stack.tm.hcl
stack {
  name = "compute"
  
  # Automatically run when networking changes
  triggers = ["../networking"]
}
```

**Benefits:**
- Faster execution (only changed stacks)
- Reduced risk (fewer stacks touched)
- Lower CI/CD costs
- Better developer experience
- Automatic dependent stack detection

## Additional Context

Change detection methods:
- Git-based (default) - compares against base branch
- File-based - watches filesystem changes
- Trigger-based - uses stack triggers

Change detection scope:
- Detects changes in stack directory
- Includes changes in parent directories (globals)
- Respects stack dependencies

## References

- [Change Detection](https://terramate.io/docs/cli/orchestration/change-detection/)
- [Git Integration](https://terramate.io/docs/cli/orchestration/integration-git/)
- [Stack Triggers](https://terramate.io/docs/cli/stacks/rerun-stacks-using-stack-triggers/)


---

# cli-orchestration-dependencies

**Priority:** HIGH  
**Category:** CLI Orchestration

## Why It Matters

Proper dependency management ensures stacks execute in the correct order and prevents race conditions. Dependencies can be explicit (via `after`) or implicit (via filesystem hierarchy).

## Incorrect

```hcl
# No dependency declaration
# stacks/compute/stack.tm.hcl
stack {
  name = "compute"
}

# stacks/networking/stack.tm.hcl
stack {
  name = "networking"
}

# main.tf in compute references networking outputs
# But no dependency declared - may run in wrong order!
data "terraform_remote_state" "networking" {
  backend = "s3"
  config = {
    bucket = "terraform-state"
    key    = "networking/terraform.tfstate"
  }
}
```

**Problem:** Execution order is undefined. Compute might run before networking, causing failures.

## Correct

**Option 1: Explicit dependencies**

```hcl
# stacks/compute/stack.tm.hcl
stack {
  name = "compute"
  
  after = [
    "../networking"
  ]
}
```

**Option 2: Filesystem hierarchy**

```
stacks/
├── networking/
│   └── stack.tm.hcl
└── compute/
    └── stack.tm.hcl
    └── networking/  # Child stack depends on parent
        └── stack.tm.hcl
```

**Option 3: Stack triggers**

```hcl
# stacks/compute/stack.tm.hcl
stack {
  name = "compute"
  
  triggers = ["../networking"]
}
```

**Benefits:**
- Guaranteed execution order
- Prevents race conditions
- Clear dependency graph
- Automatic dependency resolution
- Better error messages

## Additional Context

Dependency types:
- `after` - Explicit dependency declaration
- Filesystem hierarchy - Parent stacks run before children
- `triggers` - Automatic rerun when dependencies change

Dependency resolution:
- Terramate builds dependency graph automatically
- Circular dependencies are detected
- Use `terramate list --run-order` to verify

## References

- [Order of Execution](https://terramate.io/docs/cli/orchestration/order-of-execution/)
- [Stack Triggers](https://terramate.io/docs/cli/stacks/rerun-stacks-using-stack-triggers/)


---

# cli-orchestration-parallel

**Priority:** HIGH  
**Category:** CLI Orchestration

## Why It Matters

Independent stacks can run in parallel, significantly reducing total execution time. Terramate automatically identifies independent stacks and executes them concurrently.

## Incorrect

```bash
# Sequential execution (default without --parallel)
terramate run terraform plan

# Or manually running one at a time
cd stacks/networking && terraform plan
cd stacks/compute && terraform plan
cd stacks/database && terraform plan
```

**Problem:** Sequential execution is slow. Independent stacks wait unnecessarily, wasting time and CI/CD minutes.

## Correct

```bash
# Run independent stacks in parallel
terramate run --parallel 4 terraform plan

# With change detection
terramate run --changed --parallel 4 terraform plan

# Check execution order first
terramate list --run-order
```

**Understanding execution order:**

```bash
# View dependency graph
terramate list --run-order

# Output shows:
# stacks/foundation (no dependencies)
# stacks/networking (depends on foundation)
# stacks/compute (depends on networking)
# stacks/database (depends on networking)
```

**Benefits:**
- Faster execution (independent stacks run concurrently)
- Respects dependencies (dependent stacks wait)
- Configurable parallelism (adjust based on resources)
- Works with change detection
- Reduces CI/CD runtime and costs

## Additional Context

Parallel execution:
- Independent stacks run concurrently
- Dependent stacks wait for prerequisites
- Default is sequential (use `--parallel` flag)
- Recommended: 2-4 parallel jobs for most cases

Dependency resolution:
- Based on `after` declarations in stack configs
- Based on filesystem hierarchy (parent before child)
- Circular dependencies are detected and reported

## References

- [Parallel Execution](https://terramate.io/docs/cli/orchestration/parallel-execution/)
- [Order of Execution](https://terramate.io/docs/cli/orchestration/order-of-execution/)


---

# cli-orchestration-run

**Priority:** HIGH  
**Category:** CLI Orchestration

## Why It Matters

Running commands across multiple stacks efficiently is core to Terramate's value. Use `terramate run` to execute commands in the correct order while respecting dependencies.

## Incorrect

```bash
# Manual execution - navigating to each stack
cd stacks/networking && terraform init && terraform plan
cd stacks/compute && terraform init && terraform plan
cd stacks/database && terraform init && terraform plan
```

**Problem:** Manual, error-prone, doesn't respect dependencies, no change detection, can't run in parallel.

## Correct

```bash
# Run terraform plan across all stacks
terramate run terraform plan

# Run with change detection (only changed stacks)
terramate run --changed terraform plan

# Run specific stacks by tag
terramate run --tags networking terraform plan

# Run in parallel (independent stacks)
terramate run --parallel 4 terraform plan

# Run with directory filter
terramate run --chdir stacks/networking terraform plan
```

**Using workflows for complex operations:**

```hcl
# terramate.tm.hcl
script {
  name        = "plan-all"
  description = "Plan all stacks"
  
  job {
    command = ["terraform", "init", "-upgrade"]
  }
  
  job {
    command = ["terraform", "plan", "-out=tfplan"]
  }
}
```

```bash
# Run workflow
terramate script run plan-all
```

**Benefits:**
- Automatic dependency resolution
- Change detection integration
- Parallel execution support
- Consistent execution order
- Filtering by tags, paths, or changes

## Additional Context

Command execution:
- Commands run in dependency order (parent before child)
- Use `--changed` to only run modified stacks
- Use `--parallel N` for independent stacks
- Use `--tags` or `--no-tags` for filtering

Workflows:
- Define multi-step operations in `script` blocks
- Use `--continue-on-error` for fault tolerance
- Use `--dry-run` to preview execution

## References

- [Run Commands](https://terramate.io/docs/cli/orchestration/run-commands-in-stacks/)
- [Workflows](https://terramate.io/docs/cli/orchestration/workflows/)
- [Parallel Execution](https://terramate.io/docs/cli/orchestration/parallel-execution/)


---

# cli-stack-config

**Priority:** CRITICAL  
**Category:** CLI Fundamentals

## Why It Matters

Proper stack configuration enables metadata, dependencies, and integration with Terramate features. The stack block is essential for stack identification and management.

## Incorrect

```hcl
# Missing stack configuration
# Only Terraform files, no stack.tm.hcl

# main.tf
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
}
```

**Problem:** Stack not recognized by Terramate. Cannot use orchestration, change detection, or stack-specific features.

## Correct

```hcl
# stack.tm.hcl
stack {
  name        = "networking"
  description = "Core VPC and networking resources"
  
  id = "networking-prod"
  
  tags = ["networking", "core", "prod"]
  
  after = [
    "../foundation"
  ]
}
```

**Benefits:**
- Stack is recognized by Terramate CLI
- Enables dependency management via `after`
- Supports filtering with tags
- Provides metadata for automation
- Enables Cloud integration

## Additional Context

Stack block fields:
- `name` - Human-readable stack name (required)
- `description` - Documentation for the stack
- `id` - Unique identifier (optional, defaults to name)
- `tags` - Array of tags for filtering and organization
- `after` - List of stack paths for dependency ordering

Stack dependencies:
- Use `after` to specify execution order
- Dependencies are resolved automatically
- Circular dependencies are detected and reported

## References

- [Configure Stacks](https://terramate.io/docs/cli/stacks/configure-stacks/)
- [Stack Block Reference](https://terramate.io/docs/cli/reference/blocks/stack/)


---

# cli-stack-metadata

**Priority:** CRITICAL  
**Category:** CLI Fundamentals

## Why It Matters

Metadata provides runtime information about stacks, enabling dynamic configuration, filtering, and integration with external systems. Use metadata instead of hardcoding values.

## Incorrect

```hcl
# Hardcoded values
resource "aws_instance" "web" {
  instance_type = "t3.micro"
  
  tags = {
    Environment = "prod"  # Hardcoded
    Stack       = "web"   # Hardcoded
  }
}
```

**Problem:** Values are hardcoded and cannot be reused. Changes require manual updates across files.

## Correct

```hcl
# stack.tm.hcl
stack {
  name = "web"
  tags = ["web", "compute"]
}

# main.tf - Use metadata
resource "aws_instance" "web" {
  instance_type = "t3.micro"
  
  tags = {
    Environment = tm_metadata("environment")
    Stack       = tm_metadata("stack", "name")
    Project     = tm_metadata("project", "name")
  }
}
```

**Using globals with metadata:**

```hcl
# terramate.tm.hcl
globals {
  environment = tm_metadata("environment")
  stack_name  = tm_metadata("stack", "name")
}

# stacks/web/main.tf
resource "aws_instance" "web" {
  tags = {
    Environment = global.environment
    Stack       = global.stack_name
  }
}
```

**Benefits:**
- Dynamic values based on stack context
- Consistent tagging across resources
- Single source of truth
- Easier refactoring and maintenance

## Additional Context

Available metadata:
- `tm_metadata("environment")` - Environment name
- `tm_metadata("stack", "name")` - Stack name
- `tm_metadata("stack", "path")` - Stack filesystem path
- `tm_metadata("project", "name")` - Project name
- `tm_metadata("project", "path")` - Project root path

Metadata functions:
- Use in Terraform code via `tm_metadata()` function
- Use in Terramate configuration via `tm_metadata()` function
- Available in all stack contexts

## References

- [Metadata Reference](https://terramate.io/docs/cli/reference/metadata/)
- [Variable Namespaces](https://terramate.io/docs/cli/reference/variable-namespaces/)


---

# cli-stack-structure

**Priority:** CRITICAL  
**Category:** CLI Fundamentals

## Why It Matters

Proper stack structure enables clear organization, dependency management, and efficient orchestration. Stacks should represent logical units of infrastructure that can be managed independently.

## Incorrect

```
infrastructure/
├── main.tf
├── variables.tf
└── outputs.tf
```

**Problem:** No stack structure. All infrastructure in a single directory without clear boundaries. Cannot leverage Terramate's orchestration, change detection, or dependency management.

## Correct

```
infrastructure/
├── stacks/
│   ├── networking/
│   │   └── stack.tm.hcl
│   ├── compute/
│   │   └── stack.tm.hcl
│   └── database/
│       └── stack.tm.hcl
└── terramate.tm.hcl
```

**Stack Definition:**

```hcl
# stacks/networking/stack.tm.hcl
stack {
  name        = "networking"
  description = "Core networking infrastructure"
  
  tags = ["core", "networking"]
}
```

**Benefits:**
- Clear separation of concerns
- Independent management and deployment
- Enables change detection per stack
- Supports parallel execution of independent stacks
- Better organization for large codebases

## Additional Context

Stack naming conventions:
- Use descriptive names: `networking`, `compute`, `database`
- Avoid generic names: `stack1`, `infra`, `resources`
- Consider environment prefixes: `prod-networking`, `staging-networking`
- Use kebab-case for consistency

Stack directory structure:
- Each stack should be in its own directory
- Include `stack.tm.hcl` in each stack directory
- Terraform files can be in the stack directory or subdirectories

## References

- [Terramate Stacks Documentation](https://terramate.io/docs/cli/stacks/)
- [Create Stacks](https://terramate.io/docs/cli/stacks/create-stacks/)


---

# cloud-drift-management

**Priority:** MEDIUM-HIGH  
**Category:** Terramate Cloud

## Why It Matters

Drift occurs when live infrastructure differs from code. Terramate Cloud automatically detects drift and provides reconciliation workflows, preventing configuration inconsistencies.

## Incorrect

```bash
# Manual drift detection
# Run terraform plan manually in each stack
cd stacks/networking && terraform plan
cd stacks/compute && terraform plan
cd stacks/database && terraform plan

# No automated detection
# No notifications
# No reconciliation workflows
```

**Problem:** Manual process, easy to miss drift, no alerts, no automated reconciliation, time-consuming.

## Correct

**Automatic drift detection:**

```bash
# Sync stacks to Cloud (includes drift detection)
terramate cloud sync

# Or run drift check workflow
terramate run terraform plan -out=tfplan
terramate cloud drift show
```

**CI/CD drift check:**

```yaml
# .github/workflows/drift-check.yml
- name: Check for drift
  run: |
    terramate run terraform plan -out=tfplan
    terramate cloud drift show
```

**Drift reconciliation:**

```bash
# View drift details
terramate cloud drift show --stack stacks/networking

# Reconcile drift (apply changes)
terramate run terraform apply tfplan
terramate cloud sync
```

**Scheduled drift detection:**

```yaml
# .github/workflows/scheduled-drift-check.yml
on:
  schedule:
    - cron: '0 0 * * *'  # Daily

jobs:
  drift-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: terramate-io/setup-terramate@v1
      - run: terramate run terraform plan -out=tfplan
      - run: terramate cloud drift show
```

**Benefits:**
- Automatic drift detection
- Slack/email notifications
- Visual drift representation
- Reconciliation workflows
- Scheduled checks
- Historical drift tracking

## Additional Context

Drift detection methods:
- Post-deployment detection (automatic after sync)
- Scheduled detection (via CI/CD workflows)
- On-demand detection (manual checks)

Drift management:
- View drift as Terraform plans
- No need for cloud account access
- Reconciliation via standard Terraform apply
- Alert configuration via Cloud dashboard

## References

- [Drift Management](https://terramate.io/docs/cloud/drift/)
- [Drift Notifications](https://terramate.io/docs/cloud/drift/notifications/)
- [Drift Check Workflow](https://terramate.io/docs/cli/automation/github-actions/drift-check-workflow/)


---

# cloud-integration

**Priority:** MEDIUM-HIGH  
**Category:** Terramate Cloud

## Why It Matters

Terramate Cloud provides observability, drift detection, and collaboration features. Proper integration enables teams to monitor infrastructure health and manage changes effectively.

## Incorrect

```hcl
# No Cloud integration
# terramate.tm.hcl
terramate {
  config {
    # No cloud configuration
  }
}

# Manual stack status tracking
# No visibility into stack health
# No drift detection
# No collaboration features
```

**Problem:** No visibility into infrastructure state, manual drift detection, no collaboration tools, limited observability.

## Correct

```hcl
# terramate.tm.hcl - Cloud configuration
terramate {
  config {
    cloud {
      organization = "my-org"
    }
  }
}
```

**Authentication:**

```bash
# Login to Terramate Cloud
terramate cloud login

# Or use environment variable
export TERRAMATE_CLOUD_TOKEN="your-token"
```

**Stack synchronization:**

```bash
# Sync stacks to Cloud
terramate cloud sync

# Or in CI/CD
terramate cloud sync --deployment-url "$GITHUB_SERVER_URL/$GITHUB_REPOSITORY/actions/runs/$GITHUB_RUN_ID"
```

**Benefits:**
- Real-time stack visibility
- Automatic drift detection
- Deployment tracking
- Team collaboration
- Slack notifications
- Dashboard and metrics

## Additional Context

Cloud features:
- **Dashboard** - Overview of all stacks and resources
- **Drift Detection** - Automatic detection of configuration drift
- **Deployments** - Track deployment history and status
- **Alerts** - Notifications for failures and drift
- **Policies** - Governance and compliance checks

Integration steps:
1. Create organization in Terramate Cloud
2. Configure `terramate.tm.hcl` with organization name
3. Authenticate via `terramate cloud login`
4. Sync stacks via `terramate cloud sync`

## References

- [Terramate Cloud Onboarding](https://terramate.io/docs/cloud/on-boarding/)
- [Cloud Dashboard](https://terramate.io/docs/cloud/dashboard/)
- [Stack Synchronization](https://terramate.io/docs/cloud/stacks/synchronize-stacks/)


---

