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
