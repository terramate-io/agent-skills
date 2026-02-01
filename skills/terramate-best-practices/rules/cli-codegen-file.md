# cli-codegen-file

**Priority:** HIGH  
**Category:** CLI Code Generation

## Why It Matters

File generation creates non-HCL files (JSON, YAML, scripts) from templates, enabling consistent configuration across stacks and integration with other tools.

## Incorrect

```bash
# Manual file creation in each stack
# stacks/app1/kubernetes.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app1-config
data:
  environment: prod
  region: us-east-1

# stacks/app2/kubernetes.yaml - Copy-pasted!
apiVersion: v1
kind: ConfigMap
metadata:
  name: app2-config
data:
  environment: prod
  region: us-east-1
```

**Problem:** Manual file creation, copy-paste errors, inconsistent configurations, hard to maintain.

## Correct

```hcl
# terramate.tm.hcl - Generate Kubernetes manifests
generate_file "kubernetes.yaml" {
  content = yamlencode({
    apiVersion = "v1"
    kind       = "ConfigMap"
    metadata = {
      name = "${tm_metadata("stack", "name")}-config"
    }
    data = {
      environment = global.environment
      region      = global.aws_region
      stack_name  = tm_metadata("stack", "name")
    }
  })
}
```

**Using template files:**

```hcl
# templates/kubernetes-configmap.yaml.tmpl
apiVersion: v1
kind: ConfigMap
metadata:
  name: ${stack_name}-config
data:
  environment: ${environment}
  region: ${region}

# terramate.tm.hcl
generate_file "kubernetes.yaml" {
  content = tm_file("${terramate.root.path.fs.absolute}/templates/kubernetes-configmap.yaml.tmpl", {
    stack_name  = tm_metadata("stack", "name")
    environment = global.environment
    region      = global.aws_region
  })
}
```

**Benefits:**
- Consistent file generation across stacks
- Template-based approach (DRY)
- Supports any file format (YAML, JSON, scripts)
- Dynamic values via globals and metadata
- Easy to update templates

## Additional Context

File generation:
- Use `generate_file` for any file type
- Content can be strings, HCL, or template files
- Supports Terramate functions
- Generated files in `.terramate/cache/`

Common use cases:
- Kubernetes manifests
- CI/CD configuration files
- Scripts and automation
- Documentation files

## References

- [Generate Files](https://terramate.io/docs/cli/code-generation/generate-files/)
- [Template Functions](https://terramate.io/docs/cli/reference/functions/)
