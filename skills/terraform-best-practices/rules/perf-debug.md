# perf-debug

**Priority:** LOW-MEDIUM  
**Category:** Performance Optimization

## Why It Matters

When Terraform behaves unexpectedly, debug logs help identify the root cause. Knowing how to enable and interpret debug output speeds up troubleshooting.

## Incorrect

```bash
# Running terraform without debug info when things fail
terraform apply
# Error: something went wrong
# No idea what happened or why
```

## Correct

```bash
# Enable debug logging to understand failures
TF_LOG=DEBUG terraform apply

# Or log to file for later analysis
export TF_LOG=DEBUG
export TF_LOG_PATH="./terraform.log"
terraform apply
```

## Enable Debug Logging

### Temporary (Single Command)

```bash
# Full debug output
TF_LOG=DEBUG terraform plan

# Trace level (most verbose)
TF_LOG=TRACE terraform apply

# Available levels: TRACE, DEBUG, INFO, WARN, ERROR
TF_LOG=INFO terraform plan
```

### Persist to File

```bash
# Log to file instead of stdout
export TF_LOG=DEBUG
export TF_LOG_PATH="./terraform.log"

terraform plan

# Review logs
cat terraform.log
```

### Provider-Specific Logging

```bash
# Log only core Terraform
TF_LOG_CORE=DEBUG terraform plan

# Log only provider operations
TF_LOG_PROVIDER=DEBUG terraform plan

# Combine both
TF_LOG_CORE=WARN TF_LOG_PROVIDER=DEBUG terraform plan
```

## Common Debug Scenarios

### Slow Plans

```bash
# Time the plan and identify slow resources
TF_LOG=DEBUG terraform plan 2>&1 | tee plan.log

# Look for slow operations
grep -i "seconds" plan.log
grep -i "waiting" plan.log
```

### Authentication Issues

```bash
# Debug credential problems
TF_LOG=DEBUG terraform plan 2>&1 | grep -i "auth\|credential\|token\|401\|403"

# AWS-specific
AWS_DEBUG=1 TF_LOG=DEBUG terraform plan
```

### Provider Errors

```bash
# Capture full API responses
TF_LOG=TRACE terraform apply 2>&1 | tee apply.log

# Search for errors
grep -i "error\|failed\|invalid" apply.log
```

## Terraform Plan Debugging

### Understand Plan Output

```bash
# Detailed plan with reasons for changes
terraform plan -detailed-exitcode

# Exit codes:
# 0 = No changes
# 1 = Error
# 2 = Changes present
```

### Show What Changed

```bash
# JSON output for programmatic analysis
terraform plan -out=tfplan
terraform show -json tfplan | jq '.resource_changes[] | select(.change.actions != ["no-op"])'
```

### Refresh and State Issues

```bash
# Skip refresh to isolate issues
terraform plan -refresh=false

# Compare with refresh
terraform plan -refresh=true

# Target specific resources
terraform plan -target=aws_instance.web
```

## State Debugging

```bash
# List all resources in state
terraform state list

# Show specific resource
terraform state show aws_instance.web

# Pull state for inspection
terraform state pull > state.json
jq '.resources[] | select(.type == "aws_instance")' state.json
```

## Crash Debugging

```bash
# Terraform creates crash.log on panic
cat crash.log

# Enable core dumps
export TF_LOG=TRACE
export TF_LOG_PATH="./crash_debug.log"
terraform apply
```

## Network Debugging

```bash
# Debug HTTP requests
export TF_LOG=TRACE
export HTTPS_PROXY=http://localhost:8080  # Use with mitmproxy/Fiddler

terraform plan
```

## Common Issues and Solutions

### Stuck on "Refreshing state..."

```bash
# Likely: API rate limiting or network issues
# Solution: Increase parallelism timeout
terraform plan -parallelism=1

# Or skip refresh temporarily
terraform plan -refresh=false
```

### "Resource already exists"

```bash
# Import the existing resource
terraform import aws_instance.web i-1234567890abcdef0

# Or check for naming conflicts
terraform state list | grep instance
```

### "Error acquiring state lock"

```bash
# Find and release stuck lock
terraform force-unlock LOCK_ID

# Check DynamoDB for lock
aws dynamodb scan --table-name terraform-locks
```

### Provider Plugin Errors

```bash
# Clear plugin cache
rm -rf .terraform/

# Reinitialize
terraform init -upgrade

# Check provider versions
terraform providers
```

## Debugging Workflow

```bash
#!/bin/bash
# debug-terraform.sh

set -e

echo "=== Terraform Debug Session ==="
echo "Timestamp: $(date)"
echo "Directory: $(pwd)"
echo ""

# Capture environment
echo "=== Environment ==="
terraform version
echo ""

# Enable debugging
export TF_LOG=DEBUG
export TF_LOG_PATH="./debug_$(date +%Y%m%d_%H%M%S).log"

# Run command
echo "=== Running: terraform $@ ==="
terraform "$@"

echo ""
echo "=== Debug log saved to: $TF_LOG_PATH ==="
```

## IDE Debugging

### VSCode launch.json

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Terraform Plan",
      "type": "node",
      "request": "launch",
      "program": "/usr/local/bin/terraform",
      "args": ["plan"],
      "env": {
        "TF_LOG": "DEBUG"
      },
      "cwd": "${workspaceFolder}"
    }
  ]
}
```

## References

- [Debugging Terraform](https://developer.hashicorp.com/terraform/internals/debugging)
- [Terraform Logs](https://developer.hashicorp.com/terraform/cli/config/environment-variables#tf_log)
