# state-import

**Priority:** MEDIUM-HIGH  
**Category:** State Management

## Why It Matters

Most organizations have existing infrastructure created manually or by other tools. Import brings these resources under Terraform management, providing a single source of truth and preventing configuration drift.

## Incorrect

```bash
# Infrastructure exists but Terraform doesn't know about it
terraform plan
# Plan: 5 to add, 0 to change, 0 to destroy

# Terraform wants to CREATE resources that already exist!
# This will fail or create duplicates
```

## Correct

### Step 1: Write the Configuration

```hcl
# First, write the resource configuration
resource "aws_instance" "web" {
  ami           = "ami-12345678"
  instance_type = "t3.micro"
  subnet_id     = "subnet-abc123"
  
  tags = {
    Name = "production-web-server"
  }
}
```

### Step 2: Import the Resource

```bash
# Import existing resource into state
terraform import aws_instance.web i-1234567890abcdef0

# Verify import
terraform state show aws_instance.web
```

### Step 3: Adjust Configuration

```bash
# Run plan to see differences
terraform plan

# Update your configuration to match the actual resource
# Repeat until plan shows no changes
```

### Import Block (Terraform 1.5+)

```hcl
# Declarative import - preferred method
import {
  to = aws_instance.web
  id = "i-1234567890abcdef0"
}

resource "aws_instance" "web" {
  ami           = "ami-12345678"
  instance_type = "t3.micro"
  # ...
}
```

```bash
# Generate configuration from import
terraform plan -generate-config-out=generated.tf
```

### Bulk Import with for_each

```hcl
# Import multiple resources
locals {
  existing_instances = {
    "web-1" = "i-111111111"
    "web-2" = "i-222222222"
    "web-3" = "i-333333333"
  }
}

import {
  for_each = local.existing_instances
  to       = aws_instance.web[each.key]
  id       = each.value
}

resource "aws_instance" "web" {
  for_each      = local.existing_instances
  ami           = "ami-12345678"
  instance_type = "t3.micro"
}
```

### Common Import Commands

```bash
# AWS Examples
terraform import aws_vpc.main vpc-abc123
terraform import aws_subnet.public subnet-abc123
terraform import aws_security_group.web sg-abc123
terraform import aws_db_instance.main mydb
terraform import aws_s3_bucket.data my-bucket-name
terraform import aws_iam_role.app my-role-name

# Module resources
terraform import module.vpc.aws_vpc.this vpc-abc123

# Resources with complex IDs
terraform import 'aws_route53_record.www["A"]' 'Z123456_example.com_A'
```

### Import Strategy for Large Environments

```bash
# 1. Inventory existing resources
aws ec2 describe-instances --query 'Reservations[].Instances[].InstanceId'

# 2. Create import script
#!/bin/bash
terraform import aws_instance.web[0] i-111111111
terraform import aws_instance.web[1] i-222222222
terraform import aws_instance.web[2] i-333333333

# 3. Run imports
chmod +x import.sh
./import.sh

# 4. Generate configurations
terraform plan -generate-config-out=imported.tf

# 5. Review and refactor generated code
```

### Tools for Bulk Import

Several tools help with large-scale imports:

```bash
# terraformer - generate TF from existing infrastructure
terraformer import aws --resources=vpc,subnet,security_group

# former2 - AWS CloudFormation/Terraform generator
# Use web interface to select resources
```

### Handling Import Errors

```bash
# Resource not found
Error: Cannot import non-existent remote object
# Verify the resource ID is correct

# Resource already managed
Error: Resource already managed by Terraform
# Check state: terraform state list | grep resource_name

# Wrong resource type
Error: resource address does not match
# Ensure resource type matches (aws_instance vs aws_spot_instance_request)
```

### Post-Import Checklist

```markdown
- [ ] Import successful (terraform import)
- [ ] Configuration matches actual resource (terraform plan shows no changes)
- [ ] Sensitive values moved to variables
- [ ] Tags and naming conventions applied
- [ ] Documentation updated
- [ ] Team notified of newly managed resources
```

### Preventing Accidental Destruction

```hcl
# Protect imported resources during transition
resource "aws_instance" "web" {
  # ... configuration ...
  
  lifecycle {
    prevent_destroy = true  # Remove after confirming import is correct
  }
}
```

## References

- [Terraform Import](https://developer.hashicorp.com/terraform/cli/import)
- [Import Block](https://developer.hashicorp.com/terraform/language/import)
- [Generating Configuration](https://developer.hashicorp.com/terraform/language/import/generating-configuration)
