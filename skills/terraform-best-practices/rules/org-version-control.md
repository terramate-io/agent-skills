# org-version-control

**Priority:** CRITICAL  
**Category:** Organization & Workflow

## Why It Matters

Version control provides a complete history of infrastructure changes, enables collaboration, supports code review, and allows rollback to previous states. All Terraform code should be in version control.

## Incorrect

```bash
# Terraform code stored locally or on shared drives
/shared-drive/terraform/
├── main.tf
├── main-backup.tf
├── main-old.tf
└── main-DONT-USE.tf

# Code shared via email or chat
# No history of who changed what and when
```

**Problems:**
- No audit trail of changes
- No way to roll back
- Conflicts when multiple people edit
- No code review process

## Correct

### Use Git for All Terraform Code

```bash
# Every configuration in version control
git init
git add .
git commit -m "Initial infrastructure configuration"
git push origin main
```

### Repository Organization

There are multiple valid approaches to organizing Terraform repositories:

- **Monorepo** - All infrastructure in one repository
- **Polyrepo** - Separate repositories per component or team
- **Hybrid** - Shared modules in one repo, configurations in separate repos

Choose the approach that fits your organization's needs. The key principles are:
- Code is versioned and auditable
- Teams can collaborate with code review
- Changes can be rolled back

### Branch Strategy

```bash
# Feature branch workflow
git checkout -b feature/add-cache-layer
# Make changes
git add .
git commit -m "Add ElastiCache for session storage"
git push origin feature/add-cache-layer
# Create pull request for review
```

### Protect Main Branch

Configure branch protection rules:
- Require pull request reviews before merging
- Require status checks to pass (CI/CD)
- Require conversation resolution
- Do not allow force pushes

### Commit Message Guidelines

```bash
# Good commit messages
git commit -m "Add RDS read replica for reporting queries

- Creates read replica in us-east-1b
- Configures security group for app servers
- Updates outputs for connection string

Refs: INFRA-1234"

# Bad commit messages
git commit -m "updates"
git commit -m "fix"
git commit -m "wip"
```

## .gitignore for Terraform

```gitignore
# Local .terraform directories
**/.terraform/*

# .tfstate files
*.tfstate
*.tfstate.*

# Crash log files
crash.log
crash.*.log

# Exclude override files
override.tf
override.tf.json
*_override.tf
*_override.tf.json

# Exclude CLI config files
.terraformrc
terraform.rc

# Exclude sensitive variable files
*.tfvars
*.tfvars.json
!example.tfvars

# Lock file should be committed
# Do NOT add .terraform.lock.hcl
```

## Lock File Management

```bash
# Commit the lock file for reproducibility
git add .terraform.lock.hcl
git commit -m "Update provider lock file"

# When updating providers
terraform init -upgrade
git add .terraform.lock.hcl
git commit -m "Upgrade AWS provider to 5.32.0"
```

## References

- [Version Control Best Practices](https://developer.hashicorp.com/terraform/cloud-docs/recommended-practices/part3.2)
- [Git Workflow Strategies](https://www.atlassian.com/git/tutorials/comparing-workflows)
