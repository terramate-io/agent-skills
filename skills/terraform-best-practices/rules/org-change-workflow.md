# org-change-workflow

**Priority:** HIGH  
**Category:** Organization & Workflow

## Why It Matters

A formal change workflow minimizes disruption, enables rollbacks, prevents conflicts, and creates audit trails. Changes to infrastructure should follow a predictable, reviewable process.

## Incorrect

```bash
# Cowboy workflow
cd terraform/
vim main.tf
terraform apply -auto-approve
# Hope it works!
```

**Problems:**
- No review before changes
- No record of what changed
- Can't roll back easily
- Conflicts between team members

## Correct

### Standard Change Workflow

```
1. Create branch
2. Make changes
3. Run terraform plan
4. Create pull request
5. Review plan output
6. Approve and merge
7. Apply changes (automated or manual)
8. Verify deployment
```

### Branch-Based Workflow

```bash
# 1. Create feature branch
git checkout -b feature/add-redis-cache

# 2. Make changes
vim main.tf

# 3. Format and validate
terraform fmt
terraform validate

# 4. Generate plan
terraform plan -out=tfplan

# 5. Commit and push
git add .
git commit -m "Add Redis cache for session storage"
git push origin feature/add-redis-cache

# 6. Create PR with plan output
# 7. Get review and approval
# 8. Merge to main
# 9. Apply in CI/CD or manually
```

### Pull Request Template

```markdown
<!-- .github/pull_request_template.md -->
## Description
<!-- What infrastructure changes does this PR make? -->

## Motivation
<!-- Why are these changes needed? -->

## Terraform Plan
<details>
<summary>Click to expand plan output</summary>

```
<!-- Paste terraform plan output here -->
```

</details>

## Checklist
- [ ] `terraform fmt` has been run
- [ ] `terraform validate` passes
- [ ] Plan output has been reviewed
- [ ] No secrets in code
- [ ] Documentation updated (if needed)
- [ ] Tested in dev environment first

## Rollback Plan
<!-- How to revert if something goes wrong -->
```

### CI/CD Pipeline

```yaml
# .github/workflows/terraform.yml
name: Terraform

on:
  pull_request:
    paths: ['**.tf', '**.tfvars']
  push:
    branches: [main]

jobs:
  plan:
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    steps:
      - uses: actions/checkout@v4
      
      - uses: hashicorp/setup-terraform@v3
      
      - name: Terraform Init
        run: terraform init
        
      - name: Terraform Plan
        run: terraform plan -no-color
        continue-on-error: true
        
      - name: Comment Plan on PR
        uses: actions/github-script@v7
        with:
          script: |
            // Post plan output as PR comment
            
  apply:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    environment: production  # Requires approval
    steps:
      - uses: actions/checkout@v4
      
      - uses: hashicorp/setup-terraform@v3
      
      - name: Terraform Init
        run: terraform init
        
      - name: Terraform Apply
        run: terraform apply -auto-approve
```

### Environment Promotion

```
┌─────────┐     ┌─────────┐     ┌─────────┐
│   Dev   │────▶│ Staging │────▶│  Prod   │
└─────────┘     └─────────┘     └─────────┘
     │               │               │
  Auto-apply    Auto-apply    Manual approval
     │               │               │
  Feature        Main branch   Tagged release
  branches       merge           or approval
```

### Makefile for Consistency

```makefile
.PHONY: init plan apply destroy

ENV ?= dev

init:
	terraform init

plan:
	terraform plan -var-file=$(ENV).tfvars -out=tfplan

apply:
	terraform apply tfplan

destroy:
	terraform destroy -var-file=$(ENV).tfvars

# Usage: make plan ENV=prod
```

### Change Documentation

```hcl
# Document significant changes in code
# CHANGELOG: 2024-01-15 - Added read replica for reporting
# Ticket: INFRA-1234
# Author: @engineer

resource "aws_db_instance" "read_replica" {
  # ...
}
```

### Rollback Strategy

```bash
# Option 1: Revert the commit
git revert HEAD
git push
# CI/CD applies the reverted state

# Option 2: Apply previous state
terraform apply -target=aws_instance.web -var="ami_id=ami-previous"

# Option 3: Use state to restore
terraform state pull > backup.tfstate
# Restore from backup if needed
```

## Four Levels of Maturity

| Level | Practice |
|-------|----------|
| Manual | Changes via console/CLI, no tracking |
| Semi-automated | Some IaC, inconsistent processes |
| Infrastructure as Code | All changes via Terraform, VCS, reviews |
| Collaborative IaC | Delegation, access control, automated promotion |

## References

- [HashiCorp Change Workflow](https://developer.hashicorp.com/terraform/cloud-docs/recommended-practices/part2#your-current-change-control-workflow)
- [GitOps Principles](https://opengitops.dev/)
