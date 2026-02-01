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
