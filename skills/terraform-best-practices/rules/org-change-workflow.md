# org-change-workflow

**Priority:** HIGH  
**Category:** Organization & Workflow

## Why It Matters

A formal change workflow minimizes disruption, enables rollbacks, prevents conflicts, and creates audit trails. Changes to infrastructure should follow a predictable, reviewable process.

## Incorrect

```bash
# Cowboy workflow
cd terraform/
vim main.tf
terraform apply -auto-approve
# Hope it works!
```

**Problems:**
- No review before changes
- No record of what changed
- Can't roll back easily
- Conflicts between team members

## Correct

### Standard Change Workflow

```
1. Create branch
2. Make changes
3. Run terraform plan
4. Create pull request
5. Review plan output
6. Approve and merge
7. Apply changes (automated or manual)
8. Verify deployment
```

### Branch-Based Workflow

```bash
# 1. Create feature branch
git checkout -b feature/add-redis-cache

# 2. Make changes
vim main.tf

# 3. Format and validate
terraform fmt
terraform validate

# 4. Generate plan
terraform plan -out=tfplan

# 5. Commit and push
git add .
git commit -m "Add Redis cache for session storage"
git push origin feature/add-redis-cache

# 6. Create PR with plan output
# 7. Get review and approval
# 8. Merge to main
# 9. Apply in CI/CD or manually
```

### Pull Request Template

```markdown
<!-- .github/pull_request_template.md -->
## Description
<!-- What infrastructure changes does this PR make? -->

## Motivation
<!-- Why are these changes needed? -->

## Terraform Plan
<details>
<summary>Click to expand plan output</summary>

```
<!-- Paste terraform plan output here -->
```

</details>

## Checklist
- [ ] `terraform fmt` has been run
- [ ] `terraform validate` passes
- [ ] Plan output has been reviewed
- [ ] No secrets in code
- [ ] Documentation updated (if needed)
- [ ] Tested in dev environment first

## Rollback Plan
<!-- How to revert if something goes wrong -->
```

### CI/CD Pipeline

#### GitHub Actions - Comprehensive Workflow

```yaml
# .github/workflows/terraform.yml
name: Terraform

on:
  pull_request:
    paths: ['**.tf', '**.tfvars', '.github/workflows/terraform.yml']
  push:
    branches: [main]
    paths: ['**.tf', '**.tfvars']

env:
  TF_VERSION: 1.6.0
  AWS_REGION: us-east-1

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: ${{ env.TF_VERSION }}
      
      - name: Terraform Format Check
        run: terraform fmt -check -recursive -diff
        
      - name: Terraform Init
        run: terraform init -backend=false
        
      - name: Terraform Validate
        run: terraform validate

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Run tfsec
        uses: aquasecurity/tfsec-action@v1.0.0
        with:
          soft_fail: false
      
      - name: Run Checkov
        uses: bridgecrewio/checkov-action@master
        with:
          directory: .
          framework: terraform
          soft_fail: false
      
      - name: Run Trivy
        uses: aquasecurity/trivy-action@master
        with:
          scan_type: 'config'
          scan_ref: '.'
          format: 'sarif'
          output: 'trivy-results.sarif'
      
      - name: Upload Trivy results
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: 'trivy-results.sarif'

  cost-estimation:
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    steps:
      - uses: actions/checkout@v4
      
      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: ${{ env.TF_VERSION }}
      
      - name: Terraform Init
        run: terraform init -backend=false
      
      - name: Terraform Plan
        run: terraform plan -out=tfplan
        continue-on-error: true
      
      - name: Infracost Breakdown
        uses: infracost/actions/comment@v3
        with:
          path: tfplan
          terraform_plan_flags: -var-file=dev.tfvars
          github_token: ${{ github.token }}
          behavior: update

  plan:
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    needs: [validate, security]
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      
      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: ${{ env.TF_VERSION }}
          terraform_wrapper: false
      
      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: ${{ env.AWS_REGION }}
      
      - name: Terraform Init
        run: terraform init
      
      - name: Terraform Plan
        id: plan
        run: terraform plan -no-color -out=tfplan
        continue-on-error: true
      
      - name: Convert Plan to JSON
        if: steps.plan.outcome == 'success'
        run: terraform show -json tfplan > tfplan.json
      
      - name: Policy Check with Conftest
        if: steps.plan.outcome == 'success'
        uses: instrumenta/conftest-action@v0.1.0
        with:
          files: tfplan.json
          policy: policy/
          fail-on-warn: true
      
      - name: Comment Plan on PR
        if: steps.plan.outcome == 'success'
        uses: actions/github-script@v7
        with:
          script: |
            const output = `#### Terraform Plan 📖
            \`\`\`
            ${process.env.PLAN}
            \`\`\`
            
            *Pusher: @${{ github.actor }}, Action: \`${{ github.event_name }}\`, Working Directory: \`${{ env.tf_actions_working_dir }}\`, Workflow: \`${{ github.workflow }}\`*`;
            
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: output
            })
          env:
            PLAN: ${{ steps.plan.outputs.stdout }}
            
  apply:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    needs: [validate, security]
    environment: 
      name: production
      url: https://app.terraform.io/app/${{ secrets.TF_ORG }}/workspaces/${{ secrets.TF_WORKSPACE }}
    steps:
      - uses: actions/checkout@v4
      
      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: ${{ env.TF_VERSION }}
          terraform_wrapper: false
      
      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: ${{ env.AWS_REGION }}
      
      - name: Terraform Init
        run: terraform init
      
      - name: Terraform Apply
        run: terraform apply -auto-approve
      
      - name: Terraform Output
        if: success()
        run: terraform output -json > outputs.json
      
      - name: Upload Outputs
        if: success()
        uses: actions/upload-artifact@v3
        with:
          name: terraform-outputs
          path: outputs.json
```

#### GitLab CI - Comprehensive Workflow

```yaml
# .gitlab-ci.yml
stages:
  - validate
  - security
  - plan
  - apply

variables:
  TF_ROOT: ${CI_PROJECT_DIR}
  TF_ADDRESS: ${CI_API_V4_URL}/projects/${CI_PROJECT_ID}/terraform/state/${CI_COMMIT_REF_NAME}

validate:
  stage: validate
  image: hashicorp/terraform:1.6.0
  before_script:
    - cd ${TF_ROOT}
  script:
    - terraform init -backend=false
    - terraform validate
    - terraform fmt -check -recursive
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"

security:
  stage: security
  image: alpine:latest
  before_script:
    - apk add --no-cache curl
    - curl -sSL https://github.com/aquasecurity/tfsec/releases/download/v1.28.0/tfsec-linux-amd64 -o /usr/local/bin/tfsec
    - chmod +x /usr/local/bin/tfsec
  script:
    - tfsec ${TF_ROOT}
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"

plan:
  stage: plan
  image: hashicorp/terraform:1.6.0
  before_script:
    - cd ${TF_ROOT}
    - terraform init
  script:
    - terraform plan -out=plan.cache
    - terraform show -json plan.cache > plan.json
  artifacts:
    paths:
      - ${TF_ROOT}/plan.cache
      - ${TF_ROOT}/plan.json
    reports:
      terraform: ${TF_ROOT}/plan.json
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"

apply:
  stage: apply
  image: hashicorp/terraform:1.6.0
  before_script:
    - cd ${TF_ROOT}
    - terraform init
  script:
    - terraform apply plan.cache
  dependencies:
    - plan
  when: manual
  only:
    - main
  environment:
    name: production
```

#### Atlantis Integration

```yaml
# atlantis.yaml
version: 3
projects:
  - name: infrastructure
    dir: infrastructure
    workflow: terraform
    autoplan:
      when_modified: ["*.tf", "*.tfvars"]
      enabled: true
    apply_requirements: [approved, mergeable]
    workflow: terraform

workflows:
  terraform:
    plan:
      steps:
        - init
        - plan:
            extra_args: ["-var-file=dev.tfvars"]
        - run: |
            terraform show -json plan.json > plan.json
            checkov -f plan.json
    apply:
      steps:
        - init
        - apply
```

#### Cost Estimation with Infracost

```yaml
# .github/workflows/infracost.yml
name: Infracost

on:
  pull_request:
    paths: ['**.tf']

jobs:
  infracost:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: hashicorp/setup-terraform@v3
      
      - name: Terraform Plan
        run: terraform plan -out=tfplan
      
      - name: Infracost Comment
        uses: infracost/actions/comment@v3
        with:
          path: tfplan
          github_token: ${{ github.token }}
          behavior: update
          show_project_name: true
```

### Environment Promotion

```
┌─────────┐     ┌─────────┐     ┌─────────┐
│   Dev   │────▶│ Staging │────▶│  Prod   │
└─────────┘     └─────────┘     └─────────┘
     │               │               │
  Auto-apply    Auto-apply    Manual approval
     │               │               │
  Feature        Main branch   Tagged release
  branches       merge           or approval
```

### Makefile for Consistency

```makefile
.PHONY: init plan apply destroy

ENV ?= dev

init:
	terraform init

plan:
	terraform plan -var-file=$(ENV).tfvars -out=tfplan

apply:
	terraform apply tfplan

destroy:
	terraform destroy -var-file=$(ENV).tfvars

# Usage: make plan ENV=prod
```

### Change Documentation

```hcl
# Document significant changes in code
# CHANGELOG: 2024-01-15 - Added read replica for reporting
# Ticket: INFRA-1234
# Author: @engineer

resource "aws_db_instance" "read_replica" {
  # ...
}
```

### Rollback Strategy

```bash
# Option 1: Revert the commit
git revert HEAD
git push
# CI/CD applies the reverted state

# Option 2: Apply previous state
terraform apply -target=aws_instance.web -var="ami_id=ami-previous"

# Option 3: Use state to restore
terraform state pull > backup.tfstate
# Restore from backup if needed
```

## Four Levels of Maturity

| Level | Practice |
|-------|----------|
| Manual | Changes via console/CLI, no tracking |
| Semi-automated | Some IaC, inconsistent processes |
| Infrastructure as Code | All changes via Terraform, VCS, reviews |
| Collaborative IaC | Delegation, access control, automated promotion |

## References

- [HashiCorp Change Workflow](https://developer.hashicorp.com/terraform/cloud-docs/recommended-practices/part2#your-current-change-control-workflow)
- [GitOps Principles](https://opengitops.dev/)
