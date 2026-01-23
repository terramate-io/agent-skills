# org-audit-logging

**Priority:** MEDIUM-HIGH  
**Category:** Organization & Workflow

## Why It Matters

Audit logs provide accountability, support troubleshooting, enable compliance, and help with security investigations. Track all infrastructure changes and who made them.

## Incorrect

```bash
# No logging in place
# "Who changed the security group last week?"
# "I don't know, check with everyone on the team"

# Manual changelog
# Shared doc that nobody updates consistently
```

**Problems:**
- Can't determine who made changes
- Can't troubleshoot issues
- Compliance violations
- Security blind spots

## Correct

### Layer 1: Version Control History

```bash
# Git log shows who changed infrastructure code
git log --oneline --all -- '*.tf'

# Show changes for specific file
git log -p -- modules/networking/main.tf

# Find who introduced a specific change
git blame main.tf
```

### Layer 2: Cloud Provider Audit Logs

```hcl
# AWS CloudTrail
resource "aws_cloudtrail" "main" {
  name                          = "infrastructure-audit"
  s3_bucket_name                = aws_s3_bucket.cloudtrail.id
  include_global_service_events = true
  is_multi_region_trail         = true
  enable_log_file_validation    = true
  
  event_selector {
    read_write_type           = "All"
    include_management_events = true
  }
}

# GCP Audit Logs (enabled by default)
resource "google_project_iam_audit_config" "all" {
  project = var.project_id
  service = "allServices"
  
  audit_log_config {
    log_type = "ADMIN_READ"
  }
  audit_log_config {
    log_type = "DATA_READ"
  }
  audit_log_config {
    log_type = "DATA_WRITE"
  }
}

# Azure Activity Log
resource "azurerm_monitor_diagnostic_setting" "activity_log" {
  name                       = "activity-log-to-storage"
  target_resource_id         = data.azurerm_subscription.current.id
  storage_account_id         = azurerm_storage_account.audit.id
  
  enabled_log {
    category = "Administrative"
  }
  enabled_log {
    category = "Security"
  }
}
```

### Layer 3: Terraform State Changes

```hcl
# Enable versioning on state bucket
resource "aws_s3_bucket_versioning" "state" {
  bucket = aws_s3_bucket.terraform_state.id
  
  versioning_configuration {
    status = "Enabled"
  }
}

# Log access to state bucket
resource "aws_s3_bucket_logging" "state" {
  bucket = aws_s3_bucket.terraform_state.id

  target_bucket = aws_s3_bucket.logs.id
  target_prefix = "state-access-logs/"
}
```

### Layer 4: CI/CD Pipeline Logs

```yaml
# GitHub Actions - logs preserved automatically
- name: Terraform Apply
  run: terraform apply -auto-approve
  # Output captured in workflow run logs

# Include metadata in logs
- name: Log Deployment Info
  run: |
    echo "Deployer: ${{ github.actor }}"
    echo "Commit: ${{ github.sha }}"
    echo "Ref: ${{ github.ref }}"
    echo "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
```

### Centralized Logging

```hcl
# Send CloudTrail to CloudWatch Logs
resource "aws_cloudtrail" "main" {
  # ...
  cloud_watch_logs_group_arn = "${aws_cloudwatch_log_group.cloudtrail.arn}:*"
  cloud_watch_logs_role_arn  = aws_iam_role.cloudtrail.arn
}

# Create alerts for important events
resource "aws_cloudwatch_metric_alarm" "unauthorized_api_calls" {
  alarm_name          = "unauthorized-api-calls"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "UnauthorizedAPICalls"
  namespace           = "CloudTrailMetrics"
  period              = 300
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "Unauthorized API calls detected"
  alarm_actions       = [aws_sns_topic.alerts.arn]
}
```

### Log Retention

```hcl
# Retain logs for compliance
resource "aws_cloudwatch_log_group" "terraform" {
  name              = "/terraform/deployments"
  retention_in_days = 365  # Adjust based on compliance requirements
}

resource "aws_s3_bucket_lifecycle_configuration" "audit_logs" {
  bucket = aws_s3_bucket.audit_logs.id

  rule {
    id     = "archive-old-logs"
    status = "Enabled"

    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    expiration {
      days = 2555  # 7 years for compliance
    }
  }
}
```

### Query Audit Logs

```bash
# AWS CloudTrail - find who modified security groups
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=EventName,AttributeValue=AuthorizeSecurityGroupIngress \
  --start-time 2024-01-01 \
  --end-time 2024-01-31

# Find all Terraform-initiated changes (by user agent)
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=EventSource,AttributeValue=ec2.amazonaws.com \
  | jq '.Events[] | select(.CloudTrailEvent | contains("terraform"))'
```

### Terraform-Specific Logging

```hcl
# Log all Terraform operations
resource "null_resource" "log_apply" {
  triggers = {
    always_run = timestamp()
  }

  provisioner "local-exec" {
    command = <<-EOT
      echo '{"timestamp":"${timestamp()}","user":"${var.deployer}","action":"apply","workspace":"${terraform.workspace}"}' >> terraform-audit.log
    EOT
  }
}
```

## What to Track

| Event | Source | Retention |
|-------|--------|-----------|
| Code changes | Git | Forever |
| API calls | CloudTrail/Stackdriver | 1-7 years |
| State changes | S3 versioning | 1 year |
| Pipeline runs | CI/CD logs | 90 days |
| Access attempts | CloudTrail | 1 year |

## References

- [AWS CloudTrail](https://docs.aws.amazon.com/awscloudtrail/latest/userguide/)
- [GCP Audit Logs](https://cloud.google.com/logging/docs/audit)
- [Azure Activity Logs](https://docs.microsoft.com/en-us/azure/azure-monitor/essentials/activity-log)
