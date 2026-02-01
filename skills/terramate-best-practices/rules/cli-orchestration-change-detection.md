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
