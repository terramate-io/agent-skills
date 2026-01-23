#!/usr/bin/env node

/**
 * Validation script for terraform-best-practices skill
 * Checks rule file structure and content
 */

const fs = require('fs');
const path = require('path');

const SKILL_DIR = path.join(__dirname, '../../../skills/terraform-best-practices');
const RULES_DIR = path.join(SKILL_DIR, 'rules');
const SKILL_FILE = path.join(SKILL_DIR, 'SKILL.md');

const REQUIRED_SECTIONS = [
  '## Why It Matters',
  '## Incorrect',
  '## Correct',
  '## References'
];

const VALID_PREFIXES = [
  'org-',
  'state-',
  'security-',
  'module-',
  'resource-',
  'variable-',
  'output-',
  'language-',
  'provider-',
  'perf-',
  'test-'
];

const VALID_PRIORITIES = [
  'CRITICAL',
  'HIGH',
  'MEDIUM-HIGH',
  'MEDIUM',
  'LOW-MEDIUM',
  'LOW'
];

function validateSkillFile() {
  console.log('Validating SKILL.md...');
  
  if (!fs.existsSync(SKILL_FILE)) {
    console.error('ERROR: SKILL.md not found');
    return false;
  }
  
  const content = fs.readFileSync(SKILL_FILE, 'utf-8');
  
  // Check frontmatter
  if (!content.startsWith('---')) {
    console.error('ERROR: SKILL.md missing frontmatter');
    return false;
  }
  
  console.log('✓ SKILL.md valid');
  return true;
}

function validateRuleFile(filename) {
  const filepath = path.join(RULES_DIR, filename);
  const content = fs.readFileSync(filepath, 'utf-8');
  const lines = content.split('\n');
  const errors = [];
  
  const ruleName = filename.replace('.md', '');
  
  // Check prefix
  const hasValidPrefix = VALID_PREFIXES.some(prefix => filename.startsWith(prefix));
  if (!hasValidPrefix) {
    errors.push(`Invalid prefix. Must start with: ${VALID_PREFIXES.join(', ')}`);
  }
  
  // Check title matches filename
  const expectedTitle = `# ${ruleName}`;
  if (!lines[0] || lines[0].trim() !== expectedTitle) {
    errors.push(`Title should be "${expectedTitle}", got "${lines[0]}"`);
  }
  
  // Check for Priority line
  const priorityLine = lines.find(l => l.startsWith('**Priority:**'));
  if (!priorityLine) {
    errors.push('Missing **Priority:** line');
  } else {
    const priority = priorityLine.replace('**Priority:**', '').trim();
    if (!VALID_PRIORITIES.some(p => priority.startsWith(p))) {
      errors.push(`Invalid priority "${priority}". Must be one of: ${VALID_PRIORITIES.join(', ')}`);
    }
  }
  
  // Check for Category line
  const categoryLine = lines.find(l => l.startsWith('**Category:**'));
  if (!categoryLine) {
    errors.push('Missing **Category:** line');
  }
  
  // Check required sections
  for (const section of REQUIRED_SECTIONS) {
    if (!content.includes(section)) {
      errors.push(`Missing section: ${section}`);
    }
  }
  
  // Check for code examples
  if (!content.includes('```hcl') && !content.includes('```bash')) {
    errors.push('Missing code examples (```hcl or ```bash)');
  }
  
  return errors;
}

function validateRules() {
  console.log('Validating rule files...');
  
  if (!fs.existsSync(RULES_DIR)) {
    console.error('ERROR: rules directory not found');
    return false;
  }
  
  const ruleFiles = fs.readdirSync(RULES_DIR).filter(f => f.endsWith('.md'));
  let allValid = true;
  
  for (const file of ruleFiles) {
    const errors = validateRuleFile(file);
    
    if (errors.length > 0) {
      console.error(`\n✗ ${file}:`);
      errors.forEach(e => console.error(`  - ${e}`));
      allValid = false;
    } else {
      console.log(`✓ ${file}`);
    }
  }
  
  return allValid;
}

function main() {
  console.log('Terraform Best Practices Skill Validator\n');
  
  const skillValid = validateSkillFile();
  const rulesValid = validateRules();
  
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
