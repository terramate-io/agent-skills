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
