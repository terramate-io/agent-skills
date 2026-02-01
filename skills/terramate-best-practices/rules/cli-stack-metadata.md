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
