# security-iam-least-privilege

**Priority:** CRITICAL  
**Category:** Security Best Practices

## Why It Matters

Overly permissive IAM policies increase blast radius when credentials are compromised. Always grant the minimum permissions required for a resource to function.

## Incorrect

```hcl
resource "aws_iam_role_policy" "lambda_policy" {
  name = "lambda-policy"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = "*"
        Resource = "*"
      }
    ]
  })
}
```

**Problem:** Lambda has full access to all AWS services. A compromise gives attacker complete control.

## Correct

```hcl
resource "aws_iam_role_policy" "lambda_policy" {
  name = "lambda-policy"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "ReadFromS3Bucket"
        Effect   = "Allow"
        Action   = [
          "s3:GetObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.data.arn,
          "${aws_s3_bucket.data.arn}/*"
        ]
      },
      {
        Sid      = "WriteToSQSQueue"
        Effect   = "Allow"
        Action   = [
          "sqs:SendMessage"
        ]
        Resource = aws_sqs_queue.notifications.arn
      },
      {
        Sid      = "WriteLogs"
        Effect   = "Allow"
        Action   = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:log-group:/aws/lambda/${var.function_name}:*"
      }
    ]
  })
}
```

## Best Practices

1. **Specific actions** - List exact API actions needed
2. **Specific resources** - Reference exact ARNs, not wildcards
3. **Use conditions** - Add conditions where applicable
4. **Separate statements** - Group by purpose with Sid
5. **Regular audits** - Review permissions periodically

## Using Data Sources for ARNs

```hcl
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

locals {
  account_id = data.aws_caller_identity.current.account_id
  region     = data.aws_region.current.name
}

resource "aws_iam_role_policy" "specific_policy" {
  policy = jsonencode({
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["dynamodb:GetItem", "dynamodb:PutItem"]
        Resource = "arn:aws:dynamodb:${local.region}:${local.account_id}:table/${var.table_name}"
      }
    ]
  })
}
```

## References

- [IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
- [IAM Policy Simulator](https://policysim.aws.amazon.com/)
