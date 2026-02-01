#!/usr/bin/env node

/**
 * Build script for terraform-best-practices skill
 * Compiles individual rule files into AGENTS.md
 */

const path = require('path');
const { buildAgentsMd } = require('../../shared-build-utils');

const SKILL_DIR = path.join(__dirname, '../../../skills/terraform-best-practices');

buildAgentsMd({
  skillName: 'terraform-best-practices',
  skillDir: SKILL_DIR,
  title: 'Terraform Best Practices - Full Reference',
  description: 'Comprehensive optimization guide for Terraform and Infrastructure as Code, maintained by Terramate.'
});
