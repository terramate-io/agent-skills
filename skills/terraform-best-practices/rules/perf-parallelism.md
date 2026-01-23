# perf-parallelism

**Priority:** LOW-MEDIUM  
**Category:** Performance Optimization

## Why It Matters

Terraform's default parallelism of 10 concurrent operations works for most cases, but large deployments or rate-limited APIs may benefit from tuning.

## Incorrect

```bash
# Using default parallelism when hitting API rate limits
terraform apply
# Error: Rate limit exceeded
# Error: Too many requests

# Or using default for very large deployments (slow)
terraform apply  # Takes forever with 500+ resources
```

## Correct

```bash
# Decrease for rate-limited APIs (GitHub, Cloudflare)
terraform apply -parallelism=3

# Increase for large deployments with no rate limits
terraform apply -parallelism=20

# Sequential for debugging
terraform apply -parallelism=1
```

## Default Behavior

```bash
# Default: 10 concurrent operations
terraform apply
```

## Increasing Parallelism

For large deployments with many independent resources:

```bash
# Increase for faster applies
terraform apply -parallelism=20
```

**When to increase:**
- 100+ independent resources
- No API rate limiting issues
- Resources don't have interdependencies
- Fast network connection to provider

## Decreasing Parallelism

For rate-limited APIs or debugging:

```bash
# Decrease for rate-limited APIs
terraform apply -parallelism=5

# Sequential for debugging
terraform apply -parallelism=1
```

**When to decrease:**
- Provider API rate limits (common with GitHub, Cloudflare)
- Debugging resource creation order
- Shared resource contention
- Memory-constrained environments

## Provider-Specific Considerations

### AWS

```hcl
# AWS generally handles high parallelism well
# But some services have limits (e.g., IAM)
terraform apply -parallelism=15
```

### GitHub

```hcl
# GitHub API is heavily rate-limited
terraform apply -parallelism=3
```

### Kubernetes

```hcl
# Kubernetes API server can be overwhelmed
terraform apply -parallelism=5
```

## Using Environment Variables

```bash
# Set default parallelism
export TF_CLI_ARGS_apply="-parallelism=15"
export TF_CLI_ARGS_plan="-parallelism=15"

terraform apply  # Uses 15
```

## CI/CD Configuration

```yaml
# GitHub Actions example
jobs:
  terraform:
    steps:
      - name: Terraform Apply
        run: terraform apply -parallelism=10 -auto-approve
        env:
          TF_IN_AUTOMATION: true
```

## Measuring Impact

```bash
# Time different parallelism settings
time terraform apply -parallelism=5 -auto-approve
time terraform apply -parallelism=10 -auto-approve
time terraform apply -parallelism=20 -auto-approve
```

## Dependencies Override Parallelism

Remember that dependent resources run sequentially regardless of parallelism:

```hcl
resource "aws_vpc" "main" {
  # Creates first
}

resource "aws_subnet" "public" {
  vpc_id = aws_vpc.main.id  # Waits for VPC
}

resource "aws_instance" "web" {
  subnet_id = aws_subnet.public.id  # Waits for subnet
}
```

## References

- [Terraform CLI Configuration](https://developer.hashicorp.com/terraform/cli/commands/apply#parallelism-n)
