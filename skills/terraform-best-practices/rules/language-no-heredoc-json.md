# language-no-heredoc-json

**Priority:** MEDIUM  
**Category:** Language Best Practices

## Why It Matters

HEREDOC strings for JSON, YAML, and IAM policies are error-prone, hard to validate, and don't benefit from Terraform's type checking. Use native functions and resources instead.

## Incorrect

```hcl
resource "aws_iam_role_policy" "lambda" {
  name = "lambda-policy"
  role = aws_iam_role.lambda.id

  # HEREDOC JSON - hard to maintain, no validation
  policy = <<-EOF
    {
      "Version": "2012-10-17",
      "Statement": [
        {
          "Effect": "Allow",
          "Action": [
            "s3:GetObject",
            "s3:PutObject"
          ],
          "Resource": "arn:aws:s3:::${var.bucket_name}/*"
        }
      ]
    }
  EOF
}

resource "kubernetes_config_map" "config" {
  metadata {
    name = "app-config"
  }

  # HEREDOC YAML - interpolation issues, no validation
  data = {
    "config.yaml" = <<-EOF
      database:
        host: ${var.db_host}
        port: 5432
      logging:
        level: info
    EOF
  }
}
```

**Problems:**
- No syntax validation until apply
- Difficult to maintain complex structures
- Interpolation can break JSON/YAML syntax
- No IDE support for structure

## Correct

### Use jsonencode() for JSON

```hcl
resource "aws_iam_role_policy" "lambda" {
  name = "lambda-policy"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject"
        ]
        Resource = "arn:aws:s3:::${var.bucket_name}/*"
      }
    ]
  })
}
```

### Use IAM Policy Document Resource

```hcl
data "aws_iam_policy_document" "lambda" {
  statement {
    effect = "Allow"
    actions = [
      "s3:GetObject",
      "s3:PutObject"
    ]
    resources = ["arn:aws:s3:::${var.bucket_name}/*"]
  }

  statement {
    effect = "Allow"
    actions = [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents"
    ]
    resources = ["arn:aws:logs:*:*:*"]
  }
}

resource "aws_iam_role_policy" "lambda" {
  name   = "lambda-policy"
  role   = aws_iam_role.lambda.id
  policy = data.aws_iam_policy_document.lambda.json
}
```

### Use yamlencode() for YAML

```hcl
resource "kubernetes_config_map" "config" {
  metadata {
    name = "app-config"
  }

  data = {
    "config.yaml" = yamlencode({
      database = {
        host = var.db_host
        port = 5432
      }
      logging = {
        level = "info"
      }
    })
  }
}
```

### Use templatefile() for Complex Templates

```hcl
# templates/user-data.sh
#!/bin/bash
echo "Environment: ${environment}"
echo "Region: ${region}"
apt-get update && apt-get install -y ${packages}

# main.tf
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = var.instance_type

  user_data = templatefile("${path.module}/templates/user-data.sh", {
    environment = var.environment
    region      = var.region
    packages    = join(" ", var.packages)
  })
}
```

## When HEREDOC is Acceptable

Use indented HEREDOC (`<<-EOT`) for:
- Plain text descriptions
- Shell scripts (when templatefile is overkill)
- Multi-line strings without structure

```hcl
resource "aws_sns_topic" "alerts" {
  name = "alerts"
}

output "usage_instructions" {
  value = <<-EOT
    To subscribe to alerts:
    1. Go to the AWS Console
    2. Navigate to SNS
    3. Subscribe to topic: ${aws_sns_topic.alerts.arn}
  EOT
  description = "Instructions for subscribing to alerts"
}
```

## References

- [jsonencode Function](https://developer.hashicorp.com/terraform/language/functions/jsonencode)
- [yamlencode Function](https://developer.hashicorp.com/terraform/language/functions/yamlencode)
- [templatefile Function](https://developer.hashicorp.com/terraform/language/functions/templatefile)
- [aws_iam_policy_document](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document)
