# resource-lifecycle

**Priority:** MEDIUM  
**Category:** Resource Organization

## Why It Matters

Lifecycle blocks control how Terraform creates, updates, and destroys resources. Proper use prevents accidental destruction, enables zero-downtime deployments, and handles edge cases in resource management.

## Incorrect

```hcl
# No lifecycle rules - risky for critical resources
resource "aws_db_instance" "production" {
  identifier     = "production-db"
  engine         = "postgres"
  instance_class = "db.r5.large"
  # Can be accidentally destroyed with terraform destroy!
}

resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.micro"
  # Default: destroy then create = downtime
}
```

## Correct

```hcl
resource "aws_db_instance" "production" {
  identifier     = "production-db"
  engine         = "postgres"
  instance_class = "db.r5.large"
  
  lifecycle {
    prevent_destroy = true  # Protect from accidental deletion
  }
}

resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.micro"
  
  lifecycle {
    create_before_destroy = true  # Zero-downtime replacement
  }
}
```

## Lifecycle Arguments

| Argument | Purpose |
|----------|---------|
| `create_before_destroy` | Create replacement before destroying original |
| `prevent_destroy` | Prevent accidental deletion |
| `ignore_changes` | Ignore changes to specific attributes |
| `replace_triggered_by` | Force replacement when dependencies change |

## create_before_destroy

### Problem

```hcl
# Default behavior: destroy then create
# Causes downtime when replacing resources

resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.micro"
}

# When AMI changes:
# 1. Destroy old instance (downtime starts)
# 2. Create new instance (downtime ends)
```

### Solution

```hcl
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.micro"

  lifecycle {
    create_before_destroy = true
  }
}

# When AMI changes:
# 1. Create new instance
# 2. Update references (load balancer, etc.)
# 3. Destroy old instance
# Zero downtime!
```

### Common Use Cases

```hcl
# Security groups (referenced by instances)
resource "aws_security_group" "web" {
  name_prefix = "web-sg-"
  
  lifecycle {
    create_before_destroy = true
  }
}

# IAM roles (referenced by services)
resource "aws_iam_role" "app" {
  name_prefix = "app-role-"
  
  lifecycle {
    create_before_destroy = true
  }
}

# Launch templates (referenced by ASGs)
resource "aws_launch_template" "web" {
  name_prefix = "web-lt-"
  
  lifecycle {
    create_before_destroy = true
  }
}
```

## prevent_destroy

### Protect Critical Resources

```hcl
# Prevent accidental deletion of production database
resource "aws_db_instance" "production" {
  identifier     = "production-db"
  engine         = "postgres"
  instance_class = "db.r5.large"
  
  lifecycle {
    prevent_destroy = true
  }
}

# Prevent deletion of state bucket
resource "aws_s3_bucket" "terraform_state" {
  bucket = "my-terraform-state"
  
  lifecycle {
    prevent_destroy = true
  }
}

# Prevent deletion of encryption keys
resource "aws_kms_key" "main" {
  description = "Main encryption key"
  
  lifecycle {
    prevent_destroy = true
  }
}
```

### terraform destroy Behavior

```bash
# With prevent_destroy = true
terraform destroy

# Error: Instance cannot be destroyed
# Resource aws_db_instance.production has lifecycle.prevent_destroy set

# To actually destroy, first remove prevent_destroy from config
```

## ignore_changes

### Ignore External Modifications

```hcl
# Ignore tags managed by external automation
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.micro"
  
  tags = {
    Name = "web-server"
  }
  
  lifecycle {
    ignore_changes = [
      tags["LastBackup"],      # Updated by backup system
      tags["CostAllocation"],  # Updated by cost tool
    ]
  }
}

# Ignore ASG desired capacity (managed by auto-scaling)
resource "aws_autoscaling_group" "web" {
  name                = "web-asg"
  min_size            = 2
  max_size            = 10
  desired_capacity    = 2  # Initial value
  
  lifecycle {
    ignore_changes = [desired_capacity]
  }
}
```

### Ignore All Changes

```hcl
# Resource managed externally, just track in state
resource "aws_instance" "legacy" {
  ami           = "ami-12345678"
  instance_type = "t3.micro"
  
  lifecycle {
    ignore_changes = all
  }
}
```

### Common ignore_changes Patterns

```hcl
# EKS cluster version (upgraded via console/CLI)
resource "aws_eks_cluster" "main" {
  name    = "main"
  version = "1.27"
  
  lifecycle {
    ignore_changes = [version]
  }
}

# Lambda function code (deployed separately)
resource "aws_lambda_function" "app" {
  function_name = "app"
  filename      = "placeholder.zip"
  
  lifecycle {
    ignore_changes = [
      filename,
      source_code_hash,
    ]
  }
}

# RDS password (managed outside Terraform)
resource "aws_db_instance" "main" {
  identifier = "main"
  password   = "initial-password"
  
  lifecycle {
    ignore_changes = [password]
  }
}
```

## replace_triggered_by

### Force Replacement on Dependency Change

```hcl
# Replace instance when user data script changes
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.micro"
  user_data     = file("${path.module}/user-data.sh")
  
  lifecycle {
    replace_triggered_by = [
      null_resource.user_data_version
    ]
  }
}

resource "null_resource" "user_data_version" {
  triggers = {
    user_data_hash = filemd5("${path.module}/user-data.sh")
  }
}
```

### Replace on Module Output Change

```hcl
resource "aws_instance" "web" {
  ami           = module.ami.latest_id
  instance_type = "t3.micro"
  
  lifecycle {
    replace_triggered_by = [
      module.ami  # Replace when any module output changes
    ]
  }
}
```

## Combining Lifecycle Rules

```hcl
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.micro"
  
  tags = {
    Name = "web-server"
  }
  
  lifecycle {
    create_before_destroy = true
    prevent_destroy       = var.environment == "prod"
    
    ignore_changes = [
      tags["LastBackup"],
    ]
    
    replace_triggered_by = [
      null_resource.deployment_trigger
    ]
  }
}
```

## Preconditions and Postconditions

```hcl
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = var.instance_type
  
  lifecycle {
    precondition {
      condition     = var.environment != "prod" || var.instance_type != "t3.micro"
      error_message = "Production instances must be larger than t3.micro"
    }
    
    postcondition {
      condition     = self.public_ip != null
      error_message = "Instance must have a public IP"
    }
  }
}
```

## References

- [Lifecycle Meta-Argument](https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle)
- [Preconditions and Postconditions](https://developer.hashicorp.com/terraform/language/expressions/custom-conditions)
