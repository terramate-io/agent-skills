#!/usr/bin/env node

/**
 * Validation script for terramate-best-practices skill
 * Checks rule file structure and content
 */

const path = require('path');
const { validateSkillFile, validateRules } = require('../../shared-build-utils');

const SKILL_DIR = path.join(__dirname, '../../../skills/terramate-best-practices');
const RULES_DIR = path.join(SKILL_DIR, 'rules');
const SKILL_FILE = path.join(SKILL_DIR, 'SKILL.md');

const REQUIRED_SECTIONS = [
  '## Why It Matters',
  '## Incorrect',
  '## Correct',
  '## References'
];

const VALID_PREFIXES = [
  'cli-',
  'cli-orchestration-',
  'cli-codegen-',
  'cli-config-',
  'cloud-',
  'catalyst-',
  'cicd-',
  'advanced-'
];

const VALID_PRIORITIES = [
  'CRITICAL',
  'HIGH',
  'MEDIUM-HIGH',
  'MEDIUM',
  'LOW-MEDIUM',
  'LOW'
];

const CODE_EXAMPLE_LANGUAGES = ['hcl', 'bash', 'yaml'];

function main() {
  console.log('Terramate Best Practices Skill Validator\n');

  const skillValid = validateSkillFile(SKILL_FILE);
  const rulesValid = validateRules({
    rulesDir: RULES_DIR,
    validPrefixes: VALID_PREFIXES,
    validPriorities: VALID_PRIORITIES,
    requiredSections: REQUIRED_SECTIONS,
    codeExampleLanguages: CODE_EXAMPLE_LANGUAGES
  });

  console.log('\n---');

  if (skillValid && rulesValid) {
    console.log('All validations passed!');
    process.exit(0);
  } else {
    console.error('Validation failed!');
    process.exit(1);
  }
}

main();
