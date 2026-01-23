# language-data-sources

**Priority:** MEDIUM  
**Category:** Language Best Practices

## Why It Matters

Data sources fetch information dynamically instead of hardcoding values. This makes configurations more portable, self-documenting, and less prone to errors from stale or incorrect values.

## Incorrect

```hcl
# Hardcoded values that can become stale or incorrect
resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"  # What region? What OS? Still valid?
  instance_type = "t3.micro"
  subnet_id     = "subnet-abc123def456"    # What if this changes?
}

resource "aws_iam_role_policy" "app" {
  policy = jsonencode({
    Statement = [{
      Effect   = "Allow"
      Action   = ["s3:GetObject"]
      Resource = "arn:aws:s3:::my-bucket/*"  # Hardcoded account assumed
    }]
  })
}

# Hardcoded account ID
locals {
  account_id = "123456789012"  # Copy-pasted, easy to get wrong
}
```

**Problems:**
- AMI IDs vary by region
- Values become stale over time
- Hardcoded IDs can be wrong
- Not portable across environments

## Correct

### Dynamic AMI Lookup

```hcl
# Always get the latest Amazon Linux 2 AMI for current region
data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-*-x86_64-gp2"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

resource "aws_instance" "web" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t3.micro"
}
```

### Current Account and Region

```hcl
# Get current AWS account ID dynamically
data "aws_caller_identity" "current" {}

# Get current region
data "aws_region" "current" {}

locals {
  account_id = data.aws_caller_identity.current.account_id
  region     = data.aws_region.current.name
}

resource "aws_iam_role_policy" "app" {
  policy = jsonencode({
    Statement = [{
      Effect   = "Allow"
      Action   = ["s3:GetObject"]
      Resource = "arn:aws:s3:::${local.account_id}-app-data/*"
    }]
  })
}
```

### Availability Zones

```hcl
# Get available AZs in current region
data "aws_availability_zones" "available" {
  state = "available"
}

resource "aws_subnet" "private" {
  count             = 3
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index)
  availability_zone = data.aws_availability_zones.available.names[count.index]
}
```

### Reference Existing Resources

```hcl
# Look up existing VPC by tag
data "aws_vpc" "main" {
  filter {
    name   = "tag:Name"
    values = ["production-vpc"]
  }
}

# Look up existing subnets
data "aws_subnets" "private" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.main.id]
  }

  filter {
    name   = "tag:Tier"
    values = ["private"]
  }
}

resource "aws_instance" "web" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t3.micro"
  subnet_id     = data.aws_subnets.private.ids[0]
}
```

### IAM Policy Documents

```hcl
# Use data source instead of JSON strings
data "aws_iam_policy_document" "s3_read" {
  statement {
    effect = "Allow"
    
    actions = [
      "s3:GetObject",
      "s3:ListBucket"
    ]
    
    resources = [
      aws_s3_bucket.data.arn,
      "${aws_s3_bucket.data.arn}/*"
    ]
  }
}

resource "aws_iam_role_policy" "app" {
  name   = "s3-read-policy"
  role   = aws_iam_role.app.id
  policy = data.aws_iam_policy_document.s3_read.json
}
```

### Cross-Account Data

```hcl
# Reference resources from another account
data "aws_secretsmanager_secret" "shared" {
  provider = aws.shared_services
  name     = "shared/api-key"
}

# Reference from another Terraform state
data "terraform_remote_state" "networking" {
  backend = "s3"
  
  config = {
    bucket = "terraform-state"
    key    = "networking/terraform.tfstate"
    region = "us-east-1"
  }
}

resource "aws_instance" "web" {
  subnet_id = data.terraform_remote_state.networking.outputs.private_subnet_ids[0]
}
```

### Common Data Sources

| Use Case | Data Source |
|----------|-------------|
| Current account | `aws_caller_identity` |
| Current region | `aws_region` |
| Availability zones | `aws_availability_zones` |
| Latest AMI | `aws_ami` |
| Existing VPC | `aws_vpc` |
| Existing subnets | `aws_subnets` |
| IAM policy | `aws_iam_policy_document` |
| Secrets | `aws_secretsmanager_secret_version` |
| SSM parameters | `aws_ssm_parameter` |
| Route53 zone | `aws_route53_zone` |
| ACM certificate | `aws_acm_certificate` |

### GCP Data Sources

```hcl
data "google_project" "current" {}

data "google_compute_zones" "available" {
  region = var.region
}

data "google_compute_image" "debian" {
  family  = "debian-11"
  project = "debian-cloud"
}
```

### Azure Data Sources

```hcl
data "azurerm_subscription" "current" {}

data "azurerm_client_config" "current" {}

data "azurerm_resource_group" "existing" {
  name = "my-resource-group"
}
```

## References

- [Data Sources](https://developer.hashicorp.com/terraform/language/data-sources)
- [AWS Data Sources](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
