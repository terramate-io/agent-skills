# state-remote-backend

**Priority:** CRITICAL  
**Category:** State Management

## Why It Matters

Local state files are a single point of failure and make collaboration impossible. Remote backends provide durability, locking, and team access to state.

## Incorrect

```hcl
# No backend configuration - state stored locally
terraform {
  required_version = ">= 1.0"
}

resource "aws_instance" "web" {
  ami           = "ami-12345678"
  instance_type = "t3.micro"
}
```

**Problem:** State stored in `terraform.tfstate` locally. If lost, Terraform loses track of all managed resources.

## Correct

```hcl
terraform {
  required_version = ">= 1.0"
  
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"
  }
}

resource "aws_instance" "web" {
  ami           = "ami-12345678"
  instance_type = "t3.micro"
}
```

**Benefits:**
- State persisted durably in S3
- State locking via DynamoDB prevents concurrent modifications
- Encryption at rest for sensitive data
- Team members can access shared state

## Additional Context

Popular remote backend options:
- **S3** - AWS native, use with DynamoDB for locking
- **GCS** - Google Cloud Storage with built-in locking
- **Azure Blob** - Azure native backend
- **Terraform Cloud** - Managed backend with additional features
- **Terramate Cloud** - GitOps-native state management

## References

- [Terraform Backend Configuration](https://developer.hashicorp.com/terraform/language/settings/backends/configuration)
- [S3 Backend](https://developer.hashicorp.com/terraform/language/settings/backends/s3)
