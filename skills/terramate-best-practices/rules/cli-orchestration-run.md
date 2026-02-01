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
