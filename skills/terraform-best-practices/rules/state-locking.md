# state-locking

**Priority:** CRITICAL  
**Category:** State Management

## Why It Matters

Without state locking, concurrent Terraform operations can corrupt state or cause race conditions. Always enable locking to prevent multiple users or CI jobs from modifying state simultaneously.

## Incorrect

```hcl
terraform {
  backend "s3" {
    bucket = "my-terraform-state"
    key    = "prod/terraform.tfstate"
    region = "us-east-1"
    # No DynamoDB table for locking
  }
}
```

**Problem:** Two engineers running `terraform apply` simultaneously can corrupt state.

## Correct

```hcl
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"
  }
}
```

**For GCS:**

```hcl
terraform {
  backend "gcs" {
    bucket = "my-terraform-state"
    prefix = "prod"
    # GCS has built-in locking, no additional config needed
  }
}
```

## Creating the Lock Table

```hcl
resource "aws_dynamodb_table" "terraform_locks" {
  name         = "terraform-locks"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  tags = {
    Purpose = "Terraform state locking"
  }
}
```

## References

- [State Locking](https://developer.hashicorp.com/terraform/language/state/locking)
