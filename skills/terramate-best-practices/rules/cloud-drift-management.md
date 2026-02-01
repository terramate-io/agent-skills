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
