# catalyst-bundles

**Priority:** MEDIUM  
**Category:** Terramate Catalyst

## Why It Matters

Bundles compose multiple components into ready-to-use, deployable units. They abstract infrastructure complexity and enable developers to provision complete solutions without deep infrastructure knowledge.

## Incorrect

```hcl
# Developers manually compose components
# No standardization
# Missing dependencies
# Inconsistent patterns

# app-team/stack.tm.hcl
tm_bundle "database" {
  component = "rds-postgres"
  # ...
}

tm_bundle "cache" {
  component = "redis"
  # ...
}

tm_bundle "storage" {
  component = "s3-bucket"
  # ...
}

# Missing: VPC, networking, security groups
# Missing: Component dependencies
# Missing: Consistent configuration
```

**Problem:** Manual composition, missing dependencies, inconsistent patterns, developers need deep infrastructure knowledge.

## Correct

**Bundle definition:**

```hcl
# bundles/web-app/bundle.tm.hcl
bundle {
  name        = "web-app"
  description = "Complete web application infrastructure"
  
  component "networking" {
    source = "vpc"
    input = {
      cidr_block = "10.0.0.0/16"
    }
  }
  
  component "database" {
    source = "rds-postgres"
    input = {
      instance_class = "db.t3.micro"
      allocated_storage = 20
    }
    
    depends_on = ["networking"]
  }
  
  component "cache" {
    source = "redis"
    input = {
      node_type = "cache.t3.micro"
    }
    
    depends_on = ["networking"]
  }
  
  component "storage" {
    source = "s3-bucket"
    input = {
      name = "${bundle.name}-storage"
    }
  }
  
  component "compute" {
    source = "ecs-service"
    input = {
      cluster_name = "${bundle.name}-cluster"
      vpc_id       = component.networking.output.vpc_id
      subnet_ids   = component.networking.output.private_subnet_ids
    }
    
    depends_on = ["networking", "database", "cache"]
  }
}
```

**Bundle instantiation:**

```hcl
# stacks/prod-web-app/stack.tm.hcl
stack {
  name = "prod-web-app"
}

# Instantiate bundle
tm_bundle "web-app" {
  bundle = "web-app"
  
  input = {
    # Bundle-level overrides if needed
  }
}
```

**Benefits:**
- Complete solutions in one bundle
- Automatic dependency management
- Consistent patterns across teams
- Abstracted complexity
- Easy to instantiate
- Platform team maintains bundles

## Additional Context

Bundle composition:
- Combines multiple components
- Manages component dependencies
- Provides bundle-level configuration
- Supports component outputs as inputs

Bundle vs Component:
- **Component** - Single infrastructure resource/pattern
- **Bundle** - Multiple components composed together
- Use bundles for complete solutions
- Use components for individual resources

Converting existing Terraform modules to components:
- Run `terramate component create` inside an existing Terraform module directory
- This automatically generates the component structure from your module
- Converts module variables to component inputs
- Converts module outputs to component outputs
- Preserves existing Terraform code

## References

- [Terramate Catalyst Bundles](https://terramate.io/docs/catalyst/concepts/bundles/)
- [Instantiate Your First Bundle](https://terramate.io/docs/catalyst/tutorials/instantiate-your-first-bundle/)
- [Bundle Definition](https://terramate.io/docs/catalyst/reference/bundle-definition/)
