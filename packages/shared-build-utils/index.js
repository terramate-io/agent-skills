#!/usr/bin/env node

/**
 * Shared build utilities for skill build scripts
 * Provides common functionality for building and validating skills
 */

const fs = require('fs');
const path = require('path');

/**
 * Get all rule files from a rules directory
 * @param {string} rulesDir - Path to the rules directory
 * @returns {string[]} Array of rule filenames
 */
function getRuleFiles(rulesDir) {
  return fs.readdirSync(rulesDir)
    .filter(file => file.endsWith('.md'))
    .sort();
}

/**
 * Extract content from a rule file
 * @param {string} rulesDir - Path to the rules directory
 * @param {string} filename - Name of the rule file
 * @returns {string} File content
 */
function extractRuleContent(rulesDir, filename) {
  return fs.readFileSync(path.join(rulesDir, filename), 'utf-8');
}

/**
 * Build AGENTS.md from rule files
 * @param {Object} config - Configuration object
 * @param {string} config.skillName - Name of the skill (e.g., "terraform-best-practices")
 * @param {string} config.skillDir - Path to the skill directory
 * @param {string} config.title - Title for the generated document
 * @param {string} config.description - Description for the generated document
 */
function buildAgentsMd(config) {
  const { skillName, skillDir, title, description } = config;
  const rulesDir = path.join(skillDir, 'rules');
  const outputFile = path.join(skillDir, 'AGENTS.md');

  console.log(`Building ${skillName} AGENTS.md...`);

  const ruleFiles = getRuleFiles(rulesDir);
  console.log(`Found ${ruleFiles.length} rule files`);

  let output = `# ${title}\n\n`;
  output += `${description}\n\n`;
  output += '---\n\n';

  for (const file of ruleFiles) {
    const content = extractRuleContent(rulesDir, file);
    output += content + '\n\n---\n\n';
  }

  fs.writeFileSync(outputFile, output);
  console.log(`Wrote ${outputFile}`);
}

/**
 * Validate a rule file
 * @param {Object} config - Configuration object
 * @param {string} config.rulesDir - Path to the rules directory
 * @param {string[]} config.validPrefixes - Array of valid filename prefixes
 * @param {string[]} config.validPriorities - Array of valid priority values
 * @param {string[]} config.requiredSections - Array of required section headers
 * @param {string[]} config.codeExampleLanguages - Array of valid code example language tags
 * @param {string} filename - Name of the rule file to validate
 * @returns {string[]} Array of error messages (empty if valid)
 */
function validateRuleFile(config, filename) {
  const { rulesDir, validPrefixes, validPriorities, requiredSections, codeExampleLanguages } = config;
  const filepath = path.join(rulesDir, filename);
  const content = fs.readFileSync(filepath, 'utf-8');
  const lines = content.split('\n');
  const errors = [];

  const ruleName = filename.replace('.md', '');

  // Check prefix
  const hasValidPrefix = validPrefixes.some(prefix => filename.startsWith(prefix));
  if (!hasValidPrefix) {
    errors.push(`Invalid prefix. Must start with: ${validPrefixes.join(', ')}`);
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
    if (!validPriorities.some(p => priority.startsWith(p))) {
      errors.push(`Invalid priority "${priority}". Must be one of: ${validPriorities.join(', ')}`);
    }
  }

  // Check for Category line
  const categoryLine = lines.find(l => l.startsWith('**Category:**'));
  if (!categoryLine) {
    errors.push('Missing **Category:** line');
  }

  // Check required sections
  for (const section of requiredSections) {
    if (!content.includes(section)) {
      errors.push(`Missing section: ${section}`);
    }
  }

  // Check for code examples
  const hasCodeExample = codeExampleLanguages.some(lang => content.includes(`\`\`\`${lang}`));
  if (!hasCodeExample) {
    errors.push(`Missing code examples (${codeExampleLanguages.map(l => `\`\`\`${l}`).join(', ')})`);
  }

  return errors;
}

/**
 * Validate SKILL.md file
 * @param {string} skillFile - Path to SKILL.md
 * @returns {boolean} True if valid
 */
function validateSkillFile(skillFile) {
  console.log('Validating SKILL.md...');

  if (!fs.existsSync(skillFile)) {
    console.error('ERROR: SKILL.md not found');
    return false;
  }

  const content = fs.readFileSync(skillFile, 'utf-8');

  // Check frontmatter
  if (!content.startsWith('---')) {
    console.error('ERROR: SKILL.md missing frontmatter');
    return false;
  }

  console.log('✓ SKILL.md valid');
  return true;
}

/**
 * Validate all rule files
 * @param {Object} config - Configuration object (same as validateRuleFile)
 * @returns {boolean} True if all rules are valid
 */
function validateRules(config) {
  console.log('Validating rule files...');

  const { rulesDir } = config;
  if (!fs.existsSync(rulesDir)) {
    console.error('ERROR: rules directory not found');
    return false;
  }

  const ruleFiles = fs.readdirSync(rulesDir).filter(f => f.endsWith('.md'));
  let allValid = true;

  for (const file of ruleFiles) {
    const errors = validateRuleFile(config, file);

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

module.exports = {
  getRuleFiles,
  extractRuleContent,
  buildAgentsMd,
  validateRuleFile,
  validateSkillFile,
  validateRules
};
