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
