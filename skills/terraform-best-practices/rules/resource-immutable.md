# resource-immutable

**Priority:** MEDIUM  
**Category:** Resource Organization

## Why It Matters

Immutable infrastructure replaces components rather than modifying them in-place. This makes deployments more predictable, rollbacks simpler, and eliminates configuration drift.

## Incorrect

```hcl
# Mutable instance - SSH in and modify
resource "aws_instance" "web" {
  ami           = "ami-12345678"
  instance_type = "t3.micro"
  
  # Deploy by SSHing in and running commands
  provisioner "remote-exec" {
    inline = [
      "apt-get update",
      "apt-get install -y nginx",
      "systemctl start nginx"
    ]
  }
}

# Configuration drift over time:
# - Manual hotfixes applied
# - Different packages installed
# - Unknown state
```

**Problems:**
- Configuration drift between instances
- Rollbacks require complex state management
- Difficult to reproduce issues
- "Works on my machine" but not in prod

## Correct

### Immutable with AMIs/Images

```hcl
# Build immutable image with Packer
# packer/web-server.pkr.hcl
source "amazon-ebs" "web" {
  ami_name      = "web-server-${timestamp()}"
  instance_type = "t3.micro"
  source_ami_filter {
    filters = {
      name = "ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"
    }
    owners      = ["099720109477"]
    most_recent = true
  }
  ssh_username = "ubuntu"
}

build {
  sources = ["source.amazon-ebs.web"]
  
  provisioner "shell" {
    inline = [
      "sudo apt-get update",
      "sudo apt-get install -y nginx",
      "sudo systemctl enable nginx"
    ]
  }
}
```

```hcl
# Deploy immutable image
data "aws_ami" "web" {
  most_recent = true
  owners      = ["self"]
  
  filter {
    name   = "name"
    values = ["web-server-*"]
  }
}

resource "aws_launch_template" "web" {
  name_prefix   = "web-"
  image_id      = data.aws_ami.web.id
  instance_type = "t3.micro"
  
  # No provisioners - image is already configured
}

resource "aws_autoscaling_group" "web" {
  desired_capacity = 3
  max_size         = 6
  min_size         = 3
  
  launch_template {
    id      = aws_launch_template.web.id
    version = "$Latest"
  }
  
  # Rolling update - replace instances with new image
  instance_refresh {
    strategy = "Rolling"
    preferences {
      min_healthy_percentage = 50
    }
  }
}
```

### Immutable with Containers

```hcl
# Build and push container image
resource "null_resource" "docker_build" {
  triggers = {
    dockerfile_hash = filemd5("${path.module}/Dockerfile")
    app_hash        = filemd5("${path.module}/app.py")
  }
  
  provisioner "local-exec" {
    command = <<-EOT
      docker build -t ${var.ecr_repo}:${var.app_version} .
      docker push ${var.ecr_repo}:${var.app_version}
    EOT
  }
}

# Deploy immutable container
resource "aws_ecs_task_definition" "app" {
  family = "app"
  
  container_definitions = jsonencode([{
    name  = "app"
    image = "${var.ecr_repo}:${var.app_version}"  # Specific version, not :latest
    # ...
  }])
}

resource "aws_ecs_service" "app" {
  name            = "app"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = 3
  
  deployment_configuration {
    maximum_percent         = 200
    minimum_healthy_percent = 50
  }
}
```

### Blue-Green Deployments

```hcl
variable "active_color" {
  description = "Currently active deployment (blue or green)"
  default     = "blue"
}

resource "aws_launch_template" "blue" {
  name_prefix = "blue-"
  image_id    = var.blue_ami_id
  # ...
}

resource "aws_launch_template" "green" {
  name_prefix = "green-"
  image_id    = var.green_ami_id
  # ...
}

resource "aws_lb_target_group" "blue" {
  name = "blue-tg"
  # ...
}

resource "aws_lb_target_group" "green" {
  name = "green-tg"
  # ...
}

# Switch traffic by changing active color
resource "aws_lb_listener_rule" "app" {
  listener_arn = aws_lb_listener.front_end.arn
  
  action {
    type             = "forward"
    target_group_arn = var.active_color == "blue" ? aws_lb_target_group.blue.arn : aws_lb_target_group.green.arn
  }
  
  condition {
    path_pattern {
      values = ["/*"]
    }
  }
}
```

### Lifecycle Rules for Immutability

```hcl
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.micro"
  
  lifecycle {
    # Create new instance before destroying old one
    create_before_destroy = true
    
    # Force replacement when AMI changes
    replace_triggered_by = [
      null_resource.ami_version
    ]
  }
}

# Trigger replacement on version change
resource "null_resource" "ami_version" {
  triggers = {
    ami_id = var.ami_id
  }
}
```

### When Mutable is Acceptable

Some resources are inherently stateful:

```hcl
# Databases - use lifecycle rules, not replacement
resource "aws_db_instance" "main" {
  identifier = "mydb"
  # ...
  
  lifecycle {
    prevent_destroy = true  # Don't accidentally delete
    ignore_changes  = [password]  # Manage outside Terraform
  }
}

# Use snapshots for "immutable-like" database updates
resource "aws_db_instance" "main" {
  snapshot_identifier = var.restore_from_snapshot  # Deploy from snapshot
}
```

## Immutability Spectrum

| Level | Description | Example |
|-------|-------------|---------|
| Fully mutable | Modify in place | SSH and edit configs |
| Config management | Automated in-place updates | Ansible/Chef runs |
| Immutable images | Replace, don't modify | AMIs, Docker images |
| Immutable infra | Replace entire stacks | Blue-green, canary |

## References

- [HashiCorp Packer](https://developer.hashicorp.com/packer)
- [Immutable Infrastructure](https://www.hashicorp.com/resources/what-is-mutable-vs-immutable-infrastructure)
- [Blue-Green Deployments](https://martinfowler.com/bliki/BlueGreenDeployment.html)
