#!/usr/bin/env node

/**
 * Build script for terramate-best-practices skill
 * Compiles individual rule files into AGENTS.md
 */

const path = require('path');
const { buildAgentsMd } = require('../../shared-build-utils');

const SKILL_DIR = path.join(__dirname, '../../../skills/terramate-best-practices');

buildAgentsMd({
  skillName: 'terramate-best-practices',
  skillDir: SKILL_DIR,
  title: 'Terramate Best Practices - Full Reference',
  description: 'Comprehensive guide for Terramate CLI, Cloud, and Catalyst, maintained by Terramate.'
});
