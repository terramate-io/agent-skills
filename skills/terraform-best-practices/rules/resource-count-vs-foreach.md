# resource-count-vs-foreach

**Priority:** MEDIUM-HIGH  
**Category:** Resource Organization

## Why It Matters

Using `count` with lists causes resources to be identified by index. Removing an item from the middle of the list destroys and recreates downstream resources. `for_each` uses stable keys that survive list modifications.

## Incorrect

```hcl
variable "subnet_cidrs" {
  default = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

resource "aws_subnet" "subnets" {
  count      = length(var.subnet_cidrs)
  vpc_id     = aws_vpc.main.id
  cidr_block = var.subnet_cidrs[count.index]
  
  tags = {
    Name = "subnet-${count.index}"
  }
}
```

**Problem:** If you remove `"10.0.2.0/24"` from the middle:
- `subnet[1]` (was 10.0.2.0/24) becomes 10.0.3.0/24
- `subnet[2]` (was 10.0.3.0/24) is destroyed
- Resources in subnet[1] are disrupted

## Correct

```hcl
variable "subnets" {
  default = {
    "public-a"  = "10.0.1.0/24"
    "public-b"  = "10.0.2.0/24"
    "public-c"  = "10.0.3.0/24"
  }
}

resource "aws_subnet" "subnets" {
  for_each   = var.subnets
  vpc_id     = aws_vpc.main.id
  cidr_block = each.value
  
  tags = {
    Name = each.key
  }
}

# Reference specific subnet
output "public_a_id" {
  value = aws_subnet.subnets["public-a"].id
}
```

## Converting List to Map

```hcl
variable "availability_zones" {
  default = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

resource "aws_subnet" "subnets" {
  for_each = toset(var.availability_zones)
  
  vpc_id            = aws_vpc.main.id
  availability_zone = each.value
  cidr_block        = cidrsubnet(aws_vpc.main.cidr_block, 8, index(var.availability_zones, each.value))
  
  tags = {
    Name = "subnet-${each.value}"
  }
}
```

## When to Use Count

`count` is still appropriate for:

```hcl
# Boolean conditional - create or not
resource "aws_eip" "nat" {
  count = var.enable_nat_gateway ? 1 : 0
  
  domain = "vpc"
}

# Fixed number of identical resources
resource "aws_nat_gateway" "gw" {
  count = var.nat_gateway_count  # e.g., 3
  
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id
}
```

## Quick Reference

| Use Case | Use |
|----------|-----|
| Create 0 or 1 resource | `count` |
| Fixed number of identical resources | `count` |
| Resources identified by name/key | `for_each` |
| List that may have items removed | `for_each` with `toset()` |

## References

- [for_each](https://developer.hashicorp.com/terraform/language/meta-arguments/for_each)
- [count](https://developer.hashicorp.com/terraform/language/meta-arguments/count)
