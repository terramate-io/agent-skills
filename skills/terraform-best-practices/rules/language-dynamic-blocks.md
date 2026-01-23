# language-dynamic-blocks

**Priority:** MEDIUM  
**Category:** Language Best Practices

## Why It Matters

Dynamic blocks generate repeated nested blocks based on variables, eliminating code duplication and enabling flexible configurations. They're essential for DRY (Don't Repeat Yourself) Terraform code.

## Incorrect

```hcl
# Hardcoded ingress rules - not flexible
resource "aws_security_group" "web" {
  name = "web-sg"

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/8"]
  }

  # Adding new rules requires changing the resource
}
```

**Problems:**
- Adding rules requires code changes
- Can't vary rules by environment
- Code duplication
- Not reusable

## Correct

### Basic Dynamic Block

```hcl
variable "ingress_rules" {
  type = list(object({
    port        = number
    protocol    = string
    cidr_blocks = list(string)
    description = string
  }))
  default = [
    {
      port        = 80
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
      description = "HTTP"
    },
    {
      port        = 443
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
      description = "HTTPS"
    }
  ]
}

resource "aws_security_group" "web" {
  name        = "web-sg"
  description = "Web server security group"
  vpc_id      = var.vpc_id

  dynamic "ingress" {
    for_each = var.ingress_rules
    content {
      from_port   = ingress.value.port
      to_port     = ingress.value.port
      protocol    = ingress.value.protocol
      cidr_blocks = ingress.value.cidr_blocks
      description = ingress.value.description
    }
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

### Conditional Dynamic Blocks

```hcl
variable "enable_https" {
  type    = bool
  default = true
}

variable "allowed_ssh_cidrs" {
  type    = list(string)
  default = []  # Empty = no SSH access
}

resource "aws_security_group" "web" {
  name   = "web-sg"
  vpc_id = var.vpc_id

  # Always allow HTTP
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Conditionally allow HTTPS
  dynamic "ingress" {
    for_each = var.enable_https ? [1] : []
    content {
      from_port   = 443
      to_port     = 443
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
    }
  }

  # Conditionally allow SSH (only if CIDRs provided)
  dynamic "ingress" {
    for_each = length(var.allowed_ssh_cidrs) > 0 ? [1] : []
    content {
      from_port   = 22
      to_port     = 22
      protocol    = "tcp"
      cidr_blocks = var.allowed_ssh_cidrs
    }
  }
}
```

### Dynamic Blocks with Maps

```hcl
variable "ingress_rules" {
  type = map(object({
    port        = number
    protocol    = string
    cidr_blocks = list(string)
  }))
  default = {
    http = {
      port        = 80
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
    }
    https = {
      port        = 443
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
    }
  }
}

resource "aws_security_group" "web" {
  name   = "web-sg"
  vpc_id = var.vpc_id

  dynamic "ingress" {
    for_each = var.ingress_rules
    content {
      from_port   = ingress.value.port
      to_port     = ingress.value.port
      protocol    = ingress.value.protocol
      cidr_blocks = ingress.value.cidr_blocks
      description = ingress.key  # Use map key as description
    }
  }
}
```

### Nested Dynamic Blocks

```hcl
variable "load_balancer_config" {
  type = object({
    listeners = list(object({
      port     = number
      protocol = string
      actions = list(object({
        type             = string
        target_group_arn = string
      }))
    }))
  })
}

resource "aws_lb_listener" "main" {
  for_each = { for l in var.load_balancer_config.listeners : l.port => l }

  load_balancer_arn = aws_lb.main.arn
  port              = each.value.port
  protocol          = each.value.protocol

  dynamic "default_action" {
    for_each = each.value.actions
    content {
      type             = default_action.value.type
      target_group_arn = default_action.value.target_group_arn
    }
  }
}
```

### Dynamic Blocks for Settings

```hcl
variable "enable_encryption" {
  type    = bool
  default = true
}

variable "kms_key_id" {
  type    = string
  default = null
}

resource "aws_db_instance" "main" {
  identifier     = "mydb"
  engine         = "postgres"
  instance_class = "db.t3.micro"

  # Conditional encryption block
  dynamic "restore_to_point_in_time" {
    for_each = var.restore_from_snapshot != null ? [1] : []
    content {
      source_db_instance_identifier = var.restore_from_snapshot
      restore_time                  = var.restore_time
    }
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "main" {
  bucket = aws_s3_bucket.main.id

  dynamic "rule" {
    for_each = var.enable_encryption ? [1] : []
    content {
      apply_server_side_encryption_by_default {
        sse_algorithm     = var.kms_key_id != null ? "aws:kms" : "AES256"
        kms_master_key_id = var.kms_key_id
      }
    }
  }
}
```

### ECS Container Definitions

```hcl
variable "containers" {
  type = list(object({
    name   = string
    image  = string
    cpu    = number
    memory = number
    ports  = list(number)
    env    = map(string)
  }))
}

resource "aws_ecs_task_definition" "app" {
  family                   = "app"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 256
  memory                   = 512

  container_definitions = jsonencode([
    for container in var.containers : {
      name      = container.name
      image     = container.image
      cpu       = container.cpu
      memory    = container.memory
      essential = true
      
      portMappings = [
        for port in container.ports : {
          containerPort = port
          protocol      = "tcp"
        }
      ]
      
      environment = [
        for key, value in container.env : {
          name  = key
          value = value
        }
      ]
    }
  ])
}
```

## When Not to Use Dynamic Blocks

```hcl
# If you only have 1-2 static blocks, just write them out
# Dynamic blocks add complexity - use only when needed

resource "aws_security_group" "simple" {
  name = "simple-sg"

  # Just two rules? Write them explicitly
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

## References

- [Dynamic Blocks](https://developer.hashicorp.com/terraform/language/expressions/dynamic-blocks)
- [for_each Meta-Argument](https://developer.hashicorp.com/terraform/language/meta-arguments/for_each)
