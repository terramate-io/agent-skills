# output-descriptions

**Priority:** MEDIUM  
**Category:** Variable & Output Patterns

## Why It Matters

Output descriptions document what data is available from a module and how to use it. They appear in generated documentation and help users understand module interfaces.

## Incorrect

```hcl
output "vpc_id" {
  value = aws_vpc.main.id
}

output "subnet_ids" {
  value = aws_subnet.private[*].id
}

output "endpoint" {
  value = aws_db_instance.main.endpoint
}
```

**Problem:** Users must read source code to understand what each output provides.

## Correct

```hcl
output "vpc_id" {
  value       = aws_vpc.main.id
  description = "The ID of the VPC"
}

output "subnet_ids" {
  value       = aws_subnet.private[*].id
  description = "List of private subnet IDs"
}

output "endpoint" {
  value       = aws_db_instance.main.endpoint
  description = "The connection endpoint in address:port format"
}
```

## Use Symmetrical Names

Keep output names consistent with upstream resources:

```hcl
# Good - matches aws_iam_user resource attribute names
output "user_arn" {
  value       = aws_iam_user.this.arn
  description = "The ARN of the IAM user"
}

output "user_name" {
  value       = aws_iam_user.this.name
  description = "The name of the IAM user"
}

output "user_unique_id" {
  value       = aws_iam_user.this.unique_id
  description = "The unique ID assigned by AWS"
}

# Bad - inconsistent naming
output "arn" {
  value = aws_iam_user.this.arn
}

output "username" {  # Doesn't match 'name' attribute
  value = aws_iam_user.this.name
}
```

## Export Full Resource Objects

For flexibility, export the entire resource alongside specific attributes:

```hcl
# Specific commonly-used outputs
output "instance_id" {
  value       = aws_instance.web.id
  description = "The ID of the EC2 instance"
}

output "instance_public_ip" {
  value       = aws_instance.web.public_ip
  description = "The public IP address of the instance"
}

# Full resource for advanced use cases
output "instance" {
  value       = aws_instance.web
  description = "All attributes of the EC2 instance. See https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance#attribute-reference"
}
```

## Document Complex Outputs

```hcl
output "load_balancer" {
  value = {
    arn      = aws_lb.main.arn
    dns_name = aws_lb.main.dns_name
    zone_id  = aws_lb.main.zone_id
  }
  description = <<-EOT
    Load balancer attributes:
    - arn: ARN of the load balancer
    - dns_name: DNS name for the load balancer
    - zone_id: Route 53 zone ID for alias records
  EOT
}

output "subnets" {
  value = {
    for k, v in aws_subnet.this : k => {
      id         = v.id
      arn        = v.arn
      cidr_block = v.cidr_block
    }
  }
  description = "Map of subnet objects keyed by subnet name"
}
```

## Use Snake Case

```hcl
# Correct - snake_case
output "security_group_id" {
  value       = aws_security_group.main.id
  description = "The ID of the security group"
}

# Incorrect - other conventions
output "securityGroupId" {    # camelCase
  value = aws_security_group.main.id
}

output "SecurityGroupID" {    # PascalCase
  value = aws_security_group.main.id
}
```

## References

- [Output Values](https://developer.hashicorp.com/terraform/language/values/outputs)
- [Terraform Style Guide](https://developer.hashicorp.com/terraform/language/style)
